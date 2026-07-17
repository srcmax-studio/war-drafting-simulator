import { PROTOCOL_VERSION, type DeploymentIntent, type PlayerView } from '~/common/src/index';
import type { SavedDeck } from './useDecks';

interface OnlineGameView extends PlayerView { deadline: number | null }
interface RoomState { roomId: string; mode: string | null; players: Array<{ playerId: string; name: string; connected: boolean; ready: boolean; deckSelected: boolean }> }
interface ConnectOptions { url: string; name: string; password: string; deck: SavedDeck }

let socket: WebSocket | null = null;
let pending: ConnectOptions | null = null;
let reconnectToken = '';

const requestId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function useOnlineClient() {
  const status = useState<'idle' | 'connecting' | 'connected' | 'error'>('aeonfront-online-status', () => 'idle');
  const error = useState<string>('aeonfront-online-error', () => '');
  const playerId = useState<string>('aeonfront-online-player', () => '');
  const gameView = useState<OnlineGameView | null>('aeonfront-online-game', () => null);
  const room = useState<RoomState | null>('aeonfront-online-room', () => null);
  const plan = useState<DeploymentIntent[]>('aeonfront-online-plan', () => []);
  const serverStatus = useState<Record<string, unknown> | null>('aeonfront-server-status', () => null);

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

  const handle = (message: any) => {
    if (message.event === 'serverStatus') {
      serverStatus.value = message.payload;
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
      if (pending) send({ action: 'selectDeck', cardIds: pending.deck.cardIds });
    } else if (message.event === 'reconnected') {
      playerId.value = message.payload.playerId;
      send({ action: 'requestSync' });
    } else if (message.event === 'deckSelected') {
      send({ action: 'ready' });
    } else if (message.event === 'roomState') {
      room.value = message.payload as RoomState;
    } else if (message.event === 'privateGameState') {
      const next = message.payload as OnlineGameView;
      if (gameView.value?.turn !== next.turn) plan.value = [];
      gameView.value = next;
      status.value = 'connected';
    } else if (message.event === 'error') {
      error.value = `${message.payload.code}: ${message.payload.message}`;
      status.value = 'error';
    }
  };

  const connect = (options: ConnectOptions) => {
    if (socket) socket.close();
    pending = options;
    status.value = 'connecting';
    error.value = '';
    socket = new WebSocket(options.url);
    socket.onmessage = (event) => {
      try { handle(JSON.parse(event.data)); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Invalid server response.'; }
    };
    socket.onerror = () => { status.value = 'error'; error.value = '无法连接服务器'; };
    socket.onclose = () => { if (status.value !== 'idle') status.value = 'error'; };
  };

  const disconnect = () => { socket?.close(); socket = null; status.value = 'idle'; };
  const toggleDeployment = (cardId: string, frontId: string) => {
    const existing = plan.value.findIndex((deployment) => deployment.cardId === cardId);
    plan.value = existing >= 0
      ? plan.value.filter((deployment) => deployment.cardId !== cardId).map((deployment, order) => ({ ...deployment, order }))
      : [...plan.value, { cardId, frontId, order: plan.value.length }];
  };
  const clearPlan = () => { plan.value = []; };
  const lock = () => {
    if (!gameView.value) return;
    send({ action: 'submitTurn', intent: { requestId: 'client', turn: gameView.value.turn, deployments: plan.value } });
    send({ action: 'lockTurn', turn: gameView.value.turn });
  };
  const banner = () => { if (gameView.value) send({ action: 'raiseBanner', turn: gameView.value.turn }); };
  const retreat = () => { if (gameView.value) send({ action: 'withdraw', turn: gameView.value.turn }); };
  const rematch = () => send({ action: 'requestRematch' });

  return { status, error, playerId, gameView, room, plan, serverStatus, connect, disconnect, toggleDeployment, clearPlan, lock, banner, retreat, rematch };
}
