<script setup lang="ts">
import { ref, computed } from "vue";
import type { AssumptionLog } from "../../types/chat";

const props = defineProps<{ log: AssumptionLog }>();

const openSection = ref<string | null>(null);

const SCENARIO_META: Record<string, { label: string; icon: string }> = {
  salinity_shock:    { label: "Verzilting-shock",   icon: "🌊" },
  population_growth: { label: "Bevolkingsgroei",     icon: "👥" },
  climate_stress:    { label: "Klimaatstress",       icon: "☀️" },
  combined_shock:    { label: "Gecombineerde druk",  icon: "⚡" },
  regulation:        { label: "KRW / Regelgeving",   icon: "📋" },
  opportunity:       { label: "Kans & robuustheid",  icon: "🌿" },
  datacenter:        { label: "Datacenter",          icon: "🖥️" },
};

const meta = computed(
  () => SCENARIO_META[props.log.scenario_type] ?? { label: props.log.scenario_type, icon: "📊" },
);

const chips = computed(() => {
  const out: { label: string; title: string }[] = [];
  if (props.log.horizon_year)
    out.push({ label: String(props.log.horizon_year), title: "Horizonjaar" });
  if (props.log.climate_scenario)
    out.push({ label: `KNMI ${props.log.climate_scenario}`, title: "Klimaatscenario" });
  if (props.log.salinity_duration_weeks)
    out.push({ label: `${props.log.salinity_duration_weeks} wk verzilting`, title: "Verziltingsduur" });
  if (props.log.population_growth_pct)
    out.push({ label: `+${props.log.population_growth_pct}%`, title: "Bevolkingsgroei" });
  return out;
});

const hasMatrix = computed(() => props.log.scenario_matrix?.length > 0);
const hasDecisions = computed(() => props.log.decision_points?.length > 0);

const decisionStatusColor: Record<string, string> = {
  open: "#EF9F27",
  vastgesteld: "#2E9B74",
  geblokkeerd: "#ef4444",
};

const decisionStatusLabel: Record<string, string> = {
  open: "Open",
  vastgesteld: "Vastgesteld",
  geblokkeerd: "Geblokkeerd",
};

function toggle(s: string) {
  openSection.value = openSection.value === s ? null : s;
}
</script>

<template>
  <div class="scenario-card">
    <!-- Header -->
    <div class="card-header">
      <span class="s-icon">{{ meta.icon }}</span>
      <div class="header-body">
        <span class="s-title">{{ log.title || meta.label }}</span>
        <span class="s-type">{{ meta.label }}</span>
      </div>
      <span class="woo-tag" title="Aannames en begrenzingen vastgelegd voor beleidsverantwoording">Woo ✓</span>
    </div>

    <!-- Parameter chips (always visible) -->
    <div v-if="chips.length" class="chips-row">
      <span v-for="c in chips" :key="c.label" class="chip" :title="c.title">{{ c.label }}</span>
    </div>

    <!-- Datasets used (always visible) -->
    <div v-if="log.datasets_to_use?.length" class="datasets-row">
      <span class="row-label">Data</span>
      <span v-for="ds in log.datasets_to_use" :key="ds" class="ds-chip">{{ ds }}</span>
    </div>

    <!-- ── Scenario comparison matrix ── -->
    <div v-if="hasMatrix" class="acc-item">
      <button class="acc-btn" @click="toggle('matrix')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="acc-icon">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span>Scenario-vergelijking</span>
        <span class="acc-count">{{ log.scenario_matrix.length }}</span>
        <span class="acc-arrow">{{ openSection === 'matrix' ? '▴' : '▾' }}</span>
      </button>
      <div v-if="openSection === 'matrix'" class="acc-body matrix-body">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="th-theme">Thema</th>
              <th class="th-laag">
                <span class="level-dot laag" />Laag
              </th>
              <th class="th-midden">
                <span class="level-dot midden" />Midden
              </th>
              <th class="th-hoog">
                <span class="level-dot hoog" />Hoog
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in log.scenario_matrix" :key="row.theme">
              <td class="td-theme">{{ row.theme }}</td>
              <td class="td-impact laag">{{ row.laag }}</td>
              <td class="td-impact midden">{{ row.midden }}</td>
              <td class="td-impact hoog">{{ row.hoog }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Decision points ── -->
    <div v-if="hasDecisions" class="acc-item">
      <button class="acc-btn" @click="toggle('decisions')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="acc-icon">
          <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <span>Beslispunten</span>
        <span class="acc-count open-count">{{ log.decision_points.filter(d => d.status === 'open').length }} open</span>
        <span class="acc-arrow">{{ openSection === 'decisions' ? '▴' : '▾' }}</span>
      </button>
      <div v-if="openSection === 'decisions'" class="acc-body decisions-body">
        <div v-for="dp in log.decision_points" :key="dp.title" class="decision-card">
          <div class="decision-header">
            <span class="decision-title">{{ dp.title }}</span>
            <span
              class="decision-status"
              :style="{ background: `${decisionStatusColor[dp.status]}20`, color: decisionStatusColor[dp.status], borderColor: `${decisionStatusColor[dp.status]}50` }"
            >{{ decisionStatusLabel[dp.status] }}</span>
          </div>
          <p class="decision-desc">{{ dp.description }}</p>
        </div>
      </div>
    </div>

    <!-- Accordion: Aannames / Begrenzingen / Stakeholders -->
    <div class="accordion">
      <div v-if="log.assumptions?.length" class="acc-item">
        <button class="acc-btn" @click="toggle('a')">
          <span>Aannames</span>
          <span class="acc-count">{{ log.assumptions.length }}</span>
          <span class="acc-arrow">{{ openSection === 'a' ? '▴' : '▾' }}</span>
        </button>
        <ul v-if="openSection === 'a'" class="acc-body list">
          <li v-for="a in log.assumptions" :key="a">{{ a }}</li>
        </ul>
      </div>

      <div v-if="log.limitations?.length" class="acc-item">
        <button class="acc-btn" @click="toggle('l')">
          <span>Begrenzingen</span>
          <span class="acc-count">{{ log.limitations.length }}</span>
          <span class="acc-arrow">{{ openSection === 'l' ? '▴' : '▾' }}</span>
        </button>
        <ul v-if="openSection === 'l'" class="acc-body list">
          <li v-for="l in log.limitations" :key="l">{{ l }}</li>
        </ul>
      </div>

      <div v-if="Object.keys(log.stakeholder_impacts || {}).length" class="acc-item">
        <button class="acc-btn" @click="toggle('s')">
          <span>Stakeholders</span>
          <span class="acc-count">{{ Object.keys(log.stakeholder_impacts).length }}</span>
          <span class="acc-arrow">{{ openSection === 's' ? '▴' : '▾' }}</span>
        </button>
        <dl v-if="openSection === 's'" class="acc-body dl">
          <template v-for="(impact, key) in log.stakeholder_impacts" :key="key">
            <dt>{{ key }}</dt>
            <dd>{{ impact }}</dd>
          </template>
        </dl>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scenario-card {
  max-width: 85%;
  margin-bottom: 0.5rem;
  border: 1px solid #9ec8e0;
  border-left: 3px solid #2B5E80;
  border-radius: 8px;
  background: #f7fbfd;
  font-size: 0.82rem;
  overflow: hidden;
}

/* ── Header ── */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #d0e8f5;
  background: #eef6fb;
}

