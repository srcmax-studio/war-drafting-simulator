<script setup lang="ts">
import { onMounted, ref } from "vue"

const props = defineProps<{
  pos: {
    key: string
    desc: string
    stats: string[]
  }
  anchor: HTMLElement
}>()

const style = ref<Record<string, string>>({})

onMounted(() => {
  const r = props.anchor.getBoundingClientRect()

  style.value = {
    top: `${r.top}px`,
    left: `${r.right + 12}px`
  }
})
</script>

<template>
  <div class="pos-info" :style="style">
    <h3>{{ pos.key }}</h3>
    <p>{{ pos.desc }}</p>
    <div class="stats">
      {{ pos.stats.join(" / ") }}
    </div>
  </div>
</template>

<style scoped>
.pos-info {
  position: fixed;
  width: 200px;
  background: #111;
  border-radius: 10px;
  padding: 12px;
  color: #eee;
  box-shadow: 0 20px 40px rgba(0,0,0,.6);
  font-size: 12px;
  z-index: 9999;
}

.pos-info h3 {
  margin: 0 0 4px;
  font-size: 14px;
}

.pos-info .stats {
  margin-top: 6px;
  opacity: .75;
}
</style>
