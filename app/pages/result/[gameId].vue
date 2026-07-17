<script setup lang="ts">
import { ArrowLeft, Clipboard, Download, Flag, RotateCcw, Swords, Trash2, Trophy } from 'lucide-vue-next';
import type { BattlePlayerStats, BattleSummary, BattleTimelineEntry, GameEvent } from '~/common/src/index';
import { CARD_BY_ID, cardFallbackUrl, cardImageUrl } from '~/data/catalog';
import { frontArtUrl } from '~/data/front-art';
import { eventLabel } from '~/utils/ability-text';

const route = useRoute();
const router = useRouter();
const { history, remove } = useMatchHistory();
const online = useOnlineClient();
const local = useLocalGame();
const toast = useToast();
const confirmDelete = ref(false);
const rematchPending = ref(false);
const activeTab = ref<'overview'|'stats'|'turning'|'timeline'>('overview');
const entry = computed(() => history.value.find((item) => item.gameId === route.params.gameId));
const summary = computed<BattleSummary | null>(() => entry.value?.summary ?? (online.gameSummary.value?.gameId === route.params.gameId ? online.gameSummary.value : local.summary.value?.gameId === route.params.gameId ? local.summary.value : null));
const perspectiveId = computed(() => entry.value?.playerId ?? online.playerId.value ?? 'local-player');
const outcome = computed(() => !summary.value?.winner?.winnerId ? 'draw' : summary.value.winner.winnerId === perspectiveId.value ? 'victory' : 'defeat');
const self = computed(() => summary.value?.players.find((player) => player.playerId === perspectiveId.value));
const opponent = computed(() => summary.value?.players.find((player) => player.playerId !== perspectiveId.value));
const withdrawalPlayerId = computed(() => summary.value?.timeline.find((event) => event.type === 'player_withdrew')?.playerId);
const resultReason = computed(() => {
  if (summary.value?.winner?.reason === 'withdrawal') return withdrawalPlayerId.value === perspectiveId.value ? '我方撤军，战局提前结束' : '对手撤军，战局提前结束';
  if (summary.value?.winner?.reason === 'fronts') return '控制两条以上战线';
  if (summary.value?.winner?.reason === 'total_power') return '总战力决胜';
  return '双方未分胜负';
});
const statRows: Array<{ key: keyof BattlePlayerStats; label: string }> = [
  {key:'deployments',label:'部署卡牌'},{key:'ordersUsed',label:'使用军令'},{key:'unusedOrders',label:'未使用军令'},{key:'totalPower',label:'总战力'},{key:'highestSingleCardPower',label:'最高单卡'},{key:'powerGained',label:'增加战力'},{key:'powerReduced',label:'降低战力'},{key:'moves',label:'调遣次数'},{key:'deaths',label:'阵亡次数'},{key:'returns',label:'复归次数'},{key:'discards',label:'弃置次数'},{key:'generatedCards',label:'生成卡牌'},{key:'abilityTriggers',label:'技能触发'},{key:'bannerTurn',label:'举旗回合'},{key:'withdrawalTurn',label:'撤军回合'},{key:'controlChanges',label:'控制权变化'}
];
const statValue = (stats: BattlePlayerStats | undefined, key: keyof BattlePlayerStats) => {
  const value = stats?.[key];
  if (key === 'bannerTurn' || key === 'withdrawalTurn') return typeof value === 'number' ? `第 ${value} 回合` : '未发生';
  return value ?? 0;
};
const timelineLabel = (entry: BattleTimelineEntry) => eventLabel({ sequence: entry.sequence, turn: entry.turn, type: entry.type, playerId: entry.playerId, public: true, payload: {} } as GameEvent, entry.cardId ? CARD_BY_ID[entry.cardId]?.nameZh : undefined);

onMounted(() => {
  const scene = outcome.value === 'victory' ? 'victory' : outcome.value === 'defeat' ? 'defeat' : 'draw';
  void useAudioManager().playMusic(scene);
});
watch(() => online.gameView.value?.gameId, (gameId) => {
  if (entry.value?.mode === 'online' && gameId && gameId !== String(route.params.gameId)) router.push('/game?mode=online');
});

