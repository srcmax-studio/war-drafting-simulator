<script setup lang="ts">
import type { ServerState } from "~/composables/useClient";
import type { Client } from "~/client";
import { PHASE_DRAFT, PHASE_LOBBY, PHASE_SIMULATING } from "~/common/common";

const props = defineProps<{
  server: ServerState,
  lastConnected?: boolean
}>();

defineEmits(['join']);

function statusText(status: number) {
  switch(status) {
    case 0: return "空闲";
    case 10: return "轮抽中";
    case 20: return "模拟中";
    default: return "未知";
  }
}

function statusClass(status: number) {
  switch(status) {
    case PHASE_LOBBY: return "status-idle";
    case PHASE_DRAFT: return "status-drafting";
    case PHASE_SIMULATING: return "status-simulating";
    default: return "";
  }
}
</script>

<template>
  <div class="server-card" :class="[lastConnected ? 'last-connected' : '']">
    <h2>{{ server.title }}</h2>
    <p>服务器地址: {{ server.ip }} : {{ server.port }}</p>
    <p>所有者: {{ server.owner }}</p>
    <p>载入角色数量: {{ server.loadedCharacters }}</p>
    <p v-if="server.scanning">连接中...</p>
    <p v-else-if="!server.connectable" style="color: red">
      无法连接至此服务器。
    </p>
    <template v-else>
      <p>在线人数: {{ server.onlinePlayers }}/2</p>
      <p>
        状态:
        <span :class="statusClass(server.status)">
            {{ statusText(server.status) }}
          </span>
      </p>
      <p>
          <span>
            <template v-if="server.requirePassword">
              🔒 受密码保护
            </template>
            <template v-else>
              ✅ 开放
            </template>
          </span>
      </p>
    </template>

    <p class="buttons">
      <button class="btn-connect" @click="$emit('join')" :disabled="!server.connectable">连接</button>
    </p>
  </div>
</template>

<style scoped>
.server-card {
  border: 2px solid #333;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  width: 250px;
  text-align: left;
  background-color: #fff;
  position: relative;
}

.last-connected {
  border-color: #007bff;
  background-color: #f8fbff;
}

.server-card h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.btn-connect {
  margin-top: 3rem;
  padding: 0.5rem 1rem;
  border: 2px solid #333;
  background-color: #fff;
  cursor: pointer;
  color: #333;
  border-radius: 6px;
}
</style>
