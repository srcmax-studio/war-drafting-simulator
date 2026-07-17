<script setup lang="ts">
import { Volume1, Volume2, VolumeX } from 'lucide-vue-next';
const props = defineProps<{ modelValue: number; label: string; disabled?: boolean }>();
defineEmits<{ 'update:modelValue': [value: number] }>();
const icon = computed(() => props.modelValue <= 0 ? VolumeX : props.modelValue < 0.55 ? Volume1 : Volume2);
</script>
<template><label class="volume-control"><component :is="icon" :size="18" /><span>{{ label }}</span><input type="range" min="0" max="1" step="0.05" :value="modelValue" :disabled="disabled" @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"><output>{{ Math.round(modelValue * 100) }}</output></label></template>
