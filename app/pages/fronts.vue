<script setup lang="ts">
import { ArrowLeftRight, Boxes, CircleGauge, Eye, ShieldAlert } from 'lucide-vue-next';
import { FRONTS } from '~/data/catalog';
const groups = [
  { name: '部署与军令', icon: CircleGauge, ids: ['cost_down','cost_up','ban_high_cost','ban_low_cost','repeat_reveal','delayed_reveal','early_reveal'] },
  { name: '位置与容量', icon: ArrowLeftRight, ids: ['move_left','random_move','capacity_up','capacity_down','solo_bonus','full_bonus'] },
  { name: '角色连携', icon: Boxes, ids: ['era_bonus','region_bonus','profession_bonus','identity_bonus','cross_era_bonus','vanilla_bonus'] },
  { name: '资源与伤亡', icon: ShieldAlert, ids: ['recruit','copy','discard','destroy','return','silence'] },
  { name: '战力与情报', icon: Eye, ids: ['base_power_up','base_power_down','hidden_power','invert_power','negative_bonus'] }
];
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">FRONT ARCHIVE</span><h1>{{ $t('fronts.title') }}</h1><p>{{ FRONTS.filter(front => front.enabled).length }} 条原创战线进入随机池，每局由种子选择三条且不重复。</p></div></header>
    <section v-for="group in groups" :key="group.name" class="front-group"><div class="section-title"><h2><component :is="group.icon" :size="19" /> {{ group.name }}</h2><span>{{ FRONTS.filter(front => group.ids.includes(front.effectId)).length }}</span></div><div class="front-list"><article v-for="front in FRONTS.filter(item => group.ids.includes(item.effectId))" :key="front.frontId"><div><span class="front-code">{{ front.frontId }}</span><h3>{{ front.nameZh }} <small>{{ front.nameEn }}</small></h3></div><p>{{ front.descriptionZh }}</p><aside><strong>{{ $t('fronts.strategy') }}</strong><span>{{ front.strategyZh }}</span></aside><div class="tag-row"><span v-for="tag in front.tags" :key="tag" class="tag">{{ tag }}</span></div></article></div></section>
  </div>
</template>
<style scoped>.section-title h2{display:flex;align-items:center;gap:8px}.section-title>span{color:var(--muted)}.front-group{margin-bottom:36px}.front-list{border-top:1px solid var(--line)}.front-list article{display:grid;grid-template-columns:minmax(190px,.65fr) minmax(260px,1fr) minmax(220px,.8fr) 180px;gap:20px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line)}.front-list h3{margin:5px 0 0;font-family:"Noto Serif SC",serif}.front-list h3 small{display:block;margin-top:3px;color:var(--muted);font-family:inherit;font-size:10px}.front-list p{margin:0;color:#d1d5d1;line-height:1.65}.front-list aside{display:grid;gap:5px}.front-list aside strong,.front-code{color:var(--copper);font-size:10px}.front-list aside span{color:var(--muted);font-size:12px;line-height:1.5}@media(max-width:900px){.front-list article{grid-template-columns:1fr 1fr}.front-list .tag-row{justify-content:flex-end}}@media(max-width:600px){.front-list article{grid-template-columns:1fr}.front-list .tag-row{justify-content:flex-start}}</style>
