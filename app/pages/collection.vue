<script setup lang="ts">
import { ArrowDownUp, ChevronLeft, ChevronRight, LibraryBig, RefreshCw, Search } from 'lucide-vue-next';
import type { AbilityTrigger, CardDefinition } from '~/common/src/index';
import { CARDS } from '~/data/catalog';
import { TRIGGER_LABELS } from '~/utils/ability-text';

const search = ref('');
const era = ref('all');
const region = ref('all');
const profession = ref('all');
const cost = ref('all');
const tag = ref('all');
const trigger = ref('all');
const sortBy = ref('name');
const page = ref(1);
const pageSize = 48;
const detail = ref<CardDefinition | null>(null);
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
const eras = unique(CARDS.map((card) => card.era));
const regions = unique(CARDS.map((card) => card.region));
const professions = unique(CARDS.map((card) => card.profession));
const tags = unique(CARDS.flatMap((card) => card.tags));
const triggers = unique(CARDS.flatMap((card) => (card.abilities ?? []).map((ability) => ability.trigger))) as AbilityTrigger[];
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return CARDS.filter((card) => !query || [card.nameZh, card.description, card.abilityTextZh, card.role, card.tags.join(' '), ...(card.abilities ?? []).flatMap((ability) => [ability.nameZh, ability.textZh])].join(' ').toLocaleLowerCase().includes(query))
    .filter((card) => era.value === 'all' || card.era === era.value)
    .filter((card) => region.value === 'all' || card.region === region.value)
    .filter((card) => profession.value === 'all' || card.profession === profession.value)
    .filter((card) => cost.value === 'all' || String(card.cost) === cost.value)
    .filter((card) => tag.value === 'all' || card.tags.includes(tag.value))
    .filter((card) => trigger.value === 'all' || (card.abilities ?? []).some((ability) => ability.trigger === trigger.value))
    .sort((left, right) => {
      const comparison = sortBy.value === 'cost' ? left.cost - right.cost
        : sortBy.value === 'power' ? right.power - left.power
          : left.nameZh.localeCompare(right.nameZh, 'zh-CN');
      return comparison || left.cardId.localeCompare(right.cardId);
    });
});
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, era, region, profession, cost, tag, trigger, sortBy], () => { page.value = 1; });
const reset = () => { search.value='';era.value='all';region.value='all';profession.value='all';cost.value='all';tag.value='all';trigger.value='all';sortBy.value='name'; };
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">角色档案</span><h1>{{ $t('cards.title') }}</h1><p>{{ $t('cards.result', { count: filtered.length }) }} · 点击卡牌查看完整技能说明</p></div></header>
    <div class="collection-toolbar">
      <label class="search-field"><Search :size="17" /><input v-model="search" class="input" :placeholder="$t('common.search')"></label>
      <select v-model="cost" class="select" aria-label="费用筛选"><option value="all">{{ $t('cards.cost') }} · {{ $t('common.all') }}</option><option v-for="value in 6" :key="value" :value="String(value)">{{ value }}</option></select>
      <select v-model="era" class="select" aria-label="时代筛选"><option value="all">{{ $t('cards.era') }} · {{ $t('common.all') }}</option><option v-for="value in eras" :key="value">{{ value }}</option></select>
      <select v-model="region" class="select" aria-label="地区筛选"><option value="all">{{ $t('cards.region') }} · {{ $t('common.all') }}</option><option v-for="value in regions" :key="value">{{ value }}</option></select>
      <select v-model="profession" class="select" aria-label="职业筛选"><option value="all">{{ $t('cards.profession') }} · {{ $t('common.all') }}</option><option v-for="value in professions" :key="value">{{ value }}</option></select>
      <select v-model="tag" class="select" aria-label="标签筛选"><option value="all">标签 · 全部</option><option v-for="value in tags" :key="value">{{ value }}</option></select>
      <select v-model="trigger" class="select" aria-label="技能触发筛选"><option value="all">技能触发 · 全部</option><option v-for="value in triggers" :key="value" :value="value">{{ TRIGGER_LABELS[value] }}</option></select>
      <label class="sort-control"><ArrowDownUp :size="16" /><select v-model="sortBy" class="select" aria-label="排序"><option value="name">按名称</option><option value="cost">按费用</option><option value="power">按战力</option></select></label>
    </div>
    <div v-if="visible.length" class="card-grid"><CardTile v-for="card in visible" :key="card.cardId" :card="card" @select="detail = card" /></div>
    <div v-if="visible.length" class="pagination"><button class="icon-button" type="button" aria-label="上一页" :disabled="page <= 1" @click="page--"><ChevronLeft :size="18" /></button><span>{{ page }} / {{ pages }}</span><button class="icon-button" type="button" aria-label="下一页" :disabled="page >= pages" @click="page++"><ChevronRight :size="18" /></button></div>
    <EmptyState v-else title="没有符合条件的角色" description="重置筛选后可查看全部角色卡牌。"><template #icon><LibraryBig :size="30" /></template><GameButton size="small" @click="reset"><RefreshCw :size="14" /> 重置筛选</GameButton></EmptyState>
    <CardDetailModal :card="detail" @close="detail = null" />
  </div>
</template>

<style scoped>
.collection-toolbar { display: grid; grid-template-columns: minmax(260px,1fr) repeat(4,minmax(120px,.32fr)); gap: 9px; margin-bottom: 20px; }.sort-control { position: relative; }.sort-control svg { position: absolute; z-index: 1; left: 10px; top: 12px; color: var(--muted); }.sort-control .select { padding-left: 34px; }
@media(max-width:1050px){.collection-toolbar{grid-template-columns:repeat(3,1fr)}.collection-toolbar .search-field{grid-column:span 3}}
@media(max-width:720px){.collection-toolbar{grid-template-columns:1fr 1fr}.collection-toolbar .search-field{grid-column:span 2}}
</style>
