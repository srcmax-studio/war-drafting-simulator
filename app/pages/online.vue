<script setup lang="ts">
import { ArrowLeft, LockKeyhole, PlugZap, RefreshCw, Server, Signal, UsersRound } from 'lucide-vue-next';

const router = useRouter();
const { settings, save } = useSettings();
const online = useOnlineClient();
const url = ref(settings.value.serverUrl);
const name = ref(settings.value.playerName);
const password = ref('');
const selectedServerId = ref('manual');
const statusLabels: Record<string, string> = { idle: '未连接', connecting: '连接中', authenticating: '认证中', reconnecting: '重连中', lobby: '已连接', room: '房间中', matchmaking: '匹配中', game: '对局中', error: '连接失败' };
const { data: listedServers, status: listingStatus, error: listingError, refresh } = await useFetch<Array<{ id: string; ip: string; port: number; title: string; owner: string; onlinePlayers: number; tls: boolean; requirePassword: boolean }>>('/api/servers', { default: () => [] });

watch(online.status, (next) => {
  if (next === 'lobby') router.push('/lobby');
  else if (next === 'room' && online.room.value) router.push(`/room/${online.room.value.roomId}`);
  else if (next === 'game') router.push('/game?mode=online');
  else if (next === 'reconnecting') router.push('/connection');
});

const selectServer = (server: NonNullable<typeof listedServers.value>[number]) => {
  selectedServerId.value = server.id;
  url.value = `${server.tls ? 'wss' : 'ws'}://${server.ip}:${server.port}`;
};
const connect = () => {
  settings.value.serverUrl = url.value;
  settings.value.playerName = name.value;
  save();
  online.connect({ url: url.value, name: name.value, password: password.value });
};
</script>

<template>
  <div class="page server-page">
    <header class="page-heading"><div><span class="eyebrow">服务器浏览</span><h1>进入在线战区</h1><p>连接只建立玩家会话。进入大厅后再创建房间、加入战局或开始快速匹配。</p></div><GameButton to="/play" variant="ghost"><ArrowLeft :size="17" /> 返回模式</GameButton></header>

    <div class="server-layout">
      <section class="server-list" aria-label="服务器列表">
        <SectionHeader title="可用服务器" description="显示真实发布记录，不填充虚构状态。"><IconButton label="刷新服务器" :disabled="listingStatus === 'pending'" @click="refresh()"><RefreshCw :size="17" /></IconButton></SectionHeader>
        <LoadingSkeleton v-if="listingStatus === 'pending'" :lines="4" height="68px" />
        <ErrorState v-else-if="listingError" message="无法读取服务器目录。" @retry="refresh()" />
        <div v-else-if="listedServers.length" class="server-rows">
          <button v-for="serverItem in listedServers" :key="serverItem.id" type="button" :class="{ selected: selectedServerId === serverItem.id }" @click="selectServer(serverItem)">
            <span class="server-icon"><Server :size="19" /></span><span class="server-copy"><strong>{{ serverItem.title }}</strong><small>{{ serverItem.owner }}</small></span><span class="server-meta"><span><UsersRound :size="13" /> {{ serverItem.onlinePlayers }}</span><span v-if="serverItem.requirePassword"><LockKeyhole :size="13" /> 密码</span><span><Signal :size="13" /> {{ serverItem.tls ? 'TLS' : '本地' }}</span></span>
          </button>
        </div>
        <EmptyState v-else title="没有已发布服务器" description="可以在右侧输入自建服务器地址。"><template #icon><Server :size="28" /></template></EmptyState>
      </section>

      <GamePanel title="连接会话" eyebrow="身份与地址">
        <template #actions><ServerStatusBadge :connected="online.status.value === 'lobby'" :label="statusLabels[online.status.value]" /></template>
        <form class="connection-form" @submit.prevent="connect">
          <label class="field"><span class="field-label">WebSocket 地址</span><input v-model.trim="url" class="input" autocomplete="url" placeholder="ws://127.0.0.1:3001"></label>
          <label class="field"><span class="field-label">玩家昵称</span><input v-model.trim="name" class="input" maxlength="24" autocomplete="nickname"></label>
          <label class="field"><span class="field-label">服务器密码</span><input v-model="password" class="input" type="password" maxlength="128" autocomplete="current-password" placeholder="公开服务器可留空"></label>
          <p v-if="online.error.value" class="connection-error" role="alert">{{ online.error.value }}</p>
          <GameButton variant="primary" size="large" type="submit" :loading="['connecting','authenticating'].includes(online.status.value)" :disabled="!url || !name"><PlugZap :size="18" /> 连接并进入大厅</GameButton>
        </form>
      </GamePanel>
    </div>
  </div>
</template>

<style scoped>
.server-layout{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:28px;align-items:start}.server-list{min-width:0}.server-rows{border-top:1px solid var(--border-subtle)}.server-rows button{width:100%;min-height:76px;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:12px;padding:12px;border:0;border-bottom:1px solid var(--border-subtle);background:transparent;color:inherit;text-align:left;cursor:pointer}.server-rows button:hover,.server-rows button.selected{background:var(--color-surface-secondary)}.server-rows button.selected{box-shadow:inset 3px 0 var(--color-copper)}.server-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--border-subtle);color:var(--color-gold)}.server-copy{display:grid;gap:3px}.server-copy small{color:var(--color-text-muted);font-size:10px}.server-meta{display:flex;gap:12px;color:var(--color-text-muted);font-size:10px}.server-meta span{display:inline-flex;align-items:center;gap:4px}.connection-form{display:grid;gap:16px}.connection-error{margin:0;padding:10px;border-left:3px solid var(--color-danger);background:rgba(207,91,82,.08);color:#ef8a82;font-size:11px}@media(max-width:900px){.server-layout{grid-template-columns:1fr}.server-layout>.game-panel{order:-1}}@media(max-width:560px){.server-rows button{grid-template-columns:38px 1fr}.server-meta{grid-column:2;flex-wrap:wrap}}
</style>
