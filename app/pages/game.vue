<script setup lang="ts">
import GameBoard from "~/components/game/GameBoard.vue";
import SideBar from "~/components/game/SideBar.vue";
import ChatBox from "~/components/game/ChatBox.vue";

import { setupClient, useClient } from "~/composables/useClient";
import { useRouter } from "vue-router";
import { onMounted } from "vue";

const router = useRouter();

const { ws, client, players, serverState } = useClient();
onMounted(() => {
  setupClient();

  if (! client.value) {
    setTimeout(() => {
      router.push('/servers');
    }, 5000)
  }
});
</script>

<template>
  <div class="layout" v-if="client">
    <div class="game-board">
      <GameBoard :state="serverState" :players="players" :client="client" />
    </div>

    <div class="sidebar">
      <SideBar :state="serverState" :players="players" />
      <ChatBox :client="client" />
    </div>

    <div v-if="! client.connected" class="modal-overlay">
      <div class="modal">
        <div class="text-md">与服务器断开连接。</div>
        <p>代码 {{ client.disconnectEvent?.code }}。有关此次事件的详细信息见 <a href="https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code" target="_blank">https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code</a>。</p>
        <div class="buttons">
          <button class="btn" @click="router.push('/servers')">确定</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <h3>找不到有效服务器连接。</h3>
    <h4>将于 5 秒后返回服务器列表。</h4>
  </div>
</template>

<style scoped>
.layout {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 16px;

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
}
.game-board { grid-area: game-board; }
</style>
