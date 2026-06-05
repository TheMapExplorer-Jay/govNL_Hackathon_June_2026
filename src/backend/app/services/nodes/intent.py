import re

from langchain_core.runnables import RunnableConfig

from app.models.state import ConversationState, Filter, Intent, IntentAnalysis, SpatialQuery
from app.services.nodes.base import BaseNode

_LATLON_RE = re.compile(r"LATLON:(-?\d+\.\d+),(-?\d+\.\d+).*?(\d+)\s+H3-ringen")


class IntentNode(BaseNode):
    """Pass-through: always proceeds to SQL generation without asking the user questions.

    The SQL generator has the full schema and scenario context — it handles
    column selection and filtering directly. Removing the LLM disambiguation
    step keeps the flow fast and avoids overwhelming policymakers with questions.

    When the user message contains a LATLON spatial context prefix (injected by
    ChatInput.vue), the prefix is parsed and stored as a structured SpatialQuery
    on the intent so the SQL generator can emit an H3 buffer subquery.
    """

    def __init__(self):
        super().__init__("intentie")

    async def run(self, state: ConversationState, config: RunnableConfig) -> dict:
        # Extract the last user message as the query description.
        last_user = next(
            (m["content"] for m in reversed(state["messages"]) if m["role"] == "user"),
            "",
        )

        # Parse optional LATLON spatial context prefix injected by ChatInput.vue.
        spatial_query: SpatialQuery | None = None
        thinking_suffix = ""
        match = _LATLON_RE.search(last_user)
        if match:
            lat = match.group(1)
            lng = match.group(2)
            k_rings = int(match.group(3))
            spatial_query = SpatialQuery(
                origin_filters=[
                    Filter(
                        column="h3_coordinate",
                        operator="=",
                        value=f"LATLON:{lat},{lng}",
                    )
                ],
                k_rings=k_rings,
            )
            thinking_suffix = f" Ruimtelijk filter gedetecteerd: LATLON:{lat},{lng} met {k_rings} H3-ringen."

        intent = Intent(
            description=last_user,
            relevant_columns=["h3_id"],
            filters=[],
            spatial_query=spatial_query,
        )
        result = IntentAnalysis(
            is_clear=True,
            intent=intent,
            thinking_summary=f"Doorgegeven aan SQL-generator zonder tussenvragen.{thinking_suffix}",
        )

        await self.dispatch(
            "step_thinking_summary",
            {"step_id": "intentie", "summary": result.thinking_summary},
            config,
        )

        return {
            "intent_analysis": result,
            "needs_spatial_resolution": False,
            "pdok_used": False,
        }

    def fallback(self) -> dict:
        return {
            "intent_analysis": None,
            "needs_spatial_resolution": False,
            "pdok_used": False,
        }
