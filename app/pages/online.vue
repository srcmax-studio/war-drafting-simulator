<script setup lang="ts">
import { ArrowLeft, PlugZap, Wifi } from 'lucide-vue-next';
const router = useRouter();
const { settings } = useSettings();
const { selectedDeck, decks, selectDeck } = useDecks();
const { status, error, gameView, room, connect } = useOnlineClient();
const url = ref(settings.value.serverUrl);
const name = ref(settings.value.playerName);
const password = ref('');
const { data: listedServers, refresh: refreshServers } = await useFetch<Array<{ id: string; ip: string; port: number; title: string; owner: string; onlinePlayers: number; tls: boolean; requirePassword: boolean }>>('/api/servers', { default: () => [] });
watch(gameView, (view) => { if (view) router.push('/game?mode=online'); });
const join = () => {
  if (!selectedDeck.value || selectedDeck.value.cardIds.length !== 12) return;
  connect({ url: url.value, name: name.value, password: password.value, deck: selectedDeck.value });
};
</script>

<template>
  <div class="page page-narrow">
    <header class="page-heading"><div><span class="eyebrow">ONLINE MATCH</span><h1>在线战局</h1><p>连接采用 `aeonfront/1` 协议的权威服务器。</p></div><NuxtLink class="button" to="/play"><ArrowLeft :size="17" /> {{ $t('common.back') }}</NuxtLink></header>
    <section v-if="listedServers.length" class="listed-servers"><div class="section-title"><h2>公共服务器</h2><button class="button" type="button" @click="refreshServers()">刷新</button></div><button v-for="server in listedServers" :key="server.id" type="button" @click="url = `${server.tls ? 'wss' : 'ws'}://${server.ip}:${server.port}`"><span><strong>{{ server.title }}</strong><small>{{ server.owner }}</small></span><span>{{ server.onlinePlayers }}/2 · {{ server.requirePassword ? '需要密码' : '公开' }}</span></button></section>
    <section class="connection-form surface"><div class="surface-header"><strong><Wifi :size="18" /> 连接信息</strong><span :class="status">{{ status }}</span></div><div class="surface-body form-grid">
      <label class="field"><span class="field-label">WebSocket URL</span><input v-model="url" class="input" placeholder="ws://127.0.0.1:3001"></label>
      <label class="field"><span class="field-label">{{ $t('settings.player') }}</span><input v-model="name" class="input" maxlength="24"></label>
      <label class="field"><span class="field-label">密码（可选）</span><input v-model="password" class="input" type="password"></label>
      <label class="field"><span class="field-label">{{ $t('deck.preset') }}</span><select class="select" :value="selectedDeck?.deckId" @change="selectDeck(($event.target as HTMLSelectElement).value)"><option v-for="deck in decks" :key="deck.deckId" :value="deck.deckId">{{ deck.name }} · {{ deck.cardIds.length }}/12</option></select></label>
      <p v-if="error" class="danger form-error">{{ error }}</p>
      <button class="button primary connect-button" type="button" :disabled="status === 'connecting' || !url || !name || selectedDeck?.cardIds.length !== 12" @click="join"><PlugZap :size="18" /> {{ status === 'connecting' ? '连接中' : '连接并准备' }}</button>
    </div></section>
    <section v-if="room" class="room-preview"><h2>房间</h2><div v-for="player in room.players" :key="player.playerId"><strong>{{ player.name }}</strong><span>{{ player.connected ? '在线' : '重连中' }} · {{ player.deckSelected ? '牌组已确认' : '等待牌组' }} · {{ player.ready ? '已准备' : '未准备' }}</span></div></section>
  </div>
</template>

<style scoped>.listed-servers{margin-bottom:24px;border-top:1px solid var(--line)}.listed-servers>button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}.listed-servers>button:hover{background:var(--surface-2)}.listed-servers>button span:first-child{display:grid;gap:4px}.listed-servers small,.listed-servers>button>span:last-child{color:var(--muted);font-size:11px}.surface-header strong{display:flex;align-items:center;gap:8px}.surface-header>span{font-size:11px;color:var(--muted)}.surface-header>span.connected{color:#7bc1a2}.surface-header>span.error{color:#ef8a82}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-error{grid-column:1/-1;margin:0}.connect-button{grid-column:1/-1;justify-self:end}.room-preview{margin-top:28px;border-top:1px solid var(--line)}.room-preview>div{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)}.room-preview span{color:var(--muted);font-size:12px}@media(max-width:650px){.form-grid{grid-template-columns:1fr}.form-error,.connect-button{grid-column:1}.connect-button{justify-self:stretch}.room-preview>div{display:grid;gap:5px}}</style>
