import { ref } from "vue";
import { api } from "../services/api";
import { useMap } from "./useMap";

const LAYER_PALETTE: [number, number, number][] = [
	[239, 68, 68],   // red
	[249, 115, 22],  // orange
	[234, 179, 8],   // amber
	[34, 197, 94],   // green
	[20, 184, 166],  // teal
	[168, 85, 247],  // purple
	[236, 72, 153],  // pink
	[100, 116, 139], // slate
];

export interface LayerState {
	active: boolean;
	loading: boolean;
	error: string | null;
	color: [number, number, number];
}

const layerStates = ref<Record<string, LayerState>>({});
let colorIndex = 0;

function ensureState(tableId: string): LayerState {
	if (!layerStates.value[tableId]) {
		layerStates.value[tableId] = {
			active: false,
			loading: false,
			error: null,
			color: LAYER_PALETTE[colorIndex++ % LAYER_PALETTE.length]!,
		};
	}
	return layerStates.value[tableId]!;
}

/** Pull table names out of a DuckDB SELECT query. */
export function extractTablesFromSql(sql: string): string[] {
	const pattern = /(?:FROM|JOIN)\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
	const reserved = new Set(["select", "where", "group", "order", "having", "limit", "with", "on"]);
	const names = [...sql.matchAll(pattern)]
		.map((m) => m[1]!)
		.filter((t) => !reserved.has(t.toLowerCase()));
	return [...new Set(names)];
}

export function useLayerPanel() {
	const { setReferenceLayer, removeReferenceLayer } = useMap();

	async function toggleLayer(tableId: string) {
		const state = ensureState(tableId);

		if (state.active) {
			layerStates.value[tableId] = { ...state, active: false };
			removeReferenceLayer(tableId);
			return;
		}

		layerStates.value[tableId] = { ...state, loading: true, error: null };

		try {
			const result = await api.runQuery(
				`SELECT DISTINCT h3_id FROM "${tableId}" LIMIT 100000`,
			);
			const h3Ids = result.rows
				.map((r) => String(r.h3_id))
				.filter((id) => id && id !== "undefined" && id !== "null");

			setReferenceLayer(tableId, h3Ids, state.color);

			layerStates.value[tableId] = {
				...state,
				active: true,
				loading: false,
				error: null,
			};
		} catch (err) {
			layerStates.value[tableId] = {
				...state,
				loading: false,
				error: err instanceof Error ? err.message : "Laden mislukt",
			};
		}
	}

	function getState(tableId: string): LayerState {
		return (
			layerStates.value[tableId] ?? {
				active: false,
				loading: false,
				error: null,
				color: LAYER_PALETTE[0]!,
			}
		);
	}

	/** Activate a set of layers by table id — skips already-active/loading ones. */
	async function activateLayers(tableIds: string[]) {
		for (const id of tableIds) {
			const state = ensureState(id);
			if (!state.active && !state.loading) {
				toggleLayer(id); // fire-and-forget; each layer loads independently
			}
		}
	}

	/** Deactivate every currently-active reference layer. */
	function clearAllLayers() {
		for (const [tableId, state] of Object.entries(layerStates.value)) {
			if (state.active || state.loading) {
				layerStates.value[tableId] = { ...state, active: false, loading: false };
				removeReferenceLayer(tableId);
			}
		}
	}

	return { layerStates, toggleLayer, getState, activateLayers, clearAllLayers };
}
