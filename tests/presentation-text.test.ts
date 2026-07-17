import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../app/common/src/index.js';
import {
  TRIGGER_LABELS,
  deploymentFailureLabel,
  eventLabel,
  formatCardStatus,
  formatCondition,
  formatEffect,
  formatLimit,
  formatSelector
} from '../app/utils/ability-text.js';
import { formatRuleError } from '../app/utils/game-errors.js';

const cards = JSON.parse(readFileSync('data/characters/generated/tcg-cards.json', 'utf8')) as CardDefinition[];

describe('player-facing structured text', () => {
  it('translates conditions, selectors, and effects without exposing enum values', () => {
    const condition = formatCondition({ type: 'hand_count', operator: 'at_least', value: 4, scope: 'owner' });
    const selector = formatSelector({ type: 'weakest_card', side: 'opponent', scope: 'source_front', count: 1, random: true });
    const effect = formatEffect({ type: 'move_card', destination: 'source_front', target: { type: 'same_front_allies', side: 'owner' } });

    expect(condition).toBe('己方手牌数 至少 4');
    expect(selector).toContain('敌方');
    expect(selector).toContain('当前战线');
    expect(effect).toContain('移至当前战线');
    expect(`${condition}${selector}${effect}`).not.toMatch(/owner|opponent|source_front|move_card/u);
  });

  it('uses safe Chinese fallbacks for unknown events, statuses, and failure reasons', () => {
    expect(eventLabel({ sequence: 1, type: 'future_internal_event', turn: 1, public: true, payload: {} })).toBe('战局变化');
    expect(formatCardStatus('future_internal_status')).toBe('特殊状态');
    expect(deploymentFailureLabel('future_internal_reason')).toBe('部署条件已发生变化');
  });

  it('formats every catalog skill without leaking structured identifiers', () => {
    for (const ability of cards.flatMap((card) => card.abilities ?? [])) {
      const presentation = [
        TRIGGER_LABELS[ability.trigger],
        formatSelector(ability.target),
        ...(ability.conditions ?? []).map(formatCondition),
        ...ability.effects.map(formatEffect),
        formatLimit(ability.limit)
      ].join(' ');
      expect(presentation).not.toMatch(/[A-Za-z_]/u);
    }
  });

  it('localizes rule errors without echoing server codes or messages', () => {
    expect(formatRuleError('INSUFFICIENT_ENERGY')).toBe('军令不足，无法提交当前计划。');
    expect(formatRuleError('FUTURE_INTERNAL_ERROR')).toBe('操作未完成，请稍后重试。');
    expect(formatRuleError('FUTURE_INTERNAL_ERROR')).not.toContain('FUTURE_INTERNAL_ERROR');
  });
});
