import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { IconLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { cellToLatLng, getResolution } from "h3-js";
import maplibregl from "maplibre-gl";
import { ref, shallowRef, watch } from "vue";
import {
	computePercentile,
	getCategoryColor,
	getColor,
	getLegendClasses,
} from "../services/colorScale";
import type {
	CategoryLegendConfig,
	HeightLegendConfig,
	HexagonData,
	IconLegendConfig,
	LegendConfig,
	MapPlan,
} from "../types";
import { formatNumber } from "../utils/formatting";
import { getH3Bounds } from "../utils/h3utils";

const MAX_ELEVATION_METERS = 2000;

// Reference layers toggled on by the LayerControl panel (rendered below query results)
const referenceLayerMap = new Map<string, H3HexagonLayer<{ h3_id: string }>>();
// Current query-result layers (rebuilt on each updateHexagons call)
let currentQueryLayers: H3HexagonLayer<any>[] = [];

// Blue and purple are excluded because they clash with the numeric colour scale
const ICON_COLORS: [number, number, number, number][] = [
	[34, 197, 94, 230], // green
	[249, 115, 22, 230], // orange
	[239, 68, 68, 230], // red
	[234, 179, 8, 230], // amber
	[20, 184, 166, 230], // teal
	[236, 72, 153, 230], // pink
];

const PIN_ATLAS =
	"data:image/svg+xml;charset=utf-8," +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" fill="white"/></svg>',
	);

const PIN_MAPPING: Record<
	string,
	{ x: number; y: number; width: number; height: number; mask: boolean }
> = {
	pin: { x: 0, y: 0, width: 16, height: 16, mask: true },
};

const map = shallowRef<maplibregl.Map | null>(null);
const deckOverlay = shallowRef<MapboxOverlay | null>(null);
const pickingLocation = ref(false);
let pinMarker: maplibregl.Marker | null = null;

const PIN_SOURCE = "location-pin-buffer";
const PIN_FILL_LAYER = "location-pin-fill";
const PIN_LINE_LAYER = "location-pin-line";
const legend = ref<LegendConfig | null>(null);
const heightLegend = ref<HeightLegendConfig | null>(null);
const iconLegend = ref<IconLegendConfig | null>(null);
const categoryLegend = ref<CategoryLegendConfig | null>(null);
const scaleMode = ref<"linear" | "percentile">("percentile");
const hexOpacity = ref(0.85);
const tooltip = ref<{
	x: number;
	y: number;
	lines: { key: string; value: string }[];
} | null>(null);

let lastHexData: Record<string, unknown>[] | null = null;
let lastMapPlan: MapPlan | null = null;

watch([scaleMode, hexOpacity], () => {
	if (lastHexData && lastMapPlan) {
		updateHexagons(lastHexData, lastMapPlan);
	}
});

// ---------------------------------------------------------------------------
// Location pin helpers
// ---------------------------------------------------------------------------

function _circleGeoJSON(lat: number, lng: number, radiusKm: number) {
	const n = 64;
	const coords: [number, number][] = [];
	for (let i = 0; i <= n; i++) {
		const angle = (i / n) * 2 * Math.PI;
		const dLat = (radiusKm / 111.32) * Math.sin(angle);
		const dLng =
			(radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) *
			Math.cos(angle);
		coords.push([lng + dLng, lat + dLat]);
	}
	return {
		type: "FeatureCollection" as const,
		features: [
			{
				type: "Feature" as const,
				geometry: { type: "Polygon" as const, coordinates: [coords] },
				properties: {},
			},
		],
	};
}

function setLocationPin(lat: number, lng: number, radiusKm: number) {
	const m = map.value;
	if (!m) return;

	const geojson = _circleGeoJSON(lat, lng, radiusKm);

	if (m.getSource(PIN_SOURCE)) {
		(m.getSource(PIN_SOURCE) as maplibregl.GeoJSONSource).setData(geojson);
	} else {
		m.addSource(PIN_SOURCE, { type: "geojson", data: geojson });
		m.addLayer({
			id: PIN_FILL_LAYER,
			type: "fill",
			source: PIN_SOURCE,
			paint: { "fill-color": "#3b82f6", "fill-opacity": 0.1 },
		});
		m.addLayer({
			id: PIN_LINE_LAYER,
			type: "line",
			source: PIN_SOURCE,
			paint: {
				"line-color": "#3b82f6",
				"line-width": 2,
				"line-dasharray": [4, 2],
			},
		});
	}

	if (pinMarker) {
		pinMarker.setLngLat([lng, lat]);
	} else {
		const el = document.createElement("div");
		el.className = "map-pin-marker";
		el.innerHTML =
			'<svg width="22" height="28" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">' +
			'<path d="M11 0C5 0 0 5 0 11c0 8.25 11 17 11 17s11-8.75 11-17C22 5 17 0 11 0z" fill="#3b82f6"/>' +
			'<circle cx="11" cy="11" r="4" fill="white"/>' +
			"</svg>";
		el.style.cursor = "pointer";
		pinMarker = new maplibregl.Marker({ element: el, anchor: "bottom" })
			.setLngLat([lng, lat])
			.addTo(m);
	}
}

