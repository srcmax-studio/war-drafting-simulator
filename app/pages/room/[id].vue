<script setup lang="ts">
import { ArrowLeft, Check, Crown, Send, Settings2, ShieldCheck, Swords, UserMinus, UsersRound, X } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const online = useOnlineClient();
const { selectedDeck, decks, selectDeck } = useDecks();
useSceneAudio('room');
const chatDraft = ref('');
const settingsOpen = ref(false);
const settingsForm = reactive({ name: '', turnDurationMs: 45_000, revealDecks: false });
const room = computed(() => online.room.value?.roomId === route.params.id ? online.room.value : null);
const self = computed(() => room.value?.members.find((member) => member.playerId === online.playerId.value));
const isHost = computed(() => self.value?.role === 'host');

watch(online.gameView, (view) => { if (view) router.push('/game?mode=online'); });
watch(online.status, (status) => { if (status === 'lobby' && !online.room.value) router.push('/lobby'); });
onMounted(() => { if (!room.value) online.requestLobby(); });

const chooseDeck = (deckId: string) => { selectDeck(deckId); const deck = decks.value.find((entry) => entry.deckId === deckId); if (deck) online.selectDeck(deck); };
const toggleReady = () => online.setReady(!self.value?.ready);
const leave = () => online.leaveRoom();
const sendChat = () => { const content = chatDraft.value.trim(); if (!content) return; online.sendRoomChat(content); chatDraft.value = ''; };
const openSettings = () => { if (!room.value) return; settingsForm.name = room.value.name; settingsForm.turnDurationMs = room.value.settings.turnDurationMs; settingsForm.revealDecks = room.value.settings.revealDecks; settingsOpen.value = true; };
const saveSettings = () => { online.updateRoom({ ...settingsForm }); settingsOpen.value = false; };
</script>

<template>
  <div v-if="room" class="page room-page">
    <header class="page-heading"><div><span class="eyebrow">对战房间 · {{ room.settings.visibility === 'public' ? '公开' : '私密' }}</span><h1>{{ room.name }}</h1><p>双方只公开牌组名称与合法性。准备完成后由服务器建立独立对局。</p></div><div class="button-row"><GameButton v-if="isHost" variant="ghost" @click="openSettings"><Settings2 :size="16" /> 房间设置</GameButton><GameButton variant="ghost" @click="leave"><ArrowLeft :size="16" /> 离开</GameButton></div></header>

    <div class="room-layout">
      <main>
        <SectionHeader title="出战席位" :description="`每回合 ${Math.round(room.settings.turnDurationMs/1000)} 秒`"><StatusBadge :tone="room.status === 'ready' ? 'success' : 'warning'">{{ room.status === 'ready' ? '即将开始' : '整备中' }}</StatusBadge></SectionHeader>
        <div class="player-slots">
          <article v-for="slot in [0,1]" :key="slot" :class="{ empty: !room.members[slot] }">
            <template v-if="room.members[slot]"><PlayerAvatar :name="room.members[slot]!.name" size="large" :status="room.members[slot]!.connected ? 'room' : 'reconnecting'" /><div class="slot-copy"><span v-if="room.members[slot]!.role === 'host'" class="host-label"><Crown :size="13" /> 房主</span><h2>{{ room.members[slot]!.name }}</h2><p>{{ room.members[slot]!.deckName ?? '尚未选择牌组' }}</p><StatusBadge :tone="room.members[slot]!.ready ? 'success' : room.members[slot]!.deckValid ? 'warning' : 'neutral'"><Check v-if="room.members[slot]!.ready" :size="12" /><X v-else :size="12" />{{ room.members[slot]!.ready ? '已准备' : room.members[slot]!.deckValid ? '等待准备' : '等待牌组' }}</StatusBadge></div><IconButton v-if="isHost && room.members[slot]!.playerId !== online.playerId.value" label="移出玩家" @click="online.kickPlayer(room.members[slot]!.playerId)"><UserMinus :size="17" /></IconButton></template>
            <template v-else><UsersRound :size="28" /><strong>等待对手加入</strong><span>房间会实时出现在大厅列表</span></template>
          </article>
        </div>

        <GamePanel title="我的整备" eyebrow="牌组与状态">
          <div class="ready-controls"><DeckSelector :model-value="selectedDeck?.deckId" :decks="decks" :disabled="self?.ready" @update:model-value="chooseDeck" /><div class="deck-readiness"><ShieldCheck :size="20" /><span><strong>{{ self?.deckValid ? '牌组合法' : '等待选择' }}</strong><small>对手无法查看具体卡牌</small></span></div><GameButton :variant="self?.ready ? 'danger' : 'primary'" size="large" :disabled="!self?.deckValid" @click="toggleReady"><X v-if="self?.ready" :size="18" /><Swords v-else :size="18" />{{ self?.ready ? '取消准备' : '准备出战' }}</GameButton></div>
        </GamePanel>
      </main>

      <aside><GamePanel title="房间通信" eyebrow="仅本房间"><div class="room-chat"><ol><li v-for="message in room.chat" :key="message.messageId" :class="{ system: message.kind==='system' }"><time>{{ new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }}</time><strong>{{ message.senderName }}</strong><p>{{ message.content }}</p></li></ol><form @submit.prevent="sendChat"><input v-model="chatDraft" class="input" maxlength="300" placeholder="发送房间消息"><IconButton label="发送" type="submit"><Send :size="16" /></IconButton></form></div></GamePanel></aside>
    </div>

    <Modal :open="settingsOpen" title="房间设置" @close="settingsOpen=false"><form id="room-settings" class="settings-form" @submit.prevent="saveSettings"><label class="field"><span class="field-label">房间名</span><input v-model.trim="settingsForm.name" class="input" maxlength="48"></label><label class="field"><span class="field-label">每回合时间</span><select v-model.number="settingsForm.turnDurationMs" class="select"><option :value="30000">30 秒</option><option :value="45000">45 秒</option><option :value="60000">60 秒</option><option :value="90000">90 秒</option></select></label><label class="toggle-row"><span>结算后公开牌组</span><button class="toggle" :class="{on:settingsForm.revealDecks}" type="button" @click="settingsForm.revealDecks=!settingsForm.revealDecks" /></label></form><template #footer><GameButton variant="ghost" @click="settingsOpen=false">取消</GameButton><GameButton variant="primary" type="submit" form="room-settings">保存</GameButton></template></Modal>
  </div>
  <div v-else class="page page-narrow"><LoadingSkeleton :lines="5" height="54px" /></div>
