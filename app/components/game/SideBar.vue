<script setup lang="ts">
defineProps<{
  state: any,
  players: any[],
}>();
</script>

<template>
  <div class="game-header">
    <div class="text-lg text-bold">战争轮抽模拟器</div>
    <div class="subtitle">war-drafting-simulator</div>
  </div>

  <div class="box bg-blur">
    <h4>服务器信息</h4>
    <h5>名称：<span>{{ state.title }}</span></h5>
    <h5>所有者：<span>{{ state.owner }}</span></h5>
    <h5>载入角色数量：<span>{{ state.loadedCharacters }}</span></h5>
  </div>
</template>

<style scoped>
.game-header {
  cursor: default;
  align-self: center;
  text-align: center;
  color: white;
}

.game-header .subtitle {
  font-size: .7rem;
  color: #cccccc;
}

.box {
  color: ghostwhite;
}
</style>
