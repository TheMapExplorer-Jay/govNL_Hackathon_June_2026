import asyncio
import logging
import re

from langchain_core.runnables import RunnableConfig

from app.models.state import ConversationState, QueryResult
from app.services.helpers.db import QUERY_TIMEOUT_MS, connect_delta
from app.services.helpers.tables import register_tables
from app.services.nodes.base import BaseNode

logger = logging.getLogger(__name__)

# asyncio-level safety net: kill the thread if DuckDB itself ignores its timeout.
ASYNC_TIMEOUT_S = (QUERY_TIMEOUT_MS / 1000) + 10

# Maximum rows streamed to the frontend map renderer.
MAP_ROW_LIMIT = 50_000

# Skip per-column summary queries when the result has many columns (wide joins
# produce dozens of columns; computing stats for each adds seconds of latency).
SUMMARY_MAX_COLUMNS = 12


def _ensure_limit(sql: str, limit: int) -> str:
    """Append LIMIT to the outermost SELECT if none is already present.

    Protects against full-table scans when the LLM omits the LIMIT clause.
    Strips a trailing semicolon before wrapping.
    """
    clean = sql.rstrip().rstrip(";").rstrip()
    # Reliable check: does the query end with LIMIT <digits>? Handles both
    # "LIMIT 50000" and "LIMIT\n50000" that the old rsplit heuristic missed.
    if re.search(r"\bLIMIT\s+\d+\s*$", clean, re.IGNORECASE):
        return clean
    return f"{clean} LIMIT {limit}"


