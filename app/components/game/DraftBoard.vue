<script setup lang="ts">
import { ref, onMounted, onUnmounted, useTemplateRef, computed } from "vue";
import type { Client } from "~/client";
import Card from "~/components/game/Card.vue";
import PositionInfo from "~/components/game/PositionInfo.vue";
import {
  type Character, DRAFT_STAGE_FINAL_CHANGES,
  DRAFT_STAGE_INIT,
  DRAFT_STAGE_PASSIVE,
  DRAFT_STAGE_PASSIVE_DISCARD, PHASE_DRAFT, PHASE_SIMULATING,
  POSITIONS
} from "~/common/common";
import {
  CardSelectAction,
  DecidePassiveDiscardAction,
  InitDiscardAction,
  ReadyAction,
  SelectAction,
  SwapPositionAction
} from "~/action";
import MarkdownIt from "markdown-it";

const props = defineProps<{
  client: Client,
  state: ServerState
}>();

const emit = defineEmits<{
  (e: 'preview', character: Character): void
}>();

const md = new MarkdownIt({
  breaks: true,
  linkify: true,
  html: true
});

const renderedStream = computed(() => {
  return md.render(props.client.stream || "");
});

const simContent = useTemplateRef('simContent');
watch(() => props.client.stream, async () => {
  await nextTick();
  if (simContent.value) {
    simContent.value.scrollTop = simContent.value.scrollHeight;
  }
});

const showPosInfo = ref([]);
const showPosInfoPlayer = ref([]);
const oppSlot = [];
const playerSlot = [];
const slotRefOpp = useTemplateRef('slotRefOpp');
const slotRefPlayer = useTemplateRef('slotRefPlayer');
const nowTrigger = ref(Date.now());
let timerInterval = null;

const draggingPos = ref<string | null>(null);
const dragOverPos = ref<string | null>(null);

const secondsLeft = computed(() => {
  const syncedNow = nowTrigger.value + props.client.serverClockOffset;
  const diff = props.client.actionEndTime - syncedNow;
  return Math.max(0, Math.ceil(diff / 1000));
});

const draftMessage = computed(() => {
  switch (props.client.draftStage) {
    case DRAFT_STAGE_PASSIVE_DISCARD:
      return props.client.hasInitiative() ? "等待对手决定是否行使后手弃牌权..." : "请决定是否行使后手弃牌权...";
    case DRAFT_STAGE_INIT:
      return props.client.hasInitiative() ? "请决定..." : "等待对手决定...";
    case DRAFT_STAGE_PASSIVE:
      return ! props.client.hasInitiative() ? "请决定..." : "等待对手决定...";
    case DRAFT_STAGE_FINAL_CHANGES:
      return "请在模拟前对构建的牌组进行最终调整..."
  }
});

