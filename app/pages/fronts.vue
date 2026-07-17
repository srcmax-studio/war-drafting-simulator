<script setup lang="ts">
import { ArrowDownUp, BookOpen, RefreshCw, Search, Sparkles, Swords, X } from 'lucide-vue-next';
import { FRONTS } from '~/data/catalog';
import { frontArtAlt, frontArtUrl } from '~/data/front-art';
import { FRONT_CATEGORY_LABELS, FRONT_COMPLEXITY_LABELS, frontFrequencyLabel, frontPresentationLabels } from '~/utils/front-presentation';

const search = ref('');
const category = ref('all');
const complexity = ref('all');
const sortBy = ref('name');
const detail = ref<(typeof FRONTS)[number] | null>(null);
const categories = [...new Set(FRONTS.flatMap((front) => front.categories))].sort();
const categoryNames = FRONT_CATEGORY_LABELS;
const complexityNames = FRONT_COMPLEXITY_LABELS;
const frontLabels = frontPresentationLabels;
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return FRONTS.filter((front) => front.enabled)
    .filter((front) => !query || [front.nameZh, front.descriptionZh, front.strategyZh, ...front.categories.map((item) => categoryNames[item] ?? ''), ...front.tags].join(' ').toLocaleLowerCase().includes(query))
    .filter((front) => category.value === 'all' || front.categories.includes(category.value))
    .filter((front) => complexity.value === 'all' || front.complexity === complexity.value)
    .sort((left, right) => {
      const comparison = sortBy.value === 'weight' ? right.weight - left.weight : sortBy.value === 'complexity' ? ['simple', 'advanced', 'chaotic'].indexOf(left.complexity) - ['simple', 'advanced', 'chaotic'].indexOf(right.complexity) : left.nameZh.localeCompare(right.nameZh, 'zh-CN');
      return comparison || left.frontId.localeCompare(right.frontId);
    });
});
const reset = () => { search.value='';category.value='all';complexity.value='all';sortBy.value='name'; };
</script>

<template>
  <div class="page fronts-page">
    <header class="page-heading"><div><span class="eyebrow">战场档案</span><h1>{{ $t('fronts.title') }}</h1><p>{{ FRONTS.filter(front=>front.enabled).length }} 条启用战线，场景、规则与策略档案一一对应。</p></div><StatusBadge tone="info"><Sparkles :size="12" /> {{ filtered.length }} 条结果</StatusBadge></header>
    <div class="front-toolbar">
      <label class="search-field"><Search :size="17" /><input v-model="search" class="input" placeholder="搜索战线、规则或类别" aria-label="搜索战线"></label>
      <select v-model="category" class="select" aria-label="规则类别"><option value="all">规则类别 · 全部</option><option v-for="value in categories" :key="value" :value="value">{{ categoryNames[value] ?? '特殊规则' }}</option></select>
      <select v-model="complexity" class="select" aria-label="复杂度"><option value="all">复杂度 · 全部</option><option value="simple">基础</option><option value="advanced">进阶</option><option value="chaotic">高风险</option></select>
      <label class="sort-control"><ArrowDownUp :size="16" /><select v-model="sortBy" class="select" aria-label="战线排序"><option value="name">按名称</option><option value="weight">按出现频率</option><option value="complexity">按复杂度</option></select></label>
      <IconButton label="重置筛选" @click="reset"><RefreshCw :size="17" /></IconButton>
    </div>

    <section v-if="filtered.length" class="front-grid" aria-live="polite">
      <button v-for="front in filtered" :key="front.frontId" type="button" class="front-card" :class="`complexity-${front.complexity}`" @click="detail=front">
        <img :src="frontArtUrl(front.frontId,'thumbnail')" :alt="frontArtAlt(front)" loading="lazy" width="480" height="320">
        <span class="front-image-shade" />
        <header><span class="front-index">战线档案</span><StatusBadge :tone="front.complexity==='chaotic'?'danger':front.complexity==='advanced'?'warning':'neutral'">{{ complexityNames[front.complexity] }}</StatusBadge></header>
        <div class="front-copy"><h2>{{ front.nameZh }}</h2><p>{{ front.descriptionZh }}</p><div class="tag-row"><span v-for="item in frontLabels(front).slice(0,3)" :key="item" class="tag">{{ item }}</span></div></div>
      </button>
    </section>
    <EmptyState v-else title="没有符合条件的战线" description="重置筛选后可查看全部战场档案。"><template #icon><BookOpen :size="30" /></template><GameButton size="small" @click="reset"><RefreshCw :size="14" /> 重置筛选</GameButton></EmptyState>

    <Modal :open="Boolean(detail)" width="large" :title="detail?.nameZh ?? '战线档案'" @close="detail=null">
      <article v-if="detail" class="front-detail">
        <div class="detail-scene"><img :src="frontArtUrl(detail.frontId)" :alt="frontArtAlt(detail)"><span><b>战线全景</b><small>{{ frontLabels(detail).slice(0,2).join(' · ') }}</small></span></div>
        <div class="detail-copy"><div class="detail-status"><StatusBadge :tone="detail.complexity==='chaotic'?'danger':detail.complexity==='advanced'?'warning':'neutral'">{{ complexityNames[detail.complexity] }}</StatusBadge><span v-for="item in frontLabels(detail)" :key="item" class="tag">{{ item }}</span></div><section><span class="eyebrow">战线规则</span><h3>{{ detail.descriptionZh }}</h3></section><section><span class="eyebrow">战略研判</span><p>{{ detail.strategyZh }}</p></section><dl><div><dt>复杂度</dt><dd>{{ complexityNames[detail.complexity] }}</dd></div><div><dt>出现频率</dt><dd>{{ frontFrequencyLabel(detail.weight) }}</dd></div><div><dt>规则类别</dt><dd>{{ frontLabels(detail).slice(0,2).join('、') }}</dd></div><div><dt>揭示说明</dt><dd>按对局回合公开</dd></div></dl></div>
      </article>
      <template #footer><GameButton variant="ghost" @click="detail=null"><X :size="15" /> 关闭</GameButton><GameButton to="/play" variant="primary"><Swords :size="15" /> 进入对战</GameButton></template>
    </Modal>
  </div>
