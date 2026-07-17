<script setup lang="ts">
import { Ban, Eye, Flag, LockKeyhole, RotateCcw, Skull, Swords, Timer, Undo2 } from 'lucide-vue-next';
import type { CardDefinition, DeploymentIntent, GameEvent, PlayerView } from '~/common/src/index';
import { CARD_BY_ID, cardFallbackUrl, cardImageUrl } from '~/data/catalog';
import { eventLabel } from '~/utils/ability-text';

interface GameView extends PlayerView { deadline?: number | null }
const props = defineProps<{ view: GameView; playerId: string; plan: DeploymentIntent[]; error?: string }>();
const emit = defineEmits<{ deploy: [cardId: string, frontId: string]; clear: []; lock: []; banner: []; retreat: []; rematch: [] }>();
const { t } = useI18n();
const selectedCardId = ref('');
const detailCard = ref<CardDefinition | null>(null);
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 250); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });

const player = computed(() => props.view.players.find((candidate) => candidate.playerId === props.playerId)!);
const opponent = computed(() => props.view.players.find((candidate) => candidate.playerId !== props.playerId)!);
const hand = computed(() => (player.value.hand ?? []).map((cardId) => CARD_BY_ID[cardId]).filter((card): card is CardDefinition => Boolean(card)));
const remainingSeconds = computed(() => props.view.deadline ? Math.max(0, Math.ceil((props.view.deadline - now.value) / 1000)) : null);
const outcome = computed(() => {
  if (!props.view.winner) return '';
  if (!props.view.winner.winnerId) return 'draw';
  return props.view.winner.winnerId === props.playerId ? 'victory' : 'defeat';
});
const outcomeReason = computed(() => props.view.winner ? t(`game.resultReasons.${props.view.winner.reason}`) : '');
const ownCards = (frontId: string) => props.view.fronts.find((front) => front.definition.frontId === frontId)?.cards[props.playerId] ?? [];
const enemyCards = (frontId: string) => props.view.fronts.find((front) => front.definition.frontId === frontId)?.cards[opponent.value.playerId] ?? [];
const planned = (frontId: string) => props.plan.filter((deployment) => deployment.frontId === frontId).map((deployment) => CARD_BY_ID[deployment.cardId]).filter(Boolean) as CardDefinition[];
const capacity = (front: GameView['fronts'][number], playerId: string) => front.capacity[playerId] ?? 4;
const canDeploy = (front: GameView['fronts'][number]) => !front.deploymentBlocked[props.playerId]
  && ownCards(front.definition.frontId).length + planned(front.definition.frontId).length < capacity(front, props.playerId);
const chooseFront = (frontId: string) => {
  if (!selectedCardId.value) return;
  emit('deploy', selectedCardId.value, frontId);
  selectedCardId.value = '';
};
const selectHand = (card: CardDefinition) => {
  if (props.plan.some((deployment) => deployment.cardId === card.cardId)) {
    const deployment = props.plan.find((candidate) => candidate.cardId === card.cardId)!;
    emit('deploy', card.cardId, deployment.frontId);
    selectedCardId.value = '';
  } else {
    selectedCardId.value = selectedCardId.value === card.cardId ? '' : card.cardId;
  }
};
const instanceCard = (instance: any): CardDefinition | null => typeof instance.cardId === 'string' ? CARD_BY_ID[instance.cardId] ?? null : null;
const imageFor = (card: CardDefinition) => cardImageUrl(card);
const eventCard = (event: GameEvent) => typeof event.payload.sourceCardId === 'string' ? CARD_BY_ID[event.payload.sourceCardId] : typeof event.payload.cardId === 'string' ? CARD_BY_ID[event.payload.cardId] : undefined;
const eventAbility = (event: GameEvent) => {
  const card = eventCard(event);
  return card?.abilities?.find((ability) => ability.abilityId === event.payload.abilityId)?.nameZh;
};
const describeEvent = (event: GameEvent) => eventLabel(event, eventCard(event)?.nameZh, eventAbility(event));
const eventDetail = (event: GameEvent) => {
  if (event.type === 'ability_started') return String(event.payload.trigger ?? '');
  if (event.type === 'ability_resolved') return `${event.payload.targets ?? 0} 目标 · ${event.payload.changed ?? 0} 变化`;
  if (event.type === 'deployment_fizzled') return String(event.payload.reason ?? '目标已失效');
  return '';
};
</script>

