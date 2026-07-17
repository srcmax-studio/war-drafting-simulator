<script setup lang="ts">
import { X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ open: boolean; title?: string; closeLabel?: string; width?: 'small' | 'medium' | 'large'; role?: 'dialog' | 'alertdialog' }>(), { closeLabel: '关闭', width: 'medium', role: 'dialog' });
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement | null>(null);
const { onKeydown } = useDialogFocus(() => props.open, dialog, () => emit('close'));
</script>

<template>
  <Teleport to="body"><Transition name="modal"><div v-if="open" class="modal-backdrop" role="presentation" @mousedown.self="$emit('close')"><section ref="dialog" class="modal-dialog" :class="`is-${width}`" :role="role" aria-modal="true" :aria-label="title" tabindex="-1" @keydown="onKeydown"><header v-if="title || $slots.header"><slot name="header"><h2>{{ title }}</h2></slot><IconButton :label="closeLabel" @click="$emit('close')"><X :size="19" /></IconButton></header><div class="modal-content"><slot /></div><footer v-if="$slots.footer"><slot name="footer" /></footer></section></div></Transition></Teleport>
</template>
