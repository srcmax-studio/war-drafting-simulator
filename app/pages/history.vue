<script setup lang="ts">
import { Clock3, Eye, History, Swords, Trash2, Trophy } from 'lucide-vue-next';
const { history, remove, clear } = useMatchHistory();
const confirmClear = ref(false);
const format = (timestamp: number) => new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
const outcome = (entry: (typeof history.value)[number]) => !entry.winner?.winnerId ? '平局' : entry.winner.winnerId === entry.playerId ? '胜利' : '失败';
</script>

<template>
  <div class="page">
    <header class="page-heading"><div><span class="eyebrow">战局档案</span><h1>对局历史</h1><p>完整结算、事件时间轴与回放保存在本地，不包含重连令牌或私人服务器信息。</p></div><GameButton variant="danger" :disabled="history.length===0" @click="confirmClear=true"><Trash2 :size="16" /> 清空记录</GameButton></header>
    <div v-if="history.length" class="history-grid">
      <article v-for="entry in history" :key="entry.gameId" :class="outcome(entry)">
        <div class="result-mark"><Trophy v-if="outcome(entry)==='胜利'" :size="24" /><Swords v-else :size="24" /><strong>{{ outcome(entry) }}</strong><span>战功 {{ entry.winner?.stake ?? 0 }}</span></div>
        <div class="history-copy"><span class="eyebrow">{{ entry.mode==='practice'?'演武':'在线' }}</span><h2>{{ entry.deckName }}</h2><p><Clock3 :size="13" /> {{ format(entry.timestamp) }} · {{ entry.summary?.turns ?? 0 }} 回合 · {{ Math.round((entry.summary?.durationMs ?? 0)/1000) }} 秒</p><div class="front-mini" v-if="entry.summary"><span v-for="front in entry.summary.fronts" :key="front.frontId">{{ front.nameZh }} {{ front.powers[entry.playerId] ?? 0 }}</span></div></div>
        <div class="history-actions"><GameButton :to="`/result/${entry.gameId}`" variant="primary"><Eye :size="16" /> 查看结算</GameButton><IconButton label="删除记录" @click="remove(entry.gameId)"><Trash2 :size="16" /></IconButton></div>
      </article>
    </div>
    <EmptyState v-else title="尚无对局记录" description="完成演武或在线对战后，结算与回放会出现在这里。"><template #icon><History :size="32" /></template><GameButton to="/play" variant="primary">开始对战</GameButton></EmptyState>
    <ConfirmDialog :open="confirmClear" title="清空全部战史" message="此操作会删除本地保存的结算与回放，无法撤销。" confirm-label="清空" danger @cancel="confirmClear=false" @confirm="clear();confirmClear=false" />
  </div>
</template>

<style scoped>
.history-grid{border-top:1px solid var(--border-subtle)}.history-grid article{min-height:138px;display:grid;grid-template-columns:120px 1fr auto;align-items:center;gap:22px;padding:16px 18px;border-bottom:1px solid var(--border-subtle);background:var(--color-surface-primary)}.history-grid article:hover{background:var(--color-surface-secondary)}.history-grid article.胜利{box-shadow:inset 3px 0 var(--color-success)}.history-grid article.失败{box-shadow:inset 3px 0 var(--color-danger)}.result-mark{display:grid;place-items:center;gap:3px;text-align:center;color:var(--color-gold)}.result-mark span{color:var(--color-text-muted);font-size:9px}.history-copy h2{margin:3px 0;font-family:var(--font-display);font-size:18px}.history-copy p{display:flex;align-items:center;gap:5px;margin:0;color:var(--color-text-muted);font-size:10px}.front-mini{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.front-mini span{padding:3px 6px;border:1px solid var(--border-subtle);font-size:9px}.history-actions{display:flex;gap:7px}@media(max-width:720px){.history-grid article{grid-template-columns:74px 1fr}.history-actions{grid-column:1/-1;justify-content:flex-end}.front-mini{display:none}}
</style>