<template>
  <div class="battle-screen">
    <header class="battle-status">
      <div class="combatant opponent"><strong>{{ opponent.name }}</strong><span>{{ $t('game.hand') }} {{ opponent.handCount }} · {{ $t('game.deck') }} {{ opponent.deckCount }}</span></div>
      <div class="turn-cluster">
        <span><Swords :size="16" /> {{ $t('game.turn') }} {{ view.turn }}/6</span>
        <span><Eye :size="16" /> {{ $t('game.initiative') }} · {{ view.players.find(p => p.playerId === view.initiativePlayerId)?.name }}</span>
        <span v-if="remainingSeconds !== null"><Timer :size="16" /> {{ remainingSeconds }}s</span>
      </div>
      <div class="stake-cluster"><strong>{{ view.stake.current }}</strong><span>{{ $t('game.stake') }}</span><small v-if="view.stake.pending">{{ $t('game.pendingStake') }} {{ view.stake.pending }}</small></div>
    </header>

    <div class="battle-layout">
      <section class="front-scroll" aria-label="三条战线">
        <article v-for="front in view.fronts" :key="front.definition.frontId" class="front-lane" :class="{ unrevealed: !front.revealed }">
          <div class="lane-cards enemy-line" :style="{ gridTemplateColumns: `repeat(${Math.min(6, capacity(front, opponent.playerId))}, minmax(0, 1fr))` }">
            <button v-for="instance in enemyCards(front.definition.frontId)" :key="instance.instanceId" type="button" class="board-card" @click="instanceCard(instance) && (detailCard = instanceCard(instance))">
              <template v-if="instanceCard(instance)">
                <img :src="imageFor(instanceCard(instance)!)" :alt="instanceCard(instance)!.nameZh" @error="($event.target as HTMLImageElement).src = cardFallbackUrl(instanceCard(instance)!)">
                <span>{{ instanceCard(instance)!.power }}</span><small>{{ instanceCard(instance)!.nameZh }}</small>
              </template>
              <template v-else><div class="card-back-mini">AF</div><small>伏兵</small></template>
            </button>
            <span v-if="enemyCards(front.definition.frontId).length === 0" class="slot-mark">0/{{ capacity(front, opponent.playerId) }}</span>
          </div>

          <button type="button" class="front-brief" :disabled="!canDeploy(front)" @click="chooseFront(front.definition.frontId)">
            <span class="front-index">{{ view.fronts.indexOf(front) + 1 }}</span>
            <template v-if="front.revealed">
              <strong>{{ front.definition.nameZh }}</strong>
              <p>{{ front.definition.descriptionZh }}</p>
              <div class="front-score"><span>{{ front.power[opponent.playerId] ?? '?' }}</span><i>:</i><span>{{ front.power[playerId] ?? 0 }}</span></div>
            </template>
            <template v-else><LockKeyhole :size="22" /><strong>未揭示战线</strong><p>可部署 · 第 {{ view.fronts.indexOf(front) + 1 }} 回合公开</p></template>
            <span v-if="front.deploymentBlocked[playerId]" class="blocked-mark"><Ban :size="13" /> 禁止部署</span>
            <span v-else-if="front.movementBlocked[playerId]" class="blocked-mark"><Ban :size="13" /> 禁止调遣</span>
            <span class="capacity-mark">{{ ownCards(front.definition.frontId).length + planned(front.definition.frontId).length }}/{{ capacity(front, playerId) }}</span>
          </button>

          <div class="lane-cards own-line" :style="{ gridTemplateColumns: `repeat(${Math.min(6, capacity(front, playerId))}, minmax(0, 1fr))` }">
            <button v-for="instance in ownCards(front.definition.frontId)" :key="instance.instanceId" type="button" class="board-card" @click="instanceCard(instance) && (detailCard = instanceCard(instance))">
              <template v-if="instanceCard(instance)">
                <img :src="imageFor(instanceCard(instance)!)" :alt="instanceCard(instance)!.nameZh" @error="($event.target as HTMLImageElement).src = cardFallbackUrl(instanceCard(instance)!)">
                <span>{{ instance.currentPower }}</span><small>{{ instanceCard(instance)!.nameZh }}</small>
                <i v-if="Object.keys(instance.markers ?? {}).length || (instance.statuses?.length ?? 0)" class="instance-state">{{ Object.entries(instance.markers ?? {}).map(([name,count]) => `${name}${count}`).join(' ') }} {{ instance.statuses?.join(' ') }}</i>
              </template>
            </button>
            <button v-for="card in planned(front.definition.frontId)" :key="`plan-${card.cardId}`" type="button" class="board-card planned" @click="emit('deploy', card.cardId, front.definition.frontId)">
              <img :src="imageFor(card)" :alt="card.nameZh"><span>{{ card.power }}</span><small>{{ card.nameZh }}</small>
            </button>
            <button v-if="canDeploy(front)" type="button" class="slot-mark deploy-slot" @click="chooseFront(front.definition.frontId)">+</button>
          </div>
        </article>
      </section>

      <aside class="event-panel">
        <div class="surface-header"><strong>{{ $t('game.events') }}</strong><span>{{ view.events.length }}</span></div>
        <ol><li v-for="event in view.events.slice(-24).reverse()" :key="event.sequence" :class="{ 'ability-event': event.type.startsWith('ability_') }"><time>R{{ event.turn }}</time><span>{{ describeEvent(event) }}<small v-if="eventDetail(event)">{{ eventDetail(event) }}</small></span></li></ol>
      </aside>
    </div>

    <footer class="command-deck">
      <div class="player-strip">
        <div><strong>{{ player.name }}</strong><span>{{ $t('game.deck') }} {{ player.deckCount }} · <Skull :size="14" /> {{ player.graveyardCount }} · {{ view.catalogVersion }}</span></div>
        <div class="orders"><strong>{{ player.energy }}</strong><span>{{ $t('game.orders') }}</span></div>
      </div>
      <div class="hand-row">
        <CardTile v-for="card in hand" :key="card.cardId" :card="card" compact :selected="selectedCardId === card.cardId || plan.some(p => p.cardId === card.cardId)" :disabled="player.locked" @select="selectHand" @dblclick="detailCard = card" />
      </div>
      <p v-if="selectedCardId" class="deployment-hint">选择一条战线部署 {{ CARD_BY_ID[selectedCardId]?.nameZh }}</p>
      <p v-if="error" class="danger command-error">{{ error }}</p>
      <div class="command-actions">
        <button class="button" type="button" :disabled="player.locked || plan.length === 0" @click="emit('clear')"><Undo2 :size="17" /> {{ $t('game.undo') }}</button>
        <button class="button" type="button" :disabled="player.locked || player.bannerUsed" @click="emit('banner')"><Flag :size="17" /> {{ $t('game.banner') }}</button>
        <button class="button danger-button" type="button" :disabled="player.locked" @click="emit('retreat')"><RotateCcw :size="17" /> {{ $t('game.withdraw') }}</button>
        <button class="button primary" type="button" :disabled="player.locked" @click="emit('lock')"><LockKeyhole :size="17" /> {{ player.locked ? '已锁定' : $t('game.lock') }}</button>
      </div>
    </footer>

    <div v-if="view.phase === 'ended'" class="result-banner">
      <div>
        <Flag :size="34" />
        <h1>{{ outcome === 'victory' ? $t('game.victory') : outcome === 'defeat' ? $t('game.defeat') : $t('game.draw') }}</h1>
        <p>{{ $t('game.stake') }} {{ view.winner?.stake }} · {{ outcomeReason }}</p>
        <div class="button-row"><NuxtLink class="button" to="/">返回总览</NuxtLink><button class="button primary" type="button" @click="emit('rematch')">再来一局</button></div>
      </div>
    </div>
    <CardDetailModal :card="detailCard" @close="detailCard = null" />
  </div>
