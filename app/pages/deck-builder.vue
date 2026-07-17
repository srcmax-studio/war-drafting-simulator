<script setup lang="ts">
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  FileJson,
  Heart,
  Link2,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  Undo2,
  Upload,
  X
} from 'lucide-vue-next';
import { onBeforeRouteLeave } from 'vue-router';
import type { AbilityTrigger, AtomicEffectType, CardDefinition } from '~/common/src/index';
import { CARDS, CARD_BY_ID, CATALOG_VERSION } from '~/data/catalog';
import { EFFECT_LABELS, TRIGGER_LABELS } from '~/utils/ability-text';
import {
  analyzeDeck,
  createDeckShareUrl,
  decodeDeckCode,
  encodeDeckCode,
  exportDeckJson,
  importDeckJson,
  randomLegalDeck,
  type DeckChoice,
  type DeckImportResult
} from '~/utils/decks';

const route = useRoute();
const router = useRouter();
const {
  decks,
  customDecks,
  selectedDeck,
  selectedDeckId,
  defaultDeckId,
  storageNotice,
  importWarnings,
  deckContext,
  selectDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  toggleFavorite,
  setDefault,
  importDeck,
  restoreBackup
} = useDecks();

const search = ref('');
const cost = ref('all');
const era = ref('all');
const region = ref('all');
const profession = ref('all');
const faction = ref('all');
const tag = ref('all');
const skill = ref('all');
const sortBy = ref('cost');
const onlySelected = ref(false);
const page = ref(1);
const pageSize = 30;
const detail = ref<CardDefinition | null>(null);

const editingName = ref('');
const editingDescription = ref('');
const editingCover = ref('');
const editingCards = ref<string[]>([]);
const savedSnapshot = ref('');
const undoStack = ref<string[][]>([]);
const redoStack = ref<string[][]>([]);
const statusMessage = ref('');

const snapshot = () => JSON.stringify({
  name: editingName.value.trim(),
  description: editingDescription.value.trim(),
  coverCardId: editingCover.value,
  cardIds: editingCards.value
});
const dirty = computed(() => snapshot() !== savedSnapshot.value);

const loadDeck = (deck?: DeckChoice) => {
  editingName.value = deck?.name ?? '新牌组';
  editingDescription.value = deck?.description ?? '';
  editingCards.value = [...(deck?.cardIds ?? [])];
  editingCover.value = deck?.coverCardId && deck.cardIds.includes(deck.coverCardId) ? deck.coverCardId : deck?.cardIds[0] ?? '';
  undoStack.value = [];
  redoStack.value = [];
  nextTick(() => { savedSnapshot.value = snapshot(); });
};

watch(selectedDeckId, () => loadDeck(selectedDeck.value));
onMounted(() => loadDeck(selectedDeck.value));

const selectWithGuard = (deckId: string) => {
  if (deckId === selectedDeckId.value) return;
  if (dirty.value && !window.confirm('当前牌组有未保存修改，确定切换吗？')) return;
  selectDeck(deckId);
};

onBeforeRouteLeave(() => !dirty.value || window.confirm('当前牌组有未保存修改，确定离开吗？'));

const commitCards = (next: string[]) => {
  const normalized = [...new Set(next)].slice(0, 12);
  if (JSON.stringify(normalized) === JSON.stringify(editingCards.value)) return;
  undoStack.value = [...undoStack.value.slice(-49), [...editingCards.value]];
  redoStack.value = [];
  editingCards.value = normalized;
  if (!normalized.includes(editingCover.value)) editingCover.value = normalized[0] ?? '';
};

const undo = () => {
  const previous = undoStack.value.at(-1);
  if (!previous) return;
  redoStack.value = [[...editingCards.value], ...redoStack.value.slice(0, 49)];
  undoStack.value = undoStack.value.slice(0, -1);
  editingCards.value = [...previous];
};

const redo = () => {
  const next = redoStack.value[0];
  if (!next) return;
  undoStack.value = [...undoStack.value.slice(-49), [...editingCards.value]];
  redoStack.value = redoStack.value.slice(1);
  editingCards.value = [...next];
};

const toggle = (card: CardDefinition) => {
  if (editingCards.value.includes(card.cardId)) commitCards(editingCards.value.filter((cardId) => cardId !== card.cardId));
  else if (editingCards.value.length < 12) commitCards([...editingCards.value, card.cardId]);
  else statusMessage.value = '牌组已满，请先移除一张卡牌。';
};

const save = () => {
  const current = selectedDeck.value;
  if (!current) return;
  const stored = current.source !== 'preset'
    ? updateDeck(current.deckId, { name: editingName.value, description: editingDescription.value, cardIds: editingCards.value, coverCardId: editingCover.value })
    : createDeck({ name: editingName.value, description: editingDescription.value, cardIds: editingCards.value, coverCardId: editingCover.value, source: 'preset-copy' });
  statusMessage.value = `已保存“${stored.name}”。`;
  nextTick(() => { savedSnapshot.value = snapshot(); });
};

