import { PROTOCOL_VERSION, type CardDefinition, type DeploymentIntent, type FrontDefinition, type PlayerView } from '~/common/src/index';
import { CARD_BY_ID, CATALOG_VERSION, PACK_VERSIONS } from '~/data/catalog';
import { toSubmittedDeck, type DeckChoice } from '~/utils/decks';

interface OnlineGameView extends PlayerView { deadline: number | null }
interface RoomState {
  roomId: string;
  mode: string | null;
  players: Array<{
    playerId: string;
    name: string;
    connected: boolean;
    ready: boolean;
    deckSelected: boolean;
    deckId?: string | null;
    deckName?: string | null;
  }>;
}
interface ConnectOptions { url: string; name: string; password: string; deck: DeckChoice }

let socket: WebSocket | null = null;
let pending: ConnectOptions | null = null;
let reconnectToken = '';
let pendingSubmitRequestId = '';

const requestId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

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

export function useOnlineClient() {
  const status = useState<'idle' | 'connecting' | 'connected' | 'error'>('aeonfront-online-status', () => 'idle');
  const error = useState<string>('aeonfront-online-error', () => '');
  const playerId = useState<string>('aeonfront-online-player', () => '');
  const gameView = useState<OnlineGameView | null>('aeonfront-online-game', () => null);
  const room = useState<RoomState | null>('aeonfront-online-room', () => null);
  const plan = useState<DeploymentIntent[]>('aeonfront-online-plan', () => []);
  const serverStatus = useState<Record<string, unknown> | null>('aeonfront-server-status', () => null);
  const savedGameId = useState<string>('aeonfront-online-saved-game', () => '');
  const { add } = useMatchHistory();
  const { markUsed } = useDecks();

  const send = (action: Record<string, unknown>): string => {
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not connected.');
    const id = requestId();
    socket.send(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, requestId: id, ...action }));
    return id;
  };

  const sendJoin = () => {
    if (!pending) return;
    reconnectToken = localStorage.getItem(`aeonfront_reconnect_${pending.url}`) ?? '';
    send({ action: 'join', name: pending.name, ...(reconnectToken ? { reconnectToken } : {}) });
  };

  const saveHistory = (view: OnlineGameView) => {
    if (!pending || !view.winner || savedGameId.value === view.gameId) return;
    savedGameId.value = view.gameId;
    add({
      schemaVersion: 2,
      gameId: view.gameId,
      timestamp: Date.now(),
      mode: 'online',
      playerId: playerId.value,
      deckId: pending.deck.deckId,
      deckName: pending.deck.name,
      catalogVersion: view.catalogVersion ?? CATALOG_VERSION,
      packVersions: { ...PACK_VERSIONS },
      events: view.events,
      winner: view.winner
    });
  };

  const handle = (message: any) => {
    if (message.event === 'serverStatus') {
      serverStatus.value = message.payload;
      if (message.payload.catalogVersion && message.payload.catalogVersion !== CATALOG_VERSION) {
        error.value = `CATALOG_VERSION_MISMATCH: 服务器目录 ${message.payload.catalogVersion}，客户端目录 ${CATALOG_VERSION}`;
        status.value = 'error';
        return;
      }
      if (status.value === 'connecting' && pending) {
        if (pending.password) send({ action: 'authenticate', password: pending.password });
        else sendJoin();
      }
    } else if (message.event === 'authenticated') {
      sendJoin();
    } else if (message.event === 'joined') {
      playerId.value = message.payload.playerId;
      reconnectToken = message.payload.reconnectToken;
      if (pending) localStorage.setItem(`aeonfront_reconnect_${pending.url}`, reconnectToken);
      if (pending) {
        const deck = toSubmittedDeck(pending.deck, CATALOG_VERSION, { ...PACK_VERSIONS });
        send({ action: 'selectDeck', cardIds: deck.cardIds, catalogVersion: CATALOG_VERSION, deck });
      }
    } else if (message.event === 'reconnected') {
      playerId.value = message.payload.playerId;
      send({ action: 'requestSync' });
    } else if (message.event === 'deckSelected') {
      if (pending) markUsed(pending.deck.deckId);
      send({ action: 'ready' });
    } else if (message.event === 'roomState') {
      room.value = message.payload as RoomState;
    } else if (message.event === 'privateGameState') {
      const next = message.payload as OnlineGameView;
      if (gameView.value?.turn !== next.turn) { plan.value = []; error.value = ''; }
      gameView.value = next;
      status.value = 'connected';
      saveHistory(next);
    } else if (message.event === 'turnAccepted' && message.requestId === pendingSubmitRequestId) {
      pendingSubmitRequestId = '';
      error.value = '';
      if (gameView.value) send({ action: 'lockTurn', turn: gameView.value.turn });
    } else if (message.event === 'error') {
      error.value = `${message.payload.code}: ${message.payload.message}`;
      if (message.requestId === pendingSubmitRequestId) pendingSubmitRequestId = '';
      if (!gameView.value) status.value = 'error';
    }
  };

  const connect = (options: ConnectOptions) => {
    if (socket) socket.close();
    pending = options;
    status.value = 'connecting';
    error.value = '';
    gameView.value = null;
    savedGameId.value = '';
    pendingSubmitRequestId = '';
    socket = new WebSocket(options.url);
    socket.onmessage = (event) => {
      try { handle(JSON.parse(event.data)); }
      catch (cause) { error.value = cause instanceof Error ? cause.message : 'Invalid server response.'; status.value = 'error'; }
    };
    socket.onerror = () => { status.value = 'error'; error.value = '无法连接服务器'; };
    socket.onclose = () => { if (status.value !== 'idle' && !gameView.value?.winner) status.value = 'error'; };
  };

  const disconnect = () => { socket?.close(); socket = null; status.value = 'idle'; };
  const validatePlan = (deployments: DeploymentIntent[]): string => {
    const view = gameView.value;
    if (!view) return '战局尚未同步。';
    const player = view.players.find((candidate) => candidate.playerId === playerId.value);
    if (!player) return '玩家状态尚未同步。';
    let spent = 0;
    const perFront = new Map<string, number>();
    for (const deployment of deployments) {
      const card = CARD_BY_ID[deployment.cardId];
      const front = view.fronts.find((candidate) => candidate.definition.frontId === deployment.frontId);
      if (!card || !front) return '卡牌或战线不在当前目录中。';
      if (front.deploymentBlocked[playerId.value]) return '该战线当前禁止部署。';
      if (front.definition.effectId === 'ban_high_cost' && card.cost >= numberArg(front.definition, 'threshold', 4)) return '该战线禁止高费卡。';
      if (front.definition.effectId === 'ban_low_cost' && card.cost <= numberArg(front.definition, 'threshold', 2)) return '该战线禁止低费卡。';
      const plannedHere = perFront.get(deployment.frontId) ?? 0;
      const occupied = front.cards[playerId.value]?.length ?? 0;
      if (occupied + plannedHere >= (front.capacity[playerId.value] ?? 4)) return '该战线容量已满。';
      if (front.definition.effectId === 'single_deploy' && plannedHere >= 1) return '该战线每回合只能部署一张卡。';
      spent += adjustedCost(card, front.definition, view.turn, plannedHere === 0);
      perFront.set(deployment.frontId, plannedHere + 1);
    }
    return spent > player.energy ? `计划需要 ${spent} 军令，当前只有 ${player.energy}。` : '';
  };
  const toggleDeployment = (cardId: string, frontId: string) => {
    const existing = plan.value.findIndex((deployment) => deployment.cardId === cardId);
    const next = existing >= 0
      ? plan.value.filter((deployment) => deployment.cardId !== cardId).map((deployment, order) => ({ ...deployment, order }))
      : [...plan.value, { cardId, frontId, order: plan.value.length }];
    const issue = validatePlan(next);
    if (issue) { error.value = issue; return; }
    error.value = '';
    plan.value = next;
  };
  const clearPlan = () => { plan.value = []; error.value = ''; };
  const lock = () => {
    if (!gameView.value || pendingSubmitRequestId) return;
    const issue = validatePlan(plan.value);
    if (issue) { error.value = issue; return; }
    pendingSubmitRequestId = send({ action: 'submitTurn', intent: { requestId: 'client', turn: gameView.value.turn, deployments: plan.value } });
  };
  const banner = () => { if (gameView.value) send({ action: 'raiseBanner', turn: gameView.value.turn }); };
  const retreat = () => { if (gameView.value) send({ action: 'withdraw', turn: gameView.value.turn }); };
  const rematch = () => send({ action: 'requestRematch' });

  return { status, error, playerId, gameView, room, plan, serverStatus, connect, disconnect, toggleDeployment, clearPlan, lock, banner, retreat, rematch };
}
