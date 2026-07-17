<script setup lang="ts">
defineProps<{ title: string; eyebrow?: string; description?: string }>();
</script>

<template>
  <header class="section-header"><div><span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span><h2>{{ title }}</h2><p v-if="description">{{ description }}</p></div><div class="section-actions"><slot /></div></header>
</template>
