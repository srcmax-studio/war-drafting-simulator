<script setup lang="ts">
import { Crosshair, Gauge, ShieldCheck, Sparkles, X } from 'lucide-vue-next';
import type { CardDefinition } from '~/common/src/index';
import { cardFallbackUrl, cardImageUrl } from '~/data/catalog';
import { TRIGGER_LABELS, formatCondition, formatEffect, formatLimit, formatSelector } from '~/utils/ability-text';

const props = defineProps<{ card: CardDefinition | null }>();
const emit = defineEmits<{ close: [] }>();
const source = ref('');
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
          <div class="button-row"><span class="tag">{{ card.rarity }}</span><span class="tag">{{ card.packId ?? 'core' }}</span><span class="tag">{{ card.catalogVersion }}</span></div>
          <p class="character-description">{{ card.description }}</p>
          <section class="ability-section">
            <article v-for="(ability, index) in card.abilities ?? []" :key="`${ability.abilityId}-${index}`" class="ability-block">
              <header><span>{{ index + 1 }}</span><div><h2>{{ ability.nameZh }}</h2><small>{{ ability.abilityId }}</small></div><strong>{{ TRIGGER_LABELS[ability.trigger] }}</strong></header>
              <p>{{ ability.textZh }}</p>
              <dl class="ability-structure">
                <div><dt><Crosshair :size="14" /> 目标</dt><dd>{{ formatSelector(ability.target) }}</dd></div>
                <div><dt>条件</dt><dd v-if="ability.conditions?.length"><span v-for="condition in ability.conditions" :key="JSON.stringify(condition)">{{ formatCondition(condition) }}</span></dd><dd v-else>无额外条件</dd></div>
                <div><dt>效果</dt><dd><span v-for="effect in ability.effects" :key="JSON.stringify(effect)">{{ formatEffect(effect) }}</span></dd></div>
                <div><dt>限制 / 优先级</dt><dd>{{ formatLimit(ability.limit) }} · {{ ability.priority ?? 0 }}</dd></div>
              </dl>
            </article>
            <article v-if="!card.abilities?.length" class="ability-block legacy"><header><div><h2>{{ card.sourceAbility || card.abilityId }}</h2></div><strong>{{ TRIGGER_LABELS[card.trigger] }}</strong></header><p>{{ card.abilityTextZh }}</p></article>
          </section>
          <dl class="detail-list">
            <div><dt>{{ $t('cards.era') }}</dt><dd>{{ card.era }}</dd></div>
            <div><dt>{{ $t('cards.region') }}</dt><dd>{{ card.region }}</dd></div>
            <div><dt>{{ $t('cards.profession') }}</dt><dd>{{ card.profession }}</dd></div>
            <div><dt>{{ $t('cards.identity') }}</dt><dd>{{ card.identity }}</dd></div>
            <div><dt>阵营</dt><dd>{{ card.faction }}</dd></div>
            <div><dt>Card ID</dt><dd class="mono">{{ card.cardId }}</dd></div>
          </dl>
          <div class="tag-row"><span v-for="tag in card.tags" :key="tag" class="tag">{{ tag }}</span></div>
          <section v-if="card.balance" class="balance-strip">
            <div><span>基础价值</span><strong>{{ card.balance.basePowerValue.toFixed(1) }}</strong></div><div><span>预计总值</span><strong>{{ card.balance.expectedTotalValue.toFixed(1) }}</strong></div><div><span>下限</span><strong>{{ card.balance.floorValue.toFixed(1) }}</strong></div><div><span>上限</span><strong>{{ card.balance.ceilingValue.toFixed(1) }}</strong></div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card-dialog { width: min(1040px, 100%); }.dialog-header>div { display: grid; gap: 3px; }.dialog-header span { color: var(--muted); font-size: 10px; }.art-column { align-self: start; }.card-weight { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 8px; border: 1px solid var(--line); }.card-weight span { display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 38px; border-right: 1px solid var(--line); color: var(--muted); font-size: 10px; }.card-weight span:last-child { border-right: 0; color: var(--gold); }.card-weight strong { color: var(--ink); font-size: 15px; }.detail-column { min-width: 0; }.character-description { margin: 14px 0 18px; color: var(--muted); line-height: 1.65; }.ability-section { display: grid; gap: 12px; }.ability-block { border: 1px solid var(--line); background: #121715; }.ability-block>header { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 9px; min-height: 54px; padding: 8px 11px; border-bottom: 1px solid var(--line); }.ability-block>header>span { display: grid; place-items: center; width: 25px; height: 25px; border: 1px solid var(--copper); color: var(--gold); font: 700 12px Georgia, serif; }.ability-block h2 { margin: 0; font-size: 14px; }.ability-block header small { display: block; margin-top: 3px; color: var(--muted); font-size: 9px; }.ability-block header>strong { color: var(--copper); font-size: 10px; }.ability-block>p { margin: 0; padding: 11px; color: #d9ddd9; font-size: 12px; line-height: 1.65; }.ability-structure { display: grid; grid-template-columns: 1fr 1fr; margin: 0; border-top: 1px solid var(--line); }.ability-structure>div { min-width: 0; padding: 9px 11px; border: solid var(--line); border-width: 0 1px 1px 0; }.ability-structure dt { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 9px; }.ability-structure dd { display: grid; gap: 4px; margin: 5px 0 0; font-size: 10px; line-height: 1.45; }.legacy>header { grid-template-columns: 1fr auto; }.mono { overflow-wrap: anywhere; font-family: ui-monospace, monospace; font-size: 10px; }.balance-strip { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 18px; border: solid var(--line); border-width: 1px 0 0 1px; }.balance-strip div { display: grid; gap: 4px; padding: 9px; border: solid var(--line); border-width: 0 1px 1px 0; }.balance-strip span { color: var(--muted); font-size: 9px; }.balance-strip strong { font-size: 14px; }
@media(max-width:720px){.card-weight{grid-template-columns:1fr 1fr}.card-weight span:nth-child(2){border-right:0}.card-weight span:last-child{grid-column:1/-1;border-top:1px solid var(--line)}.ability-structure{grid-template-columns:1fr}.balance-strip{grid-template-columns:1fr 1fr}}
</style>
