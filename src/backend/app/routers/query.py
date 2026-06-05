import asyncio
import logging

import duckdb
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.helpers.db import connect_delta
from app.services.helpers.tables import register_tables

router = APIRouter()
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    sql: str


@router.post("/api/query")
async def run_query(body: QueryRequest):
    def _run():
        with connect_delta() as con:
            register_tables(con)
            try:
                result = con.execute(body.sql).fetchall()
                columns = [desc[0] for desc in con.description]
                return [dict(zip(columns, row)) for row in result]
            except duckdb.CatalogException as exc:
                # Table or view referenced in the SQL doesn't exist (e.g. the LLM
                # hallucinated a name).  Return empty instead of crashing with 400.
                logger.warning("Reference layer table not found: %s", exc)
                return []

    try:
        rows = await asyncio.to_thread(_run)
    except Exception as exc:
        logger.exception("Query execution failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return {"rows": rows}
