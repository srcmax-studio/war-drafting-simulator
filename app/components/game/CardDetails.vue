<script setup lang="ts">


import type { Character } from "~/common/common";

defineProps<{
  character: Character
  style: Record<string, string>
}>()
</script>

<template>
  <div class="card-details" :style="style">
    <div class="header">
      <h2>{{ character.名字 }}</h2>
      <span class="era">{{ character.时代 }}</span>
    </div>

    <div class="meta">
      <span>{{ character.职业 }}</span>
      <span>{{ character.地理位置 }}</span>
    </div>

    <p class="desc">{{ character.描述 }}</p>

    <div class="skill">
      <h3>{{ character.技能.技能名 }}</h3>
      <p>{{ character.技能.技能描述 }}</p>
    </div>

    <div class="stats">
      <div v-for="(v, k) in character.能力值" :key="k">
        <label>{{ k }}</label>
        <div class="bar">
          <div class="fill" :style="{ width: v + '%' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-details {
  position: fixed;
  width: 280px;
  background: #111;
  border-radius: 12px;
  padding: 14px;
  color: #eee;
  border-left: 4px solid var(--era-color);
  box-shadow: 0 20px 40px rgba(0,0,0,.6);
  font-size: 13px;
  z-index: 9999;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  font-size: 16px;
  margin: 0;
}

.era {
  font-size: 12px;
  color: var(--era-color);
}

.meta {
  margin: 6px 0;
  opacity: .8;
  display: flex;
  gap: 8px;
}

.desc {
  margin: 8px 0;
  line-height: 1.4;
}

.skill h3 {
  font-size: 13px;
  margin-bottom: 2px;
  color: var(--era-color);
}

.stats {
  margin-top: 10px;
}

.stats > div {
  margin-bottom: 6px;
}

.bar {
  height: 6px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--era-color);
}
</style>
