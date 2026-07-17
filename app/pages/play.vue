<script setup lang="ts">
import { ArrowRight, Bot, CheckCircle2, Globe2, ShieldCheck, Sparkles, Swords, Wifi } from 'lucide-vue-next';
import { CARD_BY_ID } from '~/data/catalog';

const router = useRouter();
const { selectedDeck, decks, selectDeck } = useDecks();
const { startPractice } = useLocalGame();
const online = useOnlineClient();
const legalDeck = computed(() => selectedDeck.value?.cardIds.length === 12 && new Set(selectedDeck.value.cardIds).size === 12 && selectedDeck.value.cardIds.every((cardId) => Boolean(CARD_BY_ID[cardId])));
const totalPower = computed(() => selectedDeck.value?.cardIds.reduce((sum, cardId) => sum + (CARD_BY_ID[cardId]?.power ?? 0), 0) ?? 0);
const averageCost = computed(() => selectedDeck.value?.cardIds.length ? selectedDeck.value.cardIds.reduce((sum, cardId) => sum + (CARD_BY_ID[cardId]?.cost ?? 0), 0) / selectedDeck.value.cardIds.length : 0);
const begin = () => {
  if (!selectedDeck.value || !legalDeck.value) return;
  if (startPractice(selectedDeck.value)) router.push('/game?mode=practice');
};
</script>

<template>
  <div class="page play-page">
    <header class="page-heading"><div><span class="eyebrow">作战部署</span><h1>{{ $t('play.title') }}</h1><p>选择十二张牌组后进入六回合、三战线的 1v1 对局。</p></div><StatusBadge :tone="legalDeck?'success':'danger'"><CheckCircle2 :size="12" /> {{ legalDeck?'牌组合法':'牌组未就绪' }}</StatusBadge></header>

    <section class="loadout-bar">
      <div><span class="eyebrow">Active deck</span><DeckSelector :model-value="selectedDeck?.deckId" :decks="decks" @update:model-value="selectDeck" /></div>
      <dl><div><dt>卡牌</dt><dd>{{ selectedDeck?.cardIds.length ?? 0 }}/12</dd></div><div><dt>平均费用</dt><dd>{{ averageCost.toFixed(1) }}</dd></div><div><dt>基础战力</dt><dd>{{ totalPower }}</dd></div></dl>
      <GameButton to="/deck-builder" variant="ghost" size="small">调整牌组 <ArrowRight :size="14" /></GameButton>
    </section>
    <p v-if="!legalDeck" class="deck-error" role="alert">当前牌组必须包含十二张目录内的不同卡牌。</p>

    <div class="mode-select">
      <article class="practice-mode">
        <div class="mode-visual"><div class="mode-grid-lines" /><Bot :size="48" /><span>LOCAL / PRACTICE</span></div>
        <div class="mode-copy"><span class="eyebrow">单机演武</span><h2>{{ $t('play.practice') }}</h2><p>{{ $t('play.practiceDesc') }}</p><ul><li><ShieldCheck :size="14" /> 本地确定性规则</li><li><Sparkles :size="14" /> 完整动画与结算复盘</li><li><Swords :size="14" /> 六回合快速对局</li></ul><GameButton variant="primary" size="large" :disabled="!legalDeck" @click="begin">开始演武 <ArrowRight :size="17" /></GameButton></div>
      </article>
      <article class="online-mode">
        <div class="mode-visual"><div class="mode-grid-lines" /><Wifi :size="48" /><span>ONLINE / PVP</span></div>
        <div class="mode-copy"><span class="eyebrow">在线对战</span><h2>{{ $t('play.online') }}</h2><p>{{ $t('play.onlineDesc') }}</p><ul><li><Globe2 :size="14" /> 服务器大厅与在线用户</li><li><Wifi :size="14" /> 房间或快速匹配</li><li><ShieldCheck :size="14" /> 权威服务端与断线恢复</li></ul><ServerStatusBadge :connected="Boolean(online.serverStatus.value)" :latency="online.latency.value" /><GameButton to="/online" size="large">浏览服务器 <ArrowRight :size="17" /></GameButton></div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.play-page{max-width:1240px}.loadout-bar{min-height:92px;display:grid;grid-template-columns:minmax(280px,1fr) auto auto;align-items:center;gap:26px;padding:14px 18px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.loadout-bar>div:first-child{display:grid;gap:4px}.loadout-bar .deck-selector{max-width:440px}.loadout-bar dl{display:flex;gap:28px;margin:0}.loadout-bar dl div{display:grid;min-width:58px}.loadout-bar dt{color:var(--color-text-muted);font-size:9px}.loadout-bar dd{margin:2px 0 0;font:700 19px var(--font-numeric)}.deck-error{margin:8px 0 0;color:var(--color-danger);font-size:11px}.mode-select{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}.mode-select article{min-width:0;display:grid;grid-template-columns:42% 1fr;min-height:430px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.mode-visual{position:relative;overflow:hidden;display:grid;place-items:center;align-content:center;gap:14px;border-right:1px solid var(--border-subtle);background:#101714;color:var(--color-copper)}.online-mode .mode-visual{color:var(--color-jade)}.mode-visual>span{font:9px var(--font-numeric);color:var(--color-text-muted)}.mode-grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(221,185,100,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(221,185,100,.06) 1px,transparent 1px);background-size:28px 28px;transform:perspective(260px) rotateX(58deg) scale(1.5);transform-origin:bottom}.mode-visual>svg,.mode-visual>span{position:relative;z-index:1}.mode-copy{align-self:center;padding:26px}.mode-copy h2{margin:5px 0 8px;font-family:var(--font-display);font-size:25px}.mode-copy>p{min-height:72px;margin:0;color:var(--color-text-muted);line-height:1.7}.mode-copy ul{display:grid;gap:8px;margin:22px 0;padding:18px 0;border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);list-style:none}.mode-copy li{display:flex;align-items:center;gap:7px;color:var(--color-text-secondary);font-size:11px}.mode-copy li svg{color:var(--color-copper)}.online-mode li svg{color:var(--color-jade)}.mode-copy .server-status-badge{margin-bottom:12px}.mode-copy .game-button{width:100%}@media(max-width:980px){.mode-select{grid-template-columns:1fr}.mode-select article{min-height:330px}.loadout-bar{grid-template-columns:1fr auto}.loadout-bar dl{grid-row:2}.loadout-bar>.game-button{grid-row:2}}@media(max-width:620px){.loadout-bar{grid-template-columns:1fr}.loadout-bar dl{grid-row:auto;justify-content:space-between;gap:10px}.loadout-bar>.game-button{grid-row:auto}.mode-select article{grid-template-columns:1fr}.mode-visual{min-height:150px;border-right:0;border-bottom:1px solid var(--border-subtle)}.mode-copy>p{min-height:0}.mode-copy{padding:20px}}
</style>
