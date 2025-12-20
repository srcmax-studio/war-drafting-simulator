import { type ClientAction, HoverAction } from "~/action";
import { PongAction, RequestCharactersAction, StatusAction } from "~/action";
import { useClient } from "~/composables/useClient";
import { type Character, PHASE_DRAFT, PHASE_LOBBY, PlayerDeck } from "~/common/common";

export const STATUS_INITIALIZED = 0;
export const STATUS_SETUP = 10;
export const STATUS_SYNCED = 20;

export class Client {
    ws: WebSocket;
    playerName: string;
    status: number = STATUS_INITIALIZED;
    characters: any[];
    messages: string[] = [];
    connected: boolean = false;
    disconnectEvent: CloseEvent;
    gameStarted = false;
    initiative: Player | null;
    decks = {};
    pack: Character[] = [];
    serverClockOffset: number = undefined;
    ping: number = -1;
    draftStage: number = -1;
    draftRound: number = -1;
    actionEndTime: number = -1;
    opponentHovering: string;
    selectedFromPack: string;

    constructor(config: {ip: string, port: number, tls: boolean}, playerName: string) {
        this.playerName = playerName;
        this.ws = new WebSocket((config.tls ? 'wss' : 'ws') + `://${config.ip}:${config.port}`);

        this.ws.onopen = () => {
            this.connected = true;
            this.send(new StatusAction());
        };
    }

    send(action: ClientAction) {
        this.ws.send(action.serialize());
    }

    updatePing(ping: number) {
        if (ping < 0) {
            this.ping = 0;
        }
        this.ping = ping;
    }

    syncServerClock(clientSentAt: number, serverTime: number) {
        const T1 = clientSentAt;
        const T2 = serverTime;
        const T3 = Date.now();

        this.ping = T3 - T2;

        const rtt = T3 - T1;

        const estimatedServerTimeNow = T2 + (rtt / 2);
        const offset  = estimatedServerTimeNow - T3;
        if (this.serverClockOffset === undefined) {
            this.serverClockOffset = offset;
        } else {
            this.serverClockOffset = this.serverClockOffset * .8 + offset * .2;
        }
    }

    getPlayer() {
        const { players } = useClient();

        for (const player of players.value) {
            if (player.name === this.playerName) {
                return player;
            }
        }
    }

    hasInitiative() {
        return this.initiative === this.getPlayer();
    }

    getOpponentPlayer() {
        const { players } = useClient();

        for (const player of players.value) {
            if (player.name !== this.playerName) {
                return player;
            }
        }
    }

    setInitiative(initiativePlayer: string) {
        this.initiative = initiativePlayer === this.getPlayer().name ? this.getPlayer() : this.getOpponentPlayer();
    }

    setup() {
        this.ws.onclose = (ev) => {
          this.connected = false;
          this.disconnectEvent = ev;
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.event === "ping") {
                this.send(new PongAction(Date.now()));
            }

            if (data.event === "syncClock") {
                this.syncServerClock(data.clientSentAt, data.serverTime);
            }

            if (data.event === "charactersSync") {
                const { serverState } = useClient();

                if (data.characters.length !== serverState.value.loadedCharacters) {
                    this.ws.close(4000, `角色数据不匹配。(${data.characters.length}, ${serverState.value.loadedCharacters})`);
                }

                this.characters = data.characters;
                this.status = STATUS_SYNCED;
            }

            if (data.event === "message") {
                this.messages.push(data.message);
            }

            if (data.event === "playerlist") {
                const { players } = useClient();

                players.value = data.players;
            }

            if (data.event === 'gameStart') {
                const { serverState } = useClient();

                this.setInitiative(data.initiativePlayer);
                for (const name of [this.getPlayer().name, this.getOpponentPlayer().name]) {
                    let deck = new PlayerDeck(name);
                    deck.player = name;
                    this.decks[name] = deck;
                }

                this.gameStarted = true;
                setTimeout(() => {
                    serverState.value.phase = PHASE_DRAFT;
                    this.messages.push(`你在首轮中${this.hasInitiative() ? '先手' : '后手'}抽取卡牌。`);
                }, 3000);
            }

            if (data.event === 'gameEnd') {
                const { serverState } = useClient();
                serverState.value.phase = PHASE_LOBBY;

                this.gameStarted = false;
                this.decks = {};
                this.draftStage = -1;
                this.draftRound = -1;
            }

            if (data.event === 'draft') {
                const { players } = useClient();

                players.value = data.players;
                this.draftStage = data.draftStage;
                this.draftRound = data.round;
                this.pack = data.characters;
                this.actionEndTime = data.endTime;
                this.selectedFromPack = null;
                this.setInitiative(data.initiativePlayer);
            }

            if (data.event === 'opponentHover') {
                this.opponentHovering = data.hovering;
            }

            if (data.event === 'opponentUnhover') {
                this.opponentHovering = null;
            }

            if (data.event === 'select') {
                this.selectedFromPack = data.selected;
            }

            if (data.event === 'deckUpdate') {
                for (const deck of data.decks) {
                    this.decks[deck.name] = PlayerDeck.deserialize(deck.data,
                        (name: string) => this.characters.find(c => c.名字 === name));

                    console.log(this.decks);
                }
            }
        }

        this.send(new RequestCharactersAction());
        this.status = STATUS_SETUP;
    }
}