const copyId = async () => { await navigator.clipboard.writeText(String(route.params.gameId)); toast.push({tone:'success',title:'对局 ID 已复制'}); };
const exportJson = () => {
  if (!summary.value) return;
  const payload = { summary: summary.value, ...(entry.value?.serializedGame ? { serializedGame: entry.value.serializedGame } : {}) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}));
  const link = document.createElement('a'); link.href=url; link.download=`aeonfront-${summary.value.gameId}.json`; link.click(); URL.revokeObjectURL(url);
};
const rematch = () => {
  if (entry.value?.mode === 'online') {
    if (rematchPending.value) return;
    rematchPending.value = true;
    online.rematch();
  }
  else { local.startPractice(); router.push('/game?mode=practice'); }
};
const returnFromResult = () => {
  if (entry.value?.mode === 'online') { online.returnToLobby(); router.push('/lobby'); }
  else router.push('/');
};
const deleteEntry = () => { remove(String(route.params.gameId)); confirmDelete.value=false; router.push('/history'); };
</script>

<template>
  <div v-if="summary" class="result-page" :class="outcome">
    <header class="result-hero">
      <div class="result-insignia"><Trophy v-if="outcome==='victory'" :size="34" /><Flag v-else :size="34" /></div><span class="eyebrow">战局结算 · {{ summary.turns }} 回合</span><h1>{{ outcome==='victory'?'胜利':outcome==='defeat'?'失败':'平局' }}</h1><p>{{ resultReason }}</p>
      <div class="duel-line"><span><PlayerAvatar :name="self?.name ?? '玩家'" size="large" /><b>{{ self?.name }}</b><small>{{ self?.deckName }}</small></span><strong>{{ summary.winner?.totals[self?.playerId ?? ''] ?? 0 }} <i>:</i> {{ summary.winner?.totals[opponent?.playerId ?? ''] ?? 0 }}</strong><span><PlayerAvatar :name="opponent?.name ?? '对手'" size="large" /><b>{{ opponent?.name }}</b><small>{{ opponent?.deckName }}</small></span></div>
      <div class="result-actions"><GameButton variant="ghost" @click="returnFromResult"><ArrowLeft :size="16" /> {{ entry?.mode==='online'?'返回大厅':'返回总览' }}</GameButton><GameButton :to="`/replay/${summary.gameId}`"><Swords :size="16" /> 完整回放</GameButton><GameButton variant="primary" :disabled="rematchPending" @click="rematch"><RotateCcw :size="16" /> {{ rematchPending ? '等待对手' : '再来一局' }}</GameButton></div>
    </header>

    <main class="result-content">
      <nav class="result-tabs" aria-label="结算视图"><button v-for="tab in [{id:'overview',label:'总览'},{id:'stats',label:'统计'},{id:'turning',label:'关键人物与转折'},{id:'timeline',label:'时间轴'}]" :key="tab.id" :class="{active:activeTab===tab.id}" @click="activeTab=tab.id as typeof activeTab">{{ tab.label }}</button></nav>
      <section v-if="activeTab==='overview'">
        <SectionHeader title="三线终局" :description="`最终战功 ${summary.winner?.stake ?? 0} · ${Math.round(summary.durationMs/1000)} 秒`" />
        <div class="result-fronts"><article v-for="front in summary.fronts" :key="front.frontId" :class="{own:front.controlPlayerId===perspectiveId,enemy:front.controlPlayerId===opponent?.playerId,tied:!front.controlPlayerId}"><img :src="frontArtUrl(front.frontId)" :alt="`${front.nameZh}战线场景`"><div class="front-result-head"><span>{{ front.controlPlayerId===perspectiveId?'我方控制':front.controlPlayerId===opponent?.playerId?'敌方控制':'平分秋色' }}</span><h2>{{ front.nameZh }}</h2><p>{{ front.descriptionZh }}</p><strong>{{ front.powers[perspectiveId] ?? 0 }} <i>:</i> {{ front.powers[opponent?.playerId ?? ''] ?? 0 }}</strong></div><div class="final-armies"><div><span v-for="card in front.cards[perspectiveId] ?? []" :key="card.instanceId"><img :src="cardImageUrl(CARD_BY_ID[card.cardId]!)" :alt="card.nameZh" @error="CARD_BY_ID[card.cardId] && (($event.target as HTMLImageElement).src=cardFallbackUrl(CARD_BY_ID[card.cardId]!))"><b>{{ card.finalPower }}</b></span></div><div><span v-for="card in front.cards[opponent?.playerId ?? ''] ?? []" :key="card.instanceId"><img :src="cardImageUrl(CARD_BY_ID[card.cardId]!)" :alt="card.nameZh"><b>{{ card.finalPower }}</b></span></div></div></article></div>
      </section>
      <section v-else-if="activeTab==='stats'" class="stats-view"><SectionHeader title="战局统计" description="全部数值由权威事件序列计算。" /><div class="stats-table"><header><span>指标</span><strong>{{ self?.name }}</strong><strong>{{ opponent?.name }}</strong></header><div v-for="row in statRows" :key="row.key"><span>{{ row.label }}</span><b>{{ statValue(self?.stats,row.key) }}</b><b>{{ statValue(opponent?.stats,row.key) }}</b></div></div></section>
      <section v-else-if="activeTab==='turning'" class="turning-view"><SectionHeader title="关键人物" :description="summary.mvpAlgorithmZh" /><div class="highlight-grid"><article v-for="highlight in summary.highlights" :key="highlight.kind"><img :src="cardImageUrl(CARD_BY_ID[highlight.cardId]!)" :alt="highlight.nameZh"><div><span>{{ highlight.kind==='mvp'?'本场主将':highlight.kind==='highest_power'?'最高战力':highlight.kind==='largest_contribution'?'最大贡献':highlight.kind==='most_triggers'?'最多触发':highlight.kind==='largest_swing'?'最大逆转':'关键阵亡' }}</span><h3>{{ highlight.nameZh }}</h3><strong>{{ highlight.value }}</strong><p>{{ highlight.rationaleZh }}</p></div></article></div><SectionHeader title="战局转折" /><ol class="turning-list"><li v-for="point in summary.turningPoints" :key="`${point.sequence}-${point.kind}`"><time>第 {{ point.turn }} 回合</time><span><strong>{{ point.titleZh }}</strong><small>{{ point.detailZh }}</small></span><b>{{ point.magnitude }}</b></li></ol></section>
      <section v-else class="timeline-view"><SectionHeader title="完整时间轴" description="选择节点可进入回放对应序列。" /><ol><li v-for="event in summary.timeline" :key="event.sequence"><time>R{{ event.turn }} · #{{ event.sequence }}</time><span>{{ timelineLabel(event) }}</span><NuxtLink :to="`/replay/${summary.gameId}?sequence=${event.sequence}`">查看</NuxtLink></li></ol></section>
      <footer class="result-tools"><GameButton variant="ghost" @click="copyId"><Clipboard :size="15" /> 复制对局 ID</GameButton><GameButton variant="ghost" @click="exportJson"><Download :size="15" /> 导出 JSON</GameButton><GameButton variant="danger" @click="confirmDelete=true"><Trash2 :size="15" /> 删除记录</GameButton></footer>
    </main>
    <ConfirmDialog :open="confirmDelete" title="删除这场对局" message="本地结算与完整回放都会被删除。" confirm-label="删除" danger @cancel="confirmDelete=false" @confirm="deleteEntry" />
  </div>
  <div v-else class="page page-narrow"><ErrorState message="找不到这场对局的完整结算数据。" @retry="router.push('/history')" /></div>
