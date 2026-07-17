<script setup lang="ts">withDefaults(defineProps<{ lines?: number; height?: string }>(), { lines: 3, height: '14px' });</script>
<template><div class="loading-skeleton" aria-label="加载中" aria-busy="true"><i v-for="line in lines" :key="line" :style="{ height, width: `${100 - (line - 1) * 12}%` }" /></div></template>
