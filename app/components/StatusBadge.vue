<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; label?: string }>(), { tone: 'neutral' });
</script>

<template><span class="status-badge" :class="`tone-${tone}`"><i aria-hidden="true" /><slot>{{ label }}</slot></span></template>
