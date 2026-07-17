<script setup lang="ts">
import { ArrowRight, BookOpen, Clock3, GalleryVerticalEnd, History, LibraryBig, PackageOpen, RadioTower, Server, ShieldCheck, Swords, Trophy, Wifi } from 'lucide-vue-next';
import type { CardDefinition } from '~/common/src/index';
import homeData from '~/data/home-catalog.json';
import { frontArtUrl } from '~/data/front-art';
import { cardFallbackUrl, cardImageUrl } from '~/utils/card-images';

interface HomeCard {
  cardId: string;
  nameZh: string;
  imageKey: string;
  era: string;
  faction: string;
}

interface HomeDeck {
  deckId: string;
  name: string;
  cardIds: string[];
  coverCardId?: string;
}

interface HomeHistoryEntry {
  gameId: string;
  timestamp: number;
  mode: 'practice' | 'online';
  playerId: string;
  deckName: string;
  winner?: { winnerId: string | null; stake: number } | null;
  summary?: {
    turns: number;
    durationMs: number;
    fronts: Array<{ frontId: string; nameZh: string; powers: Record<string, number> }>;
  };
}

interface HomeServerStatus {
  connectedUsers?: number;
  status?: string;
  protocolVersion?: string;
}

const runtime = useRuntimeConfig();
const homeCards = new Map((homeData.cards as HomeCard[]).map((card) => [card.cardId, card]));
const presets = homeData.presets as HomeDeck[];
const selectedDeck = ref<HomeDeck>(presets[0]!);
const history = ref<HomeHistoryEntry[]>([]);
const serverStatus = useState<HomeServerStatus | null>('aeonfront-server-status-v3', () => null);
useSceneAudio('home');

const heroFronts = homeData.fronts;
const featuredCards = homeData.featuredCards as unknown as CardDefinition[];
const featuredFront = heroFronts.find((front) => front.frontId === 'future-beacon') ?? heroFronts[0]!;
const coverCard = computed(() => homeCards.get(selectedDeck.value.coverCardId ?? selectedDeck.value.cardIds[0] ?? '') ?? featuredCards[0]);
const recent = computed(() => history.value.slice(0, 3));
const detailCard = ref<CardDefinition | null>(null);
const lastMode = computed(() => history.value[0]?.mode ?? 'practice');
const continueTo = computed(() => lastMode.value === 'online' ? '/online' : '/play');
const formatDate = (timestamp: number) => new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp);
const resultLabel = (entry: (typeof history.value)[number]) => !entry.winner?.winnerId ? '平局' : entry.winner.winnerId === entry.playerId ? '胜利' : '失败';
const modes = computed(() => [
  { to: '/play', title: '练习对战', meta: '确定性 AI · 六回合', icon: Swords, tone: 'cinnabar' },
  { to: '/online', title: '在线对战', meta: '大厅 · 房间 · 快速匹配', icon: Wifi, tone: 'jade' },
  { to: '/deck-builder', title: '牌组构筑', meta: `${selectedDeck.value?.name ?? '未选择'} · ${selectedDeck.value?.cardIds.length ?? 0}/12`, icon: GalleryVerticalEnd, tone: 'copper' },
  { to: '/collection', title: '卡牌图鉴', meta: `${homeData.cardCount} 名跨时代角色`, icon: LibraryBig, tone: 'blue' },
  { to: '/fronts', title: '战线档案', meta: `${homeData.enabledFrontCount} 条战场规则`, icon: BookOpen, tone: 'gold' },
  { to: '/history', title: '战局历史', meta: `${history.value.length} 份本地战报`, icon: History, tone: 'neutral' }
]);

onMounted(() => {
  try {
    const stored = JSON.parse(localStorage.getItem('aeonfront_decks_v2') ?? 'null') as { decks?: HomeDeck[]; selectedDeckId?: string; defaultDeckId?: string } | null;
    if (stored) {
      const decks = [...(Array.isArray(stored.decks) ? stored.decks : []), ...presets];
      const selected = decks.find((deck) => deck.deckId === stored.selectedDeckId)
        ?? decks.find((deck) => deck.deckId === stored.defaultDeckId)
        ?? presets[0];
      if (selected && Array.isArray(selected.cardIds)) selectedDeck.value = selected;
    }
  } catch {
    selectedDeck.value = presets[0]!;
  }
  try {
    const stored = JSON.parse(localStorage.getItem('aeonfront_match_history_v3') ?? '[]') as unknown;
    if (Array.isArray(stored)) {
      history.value = stored.filter((entry): entry is HomeHistoryEntry => Boolean(entry) && typeof entry === 'object' && typeof entry.gameId === 'string' && typeof entry.deckName === 'string').slice(0, 50);
    }
  } catch {
    history.value = [];
  }
});
</script>

