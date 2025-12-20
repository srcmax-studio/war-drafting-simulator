import { ref } from 'vue'
import { Client } from '~/client'

export interface ServerState {
    title: string,
    owner: string,
    loadedCharacters: number,
    onlinePlayers: number,
    phase: number,
    requirePassword: boolean,
    tls: boolean
}

export interface Player {
    name: string,
    ready: boolean,
    hovering: string,
    initDiscardRemaining?: number,
    passiveDiscardRemaining?: number,
}

const client = ref<Client | null>(null)
const serverState = ref<ServerState>(null)
const players = ref<Player[]>()

export function useClient() {
    return {
        client,
        serverState,
        players
    }
}

export function setupClient() {
    if (client.value) {
        client.value.setup();
    }
}
