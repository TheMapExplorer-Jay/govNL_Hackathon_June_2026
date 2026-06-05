import { ref } from "vue";
import type { AssumptionLog } from "../types/chat";

export interface AllocationCategory {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface PolicyParameter {
  id: string;
  label: string;
  description?: string;
  type: "allocation" | "range" | "choice";
  // range
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  value?: number;
  // allocation
  categories?: AllocationCategory[];
  // choice
  options?: { value: string; label: string }[];
  selectedOption?: string;
}

export interface PolicyInsight {
  id: string;
  scenarioTitle: string;
  question: string;
  parametersSnapshot: Record<string, unknown>;
  timestamp: string;
}

// ── Parameter sets per scenario type ───────────────────────────────────────────

const BASE_WATER_PRIORITY: PolicyParameter = {
  id: "water_priority",
  label: "Watergebruik prioriteit",
  description: "Hoe wordt beschikbaar water verdeeld bij schaarste?",
  type: "allocation",
  categories: [
    { id: "drinking", label: "Drinkwater",  value: 65, color: "#3b82f6" },
    { id: "agriculture", label: "Landbouw", value: 25, color: "#22c55e" },
    { id: "industry", label: "Industrie",   value: 10, color: "#f59e0b" },
  ],
};

const PARAMETER_SETS: Record<string, PolicyParameter[]> = {
  salinity_shock: [
    BASE_WATER_PRIORITY,
    {
      id: "protection_radius_km",
      label: "Beschermingszone innamepunten",
      description: "Minimale bufferzone rond innamepunten",
      type: "range",
      min: 1, max: 20, step: 1, unit: "km", value: 5,
    },
    {
      id: "reserve_weeks",
      label: "Minimale noodreserve",
      description: "Buffer in weken bij uitval innamepunt",
      type: "range",
      min: 1, max: 16, step: 1, unit: "weken", value: 4,
    },
  ],

  population_growth: [
    {
      id: "water_priority",
      label: "Watergebruik prioriteit (groei)",
      description: "Hoe wordt extra watervraag door groei verdeeld?",
      type: "allocation",
      categories: [
        { id: "drinking",    label: "Drinkwater",  value: 70, color: "#3b82f6" },
        { id: "agriculture", label: "Landbouw",     value: 15, color: "#22c55e" },
        { id: "industry",   label: "Industrie",    value: 15, color: "#f59e0b" },
      ],
    },
    {
      id: "densification_pct",
      label: "Verdichting vs. uitbreiding",
      description: "Aandeel nieuwbouw via verdichting bestaand stedelijk gebied",
      type: "range",
      min: 0, max: 100, step: 5, unit: "% verdichting", value: 60,
    },
    {
      id: "infrastructure_expansion_pct",
      label: "Infrastructuurcapaciteit uitbreiding",
      description: "Benodigde uitbreiding drinkwaterinfrastructuur",
      type: "range",
      min: 0, max: 50, step: 5, unit: "%", value: 20,
    },
  ],

  climate_stress: [
    {
      id: "water_priority",
      label: "Watergebruik prioriteit (klimaat)",
      description: "Prioriteitsvolgorde bij klimaatgerelateerde schaarste",
      type: "allocation",
      categories: [
        { id: "drinking",  label: "Drinkwater",  value: 70, color: "#3b82f6" },
        { id: "nature",    label: "Natuur",       value: 20, color: "#10b981" },
        { id: "agriculture", label: "Landbouw",   value: 10, color: "#22c55e" },
      ],
    },
    {
      id: "climate_scenario",
      label: "KNMI klimaatscenario",
      description: "Welk klimaatscenario geldt als planningsbasis?",
      type: "choice",
      options: [
        { value: "GL", label: "GL — gematigd droog" },
        { value: "GH", label: "GH — gematigd nat"  },
        { value: "WL", label: "WL — warm droog"    },
        { value: "WH", label: "WH — warm nat"      },
      ],
      selectedOption: "WL",
    },
    {
      id: "adaptation_ambition",
      label: "Ambitieniveau klimaatadaptatie",
      description: "Hoeveel van het waternetwerk wordt klimaatbestendig gemaakt?",
      type: "range",
      min: 0, max: 100, step: 10, unit: "%", value: 60,
    },
  ],

  combined_shock: [
    {
      id: "water_priority",
      label: "Watergebruik prioriteit (crisis)",
      description: "Prioriteit bij gelijktijdige crises",
      type: "allocation",
      categories: [
        { id: "drinking",    label: "Drinkwater",  value: 80, color: "#3b82f6" },
        { id: "industry",   label: "Industrie",    value: 12, color: "#f59e0b" },
        { id: "agriculture", label: "Landbouw",     value: 8,  color: "#22c55e" },
      ],
    },
    {
      id: "crisis_threshold_pct",
      label: "Crisisdrempel activering",
      description: "Bij welk percentage tekort wordt crisisprotocol geactiveerd?",
      type: "range",
      min: 5, max: 50, step: 5, unit: "% tekort", value: 20,
    },
    {
      id: "reserve_weeks",
      label: "Strategische reserve",
      type: "range",
      min: 2, max: 26, step: 1, unit: "weken", value: 6,
    },
  ],

  regulation: [
    {
      id: "water_priority",
      label: "Watergebruik prioriteit (KRW)",
      type: "allocation",
      categories: [
        { id: "nature",      label: "Ecologie",    value: 40, color: "#10b981" },
        { id: "drinking",    label: "Drinkwater",  value: 40, color: "#3b82f6" },
        { id: "agriculture", label: "Landbouw",     value: 20, color: "#22c55e" },
      ],
    },
    {
      id: "compliance_deadline",
      label: "KRW-doelstellingsjaar",
      type: "range",
      min: 2027, max: 2045, step: 1, unit: "", value: 2033,
    },
  ],

  opportunity: [
    {
      id: "water_priority",
      label: "Duurzame waterbestemming",
      description: "Welk gebruik wordt ondersteund vanuit robuustere watervoorziening?",
      type: "allocation",
      categories: [
        { id: "nature",      label: "Natuur/spons",  value: 40, color: "#10b981" },
        { id: "drinking",    label: "Drinkwater",     value: 40, color: "#3b82f6" },
        { id: "agriculture", label: "Landbouw",        value: 20, color: "#22c55e" },
      ],
    },
    {
      id: "investment_pct_gdp",
      label: "Investeringsniveau",
      type: "range",
      min: 0, max: 5, step: 0.5, unit: "% begroting", value: 1.5,
    },
  ],

  default: [
    BASE_WATER_PRIORITY,
    {
      id: "time_horizon",
      label: "Tijdshorizon analyse",
      type: "range",
      min: 2025, max: 2050, step: 5, unit: "", value: 2040,
    },
  ],
};

// ── Module-level singleton state ────────────────────────────────────────────────

export const policyPanelOpen  = ref(false);
export const activeScenarioType  = ref<string | null>(null);
export const activeScenarioTitle = ref<string>("");
export const parameters = ref<PolicyParameter[]>([]);
export const insights   = ref<PolicyInsight[]>([]);

// ── Composable ──────────────────────────────────────────────────────────────────

export function usePolicyBuilder() {
  function setScenarioContext(log: AssumptionLog) {
    const type = log.scenario_type ?? "default";
    activeScenarioTitle.value = log.title || type;

    // Reload parameters when scenario type changes
    if (type !== activeScenarioType.value) {
      activeScenarioType.value = type;
      const template = PARAMETER_SETS[type] ?? PARAMETER_SETS.default;
      parameters.value = JSON.parse(JSON.stringify(template));
    }

    policyPanelOpen.value = true;
  }

  // Adjust one allocation slider — others redistribute proportionally
  function adjustAllocation(paramId: string, categoryId: string, newValue: number) {
    const param = parameters.value.find((p) => p.id === paramId);
    if (!param?.categories) return;

    const cat = param.categories.find((c) => c.id === categoryId);
    if (!cat) return;

    cat.value = Math.max(0, Math.min(100, Math.round(newValue)));

    const others = param.categories.filter((c) => c.id !== categoryId);
    const othersTotal = others.reduce((s, c) => s + c.value, 0);
    const remaining = 100 - cat.value;

    if (othersTotal > 0) {
      for (const other of others) {
        other.value = Math.round((other.value / othersTotal) * remaining);
      }
    } else {
      // Distribute evenly when all others are zero
      const share = Math.floor(remaining / others.length);
      others.forEach((o) => (o.value = share));
    }

    // Fix rounding drift
    const total = param.categories.reduce((s, c) => s + c.value, 0);
    if (total !== 100) {
      const last = others[others.length - 1];
      if (last) last.value += 100 - total;
    }
  }

  function setRangeValue(paramId: string, value: number) {
    const param = parameters.value.find((p) => p.id === paramId);
    if (param) param.value = value;
  }

  function setChoiceValue(paramId: string, value: string) {
    const param = parameters.value.find((p) => p.id === paramId);
    if (param) param.selectedOption = value;
  }

  // Build a natural-language parameter context to prepend to a chat message
  function buildParameterContext(): string {
    if (!parameters.value.length) return "";

    const lines: string[] = [];

    for (const p of parameters.value) {
      if (p.type === "allocation" && p.categories) {
        const parts = p.categories.map((c) => `${c.label} ${c.value}%`).join(", ");
        lines.push(`${p.label}: ${parts}`);
      } else if (p.type === "range" && p.value !== undefined) {
        lines.push(`${p.label}: ${p.value}${p.unit ? " " + p.unit : ""}`);
      } else if (p.type === "choice" && p.selectedOption) {
        const opt = p.options?.find((o) => o.value === p.selectedOption);
        lines.push(`${p.label}: ${opt?.label ?? p.selectedOption}`);
      }
    }

    return lines.length
      ? `[Beleidsparameters: ${lines.join(" | ")}]\n`
      : "";
  }

  function addInsight(question: string) {
    if (!activeScenarioType.value) return;
    const snapshot: Record<string, unknown> = {};
    for (const p of parameters.value) {
      if (p.type === "allocation" && p.categories) {
        snapshot[p.id] = Object.fromEntries(p.categories.map((c) => [c.id, c.value]));
      } else if (p.type === "range") {
        snapshot[p.id] = p.value;
      } else if (p.type === "choice") {
        snapshot[p.id] = p.selectedOption;
      }
    }
    insights.value.push({
      id: crypto.randomUUID(),
      scenarioTitle: activeScenarioTitle.value,
      question: question.replace(/^\[Beleidsparameters:.*?\]\n/, "").trim(),
      parametersSnapshot: snapshot,
      timestamp: new Date().toISOString(),
    });
  }

  function generatePolicyDraft(): string {
    const date = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
    const lines = [
      `# Beleidsnotitie — Drinkwaterzekerheid Zuid-Holland 2040`,
      `Datum: ${date}`,
      "",
      "## Achtergrond",
      "Deze notitie is opgesteld op basis van een ruimtelijke analyse van drinkwaterrisico's " +
        "voor de provincie Zuid-Holland voor de periode tot 2040. " +
        "De analyses zijn uitgevoerd met H3-ruimtelijke data en AI-gedreven scenario-analyse.",
      "",
      "## Geanalyseerde scenario's en beleidsinstellingen",
      "",
    ];

    for (let i = 0; i < insights.value.length; i++) {
      const ins = insights.value[i];
      lines.push(`### ${i + 1}. ${ins.scenarioTitle}`);
      lines.push(`**Analyseervraag:** ${ins.question}`);
      lines.push("");
      lines.push("**Beleidsinstellingen:**");
      for (const [key, val] of Object.entries(ins.parametersSnapshot)) {
        if (typeof val === "object" && val !== null) {
          const parts = Object.entries(val as Record<string, number>)
            .map(([k, v]) => `${k} ${v}%`)
            .join(", ");
          lines.push(`- ${key}: ${parts}`);
        } else {
          lines.push(`- ${key}: ${val}`);
        }
      }
      lines.push("");
    }

    lines.push("## Aanbevelingen");
    lines.push("*(Vul aan op basis van de bovenstaande analyse-uitkomsten)*");
    lines.push("");
    lines.push("## Woo-verantwoording");
    lines.push("Deze beleidsnotitie is opgesteld met behulp van openbare ruimtelijke datasets " +
      "en voldoet aan de transparantievereisten van de Wet open overheid (Woo).");

    return lines.join("\n");
  }

  return {
    policyPanelOpen,
    activeScenarioType,
    activeScenarioTitle,
    parameters,
    insights,
    setScenarioContext,
    adjustAllocation,
    setRangeValue,
    setChoiceValue,
    buildParameterContext,
    addInsight,
    generatePolicyDraft,
  };
}
