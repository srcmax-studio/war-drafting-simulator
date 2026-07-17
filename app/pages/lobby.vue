<script setup lang="ts">
import { DoorOpen, Filter, Plus, Search, Send, Swords, UsersRound, WifiOff } from 'lucide-vue-next';
import type { RoomSummary } from '~/common/src/index';

const router = useRouter();
const online = useOnlineClient();
const { selectedDeck, decks, selectDeck } = useDecks();
useSceneAudio('lobby');
const search = ref('');
const joinableOnly = ref(false);
const chatDraft = ref('');
const createOpen = ref(false);
const joinTarget = ref<RoomSummary | null>(null);
const joinPassword = ref('');
const roomForm = reactive({ name: '公开演武房', visibility: 'public', password: '', allowSpectators: false, turnDurationMs: 45_000, packIds: ['core'], tags: ['标准'], revealDecks: false });

const visibleRooms = computed(() => online.rooms.value.filter((room) => {
  const query = search.value.trim().toLocaleLowerCase();
  return (!joinableOnly.value || room.status === 'open' && room.players < room.maxPlayers)
    && (!query || `${room.name} ${room.hostName} ${room.settings.tags.join(' ')}`.toLocaleLowerCase().includes(query));
}));
const selfPresence = computed(() => online.presence.value.find((entry) => entry.playerId === online.playerId.value));

watch(online.room, (room) => { if (room && online.status.value === 'room') router.push(`/room/${room.roomId}`); });
watch(online.gameView, (view) => { if (view) router.push('/game?mode=online'); });
onMounted(() => {
  if (['idle', 'error'].includes(online.status.value)) router.replace('/online');
  else online.requestLobby();
});

const createRoom = () => {
  online.createRoom({ ...roomForm, visibility: roomForm.password ? 'private' : roomForm.visibility });
  createOpen.value = false;
};
const askJoin = (room: RoomSummary) => {
  if (room.settings.passwordProtected) { joinTarget.value = room; joinPassword.value = ''; }
  else online.joinRoom(room.roomId);
};
const confirmJoin = () => { if (joinTarget.value) online.joinRoom(joinTarget.value.roomId, joinPassword.value); joinTarget.value = null; };
const sendChat = () => { const content = chatDraft.value.trim(); if (!content) return; online.sendLobbyChat(content); chatDraft.value = ''; };
</script>

<template>
  <div class="page lobby-page">
    <header class="lobby-command">
      <div><span class="eyebrow">在线大厅</span><h1>{{ online.serverStatus.value?.title ?? '万世战线服务器' }}</h1><p>{{ online.serverStatus.value?.owner }} · 协议 {{ online.serverStatus.value?.protocolVersion }}</p></div>
      <div class="server-gauges"><ServerStatusBadge connected :latency="online.latency.value" /><StatusBadge tone="info"><UsersRound :size="13" /> {{ online.serverStatus.value?.connectedUsers ?? online.presence.value.length }} 在线</StatusBadge><StatusBadge tone="warning"><Swords :size="13" /> {{ online.serverStatus.value?.activeGames ?? 0 }} 对局</StatusBadge><GameButton variant="ghost" @click="online.disconnect(); router.push('/online')"><WifiOff :size="16" /> 断开</GameButton></div>
    </header>

    <div class="lobby-layout">
      <main class="room-browser">
        <SectionHeader title="房间战区" :description="`${visibleRooms.length} 个房间可见`"><GameButton variant="primary" @click="createOpen = true"><Plus :size="17" /> 创建房间</GameButton></SectionHeader>
        <div class="room-toolbar"><label class="search-field"><Search :size="16" /><input v-model="search" class="input" placeholder="搜索房间、房主或标签"></label><button class="filter-toggle" :class="{ active: joinableOnly }" type="button" @click="joinableOnly = !joinableOnly"><Filter :size="15" /> 仅可加入</button></div>
        <div v-if="visibleRooms.length" class="room-list"><RoomCard v-for="roomItem in visibleRooms" :key="roomItem.roomId" :room="roomItem" @join="askJoin" /></div>
        <EmptyState v-else title="暂时没有符合条件的房间" description="创建公开房间，或使用快速匹配寻找对手。"><template #icon><DoorOpen :size="30" /></template><GameButton @click="search='';joinableOnly=false">清除筛选</GameButton></EmptyState>
      </main>

      <aside class="lobby-sidebar">
        <GamePanel title="快速匹配" eyebrow="1 对 1">
          <div class="match-entry"><DeckSelector :model-value="selectedDeck?.deckId" :decks="decks" @update:model-value="selectDeck" /><p>系统会创建隔离房间，双方确认后开始。</p><GameButton to="/matchmaking" variant="primary"><Swords :size="17" /> 开始匹配</GameButton></div>
        </GamePanel>
        <GamePanel title="在线人员" eyebrow="状态">
          <div class="presence-list"><div v-for="person in online.presence.value.slice(0, 18)" :key="person.playerId"><PlayerAvatar :name="person.name" size="small" :status="person.status" /><span><strong>{{ person.name }}</strong><small>{{ person.status === 'lobby' ? '大厅' : person.status === 'room' ? '房间中' : person.status === 'game' ? '对局中' : '重连中' }}</small></span><StatusBadge v-if="person.playerId === selfPresence?.playerId" tone="info">你</StatusBadge></div></div>
        </GamePanel>
        <GamePanel title="大厅通信" eyebrow="最近消息">
          <div class="chat-box"><ol><li v-for="message in online.lobbyChat.value" :key="message.messageId" :class="{ system: message.kind === 'system' }"><strong>{{ message.senderName }}</strong><span>{{ message.content }}</span></li></ol><form @submit.prevent="sendChat"><input v-model="chatDraft" class="input" maxlength="300" placeholder="发送大厅消息"><IconButton label="发送" type="submit"><Send :size="16" /></IconButton></form></div>
        </GamePanel>
      </aside>
    </div>

    <Modal :open="createOpen" title="建立对战房间" @close="createOpen = false"><form id="create-room" class="room-form" @submit.prevent="createRoom"><label class="field"><span class="field-label">房间名</span><input v-model.trim="roomForm.name" class="input" maxlength="48"></label><label class="field"><span class="field-label">可选密码</span><input v-model="roomForm.password" class="input" type="password" maxlength="128" placeholder="留空即公开"></label><label class="field"><span class="field-label">每回合时间</span><select v-model.number="roomForm.turnDurationMs" class="select"><option :value="30000">30 秒</option><option :value="45000">45 秒</option><option :value="60000">60 秒</option><option :value="90000">90 秒</option></select></label><label class="toggle-row"><span>结算后公开双方牌组</span><button class="toggle" :class="{ on: roomForm.revealDecks }" type="button" role="switch" :aria-checked="roomForm.revealDecks" @click="roomForm.revealDecks=!roomForm.revealDecks" /></label></form><template #footer><GameButton variant="ghost" @click="createOpen=false">取消</GameButton><GameButton variant="primary" type="submit" form="create-room" :disabled="!roomForm.name">创建并进入</GameButton></template></Modal>
    <Modal :open="Boolean(joinTarget)" title="进入私密房间" width="small" @close="joinTarget=null"><label class="field"><span class="field-label">{{ joinTarget?.name }} 的密码</span><input v-model="joinPassword" class="input" type="password" autofocus @keyup.enter="confirmJoin"></label><template #footer><GameButton variant="ghost" @click="joinTarget=null">取消</GameButton><GameButton variant="primary" @click="confirmJoin">进入</GameButton></template></Modal>
  </div>