</template>

<style scoped>
.fronts-page{max-width:1500px}.front-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) repeat(3,minmax(150px,.32fr)) 40px;gap:9px;margin-bottom:18px}.sort-control{position:relative}.sort-control svg{position:absolute;z-index:1;left:10px;top:12px;color:var(--color-text-muted)}.sort-control .select{padding-left:34px}.front-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.front-card{position:relative;min-width:0;aspect-ratio:3/2;overflow:hidden;padding:0;border:1px solid var(--border-subtle);background:#111714;color:var(--color-text-primary);text-align:left;cursor:pointer}.front-card:hover{border-color:var(--border-strong)}.front-card:focus-visible{box-shadow:var(--focus-ring)}.front-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform 240ms ease}.front-card:hover>img{transform:scale(1.025)}.front-image-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,7,6,.38),rgba(4,7,6,.08) 35%,rgba(4,7,6,.94) 100%)}.front-card>header{position:absolute;z-index:2;left:12px;right:12px;top:11px;display:flex;align-items:center;justify-content:space-between;gap:8px}.front-index{overflow:hidden;color:rgba(240,236,227,.72);font:8px var(--font-numeric);text-overflow:ellipsis;white-space:nowrap}.front-copy{position:absolute;z-index:2;left:14px;right:14px;bottom:13px}.front-copy h2{margin:0 0 3px;font-family:var(--font-display);font-size:20px}.front-copy p{height:34px;margin:0 0 9px;overflow:hidden;color:#c5cbc7;font-size:10px;line-height:1.55}.front-card.complexity-chaotic{box-shadow:inset 0 3px var(--color-danger)}.front-card.complexity-advanced{box-shadow:inset 0 3px var(--color-warning)}.front-detail{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:22px}.detail-scene{position:relative;min-height:480px;overflow:hidden;border:1px solid var(--border-subtle);background:#111714}.detail-scene img{width:100%;height:100%;object-fit:cover}.detail-scene>span{position:absolute;left:0;right:0;bottom:0;display:grid;padding:50px 18px 16px;background:linear-gradient(transparent,rgba(5,8,7,.92))}.detail-scene small{color:var(--color-text-muted);font:9px var(--font-numeric)}.detail-copy{align-self:center}.detail-status{display:flex;flex-wrap:wrap;gap:6px}.detail-copy section{padding:20px 0;border-bottom:1px solid var(--border-subtle)}.detail-copy h3{margin:6px 0 0;font-size:17px;line-height:1.7}.detail-copy p{margin:6px 0 0;color:var(--color-text-secondary);line-height:1.75}.detail-copy dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0 0}.detail-copy dl div{border-bottom:1px solid var(--border-subtle);padding-bottom:8px}.detail-copy dt{color:var(--color-text-muted);font-size:9px}.detail-copy dd{margin:3px 0 0;font:700 11px var(--font-numeric)}@media(max-width:1050px){.front-toolbar{grid-template-columns:1fr 1fr 40px}.front-toolbar .search-field{grid-column:1/-1}.front-grid{grid-template-columns:1fr 1fr}.front-detail{grid-template-columns:1fr}.detail-scene{min-height:380px}}@media(max-width:650px){.front-toolbar{grid-template-columns:1fr 40px}.front-toolbar .search-field{grid-column:1/-1}.front-toolbar select{grid-column:1}.front-grid{grid-template-columns:1fr}.front-card{min-height:230px}.detail-scene{min-height:260px}}
</style>
