<script setup lang="ts">defineProps<{ title: string; description?: string }>();</script>
<template><div class="state-block empty-state"><div class="state-icon"><slot name="icon" /></div><strong>{{ title }}</strong><p v-if="description">{{ description }}</p><slot /></div></template>