</template>

<style scoped>
.result-page{min-height:calc(100vh - var(--header-height));background:#090d0c}.result-hero{min-height:430px;display:grid;place-items:center;align-content:center;gap:6px;padding:38px 20px;border-bottom:1px solid var(--border-subtle);background-image:linear-gradient(rgba(8,12,10,.66),rgba(8,12,10,.95)),url('/assets/fronts/hidden.webp');background-size:cover;background-position:center;text-align:center}.result-insignia{width:68px;height:68px;display:grid;place-items:center;border:1px solid var(--border-strong);color:var(--color-gold)}.result-hero h1{margin:0;font-family:var(--font-display);font-size:48px}.result-page.defeat .result-hero h1{color:#e17a72}.result-page.victory .result-hero h1{color:#e9c774}.result-hero>p{margin:0;color:var(--color-text-secondary)}.duel-line{width:min(720px,100%);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:28px;margin:22px 0}.duel-line>span{display:grid;place-items:center;gap:4px}.duel-line>span small{color:var(--color-text-muted);font-size:9px}.duel-line>strong{font-family:var(--font-numeric);font-size:30px}.duel-line i{color:var(--color-copper);font-style:normal}.result-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.result-content{width:min(var(--content-max),100%);margin:0 auto;padding:0 28px 60px}.result-tabs{position:sticky;z-index:10;top:var(--header-height);display:flex;overflow:auto;border-bottom:1px solid var(--border-subtle);background:rgba(10,14,13,.96)}.result-tabs button{min-height:52px;padding:0 18px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--color-text-muted);white-space:nowrap;cursor:pointer}.result-tabs button.active{border-bottom-color:var(--color-copper);color:var(--color-gold)}.result-fronts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.result-fronts article{position:relative;min-height:470px;overflow:hidden;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.result-fronts article.own{box-shadow:inset 0 3px var(--color-front-own)}.result-fronts article.enemy{box-shadow:inset 0 3px var(--color-front-enemy)}.result-fronts article.tied{box-shadow:inset 0 3px var(--color-front-tied)}.result-fronts>article>img{width:100%;height:210px;object-fit:cover}.front-result-head{padding:14px}.front-result-head>span{color:var(--color-text-muted);font-size:9px}.front-result-head h2{margin:4px 0;font-family:var(--font-display)}.front-result-head p{min-height:42px;margin:0;color:var(--color-text-muted);font-size:10px}.front-result-head>strong{display:block;margin-top:10px;font-family:var(--font-numeric);font-size:25px}.front-result-head i{color:var(--color-copper);font-style:normal}.final-armies{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px 14px}.final-armies>div{display:flex;flex-wrap:wrap;gap:4px}.final-armies span{position:relative;width:42px;aspect-ratio:5/7;overflow:hidden;border:1px solid var(--border-subtle)}.final-armies img{width:100%;height:100%;object-fit:cover}.final-armies b{position:absolute;right:1px;top:1px;width:17px;height:17px;display:grid;place-items:center;border-radius:50%;background:var(--color-cinnabar);font-size:8px}.stats-table{border-top:1px solid var(--border-subtle)}.stats-table header,.stats-table>div{min-height:46px;display:grid;grid-template-columns:1fr 180px 180px;align-items:center;border-bottom:1px solid var(--border-subtle)}.stats-table header{color:var(--color-text-muted);font-size:10px}.stats-table>div b{font-family:var(--font-numeric);font-size:16px}.highlight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.highlight-grid article{min-height:160px;display:grid;grid-template-columns:100px 1fr;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.highlight-grid img{width:100%;height:100%;object-fit:cover}.highlight-grid article>div{padding:12px}.highlight-grid span{color:var(--color-copper);font-size:9px}.highlight-grid h3{margin:3px 0;font-family:var(--font-display)}.highlight-grid article strong{font-family:var(--font-numeric);font-size:22px;color:var(--color-gold)}.highlight-grid p{margin:5px 0 0;color:var(--color-text-muted);font-size:9px}.turning-list,.timeline-view ol{margin:0;padding:0;list-style:none;border-top:1px solid var(--border-subtle)}.turning-list li{min-height:64px;display:grid;grid-template-columns:100px 1fr 60px;align-items:center;gap:12px;border-bottom:1px solid var(--border-subtle)}.turning-list time{color:var(--color-copper);font-size:10px}.turning-list span{display:grid}.turning-list small{color:var(--color-text-muted)}.turning-list b{text-align:right;font-family:var(--font-numeric);font-size:18px}.timeline-view li{min-height:42px;display:grid;grid-template-columns:120px 1fr auto;align-items:center;border-bottom:1px solid var(--border-subtle);font-size:10px}.timeline-view time{color:var(--color-copper)}.timeline-view a{color:var(--color-info)}.result-tools{display:flex;justify-content:flex-end;gap:8px;margin-top:30px;padding-top:16px;border-top:1px solid var(--border-subtle)}@media(max-width:980px){.result-fronts{grid-template-columns:1fr}.result-fronts article{min-height:360px;display:grid;grid-template-columns:260px 1fr}.result-fronts>article>img{height:100%}.front-result-head{align-self:center}.final-armies{align-self:center}.highlight-grid{grid-template-columns:1fr 1fr}}@media(max-width:680px){.result-hero h1{font-size:38px}.duel-line{gap:10px}.duel-line>strong{font-size:22px}.result-content{padding:0 14px 44px}.result-fronts article{display:block}.result-fronts>article>img{height:180px}.highlight-grid{grid-template-columns:1fr}.stats-table header,.stats-table>div{grid-template-columns:1fr 80px 80px}.result-tools{flex-wrap:wrap}.turning-list li{grid-template-columns:76px 1fr}.turning-list b{display:none}}
.final-armies b{color:#fff}
</style>
