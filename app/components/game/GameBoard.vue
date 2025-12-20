<script setup lang="ts">
import { computed, ref } from "vue";
import type { Client } from "~/client";
import { type ServerState } from "~/composables/useClient";
import CardPreviewModal from "~/components/game/CardPreviewModal.vue";
import Deck from "~/components/game/Deck.vue";
import DraftBoard from "~/components/game/DraftBoard.vue";
import { ReadyAction } from "~/action";
import Coinflip from "~/components/Coinflip.vue";

import { type Character, PHASE_DRAFT, PHASE_LOBBY } from "~/common/common";
import Ping from "~/components/Ping.vue";
import InitiativeCoin from "~/components/game/InitiativeCoin.vue";

const props = defineProps<{
  state: ServerState,
  client: Client,
  players: Player[]
}>();

const previewing = ref<Character | null>(null);
const showDeck = ref(false);
const showRules = ref(false);
const hideCoinflip = ref(false);

const player = computed(() => props.client.getPlayer());
const opponentPlayer = computed(() => props.client.getOpponentPlayer());

const handleReady = () => {
  props.client.send(new ReadyAction());
};
</script>

<template>
  <div class="game-container">

    <header class="row player-name" :class="opponentPlayer ? '' : 'opponent-waiting'">
      <div v-if="client.gameStarted && state.phase === PHASE_DRAFT && opponentPlayer" class="discard-status">
        <span class="discard-tag initiative" title="先手弃牌">
          <i class="icon">⊘</i> {{ opponentPlayer.initDiscardRemaining }}
        </span>
        <span class="discard-tag passive" title="后手弃牌">
          <i class="icon">↺</i> {{ opponentPlayer.passiveDiscardRemaining }}
        </span>
      </div>
      {{ opponentPlayer?.name || "等待对手加入…" }}
      <initiative-coin v-if="client.gameStarted && state.phase === PHASE_DRAFT && ! client.hasInitiative()" />
    </header>

    <main class="game-content">
      <div v-if="!client.gameStarted" class="lobby-board">
        <div class="status-label">
          <span v-if="client.getOpponentPlayer()">{{ client.getOpponentPlayer()?.ready ? '准备完毕' : '准备中...' }}</span>
        </div>

        <div class="lobby-center" style="display: inline-grid">
          <div>新的对局将于双方准备完成后开始。</div>
          <button
              class="btn-ready"
              @click="handleReady"
              v-show="! client.getPlayer()?.ready"
          >
            准备完毕
          </button>
        </div>

        <div class="status-label">
          <span>{{ client.getPlayer()?.ready ? '准备完毕' : '准备中...' }}</span>
        </div>
      </div>

      <DraftBoard
          v-if="client.gameStarted && state.phase === PHASE_DRAFT"
          :client="client"
          @preview="previewing = $event"
      />

      <coinflip v-if="client.gameStarted && state.phase === PHASE_LOBBY" :final-result="client.hasInitiative() ? 'heads' : 'tails' " float-in-center />
    </main>

    <footer class="row player-name">
      <div v-if="client.gameStarted && state.phase === PHASE_DRAFT && player" class="discard-status">
        <span class="discard-tag initiative" title="先手弃牌">
          <i class="icon">⊘</i> {{ player.initDiscardRemaining }}
        </span>
        <span class="discard-tag passive" title="后手弃牌">
          <i class="icon">↺</i> {{ player.passiveDiscardRemaining }}
        </span>
      </div>
      {{ client.playerName }}
      <initiative-coin v-if="client.gameStarted && state.phase === PHASE_DRAFT && client.hasInitiative()" />
    </footer>

    <div class="floating-bar">
      <div class="draft-round-indicator" v-if="client.draftRound > 0">
        第 {{ client.draftRound }} 轮
      </div>

      <ping :ping="client.ping" />

      <button class="rules-btn" @click="showRules = true">规则</button>

      <div class="deck-pile" @click="showDeck = true">
        <img :src="'card-back.webp'" />
      </div>
    </div>

    <div v-if="showRules" class="modal-overlay">
      <div class="modal">
        <h2>轮抽规则</h2>
        <p>本游戏轮抽流程以每轮五 (5) 张卡牌为基础进行。在每一轮中，每位参与者从提供的五 (5) 张卡牌中选择一张纳入手中。</p>
        <p>先手权是流程中的一项关键机制，其归属在每一轮结束后进行交换。</p>
        <p>持有先手权的玩家享有先手弃牌权。此权利允许先手玩家在本轮选牌开始前，选择将本轮的全部五 (5) 张卡牌放弃，并直接进入下一轮抽卡环节。每位玩家在整个游戏过程中总共有五 (5) 次行使先手弃牌权的机会。</p>
        <p>此外，未持有先手权的玩家（即后手玩家）拥有一项后手弃牌权。此权利允许后手玩家在先手玩家选牌开始之前，声明放弃本轮的五张卡牌，从而直接进入下一轮。然而，行使后手弃牌权的代价是放弃下一轮抽卡中自身的先手权。每位玩家拥有一 (1) 次行使后手弃牌权的机会。</p>
        <p>轮抽持续至双方已选取十四 (14) 张卡牌，并构建完整牌组之时。届时，游戏进入模拟阶段。</p>
        <div class="buttons">
          <button class="btn btn-close" @click="showRules = false">关闭</button>
        </div>
      </div>
    </div>

    <CardPreviewModal
        v-if="previewing"
        :character="previewing"
        @close="previewing = null"
    />

    <Deck
        :show="showDeck"
        :characters="client.characters"
        @close="showDeck = false"
    />
  </div>
