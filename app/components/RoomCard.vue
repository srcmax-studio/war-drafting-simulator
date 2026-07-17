<script setup lang="ts">
import { Clock3, LockKeyhole, UsersRound } from 'lucide-vue-next';
import type { RoomSummary } from '~/common/src/index';

const props = defineProps<{ room: RoomSummary; disabled?: boolean }>();
defineEmits<{ join: [room: RoomSummary] }>();
const joinable = computed(() => props.room.status === 'open' && props.room.players < props.room.maxPlayers);
</script>

<template>
  <article class="room-card">
    <div class="room-card-main"><div class="room-title"><LockKeyhole v-if="room.settings.passwordProtected" :size="14" /><strong>{{ room.name }}</strong></div><span>房主 {{ room.hostName }}</span><div class="tag-row"><StatusBadge :tone="joinable ? 'success' : 'warning'">{{ room.status === 'playing' ? '对局中' : joinable ? '可加入' : '整备中' }}</StatusBadge><span v-for="tag in room.settings.tags" :key="tag" class="tag">{{ tag }}</span></div></div>
    <dl class="room-card-stats"><div><dt><UsersRound :size="14" /> 玩家</dt><dd>{{ room.players }}/{{ room.maxPlayers }}</dd></div><div><dt><Clock3 :size="14" /> 回合</dt><dd>{{ Math.round(room.settings.turnDurationMs / 1000) }} 秒</dd></div></dl>
    <GameButton size="small" :disabled="disabled || !joinable" @click="$emit('join', room)">加入房间</GameButton>
  </article>
</template>
