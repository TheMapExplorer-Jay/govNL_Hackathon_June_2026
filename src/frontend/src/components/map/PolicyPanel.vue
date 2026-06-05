<script setup lang="ts">
import { ref, computed } from "vue";
import { useChat } from "../../composables/useChat";
import { useDataDictionary } from "../../composables/useDataDictionary";
import { useLayerPanel } from "../../composables/useLayerPanel";
import {
  usePolicyBuilder,
  policyPanelOpen,
  activeScenarioTitle,
  parameters,
  insights,
} from "../../composables/usePolicyBuilder";

const {
  adjustAllocation,
  setRangeValue,
  setChoiceValue,
  buildParameterContext,
  addInsight,
  generatePolicyDraft,
} = usePolicyBuilder();

const { sendMessage } = useChat();
const { layerStates } = useLayerPanel();
const { dictionary } = useDataDictionary();

const activeTab = ref<"parameters" | "notities">("parameters");

// ── Allocation bar visual ────────────────────────────────────────────────────

function allocationSegments(categories: { id: string; label: string; value: number; color: string }[]) {
  return categories.map((c) => ({ ...c, pct: `${c.value}%` }));
}

// ── Analyse with current parameters ─────────────────────────────────────────

const analysisQuestion = ref("");

function runAnalysis() {
  // Resolve active-layer friendly names from the data dictionary
  const labelMap = new Map<string, string>();
  if (dictionary.value) {
    for (const theme of dictionary.value.themes) {
      for (const table of theme.tables) {
        labelMap.set(table.name, `${table.name.replace(/_/g, " ")} (${theme.name})`);
      }
    }
  }

  const activeLayers = Object.entries(layerStates.value)
    .filter(([, s]) => s.active)
    .map(([id]) => labelMap.get(id) ?? id.replace(/_/g, " "));

  const paramContext = buildParameterContext();
  const layerContext = activeLayers.length > 0
    ? `[Actieve kaartlagen: ${activeLayers.join(" | ")}]\n`
    : "";

  const userQuestion = analysisQuestion.value.trim();

  const policyInstruction =
    `Voer een volledige beleidsanalyse uit voor drinkwaterzekerheid in Zuid-Holland 2040 ` +
    `op basis van de bovenstaande parameters en actieve kaartlagen. Structureer het antwoord als:\n` +
    `1. **Beleidsstructuur** – wat moet het beleid verplicht bevatten om effectief te zijn?\n` +
    `2. **Ontbrekende aandachtspunten** – welke kritieke aspecten ontbreken in de huidige instelling?\n` +
    `3. **Ruimtelijke risicokaart** – genereer een kaartvisualisatie met een kolom "scenario_level" ` +
    `met waarden "laag", "midden" of "hoog" die de gebieden classificeert op drinkwaterrisico ` +
    `voor elk van de drie risiconiveaus in 2040.` +
    (userQuestion ? `\n\nAanvullende vraag: ${userQuestion}` : "");

  const fullMessage = paramContext + layerContext + policyInstruction;

  addInsight(fullMessage);
  sendMessage(fullMessage);
  analysisQuestion.value = "";
}

// ── Copy policy draft ────────────────────────────────────────────────────────

const copyFeedback = ref(false);

async function copyDraft() {
  const draft = generatePolicyDraft();
  await navigator.clipboard.writeText(draft);
  copyFeedback.value = true;
  setTimeout(() => (copyFeedback.value = false), 2000);
}

// Formatted timestamp
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

const hasContent = computed(() => parameters.value.length > 0);
</script>