</template>

<style scoped>
.room-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px}.room-layout>aside{padding-top:30px}.player-slots{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}.player-slots article{min-height:170px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;padding:20px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.player-slots article.empty{grid-template-columns:1fr;place-items:center;align-content:center;color:var(--color-text-muted);text-align:center;border-style:dashed}.player-slots article.empty span{font-size:10px}.slot-copy h2{margin:4px 0;font-family:var(--font-display);font-size:20px}.slot-copy p{margin:0 0 10px;color:var(--color-text-muted);font-size:10px}.host-label{display:inline-flex;align-items:center;gap:4px;color:var(--color-gold);font-size:9px}.ready-controls{display:grid;grid-template-columns:minmax(230px,1fr) auto auto;align-items:end;gap:18px}.deck-readiness{display:flex;align-items:center;gap:9px;padding-bottom:6px;color:var(--color-success)}.deck-readiness span{display:grid}.deck-readiness small{color:var(--color-text-muted);font-size:9px}.room-chat{display:grid;gap:10px}.room-chat ol{height:480px;margin:0;padding:0;overflow:auto;list-style:none}.room-chat li{display:grid;grid-template-columns:46px 1fr;gap:2px 7px;padding:8px 0;border-bottom:1px solid var(--border-subtle)}.room-chat time{grid-row:span 2;color:var(--color-text-muted);font-size:8px}.room-chat strong{font-size:10px}.room-chat p{margin:0;color:var(--color-text-secondary);font-size:10px;overflow-wrap:anywhere}.room-chat li.system strong{color:var(--color-info)}.room-chat form{display:grid;grid-template-columns:1fr 40px;gap:6px}.settings-form{display:grid;gap:16px}@media(max-width:980px){.room-layout{grid-template-columns:1fr}.room-layout>aside{padding-top:0}.room-chat ol{height:260px}}@media(max-width:700px){.player-slots{grid-template-columns:1fr}.ready-controls{grid-template-columns:1fr}.deck-readiness{padding:0}}
</style>
