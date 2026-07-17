<script setup lang="ts">
import { ArrowLeft, RefreshCw, Signal, WifiOff } from 'lucide-vue-next';
const router = useRouter();
const online = useOnlineClient();
watch(online.status, (status) => {
  if (status === 'lobby') router.replace('/lobby');
  else if (status === 'room' && online.room.value) router.replace(`/room/${online.room.value.roomId}`);
  else if (status === 'game') router.replace('/game?mode=online');
});
const retry = () => router.replace('/online');
</script>
<template><div class="page page-narrow"><div class="connection-state"><div class="signal-mark"><Signal v-if="online.status.value === 'reconnecting'" :size="42" /><WifiOff v-else :size="42" /></div><span class="eyebrow">连接恢复</span><h1>{{ online.status.value === 'reconnecting' ? '正在重建战区链路' : '连接未能恢复' }}</h1><p>{{ online.status.value === 'reconnecting' ? `第 ${online.reconnectAttempt.value} 次尝试，成功后会恢复大厅、房间或战局状态。` : online.error.value }}</p><LoadingSkeleton v-if="online.status.value === 'reconnecting'" :lines="2" /><div v-else class="button-row"><GameButton variant="ghost" to="/"><ArrowLeft :size="16" /> 返回总览</GameButton><GameButton variant="primary" @click="retry"><RefreshCw :size="16" /> 重新选择服务器</GameButton></div></div></div></template>
<style scoped>.connection-state{min-height:560px;display:grid;place-items:center;align-content:center;gap:10px;text-align:center}.signal-mark{width:84px;height:84px;display:grid;place-items:center;border:1px solid var(--border-strong);color:var(--color-gold)}.connection-state h1{margin:4px 0;font-family:var(--font-display);font-size:30px}.connection-state p{max-width:560px;margin:0 0 12px;color:var(--color-text-muted)}.connection-state .loading-skeleton{width:min(420px,100%)}</style>
