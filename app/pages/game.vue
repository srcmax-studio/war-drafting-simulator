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

onMounted(() => {
  if (!view.value) router.replace(mode.value === 'online' ? '/online' : '/play');
});
const deploy = (cardId: string, frontId: string) => mode.value === 'online' ? online.toggleDeployment(cardId, frontId) : local.toggleDeployment(cardId, frontId);
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
  <GameBoard v-if="view && playerId" :view="view" :player-id="playerId" :plan="plan" :error="error" @deploy="deploy" @clear="clear" @lock="lock" @banner="banner" @retreat="retreat" @rematch="rematch" />
  <div v-else class="empty-state">正在恢复战局…</div>
</template>
