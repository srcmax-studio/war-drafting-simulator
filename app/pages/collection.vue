<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import type { CardDefinition } from '~/common/src/index';
import { ASSET_BY_CARD, CARDS } from '~/data/catalog';
const search = ref('');
const era = ref('all');
const region = ref('all');
const cost = ref('all');
const page = ref(1);
const pageSize = 48;
const detail = ref<CardDefinition | null>(null);
const eras = [...new Set(CARDS.map((card) => card.era))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
const regions = [...new Set(CARDS.map((card) => card.region))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  return CARDS.filter((card) => !query || [card.nameZh, card.description, card.abilityTextZh, card.tags.join(' ')].join(' ').toLowerCase().includes(query))
    .filter((card) => era.value === 'all' || card.era === era.value)
    .filter((card) => region.value === 'all' || card.region === region.value)
    .filter((card) => cost.value === 'all' || String(card.cost) === cost.value);
});
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, era, region, cost], () => { page.value = 1; });
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">CHARACTER ARCHIVE</span><h1>{{ $t('cards.title') }}</h1><p>{{ $t('cards.result', { count: filtered.length }) }} · WebP {{ Object.values(ASSET_BY_CARD).filter(asset => asset.web).length }} · HD {{ Object.values(ASSET_BY_CARD).filter(asset => asset.hd).length }}</p></div></header>
    <div class="toolbar collection-toolbar"><label class="search-field"><Search :size="17" /><input v-model="search" class="input" :placeholder="$t('common.search')"></label><select v-model="cost" class="select"><option value="all">{{ $t('cards.cost') }} · {{ $t('common.all') }}</option><option v-for="value in 6" :key="value" :value="String(value)">{{ value }}</option></select><select v-model="era" class="select"><option value="all">{{ $t('cards.era') }} · {{ $t('common.all') }}</option><option v-for="value in eras" :key="value">{{ value }}</option></select><select v-model="region" class="select"><option value="all">{{ $t('cards.region') }} · {{ $t('common.all') }}</option><option v-for="value in regions" :key="value">{{ value }}</option></select></div>
    <div class="card-grid"><CardTile v-for="card in visible" :key="card.cardId" :card="card" @select="detail = card" /></div>
    <div class="pagination"><button class="icon-button" type="button" :disabled="page <= 1" @click="page--">←</button><span>{{ page }} / {{ pages }}</span><button class="icon-button" type="button" :disabled="page >= pages" @click="page++">→</button></div>
    <CardDetailModal :card="detail" @close="detail = null" />
  </div>
</template>
<style scoped>.collection-toolbar{grid-template-columns:minmax(260px,1fr) repeat(3,minmax(130px,.35fr))}@media(max-width:720px){.collection-toolbar{grid-template-columns:1fr 1fr}.collection-toolbar .search-field{grid-column:span 2}}</style>