<template>
  <!-- Toggle button -->
  <button
    class="policy-toggle-btn"
    :class="{ active: policyPanelOpen }"
    title="Beleidsparameters"
    @click="policyPanelOpen = !policyPanelOpen"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
    Beleid
    <span v-if="insights.length > 0" class="insight-badge">{{ insights.length }}</span>
  </button>

  <!-- Panel -->
  <Transition name="panel-slide">
    <div v-if="policyPanelOpen && hasContent" class="policy-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <span class="panel-icon">📋</span>
          <div class="header-text">
            <span class="panel-title">Beleidsparameters</span>
            <span class="panel-subtitle">{{ activeScenarioTitle }}</span>
          </div>
        </div>
        <button class="close-btn" @click="policyPanelOpen = false">✕</button>
      </div>

      <!-- Tabs -->
      <div class="tab-row">
        <button class="tab-btn" :class="{ active: activeTab === 'parameters' }" @click="activeTab = 'parameters'">
          Parameters
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'notities' }" @click="activeTab = 'notities'">
          Notities
          <span v-if="insights.length" class="tab-count">{{ insights.length }}</span>
        </button>
      </div>

      <!-- ── Parameters tab ── -->
      <div v-if="activeTab === 'parameters'" class="tab-body">
        <div v-for="param in parameters" :key="param.id" class="param-block">
          <div class="param-label">
            {{ param.label }}
            <span v-if="param.description" class="param-desc">{{ param.description }}</span>
          </div>

          <!-- Allocation (three-way split) -->
          <template v-if="param.type === 'allocation' && param.categories">
            <!-- Stacked color bar -->
            <div class="alloc-bar">
              <div
                v-for="cat in allocationSegments(param.categories)"
                :key="cat.id"
                class="alloc-segment"
                :style="{ width: cat.pct, background: cat.color }"
                :title="`${cat.label}: ${cat.value}%`"
              />
            </div>
            <!-- Sliders -->
            <div v-for="cat in param.categories" :key="cat.id" class="alloc-row">
              <span class="alloc-dot" :style="{ background: cat.color }" />
              <span class="alloc-label">{{ cat.label }}</span>
              <input
                type="range"
                :min="0"
                :max="100"
                :step="1"
                :value="cat.value"
                class="alloc-slider"
                :style="{ accentColor: cat.color }"
                @input="adjustAllocation(param.id, cat.id, Number(($event.target as HTMLInputElement).value))"
              />
              <span class="alloc-pct">{{ cat.value }}%</span>
            </div>
          </template>

          <!-- Range slider -->
          <template v-else-if="param.type === 'range'">
            <div class="range-row">
              <span class="range-min">{{ param.min }}</span>
              <input
                type="range"
                :min="param.min"
                :max="param.max"
                :step="param.step ?? 1"
                :value="param.value"
                class="range-slider"
                @input="setRangeValue(param.id, Number(($event.target as HTMLInputElement).value))"
              />
              <span class="range-max">{{ param.max }}</span>
            </div>
            <div class="range-value">
              <strong>{{ param.value }}</strong>
              <span v-if="param.unit" class="range-unit"> {{ param.unit }}</span>
            </div>
          </template>

          <!-- Choice (button group) -->
          <template v-else-if="param.type === 'choice' && param.options">
            <div class="choice-row">
              <button
                v-for="opt in param.options"
                :key="opt.value"
                class="choice-btn"
                :class="{ active: param.selectedOption === opt.value }"
                @click="setChoiceValue(param.id, opt.value)"
              >
                {{ opt.value }}
              </button>
            </div>
            <span class="choice-desc">
              {{ param.options.find(o => o.value === param.selectedOption)?.label }}
            </span>
          </template>
        </div>

        <!-- Analysis question + run button -->
        <div class="analysis-section">
          <textarea
            v-model="analysisQuestion"
            class="analysis-input"
            rows="2"
            placeholder="Stel een vervolgvraag of laat leeg voor automatische analyse…"
          />
          <button class="run-btn" @click="runAnalysis">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
            Analyseer met deze parameters
          </button>
        </div>
      </div>

      <!-- ── Notities tab ── -->
      <div v-else-if="activeTab === 'notities'" class="tab-body">
        <div v-if="insights.length === 0" class="empty-notities">
          Voer een analyse uit om beleidsnotities op te bouwen.
        </div>

        <div v-for="(ins, i) in insights" :key="ins.id" class="insight-card">
          <div class="insight-meta">
            <span class="insight-num">{{ i + 1 }}</span>
            <span class="insight-title">{{ ins.scenarioTitle }}</span>
            <span class="insight-time">{{ formatTime(ins.timestamp) }}</span>
          </div>
          <p class="insight-question">{{ ins.question }}</p>
          <div class="insight-params">
            <span v-for="(val, key) in ins.parametersSnapshot" :key="key" class="insight-param-chip">
              <template v-if="typeof val === 'object' && val !== null">
                {{ Object.entries(val as Record<string,number>).map(([k, v]) => `${k} ${v}%`).join(" · ") }}
              </template>
              <template v-else>{{ key }}: {{ val }}</template>
            </span>
          </div>
        </div>

        <button v-if="insights.length > 0" class="draft-btn" @click="copyDraft">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          {{ copyFeedback ? "Gekopieerd ✓" : "Kopieer beleidsnotitie" }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Toggle button ── */
.policy-toggle-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: white;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: background 0.1s;
}