onMounted(() => {
  timerInterval = setInterval(() => {
    nowTrigger.value = Date.now();
  }, 100);

  if (slotRefOpp.value && slotRefPlayer.value) {
    for (const pos of POSITIONS) {
      for (const slotOpp of slotRefOpp.value) {
        if (slotOpp.dataset.key === pos.key) {
          oppSlot[pos.key] = slotOpp;
        }
      }
      for (const slotPlayer of slotRefPlayer.value) {
        if (slotPlayer.dataset.key === pos.key) {
          playerSlot[pos.key] = slotPlayer;
        }
      }
    }
  }
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

const haveSelectedThisRound = computed((): boolean => {
  for (const character of props.client.pack) {
    if (character.名字 === props.client.selectedFromPack) {
      return true;
    }
  }
  return false;
});

const handleDecidePassiveDiscard = (discard: boolean) => {
  props.client.send(new DecidePassiveDiscardAction(discard));
};

const handleSelect = (character: Character) => {
  if ((props.client.draftStage === DRAFT_STAGE_INIT && props.client.hasInitiative()) ||
      (props.client.draftStage === DRAFT_STAGE_PASSIVE && ! props.client.hasInitiative())
  ) {
    props.client.send(new SelectAction(character.名字));
  }
};

const handleCardSelect = () => {
  props.client.send(new CardSelectAction(props.client.selectedFromPack));
}

const onDragStart = (e: DragEvent, posKey: string) => {
  if (!props.client.getPlayer() || !props.client.decks[props.client.getPlayer().name].slots.get(posKey)) {
    e.preventDefault();
    return;
  }
  draggingPos.value = posKey;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", posKey);
  }
};

const onDragOver = (e: DragEvent, posKey: string) => {
  e.preventDefault();
  dragOverPos.value = posKey;
};

const onDragLeave = () => {
  dragOverPos.value = null;
};

const onDrop = (e: DragEvent, targetPos: string) => {
  e.preventDefault();
  const sourcePos = draggingPos.value;
  draggingPos.value = null;
  dragOverPos.value = null;

  if (sourcePos && sourcePos !== targetPos) {
    props.client.send(new SwapPositionAction(sourcePos, targetPos));
  }
};

const handleReady = () => {
  props.client.send(new ReadyAction());
};
</script>

<template>
  <div class="draft-board-grid">
    <section class="row deck-area opponent small">
      <div class="deck-grid">
        <div
            v-for="pos in POSITIONS"
            :key="pos.key"
            :data-key="pos.key"
            ref="slotRefOpp"
            class="deck-slot"
            @mouseenter="showPosInfo[pos.key] = true"
            @mouseleave="showPosInfo[pos.key] = false"
        >
          <div class="slot-title">{{ pos.key }}</div>
          <div class="slot-card-wrapper" v-if="client.getOpponentPlayer() && client.decks[client.getOpponentPlayer().name].slots.get(pos.key)">
            <Card
                :character="client.decks[client.getOpponentPlayer().name].slots.get(pos.key)"
                interactive
                slot
                @preview="emit('preview', $event)"
                detail-direction="bottom"
                :client="client"
            />
          </div>
          <div class="slot-placeholder" v-else></div>

          <Teleport to="body">
            <PositionInfo
                v-if="showPosInfo[pos.key] && ! client.decks[client.getOpponentPlayer().name].slots.get(pos.key)"
                :pos="pos"
                :anchor="oppSlot[pos.key]"
            />
          </Teleport>
        </div>
      </div>
    </section>

    <template v-if="state.phase === PHASE_DRAFT">
      <section class="row status-row">
        <div class="status" v-if="secondsLeft">
          <span class="timer">{{ secondsLeft }}</span>
          <span class="status-text">{{ draftMessage }}</span>
        </div>
      </section>

      <section class="row draft-row">
        <div class="draft-cards">
          <Card
              v-for="character of client.pack"
              :key="character.名字"
              :character="character"
              interactive
              @preview="emit('preview', $event)"
              :client="client"
              @click="handleSelect(character)"
          />
        </div>
      </section>

      <section class="row action-row">
        <template v-if="client.draftStage === DRAFT_STAGE_PASSIVE_DISCARD && ! client.hasInitiative()">
          <button class="action-btn discard" @click="handleDecidePassiveDiscard(true)">弃牌</button>
          <button class="action-btn cancel" @click="handleDecidePassiveDiscard(false)">取消</button>
        </template>

        <template v-if="client.draftStage === DRAFT_STAGE_INIT && client.hasInitiative()">
          <button class="action-btn primary" @click="handleCardSelect" :disabled="! haveSelectedThisRound">选择</button>
          <button class="action-btn" v-if="client.getPlayer().initDiscardRemaining > 0" @click="client.send(new InitDiscardAction())">弃牌</button>
        </template>

        <template v-if="client.draftStage === DRAFT_STAGE_PASSIVE && ! client.hasInitiative()">
          <button class="action-btn primary" @click="handleCardSelect" :disabled="! haveSelectedThisRound">选择</button>
        </template>
      </section>
    </template>

    <template v-else-if="state.phase === PHASE_SIMULATING || client.gameEnded">
      <section class="row simulation-row">
        <div class="simulation-container" :class="{ 'game-ended': client.gameEnded }">
          <div class="sim-header">
            <span class="pulse-icon" :class="{ 'ended': client.gameEnded }"></span>
            <span class="sim-title">{{ client.gameEnded ? '战局已结束' : '战局模拟中...' }}</span>
            <div v-if="!client.gameEnded" class="loading-dots"><span>.</span><span>.</span><span>.</span></div>
          </div>

          <div class="sim-content" ref="simContent">
            <div class="stream-text" v-html="renderedStream"></div>
            <span v-if="!client.gameEnded" class="cursor">_</span>
          </div>

          <Transition name="fade">
            <div v-if="client.gameEnded" class="game-over-controls">
              <div class="status-badge opponent">
                <span class="dot" :class="{ 'is-ready': client.getOpponentPlayer()?.ready }"></span>
                对手: {{ client.getOpponentPlayer()?.ready ? '准备完毕' : '准备中...' }}
              </div>

              <div class="ready-action-wrapper">
                <button
                    v-if="!client.getPlayer()?.ready"
                    class="action-btn primary ready-pulse"
                    @click="handleReady"
                >
                  重新准备
                </button>
                <div v-else class="ready-text">
                  <i class="check-icon">✓</i> 您已准备就绪
                </div>
              </div>

              <div class="status-badge player">
                <span class="dot" :class="{ 'is-ready': client.getPlayer()?.ready }"></span>
                您: {{ client.getPlayer()?.ready ? '准备完毕' : '准备中...' }}
              </div>
            </div>
          </Transition>

          <div class="sim-footer">
            <div class="scanline"></div>
          </div>
        </div>
      </section>
    </template>

    <section class="row deck-area player">
      <div class="deck-grid">
        <div
            v-for="pos in POSITIONS"
            :key="pos.key"
            :data-key="pos.key"
            ref="slotRefPlayer"
            class="deck-slot drag-target"
            :class="{
              'is-dragging': draggingPos === pos.key,
              'is-over': dragOverPos === pos.key
            }"
            @dragover="(e) => onDragOver(e, pos.key)"
            @dragleave="onDragLeave"
            @drop="(e) => onDrop(e, pos.key)"
        >
          <div
              class="slot-card-wrapper clickable"
              v-if="client.decks[client.getPlayer().name].slots.get(pos.key)"
              draggable="true"
              @dragstart="(e) => onDragStart(e, pos.key)"
          >
            <Card
                :character="client.decks[client.getPlayer().name].slots.get(pos.key)"
                interactive
                slot
                @preview="emit('preview', $event)"
                detail-direction="top"
                :client="client"
            />
          </div>

          <div
              class="slot-placeholder"
              v-else
              @mouseenter="showPosInfoPlayer[pos.key] = true"
              @mouseleave="showPosInfoPlayer[pos.key] = false"
          ></div>

          <div class="slot-title">{{ pos.key }}</div>

          <Teleport to="body">
            <PositionInfo
                v-if="showPosInfoPlayer[pos.key] && !client.decks[client.getPlayer().name].slots.get(pos.key)"
                :pos="pos"
                :anchor="playerSlot[pos.key]"
            />
          </Teleport>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.draft-board-grid {
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-rows: 1fr minmax(56px, 7vh) minmax(200px, 32vh) minmax(56px, 7vh) 1.2fr;
  gap: 8px;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);
}

