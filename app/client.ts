export class Client {
    ws: WebSocket;

    constructor(config: {ip: string, port: number, tls: boolean}) {
        this.ws = new WebSocket((config.tls ? 'wss' : 'ws') + `://${config.ip}:${config.port}`);
    }
}
