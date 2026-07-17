<script setup lang="ts">
import { Radio, WifiOff } from 'lucide-vue-next';
defineProps<{ connected: boolean; latency?: number | null; label?: string }>();
</script>

<template><StatusBadge :tone="connected ? 'success' : 'danger'"><Radio v-if="connected" :size="13" /><WifiOff v-else :size="13" />{{ label ?? (connected ? `${latency ?? '--'} ms` : '未连接') }}</StatusBadge></template>
