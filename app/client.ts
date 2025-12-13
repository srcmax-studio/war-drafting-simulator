import type { ClientAction } from "~/action";
import { PongAction, RequestCharactersAction, StatusAction } from "~/action";

const STATUS_INITIALIZED = 0;
const STATUS_SETUP = 10;
const STATUS_SYNCED = 20;

export class Client {
    ws: WebSocket;
    status: number = STATUS_INITIALIZED;
    characters: any[];
    messages: string[] = [];
    connected: boolean = false;
    disconnectEvent: CloseEvent;

    constructor(config: {ip: string, port: number, tls: boolean}) {
        this.ws = new WebSocket((config.tls ? 'wss' : 'ws') + `://${config.ip}:${config.port}`);

        this.ws.onopen = () => {
            this.connected = true;
            this.send(new StatusAction());
        };
    }

    send(action: ClientAction) {
        this.ws.send(action.serialize());
    }

    setup() {
        this.ws.onclose = (ev) => {
          this.connected = false;
          this.disconnectEvent = ev;
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.event === "ping") {
                this.send(new PongAction());
            }

            if (data.event === "charactersSync") {
                this.characters = data.characters;
                this.status = STATUS_SYNCED;
            }

            if (data.event === "message") {
                this.messages.push(data.message);
            }
        }

        this.send(new RequestCharactersAction());
        this.status = STATUS_SETUP;
    }
}
