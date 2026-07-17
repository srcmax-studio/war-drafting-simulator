<script setup lang="ts">
withDefaults(defineProps<{ label: string; disabled?: boolean; active?: boolean; type?: 'button' | 'submit' }>(), { type: 'button' });
</script>

<template>
  <button class="icon-button" :class="{ active }" :type="type" :disabled="disabled" :aria-label="label" :title="label"><slot /></button>
</template>
