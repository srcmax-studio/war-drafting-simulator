<script setup lang="ts">
import { ref, watch, nextTick, } from "vue";
import type { Client } from "~/client";
import { ChatMessageAction } from "~/action";

const props = defineProps<{
  client: Client
}>();

const text = ref("");
const messagesEl = ref<HTMLElement | null>(null);

function sendMessage() {
  if (!text.value.trim()) return;
  props.client.send(new ChatMessageAction(text.value));
  text.value = "";
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
  <div class="box chat-box">
    <div class="messages" ref="messagesEl">
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
  overflow-y: hidden;
  height: 100%;
}

.messages {
  margin-bottom: 0.5rem;
  flex-grow: 1;
  overflow-y: auto;
}

.input {
  width: 100%;
  border: 1px solid #ccc;
  flex-shrink: 0;
}
</style>
