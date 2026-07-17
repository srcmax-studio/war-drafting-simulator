<script setup lang="ts">
import { ArrowLeft, CheckCircle2, Clock3, Radar, ShieldCheck, Swords, XCircle } from 'lucide-vue-next';

const router = useRouter();
const online = useOnlineClient();
const { selectedDeck, decks, selectDeck } = useDecks();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 250); if (['idle','error'].includes(online.status.value)) router.replace('/online'); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
watch(online.gameView, (view) => { if (view) router.push('/game?mode=online'); });
const elapsed = computed(() => online.matchmaking.value.queuedAt ? Math.floor((now.value - online.matchmaking.value.queuedAt) / 1000) : 0);
const acceptSeconds = computed(() => online.matchmaking.value.acceptBy ? Math.max(0, Math.ceil((online.matchmaking.value.acceptBy - now.value) / 1000)) : 0);
const begin = () => { if (selectedDeck.value) online.joinMatchmaking(selectedDeck.value); };
</script>

<template>
  <div class="page page-narrow matchmaking-page">
    <header class="page-heading"><div><span class="eyebrow">快速匹配</span><h1>寻找同等战备对手</h1><p>当前版本使用基础队列；接口已为未来匹配分段保留字段。</p></div><GameButton to="/lobby" variant="ghost"><ArrowLeft :size="16" /> 返回大厅</GameButton></header>
    <div class="match-stage" :class="`state-${online.matchmaking.value.status}`">
      <div class="radar"><Radar :size="48" /><i /><i /><i /></div>
      <template v-if="online.matchmaking.value.status === 'idle'"><h2>整备完成后加入队列</h2><p>匹配成功会建立私密房间，并等待双方确认。</p><DeckSelector :model-value="selectedDeck?.deckId" :decks="decks" @update:model-value="selectDeck" /><GameButton variant="primary" size="large" :disabled="!selectedDeck" @click="begin"><Swords :size="18" /> 加入匹配</GameButton></template>
      <template v-else-if="online.matchmaking.value.status === 'queued'"><h2>正在搜索对手</h2><p>队列中 {{ online.matchmaking.value.queueSize }} 人</p><div class="match-timer"><Clock3 :size="20" /><strong>{{ elapsed }}</strong><span>秒</span></div><GameButton variant="danger" @click="online.leaveMatchmaking"><XCircle :size="17" /> 退出队列</GameButton></template>
      <template v-else><h2>已找到对手</h2><p>在倒计时结束前确认进入战局。</p><ProgressRing :value="acceptSeconds" :max="20" :size="74">{{ acceptSeconds }}</ProgressRing><div class="confirmation"><StatusBadge :tone="online.matchmaking.value.acceptedPlayerIds.includes(online.playerId.value) ? 'success' : 'warning'"><ShieldCheck :size="13" />{{ online.matchmaking.value.acceptedPlayerIds.includes(online.playerId.value) ? '已确认' : '等待你的确认' }}</StatusBadge></div><div class="button-row"><GameButton variant="danger" @click="online.declineMatch"><XCircle :size="17" /> 拒绝</GameButton><GameButton variant="primary" :disabled="online.matchmaking.value.acceptedPlayerIds.includes(online.playerId.value)" @click="online.acceptMatch"><CheckCircle2 :size="17" /> 接受匹配</GameButton></div></template>
    </div>
  </div>
</template>

<style scoped>
.match-stage{min-height:520px;display:grid;place-items:center;align-content:center;gap:16px;padding:38px;border:1px solid var(--border-subtle);background:var(--color-surface-primary);text-align:center}.match-stage h2{margin:0;font-family:var(--font-display);font-size:24px}.match-stage p{max-width:500px;margin:0;color:var(--color-text-muted)}.match-stage .deck-selector{width:min(420px,100%);text-align:left}.radar{position:relative;width:112px;height:112px;display:grid;place-items:center;color:var(--color-jade)}.radar i{position:absolute;inset:0;border:1px solid currentColor;border-radius:50%;opacity:.25;animation:pulse 2.4s ease-out infinite}.radar i:nth-child(2){animation-delay:.8s}.radar i:nth-child(3){animation-delay:1.6s}.match-timer{display:flex;align-items:baseline;gap:6px}.match-timer strong{font-family:var(--font-numeric);font-size:42px;color:var(--color-gold)}.match-timer span{color:var(--color-text-muted)}@keyframes pulse{0%{transform:scale(.45);opacity:.55}100%{transform:scale(1.15);opacity:0}}
</style>
