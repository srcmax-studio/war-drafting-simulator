<script setup lang="ts">
withDefaults(defineProps<{ title?: string; eyebrow?: string; padded?: boolean }>(), { padded: true });
</script>

<template>
  <section class="game-panel">
    <header v-if="title || $slots.header" class="game-panel-header">
      <slot name="header"><div><span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span><h2>{{ title }}</h2></div></slot>
      <slot name="actions" />
    </header>
    <div class="game-panel-body" :class="{ padded }"><slot /></div>
  </section>
</template>
