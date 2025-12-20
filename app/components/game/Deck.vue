<script setup lang="ts">
import { ref, computed } from "vue"
import Card from "~/components/game/Card.vue";
import type { Character } from "~/common/common";

const props = defineProps<{
  show: boolean
  characters: Character[]
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const searchQuery = ref("")
const selectedEra = ref("")

const eraColors: Record<string, string> = {
  "未来时代": "#ff4cff",
  "文艺复兴": "#c9a44c",
  "青铜时代": "#b87333",
  "中世纪": "#6b8e23",
  "神话时代": "#8b0000",
  "信息时代": "#00bfff",
  "古典时代": "#daa520",
  "现代": "#4aa3df",
  "工业革命": "#708090"
}

const filteredCharacters = computed(() => {
  return props.characters.filter(c => {
    const matchesName = c.名字.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesEra = selectedEra.value === "" || c.时代 === selectedEra.value
    return matchesName && matchesEra
  })
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="deck-modal-backdrop" @click.self="emit('close')">
      <div class="deck-modal">
        <div class="deck-modal-header">
          <div class="header-left">
            <h2>牌堆</h2>
            <div class="filter-bar">
              <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索名称..."
                  class="search-input"
              />
              <select
                  v-model="selectedEra"
                  class="era-select"
                  :style="{ color: eraColors[selectedEra] || '#aaa' }"
              >
                <option value="" style="color: #aaa">所有时代</option>
                <option
                    v-for="(color, era) in eraColors"
                    :key="era"
                    :value="era"
                    :style="{ color: color }"
                >
                  {{ era }}
                </option>
              </select>
            </div>
          </div>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="deck-grid">
          <div
              v-for="c in filteredCharacters"
              :key="c.id"
              class="deck-card-wrapper"
              :class="{ appeared: c.hasAppeared }"
          >
            <Card
                :character="c"
                :interactive="true"
                detailPlacement="center"
            />
          </div>
          <div v-if="filteredCharacters.length === 0" class="no-results">
            未找到匹配的角色
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.deck-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-modal {
  width: min(1400px, 92vw);
  height: min(90vh, 900px);
  background: #0f0f0f;
  border-radius: 16px;
  box-shadow: 0 40px 80px rgba(0,0,0,.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.deck-modal-header {
  flex: 0 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 1;
}

.filter-bar {
  display: flex;
  gap: 12px;
  max-width: 480px;
  flex: 1;
}

.search-input, .era-select {
  background: #1a1a1a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: #eee;
  font-size: 14px;
  outline: none;
}

.search-input {
  flex: 2;
}

.era-select {
  flex: 1;
  cursor: pointer;
}

.deck-modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.deck-grid {
  flex: 1;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.deck-card-wrapper {
  display: flex;
  justify-content: center;
  transition: opacity .15s ease, filter .15s ease;
}

.deck-card-wrapper.appeared {
  opacity: 0.45;
  filter: grayscale(30%);
}

.deck-card-wrapper :deep(.card) {
  width: 100%;
  max-width: 120px;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  color: #555;
  font-size: 15px;
}
</style>
