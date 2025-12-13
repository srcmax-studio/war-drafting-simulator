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

const client = ref<Client | null>(null)
const serverState = ref<ServerState>(null)
const players = ref<string[]>()

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
