<script setup lang="ts">
import type { ChartItem } from "../../types/chat";

const props = defineProps<{
	charts: ChartItem[];
}>();

function maxValue(data: { label: string; value: number }[]): number {
	return Math.max(...data.map((d) => d.value), 1);
}

function barWidthPct(value: number, max: number): string {
	return `${Math.round((value / max) * 100)}%`;
}

function fmtNum(n: number | undefined): string {
	if (n === undefined || n === null) return "—";
	if (Number.isInteger(n)) return n.toLocaleString("nl-NL");
	return n.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
}
</script>

<template>
	<div class="charts-grid" :class="{ 'single-col': charts.length === 1 }">
		<div v-for="chart in charts" :key="chart.column" class="chart-card">
			<!-- Bar chart (categorical top_values) -->
			<template v-if="chart.type === 'bar' && chart.data">
				<div class="chart-label">{{ chart.label }}</div>
				<div class="bar-list">
					<div
						v-for="item in chart.data.slice(0, 5)"
						:key="item.label"
						class="bar-row"
					>
						<span class="bar-name">{{ item.label }}</span>
						<div class="bar-track">
							<div
								class="bar-fill"
								:style="{ width: barWidthPct(item.value, maxValue(chart.data!)) }"
							></div>
						</div>
						<span class="bar-count">{{ fmtNum(item.value) }}</span>
					</div>
				</div>
			</template>

			<!-- Stat card (numeric min/max/avg) -->
			<template v-else-if="chart.type === 'stat'">
				<div class="chart-label">{{ chart.label }}</div>
				<div class="stat-row">
					<div class="stat-card">
						<span class="stat-key">min</span>
						<span class="stat-val">{{ fmtNum(chart.min) }}</span>
					</div>
					<div class="stat-card">
						<span class="stat-key">gem</span>
						<span class="stat-val">{{ fmtNum(chart.avg) }}</span>
					</div>
					<div class="stat-card">
						<span class="stat-key">max</span>
						<span class="stat-val">{{ fmtNum(chart.max) }}</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.charts-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 0.5rem;
	margin-top: 0.5rem;
	max-width: 85%;
}

.charts-grid.single-col {
	grid-template-columns: 1fr;
}

@media (max-width: 600px) {
	.charts-grid {
		grid-template-columns: 1fr;
	}
}

.chart-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 0.75rem;
}

.chart-label {
	font-size: 0.7rem;
	font-weight: 700;
	color: #2b5e80;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: 0.5rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ── Bar chart ── */
.bar-list {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}

.bar-row {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 0.72rem;
}

.bar-name {
	flex: 0 0 6rem;
	color: #374151;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.bar-track {
	flex: 1;
	height: 8px;
	background: #e5e7eb;
	border-radius: 4px;
	overflow: hidden;
}

.bar-fill {
	height: 100%;
	background: #2e9b74;
	border-radius: 4px;
	transition: width 0.3s ease;
}

.bar-count {
	flex: 0 0 3.5rem;
	text-align: right;
	color: #6b7280;
	font-variant-numeric: tabular-nums;
}

/* ── Stat cards ── */
.stat-row {
	display: flex;
	gap: 0.4rem;
}

.stat-card {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	background: #f7fbfd;
	border: 1px solid #d0e8f5;
	border-radius: 6px;
	padding: 0.35rem 0.25rem;
	min-width: 0;
}

.stat-key {
	font-size: 0.6rem;
	font-weight: 700;
	color: #2b5e80;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.stat-val {
	font-size: 0.82rem;
	font-weight: 600;
	color: #1f2937;
	font-variant-numeric: tabular-nums;
	margin-top: 0.1rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}
</style>
