<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MarkdownIt from 'markdown-it';
import type { HistoryEntry } from "~/client";

const md = new MarkdownIt({ breaks: true, linkify: true });
const history = ref<HistoryEntry[]>([]);
const selectedId = ref<string | null>(null);

onMounted(() => {
  const raw = localStorage.getItem('game_sim_history');
  if (raw) {
    history.value = JSON.parse(raw);
    if (history.value.length > 0) {
      selectedId.value = history.value[0].id;
    }
  }
});

const selectedEntry = computed(() =>
    history.value.find(e => e.id === selectedId.value)
);

const renderedContent = computed(() =>
    selectedEntry.value ? md.render(selectedEntry.value.stream) : ''
);

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

const deleteHistory = () => {
  if (confirm('确定清空所有记录吗？')) {
    localStorage.removeItem('game_sim_history');
    history.value = [];
    selectedId.value = null;
  }
};
</script>

<template>
  <div class="history-page">
    <aside class="history-sidebar">
      <div class="sidebar-header">
        <h2>模拟历史记录</h2>
        <button class="clear-btn" @click="deleteHistory" title="清空全部">🗑️</button>
      </div>

      <div class="history-list">
        <div
            v-for="item in history"
            :key="item.id"
            class="history-item"
            :class="{ active: selectedId === item.id }"
            @click="selectedId = item.id"
        >
          <div class="item-title">{{ item.title }}</div>
          <div class="item-time">{{ formatDate(item.timestamp) }}</div>
        </div>
        <div v-if="history.length === 0" class="empty-state">暂无模拟记录</div>
      </div>
    </aside>

    <main class="history-main">
      <template v-if="selectedEntry">
        <header class="main-header">
          <h1>{{ selectedEntry.title }}</h1>
          <time>{{ new Date(selectedEntry.timestamp).toLocaleString() }}</time>
        </header>

        <div class="content-container">
          <article class="markdown-body" v-html="renderedContent"></article>
          <div class="scanline"></div>
        </div>
      </template>

      <div v-else class="welcome-state">
        <div class="logo-placeholder">SIM</div>
        <p>请在左侧选择一个模拟记录进行回顾</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.history-page {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #0a0a0a;
  color: #eee;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

.history-sidebar {
  width: 320px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
}

.sidebar-header {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-header h2 {
  font-size: 1.2rem;
  letter-spacing: 2px;
  color: #00ff88;
  margin: 0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.history-item {
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.history-item.active {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.3);
}

.item-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #fff;
}

.item-time {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
}

.history-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: radial-gradient(circle at top right, #1a1a1a 0%, #0a0a0a 100%);
}

.main-header {
  padding: 40px 60px 20px;
}

.main-header h1 {
  font-size: 2rem;
  margin: 0 0 8px 0;
  color: #fff;
}

.main-header time {
  color: #00ff88;
  font-family: monospace;
  opacity: 0.8;
}

.content-container {
  flex: 1;
  margin: 20px 60px 40px;
  padding: 40px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  overflow-y: auto;
  position: relative;
}

.markdown-body :deep(p) { line-height: 1.8; margin-bottom: 1.2em; color: #ccc; }
.markdown-body :deep(strong) { color: #00ff88; }
.markdown-body :deep(h2) { color: #fff; border-left: 4px solid #00ff88; padding-left: 15px; margin-top: 2em; }

.scanline {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.02) 50%);
  background-size: 100% 4px; pointer-events: none;
}

.welcome-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.2);
}

.logo-placeholder {
  font-size: 5rem;
  font-weight: 900;
  letter-spacing: 10px;
  margin-bottom: 20px;
  opacity: 0.1;
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.clear-btn:hover { opacity: 1; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
</style>
