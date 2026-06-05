"""DuckDB connection helpers."""

import logging
import threading
from contextlib import contextmanager

import duckdb

logger = logging.getLogger(__name__)

# Track which extensions are confirmed loaded in this process so we never
# attempt a network install more than once per process lifetime.
_extensions_ready: set[str] = set()

# Query timeout in milliseconds — terminates runaway SQL from the LLM.
QUERY_TIMEOUT_MS = 30_000

# Thread-local storage for persistent connections.
# Each worker thread keeps one open DuckDB connection for its lifetime so that:
#   - The Parquet object cache (SET enable_object_cache=true) survives across queries.
#   - Table views are registered once instead of on every query.
_local = threading.local()


def _apply_settings(con: duckdb.DuckDBPyConnection) -> None:
    settings = [
        "SET enable_object_cache = true",
        "SET memory_limit = '3GB'",
        "SET threads = 4",
        "SET enable_progress_bar = false",
        f"SET query_timeout = {QUERY_TIMEOUT_MS}",
    ]
    for stmt in settings:
        try:
            con.execute(stmt)
        except duckdb.Error:
            pass


def _ensure_extensions(con: duckdb.DuckDBPyConnection) -> None:
    """Load delta and h3 extensions.  Installs at most once per process."""
    global _extensions_ready

    for name, load_stmt, install_stmt in [
        ("delta", "LOAD delta;", "INSTALL delta; LOAD delta;"),
        ("h3",    "LOAD h3;",    "INSTALL h3 FROM community; LOAD h3;"),
    ]:
        if name in _extensions_ready:
            # Already confirmed working — just load (no install attempt).
            try:
                con.execute(load_stmt)
            except duckdb.Error:
                pass
            continue

        try:
            con.execute(load_stmt)
            _extensions_ready.add(name)
        except duckdb.Error:
            try:
                con.execute(install_stmt)
                _extensions_ready.add(name)
            except duckdb.Error:
                logger.warning("Extension %s could not be loaded/installed", name)


def _open_fresh() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    _apply_settings(con)
    _ensure_extensions(con)
    return con


@contextmanager
def connect_delta():
    """Yield a persistent thread-local DuckDB connection.

    On the first call from a given thread the connection is opened and
    extensions + settings are applied.  Subsequent calls on the same thread
    reuse the same connection — skipping all setup overhead and keeping the
    Parquet object cache warm between queries.

    The caller must NOT close the connection; this manager owns its lifetime.
    If the query raises an exception the connection is discarded so the next
    call gets a clean state.
    """
    if not hasattr(_local, "con") or _local.con is None:
        _local.con = _open_fresh()

    con = _local.con

    # Drop any leftover temp table from a previous (possibly failed) query.
    try:
        con.execute("DROP TABLE IF EXISTS _results")
    except duckdb.Error:
        pass

    try:
        yield con
    except Exception:
        # Discard the connection so the next query starts fresh.
        # Also remove the stale ID from tables._registered_con_ids so that if
        # Python reuses the same memory address for the new connection, views
        # will be re-registered correctly.
        from app.services.helpers.tables import deregister_connection
        deregister_connection(id(_local.con))
        try:
            _local.con.close()
        except Exception:
            pass
        _local.con = None
        raise
    # On success: keep the connection alive for the next query.
