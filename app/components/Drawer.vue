<script setup lang="ts">
import { X } from 'lucide-vue-next';
const props = withDefaults(defineProps<{ open: boolean; title: string; side?: 'right' | 'bottom' }>(), { side: 'right' });
const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLElement | null>(null);
const { onKeydown } = useDialogFocus(() => props.open, panel, () => emit('close'));
</script>

<template><Teleport to="body"><Transition name="drawer"><div v-if="open" class="drawer-backdrop" @mousedown.self="$emit('close')"><aside ref="panel" class="drawer-panel" :class="`from-${side}`" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1" @keydown="onKeydown"><header><h2>{{ title }}</h2><IconButton label="关闭" @click="$emit('close')"><X :size="19" /></IconButton></header><div class="drawer-content"><slot /></div></aside></div></Transition></Teleport></template>
