import logging
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig

from app.models.dictionary import Theme
from app.models.state import ConversationState, SqlGenerationOutput
from app.services.helpers.prompt_helpers import format_intent_section, load_prompt
from app.services.llm import make_analysis_llm
from app.services.nodes.base import BaseNode

logger = logging.getLogger(__name__)

# Maximum number of themes to keep in the prompt.  Ranked by the best-scoring
# table within each theme — all tables from a selected theme are kept so the
# LLM always sees the complete, exact table names for that domain.
_MAX_THEMES = 3

# Themes with more tables than this are too large to show in full; their
# individual tables are sorted by score and capped at this many.
_LARGE_THEME_TABLE_LIMIT = 10
_LARGE_THEME_THRESHOLD = 15

# If the best theme score is below this, the query is too ambiguous for
# pre-filtering — fall back to showing all themes so nothing is excluded.
_MIN_SCORE_THRESHOLD = 3.0

# Dutch + English stop words that don't discriminate between datasets.
_STOP = frozenset({
    "de", "het", "een", "van", "in", "op", "aan", "voor", "met", "is", "zijn",
    "er", "dit", "dat", "je", "ik", "we", "ze", "kan", "bij", "naar", "die",
    "wat", "hoe", "welke", "en", "of", "maar", "als", "ook", "meer", "mijn",
    "ons", "per", "alle", "elke", "heeft", "hebben", "niet", "wel", "dan",
    "om", "tot", "uit", "ten", "door", "over", "na", "al", "nog", "zo",
    "geen", "nu", "toch", "want", "the", "a", "an", "of", "in", "on", "for",
    "with", "to", "and", "or", "not", "this", "that", "what", "how", "which",
})


def _tokenize(text: str) -> set[str]:
    return {
        t for t in re.sub(r"[^\w]", " ", text.lower()).split()
        if len(t) > 2 and t not in _STOP
    }


def _score_table(table, query_tokens: set[str]) -> float:
    score = 0.0
    # Table name is the strongest signal — underscore-split it for matching.
    name_tokens = _tokenize(table.name)
    score += len(query_tokens & name_tokens) * 5
    for col in table.columns:
        score += len(query_tokens & _tokenize(col.name)) * 2
        if col.description:
            score += len(query_tokens & _tokenize(col.description)) * 0.5
    return score


def _select_relevant_themes(
    themes: list[Theme],
    description: str,
    scenario_context: str = "",
) -> list[Theme]:
    """Return a filtered theme list for the SQL prompt.

    Ranks themes by their best-scoring table, then keeps the top _MAX_THEMES
    themes.  Crucially, **all tables** from a selected small theme are kept —
    this prevents the LLM from hallucinating names for tables it didn't see.

    Large themes (> _LARGE_THEME_THRESHOLD tables, e.g. gebiedsviewer) are
    capped at _LARGE_THEME_TABLE_LIMIT tables sorted by relevance score.

    Falls back to all themes when the top score is too low (ambiguous query).
    """
    query_tokens = _tokenize(description + " " + scenario_context)
    if not query_tokens:
        return themes

    # Score each theme by the best single-table score within it.
    theme_best: list[tuple[float, Theme]] = []
    for theme in themes:
        best = max((_score_table(t, query_tokens) for t in theme.tables), default=0.0)
        theme_best.append((best, theme))

    theme_best.sort(key=lambda x: -x[0])
    top_score = theme_best[0][0]

    if top_score < _MIN_SCORE_THRESHOLD:
        logger.debug(
            "SQL table pre-selection: top score %.1f below threshold, using all themes",
            top_score,
        )
        return themes

    # Keep the top _MAX_THEMES themes that have any positive score.
    selected_themes = [th for score, th in theme_best[:_MAX_THEMES] if score > 0]

    logger.debug(
        "SQL table pre-selection: %d/%d themes kept: %s",
        len(selected_themes),
        len(themes),
        ", ".join(th.name for th in selected_themes),
    )

    result: list[Theme] = []
    for theme in selected_themes:
        if len(theme.tables) <= _LARGE_THEME_THRESHOLD:
            # Small theme — always show all tables so the LLM knows every valid name.
            result.append(theme)
        else:
            # Large theme — truncate to the best-scoring tables.
            by_score = sorted(
                theme.tables,
                key=lambda t: _score_table(t, query_tokens),
                reverse=True,
            )
            result.append(
                Theme(
                    name=theme.name,
                    label=theme.label,
                    example_questions=theme.example_questions,
                    tables=by_score[:_LARGE_THEME_TABLE_LIMIT],
                )
            )

    return result if result else themes


class SqlGenerationNode(BaseNode):
    """Generate a SQL query from the structured intent.

    The data dictionary is pre-filtered to the most relevant tables before
    building the prompt, keeping schema tokens to ~1-2k instead of 20k+.
    """

    _PROMPT_DUCKDB = ChatPromptTemplate.from_messages(
        [("system", load_prompt("03_sql_generator.md"))],
        template_format="jinja2",
    )

    def __init__(self):
        super().__init__("sql")

    def _build_context(self, state: ConversationState) -> dict:
        intent = state["intent_analysis"].intent
        dictionary = state["dictionary"]
        scenario_context = state.get("scenario_context") or ""

        # Pre-filter the schema to the most relevant tables so the prompt stays
        # small — the LLM picks 1-2 tables in the end, so showing 60+ is waste.
        filtered_themes = _select_relevant_themes(
            dictionary.themes,
            intent.description,
            scenario_context,
        )

        return {
            "themes": filtered_themes,
            "intent_section": format_intent_section(intent, for_sql=True),
            "scenario_context": scenario_context,
        }

    async def run(self, state: ConversationState, config: RunnableConfig) -> dict:
        chain = self._PROMPT_DUCKDB | make_analysis_llm(
            streaming=False
        ).with_structured_output(SqlGenerationOutput)
        parsed: SqlGenerationOutput = await chain.ainvoke(self._build_context(state))

        await self.dispatch(
            "step_thinking_summary",
            {"step_id": "sql", "summary": parsed.thinking_summary if parsed else ""},
            config,
        )

        sql_query = parsed.sql_query if parsed else None
        if sql_query:
            await self.dispatch("sql_block", {"query": sql_query}, config)

        return {"sql_query": sql_query}

    def fallback(self) -> dict:
        return {"sql_query": None}