</template>

<style scoped>
.battle-screen { min-height: calc(100vh - var(--header-height)); padding: 14px; background: #0d1210; }
.battle-status { min-height: 64px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 18px; padding: 10px 16px; border: 1px solid var(--line); background: #161c19; }
.combatant { display: grid; gap: 3px; }.combatant span,.turn-cluster span,.stake-cluster span,.stake-cluster small { color: var(--muted); font-size: 11px; }.turn-cluster { display: flex; gap: 18px; }.turn-cluster span { display: inline-flex; align-items: center; gap: 5px; }.stake-cluster { justify-self: end; display: grid; grid-template-columns: auto auto; align-items: center; gap: 0 8px; }.stake-cluster strong { grid-row: span 2; font-size: 30px; color: var(--gold); }
.battle-layout { display: grid; grid-template-columns: minmax(0,1fr) 210px; gap: 10px; margin-top: 10px; }.front-scroll { display: grid; grid-template-columns: repeat(3,minmax(260px,1fr)); gap: 10px; overflow-x: auto; }.front-lane { min-width: 260px; display: grid; grid-template-rows: minmax(112px,1fr) 102px minmax(112px,1fr); border: 1px solid var(--line); background: #151a18; }.lane-cards { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); align-items: center; gap: 5px; padding: 7px; }.enemy-line { align-items: end; }.own-line { align-items: start; }.board-card { position: relative; min-width: 0; aspect-ratio: 5/7; padding: 0; overflow: hidden; border: 1px solid #59625d; border-radius: 4px; background: #242a27; cursor: pointer; }.board-card img { width:100%;height:100%;object-fit:cover; }.board-card span { position:absolute;right:3px;top:3px;display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#943f38;font-size:11px;font-weight:800; }.board-card small { position:absolute;left:0;right:0;bottom:0;padding:12px 2px 3px;background:linear-gradient(transparent,#101412);font-size:9px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }.board-card.planned { opacity:.66;border-style:dashed;border-color:var(--teal); }.card-back-mini { height:100%;display:grid;place-items:center;color:var(--gold);font-family:serif;background:repeating-linear-gradient(45deg,#202722,#202722 8px,#2a332e 8px,#2a332e 16px); }.slot-mark { display:grid;place-items:center;min-height:76px;border:1px dashed #39423e;color:#65706a;font-size:10px; }.deploy-slot { width:100%;cursor:pointer;background:transparent;font-size:25px; }.front-brief { position:relative;padding:10px 36px;border:solid var(--line);border-width:1px 0;background:#24241e;color:var(--ink);text-align:left;cursor:pointer; }.front-brief:disabled { cursor:default; }.front-brief strong { display:block;font-family:"Noto Serif SC",serif;font-size:14px;text-align:center; }.front-brief p { margin:5px 0 0;color:#b6bbb7;font-size:10px;line-height:1.4;text-align:center; }.front-index { position:absolute;left:8px;top:8px;color:var(--copper);font-family:serif;font-size:22px; }.front-score { position:absolute;right:7px;top:7px;display:grid;gap:1px;text-align:center;font-weight:800; }.front-score i { color:var(--muted);font-size:9px; }.unrevealed .front-brief { display:grid;place-items:center;text-align:center; }.event-panel { max-height:438px;overflow:hidden;border:1px solid var(--line);background:#141917; }.event-panel ol { height:calc(100% - 48px);margin:0;padding:8px 12px 12px;overflow:auto;list-style:none; }.event-panel li { display:grid;grid-template-columns:30px 1fr;gap:6px;padding:6px 0;border-bottom:1px solid #2d3531;color:#c2c8c4;font-size:10px; }.event-panel time { color:var(--copper); }.command-deck { margin-top:10px;padding:10px 14px 14px;border:1px solid var(--line);background:#171d1b; }.player-strip { display:flex;align-items:center;justify-content:space-between;margin-bottom:8px; }.player-strip>div:first-child { display:grid;gap:3px; }.player-strip span { display:flex;align-items:center;gap:4px;color:var(--muted);font-size:10px; }.orders { display:flex;align-items:baseline;gap:6px; }.orders strong { color:var(--teal);font-size:27px; }.hand-row { display:flex;gap:8px;min-height:178px;overflow-x:auto;padding:2px 2px 7px; }.hand-row :deep(.card-tile) { height:176px;aspect-ratio:5/7; }.command-actions { display:flex;justify-content:flex-end;gap:8px;margin-top:9px; }.deployment-hint,.command-error { margin:5px 0 0;font-size:11px; }.result-banner { position:fixed;inset:var(--header-height) 0 0;z-index:80;display:grid;place-items:center;background:rgba(6,8,7,.88);text-align:center; }.result-banner>div { min-width:300px;padding:32px;border-top:2px solid var(--gold);border-bottom:2px solid var(--gold); }.result-banner h1 { margin:8px 0;font-family:"Noto Serif SC",serif;font-size:42px; }.result-banner p { color:var(--muted); }
.instance-state { position:absolute;left:2px;top:2px;z-index:2;max-width:calc(100% - 28px);padding:2px 3px;background:rgba(12,16,14,.84);color:var(--gold);font-size:7px;font-style:normal;overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }.front-brief:disabled { opacity:.72; }.capacity-mark { position:absolute;right:7px;bottom:6px;color:var(--muted);font-size:8px; }.blocked-mark { position:absolute;left:7px;bottom:6px;display:inline-flex;align-items:center;gap:3px;color:#ef8a82;font-size:8px; }.event-panel li.ability-event { border-left:2px solid var(--copper);padding-left:5px;background:#1d1c16; }.event-panel li span { min-width:0; }.event-panel li small { display:block;margin-top:3px;color:var(--muted);font-size:8px; }
@media(max-width:1050px){.battle-layout{grid-template-columns:1fr}.event-panel{display:none}.front-scroll{grid-template-columns:repeat(3,minmax(270px,1fr))}.turn-cluster span:nth-child(2){display:none}}
@media(max-width:720px){.battle-screen{padding:8px}.battle-status{grid-template-columns:1fr auto;padding:8px}.turn-cluster{grid-row:2;grid-column:1/-1;justify-content:center}.stake-cluster{grid-column:2;grid-row:1}.front-scroll{scroll-snap-type:x mandatory}.front-lane{scroll-snap-align:center;min-width:84vw}.command-actions{display:grid;grid-template-columns:1fr 1fr}.command-actions .button{font-size:11px;padding:7px}.hand-row :deep(.card-tile){height:150px;flex-basis:107px}.hand-row{min-height:152px}.result-banner h1{font-size:34px}}
</style>
