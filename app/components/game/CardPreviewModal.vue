<script setup lang="ts">


import type { Character } from "~/common/common";

const props = defineProps<{
  character: Character
}>()

const emit = defineEmits(["close"])

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close")
}

onMounted(() => {
  window.addEventListener("keydown", onKey)
})

onUnmounted(() => {
  window.removeEventListener("keydown", onKey)
})
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <img
          class="preview-image"
          :src="'cards/' + props.character.名字 + '.webp'"
          draggable="false"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-image {
  height: min(90vh, 900px);
  aspect-ratio: 2 / 3;
  border-radius: 16px;
  box-shadow: 0 40px 80px rgba(0,0,0,.8);
  animation: pop .15s ease-out;
}

@keyframes pop {
  from {
    transform: scale(.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
