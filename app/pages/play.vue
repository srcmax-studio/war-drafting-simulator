<script setup lang="ts">
import { ArrowRight, Bot, Wifi } from 'lucide-vue-next';
import { CARD_BY_ID } from '~/data/catalog';
const router = useRouter();
const { selectedDeck, decks, selectDeck } = useDecks();
const { startPractice } = useLocalGame();
const legalDeck = computed(() => selectedDeck.value?.cardIds.length === 12 && selectedDeck.value.cardIds.every(cardId => Boolean(CARD_BY_ID[cardId])));
const begin = () => {
  if (!selectedDeck.value || !legalDeck.value) return;
  if (startPractice(selectedDeck.value)) router.push('/game?mode=practice');
};
</script>

<template>
  <div class="page page-narrow">
    <header class="page-heading"><div><span class="eyebrow">对战准备</span><h1>{{ $t('play.title') }}</h1></div></header>
    <div class="mode-list">
      <section>
        <Bot :size="32" /><div><h2>{{ $t('play.practice') }}</h2><p>{{ $t('play.practiceDesc') }}</p><label class="field"><span class="field-label">出战牌组</span><select class="select" :value="selectedDeck?.deckId" @change="selectDeck(($event.target as HTMLSelectElement).value)"><option v-for="deck in decks" :key="deck.deckId" :value="deck.deckId">{{ deck.source === 'preset' ? '预设 · ' : '自定义 · ' }}{{ deck.name }} · {{ deck.cardIds.length }}/12</option></select></label><p v-if="!legalDeck" class="danger deck-error">该牌组必须包含十二张当前目录中的不同卡牌。</p></div><button class="button primary" type="button" :disabled="!legalDeck" @click="begin">{{ $t('common.start') }} <ArrowRight :size="17" /></button>
      </section>
      <section>
        <Wifi :size="32" /><div><h2>{{ $t('play.online') }}</h2><p>{{ $t('play.onlineDesc') }}</p></div><NuxtLink class="button" to="/online">连接 <ArrowRight :size="17" /></NuxtLink>
      </section>
    </div>
  </div>
</template>

<style scoped>.mode-list{display:grid;border-top:1px solid var(--line)}.mode-list section{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:18px;align-items:start;padding:26px 0;border-bottom:1px solid var(--line)}.mode-list svg{color:var(--copper)}.mode-list h2{margin:0 0 7px}.mode-list p{max-width:620px;margin:0 0 18px;color:var(--muted);line-height:1.65}.mode-list p.deck-error{margin:8px 0 0;font-size:11px}.mode-list .field{max-width:380px}@media(max-width:650px){.mode-list section{grid-template-columns:42px 1fr}.mode-list .button{grid-column:2;justify-self:start}}</style>
