<script setup lang="ts">
import { CheckCircle2, RotateCcw, Trash2, XCircle } from 'lucide-vue-next';
import { deserializeGame, verifyReplay, type GameState } from '~/common/src/index';
const { history, remove, clear } = useMatchHistory();
const { t } = useI18n();
const selectedId = ref('');
const selected = computed(() => history.value.find((entry) => entry.gameId === selectedId.value));
const state = computed<GameState | null>(() => {
  try { return selected.value ? deserializeGame(selected.value.serializedGame) : null; } catch { return null; }
});
const replayValid = computed(() => state.value ? verifyReplay(state.value) : false);
const format = (timestamp: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
const resultReason = (reason?: string) => reason ? t(`game.resultReasons.${reason}`) : '';
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">BATTLE RECORDS</span><h1>对局战史</h1><p>每条记录保存种子、牌组、回合输入、事件日志与最终状态，可重新计算确定性。</p></div><button class="button danger-button" type="button" :disabled="history.length === 0" @click="clear"><Trash2 :size="17" /> 清空</button></header>
    <div v-if="history.length" class="history-layout">
      <aside class="history-list"><button v-for="entry in history" :key="entry.gameId" type="button" :class="{ active: selectedId === entry.gameId }" @click="selectedId = entry.gameId"><strong>{{ entry.mode === 'practice' ? '演武' : '在线' }} · {{ entry.deckName }}</strong><span>{{ format(entry.timestamp) }}</span><small>{{ entry.winner?.winnerId === entry.playerId ? '胜利' : entry.winner?.winnerId ? '失败' : '平局' }} · 战功 {{ entry.winner?.stake }}</small></button></aside>
      <section v-if="selected && state" class="history-detail"><div class="history-head"><div><span class="front-code">{{ selected.gameId }}</span><h2>{{ selected.deckName }}</h2></div><button class="icon-button" type="button" aria-label="删除" @click="remove(selected.gameId); selectedId = ''"><Trash2 :size="17" /></button></div><div class="replay-check" :class="{ valid: replayValid }"><CheckCircle2 v-if="replayValid" :size="20" /><XCircle v-else :size="20" /><span>{{ replayValid ? '事件重放与最终状态完全一致' : '事件重放校验失败' }}</span></div><dl class="history-metrics"><div><dt>种子</dt><dd>{{ state.seed }}</dd></div><div><dt>回合</dt><dd>{{ state.turn }}/6</dd></div><div><dt>事件</dt><dd>{{ state.eventLog.length }}</dd></div><div><dt>结果</dt><dd>{{ resultReason(state.winner?.reason) }}</dd></div></dl><h3>最终战线</h3><div class="final-fronts"><article v-for="front in state.fronts" :key="front.definition.frontId"><strong>{{ front.definition.nameZh }}</strong><span v-for="player in state.players" :key="player.playerId">{{ player.name }} · {{ player.fronts[front.definition.frontId]?.reduce((sum,card)=>sum+card.currentPower,0) }}</span></article></div></section>
      <section v-else class="empty-state"><RotateCcw :size="28" /><span>选择一场对局查看重放校验</span></section>
    </div><div v-else class="empty-state">{{ $t('common.empty') }}</div>
  </div>
</template>
<style scoped>.history-layout{display:grid;grid-template-columns:320px 1fr;min-height:520px;border-top:1px solid var(--line)}.history-list{border-right:1px solid var(--line)}.history-list button{width:100%;display:grid;gap:5px;padding:14px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}.history-list button:hover,.history-list button.active{background:var(--surface-2)}.history-list button.active{border-left:3px solid var(--copper)}.history-list span,.history-list small{color:var(--muted);font-size:11px}.history-detail{padding:22px 28px}.history-head{display:flex;justify-content:space-between}.history-head h2{margin:5px 0}.front-code{color:var(--copper);font-size:10px}.replay-check{display:flex;align-items:center;gap:8px;margin:22px 0;padding:12px;border:1px solid #733d3d;color:#ef8a82}.replay-check.valid{border-color:#406b58;color:#7bc1a2}.history-metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:0;border:solid var(--line);border-width:1px 0}.history-metrics div{padding:13px;border-right:1px solid var(--line)}.history-metrics dt{color:var(--muted);font-size:10px}.history-metrics dd{margin:5px 0 0;font-weight:700}.final-fronts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.final-fronts article{display:grid;gap:6px;padding:12px;border:1px solid var(--line)}.final-fronts span{color:var(--muted);font-size:11px}@media(max-width:750px){.history-layout{grid-template-columns:1fr}.history-list{border-right:0}.history-detail{padding:18px 0}.history-metrics,.final-fronts{grid-template-columns:1fr 1fr}}</style>
