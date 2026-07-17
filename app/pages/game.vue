<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const mode = computed(() => route.query.mode === 'online' ? 'online' : 'practice');
const local = useLocalGame();
const online = useOnlineClient();
const view = computed(() => mode.value === 'online' ? online.gameView.value : local.view.value);
const playerId = computed(() => mode.value === 'online' ? online.playerId.value : 'local-player');
const plan = computed(() => mode.value === 'online' ? online.plan.value : local.plan.value);
const error = computed(() => mode.value === 'online' ? online.error.value : local.error.value);
const finishing = ref(false);
const { settings } = useSettings();
const audio = useSceneAudio('battle');
let resultTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (!view.value) router.replace(mode.value === 'online' ? '/online' : '/play');
});
watch(() => view.value?.turn, (turn) => { if (turn === 6) void audio.playMusic('final-turn'); });
watch(() => view.value?.phase, (phase) => {
  if (phase !== 'ended' || !view.value || finishing.value) return;
  finishing.value = true;
  const delay = settings.value.reducedMotion || settings.value.animationSpeed === 'instant' ? 250 : 1_650;
  resultTimer = setTimeout(() => router.push(`/result/${view.value!.gameId}`), delay);
});
onBeforeUnmount(() => { if (resultTimer) clearTimeout(resultTimer); });
const deploy = (cardId: string, frontId: string) => mode.value === 'online' ? online.toggleDeployment(cardId, frontId) : local.toggleDeployment(cardId, frontId);
const reorder = (fromIndex: number, toIndex: number) => mode.value === 'online' ? online.reorderPlan(fromIndex, toIndex) : local.reorderPlan(fromIndex, toIndex);
const clear = () => mode.value === 'online' ? online.clearPlan() : local.clearPlan();
const lock = () => mode.value === 'online' ? online.lock() : local.lock();
const banner = () => mode.value === 'online' ? online.banner() : local.banner();
const retreat = () => mode.value === 'online' ? online.retreat() : local.retreat();
const rematch = () => {
  if (mode.value === 'online') online.rematch();
  else local.startPractice();
};
</script>

<template>
  <GameBoard v-if="view && playerId" :view="view" :player-id="playerId" :plan="plan" :error="error" @deploy="deploy" @reorder="reorder" @clear="clear" @lock="lock" @banner="banner" @retreat="retreat" @rematch="rematch" />
  <div v-else class="empty-state">正在恢复战局…</div>
  <Transition name="modal"><div v-if="finishing && view?.winner" class="battle-conclusion"><span>三线锁定</span><strong>{{ view.winner.winnerId === playerId ? '战局胜利' : view.winner.winnerId ? '战局失败' : '战局平局' }}</strong><small>正在整理战功与事件档案</small></div></Transition>
</template>

<style scoped>.battle-conclusion{position:fixed;z-index:110;inset:var(--header-height) 0 0;display:grid;place-items:center;align-content:center;gap:6px;background:rgba(5,8,7,.88);text-align:center}.battle-conclusion span{color:var(--color-copper);font-size:11px}.battle-conclusion strong{font-family:var(--font-display);font-size:44px;color:var(--color-gold)}.battle-conclusion small{color:var(--color-text-muted)}</style>
