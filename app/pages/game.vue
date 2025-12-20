<script setup lang="ts">
import GameBoard from "~/components/game/GameBoard.vue";
import SideBar from "~/components/game/SideBar.vue";
import ChatBox from "~/components/game/ChatBox.vue";

import { setupClient, useClient } from "~/composables/useClient";
import { useRouter } from "vue-router";
import { onMounted } from "vue";
import { STATUS_SETUP, STATUS_SYNCED } from "~/client";
import { showError } from "~/plugins/toast";

const router = useRouter();

const { ws, client, players, serverState } = useClient();
onMounted(() => {
  setupClient();

  if (! client.value) {
    showError("已失去到服务器的连接。");
    router.push('/servers');
  }
});
</script>

<template>
  <div class="layout" v-if="client">
    <div class="game-board" v-if="client.status === STATUS_SYNCED">
      <GameBoard :state="serverState" :players="players" :client="client" />
    </div>

    <div class="center text-white" v-else>
      {{ client.status === STATUS_SETUP ? "正在同步角色数据..." : "正在初始化..." }}
    </div>

    <div class="sidebar">
      <SideBar :state="serverState" :players="players" />
      <ChatBox :client="client" />
    </div>

    <div v-if="! client.connected" class="modal-overlay">
      <div class="modal">
        <div class="text-md">与服务器断开连接。</div>
        <p>代码 {{ client.disconnectEvent?.code }}。有关此次事件的详细信息见 <a href="https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code" target="_blank">https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code</a>。</p>
        <p v-if="client.disconnectEvent?.reason">{{ client.disconnectEvent?.reason }}</p>
        <div class="buttons">
          <button class="btn" @click="router.push('/servers')">确定</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="center">
    <h3>找不到有效服务器连接。</h3>
  </div>
</template>

<style scoped>
.layout {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 16px;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);

  display: grid;
  grid:
    "game-board sidebar" 1fr
    / 1fr 300px;
  gap: 8px;
}

.sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}
.game-board { grid-area: game-board; }
</style>
