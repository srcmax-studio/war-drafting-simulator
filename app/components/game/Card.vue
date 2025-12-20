<script setup lang="ts">
import CardDetails from "~/components/game/CardDetails.vue";


import type { Character } from "~/common/common";
import { HoverAction, UnhoverAction } from "~/action";
import { computed } from "vue";

const props = defineProps<{
  character: Character
  interactive?: boolean
  slot?: boolean
  detailDirection?: "default" | "top" | "bottom",
  client: Client
}>()

const HOVER_SCALE = 1.2
const HOVER_TRANSLATE_Y = -12

const showDetail = ref(false)
const detailStyle = ref<Record<string, string>>({})
const cardRef = ref<HTMLElement | null>(null)

const POPUP_WIDTH = 280
const EDGE_PADDING = 12

const opponentHovering = computed(() => {
  return props.client?.opponentHovering === props.character.名字;
});

const selected = computed(() => {
  return props.client?.selectedFromPack === props.character.名字;
});

async function onEnter() {
  if (!cardRef.value) return

  props.client?.send(new HoverAction(props.character.名字));

  const r = cardRef.value.getBoundingClientRect()

  const vw = window.innerWidth
  const vh = window.innerHeight

  const widthDiff = r.width * (HOVER_SCALE - 1)
  const heightDiff = r.height * (HOVER_SCALE - 1)

  let top = 0
  let left = 0

  const placement = props.detailDirection ?? "default"

  if (placement === "default") {
    top = r.top - heightDiff / 2 + HOVER_TRANSLATE_Y
    left = r.right + widthDiff / 2 + 16
  } else {
    left = r.left + r.width / 2 - POPUP_WIDTH / 2
    if (placement === "top") {
      top = r.top - 300 - 12
    } else { // bottom
      top = r.bottom + 12
    }
  }

  showDetail.value = true

  await nextTick()

  const detailElement = document.querySelector('.card-details')
  let POPUP_HEIGHT = 300

  if (detailElement) {
    POPUP_HEIGHT = detailElement.offsetHeight

    if (placement === "top") {
      top = r.top - POPUP_HEIGHT - 12
    }
  }

  if (left < EDGE_PADDING) {
    left = EDGE_PADDING
  }
  else if (left + POPUP_WIDTH > vw - EDGE_PADDING) {
    left = vw - POPUP_WIDTH - EDGE_PADDING
  }

  if (top < EDGE_PADDING) {
    top = EDGE_PADDING
  }
  else if (top + POPUP_HEIGHT > vh - EDGE_PADDING) {
    top = vh - POPUP_HEIGHT - EDGE_PADDING
  }

  detailStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    "--era-color": getEraColor(props.character.时代)
  }
}


function onLeave() {
  props.client?.send(new UnhoverAction());

  showDetail.value = false
}

function getEraColor(era: string) {
  return {
    "未来时代": "#ff4cff",
    "文艺复兴": "#c9a44c",
    "青铜时代": "#b87333",
    "中世纪": "#6b8e23",
    "神话时代": "#8b0000",
    "信息时代": "#00bfff",
    "古典时代": "#daa520",
    "现代": "#4aa3df",
    "工业革命": "#708090"
  }[era] || "#999"
}

const emit = defineEmits<{
  (e: "preview", character: Character): void
  (e: "hover", character: Character): void
  (e: "unhover", character: Character): void
}>()

function onRightClick(e: MouseEvent) {
  e.preventDefault()
  emit("preview", props.character)
}

</script>

