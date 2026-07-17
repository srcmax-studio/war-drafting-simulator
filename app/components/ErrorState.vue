<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';
defineProps<{ title?: string; message: string }>();
defineEmits<{ retry: [] }>();
</script>
<template><div class="state-block error-state" role="alert"><AlertTriangle :size="27" /><strong>{{ title ?? '出现问题' }}</strong><p>{{ message }}</p><GameButton size="small" @click="$emit('retry')">重试</GameButton></div></template>
