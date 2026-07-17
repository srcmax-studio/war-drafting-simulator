<script setup lang="ts">
import { Copy, Save, Search, Trash2 } from 'lucide-vue-next';
import type { CardDefinition } from '~/common/src/index';
import { CARDS, CARD_BY_ID } from '~/data/catalog';

const { decks, selectedDeck, selectedDeckId, selectDeck, saveDeck, copyDeck, deleteDeck } = useDecks();
const search = ref('');
const cost = ref('all');
const era = ref('all');
const region = ref('all');
const profession = ref('all');
const page = ref(1);
const pageSize = 36;
const detail = ref<CardDefinition | null>(null);
const editingName = ref(selectedDeck.value?.name ?? '');
const editingCards = ref<string[]>([...(selectedDeck.value?.cardIds ?? [])]);
const unique = (field: keyof CardDefinition) => [...new Set(CARDS.map((card) => String(card[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
const eras = unique('era');
const regions = unique('region');
const professions = unique('profession');
watch(selectedDeckId, () => {
  editingName.value = selectedDeck.value?.name ?? '';
  editingCards.value = [...(selectedDeck.value?.cardIds ?? [])];
});
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  return CARDS.filter((card) => !query || [card.nameZh, card.description, card.abilityTextZh, card.tags.join(' ')].join(' ').toLowerCase().includes(query))
    .filter((card) => cost.value === 'all' || String(card.cost) === cost.value)
    .filter((card) => era.value === 'all' || card.era === era.value)
    .filter((card) => region.value === 'all' || card.region === region.value)
    .filter((card) => profession.value === 'all' || card.profession === profession.value);
});
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, cost, era, region, profession], () => { page.value = 1; });
const toggle = (card: CardDefinition) => {
  if (editingCards.value.includes(card.cardId)) editingCards.value = editingCards.value.filter((id) => id !== card.cardId);
  else if (editingCards.value.length < 12) editingCards.value.push(card.cardId);
};
const curve = computed(() => Array.from({ length: 6 }, (_, index) => editingCards.value.filter((id) => CARD_BY_ID[id]?.cost === index + 1).length));
const save = () => { if (selectedDeck.value) saveDeck(selectedDeck.value.deckId, editingName.value, editingCards.value); };
const duplicate = () => { if (selectedDeck.value) selectDeck(copyDeck({ ...selectedDeck.value, cardIds: editingCards.value })); };
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">DECK OPERATIONS</span><h1>{{ $t('deck.title') }}</h1><p>{{ $t('deck.count', { count: editingCards.length }) }}</p></div><div class="button-row"><button class="button" type="button" @click="duplicate"><Copy :size="17" /> {{ $t('common.copy') }}</button><button v-if="selectedDeck?.source === 'custom'" class="button danger-button" type="button" @click="deleteDeck(selectedDeck.deckId)"><Trash2 :size="17" /> {{ $t('common.delete') }}</button><button class="button primary" type="button" :disabled="editingCards.length !== 12" @click="save"><Save :size="17" /> {{ $t('common.save') }}</button></div></header>
    <div class="split-layout">
      <div>
        <div class="toolbar">
          <label class="search-field"><Search :size="17" /><input v-model="search" class="input" :placeholder="$t('common.search')"></label>
          <select v-model="cost" class="select"><option value="all">{{ $t('cards.cost') }} · {{ $t('common.all') }}</option><option v-for="value in 6" :key="value" :value="String(value)">{{ value }}</option></select>
          <select v-model="era" class="select"><option value="all">{{ $t('cards.era') }} · {{ $t('common.all') }}</option><option v-for="value in eras" :key="value">{{ value }}</option></select>
          <select v-model="region" class="select"><option value="all">{{ $t('cards.region') }} · {{ $t('common.all') }}</option><option v-for="value in regions" :key="value">{{ value }}</option></select>
          <select v-model="profession" class="select"><option value="all">{{ $t('cards.profession') }} · {{ $t('common.all') }}</option><option v-for="value in professions" :key="value">{{ value }}</option></select>
        </div>
        <div class="card-grid"><CardTile v-for="card in visible" :key="card.cardId" :card="card" :selected="editingCards.includes(card.cardId)" @select="toggle" @dblclick="detail = card" /></div>
        <div class="pagination"><button class="icon-button" type="button" :disabled="page <= 1" @click="page--">←</button><span>{{ page }} / {{ pages }}</span><button class="icon-button" type="button" :disabled="page >= pages" @click="page++">→</button></div>
      </div>
      <aside class="side-panel">
        <label class="field"><span class="field-label">{{ $t('deck.preset') }}</span><select class="select" :value="selectedDeckId" @change="selectDeck(($event.target as HTMLSelectElement).value)"><option v-for="deck in decks" :key="deck.deckId" :value="deck.deckId">{{ deck.name }}</option></select></label>
        <label class="field deck-name"><span class="field-label">{{ $t('deck.name') }}</span><input v-model="editingName" class="input"></label>
        <p v-if="editingCards.length !== 12" class="danger">{{ $t('deck.invalid') }}</p>
        <h3>{{ $t('deck.curve') }}</h3><div class="curve"><div v-for="(countValue,index) in curve" :key="index"><span :style="{ height: `${Math.max(4, countValue * 18)}px` }" /><strong>{{ countValue }}</strong><small>{{ index + 1 }}</small></div></div>
        <h3>{{ $t('deck.count', { count: editingCards.length }) }}</h3><ol class="deck-list"><li v-for="cardId in editingCards" :key="cardId"><button type="button" @click="detail = CARD_BY_ID[cardId] ?? null">{{ CARD_BY_ID[cardId]?.nameZh }}</button><span>{{ CARD_BY_ID[cardId]?.cost }}/{{ CARD_BY_ID[cardId]?.power }}</span></li></ol>
      </aside>
    </div>
    <CardDetailModal :card="detail" @close="detail = null" />
  </div>
</template>

<style scoped>.deck-name{margin-top:14px}.curve{height:130px;display:flex;align-items:end;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)}.curve>div{height:100%;flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:3px}.curve span{width:100%;max-width:30px;background:var(--teal)}.curve strong,.curve small{font-size:10px}.curve small{color:var(--muted)}.deck-list{margin:0;padding:0;list-style:none}.deck-list li{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.deck-list button{flex:1;padding:8px 0;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer}.deck-list span{color:var(--muted);font-size:11px}</style>
