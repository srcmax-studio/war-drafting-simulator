<script setup lang="ts">
import { CheckCircle2, Radio, RotateCcw, Trash2, XCircle } from 'lucide-vue-next';
import { verifyReplay, type GameState } from '~/common/src/index';
import { restoreGameFromHistory } from '~/composables/useMatchHistory';
import { CARD_BY_ID } from '~/data/catalog';
import { eventLabel } from '~/utils/ability-text';

const { history, remove, clear } = useMatchHistory();
const { t } = useI18n();
const selectedId = ref('');
const selected = computed(() => history.value.find((entry) => entry.gameId === selectedId.value));
const state = computed<GameState | null>(() => {
  try { return selected.value?.serializedGame ? restoreGameFromHistory(selected.value.serializedGame) : null; } catch { return null; }
});
const replayValid = computed<boolean | null>(() => state.value ? verifyReplay(state.value) : null);
const events = computed(() => state.value?.eventLog ?? selected.value?.events ?? []);
const format = (timestamp: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
const resultReason = (reason?: string) => reason ? t(`game.resultReasons.${reason}`) : '';
const describeEvent = (event: (typeof events.value)[number]) => {
  const cardId = typeof event.payload.sourceCardId === 'string' ? event.payload.sourceCardId : typeof event.payload.cardId === 'string' ? event.payload.cardId : '';
  const card = CARD_BY_ID[cardId];
  const ability = card?.abilities?.find((item) => item.abilityId === event.payload.abilityId);
  return eventLabel(event, card?.nameZh, ability?.nameZh);
};
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">BATTLE RECORDS</span><h1>对局战史</h1><p>记录使用的自定义牌组、目录版本、公开事件和结果；本地演武同时保存可验证的完整确定性重放。</p></div><button class="button danger-button" type="button" :disabled="history.length === 0" @click="clear"><Trash2 :size="17" /> 清空</button></header>
    <div v-if="history.length" class="history-layout">
      <aside class="history-list"><button v-for="entry in history" :key="entry.gameId" type="button" :class="{ active: selectedId === entry.gameId }" @click="selectedId = entry.gameId"><strong>{{ entry.mode === 'practice' ? '演武' : '在线' }} · {{ entry.deckName }}</strong><span>{{ format(entry.timestamp) }}</span><small>{{ entry.winner?.winnerId === entry.playerId ? '胜利' : entry.winner?.winnerId ? '失败' : '平局' }} · 战功 {{ entry.winner?.stake }} · {{ entry.catalogVersion }}</small></button></aside>
      <section v-if="selected" class="history-detail">
        <div class="history-head"><div><span class="front-code">{{ selected.gameId }}</span><h2>{{ selected.deckName }}</h2><p>{{ selected.deckId }} · {{ selected.catalogVersion }}</p></div><button class="icon-button" type="button" aria-label="删除" @click="remove(selected.gameId); selectedId = ''"><Trash2 :size="17" /></button></div>
        <div class="replay-check" :class="{ valid: replayValid === true, public: replayValid === null }"><CheckCircle2 v-if="replayValid === true" :size="20" /><XCircle v-else-if="replayValid === false" :size="20" /><Radio v-else :size="20" /><span>{{ replayValid === true ? '事件重放与最终状态完全一致' : replayValid === false ? '事件重放校验失败' : '权威公开事件已保存；完整私有状态不在客户端重放' }}</span></div>
        <dl class="history-metrics"><div><dt>模式</dt><dd>{{ selected.mode === 'practice' ? '本地演武' : '在线对战' }}</dd></div><div><dt>回合</dt><dd>{{ state?.turn ?? events.at(-1)?.turn ?? 0 }}/6</dd></div><div><dt>事件</dt><dd>{{ events.length }}</dd></div><div><dt>结果</dt><dd>{{ resultReason(selected.winner?.reason) }}</dd></div></dl>
        <template v-if="state"><h3>最终战线</h3><div class="final-fronts"><article v-for="front in state.fronts" :key="front.definition.frontId"><strong>{{ front.definition.nameZh }}</strong><span v-for="player in state.players" :key="player.playerId">{{ player.name }} · {{ player.fronts[front.definition.frontId]?.reduce((sum,card)=>sum+card.currentPower,0) }}</span></article></div></template>
        <h3>事件记录</h3><ol class="history-events"><li v-for="event in events.slice(-30).reverse()" :key="event.sequence"><time>R{{ event.turn }} · #{{ event.sequence }}</time><span>{{ describeEvent(event) }}</span></li></ol>
      </section>
      <section v-else class="empty-state"><RotateCcw :size="28" /><span>选择一场对局查看牌组与重放信息</span></section>
    </div><div v-else class="empty-state">{{ $t('common.empty') }}</div>
  </div>
</template>

<style scoped>
.history-layout{display:grid;grid-template-columns:320px 1fr;min-height:520px;border-top:1px solid var(--line)}.history-list{border-right:1px solid var(--line)}.history-list button{width:100%;display:grid;gap:5px;padding:14px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}.history-list button:hover,.history-list button.active{background:var(--surface-2)}.history-list button.active{border-left:3px solid var(--copper)}.history-list span,.history-list small{color:var(--muted);font-size:11px}.history-detail{min-width:0;padding:22px 28px}.history-head{display:flex;justify-content:space-between}.history-head h2{margin:5px 0}.history-head p{margin:0;color:var(--muted);font-size:10px}.front-code{color:var(--copper);font-size:10px}.replay-check{display:flex;align-items:center;gap:8px;margin:22px 0;padding:12px;border:1px solid #733d3d;color:#ef8a82}.replay-check.valid{border-color:#406b58;color:#7bc1a2}.replay-check.public{border-color:#4b6865;color:#8cc8c0}.history-metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:0;border:solid var(--line);border-width:1px 0}.history-metrics div{padding:13px;border-right:1px solid var(--line)}.history-metrics dt{color:var(--muted);font-size:10px}.history-metrics dd{margin:5px 0 0;font-weight:700}.final-fronts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.final-fronts article{display:grid;gap:6px;padding:12px;border:1px solid var(--line)}.final-fronts span{color:var(--muted);font-size:11px}.history-events{max-height:320px;margin:0;padding:0;overflow:auto;list-style:none;border-top:1px solid var(--line)}.history-events li{display:grid;grid-template-columns:90px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:10px}.history-events time{color:var(--copper)}.history-events span{color:#c9cfcb}@media(max-width:750px){.history-layout{grid-template-columns:1fr}.history-list{border-right:0}.history-detail{padding:18px 0}.history-metrics,.final-fronts{grid-template-columns:1fr 1fr}}
</style>
