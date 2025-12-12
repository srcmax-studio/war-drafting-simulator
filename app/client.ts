export class Client {
    ws: WebSocket;

    constructor(config: {ip: string, port: number}) {
        this.ws = new WebSocket(`ws://${config.ip}:${config.port}`);
    }
}
