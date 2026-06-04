import { ref } from "vue";

export interface MapContext {
	lat: number;
	lng: number;
	radiusKm: number;
}

// Module-level singleton so ChatInput and MapContextPicker share the same state
const activeContext = ref<MapContext | null>(null);

export function useMapContext() {
	function setContext(lat: number, lng: number, radiusKm: number) {
		activeContext.value = { lat, lng, radiusKm };
	}

	function clearContext() {
		activeContext.value = null;
	}

	/**
	 * Returns a Dutch-language prefix the chat router prepends to the user's
	 * message. The LangGraph intent analyzer will parse the LATLON: token and
	 * set up a spatial_query with the correct k_rings.
	 */
	function buildContextPrefix(): string {
		if (!activeContext.value) return "";
		const { lat, lng, radiusKm } = activeContext.value;
		const kRings = Math.ceil(radiusKm / 0.35);
		return (
			`Ruimtelijke context (geselecteerd op de kaart): gebruik het gebied rond ` +
			`LATLON:${lat.toFixed(6)},${lng.toFixed(6)} met een straal van ${radiusKm} km ` +
			`(${kRings} H3-ringen bij resolutie 9) als locatiefilter voor je antwoord.\n\n`
		);
	}

	function formatLabel(): string {
		if (!activeContext.value) return "";
		const { lat, lng, radiusKm } = activeContext.value;
		return `${lat.toFixed(4)}, ${lng.toFixed(4)} · ${radiusKm} km`;
	}

	return { activeContext, setContext, clearContext, buildContextPrefix, formatLabel };
}
