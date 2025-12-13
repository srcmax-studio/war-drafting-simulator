<script setup lang="ts">
import type { Client } from "~/client";

defineProps<{
  state: any,
  players: any[],
  client: Client
}>();
</script>

<template>
  <div class="game-board-inner">
    <pre>{{ state }}</pre>
  </div>
</template>

<style scoped>
.game-board-inner {
  width: 100%;
  height: 100%;
}
</style>
