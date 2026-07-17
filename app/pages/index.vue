<script setup lang="ts">
import { ArrowRight, BookOpen, GalleryVerticalEnd, History, LibraryBig, ShieldCheck, Swords, Wifi } from 'lucide-vue-next';
import { CARDS, FRONTS } from '~/data/catalog';
const extension = useRuntimeConfig().public.assetExtension;
const featured = ['秦始皇', '花木兰', '达·芬奇', '吉尔伽美什'];
const imageFor = (name: string) => `/cards/${encodeURIComponent(name)}.${extension}`;
const { selectedDeck } = useDecks();
const { history } = useMatchHistory();
</script>

<template>
  <div class="home-page">
    <section class="home-hero">
      <div class="portrait-rank" aria-hidden="true">
        <img v-for="(name, index) in featured" :key="name" :src="imageFor(name)" :alt="name" :style="{ '--rank': index }">
      </div>
      <div class="hero-copy">
        <span class="eyebrow">万世战线 · 第一赛季</span>
        <h1>万世战线</h1>
        <p>{{ $t('home.tagline') }}</p>
        <div class="button-row">
          <NuxtLink class="button primary" to="/play"><Swords :size="18" /> {{ $t('home.practice') }} <ArrowRight :size="16" /></NuxtLink>
          <NuxtLink class="button" to="/online"><Wifi :size="18" /> {{ $t('home.online') }}</NuxtLink>
        </div>
      </div>
      <aside class="readiness-strip">
        <span>{{ $t('home.status') }}</span>
        <strong>{{ selectedDeck?.name }}</strong>
        <small>{{ selectedDeck?.cardIds.length ?? 0 }}/12 张卡牌</small>
      </aside>
    </section>

    <section class="home-actions">
      <NuxtLink to="/deck-builder"><GalleryVerticalEnd :size="22" /><div><strong>{{ $t('home.deck') }}</strong><span>{{ selectedDeck?.name }}</span></div><ArrowRight :size="18" /></NuxtLink>
      <NuxtLink to="/collection"><LibraryBig :size="22" /><div><strong>{{ $t('home.collection') }}</strong><span>{{ CARDS.length }}</span></div><ArrowRight :size="18" /></NuxtLink>
      <NuxtLink to="/fronts"><BookOpen :size="22" /><div><strong>战线档案</strong><span>{{ FRONTS.filter(front => front.enabled).length }}</span></div><ArrowRight :size="18" /></NuxtLink>
      <NuxtLink to="/history"><History :size="22" /><div><strong>最近战史</strong><span>{{ history.length }}</span></div><ArrowRight :size="18" /></NuxtLink>
    </section>

    <section class="home-brief">
      <div><ShieldCheck :size="20" /><span>服务端权威</span><small>结果由确定性规则结算</small></div>
      <div><Swords :size="20" /><span>六回合</span><small>同时部署，分别锁定</small></div>
      <div><BookOpen :size="20" /><span>三条战线</span><small>随机组合，依次揭示</small></div>
    </section>
  </div>
</template>

<style scoped>
.home-page{min-height:calc(100vh - var(--header-height))}.home-hero{position:relative;height:min(650px,calc(100vh - var(--header-height) - 120px));min-height:500px;overflow:hidden;border-bottom:1px solid var(--line);background:#121815}.portrait-rank{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr)}.portrait-rank::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,14,12,.97) 0%,rgba(10,14,12,.78) 30%,rgba(10,14,12,.15) 67%,rgba(10,14,12,.66) 100%),linear-gradient(0deg,#111614 0%,transparent 45%)}.portrait-rank img{width:100%;height:100%;object-fit:cover;object-position:center 22%;filter:saturate(.72) contrast(1.08);transform:translateY(calc(var(--rank) * 10px))}.hero-copy{position:absolute;z-index:2;left:max(28px,calc((100vw - 1424px)/2));top:50%;max-width:600px;transform:translateY(-50%)}.hero-copy h1{margin:10px 0 8px;font-family:"Noto Serif SC","Songti SC",serif;font-size:72px;line-height:1;font-weight:800;text-shadow:0 5px 28px #000}.hero-copy p{margin:0 0 28px;color:var(--paper);font-family:"Noto Serif SC",serif;font-size:19px}.readiness-strip{position:absolute;z-index:3;right:max(28px,calc((100vw - 1424px)/2));bottom:28px;display:grid;min-width:210px;padding:12px 15px;border-left:3px solid var(--teal);background:rgba(13,18,16,.82)}.readiness-strip span,.readiness-strip small{color:var(--muted);font-size:10px}.readiness-strip strong{margin:4px 0}.home-actions{width:min(1424px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);border-left:1px solid var(--line)}.home-actions>a{min-height:112px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:13px;padding:20px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#171d1b}.home-actions>a:hover{background:#202724}.home-actions div{display:grid;gap:5px}.home-actions span{color:var(--muted);font-size:11px}.home-brief{width:min(1424px,100%);margin:28px auto 0;padding:0 28px 42px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.home-brief>div{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;padding:13px 0;border-top:1px solid var(--line)}.home-brief svg{grid-row:span 2;color:var(--copper)}.home-brief small{color:var(--muted)}
@media(max-width:850px){.home-hero{height:620px}.portrait-rank{grid-template-columns:repeat(2,1fr)}.portrait-rank img:nth-child(n+3){display:none}.hero-copy{left:20px;right:20px;top:auto;bottom:100px;transform:none}.hero-copy h1{font-size:54px}.readiness-strip{left:20px;right:auto;bottom:20px}.home-actions{grid-template-columns:repeat(2,1fr)}.home-brief{grid-template-columns:1fr}}
@media(max-width:480px){.home-actions{grid-template-columns:1fr}.portrait-rank{grid-template-columns:1fr}.portrait-rank img:nth-child(n+2){display:none}.hero-copy h1{font-size:46px}}
</style>
