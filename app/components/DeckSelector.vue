<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next';
import type { DeckChoice } from '~/utils/decks';

defineProps<{ modelValue?: string; decks: DeckChoice[]; disabled?: boolean; label?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <label class="deck-selector"><span>{{ label ?? '出战牌组' }}</span><select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"><option v-for="deck in decks" :key="deck.deckId" :value="deck.deckId">{{ deck.source === 'preset' ? '预设' : '自定义' }} · {{ deck.name }} · {{ deck.cardIds.length }}/12</option></select><CheckCircle2 :size="16" aria-hidden="true" /></label>
</template>
