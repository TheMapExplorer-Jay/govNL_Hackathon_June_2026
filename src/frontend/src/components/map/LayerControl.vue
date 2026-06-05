<script setup lang="ts">
import { computed, ref } from "vue";
import { useDataDictionary } from "../../composables/useDataDictionary";
import { useLayerPanel } from "../../composables/useLayerPanel";

const { dictionary } = useDataDictionary();
const { layerStates, toggleLayer, getState, clearAllLayers } = useLayerPanel();

const panelOpen = ref(false);
const expandedThemes = ref<Set<string>>(new Set());

function toggleTheme(name: string) {
	if (expandedThemes.value.has(name)) expandedThemes.value.delete(name);
	else expandedThemes.value.add(name);
}

const activeCount = computed(() =>
	Object.values(layerStates.value).filter((s) => s.active).length,
);

function cssColor(color: [number, number, number]): string {
	return `rgb(${color[0]},${color[1]},${color[2]})`;
}
</script>

<template>
  <div class="layer-control">
    <button class="toggle-btn" :class="{ active: panelOpen }" @click="panelOpen = !panelOpen">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="2" width="12" height="2" rx="1" fill="currentColor"/>
        <rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor"/>
        <rect x="1" y="10" width="12" height="2" rx="1" fill="currentColor"/>
      </svg>
      Lagen
      <span v-if="activeCount > 0" class="badge">{{ activeCount }}</span>
    </button>

    <div v-if="panelOpen && dictionary" class="panel">
      <div class="panel-header">
        Referentielagen
        <button
          v-if="activeCount > 0"
          class="clear-all-btn"
          title="Schakel alle lagen uit"
          @click="clearAllLayers()"
        >
          Alles uit
        </button>
      </div>

      <div class="themes-list">
        <div
          v-for="theme in dictionary.themes"
          :key="theme.name"
          class="theme-block"
        >
          <button
            class="theme-header"
            @click="toggleTheme(theme.name)"
          >
            <span class="chevron">{{ expandedThemes.has(theme.name) ? '▾' : '▸' }}</span>
            {{ theme.label }}
          </button>

          <div v-if="expandedThemes.has(theme.name)" class="table-list">
            <label
              v-for="table in theme.tables"
              :key="table.name"
              class="table-row"
            >
              <input
                type="checkbox"
                :checked="getState(table.name).active"
                :disabled="getState(table.name).loading"
                @change="toggleLayer(table.name)"
              />
              <span
                v-if="getState(table.name).active"
                class="color-dot"
                :style="{ background: cssColor(getState(table.name).color) }"
              />
              <span v-else class="color-dot placeholder" />
              <span class="table-label" :title="table.name">{{ table.name }}</span>
              <span v-if="getState(table.name).loading" class="spinner" />
              <span v-if="getState(table.name).error" class="error-dot" title="Laden mislukt">!</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-control {
  position: absolute;
  bottom: 32px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
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

.toggle-btn:hover,
.toggle-btn.active {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.badge {
  background: #3b82f6;
  color: white;
  border-radius: 99px;
  padding: 0 5px;
  font-size: 0.68rem;
  font-weight: 700;
  min-width: 16px;
  text-align: center;
}

.panel {
  background: white;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 220px;
  max-width: 260px;
  right: 0;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 7px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-all-btn {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.clear-all-btn:hover {
  text-decoration: underline;
}

.themes-list {
  overflow-y: auto;
  flex: 1;
}

.theme-block {
  border-bottom: 1px solid #f3f4f6;
}

.theme-block:last-child {
  border-bottom: none;
}

.theme-header {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
  text-align: left;
}

.theme-header:hover {
  background: #f9fafb;
}

.chevron {
  font-size: 0.72rem;
  color: #9ca3af;
  width: 10px;
}

.table-list {
  padding: 2px 0 6px;
}

.table-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 24px;
  cursor: pointer;
  font-size: 0.74rem;
  color: #374151;
}

.table-row:hover {
  background: #f9fafb;
}

.table-row input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: #3b82f6;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.color-dot.placeholder {
  background: #e5e7eb;
}

.table-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid #d1d5db;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-dot {
  color: #ef4444;
  font-weight: 700;
  font-size: 0.7rem;
  flex-shrink: 0;
}
</style>
