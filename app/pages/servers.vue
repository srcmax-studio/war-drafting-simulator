<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { showError } from "~/plugins/toast";
import Spinner from "~/components/spinner.vue";
import { Client } from "~/client";
import { setupClient, useClient } from "~/composables/useClient";

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
}

const router = useRouter();

const servers = ref<any[]>([]);
const showConnectModal = ref(false);
const connectIP = ref("");
const connectPort = ref<number | null>(null);
const connectTLS = ref(true);

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
    currentServer = serverData;

    if (serverData.requirePassword) {
      showPasswordModal.value = true;
    } else {
      loading.value = false;
      currentServer = serverData;

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
        showNameModal.value = false;
        players.value = data.players;
        serverState.value = data.serverState;

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

    <div class="server-list">
      <div v-if="loaded && servers.length" v-for="server in servers" :key="server._id" class="server-card">
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
          <button class="btn-connect" @click="joinServer(server.ip, server.port, server.tls)" :disabled="!server.connectable">连接</button>
        </p>
      </div>

      <div v-else-if="loaded">
        目前没有在线的公共服务器。您可以通过指定服务器地址连接未公开的服务器，或是创建服务器。
      </div>
      <div v-else style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px;">
        <spinner />
        <div style="margin-top: 1rem">请求中...</div>
      </div>
    </div>

    <button class="btn-connect" @click="openConnectModal(server)">连接至服务器</button>

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

.btn-connect:hover {
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
</style>