.s-icon {
  font-size: 1.15rem;
  line-height: 1;
  flex-shrink: 0;
}

.header-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.s-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: #1a3d52;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.s-type {
  font-size: 0.68rem;
  color: #2B5E80;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.woo-tag {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  letter-spacing: 0.02em;
  cursor: default;
}

/* ── Parameter chips ── */
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #d0e8f5;
}

.chip {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

/* ── Datasets ── */
.datasets-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid #d0e8f5;
}

.row-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.ds-chip {
  font-size: 0.64rem;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  font-family: ui-monospace, monospace;
}

/* ── Accordion shared ── */
.accordion {
  display: flex;
  flex-direction: column;
}

.acc-item {
  border-bottom: 1px solid #d0e8f5;
}

.acc-item:last-child {
  border-bottom: none;
}

.acc-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.35rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1a3d52;
  text-align: left;
}

.acc-btn:hover {
  background: #eef6fb;
}

.acc-icon {
  flex-shrink: 0;
  color: #2B5E80;
}

.acc-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  border-radius: 99px;
  background: #bfdbfe;
  color: #1e40af;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0 4px;
  margin-left: auto;
}

.acc-count.open-count {
  background: #fde68a;
  color: #78350f;
}

.acc-arrow {
  font-size: 0.58rem;
  color: #2B5E80;
  flex-shrink: 0;
}

.acc-body {
  padding: 0.35rem 0.75rem 0.5rem;
  background: #f0f8fd;
}

.acc-body.list {
  padding-left: 1.75rem;
  margin: 0;
  color: #1a3d52;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.76rem;
  line-height: 1.45;
}

.acc-body.dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.5rem;
}

.acc-body.dl dt {
  font-weight: 600;
  color: #2B5E80;
  font-size: 0.72rem;
  text-transform: capitalize;
}

.acc-body.dl dd {
  margin: 0;
  color: #1a3d52;
  font-size: 0.75rem;
  line-height: 1.4;
}

/* ── Scenario comparison matrix ── */
.matrix-body {
  padding: 0.4rem 0.5rem;
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
  table-layout: fixed;
}

.matrix-table th,
.matrix-table td {
  padding: 0.28rem 0.4rem;
  text-align: left;
  vertical-align: top;
  border: 1px solid #d0e8f5;
}

.matrix-table thead tr {
  background: #dbeafe;
}

.th-theme {
  width: 22%;
  font-weight: 700;
  color: #1e40af;
}

.th-laag,
.th-midden,
.th-hoog {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}

.th-laag { color: #15803d; }
.th-midden { color: #92400e; }
.th-hoog { color: #b91c1c; }

.level-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.level-dot.laag   { background: #2E9B74; }
.level-dot.midden { background: #EF9F27; }
.level-dot.hoog   { background: #ef4444; }

.td-theme {
  font-weight: 600;
  color: #1a3d52;
  font-size: 0.68rem;
}

.td-impact {
  color: #374151;
  line-height: 1.3;
  font-size: 0.68rem;
}

.td-impact.laag   { background: #f0fdf4; }
.td-impact.midden { background: #fffbeb; }
.td-impact.hoog   { background: #fef2f2; }

.matrix-table tbody tr:hover td {
  background: #e0f2fe;
}

/* ── Decision points ── */
.decisions-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0.4rem 0.75rem 0.5rem;
}

.decision-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  background: white;
}

.decision-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.decision-title {
  font-weight: 700;
  font-size: 0.74rem;
  color: #1a3d52;
  flex: 1;
}

.decision-status {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.08rem 0.4rem;
  border-radius: 99px;
  border: 1px solid;
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

.decision-desc {
  margin: 0;
  font-size: 0.7rem;
  color: #6b7280;
  line-height: 1.4;
}
</style>