const saveAs = () => {
  const stored = createDeck({
    name: `${editingName.value || '新牌组'} 副本`,
    description: editingDescription.value,
    cardIds: editingCards.value,
    coverCardId: editingCover.value,
    source: selectedDeck.value?.source === 'preset' ? 'preset-copy' : 'custom'
  });
  statusMessage.value = `已另存为“${stored.name}”。`;
};

const pendingDelete = ref(false);
const confirmDelete = () => {
  const current = selectedDeck.value;
  if (!current || current.source === 'preset') return;
  pendingDelete.value = false;
  deleteDeck(current.deckId);
  statusMessage.value = '牌组已删除。';
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
const eras = unique(CARDS.map((card) => card.era));
const regions = unique(CARDS.map((card) => card.region));
const professions = unique(CARDS.map((card) => card.profession));
const factions = unique(CARDS.map((card) => card.faction));
const tags = unique(CARDS.flatMap((card) => card.tags));
const triggers = unique(CARDS.flatMap((card) => (card.abilities ?? []).map((ability) => ability.trigger))) as AbilityTrigger[];
const effectTypes = unique(CARDS.flatMap((card) => (card.abilities ?? []).flatMap((ability) => ability.effects.map((effect) => effect.type)))) as AtomicEffectType[];
const triggerLabel = (value: string) => TRIGGER_LABELS[value as AbilityTrigger] ?? '特殊时机';

const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  const result = CARDS.filter((card) => !query || [
    card.nameZh,
    card.description,
    card.abilityTextZh,
    card.role,
    card.tags.join(' '),
    ...(card.abilities ?? []).flatMap((ability) => [ability.nameZh, ability.textZh])
  ].join(' ').toLocaleLowerCase().includes(query))
    .filter((card) => cost.value === 'all' || String(card.cost) === cost.value)
    .filter((card) => era.value === 'all' || card.era === era.value)
    .filter((card) => region.value === 'all' || card.region === region.value)
    .filter((card) => profession.value === 'all' || card.profession === profession.value)
    .filter((card) => faction.value === 'all' || card.faction === faction.value)
    .filter((card) => tag.value === 'all' || card.tags.includes(tag.value))
    .filter((card) => onlySelected.value === false || editingCards.value.includes(card.cardId))
    .filter((card) => {
      if (skill.value === 'all') return true;
      const [kind, value] = skill.value.split(':');
      return kind === 'trigger'
        ? (card.abilities ?? []).some((ability) => ability.trigger === value)
        : (card.abilities ?? []).some((ability) => ability.effects.some((effect) => effect.type === value));
    });
  return result.sort((left, right) => {
    const compare = sortBy.value === 'power' ? right.power - left.power
      : sortBy.value === 'era' ? left.era.localeCompare(right.era, 'zh-CN')
        : sortBy.value === 'region' ? left.region.localeCompare(right.region, 'zh-CN')
          : sortBy.value === 'profession' ? left.profession.localeCompare(right.profession, 'zh-CN')
            : sortBy.value === 'tag' ? (left.tags[0] ?? '').localeCompare(right.tags[0] ?? '', 'zh-CN')
              : sortBy.value === 'name' ? left.nameZh.localeCompare(right.nameZh, 'zh-CN')
                : left.cost - right.cost;
    return compare || right.power - left.power || left.cardId.localeCompare(right.cardId);
  });
});

const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, cost, era, region, profession, faction, tag, skill, sortBy, onlySelected], () => { page.value = 1; });
watch(pages, (value) => { if (page.value > value) page.value = value; });

const analysis = computed(() => analyzeDeck(editingCards.value, CARD_BY_ID));
const breakdown = (values: Record<string, number>) => Object.entries(values).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'));

const beginCatalogDrag = (event: DragEvent, cardId: string) => {
  event.dataTransfer?.setData('application/x-aeonfront-card', cardId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
};
const beginDeckDrag = (event: DragEvent, index: number) => {
  event.dataTransfer?.setData('application/x-aeonfront-deck-index', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
};
const dropIntoDeck = (event: DragEvent) => {
  const cardId = event.dataTransfer?.getData('application/x-aeonfront-card');
  if (cardId && CARD_BY_ID[cardId] && !editingCards.value.includes(cardId) && editingCards.value.length < 12) commitCards([...editingCards.value, cardId]);
};
const reorderDeck = (event: DragEvent, targetIndex: number) => {
  const raw = event.dataTransfer?.getData('application/x-aeonfront-deck-index');
  const sourceIndex = Number(raw);
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= editingCards.value.length || sourceIndex === targetIndex) return;
  const next = [...editingCards.value];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved!);
  commitCards(next);
};
const dropToRemove = (event: DragEvent) => {
  const raw = event.dataTransfer?.getData('application/x-aeonfront-deck-index');
  const sourceIndex = Number(raw);
  if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < editingCards.value.length) {
    commitCards(editingCards.value.filter((_, index) => index !== sourceIndex));
  }
};

