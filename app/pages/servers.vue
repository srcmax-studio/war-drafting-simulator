<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { showError } from "~/plugins/toast";
import Spinner from "~/components/spinner.vue";
import { Client } from "~/client";
import { setupClient, useClient } from "~/composables/useClient";
import ServerListing from "~/components/ServerListing.vue";

interface Server {
  ip: string;
  port: number;
  title: string;
  owner: string;
  loadedCharacters: number;
  status?: number;
  onlinePlayers?: number;
  requirePassword?: boolean;
  connectable?: boolean;
  scanning?: boolean;
  tls?: boolean;
}

const router = useRouter();

const servers = ref<any[]>([]);
const lastServer = ref<any>(null);
const showConnectModal = ref(false);
const connectIP = ref("");
const connectPort = ref<number | null>(null);
const connectTLS = ref(true);
const filterOnline = ref(false);

let loaded = ref<boolean>(false);

const displayServers = computed(() => {
  if (!filterOnline.value) return servers.value;
  return servers.value.filter(s => s.connectable);
});

async function loadServerList() {
  loaded.value = false;
  try {
    const res = await axios.get("/api/servers");
    servers.value = res.data.map((s: Server) => ({
      ...s,
      scanning: true,
      connectable: false
    }));

    for (const server of servers.value) {
      scanServer(server);
    }
    loaded.value = true;
  } catch (e) {
    showError("载入服务器列表时出错");
  }
}

onMounted(async () => {
  const saved = localStorage.getItem("last_connected_server");
  if (saved) {
    lastServer.value = JSON.parse(saved);
    lastServer.value.scanning = true;
    scanServer(lastServer.value);
  }

  loadServerList();
});

function openConnectModal(server?: any) {
  if (server) {
    connectIP.value = server.ip;
    connectPort.value = server.port;
  } else {
    connectIP.value = "";
    connectPort.value = 3001;
  }
  connectTLS.value = true;
  showConnectModal.value = true;
}

function connectToServer() {
  if (!connectIP.value || !connectPort.value) return showError("请输入服务器地址和端口");
  showConnectModal.value = false;
  joinServer(connectIP.value, connectPort.value, connectTLS.value);
}

function goToHomepage() {
  router.push('/');
}

const loading = ref(false);
const showPasswordModal = ref(false);
const passwordInput = ref("");
const showNameModal = ref(false);
const playerName = ref("");

let currentServer: any = null;
let { client, players, serverState } = useClient();
let ws = ref<WebSocket>(null);

async function joinServer(ip: string, port: number, tls: boolean = true) {
  currentServer = null;
  loading.value = true;

  try {
    client.value = new Client({ip, port, tls});
    ws.value = client.value.ws;

    const serverData: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        showError("连接超时");
        reject(new Error("连接超时"));
      }, 5000);

      ws.value!.onmessage = (event) => {
        clearTimeout(timeout);
        try {
          const data = JSON.parse(event.data);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };

      ws.value!.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };

      ws.value!.onclose = () => {
        clearTimeout(timeout);
      };
    });

    loading.value = false;
    currentServer = { ...serverData, ip, port, tls };

    if (serverData.requirePassword) {
      showPasswordModal.value = true;
    } else {
      showNameModal.value = true;
    }
  } catch (e: any) {
    loading.value = false;
    console.log(e)
    showError("连接服务器失败：" + (e.message ?? '未知错误'));
    if (ws.value) ws.value.close();
    ws.value = null;
  }
}

function submitName() {
  if (!currentServer || !ws.value) return;

  if (!playerName.value) return showError("请输入名字");

  ws.value.send(JSON.stringify({ action: "join", name: playerName.value }));
  ws.value.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === "joined") {
        localStorage.setItem("last_connected_server", JSON.stringify({
          ip: currentServer.ip,
          port: currentServer.port,
          tls: currentServer.tls,
          title: currentServer.title,
          owner: currentServer.owner
        }));

        showNameModal.value = false;
        players.value = data.players;
        serverState.value = data.serverState;
        client.value.playerName = data.playerName;

        router.push("/game");
      } else if (data.event === "error") {
        showError("加入失败：" + data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };
}

function submitPassword() {
  if (!currentServer) return;
  ws.value.send(JSON.stringify({ action: 'authenticate', password: passwordInput.value }))
  ws.value.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === "authenticated") {
        showPasswordModal.value = false;
        showNameModal.value = true;
      } else {
        showError(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };
}

