"""DuckDB connection helpers."""

from contextlib import contextmanager

import duckdb


def _apply_settings(con: duckdb.DuckDBPyConnection) -> None:
    """Apply performance and caching settings to a new DuckDB connection.

    enable_object_cache: caches Parquet file footer metadata (row-group
    statistics, column statistics) in process memory so repeated reads of the
    same Parquet file do not re-parse the footer.  The cache is process-wide,
    so it persists across the short-lived per-query connections used here.

    memory_limit / threads: reasonable defaults for a containerised backend
    running alongside other services; prevents DuckDB from consuming all RAM.
    """
    settings = [
        "SET enable_object_cache = true",
        "SET memory_limit = '1.5GB'",
        "SET threads = 4",
        "SET enable_progress_bar = false",
    ]
    for stmt in settings:
        try:
            con.execute(stmt)
        except duckdb.Error:
            pass  # older DuckDB versions may not support all settings


@contextmanager
def connect_delta():
    """Context manager: yields a DuckDB connection with Delta + H3 extensions loaded."""
    con = duckdb.connect()
    try:
        # Performance settings first (object cache must be set before any reads)
        _apply_settings(con)

        # Extensions
        for load_stmt, install_stmt in [
            ("LOAD delta;", "INSTALL delta; LOAD delta;"),
            ("LOAD h3;", "INSTALL h3 FROM community; LOAD h3;"),
        ]:
            try:
                con.execute(load_stmt)
            except duckdb.Error:
                try:
                    con.execute(install_stmt)
                except duckdb.Error:
                    pass  # pre-installed in the Docker image; fail gracefully

        yield con
    finally:
        con.close()