const newDialog = ref(false);
const newMode = ref<'blank' | 'preset' | 'custom' | 'random'>('blank');
const newBaseId = ref('');
const newName = ref('新牌组');
const newDescription = ref('');
const newFavorite = ref(false);
const sourceDecks = computed(() => decks.value.filter((deck) => newMode.value === 'preset' ? deck.source === 'preset' : deck.source !== 'preset'));
watch(newMode, (mode) => {
  newBaseId.value = sourceDecks.value[0]?.deckId ?? '';
  newName.value = mode === 'random' ? '随机远征' : mode === 'blank' ? '新牌组' : `${sourceDecks.value[0]?.name ?? '牌组'} 副本`;
});
const openNew = () => {
  newDialog.value = true;
  newMode.value = 'blank';
  newBaseId.value = '';
  newName.value = '新牌组';
  newDescription.value = '';
  newFavorite.value = false;
};
const setNewMode = (mode: 'blank' | 'preset' | 'custom' | 'random') => { newMode.value = mode; };
const confirmNew = () => {
  const base = decks.value.find((deck) => deck.deckId === newBaseId.value);
  const cardIds = newMode.value === 'random' ? randomLegalDeck(CARDS.map((card) => card.cardId)) : base?.cardIds ?? [];
  createDeck({
    name: newName.value,
    description: newDescription.value || base?.description,
    cardIds,
    coverCardId: base?.coverCardId,
    source: newMode.value === 'preset' ? 'preset-copy' : 'custom',
    favorite: newFavorite.value
  });
  newDialog.value = false;
  statusMessage.value = '已创建自定义牌组。';
};

const importDialog = ref(false);
const importMode = ref<'code' | 'json'>('code');
const importText = ref('');
const importError = ref('');
const importPreview = ref<DeckImportResult | null>(null);
const sharePreview = ref(false);

const prepareImport = (result: DeckImportResult, shared = false) => {
  importPreview.value = result;
  importError.value = '';
  sharePreview.value = shared;
};
const parseImportText = () => {
  try {
    prepareImport(importMode.value === 'code'
      ? decodeDeckCode(importText.value, deckContext)
      : importDeckJson(importText.value, deckContext));
  } catch (error) {
    importPreview.value = null;
    importError.value = error instanceof Error ? error.message : '无法导入牌组。';
  }
};
const readJsonFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 256 * 1024) throw new Error('导入文件超过 256 千字节。');
    importText.value = await file.text();
    importMode.value = 'json';
    parseImportText();
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '无法读取文件。';
  } finally {
    input.value = '';
  }
};
const confirmImport = () => {
  if (!importPreview.value) return;
  const stored = importDeck(importPreview.value);
  importDialog.value = false;
  sharePreview.value = false;
  importPreview.value = null;
  importText.value = '';
  statusMessage.value = `已导入“${stored.name}”，未覆盖任何本地牌组。`;
  if (route.query.deck) router.replace({ path: '/deck-builder' });
};
const closeImportPreview = () => {
  sharePreview.value = false;
  importPreview.value = null;
  if (route.query.deck) router.replace({ path: '/deck-builder' });
};

const downloadableDeck = computed<DeckChoice>(() => ({
  ...(selectedDeck.value ?? decks.value[0]!),
  name: editingName.value || '未命名牌组',
  description: editingDescription.value || undefined,
  cardIds: [...editingCards.value],
  coverCardId: editingCover.value || undefined,
  catalogVersion: CATALOG_VERSION
}));
const deckCode = computed(() => editingCards.value.length === 12 ? encodeDeckCode(downloadableDeck.value) : '');
const shareUrl = computed(() => import.meta.client && deckCode.value ? createDeckShareUrl(window.location.origin, downloadableDeck.value) : '');