<template>
  <div class="home-page">
    <section class="home-hero">
      <div class="hero-fronts" aria-hidden="true"><img v-for="(front,index) in heroFronts" :key="front.frontId" :src="frontArtUrl(front.frontId)" alt="" :fetchpriority="index===0?'high':undefined"></div>
      <div class="hero-overlay" />
      <img v-if="coverCard" class="hero-character" :src="cardImageUrl(coverCard)" :alt="coverCard.nameZh" @error="($event.target as HTMLImageElement).src=cardFallbackUrl(coverCard)">
      <div class="hero-copy">
        <span class="eyebrow">AEONFRONT · CORE SEASON</span>
        <h1>万世战线</h1>
        <p>群英跨越时代，三线决定天下。</p>
        <div class="hero-actions"><GameButton to="/play" variant="primary" size="large"><Swords :size="18" /> 开始对战 <ArrowRight :size="16" /></GameButton><GameButton :to="continueTo" size="large"><History :size="18" /> {{ history.length?`继续${lastMode==='online'?'在线':'演武'}`:'选择模式' }}</GameButton><GameButton to="/deck-builder" variant="ghost" size="large"><GalleryVerticalEnd :size="18" /> 牌组编辑</GameButton></div>
        <div class="hero-metrics"><span><strong>{{ homeData.cardCount }}</strong><small>角色卡牌</small></span><span><strong>{{ homeData.enabledFrontCount }}</strong><small>启用战线</small></span><span><strong>{{ serverStatus?.connectedUsers ?? '—' }}</strong><small>服务器在线</small></span></div>
      </div>
      <aside class="loadout-rail"><span>当前出战档案</span><strong>{{ selectedDeck?.name ?? '未选择牌组' }}</strong><small>{{ selectedDeck?.cardIds.length ?? 0 }}/12 · {{ coverCard?.nameZh ?? '无封面角色' }}</small><StatusBadge :tone="selectedDeck?.cardIds.length===12?'success':'warning'">{{ selectedDeck?.cardIds.length===12?'可出战':'待补全' }}</StatusBadge></aside>
    </section>

    <main class="home-content">
      <SectionHeader title="作战入口" eyebrow="Operations" description="" />
      <section class="mode-grid" aria-label="作战入口"><NuxtLink v-for="mode in modes" :key="mode.to" :to="mode.to" :prefetch="false" :class="`tone-${mode.tone}`"><component :is="mode.icon" :size="22" /><span><strong>{{ mode.title }}</strong><small>{{ mode.meta }}</small></span><ArrowRight :size="17" /></NuxtLink></section>

      <SectionHeader title="最近战局" eyebrow="Recent battles"><GameButton to="/history" variant="ghost" size="small">全部战史 <ArrowRight :size="14" /></GameButton></SectionHeader>
      <section v-if="recent.length" class="recent-grid"><article v-for="entry in recent" :key="entry.gameId" :class="resultLabel(entry)"><header><StatusBadge :tone="resultLabel(entry)==='胜利'?'success':resultLabel(entry)==='失败'?'danger':'warning'">{{ resultLabel(entry) }}</StatusBadge><span><Clock3 :size="12" /> {{ formatDate(entry.timestamp) }}</span></header><h3>{{ entry.deckName }}</h3><p>{{ entry.mode==='online'?'在线对战':'练习对战' }} · {{ entry.summary?.turns ?? 0 }} 回合 · 战功 {{ entry.winner?.stake ?? 0 }}</p><div v-if="entry.summary" class="recent-fronts"><span v-for="front in entry.summary.fronts" :key="front.frontId"><b>{{ front.nameZh }}</b><small>{{ front.powers[entry.playerId] ?? 0 }}</small></span></div><NuxtLink :to="`/result/${entry.gameId}`" :prefetch="false">查看复盘 <ArrowRight :size="14" /></NuxtLink></article></section>
      <EmptyState v-else title="尚无战局档案" description="完成第一场演武后，三线结果与完整复盘会保存在本机。"><template #icon><Trophy :size="30" /></template><GameButton to="/play" variant="primary" size="small">开始演武</GameButton></EmptyState>

      <SectionHeader title="当前内容" eyebrow="Archive" />
      <section class="content-band">
        <div class="featured-cards"><button v-for="card in featuredCards" :key="card.cardId" type="button" @click="detailCard=card"><img :src="cardImageUrl(card)" :alt="card.nameZh" loading="lazy"><span><strong>{{ card.nameZh }}</strong><small>{{ card.era }} · {{ card.profession }}</small></span></button></div>
        <article class="featured-front"><img :src="frontArtUrl(featuredFront.frontId,'thumbnail')" :alt="`${featuredFront.nameZh}战线场景`" loading="lazy"><div><span class="eyebrow">精选战线</span><h3>{{ featuredFront.nameZh }}</h3><p>{{ featuredFront.descriptionZh }}</p><NuxtLink to="/fronts" :prefetch="false">进入战线图鉴 <ArrowRight :size="14" /></NuxtLink></div></article>
        <dl class="release-facts"><div><dt><PackageOpen :size="15" /> 内容包</dt><dd>{{ homeData.pack.nameZh }}</dd><dd class="fact-note">{{ homeData.pack.version }}</dd></div><div><dt><ShieldCheck :size="15" /> 目录版本</dt><dd>{{ homeData.catalogVersion }}</dd><dd class="fact-note">{{ homeData.cardCount }} 张卡牌</dd></div><div><dt><Server :size="15" /> 客户端</dt><dd>v{{ runtime.public.appVersion }}</dd><dd class="fact-note">{{ runtime.public.assetMode==='hd'?'高清资源':'网页资源' }}</dd></div><div><dt><RadioTower :size="15" /> 服务器</dt><dd>{{ serverStatus?.status ?? '未连接' }}</dd><dd class="fact-note">{{ serverStatus?.protocolVersion ?? '等待连接' }}</dd></div></dl>
      </section>
    </main>
    <CardDetailModal :card="detailCard" @close="detailCard=null" />
  </div>
