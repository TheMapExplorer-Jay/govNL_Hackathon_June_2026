<script setup lang="ts">
import { computed } from "vue";
import { useDataDictionary } from "../../composables/useDataDictionary";
import { useLayerPanel } from "../../composables/useLayerPanel";
import { useMap } from "../../composables/useMap";

const { layerStates, toggleLayer } = useLayerPanel();
const { dictionary } = useDataDictionary();
const { activeResultLayer, clearHexagons } = useMap();

interface ActiveLayer {
  id: string;
  color: [number, number, number];
  loading: boolean;
  label: string;
  theme: string;
}

// Build table-id → {label, theme} lookup from dictionary
const labelMap = computed(() => {
  const m = new Map<string, { label: string; theme: string }>();
  if (!dictionary.value) return m;
  for (const theme of dictionary.value.themes) {
    for (const table of theme.tables) {
      const words = table.name
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      m.set(table.name, { label: words, theme: theme.name });
    }
  }
  return m;
});

const referenceLayers = computed<ActiveLayer[]>(() =>
  Object.entries(layerStates.value)
    .filter(([, s]) => s.active || s.loading)
    .map(([id, s]) => {
      const info = labelMap.value.get(id);
      return {
        id,
        color: s.color,
        loading: s.loading,
        label: info?.label ?? id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        theme: info?.theme ?? "",
      };
    })
);

const hasAny = computed(() => activeResultLayer.value !== null || referenceLayers.value.length > 0);
const totalCount = computed(() =>
  (activeResultLayer.value ? 1 : 0) + referenceLayers.value.length
);

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function rgbCss([r, g, b]: [number, number, number]) {
  return `rgb(${r},${g},${b})`;
}

function rgbaBg([r, g, b]: [number, number, number]) {
  return `rgba(${r},${g},${b},0.15)`;
}
</script>

<template>
  <Transition name="summary-slide">
    <div v-if="hasAny" class="layer-summary">
      <div class="summary-header">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        </svg>
        Actieve lagen
        <span class="layer-count">{{ totalCount }}</span>
      </div>

      <!-- Analysis result layer -->
      <div
        v-if="activeResultLayer"
        class="layer-row result-row"
      >
        <span class="layer-dot result-dot" />
        <div class="layer-text">
          <span class="layer-label">{{ activeResultLayer.label }}</span>
          <span class="layer-theme result-meta">
            {{ fmtCount(activeResultLayer.count) }} cellen · analyse
          </span>
        </div>
        <button
          class="layer-remove"
          title="Analyselaag verwijderen"
          @click.stop="clearHexagons()"
        >✕</button>
      </div>

      <!-- Reference layers -->
      <div
        v-for="layer in referenceLayers"
        :key="layer.id"
        class="layer-row"
        :style="{ background: rgbaBg(layer.color) }"
      >
        <span
          class="layer-dot"
          :style="{ background: rgbCss(layer.color) }"
        />
        <div class="layer-text">
          <span class="layer-label">{{ layer.label }}</span>
          <span v-if="layer.theme" class="layer-theme">{{ layer.theme }}</span>
        </div>
        <button
          v-if="!layer.loading"
          class="layer-remove"
          title="Laag verwijderen"
          @click.stop="toggleLayer(layer.id)"
        >✕</button>
        <svg v-else class="layer-spinner" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"/>
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.layer-summary {
  position: absolute;
  bottom: 40px;
  left: 10px;
  z-index: 10;
  width: 210px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.layer-count {
  margin-left: auto;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 99px;
  padding: 0 5px;
  font-size: 0.62rem;
  font-weight: 700;
  min-width: 16px;
  text-align: center;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  transition: background 0.1s;
}

.layer-row:last-child {
  border-bottom: none;
}

/* ── Analysis result row ── */
.result-row {
  background: rgba(46, 155, 116, 0.08);
  border-left: 2px solid #2e9b74;
}

.result-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2e9b74;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}

.result-meta {
  color: #2e9b74 !important;
  font-weight: 600 !important;
}

/* ── Shared ── */
.layer-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}

.layer-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.layer-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-theme {
  font-size: 0.6rem;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.62rem;
  color: #d1d5db;
  padding: 2px 3px;
  border-radius: 3px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.1s, background 0.1s;
}

.layer-remove:hover {
  color: #ef4444;
  background: #fef2f2;
}

.layer-spinner {
  flex-shrink: 0;
  color: #9ca3af;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Transition ── */
.summary-slide-enter-active,
.summary-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.summary-slide-enter-from,
.summary-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
