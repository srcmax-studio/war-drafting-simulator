import {
  createGame,
  createPlayerView,
  lockTurn,
  raiseBanner,
  serializeGame,
  submitTurnIntent,
  validateTurnIntent,
  withdraw,
  type DeploymentIntent,
  type GameState,
  type PlayerView,
  type TurnIntent
} from '~/common/src/index';
import { CARD_BY_ID, CARDS, FRONTS, PRESET_DECKS } from '~/data/catalog';

const HUMAN_ID = 'local-player';
const AI_ID = 'practice-ai';

const effectiveCost = (cardId: string, effectId: string): number => {
  const card = CARD_BY_ID[cardId];
  if (!card) return 99;
  if (effectId === 'cost_down') return Math.max(1, card.cost - 1);
  if (effectId === 'cost_up') return card.cost + 1;
  return card.cost;
};

const makeAiIntent = (state: GameState): TurnIntent => {
  const view = createPlayerView(state, AI_ID);
  const ai = view.players.find((player) => player.playerId === AI_ID);
  let energy = ai?.energy ?? 0;
  const laneCounts = new Map(view.fronts.map((front) => [front.definition.frontId, front.cards[AI_ID]?.length ?? 0]));
  const deployments: DeploymentIntent[] = [];
  const hand = [...(ai?.hand ?? [])].sort((left, right) => {
    const leftCard = CARD_BY_ID[left]!;
    const rightCard = CARD_BY_ID[right]!;
    return (rightCard.power / rightCard.cost) - (leftCard.power / leftCard.cost) || left.localeCompare(right);
  });
  for (const cardId of hand) {
    const card = CARD_BY_ID[cardId]!;
    const targets = view.fronts.filter((front) => {
      if (front.definition.effectId === 'ban_high_cost' && card.cost >= 4) return false;
      if (front.definition.effectId === 'ban_low_cost' && card.cost <= 2) return false;
      const capacity = front.definition.effectId === 'capacity_up' ? 5 : front.definition.effectId === 'capacity_down' ? 3 : 4;
      return (laneCounts.get(front.definition.frontId) ?? 0) < capacity;
    }).sort((left, right) => {
      const leftOwn = left.power[AI_ID] ?? 0;
      const rightOwn = right.power[AI_ID] ?? 0;
      const leftEnemy = Object.entries(left.power).find(([id]) => id !== AI_ID)?.[1] ?? 0;
      const rightEnemy = Object.entries(right.power).find(([id]) => id !== AI_ID)?.[1] ?? 0;
      return (leftOwn - leftEnemy) - (rightOwn - rightEnemy);
    });
    const target = targets.find((front) => effectiveCost(cardId, front.definition.effectId) <= energy);
    if (!target) continue;
    const cost = effectiveCost(cardId, target.definition.effectId);
    deployments.push({ cardId, frontId: target.definition.frontId, order: deployments.length });
    laneCounts.set(target.definition.frontId, (laneCounts.get(target.definition.frontId) ?? 0) + 1);
    energy -= cost;
  }
  return { requestId: `local-ai-plan-${state.turn}`, turn: state.turn, deployments };
};

