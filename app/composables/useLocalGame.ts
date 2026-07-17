import {
  SeededRandom,
  createBattleSummary,
  createGame,
  createPlayerView,
  lockTurn,
  raiseBanner,
  submitTurnIntent,
  validateTurnIntent,
  withdraw,
  type CardDefinition,
  type DeploymentIntent,
  type FrontDefinition,
  type GameState,
  type PlayerView,
  type TurnIntent
} from '~/common/src/index';
import { CARD_BY_ID, CARDS, CATALOG_VERSION, FRONTS, PACK_VERSIONS, PRESET_DECKS } from '~/data/catalog';
import type { DeckChoice } from '~/utils/decks';
import { formatRuleError } from '~/utils/game-errors';

const HUMAN_ID = 'local-player';
const AI_ID = 'practice-ai';

const numberArg = (front: FrontDefinition, key: string, fallback: number): number => {
  const value = front.effectArgs?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const adjustedCost = (card: CardDefinition, front: FrontDefinition, turn: number, firstHere: boolean): number => {
  let cost = card.cost;
  if (front.effectId === 'cost_down') cost -= numberArg(front, 'amount', 1);
  if (front.effectId === 'cost_up') cost += numberArg(front, 'amount', 1);
  if (front.effectId === 'future_beacon' && card.era === String(front.effectArgs?.era ?? '未来时代')) cost -= numberArg(front, 'cost', 1);
  if (front.effectId === 'hand_cost_down' && card.cost >= numberArg(front, 'threshold', 4)) cost -= numberArg(front, 'amount', 1);
  if (front.effectId === 'low_cost_surcharge' && card.cost <= numberArg(front, 'threshold', 2)) cost += numberArg(front, 'amount', 1);
  if (front.effectId === 'final_turn_discount' && turn === numberArg(front, 'turn', 6)) cost -= numberArg(front, 'amount', 2);
  if (firstHere && front.effectId === 'first_card_discount') cost -= numberArg(front, 'amount', 1);
  if (firstHere && front.effectId === 'high_cost_discount' && card.cost >= numberArg(front, 'threshold', 5)) cost -= numberArg(front, 'amount', 2);
  return Math.max(1, Math.floor(cost));
};

const allowed = (card: CardDefinition, front: FrontDefinition): boolean =>
  !(front.effectId === 'ban_high_cost' && card.cost >= numberArg(front, 'threshold', 4))
  && !(front.effectId === 'ban_low_cost' && card.cost <= numberArg(front, 'threshold', 2));

const traitScore = (card: CardDefinition, front: FrontDefinition): number => {
  if (front.effectId === 'era_bonus' && card.era === front.effectArgs?.era) return 3;
  if (front.effectId === 'region_bonus' && card.region === front.effectArgs?.region) return 3;
  if (front.effectId === 'profession_bonus' && card.profession.includes(String(front.effectArgs?.professionIncludes ?? ''))) return 3;
  if (front.effectId === 'identity_bonus' && Array.isArray(front.effectArgs?.identities) && front.effectArgs.identities.includes(card.identity)) return 3;
  return 0;
};

const makeAiIntent = (state: GameState): TurnIntent => {
  const view = createPlayerView(state, AI_ID);
  const ai = view.players.find((player) => player.playerId === AI_ID);
  let energy = ai?.energy ?? 0;
  const rng = new SeededRandom((state.seed ^ state.turn * 0x9e3779b9) >>> 0);
  const laneCounts = new Map(view.fronts.map((front) => [front.definition.frontId, front.cards[AI_ID]?.length ?? 0]));
  const turnDeployments = new Map<string, number>();
  const deployments: DeploymentIntent[] = [];
  const hand = [...(ai?.hand ?? [])]
    .map((cardId) => ({ card: CARD_BY_ID[cardId], tie: rng.next() }))
    .filter((entry): entry is { card: CardDefinition; tie: number } => Boolean(entry.card))
    .sort((left, right) => {
      const leftValue = left.card.balance?.expectedTotalValue ?? left.card.power;
      const rightValue = right.card.balance?.expectedTotalValue ?? right.card.power;
      return rightValue / right.card.cost - leftValue / left.card.cost || left.tie - right.tie || left.card.cardId.localeCompare(right.card.cardId);
    });
  for (const { card } of hand) {
    const candidates = view.fronts
      .filter((front) => allowed(card, front.definition))
      .filter((front) => !front.deploymentBlocked[AI_ID])
      .filter((front) => (laneCounts.get(front.definition.frontId) ?? 0) < front.capacity[AI_ID]!)
      .filter((front) => front.definition.effectId !== 'single_deploy' || (turnDeployments.get(front.definition.frontId) ?? 0) < 1)
      .map((front) => {
        const firstHere = (turnDeployments.get(front.definition.frontId) ?? 0) === 0;
        const cost = adjustedCost(card, front.definition, view.turn, firstHere);
        const own = front.power[AI_ID] ?? 0;
        const opponent = Object.entries(front.power).find(([id]) => id !== AI_ID)?.[1] ?? 0;
        const value = card.balance?.expectedTotalValue ?? card.power;
        return { front, cost, score: value + traitScore(card, front.definition) - Math.abs(Number(own) - Number(opponent ?? 0)) * .08 + rng.next() };
      })
      .filter((candidate) => candidate.cost <= energy)
      .sort((left, right) => right.score - left.score || left.front.definition.frontId.localeCompare(right.front.definition.frontId));
    for (const candidate of candidates) {
      const proposed = [...deployments, { cardId: card.cardId, frontId: candidate.front.definition.frontId, order: deployments.length }];
      const result = validateTurnIntent(state, AI_ID, { requestId: 'local-ai-preview', turn: state.turn, deployments: proposed });
      if (!result.ok) continue;
      deployments.push(proposed.at(-1)!);
      laneCounts.set(candidate.front.definition.frontId, (laneCounts.get(candidate.front.definition.frontId) ?? 0) + 1);
      turnDeployments.set(candidate.front.definition.frontId, (turnDeployments.get(candidate.front.definition.frontId) ?? 0) + 1);
      energy -= candidate.cost;
      break;
    }
  }
  return { requestId: `local-ai-plan-${state.turn}`, turn: state.turn, deployments };
};

export function useLocalGame() {
  const game = useState<GameState | null>('aeonfront-local-game', () => null);
  const plan = useState<DeploymentIntent[]>('aeonfront-local-plan', () => []);
  const error = useState<string>('aeonfront-local-error', () => '');
  const savedGameId = useState<string>('aeonfront-saved-game', () => '');
  const startedAt = useState<number>('aeonfront-local-started-at', () => 0);
  const { selectedDeck, markUsed } = useDecks();
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
    if (!submitted.ok) throw new Error(formatRuleError(submitted.issues[0]?.code ?? 'AI_INVALID_PLAN'));
    const locked = lockTurn(game.value, AI_ID, `local-ai-lock-${game.value.turn}`);
    if (!locked.ok) throw new Error(formatRuleError(locked.issues[0]?.code ?? 'AI_LOCK_FAILED'));
  };

  const saveResult = () => {
    if (!game.value || game.value.phase !== 'ended' || savedGameId.value === game.value.gameId) return;
    savedGameId.value = game.value.gameId;
    const setup = game.value.setup.players.find((player) => player.playerId === HUMAN_ID);
    const summary = createBattleSummary(game.value, { startedAt: startedAt.value || Date.now(), endedAt: Date.now() });
    add({
      schemaVersion: 3,
      gameId: game.value.gameId,
      timestamp: Date.now(),
      mode: 'practice',
      playerId: HUMAN_ID,
      deckId: setup?.deckId ?? 'practice-deck',
      deckName: setup?.deckName ?? '演武牌组',
      catalogVersion: game.value.setup.catalogVersion ?? CATALOG_VERSION,
      packVersions: { ...(game.value.setup.packVersions ?? PACK_VERSIONS) },
      serializedGame: compactGameForHistory(game.value),
      summary,
      winner: game.value.winner
    });
  };

  const startPractice = (deck?: DeckChoice | string[]) => {
    const selected = selectedDeck.value;
    const cardIds = Array.isArray(deck) ? deck : deck?.cardIds ?? selected?.cardIds ?? PRESET_DECKS[0]!.cardIds;
    const deckId = Array.isArray(deck) ? selected?.deckId : deck?.deckId ?? selected?.deckId;
    const deckName = Array.isArray(deck) ? selected?.name : deck?.name ?? selected?.name;
    if (cardIds.length !== 12 || new Set(cardIds).size !== 12 || cardIds.some((cardId) => !CARD_BY_ID[cardId])) {
      error.value = '演武牌组必须包含十二张当前目录中的不同卡牌。';
      return false;
    }
    const aiDeck = PRESET_DECKS[1]!.cardIds;
    const seed = Date.now() >>> 0;
    startedAt.value = Date.now();
    game.value = createGame({
      gameId: `practice-${seed}`,
      seed,
      cards: CARDS,
      fronts: FRONTS,
      catalogVersion: CATALOG_VERSION,
      packVersions: { ...PACK_VERSIONS },
      players: [
        { playerId: HUMAN_ID, name: '玩家', deck: [...cardIds], deckId, deckName },
        { playerId: AI_ID, name: '演武官', deck: [...aiDeck], deckId: PRESET_DECKS[1]!.deckId, deckName: PRESET_DECKS[1]!.nameZh }
      ]
    });
    if (deckId) markUsed(deckId);
    plan.value = [];
    error.value = '';
    savedGameId.value = '';
    planAi();
    return true;
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
      error.value = formatRuleError(result.issues[0]?.code);
      return;
    }
    error.value = '';
    plan.value = normalized;
  };

  const clearPlan = () => { plan.value = []; error.value = ''; };
  const reorderPlan = (fromIndex: number, toIndex: number) => {
    const next = [...plan.value];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    plan.value = next.map((deployment, order) => ({ ...deployment, order }));
  };
  const lock = () => {
    if (!game.value || game.value.phase !== 'planning') return;
    const turn = game.value.turn;
    const result = submitTurnIntent(game.value, HUMAN_ID, { requestId: `local-player-plan-${turn}`, turn, deployments: plan.value });
    if (!result.ok) { error.value = formatRuleError(result.issues[0]?.code); return; }
    const locked = lockTurn(game.value, HUMAN_ID, `local-player-lock-${turn}`);
    if (!locked.ok) { error.value = formatRuleError(locked.issues[0]?.code); return; }
    plan.value = [];
    if (game.value.winner) saveResult();
    else planAi();
  };
  const banner = () => {
    if (!game.value) return;
    const result = raiseBanner(game.value, HUMAN_ID, `local-player-banner-${game.value.turn}`);
    if (!result.ok) error.value = formatRuleError(result.issues[0]?.code);
  };
  const retreat = () => {
    if (!game.value) return;
    const result = withdraw(game.value, HUMAN_ID, `local-player-withdraw-${game.value.turn}`);
    if (!result.ok) error.value = formatRuleError(result.issues[0]?.code);
    else saveResult();
  };

  const summary = computed(() => game.value?.phase === 'ended' ? createBattleSummary(game.value, { startedAt: startedAt.value || Date.now(), endedAt: Date.now() }) : null);

  return { game, view, human, plan, error, isEnded, summary, startPractice, toggleDeployment, reorderPlan, clearPlan, lock, banner, retreat };
}