function clearLocationPin() {
	const m = map.value;
	if (!m) return;
	if (m.getLayer(PIN_FILL_LAYER)) m.removeLayer(PIN_FILL_LAYER);
	if (m.getLayer(PIN_LINE_LAYER)) m.removeLayer(PIN_LINE_LAYER);
	if (m.getSource(PIN_SOURCE)) m.removeSource(PIN_SOURCE);
	if (pinMarker) {
		pinMarker.remove();
		pinMarker = null;
	}
}

function startLocationPicking() {
	pickingLocation.value = true;
	if (map.value) map.value.getCanvas().style.cursor = "crosshair";
}

function stopLocationPicking() {
	pickingLocation.value = false;
	if (map.value) map.value.getCanvas().style.cursor = "";
}

// ---------------------------------------------------------------------------

function _syncDeckLayers() {
	if (!deckOverlay.value) return;
	deckOverlay.value.setProps({
		layers: [...referenceLayerMap.values(), ...currentQueryLayers],
	});
}

function setReferenceLayer(
	id: string,
	h3Ids: string[],
	color: [number, number, number],
) {
	const layer = new H3HexagonLayer<{ h3_id: string }>({
		id: `ref-${id}`,
		data: h3Ids.map((h) => ({ h3_id: h })),
		getHexagon: (d) => d.h3_id,
		getFillColor: [...color, 150] as [number, number, number, number],
		extruded: false,
		filled: true,
		stroked: false,
		opacity: 1,
		pickable: false,
	});
	referenceLayerMap.set(id, layer);
	_syncDeckLayers();
}

function removeReferenceLayer(id: string) {
	referenceLayerMap.delete(id);
	_syncDeckLayers();
}

function initMap(container: string | HTMLElement) {
	const mapInstance = new maplibregl.Map({
		container,
		style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
		center: [4.5, 52.0],
		zoom: 9,
		attributionControl: { compact: true },
	});

	const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
	mapInstance.addControl(overlay);
	mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");

	mapInstance.on("error", (e) => {
		console.warn("Map style load error:", e.error?.message);
	});

	map.value = mapInstance;
	deckOverlay.value = overlay;

	if (lastHexData && lastMapPlan) {
		updateHexagons(lastHexData, lastMapPlan);
	}

	return mapInstance;
}

// Approximate H3 edge lengths in km per resolution
const H3_EDGE_KM: Record<number, number> = {
	5: 8.544,
	6: 3.23,
	7: 1.22,
	8: 0.461,
	9: 0.174,
	10: 0.066,
};

/**
 * Compute a longitude offset (in degrees) so that N icons are spread
 * horizontally across ~50% of the H3 cell's flat-to-flat width.
 * This keeps icons inside the cell at every zoom level.
 */
function computeIconLngOffset(
	lat: number,
	res: number,
	idx: number,
	total: number,
): number {
	if (total <= 1) return 0;
	const edgeKm = H3_EDGE_KM[res] ?? 0.461;
	const spreadKm = edgeKm * Math.sqrt(3) * 0.5;
	const step = spreadKm / (total - 1);
	const offsetKm = (idx - (total - 1) / 2) * step;
	const kmPerDegLon = Math.cos((lat * Math.PI) / 180) * 111.32;
	return offsetKm / kmPerDegLon;
}

function numericRange(
	data: Record<string, unknown>[],
	col: string,
): { min: number; max: number; values: number[] } {
	const values = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
	const min = values.length ? Math.min(...values) : 0;
	const max = values.length ? Math.max(...values) : 0;
	return { min, max, values };
}

