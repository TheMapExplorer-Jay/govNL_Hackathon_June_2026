<script setup lang="ts">
import { computed } from "vue";
import { workflowStep, workflowCompleted, progressVisible } from "../../composables/useChat";

const STEPS = [
  { id: "scenario",     label: "Scenario",  n: 1 },
  { id: "intentie",     label: "Intentie",  n: 2 },
  { id: "sql",          label: "Query",     n: 3 },
  { id: "kaart",        label: "Kaart",     n: 4 },
  { id: "beschrijving", label: "Resultaat", n: 5 },
] as const;

type StepState = "done" | "active" | "pending";

function stepState(id: string): StepState {
  if (workflowCompleted.value.includes(id)) return "done";
  if (workflowStep.value === id) return "active";
  return "pending";
}

const hasStarted = computed(
  () => progressVisible.value && (workflowStep.value !== null || workflowCompleted.value.length > 0),
);

function connectorDone(index: number): boolean {
  return stepState(STEPS[index].id) === "done";
}
</script>

<template>
  <Transition name="progress-fade">
    <div v-if="hasStarted" class="workflow-progress">
      <template v-for="(step, i) in STEPS" :key="step.id">
        <!-- Connector line -->
        <div v-if="i > 0" class="connector" :class="{ done: connectorDone(i - 1) }" />

        <!-- Step -->
        <div class="step" :class="stepState(step.id)" :title="step.label">
          <div class="step-circle">
            <svg v-if="stepState(step.id) === 'done'" width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="2 6 5 9 10 3"/>
            </svg>
            <span v-else class="step-num">{{ step.n }}</span>
            <span v-if="stepState(step.id) === 'active'" class="pulse-ring" />
          </div>
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
  padding: 7px 16px;
  border-top: 1px solid #d0e8f5;
  background: #f7fbfd;
  gap: 0;
  overflow: hidden;
}

/* ── Connector ── */
.connector {
  flex: 1;
  height: 2px;
  background: #d0e8f5;
  transition: background 0.4s ease;
  margin: 0 2px;
  margin-bottom: 14px; /* align with circle center */
}

.connector.done {
  background: #2E9B74;
}

/* ── Step ── */
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.step-circle {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 700;
  transition: background 0.25s ease, border-color 0.25s ease;
  border: 2px solid;
}

/* pending */
.pending .step-circle {
  background: white;
  border-color: #d0e8f5;
  color: #9ca3af;
}

/* active */
.active .step-circle {
  background: #2B5E80;
  border-color: #2B5E80;
  color: white;
}

/* done */
.done .step-circle {
  background: #2E9B74;
  border-color: #2E9B74;
  color: white;
}

.step-num {
  font-size: 0.62rem;
  line-height: 1;
}

/* Pulse ring on active */
.pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #2B5E80;
  opacity: 0.5;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%   { transform: scale(1);   opacity: 0.5; }
  70%  { transform: scale(1.6); opacity: 0;   }
  100% { transform: scale(1.6); opacity: 0;   }
}

/* ── Labels ── */
.step-label {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 0.25s ease;
}

.pending .step-label  { color: #9ca3af; }
.active  .step-label  { color: #2B5E80; }
.done    .step-label  { color: #2E9B74; }

/* ── Fade transition ── */
.progress-fade-enter-active,
.progress-fade-leave-active {
  transition: opacity 0.35s ease, max-height 0.35s ease;
  max-height: 50px;
  overflow: hidden;
}

.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
