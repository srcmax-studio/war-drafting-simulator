<script setup lang="ts">
import { ArrowDownUp, Search, ShieldAlert, Sparkles, Weight } from 'lucide-vue-next';
import { CONTENT_PACKS, FRONTS } from '~/data/catalog';

const search = ref('');
const category = ref('all');
const complexity = ref('all');
const sortBy = ref('name');
const categories = [...new Set(FRONTS.flatMap((front) => front.categories))].sort();
const categoryNames: Record<string, string> = {
  economy: '军令与资源', 'high-risk': '高风险', power: '战力', '战力': '战力', trait: '角色特征', movement: '位置与调遣', dynamic: '动态规则', death: '阵亡与复归', capacity: '容量与部署', control: '控制', hidden: '揭示与情报', '技能': '技能'
};
const complexityNames = { simple: '基础', advanced: '进阶', chaotic: '高风险' } as const;
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return FRONTS.filter((front) => front.enabled)
    .filter((front) => !query || [front.nameZh, front.nameEn, front.descriptionZh, front.strategyZh, front.effectId, front.frontId, ...front.categories, ...front.tags].join(' ').toLocaleLowerCase().includes(query))
    .filter((front) => category.value === 'all' || front.categories.includes(category.value))
    .filter((front) => complexity.value === 'all' || front.complexity === complexity.value)
    .sort((left, right) => {
      const comparison = sortBy.value === 'weight' ? right.weight - left.weight
        : sortBy.value === 'complexity' ? ['simple', 'advanced', 'chaotic'].indexOf(left.complexity) - ['simple', 'advanced', 'chaotic'].indexOf(right.complexity)
          : left.nameZh.localeCompare(right.nameZh, 'zh-CN');
      return comparison || left.frontId.localeCompare(right.frontId);
    });
});
const pack = CONTENT_PACKS[0]!;
const args = (value?: Record<string, unknown>) => value && Object.keys(value).length ? JSON.stringify(value) : '无参数';
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">FRONT ARCHIVE</span><h1>{{ $t('fronts.title') }}</h1><p>{{ filtered.length }} / {{ FRONTS.filter(front => front.enabled).length }} 条启用战线 · {{ pack.nameZh }} {{ pack.version }} · 每局由种子和互斥规则选择三条。</p></div></header>
    <div class="front-toolbar">
      <label class="search-field"><Search :size="17" /><input v-model="search" class="input" placeholder="搜索战线、规则、类别或 Effect ID"></label>
      <select v-model="category" class="select"><option value="all">规则类别 · 全部</option><option v-for="value in categories" :key="value" :value="value">{{ categoryNames[value] ?? value }}</option></select>
      <select v-model="complexity" class="select"><option value="all">复杂度 · 全部</option><option value="simple">基础</option><option value="advanced">进阶</option><option value="chaotic">高风险</option></select>
      <label class="sort-control"><ArrowDownUp :size="16" /><select v-model="sortBy" class="select"><option value="name">按名称</option><option value="weight">按权重</option><option value="complexity">按复杂度</option></select></label>
    </div>
    <div class="front-summary">
      <span><Weight :size="15" /> 权重决定进入候选池的相对概率</span>
      <span><ShieldAlert :size="15" /> 互斥元数据会阻止冲突规则同局出现</span>
      <span><Sparkles :size="15" /> 动态与高风险战线具有多阶段结算</span>
    </div>
    <section class="front-archive">
      <article v-for="front in filtered" :key="front.frontId" :class="`complexity-${front.complexity}`">
        <header><div><span class="front-code">{{ front.frontId }}</span><h2>{{ front.nameZh }}</h2><small>{{ front.nameEn }}</small></div><div class="front-pool"><strong>{{ complexityNames[front.complexity] }}</strong><span>权重 {{ front.weight }}</span></div></header>
        <p class="front-rule">{{ front.descriptionZh }}</p>
        <div class="front-strategy"><strong>{{ $t('fronts.strategy') }}</strong><p>{{ front.strategyZh }}</p></div>
        <dl>
          <div><dt>Effect ID</dt><dd>{{ front.effectId }}</dd></div>
          <div><dt>效果参数</dt><dd>{{ args(front.effectArgs) }}</dd></div>
          <div><dt>最低客户端</dt><dd>{{ front.minimumClientVersion }}</dd></div>
          <div><dt>内容包</dt><dd>{{ front.packId }}</dd></div>
        </dl>
        <div class="front-meta"><div class="tag-row"><span v-for="item in front.categories" :key="`category-${item}`" class="tag">{{ categoryNames[item] ?? item }}</span><span v-for="item in front.tags" :key="`tag-${item}`" class="tag">{{ item }}</span></div><p v-if="front.incompatibleWith?.length || front.incompatibleTags?.length"><strong>互斥</strong> {{ [...(front.incompatibleWith ?? []), ...(front.incompatibleTags ?? []).map(item => `#${item}`)].join(' · ') }}</p></div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.front-toolbar { display: grid; grid-template-columns: minmax(280px,1fr) repeat(3,minmax(150px,.32fr)); gap: 10px; margin-bottom: 16px; }.sort-control { position: relative; }.sort-control svg { position: absolute; z-index: 1; left: 10px; top: 12px; color: var(--muted); }.sort-control .select { padding-left: 34px; }.front-summary { display: flex; flex-wrap: wrap; gap: 18px; padding: 11px 0 18px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 10px; }.front-summary span { display: inline-flex; align-items: center; gap: 6px; }.front-archive { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }.front-archive article { min-width: 0; padding: 22px 0; border-bottom: 1px solid var(--line); }.front-archive article>header { display: flex; justify-content: space-between; gap: 20px; }.front-code { color: var(--copper); font-size: 9px; }.front-archive h2 { margin: 5px 0 1px; font: 700 18px "Noto Serif SC", serif; }.front-archive header small { color: var(--muted); font-size: 9px; }.front-pool { flex: 0 0 auto; display: grid; justify-items: end; align-content: start; gap: 4px; }.front-pool strong { padding: 3px 6px; border: 1px solid var(--line); font-size: 9px; }.front-pool span { color: var(--muted); font-size: 9px; }.complexity-chaotic .front-pool strong { border-color: #8d4b48; color: #ef9690; }.complexity-advanced .front-pool strong { border-color: #7f693b; color: var(--gold); }.front-rule { min-height: 50px; margin: 13px 0; color: #d9ddda; font-size: 13px; line-height: 1.65; }.front-strategy { display: grid; grid-template-columns: 56px 1fr; gap: 9px; padding: 9px 0; border: solid var(--line); border-width: 1px 0; }.front-strategy strong { color: var(--copper); font-size: 9px; }.front-strategy p { margin: 0; color: var(--muted); font-size: 10px; line-height: 1.5; }.front-archive dl { display: grid; grid-template-columns: 1fr 1fr; margin: 10px 0; }.front-archive dl div { min-width: 0; padding: 6px 8px; border-left: 1px solid var(--line); }.front-archive dt { color: var(--muted); font-size: 8px; }.front-archive dd { margin: 3px 0 0; overflow-wrap: anywhere; font-family: ui-monospace, monospace; font-size: 9px; }.front-meta { display: grid; gap: 8px; }.front-meta p { margin: 0; color: var(--muted); font-size: 9px; }.front-meta p strong { color: #df8b85; }
@media(max-width:900px){.front-toolbar{grid-template-columns:1fr 1fr}.front-toolbar .search-field{grid-column:span 2}.front-archive{grid-template-columns:1fr}}
@media(max-width:540px){.front-toolbar{grid-template-columns:1fr}.front-toolbar .search-field{grid-column:1}.front-archive dl{grid-template-columns:1fr}}
</style>
