<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { useMapContext } from "../../composables/useMapContext";
import { useMap } from "../../composables/useMap";

const {
	map,
	pickingLocation,
	startLocationPicking,
	stopLocationPicking,
	setLocationPin,
	clearLocationPin,
} = useMap();

const { activeContext, setContext, clearContext, formatLabel } = useMapContext();

// Wire up the map click handler whenever picking mode is active
let clickHandler: ((e: any) => void) | null = null;

watch(pickingLocation, (picking) => {
	const m = map.value;
	if (!m) return;

	if (picking) {
		clickHandler = (e: any) => {
			const { lat, lng } = e.lngLat;
			const radius = activeContext.value?.radiusKm ?? 5;
			setContext(lat, lng, radius);
			setLocationPin(lat, lng, radius);
			stopLocationPicking();
		};
		m.once("click", clickHandler);
	} else {
		if (clickHandler) {
			m.off("click", clickHandler);
			clickHandler = null;
		}
	}
});

// Keep circle in sync with radius changes
watch(
	() => activeContext.value?.radiusKm,
	(radius) => {
		const ctx = activeContext.value;
		if (ctx && radius !== undefined) {
			setLocationPin(ctx.lat, ctx.lng, radius);
		}
	},
);

function handleClear() {
	clearContext();
	clearLocationPin();
	stopLocationPicking();
}

onUnmounted(() => {
	if (map.value && clickHandler) {
		map.value.off("click", clickHandler);
	}
});
</script>

<template>
  <div class="context-picker">
    <!-- No pin placed yet -->
    <template v-if="!activeContext">
      <button
        class="pick-btn"
        :class="{ active: pickingLocation }"
        :title="pickingLocation ? 'Klik op de kaart om een locatie te kiezen' : 'Kies een locatie op de kaart als context voor je vraag'"
        @click="pickingLocation ? stopLocationPicking() : startLocationPicking()"
      >
        <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
          <path d="M6.5 0C3 0 0 3 0 6.5c0 5 6.5 9.5 6.5 9.5S13 11.5 13 6.5C13 3 10 0 6.5 0z" fill="currentColor"/>
          <circle cx="6.5" cy="6.5" r="2.5" fill="white"/>
        </svg>
        {{ pickingLocation ? 'Klik op kaart…' : 'Locatie kiezen' }}
      </button>
    </template>

    <!-- Pin placed — show radius slider + clear -->
    <template v-else>
      <div class="pin-controls">
        <div class="pin-label">
          <svg width="10" height="13" viewBox="0 0 13 16" fill="none">
            <path d="M6.5 0C3 0 0 3 0 6.5c0 5 6.5 9.5 6.5 9.5S13 11.5 13 6.5C13 3 10 0 6.5 0z" fill="#3b82f6"/>
            <circle cx="6.5" cy="6.5" r="2.5" fill="white"/>
          </svg>
          <span class="coords">{{ formatLabel() }}</span>
        </div>
        <div class="radius-row">
          <span class="radius-label">Straal</span>
          <input
            type="range"
            min="1"
            max="25"
            step="1"
            :value="activeContext.radiusKm"
            @input="(e) => setContext(activeContext!.lat, activeContext!.lng, Number((e.target as HTMLInputElement).value))"
          />
          <span class="radius-value">{{ activeContext.radiusKm }} km</span>
        </div>
        <button class="clear-btn" title="Verwijder locatiecontext" @click="handleClear">
          ✕ Verwijder
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.context-picker {
  position: absolute;
  top: 155px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.pick-btn {
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
  transition: background 0.1s, border-color 0.1s;
  white-space: nowrap;
}

.pick-btn:hover,
.pick-btn.active {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #3b82f6;
}

.pin-controls {
  background: white;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  padding: 8px 10px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pin-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.coords {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e40af;
  font-family: ui-monospace, monospace;
}

.radius-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.radius-label {
  font-size: 0.72rem;
  color: #6b7280;
  white-space: nowrap;
}

.radius-row input[type="range"] {
  flex: 1;
  accent-color: #3b82f6;
  height: 4px;
}

.radius-value {
  font-size: 0.72rem;
  font-weight: 600;
  color: #1d4ed8;
  min-width: 32px;
  text-align: right;
}

.clear-btn {
  font-size: 0.72rem;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  text-align: right;
  padding: 0;
}

.clear-btn:hover {
  color: #ef4444;
}
</style>
