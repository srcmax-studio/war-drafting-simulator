<script setup lang="ts">
import type { GameEvent, PlayerView } from '~/common/src/index';
import { CARD_BY_ID, cardFallbackUrl, cardImageUrl } from '~/data/catalog';
import { frontArtAlt, frontArtUrl } from '~/data/front-art';
import { eventLabel } from '~/utils/ability-text';

const props = defineProps<{ view: PlayerView; playerId: string; selectedEvent?: GameEvent | null }>();
const opponent = computed(() => props.view.players.find((player) => player.playerId !== props.playerId));
const ownCards = (frontId: string) => props.view.fronts.find((front) => front.definition.frontId === frontId)?.cards[props.playerId] ?? [];
const enemyCards = (frontId: string) => opponent.value ? props.view.fronts.find((front) => front.definition.frontId === frontId)?.cards[opponent.value.playerId] ?? [] : [];
</script>

<template>
  <div class="replay-board">
    <div class="replay-hud"><span>{{ opponent?.name }} <b>{{ view.stake.current }}</b> 战功</span><strong>第 {{ view.turn }} 回合</strong><span>{{ view.players.find(player=>player.playerId===playerId)?.name }}</span></div>
    <div class="replay-fronts">
      <article v-for="front in view.fronts" :key="front.definition.frontId">
        <img v-if="front.revealed" :src="frontArtUrl(front.definition.frontId)" :alt="frontArtAlt(front.definition)">
        <div v-else class="replay-fog">战线未揭示</div>
        <header><strong>{{ front.revealed ? front.definition.nameZh : '未揭示战线' }}</strong><span>{{ front.power[opponent?.playerId ?? ''] ?? '?' }} : {{ front.power[playerId] ?? 0 }}</span></header>
        <div class="replay-lane enemy"><span v-for="card in enemyCards(front.definition.frontId)" :key="card.instanceId"><img v-if="card.cardId && CARD_BY_ID[card.cardId]" :src="cardImageUrl(CARD_BY_ID[card.cardId]!)" :alt="CARD_BY_ID[card.cardId]!.nameZh"><i v-else>伏</i></span></div>
        <div class="replay-lane own"><span v-for="card in ownCards(front.definition.frontId)" :key="card.instanceId"><img v-if="card.cardId && CARD_BY_ID[card.cardId]" :src="cardImageUrl(CARD_BY_ID[card.cardId]!)" :alt="CARD_BY_ID[card.cardId]!.nameZh" @error="($event.target as HTMLImageElement).src=cardFallbackUrl(CARD_BY_ID[card.cardId]!)"><i v-else>伏</i></span></div>
      </article>
    </div>
    <div v-if="selectedEvent" class="replay-event"><span>序列 {{ selectedEvent.sequence }}</span><strong>{{ eventLabel(selectedEvent) }}</strong></div>
  </div>
</template>

<style scoped>
.replay-board{position:relative;min-height:520px;padding:12px;border:1px solid var(--border-subtle);background:#090d0c}.replay-hud{min-height:48px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 14px;border:1px solid var(--border-subtle);background:var(--color-surface-primary);font-size:11px}.replay-hud strong{text-align:center}.replay-hud span:last-child{text-align:right}.replay-hud b{color:var(--color-gold)}.replay-fronts{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:8px;margin-top:8px;overflow:auto}.replay-fronts article{position:relative;min-width:220px;height:410px;display:grid;grid-template-rows:1fr auto 1fr;overflow:hidden;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.replay-fronts article>img,.replay-fog{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.38}.replay-fog{display:grid;place-items:center;background:repeating-linear-gradient(135deg,#151b19,#151b19 14px,#202824 14px,#202824 28px);color:var(--color-text-muted)}.replay-fronts article::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(5,8,7,.78),rgba(5,8,7,.18) 42%,rgba(5,8,7,.78));pointer-events:none}.replay-fronts header{position:relative;z-index:2;grid-row:2;display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border:solid var(--border-subtle);border-width:1px 0;background:rgba(12,16,14,.88)}.replay-fronts header strong{font-family:var(--font-display);font-size:13px}.replay-fronts header span{font-family:var(--font-numeric);color:var(--color-gold)}.replay-lane{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:4px;padding:8px}.replay-lane.enemy{grid-row:1;align-items:end}.replay-lane.own{grid-row:3;align-items:start}.replay-lane>span{width:min(54px,21%);aspect-ratio:5/7;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.25);background:#252c28}.replay-lane img{width:100%;height:100%;object-fit:cover}.replay-lane i{font-family:var(--font-display);font-style:normal;color:var(--color-gold)}.replay-event{position:absolute;z-index:4;left:50%;bottom:20px;min-width:260px;display:grid;gap:3px;padding:10px 14px;border-left:3px solid var(--color-copper);background:rgba(9,13,12,.92);transform:translateX(-50%);text-align:center}.replay-event span{color:var(--color-text-muted);font-size:8px}.replay-event strong{font-size:11px}@media(max-width:760px){.replay-fronts{scroll-snap-type:x mandatory}.replay-fronts article{min-width:82vw;scroll-snap-align:center}.replay-hud{font-size:9px}}
</style>