</template>

<style scoped>
.lobby-command{min-height:82px;display:flex;align-items:end;justify-content:space-between;gap:22px;padding-bottom:18px;border-bottom:1px solid var(--border-subtle)}.lobby-command h1{margin:3px 0;font-family:var(--font-display);font-size:26px}.lobby-command p{margin:0;color:var(--color-text-muted);font-size:10px}.server-gauges{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:8px}.lobby-layout{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:24px}.room-toolbar{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px}.filter-toggle{min-height:42px;display:flex;align-items:center;gap:7px;padding:0 12px;border:1px solid var(--border-subtle);background:var(--color-surface-primary);color:var(--color-text-muted);cursor:pointer}.filter-toggle.active{color:var(--color-gold);border-color:var(--border-strong)}.room-list{border-top:1px solid var(--border-subtle)}.lobby-sidebar{display:grid;align-content:start;gap:12px;padding-top:30px}.match-entry{display:grid;gap:12px}.match-entry p{margin:0;color:var(--color-text-muted);font-size:10px}.presence-list{max-height:260px;overflow:auto}.presence-list>div{min-height:44px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--border-subtle)}.presence-list>div>span{min-width:0;display:grid;gap:1px}.presence-list strong{font-size:11px}.presence-list small{color:var(--color-text-muted);font-size:9px}.presence-list .status-badge{margin-left:auto}.chat-box{display:grid;gap:10px}.chat-box ol{height:220px;margin:0;padding:0;overflow:auto;list-style:none}.chat-box li{display:grid;grid-template-columns:64px 1fr;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.035);font-size:10px}.chat-box li strong{color:var(--color-copper);overflow:hidden;text-overflow:ellipsis}.chat-box li.system strong{color:var(--color-info)}.chat-box li span{color:var(--color-text-secondary);overflow-wrap:anywhere}.chat-box form{display:grid;grid-template-columns:1fr 40px;gap:6px}.room-form{display:grid;gap:16px}@media(max-width:1040px){.lobby-layout{grid-template-columns:1fr}.lobby-sidebar{grid-template-columns:1fr 1fr;padding-top:0}.lobby-sidebar>.game-panel:last-child{grid-column:1/-1}}@media(max-width:720px){.lobby-command{align-items:start;flex-direction:column}.server-gauges{justify-content:flex-start}.lobby-sidebar{grid-template-columns:1fr}.lobby-sidebar>.game-panel:last-child{grid-column:1}.room-toolbar{grid-template-columns:1fr}.filter-toggle{justify-content:center}}
</style>
