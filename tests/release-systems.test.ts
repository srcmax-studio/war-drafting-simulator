import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  FRONT_DEFINITIONS,
  createBattleSummary,
  createGame,
  lockTurn,
  submitTurnIntent,
  type BattleSummary,
  type CardDefinition,
  type GameEvent
} from '../app/common/src/index.js';
import { BattleAnimationQueue } from '../app/animations/timeline.js';
import { MUSIC_TRACKS, SFX_TRACKS } from '../app/audio/manifest.js';
import { MAX_CONCURRENT_SFX, canStartAudio, effectiveAudioVolume } from '../app/composables/useAudioManager.js';
import { createDefaultSettings, mergeAppSettings } from '../app/composables/useSettings.js';
import { frontArtAlt, frontArtUrl } from '../app/data/front-art.js';
import { publicHistoryEvents } from '../app/utils/online-history.js';
import { isFatalOnlineError, nextOnlineStatus } from '../app/utils/online-state.js';

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const cards = read<CardDefinition[]>('data/characters/generated/tcg-cards.json');
const presets = read<Array<{ deckId: string; nameZh: string; cardIds: string[] }>>('data/characters/generated/preset-decks.json');
const event = (sequence: number, type: string, payload: Record<string, unknown> = {}): GameEvent => ({ sequence, turn: 1, type, public: true, payload } as GameEvent);

describe('battle presentation queue', () => {
  it('sorts by sequence, merges adjacent numeric effects, and ignores repeats', async () => {
    const played: Array<{ sequence: number; mergedCount: number }> = [];
    const queue = new BattleAnimationQueue(async (entry) => { played.push({ sequence: entry.event.sequence, mergedCount: entry.mergedCount }); });
    queue.enqueue([
      event(3, 'ability_effect_applied', { sourceInstanceId: 'source-1', deltas: [{ amount: 2 }] }),
      event(1, 'turn_started'),
      event(2, 'ability_effect_applied', { sourceInstanceId: 'source-1', deltas: [{ amount: 1 }] })
    ]);
    await vi.waitFor(() => expect(played).toEqual([{ sequence: 1, mergedCount: 1 }, { sequence: 3, mergedCount: 2 }]));
    queue.enqueue([event(3, 'turn_started')]);
    await new Promise((resolveWait) => setTimeout(resolveWait, 0));
    expect(played).toHaveLength(2);
  });

  it('continues after a presentation failure and seeds reconnect history', async () => {
    const played: number[] = [];
    const queue = new BattleAnimationQueue(async (entry) => {
      played.push(entry.event.sequence);
      if (entry.event.sequence === 11) throw new Error('presentation failure');
    });
    queue.seed(10);
    queue.enqueue([event(9, 'turn_started'), event(11, 'turn_started'), event(12, 'front_revealed')]);
    await vi.waitFor(() => expect(played).toEqual([11, 12]));
  });
});

