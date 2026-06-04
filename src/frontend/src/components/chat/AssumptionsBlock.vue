<script setup lang="ts">
import { ref } from "vue";
import type { AssumptionLog } from "../../types/chat";

const props = defineProps<{
	log: AssumptionLog;
}>();

const expanded = ref(false);

const SCENARIO_TYPE_LABELS: Record<string, string> = {
	salinity_shock: "Verzilting-shock",
	population_growth: "Bevolkingsgroei",
	climate_stress: "Klimaatstress",
	combined_shock: "Gecombineerde druk",
	regulation: "KRW / Regelgeving",
	opportunity: "Kans voor robuustheid",
	datacenter: "Datacenter",
};
</script>

<template>
  <div class="assumptions-block">
    <button class="assumptions-toggle" @click="expanded = !expanded">
      <span class="scenario-badge">Scenario: {{ log.title || SCENARIO_TYPE_LABELS[log.scenario_type] || log.scenario_type }}</span>
      <span class="toggle-icon">{{ expanded ? '▲' : '▼' }}</span>
      <span class="toggle-label">Aannames &amp; begrenzingen</span>
    </button>

    <div v-if="expanded" class="assumptions-body">

      <div v-if="log.datasets_to_use?.length" class="section">
        <p class="section-title">Gebruikte datasets</p>
        <ul>
          <li v-for="ds in log.datasets_to_use" :key="ds">{{ ds }}</li>
        </ul>
      </div>

      <div v-if="log.assumptions?.length" class="section">
        <p class="section-title">Aannames</p>
        <ul>
          <li v-for="a in log.assumptions" :key="a">{{ a }}</li>
        </ul>
      </div>

      <div v-if="log.limitations?.length" class="section">
        <p class="section-title">Begrenzingen</p>
        <ul>
          <li v-for="l in log.limitations" :key="l">{{ l }}</li>
        </ul>
      </div>

      <div v-if="Object.keys(log.stakeholder_impacts || {}).length" class="section">
        <p class="section-title">Stakeholderimpact</p>
        <ul>
          <li v-for="(impact, stakeholder) in log.stakeholder_impacts" :key="stakeholder">
            <strong>{{ stakeholder }}</strong>: {{ impact }}
          </li>
        </ul>
      </div>

      <div class="horizon-note">
        Horizon: <strong>{{ log.horizon_year }}</strong>
        <span v-if="log.climate_scenario"> · KNMI-scenario <strong>{{ log.climate_scenario }}</strong></span>
        <span v-if="log.salinity_duration_weeks"> · Verzilting <strong>{{ log.salinity_duration_weeks }} weken</strong></span>
        <span v-if="log.population_growth_pct"> · Bevolkingsgroei <strong>+{{ log.population_growth_pct }}%</strong></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assumptions-block {
  max-width: 85%;
  margin-top: 0.5rem;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  overflow: hidden;
  font-size: 0.82rem;
}

.assumptions-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.7rem;
  background: #fffbeb;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.8rem;
  color: #78350f;
}

.assumptions-toggle:hover {
  background: #fef3c7;
}

.scenario-badge {
  background: #f59e0b;
  color: white;
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.toggle-label {
  flex: 1;
  font-weight: 500;
}

.toggle-icon {
  font-size: 0.65rem;
  color: #92400e;
}

.assumptions-body {
  background: #fffdf5;
  padding: 0.6rem 0.8rem;
  border-top: 1px solid #fde68a;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.section ul {
  margin: 0;
  padding-left: 1.2rem;
  color: #451a03;
}

.section li {
  margin-bottom: 0.15rem;
  line-height: 1.4;
}

.horizon-note {
  font-size: 0.75rem;
  color: #78350f;
  border-top: 1px solid #fde68a;
  padding-top: 0.4rem;
}
</style>
