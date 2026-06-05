<script setup lang="ts">
import { computed } from "vue";
import type { CellPopup } from "../../composables/useMap";

const props = defineProps<{
  popup: CellPopup;
  containerWidth: number;
  containerHeight: number;
}>();

const emit = defineEmits<{ close: [] }>();

const POPUP_W = 248;
const POPUP_H_APPROX = 48 + props.popup.lines.length * 22 + 16; // header + rows + padding

// Smart-position: open above click, flip left if near right edge
const style = computed(() => {
  const x = props.popup.x;
  const y = props.popup.y;
  const cw = props.containerWidth;
  const ch = props.containerHeight;

  const flipX = x + POPUP_W + 16 > cw;
  const flipY = y - POPUP_H_APPROX - 16 < 0;

  const left = flipX ? x - POPUP_W - 12 : x + 12;
  const top  = flipY ? y + 12 : y - POPUP_H_APPROX - 8;

  return {
    left: `${Math.max(4, Math.min(left, cw - POPUP_W - 4))}px`,
    top:  `${Math.max(4, Math.min(top,  ch - POPUP_H_APPROX - 4))}px`,
    width: `${POPUP_W}px`,
  };
});

// Shorten long H3 cell IDs for display
const shortId = computed(() => {
  const id = props.popup.h3Id;
  return id.length > 14 ? id.slice(0, 6) + "…" + id.slice(-4) : id;
});
</script>

<template>
  <div class="cell-popup" :style="style">
    <!-- Header -->
    <div class="popup-header">
      <span class="popup-icon">⬡</span>
      <div class="popup-title-block">
        <span class="popup-title">{{ popup.title }}</span>
        <span class="popup-h3id" :title="popup.h3Id">{{ shortId }}</span>
      </div>
      <button class="popup-close" title="Sluiten" @click="emit('close')">✕</button>
    </div>

    <!-- Data rows -->
    <div class="popup-body">
      <div
        v-for="line in popup.lines"
        :key="line.key"
        class="popup-row"
      >
        <span class="popup-key">{{ line.key.replace(/_/g, " ") }}</span>
        <span class="popup-val">{{ line.value }}</span>
      </div>
      <div v-if="popup.lines.length === 0" class="popup-empty">
        Geen data voor deze cel.
      </div>
    </div>
  </div>
</template>

<style scoped>
.cell-popup {
  position: absolute;
  z-index: 20;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.13);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  overflow: hidden;
  pointer-events: all;
  animation: popup-in 0.12s ease;
}

@keyframes popup-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Header ── */
.popup-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 8px 7px 10px;
  background: #2b5e80;
  color: white;
}

.popup-icon {
  font-size: 0.95rem;
  line-height: 1;
  opacity: 0.85;
  flex-shrink: 0;
}

.popup-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.popup-title {
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-h3id {
  font-size: 0.58rem;
  opacity: 0.6;
  font-family: monospace;
  letter-spacing: 0.02em;
}

.popup-close {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  cursor: pointer;
  font-size: 0.65rem;
  color: white;
  padding: 3px 5px;
  border-radius: 4px;
  line-height: 1;
  flex-shrink: 0;
  transition: background 0.1s;
}

.popup-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ── Body ── */
.popup-body {
  padding: 6px 0 4px;
  max-height: 280px;
  overflow-y: auto;
}

.popup-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 10px;
  font-size: 0.71rem;
  line-height: 1.35;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.popup-row:last-child {
  border-bottom: none;
}

.popup-key {
  flex: 0 0 auto;
  max-width: 45%;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: capitalize;
}

.popup-val {
  flex: 1;
  color: #1f2937;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-empty {
  padding: 8px 10px;
  font-size: 0.7rem;
  color: #9ca3af;
  font-style: italic;
}
</style>