class ExecuteQueryNode(BaseNode):
    """Execute the generated SQL query on the backend via DuckDB."""

    # Configuration constants
    SAMPLE_THRESHOLD = 100
    SAMPLE_SIZE = 10
    AGG_SAMPLE_SIZE = 10
    CATEGORICAL_TOP_N = 5
    CATEGORICAL_TYPES = ("VARCHAR", "TEXT", "BLOB", "STRING")
    NUMERIC_TYPES = (
        "INTEGER",
        "BIGINT",
        "DOUBLE",
        "FLOAT",
        "DECIMAL",
        "HUGEINT",
        "SMALLINT",
        "TINYINT",
    )

    def __init__(self):
        super().__init__("execute", auto_activate=True)

    async def run(self, state: ConversationState, config: RunnableConfig) -> dict:
        sql_query = state.get("sql_query")

        if not sql_query:
            return {"query_result": QueryResult(error="Geen SQL query gegenereerd")}

        # Show progress immediately — DuckDB can take 5-30s; without this the
        # user sees the step spinner freeze with no feedback.
        await self.dispatch(
            "step_thinking_summary",
            {"step_id": "execute", "summary": "Bezig met uitvoeren van de database-query…"},
            config,
        )

        try:
            sample, count, summary, all_rows = await asyncio.wait_for(
                asyncio.to_thread(self._execute_query, sql_query, state),
                timeout=ASYNC_TIMEOUT_S,
            )
        except asyncio.TimeoutError:
            logger.warning("Query timed out after %.0fs: %.120s", ASYNC_TIMEOUT_S, sql_query)
            return {
                "query_result": QueryResult(
                    error=f"Query time-out na {int(ASYNC_TIMEOUT_S)}s. Probeer een specifiekere vraag of voeg filters toe."
                )
            }
        except Exception as exc:
            logger.exception("Query execution failed")
            return {"query_result": QueryResult(error=str(exc))}

        await self.dispatch(
            "step_thinking_summary",
            {"step_id": "execute", "summary": f"{count:,} rijen gevonden."},
            config,
        )

        if all_rows:
            await self.dispatch("map_data", {"rows": all_rows}, config)

        return {
            "query_result": QueryResult(sample=sample, count=count, summary=summary)
        }

    def fallback(self) -> dict:
        return {
            "query_result": QueryResult(
                error="Onverwachte fout bij uitvoeren van de query"
            )
        }

    def _execute_query(
        self,
        sql_query: str,
        state: ConversationState,
    ) -> tuple[list[dict], int, dict | None, list[dict]]:
        # Extract aggregation info from state
        intent_analysis = state.get("intent_analysis")
        intent = intent_analysis.intent if intent_analysis else None
        agg_level = (
            intent.aggregation.level
            if (intent and intent.aggregation and intent.aggregation.level)
            else None
        )
        with connect_delta() as con:
            # 1. Register all per-theme tables as views (uses cached SQL statements)
            register_tables(con)

            # 2. Ensure the query has a top-level LIMIT so unbounded full-table
            #    scans are caught even when the LLM forgets the rule.
            guarded_sql = _ensure_limit(sql_query, MAP_ROW_LIMIT)

            # 3. Materialize into a temp table so subsequent count/sample/stats
            #    queries all run against an already-scanned result set.
            con.execute(f"CREATE TEMP TABLE _results AS {guarded_sql}")

            result_cols = [
                row[0]
                for row in con.execute(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = '_results'"
                ).fetchall()
            ]

            # 4. Count: Get the total number of rows
            total_count: int = con.execute("SELECT COUNT(*) FROM _results").fetchone()[
                0
            ]

            if total_count == 0:
                return [], 0, None, []

            # 4. Fetch rows for map rendering — capped to avoid streaming huge payloads
            all_rows = self._rows_to_dicts(
                con.execute(f"SELECT * FROM _results LIMIT {MAP_ROW_LIMIT}")
            )
            if total_count > MAP_ROW_LIMIT:
                logger.info(
                    "Map data capped at %d rows (total: %d)", MAP_ROW_LIMIT, total_count
                )

            # 5. Sample: Get a subset for the AI description.
            # For aggregation queries, use a distinct ranking (top-N areas) so the LLM
            # can name specific areas. For other queries, use the normal row sample.
            if agg_level:
                # Use first group-by column (typically a single area-level column like gemeente)
                level_col = agg_level[0]
                value_col = self._pick_aggregation_value_column(result_cols, level_col)
                if value_col:
                    is_categorical = self._is_column_categorical(con, value_col)
                    intent_limit = intent.limit if intent else None
                    sample = self._sample_aggregation(
                        con, level_col, value_col, is_categorical, limit=intent_limit
                    )
                    summary = self._build_summary(con)
                    return sample, total_count, summary, all_rows

            if total_count <= self.SAMPLE_THRESHOLD:
                return all_rows, total_count, None, all_rows

            sample = self._rows_to_dicts(
                con.execute(
                    f"SELECT * FROM _results USING SAMPLE {self.SAMPLE_SIZE} ROWS"
                )
            )

            return sample, total_count, self._build_summary(con), all_rows

    def _build_summary(self, con) -> dict | None:
        """Calculate summary statistics for numeric and categorical columns of _results.

        Numeric stats are gathered in a single batched query (one round trip
        for all columns) instead of one query per column.  Categorical columns
        use one GROUP BY each but skip the two pre-check COUNT queries.
        """
        cols = con.execute(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name = '_results'"
        ).fetchall()

        # Skip expensive per-column queries for very wide result sets.
        if len(cols) > SUMMARY_MAX_COLUMNS:
            return None

        numeric_cols = [c for c, t in cols if t in self.NUMERIC_TYPES]
        categorical_cols = [
            c for c, t in cols
            if t in self.CATEGORICAL_TYPES and c != "h3_id"
        ]

        summary: dict[str, dict] = {}

        # ── One batched query for all numeric columns ──────────────────────
        if numeric_cols:
            agg_exprs = ", ".join(
                f'MIN("{c}"), MAX("{c}"), ROUND(AVG("{c}"), 2)'
                for c in numeric_cols
            )
            row = con.execute(f"SELECT {agg_exprs} FROM _results").fetchone()
            if row:
                for i, col_name in enumerate(numeric_cols):
                    mn, mx, av = row[i * 3], row[i * 3 + 1], row[i * 3 + 2]
                    if mn is not None:
                        summary[col_name] = {"min": mn, "max": mx, "avg": av}

        # ── One GROUP BY per categorical column (no COUNT pre-checks) ──────
        for col_name in categorical_cols:
            top_rows = con.execute(
                f'SELECT "{col_name}", COUNT(*) AS cnt FROM _results '
                f'WHERE "{col_name}" IS NOT NULL '
                f'GROUP BY "{col_name}" ORDER BY cnt DESC '
                f"LIMIT {self.CATEGORICAL_TOP_N}"
            ).fetchall()
            if top_rows:
                summary[col_name] = {
                    "top_values": {str(v): c for v, c in top_rows},
                }

        return summary or None

    def _is_column_categorical(self, con, column: str) -> bool:
        """Return True if the column has a text-like DuckDB type."""
        row = con.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = '_results' AND column_name = ?",
            [column],
        ).fetchone()
        return bool(row and row[0] in ("VARCHAR", "TEXT", "BLOB", "STRING"))

    @staticmethod
    def _pick_aggregation_value_column(
        result_cols: list[str], level_col: str
    ) -> str | None:
        """Heuristic: the aggregation value is the first non-h3, non-level column."""
        for col in result_cols:
            if col in ("h3_id", "year_int") or col == level_col:
                continue
            return col
        return None

    def _sample_aggregation(
        self,
        con,
        level_col: str,
        value_col: str,
        is_categorical: bool = False,
        limit: int | None = None,
    ) -> list[dict]:
        """Sample aggregated results: top-N and bottom-N areas by value.

        For numeric columns returns a UNION of the top-n (DESC) and bottom-n (ASC)
        rows so queries about lowest values also get relevant examples. For
        categorical columns returns distinct rows ordered by area name (no
        meaningful numeric ordering, so no bottom union).

        n = max(AGG_SAMPLE_SIZE, limit) so an explicit user limit (e.g. "top 20")
        expands the sample.
        """
        n = max(self.AGG_SAMPLE_SIZE, limit if limit is not None else 0)
        if is_categorical:
            return self._rows_to_dicts(
                con.execute(
                    f'SELECT DISTINCT "{level_col}", "{value_col}" '
                    f'FROM _results ORDER BY "{level_col}" '
                    f"LIMIT {n}"
                )
            )
        return self._rows_to_dicts(
            con.execute(
                f"WITH top_n AS ("
                f'  SELECT DISTINCT "{level_col}", ROUND(CAST("{value_col}" AS DOUBLE), 2) AS "{value_col}"'
                f'  FROM _results ORDER BY "{value_col}" DESC LIMIT {n}'
                f"), bottom_n AS ("
                f'  SELECT DISTINCT "{level_col}", ROUND(CAST("{value_col}" AS DOUBLE), 2) AS "{value_col}"'
                f'  FROM _results ORDER BY "{value_col}" ASC LIMIT {n}'
                f") SELECT * FROM top_n UNION SELECT * FROM bottom_n"
            )
        )

    def _rows_to_dicts(self, cursor) -> list[dict]:
        """Convert a DuckDB cursor result to a list of plain dicts."""
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