<template>
  <div class="card-wrapper" @mouseenter="isHover = true" @mouseleave="isHover = false">
    <div
        ref="cardRef"
        class="card"
        :class="[interactive ? 'interactive' : '', character.时代, (slot ? 'slot' : 'draft'), selected ? 'selected' : '', opponentHovering ? 'is-opponent-hovering' : '' ]"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
        @contextmenu="onRightClick"
    >
      <div v-if="selected" class="selection-shimmer"></div>
      <div v-if="opponentHovering" class="opponent-indicator">
        <span class="dot"></span>
      </div>
      <img class="card-image" :src="'cards/' + character.名字 + '.webp'" draggable="false" />
      <div class="side left" v-if="!slot">{{ character.职业 }}</div>
      <div class="side right" v-if="!slot">{{ character.地理位置 }}</div>
      <div class="card-footer">
        <div :class="slot ? 'slot-name' : 'name'">{{ character.名字 }}</div>
        <div class="identity" v-if="!slot">{{ character.身份 }}</div>
      </div>
    </div>

    <Teleport to="body">
      <CardDetails
          v-if="showDetail"
          :character="character"
          :style="detailStyle"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.card-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: inline-block;
}

.card {
  position: relative;
  width: clamp(120px, 12vw, 200px);
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: #111;
  transition: transform .2s ease, box-shadow .2s ease, border .2s ease;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  cursor: pointer;
}

.card.draft {
  border: 4px solid transparent;
}

.card.slot {
  border: 2px solid transparent;
}

.card.interactive:hover {
  transform: scale(1.2) translateY(-12px);
  z-index: 20;
  box-shadow: 0 20px 40px rgba(0,0,0,.6);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.side {
  position: absolute;
  top: 12px;
  bottom: 12px;
  width: 18px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(255,255,255,.85);
}

.side.left { left: 4px; }
.side.right { right: 4px; }

.card-footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 8px 6px;
  background: linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,0));
  color: rgba(255,255,255,.85);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-footer .name {
  font-size: 14px;
  font-weight: bold;
}
.card-footer .slot-name {
  font-size: 10px;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 1px;
}
.card-footer .identity { font-size: 11px; opacity: .8; }

.card:hover {
  opacity: 1;
}

.card.未来时代      { border-color: #ff4cff; }
.card.文艺复兴      { border-color: #c9a44c; }
.card.青铜时代       { border-color: #b87333; }
.card.中世纪          { border-color: #6b8e23; }
.card.神话时代       { border-color: #8b0000; }
.card.信息时代       { border-color: #00bfff; }
.card.古典时代       { border-color: #daa520; }
.card.现代           { border-color: #4aa3df; }
.card.工业革命       { border-color: #708090; }

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 15px rgba(0,0,0,.3);
  pointer-events: none;
}

.card.selected {
  transform: translateY(-8px) scale(1.02);

  outline: #cccccc dashed;

  box-shadow:
      0 20px 30px rgba(0, 0, 0, 0.25),
      0 0 15px 2px var(--era-color);

  z-index: 10;
}

.selection-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
      105deg,
      transparent 20%,
      rgba(255, 255, 255, 0.2) 40%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0.2) 60%,
      transparent 80%
  );
  background-size: 200% 100%;
  animation: shimmer-sweep 2s infinite linear;
  pointer-events: none;
  z-index: 5;
}

@keyframes shimmer-sweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.card.selected.interactive:hover {
  transform: translateY(-15px) scale(1.2);
  box-shadow:
      0 30px 50px rgba(0, 0, 0, 0.3),
      0 0 20px 5px var(--era-color);
}
.card.is-opponent-hovering {
  --opponent-color: #ff4757;

  outline: 3px dashed var(--opponent-color);
  outline-offset: 4px;

  box-shadow: 0 0 15px rgba(255, 71, 87, 0.4);

  animation: opponent-pulse 1.5s infinite ease-in-out;
}

.card.is-selected.is-opponent-hovering {
  outline-style: solid;
  outline-color: var(--opponent-color);
}

.opponent-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.opponent-indicator .dot {
  display: block;
  width: 8px;
  height: 8px;
  background: #ff4757;
  border-radius: 50%;
  box-shadow: 0 0 10px #ff4757;
  animation: blink 0.8s infinite;
}

@keyframes opponent-pulse {
  0% { outline-offset: 2px; opacity: 0.9; }
  50% { outline-offset: 6px; opacity: 1; }
  100% { outline-offset: 2px; opacity: 0.9; }
}

@keyframes blink {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}
</style>
