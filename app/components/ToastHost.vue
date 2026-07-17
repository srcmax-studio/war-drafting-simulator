<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-vue-next';
const { toasts, remove } = useToast();
const iconFor = (tone: string) => tone === 'success' ? CheckCircle2 : tone === 'danger' || tone === 'warning' ? AlertTriangle : Info;
</script>
<template><Teleport to="body"><div class="toast-region" role="status" aria-live="polite"><TransitionGroup name="toast"><article v-for="toast in toasts" :key="toast.id" class="toast-item" :class="`tone-${toast.tone}`"><component :is="iconFor(toast.tone)" :size="19" /><div><strong>{{ toast.title }}</strong><p v-if="toast.message">{{ toast.message }}</p></div><IconButton label="关闭通知" @click="remove(toast.id)"><X :size="16" /></IconButton></article></TransitionGroup></div></Teleport></template>
