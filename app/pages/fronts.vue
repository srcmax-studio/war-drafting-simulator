<script setup lang="ts">
import { ArrowDownUp, Search, Sparkles } from 'lucide-vue-next';
import { FRONTS } from '~/data/catalog';

const search = ref('');
const category = ref('all');
const complexity = ref('all');
const sortBy = ref('name');
const categories = [...new Set(FRONTS.flatMap((front) => front.categories))].sort();
const categoryNames: Record<string, string> = {
  economy: '军令与资源', 'high-risk': '高风险', power: '战力', '战力': '战力', trait: '角色特征', movement: '位置与调遣', dynamic: '动态规则', death: '阵亡与复归', capacity: '容量与部署', control: '控制', hidden: '揭示与情报', '技能': '技能'
};
const complexityNames = { simple: '基础', advanced: '进阶', chaotic: '高风险' } as const;
const frontLabels = (front: (typeof FRONTS)[number]) => [...new Set([
  ...front.categories.map((item) => categoryNames[item] ?? '特殊规则'),
  ...front.tags.filter((item) => !/[A-Za-z_-]/u.test(item))
])];
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return FRONTS.filter((front) => front.enabled)
    .filter((front) => !query || [front.nameZh, front.descriptionZh, front.strategyZh, ...front.categories.map((item) => categoryNames[item] ?? ''), ...front.tags].join(' ').toLocaleLowerCase().includes(query))
    .filter((front) => category.value === 'all' || front.categories.includes(category.value))
    .filter((front) => complexity.value === 'all' || front.complexity === complexity.value)
    .sort((left, right) => {
      const comparison = sortBy.value === 'weight' ? right.weight - left.weight
        : sortBy.value === 'complexity' ? ['simple', 'advanced', 'chaotic'].indexOf(left.complexity) - ['simple', 'advanced', 'chaotic'].indexOf(right.complexity)
          : left.nameZh.localeCompare(right.nameZh, 'zh-CN');
      return comparison || left.frontId.localeCompare(right.frontId);
    });
});
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">战线图鉴</span><h1>{{ $t('fronts.title') }}</h1><p>已收录 {{ FRONTS.filter(front => front.enabled).length }} 条战线，每局会从中选择三条。</p></div></header>
    <div class="front-toolbar">
      <label class="search-field"><Search :size="17" /><input v-model="search" class="input" placeholder="搜索战线、规则或类别"></label>
      <select v-model="category" class="select"><option value="all">规则类别 · 全部</option><option v-for="value in categories" :key="value" :value="value">{{ categoryNames[value] ?? '特殊规则' }}</option></select>
      <select v-model="complexity" class="select"><option value="all">复杂度 · 全部</option><option value="simple">基础</option><option value="advanced">进阶</option><option value="chaotic">高风险</option></select>
      <label class="sort-control"><ArrowDownUp :size="16" /><select v-model="sortBy" class="select"><option value="name">按名称</option><option value="weight">按出现频率</option><option value="complexity">按复杂度</option></select></label>
    </div>
    <div class="front-summary">
      <span><Sparkles :size="15" /> 进阶与高风险战线会显著改变部署和计分方式</span>
    </div>
    <section class="front-archive">
      <article v-for="front in filtered" :key="front.frontId" :class="`complexity-${front.complexity}`">
        <header><div><h2>{{ front.nameZh }}</h2></div><div class="front-pool"><strong>{{ complexityNames[front.complexity] }}</strong></div></header>
        <p class="front-rule">{{ front.descriptionZh }}</p>
        <div class="front-strategy"><strong>{{ $t('fronts.strategy') }}</strong><p>{{ front.strategyZh }}</p></div>
        <div class="front-meta"><div class="tag-row"><span v-for="item in frontLabels(front)" :key="item" class="tag">{{ item }}</span></div></div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.front-toolbar { display: grid; grid-template-columns: minmax(280px,1fr) repeat(3,minmax(150px,.32fr)); gap: 10px; margin-bottom: 16px; }.sort-control { position: relative; }.sort-control svg { position: absolute; z-index: 1; left: 10px; top: 12px; color: var(--muted); }.sort-control .select { padding-left: 34px; }.front-summary { display: flex; flex-wrap: wrap; gap: 18px; padding: 11px 0 18px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 10px; }.front-summary span { display: inline-flex; align-items: center; gap: 6px; }.front-archive { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }.front-archive article { min-width: 0; padding: 22px 0; border-bottom: 1px solid var(--line); }.front-archive article>header { display: flex; justify-content: space-between; gap: 20px; }.front-archive h2 { margin: 5px 0 1px; font: 700 18px "Noto Serif SC", serif; }.front-pool { flex: 0 0 auto; display: grid; justify-items: end; align-content: start; gap: 4px; }.front-pool strong { padding: 3px 6px; border: 1px solid var(--line); font-size: 9px; }.complexity-chaotic .front-pool strong { border-color: #8d4b48; color: #ef9690; }.complexity-advanced .front-pool strong { border-color: #7f693b; color: var(--gold); }.front-rule { min-height: 50px; margin: 13px 0; color: #d9ddda; font-size: 13px; line-height: 1.65; }.front-strategy { display: grid; grid-template-columns: 56px 1fr; gap: 9px; padding: 9px 0; border: solid var(--line); border-width: 1px 0; }.front-strategy strong { color: var(--copper); font-size: 9px; }.front-strategy p { margin: 0; color: var(--muted); font-size: 10px; line-height: 1.5; }.front-meta { display: grid; gap: 8px; margin-top: 10px; }
@media(max-width:900px){.front-toolbar{grid-template-columns:1fr 1fr}.front-toolbar .search-field{grid-column:span 2}.front-archive{grid-template-columns:1fr}}
@media(max-width:540px){.front-toolbar{grid-template-columns:1fr}.front-toolbar .search-field{grid-column:1}.front-archive dl{grid-template-columns:1fr}}
</style>
