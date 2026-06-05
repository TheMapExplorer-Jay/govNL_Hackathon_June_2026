"""Discovery, registration, and metadata loading for `data/` and `extra_data/`.

The data layout is `data/<theme>/<table>/*.parquet` (plus the same structure
under `extra_data/` for optional datasets).  Each table is exposed in DuckDB
as a view of the same name.  CBS tables use `h3_index`; the view aliases it
to `h3_id` so all tables share a single spatial key.

`discover_tables()` caches its result in-process: the filesystem is scanned
once at startup and the same list is reused for every subsequent query.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import duckdb

from app.config import settings

logger = logging.getLogger(__name__)

# Primary data directory (always loaded)
DATA_DIR = Path(__file__).resolve().parents[3] / "data"

# Optional extra datasets (CBS, LGN, woondeals) — loaded when the directory exists
EXTRA_DATA_DIR = Path(__file__).resolve().parents[3] / "extra_data"

CBS_ID_RAW = "h3_index"
CANONICAL_ID = "h3_id"

# Module-level cache: filesystem is scanned once, then this list is reused.
_table_cache: list[TableEntry] | None = None


@dataclass(frozen=True)
class TableEntry:
    theme: str
    table_name: str
    group: str
    parquet_glob: str
    is_cbs: bool


def _derive_group(table_name: str) -> str:
    return table_name.split("_", 1)[0]


def _has_data_parquets(folder: Path) -> bool:
    return any(
        p.is_file() and p.name.endswith(".parquet") and not p.name.startswith("_")
        for p in folder.iterdir()
    )


def _discover_in_root(root: Path) -> list[TableEntry]:
    """Walk a single root directory and return one TableEntry per table folder."""
    entries: list[TableEntry] = []
    for theme_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for table_dir in sorted(p for p in theme_dir.iterdir() if p.is_dir()):
            if not _has_data_parquets(table_dir):
                continue
            entries.append(
                TableEntry(
                    theme=theme_dir.name,
                    table_name=table_dir.name,
                    group=_derive_group(table_dir.name),
                    parquet_glob=str(table_dir / "*.parquet"),
                    is_cbs=table_dir.name.startswith("cbs_"),
                )
            )
    return entries


def discover_tables(root: Path = DATA_DIR) -> list[TableEntry]:
    """Return all TableEntry objects for data/ and extra_data/.

    Results are cached in-process — the filesystem is scanned once and reused
    for every subsequent call, avoiding repeated glob operations per query.
    The optional `root` parameter is kept for backward-compatibility with tests
    that pass a temporary directory.
    """
    global _table_cache

    # Only cache the default (production) path; test overrides bypass the cache.
    use_cache = (root == DATA_DIR)
    if use_cache and _table_cache is not None:
        return _table_cache

    entries = _discover_in_root(root)

    # Only load extra_data/ when explicitly enabled — extra columns inflate the
    # LLM prompt and can cause gateway timeouts on slow inference providers.
    if use_cache and settings.LOAD_EXTRA_DATA and EXTRA_DATA_DIR.exists():
        extra = _discover_in_root(EXTRA_DATA_DIR)
        entries.extend(extra)
        if extra:
            logger.info(
                "Extra datasets loaded: %d tables from %s",
                len(extra),
                EXTRA_DATA_DIR,
            )

    logger.info(
        "Discovered %d tables total (cache=%s)", len(entries), use_cache
    )

    if use_cache:
        _table_cache = entries

    return entries


def load_theme_metadata(root: Path = DATA_DIR) -> dict[str, dict]:
    """Read `_llm_metadata_<theme>.json` files from data/ and extra_data/.

    Returns a merged dict keyed by theme name.
    """
    out: dict[str, dict] = {}

    def _load_from(directory: Path) -> None:
        for path in sorted(directory.glob("_llm_metadata_*.json")):
            theme = path.stem.removeprefix("_llm_metadata_")
            try:
                out[theme] = json.loads(path.read_text())
            except Exception:
                logger.exception("Could not load %s", path)

    _load_from(root)

    # Only merge extra_data/ metadata when explicitly enabled
    if root == DATA_DIR and settings.LOAD_EXTRA_DATA and EXTRA_DATA_DIR.exists():
        _load_from(EXTRA_DATA_DIR)

    return out


# Cached list of CREATE VIEW statements built once from the table list.
_view_sql_cache: list[str] | None = None

# Track which connection objects already have views registered so we never
# re-execute 60+ CREATE VIEW statements on a reused persistent connection.
_registered_con_ids: set[int] = set()


def _build_view_statements(entries: list[TableEntry]) -> list[str]:
    """Return one CREATE OR REPLACE VIEW SQL string per entry."""
    stmts: list[str] = []
    for entry in entries:
        if entry.is_cbs:
            stmts.append(
                f"CREATE OR REPLACE VIEW {entry.table_name} AS "
                f"SELECT * EXCLUDE ({CBS_ID_RAW}), LOWER({CBS_ID_RAW}) AS {CANONICAL_ID} "
                f"FROM read_parquet('{entry.parquet_glob}')"
            )
        else:
            stmts.append(
                f"CREATE OR REPLACE VIEW {entry.table_name} AS "
                f"SELECT * EXCLUDE ({CANONICAL_ID}), LOWER({CANONICAL_ID}) AS {CANONICAL_ID} "
                f"FROM read_parquet('{entry.parquet_glob}')"
            )
    return stmts


def register_tables(
    con: duckdb.DuckDBPyConnection, entries: list[TableEntry] | None = None
) -> list[TableEntry]:
    """Register a view per table on `con`. CBS views alias `h3_index` to `h3_id`.

    View SQL statements are cached after the first call so subsequent
    registrations skip string-building overhead.  When `con` is a persistent
    thread-local connection the function is a no-op after the first call —
    views are already registered and re-executing 60+ CREATE VIEW statements
    on every query would waste ~1-2s per turn.
    Returns the list of entries that were registered.
    """
    global _view_sql_cache, _registered_con_ids

    if entries is None:
        entries = discover_tables()

    con_id = id(con)
    if con_id in _registered_con_ids:
        return entries

    if _view_sql_cache is None or len(_view_sql_cache) != len(entries):
        _view_sql_cache = _build_view_statements(entries)

    for entry, sql in zip(entries, _view_sql_cache):
        try:
            con.execute(sql)
        except Exception:
            logger.warning(
                "Could not register view %s with h3_id aliasing; "
                "retrying without column rename",
                entry.table_name,
            )
            try:
                con.execute(
                    f"CREATE OR REPLACE VIEW {entry.table_name} AS "
                    f"SELECT * FROM read_parquet('{entry.parquet_glob}')"
                )
            except Exception:
                logger.exception("Failed to register view %s", entry.table_name)
    _registered_con_ids.add(con_id)
    return entries


def deregister_connection(con_id: int) -> None:
    """Remove a connection from the registered-views tracking set.

    Call this when a persistent connection is discarded so that if Python
    reuses the same memory address for a new connection, views will be
    re-registered correctly.
    """
    _registered_con_ids.discard(con_id)
