<script setup lang="ts">
import { ArrowLeft, ArrowRight, Ban, Flag, GripVertical, History, LockKeyhole, RotateCcw, Signal, Skull, Swords, Timer, Undo2, X } from 'lucide-vue-next';
import type { CardDefinition, CardInstance, DeploymentIntent, FrontDefinition, GameEvent, PlayerView } from '~/common/src/index';
import { CARD_BY_ID, cardFallbackUrl, cardImageUrl } from '~/data/catalog';
import { frontArtAlt, frontArtUrl } from '~/data/front-art';
import { TRIGGER_LABELS, deploymentFailureLabel, eventLabel } from '~/utils/ability-text';
import { FRONT_COMPLEXITY_LABELS, frontPresentationLabels } from '~/utils/front-presentation';

interface GameView extends PlayerView { deadline?: number | null }
const props = defineProps<{ view: GameView; playerId: string; plan: DeploymentIntent[]; error?: string }>();
const emit = defineEmits<{ deploy: [cardId: string, frontId: string]; reorder: [fromIndex: number, toIndex: number]; clear: []; lock: []; banner: []; retreat: []; rematch: [] }>();
const selectedCardId = ref('');
const draggedCardId = ref('');
const detailCard = ref<CardDefinition | null>(null);
const detailInstance = ref<Partial<CardInstance> | null>(null);
const detailFront = ref<FrontDefinition | null>(null);
const eventsOpen = ref(false);
const confirmLock = ref(false);
const confirmRetreat = ref(false);
const now = ref(Date.now());
const online = useOnlineClient();
const { active, enqueue, skip } = useBattleAnimation();
const { animate } = useMotionSettings();
let timer: ReturnType<typeof setInterval> | null = null;
let initializedEvents = false;

onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 250); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });

