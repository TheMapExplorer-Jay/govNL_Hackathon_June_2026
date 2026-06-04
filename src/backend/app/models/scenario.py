from typing import Literal

from pydantic import BaseModel


class ScenarioAnalysis(BaseModel):
    """Gestructureerde output van de scenario-detectie node."""

    is_scenario_question: bool
    scenario_type: str = ""
    title: str = ""
    salinity_duration_weeks: int | None = None
    population_growth_pct: float | None = None
    climate_scenario: Literal["G", "G+", "W", "W+"] | None = None
    intake_points_disabled: list[str] = []
    horizon_year: int = 2040
    datasets_to_use: list[str] = []
    assumptions: list[str] = []
    limitations: list[str] = []
    stakeholder_impacts: dict[str, str] = {}
    sql_context: str = ""
    thinking_summary: str = ""


class ScenarioParams(BaseModel):
    """Scenarioparameters die in de workflow state worden opgeslagen."""

    is_scenario_question: bool = False
    scenario_type: str = ""
    title: str = ""
    salinity_duration_weeks: int | None = None
    population_growth_pct: float | None = None
    climate_scenario: str | None = None
    intake_points_disabled: list[str] = []
    horizon_year: int = 2040
    datasets_to_use: list[str] = []
    assumptions: list[str] = []
    limitations: list[str] = []
    stakeholder_impacts: dict[str, str] = {}