async function scanServer(server: Server) {
  server.scanning = true;
  const wsUrl = (server.tls ? 'wss' : 'ws') + `://${server.ip}:${server.port}`;
  let ws: WebSocket | null = null;

  try {
    ws = new WebSocket(wsUrl);

    const serverData: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('连接超时')), 3000);

      ws!.onopen = () => ws!.send(JSON.stringify({ action: 'status' }));

      ws!.onmessage = (event) => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(event.data));
        } catch (err) {
          reject(err);
        } finally {
          ws?.close();
        }
      };

      ws!.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
      ws!.onclose = () => clearTimeout(timeout);
    });

    server.status = serverData.phase;
    server.title = serverData.title;
    server.owner = serverData.owner;
    server.onlinePlayers = serverData.onlinePlayers;
    server.requirePassword = serverData.requirePassword;
    server.connectable = true;
  } catch (err) {
    server.connectable = false;
  } finally {
    server.scanning = false;
  }
}
</script>

<template>
  <main class="container">
    <div class="game-header" @click="goToHomepage">
      <div class="text-lg text-bold">战争轮抽模拟器</div>
      <div class="subtitle">war-drafting-simulator</div>
    </div>

    <div class="header">
      <h1>公共服务器列表</h1>
    </div>

    <div v-if="lastServer" class="last-server-section">
      <h3 style="margin-bottom: 1rem;">最后连接的服务器</h3>
      <ServerListing :server="lastServer" last-connected @join="joinServer(lastServer.ip, lastServer.port, lastServer.tls)" />
      <hr style="width: 100%; margin: 2rem 0; border: 1px solid #eee;" />
    </div>

    <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 2rem;">
      <button class="btn-refresh" @click="loadServerList" :disabled="!loaded">刷新列表</button>
      <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
        <input type="checkbox" v-model="filterOnline" /> 仅显示在线
      </label>
    </div>

    <div class="server-list">
      <ServerListing
          :server="server"
          v-if="loaded && displayServers.length"
          v-for="server in displayServers"
          :key="server.ip + server.port"
          @join="joinServer(server.ip, server.port, server.tls)"
      />

      <div v-else-if="loaded">
        目前没有在线的公共服务器。您可以通过指定服务器地址连接未公开的服务器，或是创建服务器。
      </div>
      <div v-else style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px;">
        <spinner />
        <div style="margin-top: 1rem">请求中...</div>
      </div>
    </div>

    <button class="btn-connect" @click="openConnectModal()">连接至服务器</button>

    <div v-if="showConnectModal" class="modal-overlay" @click.self="showConnectModal = false">
      <div class="modal">
        <h2>连接至服务器</h2>
        <div class="input">
          <label>服务器地址：</label>
          <input v-model="connectIP" type="text" placeholder="10.0.10.10" />
        </div>
        <div class="input">
          <label>服务器端口:</label>
          <input v-model.number="connectPort" type="number" placeholder="3001" />
        </div>
        <div class="input">
          <label>TLS：</label>
          <input type="checkbox" v-model="connectTLS" />
        </div>
        <div class="buttons">
          <button class="btn-connect" @click="connectToServer">连接</button>
          <button class="btn-connect btn-close" @click="showConnectModal = false">取消</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="modal-overlay">
      <div class="modal">
        <h2>连接中...</h2>
        <p>正在连接服务器，请稍候</p>
      </div>
    </div>

    <div v-if="showNameModal" class="modal-overlay" @click.self="showNameModal = false">
      <div class="modal">
        <h2>请输入你的名称</h2>
        <div class="input">
          <input v-model="playerName" type="text" />
        </div>
        <div class="buttons">
          <button class="btn-connect" @click="submitName">确认</button>
          <button class="btn-connect btn-close" @click="showNameModal = false">取消</button>
        </div>
      </div>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal">
        <h2>此服务器受密码保护。</h2>
        <h3>请输入密码以加入此服务器。</h3>
        <div class="input">
          <input v-model="passwordInput" type="password" />
        </div>
        <div class="buttons">
          <button class="btn-connect" @click="submitPassword">确认</button>
          <button class="btn-connect btn-close" @click="showPasswordModal = false">取消</button>
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

.btn-refresh {
  padding: 0.5rem 1rem;
  border: 1px solid #333;
  background-color: #fff;
  cursor: pointer;
  border-radius: 6px;
}

.btn-connect:hover, .btn-refresh:hover {
  background-color: #f0f0f0;
}

button[disabled=disabled], button:disabled {
  color: #ccc;
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

.last-server-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