</template>

<style scoped>
.home-page{min-height:calc(100vh - var(--header-height))}.home-hero{position:relative;height:min(680px,calc(100vh - var(--header-height) - 92px));min-height:560px;overflow:hidden;border-bottom:1px solid var(--border-subtle);background:#0d1311}.hero-fronts{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr)}.hero-fronts img{width:100%;height:100%;object-fit:cover;filter:saturate(.72) contrast(1.05)}.hero-fronts img:nth-child(2){transform:scale(1.03)}.hero-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,7,.96) 0%,rgba(5,8,7,.75) 42%,rgba(5,8,7,.23) 70%,rgba(5,8,7,.76) 100%),linear-gradient(0deg,#0a0e0d 0%,transparent 48%)}.hero-character{position:absolute;z-index:1;right:max(24px,calc((100vw - 1440px)/2));bottom:-11%;width:min(330px,25vw);height:92%;object-fit:cover;object-position:center 16%;filter:saturate(.78) contrast(1.08);mask-image:linear-gradient(to bottom,#000 70%,transparent 98%)}.hero-copy{position:absolute;z-index:2;left:max(28px,calc((100vw - 1440px)/2));top:50%;width:min(680px,calc(100% - 56px));transform:translateY(-50%)}.hero-copy h1{margin:10px 0 8px;font-family:var(--font-display);font-size:72px;line-height:1;font-weight:800;letter-spacing:0;text-shadow:0 6px 30px #000}.hero-copy>p{margin:0 0 28px;color:#e1dbcf;font-family:var(--font-display);font-size:20px}.hero-actions{display:flex;flex-wrap:wrap;gap:9px}.hero-metrics{display:flex;gap:36px;margin-top:34px;padding-top:18px;border-top:1px solid rgba(255,255,255,.14)}.hero-metrics span{display:grid}.hero-metrics strong{font:700 25px var(--font-numeric);color:var(--color-gold)}.hero-metrics small{color:var(--color-text-muted);font-size:9px}.loadout-rail{position:absolute;z-index:3;right:max(28px,calc((100vw - 1440px)/2));bottom:26px;width:230px;display:grid;gap:4px;padding:13px 15px;border-left:3px solid var(--color-jade);background:rgba(10,15,13,.88)}.loadout-rail>span,.loadout-rail>small{color:var(--color-text-muted);font-size:9px}.loadout-rail .status-badge{margin-top:5px}.home-content{width:min(var(--content-max),100%);margin:0 auto;padding:0 28px 64px}.mode-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border-subtle);border-left:1px solid var(--border-subtle)}.mode-grid>a{min-height:104px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:18px;border-right:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);background:var(--color-surface-primary)}.mode-grid>a:hover{background:var(--color-surface-secondary)}.mode-grid>a>svg:first-child{color:var(--color-copper)}.mode-grid .tone-jade>svg:first-child{color:var(--color-jade)}.mode-grid .tone-blue>svg:first-child{color:var(--color-info)}.mode-grid .tone-gold>svg:first-child{color:var(--color-gold)}.mode-grid .tone-cinnabar>svg:first-child{color:var(--color-cinnabar)}.mode-grid span{display:grid;gap:4px}.mode-grid small{color:var(--color-text-muted);font-size:10px}.recent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.recent-grid article{min-width:0;padding:16px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.recent-grid article.胜利{box-shadow:inset 0 3px var(--color-success)}.recent-grid article.失败{box-shadow:inset 0 3px var(--color-danger)}.recent-grid header{display:flex;align-items:center;justify-content:space-between;gap:10px}.recent-grid header>span{display:flex;align-items:center;gap:4px;color:var(--color-text-muted);font-size:9px}.recent-grid h3{margin:14px 0 3px;font-family:var(--font-display)}.recent-grid p{margin:0;color:var(--color-text-muted);font-size:10px}.recent-fronts{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:13px 0}.recent-fronts span{min-width:0;display:grid;padding:6px;border:1px solid var(--border-subtle)}.recent-fronts b{overflow:hidden;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.recent-fronts small{color:var(--color-gold);font:700 13px var(--font-numeric)}.recent-grid article>a,.featured-front a{display:inline-flex;align-items:center;gap:5px;color:var(--color-info);font-size:10px}.content-band{display:grid;grid-template-columns:1.25fr 1fr .7fr;gap:22px;padding-top:2px}.featured-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.featured-cards button{position:relative;min-width:0;aspect-ratio:5/7;overflow:hidden;padding:0;border:1px solid var(--border-subtle);background:#141917;cursor:pointer}.featured-cards img{width:100%;height:100%;object-fit:cover}.featured-cards span{position:absolute;left:0;right:0;bottom:0;display:grid;padding:28px 8px 8px;background:linear-gradient(transparent,rgba(5,8,7,.95))}.featured-cards small{color:var(--color-text-muted);font-size:8px}.featured-front{display:grid;grid-template-columns:44% 1fr;min-height:210px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.featured-front>img{width:100%;height:100%;object-fit:cover}.featured-front>div{align-self:center;padding:16px}.featured-front h3{margin:5px 0;font-family:var(--font-display)}.featured-front p{margin:0 0 13px;color:var(--color-text-muted);font-size:10px;line-height:1.6}.release-facts{margin:0;border-top:1px solid var(--border-subtle)}.release-facts>div{display:grid;grid-template-columns:1fr auto;gap:3px;padding:10px 0;border-bottom:1px solid var(--border-subtle)}.release-facts dt{display:flex;align-items:center;gap:6px;color:var(--color-text-muted);font-size:9px}.release-facts dd{margin:0;font:700 11px var(--font-numeric)}.release-facts small{grid-column:1/-1;color:var(--color-text-muted);font-size:8px}@media(max-width:1050px){.hero-character{opacity:.58;width:40vw}.mode-grid{grid-template-columns:repeat(2,1fr)}.recent-grid{grid-template-columns:1fr}.content-band{grid-template-columns:1fr 1fr}.release-facts{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}@media(max-width:720px){.home-hero{height:650px;min-height:650px}.hero-fronts{grid-template-columns:1fr}.hero-fronts img:not(:first-child){display:none}.hero-character{right:-36px;width:58vw;height:72%;opacity:.48}.hero-copy{top:auto;bottom:120px;transform:none}.hero-copy h1{font-size:50px}.hero-copy>p{font-size:16px}.hero-metrics{gap:24px;margin-top:22px}.loadout-rail{left:20px;right:auto;bottom:20px}.home-content{padding:0 14px 48px}.mode-grid{grid-template-columns:1fr}.content-band{grid-template-columns:1fr}.release-facts{grid-column:auto;grid-template-columns:1fr 1fr}.featured-front{min-height:180px}}@media(max-width:430px){.hero-actions .game-button{width:100%}.hero-copy{bottom:116px}.hero-metrics{justify-content:space-between;gap:10px}.hero-metrics strong{font-size:20px}.featured-cards{grid-template-columns:1fr 1fr}.release-facts{grid-template-columns:1fr}}
.release-facts .fact-note{grid-column:1/-1;color:var(--color-text-muted);font-size:8px}
</style>
