<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();

const servers = ref<any[]>([]);
const showConnectModal = ref(false);
const connectIP = ref("");
const connectPort = ref<number | null>(null);

let loaded = ref<boolean>(false);

function statusText(status: number) {
  switch(status) {
    case 0: return "空闲";
    case 1: return "轮抽中";
    case 2: return "模拟中";
    default: return "未知";
  }
}

function statusClass(status: number) {
  switch(status) {
    case 0: return "status-idle";
    case 1: return "status-drafting";
    case 2: return "status-simulating";
    default: return "";
  }
}

onMounted(async () => {
  try {
    const res = await axios.get("/api/servers");
    servers.value = res.data;
    loaded.value = true;
  } catch (e) {
    console.error(e);
  }
});

function openConnectModal(server?: any) {
  if (server) {
    connectIP.value = server.ip;
    connectPort.value = server.port;
  } else {
    connectIP.value = "";
    connectPort.value = 3001;
  }
  showConnectModal.value = true;
}

function connectToServer() {
  if (!connectIP.value || !connectPort.value) return alert("请输入服务器地址和端口");
  // TODO
  showConnectModal.value = false;
  joinServer(connectIP.value, connectPort.value);
}

function goToHomepage() {
  router.push('/');
}

function joinServer(addr: string, port: number) {

}
</script>

<template>
  <main class="container font-kai">
    <div class="game-header" @click="goToHomepage">
      <h1>战争轮抽模拟器</h1>
      <div class="subtitle">war-drafting-simulator</div>
    </div>

    <div class="header">
      <h1>公共服务器列表</h1>
    </div>

    <div class="server-list">
      <div v-if="loaded && servers.length" v-for="server in servers" :key="server._id" class="server-card">
        <h2>{{ server.title }}</h2>
        <p>服务器地址: {{ server.ip }} : {{ server.port }}</p>
        <p>所有者: {{ server.owner }}</p>
        <p>载入角色数量: {{ server.loadedCharacters }}</p>
        <p>在线人数: {{ server.onlinePlayers }}/2</p>
        <p>
          状态:
          <span :class="statusClass(server.status)">
            {{ statusText(server.status) }}
          </span>
        </p>
        <p class="buttons">
          <button class="btn-connect font-kai" @click="joinServer(server.ip, server.port)">连接</button>
        </p>
      </div>
      <div v-else-if="loaded">
        目前没有在线的公共服务器。您可以通过指定服务器地址连接未公开的服务器，或是创建服务器。
      </div>
      <div v-else>
        请求中...
      </div>
    </div>

    <button class="btn-connect font-kai" @click="openConnectModal(server)">连接至服务器</button>

    <!-- Connect Modal -->
    <div v-if="showConnectModal" class="modal-overlay" @click.self="showConnectModal = false">
      <div class="modal">
        <h2>连接至服务器</h2>
        <div class="input">
          <label>服务器地址：</label>
          <input v-model="connectIP" type="text" placeholder="10.0.10.10" class="font-kai" />
        </div>
        <div class="input">
          <label>服务器端口:</label>
          <input v-model.number="connectPort" type="number" placeholder="3001" class="font-kai" />
        </div>
        <div class="buttons">
          <button class="btn-connect font-kai" @click="connectToServer">连接</button>
          <button class="btn-connect btn-close font-kai" @click="showConnectModal = false">取消</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.input {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.input label {
  margin-right: 8px;
  white-space: nowrap;
}

.input input {
  width: 150px;
  padding: 4px 6px;
  box-sizing: border-box;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 2rem;
}

.game-header {
  cursor: pointer;
  align-self: flex-start;
  text-align: left;
}

.game-header h1 {
  font-size: 1.5rem;
}

.game-header .subtitle {
  font-size: .7rem;
  color: #cccccc;
}

.server-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.server-card {
  border: 2px solid #333;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  width: 250px;
  text-align: left;
  background-color: #fff;
  position: relative;
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
  border-radius: 6px;
}

.btn-connect:hover {
  background-color: #f0f0f0;
}

.status-idle {
  color: green;
  font-weight: bold;
}

.status-drafting {
  color: orange;
  font-weight: bold;
}

.status-simulating {
  color: red;
  font-weight: bold;
}

.modal input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.btn-close {
  background-color: #eee;
  border: 1px solid #ccc;
}
</style>