const copyText = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    statusMessage.value = `${label}已复制。`;
  } catch {
    importText.value = value;
    importDialog.value = true;
    statusMessage.value = `无法访问剪贴板，${label}已放入文本框。`;
  }
};
const downloadJson = () => {
  const blob = new Blob([exportDeckJson(downloadableDeck.value)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${editingName.value.replace(/[\\/:*?"<>|]/g, '-') || '万世战线牌组'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  statusMessage.value = '牌组文件已导出。';
};

onMounted(() => {
  const shared = Array.isArray(route.query.deck) ? route.query.deck[0] : route.query.deck;
  if (!shared) return;
  try { prepareImport(decodeDeckCode(shared, deckContext), true); }
  catch (error) { importError.value = error instanceof Error ? error.message : '分享链接无效。'; sharePreview.value = true; }
});
</script>

<template>
  <div class="page deck-page">
    <header class="page-heading deck-heading">
      <div>
        <span class="eyebrow">牌组管理</span>
        <div class="title-line"><h1>{{ $t('deck.title') }}</h1><span v-if="dirty" class="unsaved-dot">未保存</span></div>
        <p>{{ editingCards.length }}/12 张 · 已保存 {{ customDecks.length }}/100 套自定义牌组</p>
      </div>
      <div class="button-row deck-actions">
        <button class="button" type="button" @click="openNew"><Plus :size="17" /> 新建</button>
        <button class="icon-button" type="button" title="撤销" aria-label="撤销" :disabled="undoStack.length === 0" @click="undo"><Undo2 :size="18" /></button>
        <button class="icon-button" type="button" title="重做" aria-label="重做" :disabled="redoStack.length === 0" @click="redo"><Redo2 :size="18" /></button>
        <button class="button" type="button" @click="saveAs"><Copy :size="17" /> 另存为</button>
        <button class="button primary" type="button" @click="save"><Save :size="17" /> 保存</button>
      </div>
    </header>

    <div v-if="storageNotice || importWarnings.length" class="notice-strip" role="status">
      <span>{{ storageNotice || importWarnings.join('；') }}</span>
      <button v-if="storageNotice" class="button" type="button" @click="restoreBackup"><RotateCcw :size="15" /> 恢复备份</button>
    </div>
    <p class="sr-status" aria-live="polite">{{ statusMessage }}</p>

    <section class="deck-workbench" @dragover.prevent @drop="dropIntoDeck">
      <div class="workbench-head">
        <div><strong>当前编队</strong><span>拖动卡牌调整展示顺序，拖回目录区域可移除</span></div>
        <button class="button" type="button" :disabled="editingCards.length === 0" @click="commitCards([])"><Trash2 :size="16" /> 清空</button>
      </div>
      <ol class="selected-deck" data-testid="selected-deck">
        <li
          v-for="(cardId, index) in editingCards"
          :key="cardId"
          draggable="true"
          @dragstart="beginDeckDrag($event, index)"
          @dragover.prevent
          @drop.stop="reorderDeck($event, index)"
        >
          <span class="slot-number">{{ index + 1 }}</span>
          <button type="button" @click="detail = CARD_BY_ID[cardId] ?? null">
            <template v-if="CARD_BY_ID[cardId]"><strong>{{ CARD_BY_ID[cardId]?.nameZh }}</strong><small>{{ CARD_BY_ID[cardId]?.cost }} 费 · {{ CARD_BY_ID[cardId]?.power }} 战力</small></template>
            <template v-else><strong class="danger">缺失卡牌</strong><small>无法载入</small></template>
          </button>
          <button class="remove-card" type="button" :aria-label="`移除 ${CARD_BY_ID[cardId]?.nameZh ?? '缺失卡牌'}`" @click="commitCards(editingCards.filter(id => id !== cardId))"><X :size="15" /></button>
        </li>
        <li v-for="index in Math.max(0, 12 - editingCards.length)" :key="`empty-${index}`" class="empty-slot"><span class="slot-number">{{ editingCards.length + index }}</span><span>空位</span></li>
      </ol>
    </section>

    <div class="split-layout deck-layout">
      <div class="catalog-pane" @dragover.prevent @drop="dropToRemove">
        <div class="deck-toolbar">
          <label class="search-field"><Search :size="17" /><input v-model="search" class="input" placeholder="搜索角色、标签、技能或效果"></label>
          <select v-model="cost" class="select" aria-label="费用筛选"><option value="all">费用 · 全部</option><option v-for="value in 6" :key="value" :value="String(value)">{{ value }} 费</option></select>
          <select v-model="era" class="select" aria-label="时代筛选"><option value="all">时代 · 全部</option><option v-for="value in eras" :key="value">{{ value }}</option></select>
          <select v-model="region" class="select" aria-label="地区筛选"><option value="all">地区 · 全部</option><option v-for="value in regions" :key="value">{{ value }}</option></select>
          <select v-model="profession" class="select" aria-label="职业筛选"><option value="all">职业 · 全部</option><option v-for="value in professions" :key="value">{{ value }}</option></select>
          <select v-model="faction" class="select" aria-label="阵营筛选"><option value="all">阵营 · 全部</option><option v-for="value in factions" :key="value">{{ value }}</option></select>
          <select v-model="tag" class="select" aria-label="标签筛选"><option value="all">标签 · 全部</option><option v-for="value in tags" :key="value">{{ value }}</option></select>
          <select v-model="skill" class="select" aria-label="技能类型筛选"><option value="all">技能类型 · 全部</option><optgroup label="触发时机"><option v-for="value in triggers" :key="value" :value="`trigger:${value}`">{{ TRIGGER_LABELS[value] }}</option></optgroup><optgroup label="技能效果"><option v-for="value in effectTypes" :key="value" :value="`effect:${value}`">{{ EFFECT_LABELS[value] }}</option></optgroup></select>
          <label class="sort-field"><ArrowDownUp :size="16" /><select v-model="sortBy" class="select" aria-label="排序"><option value="cost">按费用</option><option value="power">按战力</option><option value="era">按时代</option><option value="region">按地区</option><option value="profession">按职业</option><option value="tag">按标签</option><option value="name">按名称</option></select></label>
          <label class="check-field"><input v-model="onlySelected" type="checkbox"> 仅显示已加入</label>
        </div>
        <div class="catalog-summary"><span>显示 {{ filtered.length }} / {{ CARDS.length }} 张</span><span>双击查看详情 · 点击或拖动加入</span></div>
        <div class="card-grid deck-card-grid">
          <CardTile
            v-for="card in visible"
            :key="card.cardId"
            :card="card"
            :selected="editingCards.includes(card.cardId)"
            draggable="true"
            @dragstart="beginCatalogDrag($event, card.cardId)"
            @select="toggle"
            @dblclick="detail = card"
          />
        </div>
        <div class="pagination"><button class="icon-button" type="button" aria-label="上一页" :disabled="page <= 1" @click="page--"><ChevronLeft :size="18" /></button><span>{{ page }} / {{ pages }}</span><button class="icon-button" type="button" aria-label="下一页" :disabled="page >= pages" @click="page++"><ChevronRight :size="18" /></button></div>
      </div>

      <aside class="side-panel deck-inspector">
        <section>
          <div class="inspector-title"><h2>牌组资料</h2><span v-if="selectedDeck?.source === 'preset'" class="tag">预设只读</span><span v-else class="tag">自定义</span></div>
          <label class="field"><span class="field-label">牌组库</span><select class="select" :value="selectedDeckId" @change="selectWithGuard(($event.target as HTMLSelectElement).value)"><option v-for="deck in decks" :key="deck.deckId" :value="deck.deckId">{{ deck.deckId === defaultDeckId ? '◆ ' : '' }}{{ deck.favorite ? '★ ' : '' }}{{ deck.name }} · {{ deck.cardIds.length }}/12</option></select></label>
          <label class="field"><span class="field-label">牌组名称</span><input v-model="editingName" class="input" maxlength="80"></label>
          <label class="field"><span class="field-label">描述</span><textarea v-model="editingDescription" class="input textarea" maxlength="400" rows="3"></textarea></label>
          <label class="field"><span class="field-label">封面卡</span><select v-model="editingCover" class="select"><option value="">自动选择</option><option v-for="cardId in editingCards.filter(id => CARD_BY_ID[id])" :key="cardId" :value="cardId">{{ CARD_BY_ID[cardId]?.nameZh }}</option></select></label>
          <div class="metadata-actions">
            <button class="button" type="button" :disabled="selectedDeck?.source === 'preset'" @click="selectedDeck && toggleFavorite(selectedDeck.deckId)"><Heart :size="16" :fill="selectedDeck?.favorite ? 'currentColor' : 'none'" /> {{ selectedDeck?.favorite ? '取消收藏' : '收藏' }}</button>
            <button class="button" type="button" @click="selectedDeck && setDefault(selectedDeck.deckId)"><Star :size="16" :fill="selectedDeck?.deckId === defaultDeckId ? 'currentColor' : 'none'" /> {{ selectedDeck?.deckId === defaultDeckId ? '取消默认' : '设为默认' }}</button>
            <button class="button danger-button" type="button" :disabled="selectedDeck?.source === 'preset'" @click="pendingDelete = true"><Trash2 :size="16" /> 删除</button>
          </div>
        </section>

        <section class="analysis-panel">
          <div class="inspector-title"><h2>实时分析</h2><span :class="analysis.warnings.some(item => item.severity === 'error') ? 'danger' : 'success'">{{ analysis.warnings.some(item => item.severity === 'error') ? '需调整' : '可出战' }}</span></div>
          <div class="metric-grid">
            <div><span>平均费用</span><strong>{{ analysis.averageCost.toFixed(2) }}</strong></div>
            <div><span>基础战力</span><strong>{{ analysis.totalBasePower }}</strong></div>
            <div><span>效果价值</span><strong>{{ analysis.expectedEffectValue.toFixed(1) }}</strong></div>
            <div><span>预计总值</span><strong>{{ analysis.expectedTotalValue.toFixed(1) }}</strong></div>
            <div><span>低费铺垫</span><strong>{{ analysis.setupCount }}</strong></div>
            <div><span>高费终结</span><strong>{{ analysis.finisherCount }}</strong></div>
          </div>
          <h3>费用曲线</h3>
          <div class="curve"><div v-for="(countValue, index) in analysis.costCurve" :key="index"><span :style="{ height: `${Math.max(4, countValue * 16)}px` }" /><strong>{{ countValue }}</strong><small>{{ index + 1 }}</small></div></div>
          <ul v-if="analysis.warnings.length" class="warning-list"><li v-for="warning in analysis.warnings" :key="warning.code" :class="warning.severity">{{ warning.message }}</li></ul>
          <p v-else class="success analysis-clear"><Check :size="16" /> 未发现明显构筑问题</p>
          <details><summary>时代 / 地区 / 职业</summary><div class="breakdown"><span v-for="([name, countValue]) in breakdown(analysis.eras)" :key="`era-${name}`">{{ name }} <strong>{{ countValue }}</strong></span><span v-for="([name, countValue]) in breakdown(analysis.regions)" :key="`region-${name}`">{{ name }} <strong>{{ countValue }}</strong></span><span v-for="([name, countValue]) in breakdown(analysis.professions)" :key="`profession-${name}`">{{ name }} <strong>{{ countValue }}</strong></span></div></details>
          <details><summary>阵营 / 标签 / 触发</summary><div class="breakdown"><span v-for="([name, countValue]) in breakdown(analysis.factions)" :key="`faction-${name}`">{{ name }} <strong>{{ countValue }}</strong></span><span v-for="([name, countValue]) in breakdown(analysis.tags)" :key="`tag-${name}`">{{ name }} <strong>{{ countValue }}</strong></span><span v-for="([name, countValue]) in breakdown(analysis.triggers)" :key="`trigger-${name}`">{{ triggerLabel(name) }} <strong>{{ countValue }}</strong></span></div></details>
        </section>

        <section class="transfer-panel">
          <div class="inspector-title"><h2>导入与分享</h2></div>
          <div class="transfer-actions">
            <button class="button" type="button" @click="downloadJson"><Download :size="16" /> 导出文件</button>
            <button class="button" type="button" @click="importDialog = true"><Upload :size="16" /> 导入</button>
            <button class="button" type="button" :disabled="editingCards.length !== 12" @click="copyText(deckCode, '牌组码')"><Clipboard :size="16" /> 牌组码</button>
            <button class="button" type="button" :disabled="editingCards.length !== 12" @click="copyText(shareUrl, '分享链接')"><Link2 :size="16" /> 分享</button>
          </div>
          <p v-if="shareUrl.length > 2000" class="danger compact-note">分享链接较长，部分应用可能会截断；请改用牌组码。</p>
        </section>
      </aside>
    </div>

    <CardDetailModal :card="detail" @close="detail = null" />

    <Modal :open="newDialog" title="新建牌组" @close="newDialog = false">
        <div class="dialog-form">
          <div class="segmented" aria-label="创建方式"><button v-for="mode in ([{id:'blank',label:'空白'},{id:'preset',label:'预设副本'},{id:'custom',label:'自定义副本'},{id:'random',label:'随机合法'}] as const)" :key="mode.id" type="button" :class="{ active: newMode === mode.id }" @click="setNewMode(mode.id)">{{ mode.label }}</button></div>
          <label v-if="newMode === 'preset' || newMode === 'custom'" class="field"><span class="field-label">起始牌组</span><select v-model="newBaseId" class="select"><option v-for="deck in sourceDecks" :key="deck.deckId" :value="deck.deckId">{{ deck.name }}</option></select></label>
          <label class="field"><span class="field-label">名称</span><input v-model="newName" class="input" maxlength="80"></label>
          <label class="field"><span class="field-label">描述</span><textarea v-model="newDescription" class="input textarea" rows="3" maxlength="400"></textarea></label>
          <label class="check-field"><input v-model="newFavorite" type="checkbox"> 创建后收藏</label>
          <div class="dialog-actions"><button class="button" type="button" @click="newDialog = false">取消</button><button class="button primary" type="button" :disabled="!newName.trim() || ((newMode === 'preset' || newMode === 'custom') && !newBaseId)" @click="confirmNew"><Plus :size="17" /> 创建</button></div>
        </div>
    </Modal>

    <Modal :open="importDialog" title="导入牌组" @close="importDialog = false">
        <div class="dialog-form">
          <div class="segmented"><button type="button" :class="{ active: importMode === 'code' }" @click="importMode = 'code'">牌组码</button><button type="button" :class="{ active: importMode === 'json' }" @click="importMode = 'json'">牌组文本</button></div>
          <textarea v-model="importText" class="input import-text" :placeholder="importMode === 'code' ? '粘贴牌组码' : '粘贴牌组文本'" rows="8"></textarea>
          <label class="button file-button"><FileJson :size="17" /> 选择牌组文件<input type="file" accept="application/json,.json" @change="readJsonFile"></label>
          <p v-if="importError" class="danger">{{ importError }}</p>
          <div class="dialog-actions"><button class="button" type="button" @click="importDialog = false">取消</button><button class="button primary" type="button" :disabled="!importText.trim()" @click="parseImportText"><Upload :size="17" /> 校验并预览</button></div>
        </div>
    </Modal>

    <Modal :open="Boolean(importPreview || sharePreview)" title="牌组预览" @close="closeImportPreview">
        <div v-if="importPreview" class="import-preview">
          <div><span class="eyebrow">牌组预览</span><h2>{{ importPreview.deck.name }}</h2><p>{{ importPreview.deck.description || '无描述' }}</p></div>
          <ol><li v-for="cardId in importPreview.deck.cardIds" :key="cardId"><span>{{ CARD_BY_ID[cardId]?.nameZh ?? '缺失卡牌' }}</span><small :class="{ danger: !CARD_BY_ID[cardId] }">{{ CARD_BY_ID[cardId] ? `${CARD_BY_ID[cardId]?.cost} 费 / ${CARD_BY_ID[cardId]?.power} 战力` : '当前内容中不存在' }}</small></li></ol>
          <ul v-if="importPreview.warnings.length" class="warning-list"><li v-for="warning in importPreview.warnings" :key="warning" class="warning">{{ warning }}</li></ul>
          <p>保存时会创建新牌组，不会覆盖本地同名牌组。</p>
          <div class="dialog-actions"><button class="button" type="button" @click="closeImportPreview">取消</button><button class="button primary" type="button" @click="confirmImport"><Save :size="17" /> 保存到牌组库</button></div>
        </div>
        <div v-else><p class="danger">{{ importError || '分享链接无法解码。' }}</p><div class="dialog-actions"><button class="button" type="button" @click="closeImportPreview">关闭</button></div></div>
    </Modal>

    <ConfirmDialog :open="pendingDelete" :title="`删除“${selectedDeck?.name ?? '当前牌组'}”？`" message="此操作只删除当前自定义牌组，最近备份仍可用于恢复。" confirm-label="删除" danger @cancel="pendingDelete = false" @confirm="confirmDelete" />
  </div>
</template>

<style scoped>
.deck-heading { align-items: center; }.title-line { display: flex; align-items: center; gap: 10px; }.unsaved-dot { padding: 3px 7px; border: 1px solid #8d6638; color: var(--gold); font-size: 10px; }.notice-strip { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: -6px 0 18px; padding: 10px 12px; border: 1px solid #725d37; background: #29251b; font-size: 12px; }.sr-status { min-height: 18px; margin: -8px 0 8px; color: var(--muted); font-size: 11px; }.deck-workbench { margin-bottom: 22px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }.workbench-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; }.workbench-head>div { display: grid; gap: 3px; }.workbench-head span { color: var(--muted); font-size: 11px; }.selected-deck { display: grid; grid-template-columns: repeat(12, minmax(82px, 1fr)); gap: 6px; margin: 0; padding: 0 0 14px; overflow-x: auto; list-style: none; }.selected-deck li { position: relative; min-width: 82px; min-height: 72px; display: grid; grid-template-columns: 20px 1fr; align-items: center; border: 1px solid var(--line); background: var(--surface); }.selected-deck li>button:not(.remove-card) { min-width: 0; display: grid; gap: 4px; padding: 10px 22px 10px 5px; border: 0; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }.selected-deck strong,.selected-deck small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.selected-deck strong { font-size: 11px; }.selected-deck small { color: var(--muted); font-size: 9px; }.slot-number { color: var(--copper); font: 700 11px Georgia, serif; text-align: center; }.remove-card { position: absolute; top: 3px; right: 3px; width: 22px; height: 22px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: var(--muted); cursor: pointer; }.remove-card:hover { color: #ef8a82; }.selected-deck .empty-slot { color: #65706a; background: transparent; border-style: dashed; font-size: 10px; }.deck-layout { grid-template-columns: minmax(0, 1fr) 360px; }.deck-toolbar { display: grid; grid-template-columns: minmax(250px, 1fr) repeat(4, minmax(120px, .4fr)); gap: 8px; margin-bottom: 10px; }.sort-field { position: relative; }.sort-field>svg { position: absolute; z-index: 1; left: 10px; top: 12px; color: var(--muted); }.sort-field .select { padding-left: 34px; }.check-field { min-height: 40px; display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }.check-field input { width: 16px; height: 16px; accent-color: var(--teal); }.catalog-summary { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 12px; color: var(--muted); font-size: 11px; }.deck-card-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }.deck-inspector { display: grid; gap: 26px; }.deck-inspector section { display: grid; gap: 12px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }.inspector-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.inspector-title h2 { margin: 0; font-size: 16px; }.textarea { min-height: 74px; resize: vertical; }.metadata-actions,.transfer-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.metadata-actions .danger-button { grid-column: 1/-1; }.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: solid var(--line); border-width: 1px 0 0 1px; }.metric-grid div { min-width: 0; display: grid; gap: 4px; padding: 9px; border: solid var(--line); border-width: 0 1px 1px 0; }.metric-grid span { color: var(--muted); font-size: 9px; }.metric-grid strong { font-size: 16px; }.analysis-panel h3 { margin: 4px 0 -5px; font-size: 12px; }.curve { height: 112px; display: flex; align-items: end; gap: 7px; padding: 8px 0; border-bottom: 1px solid var(--line); }.curve>div { height: 100%; flex: 1; display: flex; flex-direction: column; justify-content: end; align-items: center; gap: 3px; }.curve span { width: 100%; max-width: 28px; background: var(--teal); }.curve strong,.curve small { font-size: 9px; }.curve small { color: var(--muted); }.warning-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }.warning-list li { padding: 8px 9px; border-left: 2px solid #78673c; background: #242219; color: #d5c79d; font-size: 11px; line-height: 1.45; }.warning-list li.error { border-color: #a6534e; background: #2b1e1d; color: #efaaa5; }.warning-list li.info { border-color: #47736e; background: #1a2725; color: #9bc7c1; }.analysis-clear { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; }.analysis-panel details { border-bottom: 1px solid var(--line); }.analysis-panel summary { padding: 8px 0; color: var(--muted); font-size: 11px; cursor: pointer; }.breakdown { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 0 9px; }.breakdown span { padding: 4px 6px; background: var(--surface-2); color: var(--muted); font-size: 9px; }.breakdown strong { color: var(--ink); }.compact-note { margin: 0; font-size: 10px; }.compact-dialog { width: min(620px, 100%); }.confirm-dialog { width: min(460px, 100%); }.dialog-form { display: grid; gap: 15px; }.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }.segmented { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; border: 1px solid var(--line); }.segmented button { min-height: 40px; padding: 7px; border: 0; border-right: 1px solid var(--line); background: #111715; color: var(--muted); cursor: pointer; }.segmented button:last-child { border-right: 0; }.segmented button.active { background: var(--surface-3); color: var(--gold); }.file-button { position: relative; justify-self: start; overflow: hidden; }.file-button input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }.import-text { min-height: 160px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }.import-preview { display: grid; gap: 16px; }.import-preview h2 { margin: 5px 0; }.import-preview p { margin: 0; color: var(--muted); }.import-preview ol { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--line); }.import-preview li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 11px; }.import-preview small { color: var(--muted); }.deck-actions .icon-button:disabled { opacity: .4; cursor: not-allowed; }
.selected-deck li>button:not(.remove-card){padding-right:34px}.remove-card{width:32px;height:32px}
@media(max-width:1200px){.deck-toolbar{grid-template-columns:repeat(3,1fr)}.deck-toolbar .search-field{grid-column:span 3}.deck-layout{grid-template-columns:1fr}.deck-inspector{grid-template-columns:repeat(3,1fr)}.deck-inspector{position:static;border:0;border-top:1px solid var(--line);padding:22px 0 0}.deck-inspector section{align-content:start}.selected-deck{grid-template-columns:repeat(12,100px)}}
@media(max-width:800px){.deck-inspector{grid-template-columns:1fr}.deck-heading{align-items:flex-start}.deck-actions{width:100%}.deck-toolbar{grid-template-columns:1fr 1fr}.deck-toolbar .search-field{grid-column:span 2}.catalog-summary span:last-child{display:none}.selected-deck{grid-template-columns:repeat(12,92px)}.import-preview ol{grid-template-columns:1fr}}
@media(max-width:520px){.deck-actions{display:grid;grid-template-columns:1fr 1fr 40px 40px;width:100%}.deck-actions>*{margin:0}.deck-actions>.button{width:100%;white-space:nowrap}.deck-actions>:nth-child(1){grid-column:1/3}.deck-actions>:nth-child(2){grid-column:3}.deck-actions>:nth-child(3){grid-column:4}.deck-actions>:nth-child(4){grid-column:1/3;grid-row:2}.deck-actions>:nth-child(5){grid-column:3/5;grid-row:2}.deck-toolbar{grid-template-columns:1fr}.deck-toolbar .search-field{grid-column:1}.metadata-actions,.transfer-actions{grid-template-columns:1fr}.metadata-actions .danger-button{grid-column:1}.segmented{grid-auto-flow:row}.segmented button{border-right:0;border-bottom:1px solid var(--line)}.metric-grid{grid-template-columns:1fr 1fr}}
</style>
