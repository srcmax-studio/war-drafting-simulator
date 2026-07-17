<script setup lang="ts">
defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean }>();
defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template><Modal :open="open" :title="title" width="small" role="alertdialog" @close="$emit('cancel')"><p class="dialog-message">{{ message }}</p><template #footer><GameButton variant="ghost" @click="$emit('cancel')">取消</GameButton><GameButton :variant="danger ? 'danger' : 'primary'" @click="$emit('confirm')">{{ confirmLabel ?? '确认' }}</GameButton></template></Modal></template>
