from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig

from app.models.state import ConversationState, MapPlan
from app.services.helpers.prompt_helpers import (
    format_intent_section,
    format_results_section,
    load_prompt,
)
from app.services.nodes.describe_results import _columns_block
from app.services.llm import make_fast_llm
from app.services.nodes.base import BaseNode


def _plan_charts(summary: dict | None, sample: list[dict] | None) -> list[dict]:
    """Deterministically derive chart descriptors from query summary stats.

    Produces at most 4 items: bar charts (categorical) are preferred first,
    then stat cards (numeric). The h3_id column is always skipped.
    """
    if not summary:
        return []

    bar_charts: list[dict] = []
    stat_charts: list[dict] = []

    for col, stats in summary.items():
        if col == "h3_id":
            continue
        if "top_values" in stats:
            bar_charts.append(
                {
                    "type": "bar",
                    "column": col,
                    "label": col,
                    "data": [
                        {"label": str(k), "value": v}
                        for k, v in stats["top_values"].items()
                    ],
                }
            )
        elif "min" in stats and "max" in stats and "avg" in stats:
            stat_charts.append(
                {
                    "type": "stat",
                    "column": col,
                    "label": col,
                    "min": stats["min"],
                    "max": stats["max"],
                    "avg": stats["avg"],
                }
            )

    # Prefer bar charts (more visual), fill remaining slots with stat cards
    result = (bar_charts[:2] + stat_charts[:2])[:4]
    return result


class PlanVisualizationNode(BaseNode):
    """Assign H3 result columns to visual roles (color, height) for the map.

    Runs after `execute_query`, so it sees the actual result columns.
    Uses Pydantic structured output to produce a MapPlan.
    """

    _PROMPT = ChatPromptTemplate.from_messages(
        [("system", load_prompt("04_visualization_planner.md"))],
        template_format="jinja2",
    )

    def __init__(self):
        super().__init__("kaart", auto_activate=True)

    def _build_context(self, state: ConversationState) -> dict:
        qr = state.get("query_result")
        sample = qr.sample if qr else None
        result_columns = list(sample[0].keys()) if sample else []
        return {
            "intent_section": format_intent_section(state["intent_analysis"].intent),
            "sql_query": state.get("sql_query"),
            "result_columns": ", ".join(result_columns),
            "col_metadata": _columns_block(state["dictionary"], result_columns),
            "results_section": format_results_section(
                sample[:10] if sample else None,
                None,
                qr.summary if qr else None,
                None,
            ),
        }

    async def run(self, state: ConversationState, config: RunnableConfig) -> dict:
        qr = state.get("query_result")
        if (
            not qr
            or qr.error
            or not state.get("sql_query")
            or not qr.count
            or not qr.sample
        ):
            return {"map_plan": None}

        chain = self._PROMPT | make_fast_llm(
            streaming=False
        ).with_structured_output(MapPlan)
        plan: MapPlan = await chain.ainvoke(self._build_context(state))

        await self.dispatch(
            "step_thinking_summary",
            {"step_id": "kaart", "summary": plan.thinking_summary if plan else ""},
            config,
        )

        plan_data = plan.model_dump(exclude={"thinking_summary"})
        await self.dispatch("map_block", plan_data, config)

        charts = _plan_charts(qr.summary, qr.sample)
        if charts:
            await self.dispatch("chart_data", {"charts": charts}, config)

        return {"map_plan": plan}

    def fallback(self) -> dict:
        return {"map_plan": None}
