export abstract class ClientAction {
    abstract readonly action: string;

    serialize(): string {
        return JSON.stringify(this);
    }
}

export class PongAction extends ClientAction {
    action = "pong";
}

export class StatusAction extends ClientAction {
    action = "status";
}

export class RequestCharactersAction extends ClientAction {
    action = "requestCharacters";
}

export class ChatMessageAction extends ClientAction {
    action = "chatMessage";
    message: string;

    constructor(message: string) {
        super();
        this.message = message;
    }
}