watch(() => props.view.events, async (events) => {
  if (!initializedEvents && props.view.turn > 1) { enqueue(events, true); initializedEvents = true; return; }
  initializedEvents = true;
  enqueue(events);
}, { deep: true, immediate: true });
watch(active, async (entry) => {
  if (!entry) return;
  await nextTick();
  const instanceId = String(entry.event.payload.instanceId ?? entry.event.payload.sourceInstanceId ?? '');
  const frontId = String(entry.event.payload.frontId ?? entry.event.payload.to ?? '');
  const target = instanceId ? document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`) : frontId ? document.querySelector(`[data-front-id="${CSS.escape(frontId)}"]`) : document.querySelector('.battle-status');
  await animate(target, entry.cue.motion);
});

const player = computed(() => props.view.players.find((candidate) => candidate.playerId === props.playerId)!);
const opponent = computed(() => props.view.players.find((candidate) => candidate.playerId !== props.playerId)!);
const hand = computed(() => (player.value.hand ?? []).map((cardId) => CARD_BY_ID[cardId]).filter((card): card is CardDefinition => Boolean(card)));
const remainingSeconds = computed(() => props.view.deadline ? Math.max(0, Math.ceil((props.view.deadline - now.value) / 1000)) : null);
const plannedCost = computed(() => props.plan.reduce((sum, deployment) => sum + (CARD_BY_ID[deployment.cardId]?.cost ?? 0), 0));
const ownCards = (frontId: string) => props.view.fronts.find((front) => front.definition.frontId === frontId)?.cards[props.playerId] ?? [];
const enemyCards = (frontId: string) => props.view.fronts.find((front) => front.definition.frontId === frontId)?.cards[opponent.value.playerId] ?? [];
const planned = (frontId: string) => props.plan.filter((deployment) => deployment.frontId === frontId).map((deployment) => CARD_BY_ID[deployment.cardId]).filter(Boolean) as CardDefinition[];
const capacity = (front: GameView['fronts'][number], playerId: string) => front.capacity[playerId] ?? 4;
const canDeploy = (front: GameView['fronts'][number]) => props.view.phase === 'planning' && !player.value.locked && !front.deploymentBlocked[props.playerId]
  && ownCards(front.definition.frontId).length + planned(front.definition.frontId).length < capacity(front, props.playerId);
const instanceCard = (instance: Partial<CardInstance>) => typeof instance.cardId === 'string' ? CARD_BY_ID[instance.cardId] ?? null : null;
const currentPower = (instance: Partial<CardInstance>) => typeof instance.currentPower === 'number' ? instance.currentPower : instanceCard(instance)?.power ?? 0;
const modifierDelta = (instance: Partial<CardInstance>) => (instance.modifiers ?? []).reduce((sum, modifier) => sum + modifier.amount, 0);

const chooseFront = (frontId: string, cardId = selectedCardId.value || draggedCardId.value) => {
  if (!cardId) { const front = props.view.fronts.find((candidate) => candidate.definition.frontId === frontId); if (front?.revealed) detailFront.value = front.definition; return; }
  emit('deploy', cardId, frontId);
  selectedCardId.value = '';
  draggedCardId.value = '';
};
const selectHand = (card: CardDefinition) => {
  const deployment = props.plan.find((candidate) => candidate.cardId === card.cardId);
  if (deployment) { emit('deploy', card.cardId, deployment.frontId); selectedCardId.value = ''; }
  else selectedCardId.value = selectedCardId.value === card.cardId ? '' : card.cardId;
};
const startDrag = (event: DragEvent, cardId: string) => { draggedCardId.value = cardId; event.dataTransfer?.setData('text/plain', cardId); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; };
const drop = (event: DragEvent, frontId: string) => { const cardId = event.dataTransfer?.getData('text/plain') || draggedCardId.value; chooseFront(frontId, cardId); };
const reorder = (cardId: string, direction: -1 | 1) => {
  const index = props.plan.findIndex((deployment) => deployment.cardId === cardId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= props.plan.length) return;
  emit('reorder', index, targetIndex);
};
const inspect = (instance: Partial<CardInstance>) => { detailInstance.value = instance; detailCard.value = instanceCard(instance); };
const eventCard = (event: GameEvent) => typeof event.payload.sourceCardId === 'string' ? CARD_BY_ID[event.payload.sourceCardId] : typeof event.payload.cardId === 'string' ? CARD_BY_ID[event.payload.cardId] : undefined;
const eventAbility = (event: GameEvent) => eventCard(event)?.abilities?.find((ability) => ability.abilityId === event.payload.abilityId)?.nameZh;
const describeEvent = (event: GameEvent) => eventLabel(event, eventCard(event)?.nameZh, eventAbility(event));
const eventDetail = (event: GameEvent) => event.type === 'ability_started' ? TRIGGER_LABELS[event.payload.trigger as keyof typeof TRIGGER_LABELS] ?? '特殊时机' : event.type === 'ability_resolved' ? `${event.payload.targets ?? 0} 目标 · ${event.payload.changed ?? 0} 变化` : event.type === 'deployment_fizzled' ? deploymentFailureLabel(event.payload.reason) : '';
const lockNow = () => { confirmLock.value = false; emit('lock'); };
const retreatNow = () => { confirmRetreat.value = false; emit('retreat'); };
</script>

<template>
  <div class="battle-screen">
    <header class="battle-status">
      <div class="combatant enemy"><PlayerAvatar :name="opponent.name" size="small" status="game" /><span><strong>{{ opponent.name }}</strong><small>手牌 {{ opponent.handCount }} · 牌库 {{ opponent.deckCount }} · 阵亡 {{ opponent.graveyardCount }}</small></span><StatusBadge :tone="opponent.locked ? 'success' : 'warning'">{{ opponent.locked ? '已锁定' : '规划中' }}</StatusBadge></div>
      <div class="turn-cluster"><span>回合</span><strong>{{ view.turn }}<i>/6</i></strong><div><StatusBadge tone="info"><Swords :size="12" /> 制势 · {{ view.players.find(candidate => candidate.playerId===view.initiativePlayerId)?.name }}</StatusBadge><StatusBadge v-if="remainingSeconds!==null" :tone="remainingSeconds<=10?'danger':'neutral'"><Timer :size="12" /> {{ remainingSeconds }} 秒</StatusBadge></div></div>
      <div class="stake-cluster"><span>当前战功</span><strong>{{ view.stake.current }}</strong><small v-if="view.stake.pending">待生效 {{ view.stake.pending }}</small></div>
      <div class="network-cluster"><StatusBadge :tone="online.status.value==='reconnecting'?'danger':'success'"><Signal :size="12" /> {{ online.status.value==='reconnecting'?'重连中':online.latency.value!==null?`${online.latency.value} ms`:'本地' }}</StatusBadge><IconButton label="战场事件" @click="eventsOpen=true"><History :size="17" /></IconButton></div>
    </header>

    <section class="front-scroll" aria-label="三条战线">
      <article v-for="(front, frontIndex) in view.fronts" :key="front.definition.frontId" class="front-lane" :class="{ unrevealed:!front.revealed, selectable:selectedCardId&&canDeploy(front), blocked:!canDeploy(front) }" :data-front-id="front.definition.frontId" @dragover.prevent="canDeploy(front) && ($event.dataTransfer!.dropEffect='move')" @drop.prevent="canDeploy(front) && drop($event,front.definition.frontId)">
        <template v-if="front.revealed"><img class="front-art" :src="frontArtUrl(front.definition.frontId)" :alt="frontArtAlt(front.definition)" loading="eager"><div class="front-vignette" /></template>
        <div v-else class="front-fog"><LockKeyhole :size="28" /><span>战线 {{ frontIndex+1 }}</span><strong>未揭示</strong><small>第 {{ front.revealedTurn ?? frontIndex+1 }} 回合公开</small></div>

        <header class="front-header" @click="front.revealed && (detailFront=front.definition)"><span class="front-coordinate">0{{ frontIndex+1 }}</span><div><strong>{{ front.revealed?front.definition.nameZh:'战争迷雾' }}</strong><p>{{ front.revealed?front.definition.descriptionZh:'可部署伏兵，名称、场景与效果保持隐藏。' }}</p></div><div class="front-power"><span class="enemy-power">{{ front.power[opponent.playerId] ?? '?' }}</span><i>:</i><span class="own-power">{{ front.power[playerId] ?? 0 }}</span></div></header>

        <div class="lane-cards enemy-line" :style="{ '--capacity': Math.min(6,capacity(front,opponent.playerId)) }">
          <button v-for="instance in enemyCards(front.definition.frontId)" :key="instance.instanceId" type="button" class="board-card" :class="{ concealed:!instance.cardId }" :data-instance-id="instance.instanceId" @click="inspect(instance)">
            <template v-if="instanceCard(instance)"><img :src="cardImageUrl(instanceCard(instance)!)" :alt="instanceCard(instance)!.nameZh" @error="($event.target as HTMLImageElement).src=cardFallbackUrl(instanceCard(instance)!)"><span class="board-cost">{{ instance.currentCost ?? instanceCard(instance)!.cost }}</span><span class="board-power">{{ currentPower(instance) }}</span><small>{{ instanceCard(instance)!.nameZh }}</small></template>
            <template v-else><div class="card-back-mini"><LockKeyhole :size="16" /></div><small>伏兵</small></template>
          </button>
          <span v-if="enemyCards(front.definition.frontId).length===0" class="slot-count">敌军 0/{{ capacity(front,opponent.playerId) }}</span>
        </div>

        <button class="front-center" type="button" :disabled="!canDeploy(front) && !front.revealed" @click="chooseFront(front.definition.frontId)"><span v-if="front.deploymentBlocked[playerId]" class="blocked-label"><Ban :size="13" /> 禁止部署</span><span v-else-if="front.movementBlocked[playerId]" class="blocked-label"><Ban :size="13" /> 禁止调遣</span><span v-else class="capacity-label">我方容量 {{ ownCards(front.definition.frontId).length+planned(front.definition.frontId).length }}/{{ capacity(front,playerId) }}</span><strong v-if="selectedCardId">部署 {{ CARD_BY_ID[selectedCardId]?.nameZh }}</strong><strong v-else-if="front.revealed">查看战线档案</strong><strong v-else>在迷雾中部署</strong></button>

        <div class="lane-cards own-line" :style="{ '--capacity': Math.min(6,capacity(front,playerId)) }">
          <button v-for="instance in ownCards(front.definition.frontId)" :key="instance.instanceId" type="button" class="board-card" :data-instance-id="instance.instanceId" @click="inspect(instance)"><template v-if="instanceCard(instance)"><img :src="cardImageUrl(instanceCard(instance)!)" :alt="instanceCard(instance)!.nameZh" @error="($event.target as HTMLImageElement).src=cardFallbackUrl(instanceCard(instance)!)"><span class="board-cost">{{ instance.currentCost ?? instanceCard(instance)!.cost }}</span><span class="board-power" :class="{buffed:modifierDelta(instance)>0,debuffed:modifierDelta(instance)<0}">{{ currentPower(instance) }}</span><small>{{ instanceCard(instance)!.nameZh }}</small><i v-if="instance.moved" class="card-flag">调</i><i v-if="instance.silenced" class="card-flag second">默</i></template></button>
          <button v-for="card in planned(front.definition.frontId)" :key="`plan-${card.cardId}`" type="button" class="board-card planned" @click="emit('deploy',card.cardId,front.definition.frontId)"><img :src="cardImageUrl(card)" :alt="card.nameZh"><span class="board-cost">{{ card.cost }}</span><span class="board-power">{{ card.power }}</span><small>{{ card.nameZh }}</small></button>
          <button v-if="canDeploy(front)" type="button" class="deploy-slot" aria-label="部署到此战线" @click="chooseFront(front.definition.frontId)"><span>+</span></button>
        </div>
      </article>
    </section>

    <footer class="command-deck">
      <div class="player-strip"><div class="player-identity"><PlayerAvatar :name="player.name" size="small" status="game" /><span><strong>{{ player.name }}</strong><small>牌库 {{ player.deckCount }} · 手牌 {{ player.handCount }} · <Skull :size="12" /> {{ player.graveyardCount }}</small></span><StatusBadge :tone="player.locked?'success':'warning'">{{ player.locked?'已锁定':'等待锁定' }}</StatusBadge></div><div class="orders"><span>军令</span><strong>{{ player.energy }}</strong><small>计划 {{ plannedCost }}</small></div></div>
      <div class="hand-and-plan">
        <div class="hand-row" aria-label="手牌"><div v-for="card in hand" :key="card.cardId" class="hand-card-wrap" :class="{planned:plan.some(item=>item.cardId===card.cardId)}" :draggable="!player.locked" @dragstart="startDrag($event,card.cardId)" @dragend="draggedCardId=''" @mouseenter="void useAudioManager().playSfx('card-hover','interface')"><CardTile :card="card" compact :selected="selectedCardId===card.cardId||plan.some(item=>item.cardId===card.cardId)" :disabled="player.locked" @select="selectHand" @dblclick="detailCard=card" /></div><div v-if="hand.length===0" class="empty-hand">手牌已空</div></div>
        <div v-if="plan.length" class="plan-queue"><span class="queue-label"><GripVertical :size="14" /> 部署顺序</span><div v-for="(deployment,index) in plan" :key="deployment.cardId"><b>{{ index+1 }}</b><span>{{ CARD_BY_ID[deployment.cardId]?.nameZh }}</span><small>{{ view.fronts.find(front=>front.definition.frontId===deployment.frontId)?.definition.nameZh ?? '未揭示战线' }}</small><IconButton label="提前" :disabled="index===0" @click="reorder(deployment.cardId,-1)"><ArrowLeft :size="13" /></IconButton><IconButton label="延后" :disabled="index===plan.length-1" @click="reorder(deployment.cardId,1)"><ArrowRight :size="13" /></IconButton><IconButton label="撤销部署" @click="emit('deploy',deployment.cardId,deployment.frontId)"><X :size="13" /></IconButton></div></div>
      </div>
      <div v-if="selectedCardId" class="deployment-hint">已选择 {{ CARD_BY_ID[selectedCardId]?.nameZh }}，点击或拖到战线部署。</div>
      <div v-if="error" class="command-error" role="alert">{{ error }}</div>
      <div class="command-actions"><GameButton :disabled="player.locked||plan.length===0" @click="emit('clear')"><Undo2 :size="16" /> 撤销计划</GameButton><GameButton :disabled="player.locked||player.bannerUsed" @click="emit('banner')"><Flag :size="16" /> 举旗</GameButton><GameButton variant="danger" :disabled="player.locked" @click="confirmRetreat=true"><RotateCcw :size="16" /> 撤军</GameButton><GameButton variant="primary" :disabled="player.locked" @click="confirmLock=true"><LockKeyhole :size="16" /> {{ player.locked?'已锁定':'锁定计划' }}</GameButton></div>
    </footer>

    <Transition name="toast"><div v-if="active" class="battle-cue"><span>第 {{ active.event.turn }} 回合 · #{{ active.event.sequence }}</span><strong>{{ describeEvent(active.event) }}</strong><button type="button" @click="skip">跳过</button></div></Transition>

    <Drawer :open="eventsOpen" title="战场事件" @close="eventsOpen=false"><ol class="event-log"><li v-for="event in view.events.slice().reverse()" :key="event.sequence" :class="{ability:event.type.startsWith('ability_')}"><time>R{{ event.turn }} · #{{ event.sequence }}</time><span><strong>{{ describeEvent(event) }}</strong><small v-if="eventDetail(event)">{{ eventDetail(event) }}</small></span></li></ol></Drawer>
    <Drawer :open="Boolean(detailFront)" :title="detailFront?.nameZh ?? '战线档案'" @close="detailFront=null"><template v-if="detailFront"><img class="front-detail-art" :src="frontArtUrl(detailFront.frontId)" :alt="frontArtAlt(detailFront)"><span class="eyebrow">战线档案</span><h3>{{ detailFront.nameZh }}</h3><p>{{ detailFront.descriptionZh }}</p><dl class="front-detail-list"><div><dt>战术建议</dt><dd>{{ detailFront.strategyZh }}</dd></div><div><dt>复杂度</dt><dd>{{ FRONT_COMPLEXITY_LABELS[detailFront.complexity] }}</dd></div><div><dt>类别</dt><dd>{{ frontPresentationLabels(detailFront).join(' · ') }}</dd></div></dl></template></Drawer>
    <CardDetailModal :card="detailCard" @close="detailCard=null;detailInstance=null" />
    <ConfirmDialog :open="confirmLock" title="锁定本回合计划" :message="`将按当前顺序部署 ${plan.length} 张卡牌，使用约 ${plannedCost} 点军令。锁定后不能修改。`" confirm-label="锁定" @cancel="confirmLock=false" @confirm="lockNow" />
    <ConfirmDialog :open="confirmRetreat" title="确认撤军" message="撤军会立即结束本场对局，并按当前战功结算。" confirm-label="撤军" danger @cancel="confirmRetreat=false" @confirm="retreatNow" />
  </div>
</template>

<style scoped>
.battle-screen{min-height:calc(100vh - var(--header-height));padding:10px;background:#080c0b}.battle-status{min-height:66px;display:grid;grid-template-columns:minmax(220px,1fr) auto auto auto;align-items:center;gap:18px;padding:8px 14px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.combatant{min-width:0;display:flex;align-items:center;gap:9px}.combatant>span{min-width:0;display:grid}.combatant small{color:var(--color-text-muted);font-size:9px}.combatant .status-badge{margin-left:auto}.turn-cluster{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:0 6px;text-align:center}.turn-cluster>span{color:var(--color-text-muted);font-size:9px}.turn-cluster>strong{font-family:var(--font-numeric);font-size:25px}.turn-cluster>strong i{color:var(--color-text-muted);font-size:11px;font-style:normal}.turn-cluster>div{grid-column:1/-1;display:flex;gap:4px}.stake-cluster{display:grid;grid-template-columns:auto auto;align-items:center;gap:0 7px}.stake-cluster span,.stake-cluster small{color:var(--color-text-muted);font-size:8px}.stake-cluster strong{grid-row:span 2;font-family:var(--font-numeric);font-size:30px;color:var(--color-gold)}.network-cluster{display:flex;align-items:center;gap:6px}.front-scroll{height:min(570px,calc(100vh - var(--header-height) - 300px));min-height:390px;display:grid;grid-template-columns:repeat(3,minmax(270px,1fr));gap:8px;margin-top:8px;overflow-x:auto}.front-lane{position:relative;min-width:270px;display:grid;grid-template-rows:minmax(120px,1fr) auto minmax(120px,1fr);overflow:hidden;border:1px solid var(--border-subtle);background:#141917;transition:border-color 150ms ease}.front-lane.selectable{border-color:var(--color-jade);box-shadow:inset 0 0 0 1px rgba(77,156,131,.28)}.front-art,.front-vignette,.front-fog{position:absolute;inset:0;width:100%;height:100%}.front-art{object-fit:cover;object-position:center 46%;opacity:.62}.front-vignette{background:linear-gradient(rgba(4,7,6,.84),rgba(4,7,6,.16) 36%,rgba(4,7,6,.14) 63%,rgba(4,7,6,.88));pointer-events:none}.front-fog{z-index:0;display:grid;place-items:center;align-content:center;gap:4px;background:repeating-linear-gradient(135deg,#131917,#131917 18px,#1b2420 18px,#1b2420 36px);color:var(--color-text-muted);text-align:center}.front-fog strong{font-family:var(--font-display);font-size:18px;color:var(--color-text-secondary)}.front-fog span,.front-fog small{font-size:8px}.front-header{position:absolute;z-index:4;left:7px;right:7px;top:7px;min-height:60px;display:grid;grid-template-columns:26px 1fr auto;align-items:start;gap:7px;padding:7px;border:1px solid rgba(208,200,181,.18);background:rgba(7,11,9,.82);cursor:pointer}.front-coordinate{font-family:var(--font-numeric);font-size:16px;color:var(--color-copper)}.front-header>div:nth-child(2){min-width:0}.front-header strong{font-family:var(--font-display);font-size:12px}.front-header p{margin:2px 0 0;color:var(--color-text-muted);font-size:8px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.front-power{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:3px;font-family:var(--font-numeric);font-size:17px}.front-power i{color:var(--color-text-muted);font-size:8px}.enemy-power{color:var(--color-front-enemy)}.own-power{color:var(--color-front-own)}.lane-cards{position:relative;z-index:2;display:grid;grid-template-columns:repeat(var(--capacity),minmax(0,1fr));align-items:center;gap:4px;padding:72px 7px 7px}.enemy-line{align-items:end}.own-line{align-items:start;padding:7px 7px 44px}.board-card,.deploy-slot{position:relative;min-width:0;aspect-ratio:5/7;padding:0;overflow:hidden;border:1px solid rgba(220,224,219,.3);border-radius:var(--radius-sm);background:#252c28;cursor:pointer;transform-style:preserve-3d}.board-card:hover{border-color:var(--color-gold);z-index:3}.board-card img{width:100%;height:100%;object-fit:cover}.board-card small{position:absolute;left:0;right:0;bottom:0;padding:13px 2px 3px;background:linear-gradient(transparent,#0a0e0d);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.board-cost,.board-power{position:absolute;z-index:2;top:2px;width:19px;height:19px;display:grid;place-items:center;border-radius:50%;font-family:var(--font-numeric);font-size:8px;font-weight:800}.board-cost{left:2px;background:#286c78}.board-power{right:2px;background:#993f38}.board-power.buffed{background:#317f64}.board-power.debuffed{background:#70424c}.card-flag{position:absolute;z-index:2;left:2px;bottom:18px;width:16px;height:16px;display:grid;place-items:center;border:1px solid var(--border-subtle);background:#121715;color:var(--color-gold);font-size:7px;font-style:normal}.card-flag.second{left:20px;color:var(--color-danger)}.card-back-mini{height:100%;display:grid;place-items:center;color:var(--color-gold);background:repeating-linear-gradient(45deg,#202722,#202722 8px,#2a332e 8px,#2a332e 16px)}.board-card.planned{opacity:.6;border-style:dashed;border-color:var(--color-jade)}.slot-count{grid-column:1/-1;display:grid;place-items:center;color:rgba(190,200,194,.35);font-size:8px}.deploy-slot{display:grid;place-items:center;border-style:dashed;background:rgba(77,156,131,.06);color:var(--color-jade)}.deploy-slot span{font-size:24px}.front-center{position:relative;z-index:3;min-height:48px;display:grid;place-items:center;padding:5px 9px;border:solid var(--border-subtle);border-width:1px 0;background:rgba(12,16,14,.88);color:var(--color-text-secondary);cursor:pointer}.front-center strong{font-size:9px}.front-center:disabled{cursor:default}.blocked-label,.capacity-label{font-size:7px;color:var(--color-text-muted)}.blocked-label{display:flex;align-items:center;gap:3px;color:var(--color-danger)}.command-deck{margin-top:8px;padding:8px 12px 10px;border:1px solid var(--border-subtle);background:var(--color-surface-primary)}.player-strip{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}.player-identity{display:flex;align-items:center;gap:8px}.player-identity>span{display:grid}.player-identity small{display:flex;align-items:center;gap:3px;color:var(--color-text-muted);font-size:8px}.orders{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:0 6px}.orders>span,.orders small{color:var(--color-text-muted);font-size:8px}.orders strong{grid-row:span 2;font-family:var(--font-numeric);font-size:27px;color:var(--color-jade)}.hand-and-plan{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}.hand-row{min-width:0;min-height:152px;display:flex;gap:7px;overflow-x:auto;padding:2px 2px 6px}.hand-card-wrap{height:148px;flex:0 0 106px;cursor:grab}.hand-card-wrap:active{cursor:grabbing}.hand-card-wrap :deep(.card-tile){height:148px;width:106px}.hand-card-wrap.planned{opacity:.62}.empty-hand{min-width:180px;display:grid;place-items:center;color:var(--color-text-muted);border:1px dashed var(--border-subtle)}.plan-queue{width:280px;max-height:152px;overflow:auto;border-left:1px solid var(--border-subtle);padding-left:9px}.queue-label{min-height:24px;display:flex;align-items:center;gap:4px;color:var(--color-text-muted);font-size:8px}.plan-queue>div{min-height:38px;display:grid;grid-template-columns:22px 1fr 28px 28px 28px;align-items:center;gap:3px;border-top:1px solid var(--border-subtle)}.plan-queue b{font-family:var(--font-numeric);color:var(--color-gold)}.plan-queue>div>span{font-size:9px}.plan-queue small{grid-column:2;color:var(--color-text-muted);font-size:7px}.plan-queue .icon-button{width:26px;height:26px;flex-basis:26px;grid-row:1/3}.deployment-hint,.command-error{margin-top:5px;padding:5px 8px;font-size:9px}.deployment-hint{border-left:2px solid var(--color-info);color:var(--color-text-secondary)}.command-error{border-left:2px solid var(--color-danger);color:#ef8a82}.command-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:7px}.battle-cue{position:fixed;z-index:95;left:50%;top:calc(var(--header-height) + 86px);min-width:260px;display:grid;gap:2px;padding:9px 36px 9px 12px;border-left:3px solid var(--color-copper);background:rgba(8,12,10,.94);box-shadow:0 10px 30px rgba(0,0,0,.4);transform:translateX(-50%);text-align:center}.battle-cue span{color:var(--color-text-muted);font-size:7px}.battle-cue strong{font-size:10px}.battle-cue button{position:absolute;right:6px;top:6px;border:0;background:transparent;color:var(--color-text-muted);font-size:8px;cursor:pointer}.event-log{margin:0;padding:0;list-style:none}.event-log li{min-height:48px;display:grid;grid-template-columns:72px 1fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-subtle)}.event-log li.ability{box-shadow:inset 2px 0 var(--color-copper);padding-left:7px}.event-log time{color:var(--color-copper);font-family:var(--font-numeric);font-size:8px}.event-log span{display:grid}.event-log strong{font-size:10px}.event-log small{color:var(--color-text-muted);font-size:8px}.front-detail-art{width:100%;aspect-ratio:3/2;object-fit:cover;margin-bottom:14px}.drawer-content h3{margin:4px 0;font-family:var(--font-display);font-size:22px}.drawer-content>p{color:var(--color-text-secondary);line-height:1.7}.front-detail-list{margin:20px 0}.front-detail-list div{padding:10px 0;border-top:1px solid var(--border-subtle)}.front-detail-list dt{color:var(--color-text-muted);font-size:9px}.front-detail-list dd{margin:4px 0 0;font-size:11px}
@media(max-width:1120px){.battle-status{grid-template-columns:1fr auto auto}.network-cluster{grid-column:3}.front-scroll{height:520px}.plan-queue{display:none}}
@media(max-width:760px){.battle-screen{padding:6px}.battle-status{grid-template-columns:1fr auto;gap:8px}.combatant small{display:none}.combatant .status-badge{display:none}.turn-cluster{grid-row:2;grid-column:1/-1}.stake-cluster{grid-column:2;grid-row:1}.network-cluster{position:absolute;right:8px;top:calc(var(--header-height) + 76px);z-index:10}.network-cluster>.status-badge{display:none}.front-scroll{height:460px;min-height:460px;grid-template-columns:repeat(3,minmax(84vw,1fr));scroll-snap-type:x mandatory}.front-lane{scroll-snap-align:center}.command-deck{padding:7px}.hand-row{min-height:132px}.hand-card-wrap,.hand-card-wrap :deep(.card-tile){height:128px;width:91px;flex-basis:91px}.command-actions{display:grid;grid-template-columns:1fr 1fr}.command-actions .game-button{font-size:10px;padding:6px}.front-header p{display:none}.battle-cue{top:calc(var(--header-height) + 114px);max-width:calc(100vw - 24px)} }
</style>
