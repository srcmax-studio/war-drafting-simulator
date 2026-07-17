<script setup lang="ts">
const props = withDefaults(defineProps<{ name: string; size?: 'small' | 'medium' | 'large'; status?: string }>(), { size: 'medium' });
const initials = computed(() => [...props.name.trim()].slice(0, 2).join('').toUpperCase() || 'AF');
</script>

<template><span class="player-avatar" :class="`is-${size}`" :aria-label="name"><span>{{ initials }}</span><i v-if="status" :class="`status-${status}`" /></span></template>