.row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
  text-shadow: 0 0 10px rgba(255,255,255,0.3);
}

.timer {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 900;
  font-family: monospace;
}

.draft-cards {
  display: flex;
  gap: clamp(8px, 2vw, 16px);
  padding: 20px;
}

.action-row {
  gap: 24px;
}

.action-btn {
  padding: 10px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.action-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #eee;
}

.action-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn.primary {
  background: linear-gradient(135deg, #444, #111);
  color: #fff;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.action-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.6);
}

.action-btn.discard {
  background: linear-gradient(135deg, #e63946, #9b2226);
  color: #fff;
}

.deck-area {
  width: 100%;
}

.deck-grid {
  display: grid;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  gap: clamp(4px, 0.8vw, 8px);
  width: 100%;
  padding: 0 clamp(8px, 2vw, 16px);
}

.deck-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  position: relative;
  padding: 4px;
  border-radius: 10px;
}

.deck-slot.is-over {
  background: rgba(255, 255, 255, 0.1);
  outline: 2px dashed rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.deck-slot.is-dragging {
  opacity: 0.4;
}

.slot-placeholder {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.02);
}

.slot-card-wrapper {
  width: 100%;
  aspect-ratio: 2 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  z-index: 2;
}

.slot-card-wrapper.clickable {
  cursor: grab;
}

.slot-card-wrapper.clickable:active {
  cursor: grabbing;
}

.slot-card-wrapper :deep(.card) {
  width: 100%;
  height: 100%;
  transform: none !important;
}

.slot-title {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.simulation-row {
  grid-row: 2 / 5;
  height: 100%;
  padding: 10px 20px;
  display: flex;
  align-items: stretch;
}

.simulation-container {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.5);
}

.sim-header {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sim-title {
  font-size: 14px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.sim-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  font-family: 'Fira Code', 'Courier New', monospace;
  line-height: 1.6;
  color: #d1d1d1;
  text-align: left;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.stream-text :deep(p) {
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.stream-text :deep(p:last-child) {
  display: inline;
  margin-bottom: 0;
}

.stream-text :deep(h1),
.stream-text :deep(h2),
.stream-text :deep(h3) {
  color: #fff;
  margin: 16px 0 8px 0;
  font-weight: 600;
  border-left: 3px solid #00ff88;
  padding-left: 10px;
}

.stream-text :deep(strong) {
  color: #00ff88;
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

.stream-text :deep(ul),
.stream-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.stream-text :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #ffcc00;
}

.cursor {
  display: inline-block;
  width: 8px;
  margin-left: 4px;
  animation: blink 1s infinite;
  color: #00ff88;
  vertical-align: baseline;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.scanline {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(
      to bottom,
      transparent 50%,
      rgba(0, 0, 0, 0.05) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
}

.pulse-icon {
  width: 8px;
  height: 8px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ff88;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
}

/* Game Over Controls Overlay */
.game-over-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.8) 70%, transparent 100%);
  padding: 30px 20px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(4px);
  border-top: 1px solid rgba(0, 255, 136, 0.2);
  z-index: 10;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
}

.status-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #444;
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.status-badge .dot.is-ready {
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
}

.ready-action-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
}

.ready-text {
  color: #00ff88;
  font-weight: bold;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
}

.ready-pulse {
  animation: button-pulse 2s infinite;
  background: linear-gradient(135deg, #00ff88, #008855) !important;
  color: #000 !important;
  border: none;
  min-width: 140px;
}

@keyframes button-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(0, 255, 136, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
}

.pulse-icon.ended {
  background: #ffcc00; /* Yellow for "Reviewing" state */
  box-shadow: 0 0 10px #ffcc00;
  animation: none;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Ensure the simulation container feels different when ended */
.simulation-container.game-ended {
  border-color: rgba(0, 255, 136, 0.3);
  box-shadow: inset 0 0 40px rgba(0, 255, 136, 0.05);
}
</style>
