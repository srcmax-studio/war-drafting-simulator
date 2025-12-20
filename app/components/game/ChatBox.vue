<script setup lang="ts">
import { ref, watch, nextTick, } from "vue";
import type { Client } from "~/client";
import { ChatMessageAction } from "~/action";

const props = defineProps<{
  client: Client
}>();

const text = ref("");
const messagesEl = ref<HTMLElement | null>(null);

function sendMessage(message) {
  if (!message.trim()) return;
  props.client.send(new ChatMessageAction(message));
}

watch(
    () => props.client.messages.length,
    async () => {
      await nextTick();
      messagesEl.value?.scrollTo({
        top: messagesEl.value.scrollHeight,
        behavior: "smooth"
      });
    }
);
</script>

<template>
  <div class="box chat-box bg-blur">
    <div class="messages" ref="messagesEl">
      <div v-for="(m, i) in client.messages" :key="i" class="msg">
        {{ m }}
      </div>
    </div>

    <div class="preset-buttons">
      <button @click="sendMessage('Hello!')" class="preset-btn">HI</button>
      <button @click="sendMessage('Good luck!')" class="preset-btn">GL</button>
      <button @click="sendMessage('Have fun!')" class="preset-btn">HF</button>
      <button @click="sendMessage('Good game!')" class="preset-btn">GG</button>
      <button @click="sendMessage('Well played!')" class="preset-btn">WP</button>
      <button @click="sendMessage('You too!')" class="preset-btn">U2</button>
    </div>

    <input
        v-model="text"
        class="input"
        placeholder="输入消息..."
        @keyup.enter="sendMessage(text); text = ''"
    />
  </div>
</template>

<style scoped>
.chat-box {
  padding: .5rem 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
  height: 100%;
  color: ghostwhite;
}

.messages {
  margin-bottom: 0.5rem;
  flex-grow: 1;
  overflow-y: auto;
}

.input {
  width: 100%;
  border: 1px solid #474646;
  border-radius: 4px;
  flex-shrink: 0;
  color: #ccc;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}

.preset-btn {
  padding: 0.3rem 0.5rem;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
}

.preset-btn:hover {
  background-color: #e0e0e0;
}
</style>
