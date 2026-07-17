import {
  LOBBY_LIMITS,
  PROTOCOL_VERSION,
  type BattleSummary,
  type CardDefinition,
  type DeploymentIntent,
  type FrontDefinition,
  type LobbyChatMessage,
  type LobbySnapshot,
  type MatchmakingState,
  type PlayerView,
  type PresenceEntry,
  type RoomState,
  type RoomSummary,
  type ServerStatus,
  type SubmittedDeck
} from '~/common/src/index';
import { CARD_BY_ID, CATALOG_VERSION, PACK_VERSIONS } from '~/data/catalog';
import { toSubmittedDeck, type DeckChoice } from '~/utils/decks';
import { formatRuleError } from '~/utils/game-errors';
import { publicHistoryEvents } from '~/utils/online-history';
import { isFatalOnlineError, nextOnlineStatus, type OnlineStatus } from '~/utils/online-state';

interface OnlineGameView extends PlayerView { deadline: number | null }
interface ConnectOptions { url: string; name: string; password?: string }

let socket: WebSocket | null = null;
let pendingConnection: ConnectOptions | null = null;
let reconnectToken = '';
let pendingSubmitRequestId = '';
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let intentionalClose = false;
let authenticated = false;

const requestId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const idleMatchmaking = (): MatchmakingState => ({ status: 'idle', queuedAt: null, elapsedMs: 0, queueSize: 0, ticketId: null, roomId: null, acceptBy: null, acceptedPlayerIds: [] });

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
  const status = useState<OnlineStatus>('aeonfront-online-status-v3', () => 'idle');
  const error = useState<string>('aeonfront-online-error-v3', () => '');
  const playerId = useState<string>('aeonfront-online-player-v3', () => '');
  const serverStatus = useState<ServerStatus | null>('aeonfront-server-status-v3', () => null);
  const lobby = useState<LobbySnapshot | null>('aeonfront-lobby-v3', () => null);
  const presence = useState<PresenceEntry[]>('aeonfront-presence-v3', () => []);
  const rooms = useState<RoomSummary[]>('aeonfront-rooms-v3', () => []);
  const lobbyChat = useState<LobbyChatMessage[]>('aeonfront-lobby-chat-v3', () => []);
  const room = useState<RoomState | null>('aeonfront-online-room-v3', () => null);
  const matchmaking = useState<MatchmakingState>('aeonfront-matchmaking-v3', idleMatchmaking);
  const gameView = useState<OnlineGameView | null>('aeonfront-online-game-v3', () => null);
  const gameSummary = useState<BattleSummary | null>('aeonfront-online-summary-v3', () => null);
  const plan = useState<DeploymentIntent[]>('aeonfront-online-plan-v3', () => []);
  const latency = useState<number | null>('aeonfront-latency-v3', () => null);
  const reconnectAttempt = useState<number>('aeonfront-reconnect-attempt-v3', () => 0);
  const { add } = useMatchHistory();
  const { markUsed } = useDecks();
  const toast = useToast();

  const send = (action: Record<string, unknown>): string => {
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('尚未连接服务器。');
    const id = requestId();
    socket.send(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, requestId: id, ...action }));
    return id;
  };

  const sendJoin = () => {
    if (!pendingConnection) return;
    reconnectToken = localStorage.getItem(`aeonfront_reconnect_${pendingConnection.url}`) ?? reconnectToken;
    send({ action: 'join', name: pendingConnection.name, ...(reconnectToken ? { reconnectToken } : {}) });
  };

  const applyLobby = (snapshot: LobbySnapshot) => {
    lobby.value = snapshot;
    serverStatus.value = snapshot.server;
    presence.value = snapshot.presence;
    rooms.value = snapshot.rooms;
    lobbyChat.value = snapshot.chat;
    matchmaking.value = snapshot.matchmaking;
    if (!room.value && !gameView.value) status.value = snapshot.matchmaking.status === 'idle' ? 'lobby' : 'matchmaking';
  };

  const saveHistory = (summary: BattleSummary, serializedGame?: string) => {
    const self = summary.players.find((player) => player.playerId === playerId.value);
    if (!self) return;
    add({
      schemaVersion: 3,
      gameId: summary.gameId,
      timestamp: summary.endedAt ?? Date.now(),
      mode: 'online',
      playerId: playerId.value,
      deckId: self.deckId,
      deckName: self.deckName,
      catalogVersion: summary.catalogVersion || CATALOG_VERSION,
      packVersions: { ...PACK_VERSIONS },
      ...(serializedGame ? { serializedGame } : {}),
      events: publicHistoryEvents(summary),
      summary,
      winner: summary.winner
    });
  };

  const appendChat = (target: Ref<LobbyChatMessage[]>, message: LobbyChatMessage) => {
    target.value = [...target.value.filter((entry) => entry.messageId !== message.messageId), message].slice(-LOBBY_LIMITS.recentChatMessages);
  };

  const handle = (message: any) => {
    if (message.protocolVersion !== PROTOCOL_VERSION) { error.value = '服务器协议版本不兼容。'; status.value = 'error'; return; }
    status.value = nextOnlineStatus(status.value, String(message.event ?? ''), message.payload && typeof message.payload === 'object' ? message.payload : {});
    if (message.event === 'serverStatus') {
      serverStatus.value = message.payload as ServerStatus;
      if (message.payload.catalogVersion && message.payload.catalogVersion !== CATALOG_VERSION) { error.value = formatRuleError('CATALOG_VERSION_MISMATCH'); status.value = 'error'; return; }
      if (status.value === 'connecting' || status.value === 'reconnecting') {
        if (pendingConnection?.password && !authenticated) { status.value = 'authenticating'; send({ action: 'authenticate', password: pendingConnection.password }); }
        else sendJoin();
      }
    } else if (message.event === 'authenticated') {
      authenticated = true;
      sendJoin();
    } else if (message.event === 'joined' || message.event === 'reconnected') {
      playerId.value = message.payload.playerId;
      reconnectToken = message.payload.reconnectToken;
      if (pendingConnection) localStorage.setItem(`aeonfront_reconnect_${pendingConnection.url}`, reconnectToken);
      reconnectAttempts = 0;
      reconnectAttempt.value = 0;
      if (message.event === 'joined') send({ action: 'enterLobby' });
      else send({ action: 'requestSync' });
    } else if (message.event === 'lobbyEntered') {
      status.value = 'lobby';
      error.value = '';
    } else if (message.event === 'lobbySnapshot') {
      applyLobby(message.payload as LobbySnapshot);
    } else if (message.event === 'presenceUpdated') {
      presence.value = message.payload as PresenceEntry[];
    } else if (message.event === 'roomListSnapshot') {
      rooms.value = message.payload as RoomSummary[];
    } else if (message.event === 'roomCreated' || message.event === 'roomJoined' || message.event === 'roomUpdated' || message.event === 'roomState') {
      const state = message.payload as RoomState;
      room.value = state;
      rooms.value = [state, ...rooms.value.filter((candidate) => candidate.roomId !== state.roomId)];
      if (state.status !== 'playing') status.value = 'room';
    } else if (message.event === 'roomRemoved') {
      rooms.value = rooms.value.filter((candidate) => candidate.roomId !== message.payload.roomId);
    } else if (message.event === 'roomLeft') {
      if (!message.payload.roomId || room.value?.roomId === message.payload.roomId) room.value = null;
      if (status.value !== 'game') status.value = 'lobby';
    } else if (message.event === 'lobbyChatMessage') {
      appendChat(lobbyChat, message.payload as LobbyChatMessage);
    } else if (message.event === 'roomChatMessage') {
      const currentRoom = room.value as RoomState | null;
      if (currentRoom && currentRoom.roomId === message.payload.roomId) room.value = { ...currentRoom, chat: [...currentRoom.chat.filter((entry) => entry.messageId !== message.payload.messageId), message.payload].slice(-LOBBY_LIMITS.recentChatMessages) };
    } else if (message.event === 'matchmakingQueued' || message.event === 'matchmakingUpdated') {
      matchmaking.value = message.payload as MatchmakingState;
      status.value = matchmaking.value.status === 'idle' ? 'lobby' : 'matchmaking';
    } else if (message.event === 'matchFound') {
      matchmaking.value = message.payload as MatchmakingState;
      room.value = message.payload.room as RoomState;
      status.value = 'matchmaking';
      void useAudioManager().playSfx('success');
    } else if (message.event === 'matchCancelled') {
      matchmaking.value = idleMatchmaking();
      room.value = null;
      status.value = 'lobby';
      toast.push({ tone: 'warning', title: '匹配已取消', message: message.payload.reason });
    } else if (message.event === 'deckSelected') {
      toast.push({ tone: 'success', title: '牌组已确认', message: message.payload.name });
    } else if (message.event === 'gameStarting' || message.event === 'gameStarted') {
      status.value = 'game';
      gameSummary.value = null;
    } else if (message.event === 'privateGameState') {
      const next = message.payload as OnlineGameView;
      if (gameView.value?.turn !== next.turn) { plan.value = []; error.value = ''; }
      gameView.value = next;
      status.value = 'game';
    } else if (message.event === 'turnAccepted' && message.requestId === pendingSubmitRequestId) {
      pendingSubmitRequestId = '';
      error.value = '';
      if (gameView.value) send({ action: 'lockTurn', gameId: gameView.value.gameId, turn: gameView.value.turn });
    } else if (message.event === 'gameEnded') {
      gameSummary.value = message.payload.summary as BattleSummary;
      saveHistory(gameSummary.value, message.payload.serializedGame);
    } else if (message.event === 'returnedToLobby') {
      gameView.value = null;
      gameSummary.value = null;
      room.value = null;
      matchmaking.value = idleMatchmaking();
      plan.value = [];
      status.value = 'lobby';
    } else if (message.event === 'pong') {
      if (typeof message.payload.serverTime === 'number') latency.value = Math.max(0, Math.round(Date.now() - message.payload.serverTime));
    } else if (message.event === 'error' || message.event === 'roomError') {
      error.value = formatRuleError(message.payload.code) || message.payload.message;
      if (message.requestId === pendingSubmitRequestId) pendingSubmitRequestId = '';
      if (isFatalOnlineError(message.payload.code)) status.value = 'error';
      else toast.push({ tone: 'danger', title: '操作未完成', message: error.value });
    }
  };

  const startPing = (activeSocket: WebSocket) => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (socket === activeSocket && activeSocket.readyState === WebSocket.OPEN) send({ action: 'pong', clientTime: Date.now() });
    }, 5_000);
  };

  const openSocket = () => {
    if (!pendingConnection) return;
    let activeSocket: WebSocket;
    try { activeSocket = new WebSocket(pendingConnection.url); }
    catch { status.value = 'error'; error.value = '服务器地址格式不正确。'; return; }
    socket = activeSocket;
    activeSocket.onmessage = (event) => {
      if (socket !== activeSocket) return;
      try { handle(JSON.parse(event.data)); } catch { error.value = '服务器返回了无法识别的数据。'; }
    };
    activeSocket.onerror = () => { if (socket === activeSocket) error.value = '无法连接服务器。'; };
    activeSocket.onopen = () => { if (socket === activeSocket) startPing(activeSocket); };
    activeSocket.onclose = () => {
      if (socket !== activeSocket) return;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      socket = null;
      if (intentionalClose || !pendingConnection || gameSummary.value) return;
      reconnectAttempts += 1;
      reconnectAttempt.value = reconnectAttempts;
      if (reconnectAttempts > 5) { status.value = 'error'; error.value = '重连失败，请返回服务器浏览重新连接。'; return; }
      status.value = 'reconnecting';
      reconnectTimer = setTimeout(openSocket, Math.min(8_000, 500 * 2 ** (reconnectAttempts - 1)));
    };
  };

  const connect = (options: ConnectOptions) => {
    if (socket) { intentionalClose = true; socket.close(); }
    if (reconnectTimer) clearTimeout(reconnectTimer);
    pendingConnection = { ...options, url: options.url.trim(), name: options.name.trim().slice(0, 24) };
    intentionalClose = false;
    authenticated = false;
    status.value = 'connecting';
    error.value = '';
    serverStatus.value = null;
    room.value = null;
    gameView.value = null;
    gameSummary.value = null;
    reconnectAttempts = 0;
    openSocket();
  };

  const disconnect = () => {
    intentionalClose = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pingTimer) clearInterval(pingTimer);
    socket?.close();
    socket = null;
    status.value = 'idle';
    room.value = null;
    gameView.value = null;
    matchmaking.value = idleMatchmaking();
  };

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

  const submittedDeck = (deck: DeckChoice): SubmittedDeck => toSubmittedDeck(deck, CATALOG_VERSION, { ...PACK_VERSIONS });
  const clearPlan = () => { plan.value = []; error.value = ''; };
  const reorderPlan = (fromIndex: number, toIndex: number) => {
    const next = [...plan.value];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    plan.value = next.map((deployment, order) => ({ ...deployment, order }));
  };
  const lock = () => {
    if (!gameView.value || pendingSubmitRequestId) return;
    const issue = validatePlan(plan.value);
    if (issue) { error.value = issue; return; }
    pendingSubmitRequestId = send({ action: 'submitTurn', gameId: gameView.value.gameId, intent: { requestId: 'client', turn: gameView.value.turn, deployments: plan.value } });
  };
  const banner = () => { if (gameView.value) send({ action: 'raiseBanner', gameId: gameView.value.gameId, turn: gameView.value.turn }); };
  const retreat = () => { if (gameView.value) send({ action: 'withdraw', gameId: gameView.value.gameId, turn: gameView.value.turn }); };
  const rematch = () => { if (gameView.value) send({ action: 'requestRematch', gameId: gameView.value.gameId }); };

  return {
    status, error, playerId, serverStatus, lobby, presence, rooms, lobbyChat, room, matchmaking, gameView, gameSummary, plan, latency, reconnectAttempt,
    connect, disconnect,
    requestLobby: () => send({ action: 'requestLobbySnapshot' }),
    requestRooms: (query = '', joinableOnly = false) => send({ action: 'requestRoomList', query, joinableOnly }),
    createRoom: (options: Record<string, unknown>) => send({ action: 'createRoom', room: options }),
    joinRoom: (roomId: string, password = '') => send({ action: 'joinRoom', roomId, ...(password ? { password } : {}) }),
    leaveRoom: () => room.value && send({ action: 'leaveRoom', roomId: room.value.roomId }),
    updateRoom: (patch: Record<string, unknown>) => room.value && send({ action: 'updateRoom', roomId: room.value.roomId, patch }),
    kickPlayer: (targetPlayerId: string) => room.value && send({ action: 'kickPlayer', roomId: room.value.roomId, playerId: targetPlayerId }),
    selectDeck: (deck: DeckChoice) => { if (room.value) { markUsed(deck.deckId); const submitted = submittedDeck(deck); return send({ action: 'selectDeck', roomId: room.value.roomId, cardIds: submitted.cardIds, catalogVersion: submitted.catalogVersion, deck: submitted }); } },
    setReady: (ready: boolean) => room.value && send({ action: 'setReady', roomId: room.value.roomId, ready }),
    sendLobbyChat: (message: string) => send({ action: 'sendLobbyChat', message: message.slice(0, LOBBY_LIMITS.chatMessage) }),
    sendRoomChat: (message: string) => room.value && send({ action: 'sendRoomChat', roomId: room.value.roomId, message: message.slice(0, LOBBY_LIMITS.chatMessage) }),
    joinMatchmaking: (deck: DeckChoice) => { markUsed(deck.deckId); return send({ action: 'joinMatchmaking', deck: submittedDeck(deck) }); },
    leaveMatchmaking: () => send({ action: 'leaveMatchmaking' }),
    acceptMatch: () => matchmaking.value.roomId && send({ action: 'acceptMatch', roomId: matchmaking.value.roomId }),
    declineMatch: () => matchmaking.value.roomId && send({ action: 'declineMatch', roomId: matchmaking.value.roomId }),
    returnToLobby: () => send({ action: 'returnToLobby', ...(gameView.value ? { gameId: gameView.value.gameId } : {}) }),
    toggleDeployment, reorderPlan, clearPlan, lock, banner, retreat, rematch
  };
}
