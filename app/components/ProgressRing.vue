<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number; max?: number; size?: number; label?: string }>(), { max: 100, size: 44 });
const progress = computed(() => Math.max(0, Math.min(1, props.value / Math.max(1, props.max))));
const radius = 18;
const circumference = 2 * Math.PI * radius;
</script>
<template><span class="progress-ring" :style="{ width: `${size}px`, height: `${size}px` }" :aria-label="label" role="progressbar" :aria-valuenow="value" :aria-valuemax="max"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" :r="radius" /><circle class="value" cx="22" cy="22" :r="radius" :stroke-dasharray="circumference" :stroke-dashoffset="circumference * (1 - progress)" /></svg><slot>{{ Math.round(progress * 100) }}</slot></span></template>