describe('audio and settings release contracts', () => {
  it('ships every scene and cue in both release formats', () => {
    expect(Object.keys(MUSIC_TRACKS)).toHaveLength(8);
    expect(Object.keys(SFX_TRACKS)).toHaveLength(32);
    for (const source of [...Object.values(MUSIC_TRACKS), ...Object.values(SFX_TRACKS)]) {
      expect(source.mp3).toMatch(/\.mp3$/);
      expect(source.ogg).toMatch(/\.ogg$/);
      expect(existsSync(resolve('public', source.mp3.replace(/^\//, '')))).toBe(true);
      expect(existsSync(resolve('public', source.ogg.replace(/^\//, '')))).toBe(true);
    }
  });

  it('requires an interaction gate, caps concurrency, and clamps persisted volumes', () => {
    expect(canStartAudio(false, true)).toBe(false);
    expect(canStartAudio(true, false)).toBe(false);
    expect(canStartAudio(true, true)).toBe(true);
    expect(MAX_CONCURRENT_SFX).toBe(3);
    const settings = mergeAppSettings({
      playerName: '一'.repeat(40),
      animationSpeed: 'fast',
      audio: { enabled: false, masterVolume: 2, musicVolume: 0.25, sfxVolume: -1, interfaceVolume: Number.NaN }
    });
    expect(settings.playerName).toHaveLength(24);
    expect(settings.animationSpeed).toBe('fast');
    expect(settings.audio).toMatchObject({ enabled: false, masterVolume: 1, musicVolume: 0.25, sfxVolume: 0 });
    expect(settings.audio.interfaceVolume).toBe(createDefaultSettings().audio.interfaceVolume);
    expect(effectiveAudioVolume(settings, 'music')).toBe(0);
    settings.audio.enabled = true;
    expect(effectiveAudioVolume(settings, 'music')).toBe(0.25);
  });
});

describe('front artwork and privacy contracts', () => {
  it('maps every enabled front to a unique formal asset and keeps hidden slots generic', () => {
    const manifest = read<{ count: number; assets: Array<{ frontId: string; web: string; hd: string; thumbnail: string; altZh: string }> }>('public/assets/fronts/manifest.json');
    expect(manifest.count).toBe(72);
    expect(new Set(manifest.assets.map((asset) => asset.frontId)).size).toBe(72);
    expect(new Set(manifest.assets.map((asset) => asset.web)).size).toBe(72);
    for (const asset of manifest.assets) {
      expect(asset.altZh).toMatch(/战线场景$/);
      expect(existsSync(resolve('public', asset.web.replace(/^\//, '')))).toBe(true);
      expect(existsSync(resolve('public', asset.hd.replace(/^\//, '')))).toBe(true);
      expect(existsSync(resolve('public', asset.thumbnail.replace(/^\//, '')))).toBe(true);
    }
    expect(frontArtUrl('front-slot-2')).toBe('/assets/fronts/hidden.webp');
    expect(frontArtAlt({ nameZh: '未揭示', art: undefined })).toBe('未揭示战线场景');
  });

  it('persists only public summary fields in online history', () => {
    const summary = {
      timeline: [{ sequence: 7, turn: 2, type: 'card_revealed', playerId: 'p1', frontId: 'front-a', cardId: 'card-a', magnitude: 4, reconnectToken: 'private-token', hand: ['hidden-card'] }]
    } as unknown as BattleSummary;
    const historyEvents = publicHistoryEvents(summary);
    expect(historyEvents).toEqual([{ sequence: 7, turn: 2, type: 'card_revealed', playerId: 'p1', public: true, payload: { frontId: 'front-a', cardId: 'card-a', magnitude: 4 } }]);
    expect(JSON.stringify(historyEvents)).not.toMatch(/private-token|hidden-card|reconnectToken|hand/u);
  });
});

describe('online lifecycle and deterministic summaries', () => {
  it('covers lobby, room, matching, game, return, and fatal error transitions', () => {
    expect(nextOnlineStatus('connecting', 'lobbyEntered')).toBe('lobby');
    expect(nextOnlineStatus('lobby', 'roomJoined', { status: 'waiting' })).toBe('room');
    expect(nextOnlineStatus('room', 'matchmakingQueued', { status: 'queued' })).toBe('matchmaking');
    expect(nextOnlineStatus('matchmaking', 'privateGameState')).toBe('game');
    expect(nextOnlineStatus('game', 'returnedToLobby')).toBe('lobby');
    expect(isFatalOnlineError('AUTHENTICATION_FAILED')).toBe(true);
    expect(nextOnlineStatus('lobby', 'error', { code: 'AUTHENTICATION_FAILED' })).toBe('error');
    expect(nextOnlineStatus('room', 'roomError', { code: 'ROOM_FULL' })).toBe('room');
  });

  it('builds the same complete public battle summary from the same event log', () => {
    const state = createGame({
      seed: 20260717,
      cards,
      fronts: FRONT_DEFINITIONS,
      players: [
        { playerId: 'p1', name: '甲方', deckId: presets[0]!.deckId, deckName: presets[0]!.nameZh, deck: presets[0]!.cardIds },
        { playerId: 'p2', name: '乙方', deckId: presets[1]!.deckId, deckName: presets[1]!.nameZh, deck: presets[1]!.cardIds }
      ]
    });
    while (state.phase !== 'ended') {
      for (const player of state.players) {
        submitTurnIntent(state, player.playerId, { requestId: `${player.playerId}-plan-${state.turn}`, turn: state.turn, deployments: [] });
        lockTurn(state, player.playerId, `${player.playerId}-lock-${state.turn}`);
      }
    }
    const first = createBattleSummary(state, { startedAt: 1_000, endedAt: 61_000 });
    const second = createBattleSummary(state, { startedAt: 1_000, endedAt: 61_000 });
    expect(first).toEqual(second);
    expect(first).toMatchObject({ schemaVersion: 1, turns: 6, durationMs: 60_000 });
    expect(first.fronts).toHaveLength(3);
    expect(first.players).toHaveLength(2);
    expect(first.timeline.length).toBeGreaterThan(0);
    expect(first.timeline.every((entry) => state.eventLog.find((eventEntry) => eventEntry.sequence === entry.sequence)?.public)).toBe(true);
    expect(first.turningPoints.length).toBeGreaterThanOrEqual(1);
    expect(first.turningPoints.length).toBeLessThanOrEqual(5);
    expect(first.mvpAlgorithmZh).toContain('主将分数');
    expect(Object.keys(first.players[0]!.stats)).toHaveLength(16);
  });
});
