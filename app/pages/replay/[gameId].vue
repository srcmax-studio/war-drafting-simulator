<script setup lang="ts">
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-vue-next';
import { createPlayerView, type GameEvent, type GameState } from '~/common/src/index';
import { restoreGameFromHistory } from '~/composables/useMatchHistory';
import { replayToSequence } from '~/utils/replay';

const route = useRoute();
const { history } = useMatchHistory();
const { settings } = useSettings();
const entry = computed(() => history.value.find((item) => item.gameId === route.params.gameId));
const source = computed<GameState | null>(() => { try { return entry.value?.serializedGame ? restoreGameFromHistory(entry.value.serializedGame) : null; } catch { return null; } });
const events = computed(() => source.value?.eventLog.filter((event) => event.public) ?? []);
const initialIndex = Math.max(0, events.value.findIndex((event) => event.sequence >= Number(route.query.sequence ?? 0)));
const index = ref(initialIndex);
const playing = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;
const selectedEvent = computed<GameEvent | null>(() => events.value[index.value] ?? null);
const replayState = computed(() => source.value && selectedEvent.value ? replayToSequence(source.value, selectedEvent.value.sequence) : source.value);
const view = computed(() => replayState.value && entry.value ? createPlayerView(replayState.value, entry.value.playerId) : null);
const speedMs = computed(() => settings.value.animationSpeed === 'fast' ? 350 : settings.value.animationSpeed === 'instant' ? 100 : 700);

const stop = () => { playing.value=false; if(timer)clearInterval(timer); timer=null; };
const play = () => { if(playing.value){stop();return;} playing.value=true; timer=setInterval(()=>{if(index.value>=events.value.length-1){stop();return;}index.value+=1;},speedMs.value); };
const seek = (next:number) => { index.value=Math.max(0,Math.min(events.value.length-1,next)); };
onBeforeUnmount(stop);
</script>

<template><div class="page replay-page"><header class="page-heading"><div><span class="eyebrow">事件回放</span><h1>{{ entry?.deckName ?? '战局回放' }}</h1><p>按确定性操作序列重建战局状态；速度设置沿用全局动画选项。</p></div><GameButton :to="`/result/${route.params.gameId}`" variant="ghost"><ArrowLeft :size="16" /> 返回结算</GameButton></header><template v-if="view && entry"><ReplayBoard :view="view" :player-id="entry.playerId" :selected-event="selectedEvent" /><div class="replay-controls"><IconButton label="回到开始" @click="seek(0)"><RotateCcw :size="17" /></IconButton><IconButton label="上一个事件" @click="seek(index-1)"><SkipBack :size="18" /></IconButton><GameButton variant="primary" @click="play"><Pause v-if="playing" :size="18" /><Play v-else :size="18" />{{ playing?'暂停':'播放' }}</GameButton><IconButton label="下一个事件" @click="seek(index+1)"><SkipForward :size="18" /></IconButton><span>#{{ selectedEvent?.sequence ?? 0 }} / {{ events.at(-1)?.sequence ?? 0 }}</span><input v-model.number="index" type="range" min="0" :max="Math.max(0,events.length-1)" step="1" aria-label="回放事件位置"></div></template><ErrorState v-else message="这场对局没有可用的完整回放。" @retry="navigateTo('/history')" /></div></template>
<style scoped>.replay-controls{min-height:66px;display:grid;grid-template-columns:40px 40px auto 40px 120px 1fr;align-items:center;gap:8px;padding:10px 12px;border:solid var(--border-subtle);border-width:0 1px 1px;background:var(--color-surface-primary)}.replay-controls>span{font-family:var(--font-numeric);color:var(--color-text-muted);font-size:10px}.replay-controls input{width:100%;accent-color:var(--color-copper)}@media(max-width:700px){.replay-controls{grid-template-columns:40px 40px 1fr 40px}.replay-controls>span{grid-column:1/3}.replay-controls input{grid-column:3/5}}</style>
