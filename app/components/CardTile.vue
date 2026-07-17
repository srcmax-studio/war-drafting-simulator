<script setup lang="ts">
import type { CardDefinition } from '~/common/src/index';
import { cardFallbackUrl, cardImageUrl } from '~/data/catalog';

const props = withDefaults(defineProps<{ card: CardDefinition; selected?: boolean; compact?: boolean; disabled?: boolean }>(), {
  selected: false,
  compact: false,
  disabled: false
});
const emit = defineEmits<{ select: [card: CardDefinition] }>();
const source = ref(cardImageUrl(props.card));
watch(() => props.card.cardId, () => { source.value = cardImageUrl(props.card); });
const fallback = () => { source.value = cardFallbackUrl(props.card); };
</script>

<template>
  <button
    type="button"
    class="card-tile"
    :class="{ selected, compact }"
    :disabled="disabled"
    :aria-label="`${card.nameZh}，费用 ${card.cost}，战力 ${card.power}`"
    @click="emit('select', card)"
  >
    <img class="card-art" :src="source" :alt="card.nameZh" loading="lazy" width="500" height="700" @error="fallback">
    <span class="card-shade" aria-hidden="true" />
    <span class="card-stat card-cost">{{ card.cost }}</span>
    <span class="card-stat card-power">{{ card.power }}</span>
    <span class="card-copy">
      <h3>{{ card.nameZh }}</h3>
      <p>{{ card.abilityTextZh }}</p>
      <span class="card-meta">{{ card.era }} · {{ card.profession }}</span>
    </span>
  </button>
</template>
