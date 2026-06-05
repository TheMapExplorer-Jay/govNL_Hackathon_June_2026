<script setup lang="ts">
import { marked } from "marked";
import { computed } from "vue";
import { useChat } from "../../composables/useChat";
import type { ChatMessage } from "../../types/chat";
import { formatNumber } from "../../utils/formatting";
import AssumptionsBlock from "./AssumptionsBlock.vue";
import ChartBlock from "./ChartBlock.vue";
import MessageFeedback from "./MessageFeedback.vue";
import ThinkingSummaryBlock from "./ThinkingSummaryBlock.vue";

marked.use({ gfm: true, breaks: true });

const props = defineProps<{
	message: ChatMessage;
}>();

const { sendMessage, isStreaming } = useChat();

const renderedContent = computed(() => {
	const content = props.message.content;
	if (!content) return "";
	return marked.parse(content) as string;
});

function selectOption(option: string) {
	if (isStreaming.value) return;
	sendMessage(option);
}

// ── Contextual follow-up suggestions (Priority 2) ─────────────────────────
const FOLLOW_UPS: Record<string, string[]> = {
  salinity_shock: [
    "Welke alternatieve innamepunten kunnen de Hollandse IJssel vervangen?",
    "Hoeveel bewoners vallen binnen de getroffen zes-uur-zones?",
  ],
  population_growth: [
    "Welke drinkwaterinfrastructuur staat het meest onder druk door de groei?",
    "Toon de huidige capaciteit van de zes-uur-zones in de groeigebieden",
  ],
  climate_stress: [
    "Welke intrekgebieden zijn het kwetsbaarst bij langdurige WL-droogte?",
    "Vergelijk de huidige grondwaterkwaliteit met de groenblauwe bufferzones",
  ],
  combined_shock: [
    "Welke gebieden zijn tegelijk kwetsbaar voor verzilting én bevolkingsdruk?",
    "Toon de overlap tussen risicogebieden op de kaart",
  ],
  regulation: [
    "Welke landbouwpercelen liggen in grondwaterbeschermingszones?",
    "Wat is de impact van KRW-handhaving op drinkwaterproductie?",
  ],
  opportunity: [
    "Welke sponzgebieden hebben het grootste potentieel voor grondwateraanvulling?",
    "Toon de overlap tussen het natuurnetwerk en drinkwaterintrekgebieden",
  ],
  datacenter: [
    "Hoeveel koelwater is beschikbaar voor nieuwe datacenters in Rijnland?",
    "Welke locaties combineren lage drinkwaterdruk met voldoende grondwater?",
  ],
};

const suggestedFollowUps = computed<string[]>(() => {
  if (
    props.message.isStreaming ||
    props.message.role !== "assistant" ||
    !props.message.assumptionLog?.is_scenario_question ||
    !props.message.content
  ) return [];
  return FOLLOW_UPS[props.message.assumptionLog.scenario_type] ?? [];
});
</script>

<template>
  <div class="chat-message" :class="message.role">
    <div v-if="message.role === 'assistant' && message.thinkingSummaries?.length" class="thinking-container">
      <ThinkingSummaryBlock
        v-for="s in message.thinkingSummaries"
        :key="s.step_id"
        :step-id="s.step_id"
        :summary="s.summary"
      />
    </div>

    <AssumptionsBlock
      v-if="message.role === 'assistant' && message.assumptionLog?.is_scenario_question"
      :log="message.assumptionLog!"
    />

    <div class="message-bubble">
      <div class="message-content markdown-body" v-html="renderedContent"></div>

      <div v-if="message.queryResults" class="results-info">
        {{ formatNumber(message.queryResults.length) }} resultaten gevonden
      </div>
    </div>

    <ChartBlock v-if="message.charts?.length" :charts="message.charts" />

    <!-- Clarification option chips (clickable answers to follow-up questions) -->
    <div
      v-if="message.role === 'assistant' && message.clarificationOptions?.options?.length"
      class="clarification-chips"
    >
      <button
        v-for="opt in message.clarificationOptions.options"
        :key="opt"
        class="clarification-chip"
        :disabled="isStreaming"
        @click="selectOption(opt)"
      >
        {{ opt }}
      </button>
    </div>

    <!-- Contextual follow-up suggestions (after scenario analysis) -->
    <div v-if="suggestedFollowUps.length" class="followup-row">
      <span class="followup-label">Verdiep:</span>
      <button
        v-for="q in suggestedFollowUps"
        :key="q"
        class="followup-chip"
        :disabled="isStreaming"
        @click="selectOption(q)"
      >
        {{ q }}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
        </svg>
      </button>
    </div>

    <MessageFeedback
      v-if="
        message.role === 'assistant' &&
        !message.isStreaming &&
        (message.content || message.sql || message.mapPlan)
      "
      :message="message"
    />
  </div>
</template>

<style scoped>
.thinking-container {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  padding: 0.2rem 0.5rem;
  margin-bottom: 0.4rem;
}

.chat-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.5rem 0.75rem;
}

.chat-message.user {
  align-items: flex-end;
}

.message-bubble {
  max-width: 85%;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.user .message-bubble {
  background: #3b82f6;
  color: white;
  border-bottom-right-radius: 4px;
}

.user .message-content :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.assistant .message-bubble {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

.message-content {
  word-break: break-word;
}

.message-content :deep(p) {
  margin: 0 0 0.5em 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(strong) {
  font-weight: 600;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 0.25em 0;
  padding-left: 1.5em;
}

.message-content :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.85em;
}

.message-content :deep(pre) {
  background: #1f2937;
  color: #e5e7eb;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8em;
  overflow-x: auto;
  margin: 0.5em 0;
}

.message-content :deep(pre code) {
  background: none;
  padding: 0;
}

.results-info {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

/* ── Clarification chips ── */
.clarification-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.4rem;
  max-width: 85%;
}

.clarification-chip {
  padding: 0.28rem 0.7rem;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  text-align: left;
  line-height: 1.3;
}

.clarification-chip:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #93c5fd;
}

.clarification-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Contextual follow-up suggestions ── */
.followup-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  max-width: 85%;
}

.followup-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
  margin-right: 2px;
}

.followup-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0.28rem 0.65rem;
  background: #eef6fb;
  color: #2B5E80;
  border: 1px solid #9ec8e0;
  border-radius: 14px;
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  text-align: left;
  line-height: 1.3;
}

.followup-chip:hover:not(:disabled) {
  background: #d0e8f5;
  border-color: #2B5E80;
}

.followup-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
