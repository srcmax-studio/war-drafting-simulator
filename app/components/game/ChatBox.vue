<script setup lang="ts">
import { ref } from "vue";
import type { Client } from "~/client";
import { ChatMessageAction } from "~/action";

const props = defineProps<{
  client: Client
}>();

const text = ref("");

function sendMessage() {
  if (!text.value.trim()) return;
  props.client.send(new ChatMessageAction(text.value));
  text.value = "";
}
</script>

<template>
  <div class="box chat-box">
    <div class="messages">
      <div v-for="(m, i) in client.messages" :key="i" class="msg">
        {{ m }}
      </div>
    </div>

    <input
        v-model="text"
        class="input"
        placeholder="输入消息..."
        @keyup.enter="sendMessage"
    />
  </div>
</template>

<style scoped>
.chat-box {
  padding: .5rem 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.messages {
  overflow-y: auto;
  margin-bottom: 0.5rem;
  flex-grow: 1;
}

.input {
  width: 100%;
  border: 1px solid #ccc;
}
</style>
