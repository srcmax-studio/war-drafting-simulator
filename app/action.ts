export abstract class ClientAction {
    abstract readonly action: string;

    serialize(): string {
        return JSON.stringify(this);
    }
}

export class PongAction extends ClientAction {
    action = "pong";
    clientSentAt: number;

    constructor(clientSentAt: number) {
        super();
        this.clientSentAt = clientSentAt;
    }
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

export class ReadyAction extends ClientAction {
    action = "ready";
}

export class HoverAction extends ClientAction {
    action = "hover";
    hovering: string;

    constructor(hovering: string) {
        super();
        this.hovering = hovering;
    }
}

export class UnhoverAction extends ClientAction {
    action = "unhover";
}

export class SelectAction extends ClientAction {
    action = "select";
    selected: string;

    constructor(selected: string) {
        super();
        this.selected = selected;
    }
}

export class DecidePassiveDiscardAction extends ClientAction {
    action = "decidePassiveDiscard";
    discard: boolean;

    constructor(discard: boolean) {
        super();
        this.discard = discard;
    }
}

export class InitDiscardAction extends ClientAction {
    action = "initDiscard";
}

export class CardSelectAction extends ClientAction {
    action = "cardSelect";
    selected: string;

    constructor(selected: string) {
        super();
        this.selected = selected;
    }
}

export class SwapPositionAction extends ClientAction {
    action = "swapPosition";
    sourcePos: string;
    targetPos: string;

    constructor(sourcePos: string, targetPos: string) {
        super();
        this.sourcePos = sourcePos;
        this.targetPos = targetPos;
    }
}