.policy-toggle-btn:hover,
.policy-toggle-btn.active {
  background: #eef6fb;
  color: #2B5E80;
  border-color: #9ec8e0;
}

.insight-badge {
  background: #2E9B74;
  color: white;
  border-radius: 99px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 15px;
  text-align: center;
}

/* ── Panel ── */
.policy-panel {
  position: absolute;
  top: 46px;
  left: 10px;
  z-index: 10;
  width: 300px;
  max-height: calc(100% - 70px);
  background: white;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.13);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-icon {
  font-size: 1rem;
  line-height: 1;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.panel-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1f2937;
}

.panel-subtitle {
  font-size: 0.66rem;
  color: #6b7280;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #9ca3af;
  padding: 2px 4px;
  border-radius: 3px;
}

.close-btn:hover { background: #f3f4f6; color: #374151; }

/* ── Tabs ── */
.tab-row {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 6px 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.73rem;
  font-weight: 600;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: color 0.1s;
}

.tab-btn.active {
  color: #2B5E80;
  border-bottom: 2px solid #2E9B74;
}

.tab-btn:hover:not(.active) { color: #374151; }

.tab-count {
  background: #d1fae5;
  color: #065f46;
  border-radius: 99px;
  padding: 0 5px;
  font-size: 0.62rem;
  font-weight: 700;
}

/* ── Tab body ── */
.tab-body {
  overflow-y: auto;
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Parameter block ── */
.param-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f3f4f6;
}

.param-block:last-of-type { border-bottom: none; }

.param-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: #1f2937;
}

.param-desc {
  display: block;
  font-size: 0.64rem;
  font-weight: 400;
  color: #9ca3af;
  margin-top: 1px;
}

/* ── Allocation ── */
.alloc-bar {
  display: flex;
  height: 6px;
  border-radius: 99px;
  overflow: hidden;
  gap: 1px;
}

.alloc-segment {
  transition: width 0.2s ease;
  min-width: 2px;
}

.alloc-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.alloc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alloc-label {
  font-size: 0.68rem;
  color: #374151;
  width: 60px;
  flex-shrink: 0;
}

.alloc-slider {
  flex: 1;
  height: 3px;
  cursor: pointer;
}

.alloc-pct {
  font-size: 0.68rem;
  font-weight: 600;
  color: #374151;
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}

/* ── Range ── */
.range-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.range-min,
.range-max {
  font-size: 0.62rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.range-slider {
  flex: 1;
  accent-color: #3b82f6;
  cursor: pointer;
}

.range-value {
  font-size: 0.78rem;
  color: #1f2937;
  text-align: center;
}

.range-unit {
  color: #6b7280;
  font-size: 0.7rem;
}

/* ── Choice ── */
.choice-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.choice-btn {
  padding: 3px 8px;
  border: 1.5px solid #e5e7eb;
  border-radius: 5px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  transition: all 0.1s;
}

.choice-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.choice-btn:hover:not(.active) { background: #f3f4f6; }

.choice-desc {
  font-size: 0.65rem;
  color: #6b7280;
}

/* ── Analysis section ── */
.analysis-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.analysis-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.74rem;
  font-family: inherit;
  resize: none;
  line-height: 1.4;
  color: #374151;
  box-sizing: border-box;
}

.analysis-input:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.15);
}

.run-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 10px;
  background: #2B5E80;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s;
}

.run-btn:hover { background: #1a3d52; }

/* ── Insights ── */
.empty-notities {
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
  padding: 1.5rem 0;
}

.insight-card {
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.insight-meta {
  display: flex;
  align-items: center;
  gap: 5px;
}

.insight-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #d1fae5;
  color: #065f46;
  font-size: 0.62rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.insight-time {
  font-size: 0.62rem;
  color: #9ca3af;
}

.insight-question {
  font-size: 0.7rem;
  color: #374151;
  margin: 0;
  line-height: 1.4;
}

.insight-params {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.insight-param-chip {
  font-size: 0.62rem;
  padding: 1px 5px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
}

.draft-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 10px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s;
  margin-top: 4px;
}

.draft-btn:hover { background: #f1f5f9; }

/* ── Transition ── */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
