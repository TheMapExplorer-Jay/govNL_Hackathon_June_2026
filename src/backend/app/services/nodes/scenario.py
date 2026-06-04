import re

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableConfig

from app.models.scenario import ScenarioAnalysis, ScenarioParams
from app.models.state import ConversationState
from app.services.helpers.messages import to_langchain_history
from app.services.helpers.prompt_helpers import load_prompt
from app.services.llm import make_llm
from app.services.nodes.base import BaseNode

# Dutch + English what-if keywords — only call the LLM when at least one matches.
_SCENARIO_PATTERN = re.compile(
    r"\b("
    r"wat als|wat als er|wat als het|stel dat|in geval van|bij uitval|bij wegvallen"
    r"|scenario|wat is de impact|impact van|effect van|gevolg van|risico"
    r"|kwetsbaar|bedreigd|bedreigt|bedreiging|kans voor|kansen voor"
    r"|2040|2050|klimaat|klimaatscenario|bevolkingsgroei|woningbouw"
    r"|verzilting|droogte|overstroming|innamepunt|innamepu"
    r"|what if|what happens|impact of|effect of|scenario"
    r")\b",
    re.IGNORECASE,
)


def _looks_like_scenario(messages: list[dict]) -> bool:
    """Return True if the last user message contains any what-if keyword."""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return bool(_SCENARIO_PATTERN.search(msg.get("content", "")))
    return False


class ScenarioNode(BaseNode):
    """Detecteer what-if scenario's, extraheer parameters en bouw auditspoor.

    Runs as the first node in the workflow so that downstream nodes (intent,
    SQL generator, result describer) all have access to the scenario context.
    For non-scenario questions the node is a fast passthrough.
    """

    _PROMPT = ChatPromptTemplate.from_messages(
        [
            ("system", load_prompt("00_scenario_detector.md")),
            MessagesPlaceholder("history"),
        ],
        template_format="jinja2",
    )

    def __init__(self):
        super().__init__("scenario")

    async def run(self, state: ConversationState, config: RunnableConfig) -> dict:
        # Fast path: skip the LLM entirely for questions that contain no
        # what-if keywords.  This avoids a full inference round-trip on every
        # descriptive query and prevents gateway timeouts.
        if not _looks_like_scenario(state["messages"]):
            return {"scenario_params": None, "scenario_context": None}

        chain = self._PROMPT | make_llm(
            state["model"], streaming=False
        ).with_structured_output(ScenarioAnalysis)

        result: ScenarioAnalysis = await chain.ainvoke(
            {"history": to_langchain_history(state["messages"])}
        )

        await self.dispatch(
            "step_thinking_summary",
            {"step_id": "scenario", "summary": result.thinking_summary},
            config,
        )

        params = ScenarioParams(
            is_scenario_question=result.is_scenario_question,
            scenario_type=result.scenario_type,
            title=result.title,
            salinity_duration_weeks=result.salinity_duration_weeks,
            population_growth_pct=result.population_growth_pct,
            climate_scenario=result.climate_scenario,
            intake_points_disabled=result.intake_points_disabled,
            horizon_year=result.horizon_year,
            datasets_to_use=result.datasets_to_use,
            assumptions=result.assumptions,
            limitations=result.limitations,
            stakeholder_impacts=result.stakeholder_impacts,
        )

        if result.is_scenario_question:
            await self.dispatch("assumption_log", params.model_dump(), config)

        return {
            "scenario_params": params,
            "scenario_context": result.sql_context if result.is_scenario_question else None,
        }

    def fallback(self) -> dict:
        return {"scenario_params": None, "scenario_context": None}