</template>

<style scoped>
.lobby-board {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.lobby-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.status-label {
  font-size: 0.9rem;
  color: #888;
  font-weight: 500;
  letter-spacing: 1px;
}

.btn-ready {
  font-size: 1.2rem;
  font-weight: bold;
  padding: 12px 32px;
  border-radius: 8px;
  background: #222;
  color: #fff;
  border: 1px solid #222;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.btn-ready:hover:not(:disabled) {
  background: #333;
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0,0,0,0.15);
}

.game-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.row {
  display: flex;
  align-items: center;
  justify-content: center;
}

header.player-name {
  min-height: minmax(32px, 5vh);
  height: 5vh;
}

footer.player-name {
  min-height: minmax(32px, 5vh);
  height: 5vh;
}

.player-name {
  font-size: 1.2rem;
  font-weight: bold;
}

.opponent-waiting {
  opacity: .7;
}

.floating-bar {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-20%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 200;
}

.rules-btn {
  padding:10px 14px;
  border-radius:999px;
  background:#222;
  color:#fff;
  cursor: pointer;
}

.rules-btn:hover {
  background: rgba(34, 34, 34, 0.83);
}

.deck-pile {
  position: relative;
  width: 64px;
  height: 96px;
  cursor: pointer;
}

.deck-pile img {
  width: 100%;
  border-radius: 8px;
  position: relative;
  z-index: 3;
}

.deck-pile::before,
.deck-pile::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: url("/card-back.webp") center / cover;
}

.deck-pile::before {
  transform: translate(4px, 4px);
  opacity: .6;
}

.deck-pile::after {
  transform: translate(8px, 8px);
  opacity: .3;
}

.draft-round-indicator {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.discard-status {
  display: flex;
  gap: 6px;
  margin-right: 12px;
  font-family: monospace;
}

.discard-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.discard-tag.initiative {
  background: linear-gradient(135deg, #442222 0%, #221111 100%);
  color: #ff6b6b;
  border-color: #663333;
}

.discard-tag.passive {
  background: linear-gradient(135deg, #223344 0%, #111a22 100%);
  color: #4dabf7;
  border-color: #334466;
}

.discard-tag .icon {
  font-style: normal;
  font-size: 1rem;
  opacity: 0.8;
}

.player-name {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: white;
}
</style>