function updateHexagons(data: Record<string, unknown>[], plan: MapPlan) {
	if (!deckOverlay.value || !map.value) return;

	const isNewData = data !== lastHexData;

	lastHexData = data;
	lastMapPlan = plan;

	const h3Col = plan.h3_column;
	const color = plan.color;
	const height = plan.height;
	const valCol = color?.column ?? null;
	const isCategorical = color?.kind === "categorical";

	const filtered = data.filter((r) => r[h3Col]);
	if (filtered.length === 0) return;

	const hexData: HexagonData[] = data
		.filter((r) => r[h3Col] && (valCol === null || r[valCol] != null))
		.map((r) => {
			const properties: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(r)) {
				if (key !== h3Col) properties[key] = val;
			}
			return {
				h3_id: String(r[h3Col]),
				value: isCategorical ? 0 : Number(valCol ? r[valCol] : 0),
				properties,
			};
		});
	const categoryColorMap = new Map<string, [number, number, number, number]>();
	if (color && isCategorical) {
		const freq = new Map<string, number>();
		for (const row of filtered) {
			const cat = String(row[color.column] ?? "");
			freq.set(cat, (freq.get(cat) ?? 0) + 1);
			if (!categoryColorMap.has(cat)) {
				categoryColorMap.set(
					cat,
					cat === "" ? [0, 0, 0, 0] : getCategoryColor(cat),
				);
			}
		}
		const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
		categoryLegend.value = {
			label: color.label,
			items: sorted.slice(0, 5).map(([cat]) => ({
				label: cat === "" ? "(leeg)" : cat,
				color: categoryColorMap.get(cat)!,
			})),
			truncated: sorted.length > 5,
		};
	} else {
		categoryLegend.value = null;
	}

	let colorMin = 0;
	let colorMax = 0;
	let effectiveMin = 0;
	let effectiveMax = 0;
	let hasZeroValues = false;
	if (color && color.kind === "numeric") {
		const { min, max, values } = numericRange(filtered, color.column);
		colorMin = min;
		colorMax = max;
		hasZeroValues = filtered.some((r) => Number(r[color.column]) === 0);
		const sorted = [...values].sort((a, b) => a - b);
		const p2 = computePercentile(sorted, 2);
		const p98 = computePercentile(sorted, 98);
		effectiveMin = scaleMode.value === "percentile" ? p2 : min;
		effectiveMax = scaleMode.value === "percentile" ? p98 : max;
	}

	let heightMin = 0;
	let heightMax = 0;
	let effectiveHeightMin = 0;
	let effectiveHeightMax = 0;
	if (height) {
		const { min, max, values } = numericRange(filtered, height.column);
		heightMin = min;
		heightMax = max;
		const sorted = [...values].sort((a, b) => a - b);
		const p2 = computePercentile(sorted, 2);
		const p98 = computePercentile(sorted, 98);
		effectiveHeightMin = scaleMode.value === "percentile" ? p2 : min;
		effectiveHeightMax = scaleMode.value === "percentile" ? p98 : max;
	}
	const elevationSpan = effectiveHeightMax - effectiveHeightMin;

	function rowElevationMeters(row: Record<string, unknown>): number {
		if (!height || elevationSpan === 0) return 0;
		const v = Number(row[height.column]);
		if (isNaN(v)) return 0;
		const clamped = Math.min(
			Math.max(v, effectiveHeightMin),
			effectiveHeightMax,
		);
		return (
			((clamped - effectiveHeightMin) / elevationSpan) * MAX_ELEVATION_METERS
		);
	}

	const getFillColor = color
		? isCategorical
			? (d: HexagonData) => {
					const cat = String(d.properties[color.column] ?? "");
					return (
						categoryColorMap.get(cat) ??
						([180, 180, 180, 180] as [number, number, number, number])
					);
				}
			: (d: HexagonData) =>
					getColor(d.value, effectiveMin, effectiveMax, colorMin, colorMax)
		: () => [180, 180, 180, 180] as [number, number, number, number];

	const getElevation = height
		? (d: HexagonData) => {
				const v = Number(d.properties[height.column]);
				if (isNaN(v) || elevationSpan === 0) return 0;
				const clamped = Math.min(
					Math.max(v, effectiveHeightMin),
					effectiveHeightMax,
				);
				return (
					((clamped - effectiveHeightMin) / elevationSpan) *
					MAX_ELEVATION_METERS
				);
			}
		: 0;

	const layer = new H3HexagonLayer({
		id: "h3-hexagons",
		data: hexData,
		getHexagon: (d: HexagonData) => d.h3_id,
		getFillColor,
		getElevation,
		extruded: Boolean(height),
		pickable: true,
		onHover: (info: any) => {
			if (info.object) {
				const lines = [
					["h3_id", info.object.h3_id] as [string, unknown],
					...Object.entries(info.object.properties),
				]
					.filter(
						([_, val]) =>
							val != null && !(typeof val === "number" && isNaN(val)),
					)
					.map(([key, val]) => ({
						key,
						value: typeof val === "number" ? formatNumber(val) : String(val),
					}));
				tooltip.value = lines.length ? { x: info.x, y: info.y, lines } : null;
			} else {
				tooltip.value = null;
			}
		},
		opacity: hexOpacity.value,
		filled: true,
		stroked: true,
		getLineColor: [255, 255, 255, 80],
		lineWidthMinPixels: 0.5,
	});

	// Build icon presence layers
	const iconColumns = plan.icons ?? [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const extraLayers: any[] = [];

	if (iconColumns.length > 0) {
		interface IconPoint {
			position: [number, number, number];
			color: [number, number, number, number];
		}
		const iconData: IconPoint[] = [];
		for (const row of filtered) {
			const h3Id = String(row[h3Col]);
			const [lat, lng] = cellToLatLng(h3Id);
			const res = getResolution(h3Id);
			const elevMeters = rowElevationMeters(row);

			const activeIndices: number[] = [];
			for (let i = 0; i < iconColumns.length; i++) {
				const raw = row[iconColumns[i]!.column];
				const isPresent =
					typeof raw === "string"
						? raw.trim() !== ""
						: !isNaN(Number(raw)) && Number(raw) > 0;
				if (isPresent) activeIndices.push(i);
			}

			for (let j = 0; j < activeIndices.length; j++) {
				const i = activeIndices[j]!;
				const lngOffset = computeIconLngOffset(
					lat,
					res,
					j,
					activeIndices.length,
				);
				iconData.push({
					position: [lng + lngOffset, lat, elevMeters + 80],
					color: ICON_COLORS[i % ICON_COLORS.length]!,
				});
			}
		}
		extraLayers.push(
			new IconLayer<IconPoint>({
				id: "icon-presence",
				data: iconData,
				getPosition: (d) => d.position,
				getColor: (d) => d.color,
				getIcon: () => "pin",
				iconAtlas: PIN_ATLAS,
				iconMapping: PIN_MAPPING,
				sizeUnits: "meters",
				getSize: 200,
				sizeMinPixels: 4,
				sizeMaxPixels: 14,
				pickable: false,
			}) as unknown as typeof layer,
		);
	}

	currentQueryLayers = [layer, ...extraLayers];
	_syncDeckLayers();

	legend.value =
		color && color.kind === "numeric"
			? {
					label: color.label,
					min: colorMin,
					max: colorMax,
					scaleMin: effectiveMin,
					scaleMax: effectiveMax,
					classes: getLegendClasses(effectiveMin, effectiveMax, hasZeroValues),
					scaleMode: scaleMode.value,
				}
			: null;

	heightLegend.value = height
		? {
				label: height.label,
				min: heightMin,
				max: heightMax,
				scaleMin: effectiveHeightMin,
				scaleMax: effectiveHeightMax,
			}
		: null;

	iconLegend.value =
		iconColumns.length > 0
			? {
					items: iconColumns.map((ic, i) => ({
						label: ic.label,
						color: ICON_COLORS[i % ICON_COLORS.length]!,
					})),
				}
			: null;

	if (isNewData) {
		const h3Ids = hexData.map((d) => d.h3_id);
		const { center, zoom } = getH3Bounds(h3Ids);
		map.value.flyTo({ center, zoom, duration: 1500 });

		// Set initial tilt when extruded; user can freely adjust pitch afterwards
		if (height) {
			map.value.easeTo({ pitch: 45, duration: 1500 });
		} else {
			map.value.easeTo({ pitch: 0, duration: 1000 });
		}
	}
}

function clearHexagons() {
	currentQueryLayers = [];
	_syncDeckLayers(); // reference layers stay on
	legend.value = null;
	heightLegend.value = null;
	iconLegend.value = null;
	categoryLegend.value = null;
	lastHexData = null;
	lastMapPlan = null;
	if (map.value) {
		map.value.flyTo({ center: [4.5, 52.0], zoom: 9, duration: 1000 });
		map.value.easeTo({ pitch: 0, duration: 1000 });
	}
}

export function useMap() {
	return {
		map,
		legend,
		heightLegend,
		iconLegend,
		categoryLegend,
		tooltip,
		scaleMode,
		hexOpacity,
		pickingLocation,
		initMap,
		updateHexagons,
		clearHexagons,
		setReferenceLayer,
		removeReferenceLayer,
		setLocationPin,
		clearLocationPin,
		startLocationPicking,
		stopLocationPicking,
	};
}
