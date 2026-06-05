<script setup lang="ts">
import { computed } from "vue";
import { workflowStep, workflowCompleted, progressVisible } from "../../composables/useChat";

const STEPS = [
  { id: "scenario",     label: "Scenario" },
  { id: "intentie",     label: "Intentie" },
  { id: "sql",          label: "Query" },
  { id: "kaart",        label: "Kaart" },
  { id: "beschrijving", label: "Resultaat" },
] as const;

type StepState = "done" | "active" | "pending";

function stepState(id: string): StepState {
  if (workflowCompleted.value.includes(id)) return "done";
  if (workflowStep.value === id) return "active";
  return "pending";
}

// Show while progress is active AND at least one step has fired
const hasStarted = computed(
  () => progressVisible.value && (workflowStep.value !== null || workflowCompleted.value.length > 0),
);

// Index of the last done step — connectors up to this index are green
function connectorDone(index: number): boolean {
  // Connector between step[index] and step[index+1] is green when step[index] is done
  return stepState(STEPS[index].id) === "done";
}
</script>

<template>
  <Transition name="progress-fade">
    <div v-if="hasStarted" class="workflow-progress">
      <template v-for="(step, i) in STEPS" :key="step.id">
        <!-- Connector line (before each step except the first) -->
        <div v-if="i > 0" class="connector" :class="{ done: connectorDone(i - 1) }" />

        <!-- Step pill -->
        <div class="step" :class="stepState(step.id)">
          <span class="step-dot">
            <span v-if="stepState(step.id) === 'done'" class="check">✓</span>
            <span v-else-if="stepState(step.id) === 'active'" class="pulse-ring" />
          </span>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.workflow-progress {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
  gap: 0;
  overflow: hidden;
}

/* ── Connector line ── */
.connector {
  flex: 1;
  height: 1.5px;
  background: #e5e7eb;
  transition: background 0.4s ease;
}

.connector.done {
  background: #86efac;
}

/* ── Step pill ── */
.step {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.step-dot {
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.3s ease, border-color 0.3s ease;
}

/* pending */
.pending .step-dot {
  background: #f3f4f6;
  border: 1.5px solid #d1d5db;
}

/* active */
.active .step-dot {
  background: #3b82f6;
  border: 1.5px solid #3b82f6;
}

/* done */
.done .step-dot {
  background: #22c55e;
  border: 1.5px solid #22c55e;
}

/* Pulse ring on active step */
.pulse-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid #93c5fd;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%   { transform: scale(1);   opacity: 1; }
  70%  { transform: scale(1.7); opacity: 0; }
  100% { transform: scale(1.7); opacity: 0; }
}

.check {
  font-size: 9px;
  color: white;
  font-weight: 700;
  line-height: 1;
}

/* ── Labels ── */
.step-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: color 0.3s ease;
}

.pending .step-label  { color: #9ca3af; }
.active  .step-label  { color: #2563eb; }
.done    .step-label  { color: #16a34a; }

/* ── Fade transition ── */
.progress-fade-enter-active,
.progress-fade-leave-active {
  transition: opacity 0.4s ease, max-height 0.4s ease;
  max-height: 40px;
  overflow: hidden;
}

.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
