<script setup lang="ts">
import { X } from 'lucide-vue-next';
import type { CardDefinition } from '~/common/src/index';
import { cardFallbackUrl, cardImageUrl } from '~/data/catalog';

const props = defineProps<{ card: CardDefinition | null }>();
const emit = defineEmits<{ close: [] }>();
const source = ref('');
watch(() => props.card, (card) => { source.value = card ? cardImageUrl(card) : ''; }, { immediate: true });
</script>

<template>
  <div v-if="card" class="modal-backdrop" role="presentation" @click.self="emit('close')">
    <section class="dialog" role="dialog" aria-modal="true" :aria-label="card.nameZh">
      <header class="dialog-header">
        <strong>{{ card.nameZh }}</strong>
        <button class="icon-button" type="button" :aria-label="$t('common.close')" @click="emit('close')"><X :size="19" /></button>
      </header>
      <div class="dialog-content card-detail">
        <img class="card-detail-art" :src="source" :alt="card.nameZh" width="500" height="700" @error="source = cardFallbackUrl(card)">
        <div>
          <div class="button-row"><span class="tag">{{ $t('cards.cost') }} {{ card.cost }}</span><span class="tag">{{ $t('cards.power') }} {{ card.power }}</span><span class="tag">{{ card.rarity }}</span></div>
          <h2>{{ card.abilityTextZh }}</h2>
          <p class="muted">{{ card.description }}</p>
          <dl class="detail-list">
            <div><dt>{{ $t('cards.era') }}</dt><dd>{{ card.era }}</dd></div>
            <div><dt>{{ $t('cards.region') }}</dt><dd>{{ card.region }}</dd></div>
            <div><dt>{{ $t('cards.profession') }}</dt><dd>{{ card.profession }}</dd></div>
            <div><dt>{{ $t('cards.identity') }}</dt><dd>{{ card.identity }}</dd></div>
            <div><dt>{{ $t('cards.ability') }}</dt><dd>{{ card.sourceAbility || card.abilityId }}</dd></div>
            <div><dt>Card ID</dt><dd>{{ card.cardId }}</dd></div>
          </dl>
          <div class="tag-row"><span v-for="tag in card.tags" :key="tag" class="tag">{{ tag }}</span></div>
        </div>
      </div>
    </section>
  </div>
</template>