export function useLocalGame() {
  const game = useState<GameState | null>('aeonfront-local-game', () => null);
  const plan = useState<DeploymentIntent[]>('aeonfront-local-plan', () => []);
  const error = useState<string>('aeonfront-local-error', () => '');
  const savedGameId = useState<string>('aeonfront-saved-game', () => '');
  const { selectedDeck } = useDecks();
  const { add } = useMatchHistory();

  const view = computed<PlayerView | null>(() => game.value ? createPlayerView(game.value, HUMAN_ID) : null);
  const human = computed(() => view.value?.players.find((player) => player.playerId === HUMAN_ID));
  const isEnded = computed(() => game.value?.phase === 'ended');

  const planAi = () => {
    if (!game.value || game.value.phase !== 'planning') return;
    const ai = game.value.players.find((player) => player.playerId === AI_ID);
    if (!ai || ai.locked) return;
    const intent = makeAiIntent(game.value);
    const submitted = submitTurnIntent(game.value, AI_ID, intent);
    if (!submitted.ok) throw new Error(submitted.issues[0]?.message ?? 'AI plan rejected.');
    const locked = lockTurn(game.value, AI_ID, `local-ai-lock-${game.value.turn}`);
    if (!locked.ok) throw new Error(locked.issues[0]?.message ?? 'AI lock rejected.');
  };

  const saveResult = () => {
    if (!game.value || game.value.phase !== 'ended' || savedGameId.value === game.value.gameId) return;
    savedGameId.value = game.value.gameId;
    add({
      gameId: game.value.gameId,
      timestamp: Date.now(),
      mode: 'practice',
      playerId: HUMAN_ID,
      deckName: selectedDeck.value?.name ?? '演武牌组',
      serializedGame: serializeGame(game.value),
      winner: game.value.winner
    });
  };

  const startPractice = (cardIds?: string[]) => {
    const humanDeck = cardIds ?? selectedDeck.value?.cardIds ?? PRESET_DECKS[0]!.cardIds;
    const aiDeck = PRESET_DECKS[1]!.cardIds;
    const seed = Date.now() >>> 0;
    game.value = createGame({
      gameId: `practice-${seed}`,
      seed,
      cards: CARDS,
      fronts: FRONTS,
      players: [
        { playerId: HUMAN_ID, name: '玩家', deck: [...humanDeck] },
        { playerId: AI_ID, name: '演武官', deck: [...aiDeck] }
      ]
    });
    plan.value = [];
    error.value = '';
    savedGameId.value = '';
    planAi();
  };

  const toggleDeployment = (cardId: string, frontId: string) => {
    if (!game.value || game.value.phase !== 'planning') return;
    const existing = plan.value.findIndex((deployment) => deployment.cardId === cardId);
    const next = existing >= 0
      ? plan.value.filter((deployment) => deployment.cardId !== cardId)
      : [...plan.value, { cardId, frontId, order: plan.value.length }];
    const normalized = next.map((deployment, order) => ({ ...deployment, order }));
    const result = validateTurnIntent(game.value, HUMAN_ID, { requestId: 'local-preview', turn: game.value.turn, deployments: normalized });
    if (!result.ok) {
      error.value = result.issues[0]?.message ?? '行动不合法';
      return;
    }
    error.value = '';
    plan.value = normalized;
  };

  const clearPlan = () => { plan.value = []; error.value = ''; };

  const lock = () => {
    if (!game.value || game.value.phase !== 'planning') return;
    const turn = game.value.turn;
    const result = submitTurnIntent(game.value, HUMAN_ID, { requestId: `local-player-plan-${turn}`, turn, deployments: plan.value });
    if (!result.ok) { error.value = result.issues[0]?.message ?? '行动不合法'; return; }
    const locked = lockTurn(game.value, HUMAN_ID, `local-player-lock-${turn}`);
    if (!locked.ok) { error.value = locked.issues[0]?.message ?? '无法锁定'; return; }
    plan.value = [];
    if (game.value.winner) saveResult();
    else planAi();
  };

  const banner = () => {
    if (!game.value) return;
    const result = raiseBanner(game.value, HUMAN_ID, `local-player-banner-${game.value.turn}`);
    if (!result.ok) error.value = result.issues[0]?.message ?? '无法举旗';
  };
  const retreat = () => {
    if (!game.value) return;
    const result = withdraw(game.value, HUMAN_ID, `local-player-withdraw-${game.value.turn}`);
    if (!result.ok) error.value = result.issues[0]?.message ?? '无法撤军';
    else saveResult();
  };

  return { game, view, human, plan, error, isEnded, startPractice, toggleDeployment, clearPlan, lock, banner, retreat };
}
