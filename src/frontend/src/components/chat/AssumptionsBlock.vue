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
  border: 1px solid #fde68a;
  border-left: 3px solid #f59e0b;
  border-radius: 8px;
  background: #fffdf5;
  font-size: 0.82rem;
  overflow: hidden;
}

/* ── Header ── */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #fde68a;
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
  color: #78350f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.s-type {
  font-size: 0.68rem;
  color: #92400e;
  font-weight: 500;
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
  border-bottom: 1px solid #fef3c7;
}

.chip {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* ── Datasets ── */
.datasets-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid #fef3c7;
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

/* ── Accordion ── */
.accordion {
  display: flex;
  flex-direction: column;
}

.acc-item {
  border-bottom: 1px solid #fef3c7;
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
  color: #78350f;
  text-align: left;
}

.acc-btn:hover {
  background: #fffbeb;
}

.acc-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  border-radius: 99px;
  background: #fde68a;
  color: #78350f;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0 4px;
  margin-left: auto;
}

.acc-arrow {
  font-size: 0.58rem;
  color: #92400e;
  flex-shrink: 0;
}

.acc-body {
  padding: 0.35rem 0.75rem 0.5rem;
  background: #fffbeb;
}

.acc-body.list {
  padding-left: 1.75rem;
  margin: 0;
  color: #451a03;
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
  color: #92400e;
  font-size: 0.72rem;
  text-transform: capitalize;
}

.acc-body.dl dd {
  margin: 0;
  color: #451a03;
  font-size: 0.75rem;
  line-height: 1.4;
}
</style>
