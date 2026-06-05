from typing import Literal

from pydantic import BaseModel


class ScenarioMatrixRow(BaseModel):
    """Één rij in de scenario-vergelijkingstabel (laag/midden/hoog impact per thema)."""

    theme: str
    laag: str
    midden: str
    hoog: str


class DecisionPoint(BaseModel):
    """Een open beslispunt dat voortkomt uit het scenario."""

    title: str
    status: Literal["open", "vastgesteld", "geblokkeerd"] = "open"
    description: str


class ScenarioAnalysis(BaseModel):
    """Gestructureerde output van de scenario-detectie node."""

    is_scenario_question: bool
    scenario_type: str = ""
    title: str = ""
    salinity_duration_weeks: int | None = None
    population_growth_pct: float | None = None
    climate_scenario: Literal["GL", "GH", "WL", "WH"] | None = None
    intake_points_disabled: list[str] = []
    horizon_year: int = 2040
    datasets_to_use: list[str] = []
    assumptions: list[str] = []
    limitations: list[str] = []
    stakeholder_impacts: dict[str, str] = {}
    scenario_matrix: list[ScenarioMatrixRow] = []
    decision_points: list[DecisionPoint] = []
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
    scenario_matrix: list[ScenarioMatrixRow] = []
    decision_points: list[DecisionPoint] = []
