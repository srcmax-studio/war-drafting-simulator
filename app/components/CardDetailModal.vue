<script setup lang="ts">
import { Crosshair, Gauge, ShieldCheck, Sparkles, X } from 'lucide-vue-next';
import type { CardDefinition } from '~/common/src/index';
import { cardFallbackUrl, cardImageUrl } from '~/data/catalog';
import { TRIGGER_LABELS, formatCondition, formatEffect, formatLimit, formatSelector } from '~/utils/ability-text';

const props = defineProps<{ card: CardDefinition | null }>();
const emit = defineEmits<{ close: [] }>();
const source = ref('');
const rarityLabels: Readonly<Record<string, string>> = {
  SS: '传说', 'SS级': '传说', S: '史诗', 'S级': '史诗', A: '稀有', 'A级': '稀有', B: '精良', 'B级': '精良', C: '普通', 'C级': '普通'
};
watch(() => props.card, (card) => { source.value = card ? cardImageUrl(card) : ''; }, { immediate: true });
</script>

<template>
  <div v-if="card" class="modal-backdrop" role="presentation" @click.self="emit('close')">
    <section class="dialog card-dialog" role="dialog" aria-modal="true" :aria-label="card.nameZh">
      <header class="dialog-header">
        <div><strong>{{ card.nameZh }}</strong><span>{{ card.role }}</span></div>
        <button class="icon-button" type="button" :aria-label="$t('common.close')" @click="emit('close')"><X :size="19" /></button>
      </header>
      <div class="dialog-content card-detail">
        <div class="art-column">
          <img class="card-detail-art" :src="source" :alt="card.nameZh" width="500" height="700" @error="source = cardFallbackUrl(card)">
          <div class="card-weight"><span><Gauge :size="15" /> {{ $t('cards.cost') }} <strong>{{ card.cost }}</strong></span><span><ShieldCheck :size="15" /> {{ $t('cards.power') }} <strong>{{ card.power }}</strong></span><span v-if="card.cost >= 5"><Sparkles :size="15" /> 终结卡</span></div>
        </div>
        <div class="detail-column">
          <div class="button-row"><span class="tag">{{ rarityLabels[card.rarity] ?? card.rarity }}</span><span v-if="card.role" class="tag">{{ card.role }}</span></div>
          <p class="character-description">{{ card.description }}</p>
          <section class="ability-section">
            <article v-for="(ability, index) in card.abilities ?? []" :key="`${ability.abilityId}-${index}`" class="ability-block">
              <header><span>{{ index + 1 }}</span><div><h2>{{ ability.nameZh }}</h2></div><strong>{{ TRIGGER_LABELS[ability.trigger] }}</strong></header>
              <p>{{ ability.textZh }}</p>
              <dl class="ability-structure">
                <div><dt><Crosshair :size="14" /> 目标</dt><dd>{{ formatSelector(ability.target) }}</dd></div>
                <div><dt>条件</dt><dd v-if="ability.conditions?.length"><span v-for="condition in ability.conditions" :key="JSON.stringify(condition)">{{ formatCondition(condition) }}</span></dd><dd v-else>无额外条件</dd></div>
                <div><dt>效果</dt><dd><span v-for="effect in ability.effects" :key="JSON.stringify(effect)">{{ formatEffect(effect) }}</span></dd></div>
                <div><dt>触发限制</dt><dd>{{ formatLimit(ability.limit) }}</dd></div>
              </dl>
            </article>
            <article v-if="!card.abilities?.length" class="ability-block legacy"><header><div><h2>角色技能</h2></div><strong>{{ TRIGGER_LABELS[card.trigger] }}</strong></header><p>{{ card.abilityTextZh }}</p></article>
          </section>
          <dl class="detail-list">
            <div><dt>{{ $t('cards.era') }}</dt><dd>{{ card.era }}</dd></div>
            <div><dt>{{ $t('cards.region') }}</dt><dd>{{ card.region }}</dd></div>
            <div><dt>{{ $t('cards.profession') }}</dt><dd>{{ card.profession }}</dd></div>
            <div><dt>{{ $t('cards.identity') }}</dt><dd>{{ card.identity }}</dd></div>
            <div><dt>阵营</dt><dd>{{ card.faction }}</dd></div>
          </dl>
          <div class="tag-row"><span v-for="tag in card.tags" :key="tag" class="tag">{{ tag }}</span></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card-dialog { width: min(1040px, 100%); }.dialog-header>div { display: grid; gap: 3px; }.dialog-header span { color: var(--muted); font-size: 10px; }.art-column { align-self: start; }.card-weight { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 8px; border: 1px solid var(--line); }.card-weight span { display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 38px; border-right: 1px solid var(--line); color: var(--muted); font-size: 10px; }.card-weight span:last-child { border-right: 0; color: var(--gold); }.card-weight strong { color: var(--ink); font-size: 15px; }.detail-column { min-width: 0; }.character-description { margin: 14px 0 18px; color: var(--muted); line-height: 1.65; }.ability-section { display: grid; gap: 12px; }.ability-block { border: 1px solid var(--line); background: #121715; }.ability-block>header { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 9px; min-height: 54px; padding: 8px 11px; border-bottom: 1px solid var(--line); }.ability-block>header>span { display: grid; place-items: center; width: 25px; height: 25px; border: 1px solid var(--copper); color: var(--gold); font: 700 12px Georgia, serif; }.ability-block h2 { margin: 0; font-size: 14px; }.ability-block header>strong { color: var(--copper); font-size: 10px; }.ability-block>p { margin: 0; padding: 11px; color: #d9ddd9; font-size: 12px; line-height: 1.65; }.ability-structure { display: grid; grid-template-columns: 1fr 1fr; margin: 0; border-top: 1px solid var(--line); }.ability-structure>div { min-width: 0; padding: 9px 11px; border: solid var(--line); border-width: 0 1px 1px 0; }.ability-structure dt { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 9px; }.ability-structure dd { display: grid; gap: 4px; margin: 5px 0 0; font-size: 10px; line-height: 1.45; }.legacy>header { grid-template-columns: 1fr auto; }
@media(max-width:720px){.card-weight{grid-template-columns:1fr 1fr}.card-weight span:nth-child(2){border-right:0}.card-weight span:last-child{grid-column:1/-1;border-top:1px solid var(--line)}.ability-structure{grid-template-columns:1fr}}
</style>
