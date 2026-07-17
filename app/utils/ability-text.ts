import type {
  AbilityCondition,
  AbilityTrigger,
  AtomicEffectType,
  EffectSpec,
  GameEvent,
  TargetSelector,
  TargetSelectorType,
  TriggerLimit
} from '~/common/src/index';

export const TRIGGER_LABELS: Record<AbilityTrigger, string> = {
  on_draw: '抽到时',
  on_created: '生成时',
  before_play: '部署前',
  on_play: '打出时',
  on_reveal: '揭示时',
  after_reveal: '揭示后',
  on_deploy: '部署时',
  after_card_played_here: '此处部署后',
  after_ally_played: '友军部署后',
  after_enemy_played: '敌军部署后',
  turn_start: '回合开始',
  turn_end: '回合结束',
  before_move: '调遣前',
  after_move: '调遣后',
  on_discard: '弃置时',
  on_destroy: '阵亡时',
  after_ally_destroyed: '友军阵亡后',
  after_enemy_destroyed: '敌军阵亡后',
  on_return_to_hand: '返回手牌时',
  on_front_revealed: '战线揭示时',
  on_front_won: '赢得战线时',
  on_front_lost: '失去战线时',
  finale: '终局',
  before_scoring: '计分前',
  ongoing: '持续',
  deploy: '部署时'
};

const CONDITION_LABELS: Record<AbilityCondition['type'], string> = {
  turn: '当前回合', front_card_count: '此处卡牌数', front_total_power: '此处总战力', is_leading: '此处领先', is_trailing: '此处落后',
  card_cost: '卡牌费用', base_power: '基础战力', current_power: '当前战力', era: '时代', region: '地区', profession: '职业', identity: '身份', faction: '阵营', tag: '标签',
  was_moved: '曾被调遣', created_by_effect: '由效果生成', died_before: '曾经阵亡', first_trigger: '首次触发', hand_count: '手牌数', deck_count: '牌库数', graveyard_count: '阵亡区数',
  controlled_fronts: '已控制战线', has_initiative: '拥有制势', stake: '当前战功', banner_raised: '已经举旗', deployments_this_game: '本局部署数', moves_this_game: '本局调遣数',
  deaths_this_game: '本局阵亡数', discards_this_game: '本局弃置数', cards_drawn_this_game: '本局抽牌数', deck_tag_count: '牌组标签数', marker_count: '标记数', source_is_token: '来源为衍生卡'
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: '等于', not_equals: '不等于', at_least: '至少', at_most: '至多', greater_than: '高于', less_than: '低于', includes: '包含', not_includes: '不包含'
};

const CONDITION_SCOPE_LABELS: Record<NonNullable<AbilityCondition['scope']>, string> = {
  self: '自身', owner: '己方', opponent: '对手', source_front: '当前战线', all_fronts: '所有战线'
};

const NEGATIVE_CONDITION_LABELS: Partial<Record<AbilityCondition['type'], string>> = {
  is_leading: '此处未领先', is_trailing: '此处未落后', was_moved: '尚未被调遣', created_by_effect: '并非由效果生成', died_before: '此前未曾阵亡',
  first_trigger: '并非首次触发', has_initiative: '未拥有制势', banner_raised: '尚未举旗', source_is_token: '并非衍生卡'
};

const SELECTOR_LABELS: Record<TargetSelectorType, string> = {
  self: '自身', source_front: '来源战线', owner: '己方玩家', opponent: '对手', same_front_allies: '同线友军', same_front_enemies: '同线敌军', adjacent_front_allies: '相邻战线友军',
  adjacent_front_enemies: '相邻战线敌军', all_allies: '全场友军', all_enemies: '全场敌军', strongest_card: '最强卡牌', weakest_card: '最弱卡牌', highest_cost_card: '最高费卡牌',
  lowest_cost_card: '最低费卡牌', random_legal_card: '随机合法卡牌', owner_hand: '己方手牌', opponent_hand: '对手手牌', owner_deck_top: '己方牌库顶', owner_deck_random: '己方牌库随机卡牌',
  owner_graveyard: '己方阵亡区', owner_discard: '己方弃置区', matching_tag: '指定标签卡牌', matching_era: '指定时代卡牌', matching_region: '指定地区卡牌', unrevealed_cards: '未揭示卡牌',
  moved_cards: '已调遣卡牌', deployed_this_turn: '本回合部署卡牌', all_fronts: '所有战线'
};

const SIDE_LABELS: Record<NonNullable<TargetSelector['side']>, string> = { owner: '己方', opponent: '敌方', both: '双方' };
const SELECTOR_SCOPE_LABELS: Record<NonNullable<TargetSelector['scope']>, string> = { source_front: '当前战线', adjacent_fronts: '相邻战线', all_fronts: '所有战线' };
const FILTER_LABELS: Record<NonNullable<TargetSelector['filters']>[number]['field'], string> = {
  cost: '费用', base_power: '基础战力', current_power: '当前战力', era: '时代', region: '地区', profession: '职业', identity: '身份', faction: '阵营', tag: '标签', revealed: '是否揭示', token: '是否为衍生卡'
};

const DURATION_LABELS: Record<string, string> = { turn: '本回合', game: '本局' };
const DESTINATION_LABELS: Record<NonNullable<EffectSpec['destination']>, string> = {
  left: '左侧战线', right: '右侧战线', adjacent: '相邻战线', weakest_front: '战力最低的战线', strongest_front: '战力最高的战线', random_front: '随机战线', source_front: '当前战线', hand: '手牌'
};
const SCALE_LABELS: Record<NonNullable<EffectSpec['scaleBy']>, string> = {
  target_count: '目标数量', other_allies: '其他友军数量', matching_tags: '符合标签的卡牌数', distinct_eras: '不同时代数', distinct_regions: '不同地区数', marker_count: '标记数量'
};
const COUNTER_LABELS: Record<NonNullable<EffectSpec['counter']>, string> = {
  deployments: '部署次数', moves: '调遣次数', deaths: '阵亡次数', discards: '弃置次数', cardsDrawn: '抽牌次数'
};

export const CARD_STATUS_LABELS: Readonly<Record<string, string>> = {
  silenced: '技能失效', protected: '受到保护', immune: '免疫', ongoing_removed: '持续效果已移除', marked: '已标记'
};

export const EFFECT_LABELS: Record<AtomicEffectType, string> = {
  add_power: '增加战力', reduce_power: '降低战力', set_power: '设置战力', swap_power: '交换战力', copy_power: '复制战力', temporary_power: '临时战力', permanent_power: '永久战力',
  add_cost: '增加费用', reduce_cost: '降低费用', set_cost: '设置费用', draw_cards: '抽牌', create_token: '征召衍生卡', copy_card: '复制卡牌', transform_card: '转化卡牌', discard_cards: '弃置',
  destroy_cards: '阵亡', revive_card: '复归', return_to_hand: '返回手牌', shuffle_into_deck: '洗回牌库', move_card: '调遣', swap_positions: '交换位置', randomize_position: '随机分配位置',
  block_deploy: '封锁部署', block_move: '封锁调遣', silence: '封锁技能', protect: '保护', immune: '免疫', delay_reveal: '延迟揭示', reveal_now: '立即揭示', repeat_ability: '重复技能',
  remove_ongoing: '移除持续效果', increase_capacity: '增加容量', decrease_capacity: '减少容量', gain_energy: '增加军令', lose_energy: '减少军令', store_energy: '储存军令', consume_marker: '消耗标记',
  add_marker: '生成标记', seize_initiative: '夺取制势', change_stake: '改变战功', history_power: '读取历史并结算战力', other_front_power: '按其他战线结算', deck_composition_power: '按牌组构成结算', set_status: '设置状态'
};

const LIMIT_LABELS: Record<TriggerLimit['scope'], string> = {
  once_per_turn: '每回合一次', once_per_game: '每局一次', once_per_front: '每条战线一次', first_only: '仅首次', up_to: '限定次数'
};

const localizedValue = (value: unknown): string => typeof value === 'boolean' ? (value ? '是' : '否') : String(value ?? '');

export function formatCondition(condition: AbilityCondition): string {
  const scope = condition.scope && condition.scope !== 'self' ? CONDITION_SCOPE_LABELS[condition.scope] : '';
  const value = condition.values?.join('、') ?? condition.value ?? condition.tag ?? '';
  if (typeof value === 'boolean' && (condition.operator ?? 'equals') === 'equals') {
    return value ? `${scope}${CONDITION_LABELS[condition.type]}` : `${scope}${NEGATIVE_CONDITION_LABELS[condition.type] ?? `不满足${CONDITION_LABELS[condition.type]}`}`;
  }
  return `${scope}${CONDITION_LABELS[condition.type]} ${OPERATOR_LABELS[condition.operator ?? 'equals']} ${localizedValue(value)}`.trim();
}

export function formatSelector(selector: TargetSelector): string {
  const details = [
    selector.count ? `数量 ${selector.count}` : '',
    selector.side ? `阵营 ${SIDE_LABELS[selector.side]}` : '',
    selector.scope ? `范围 ${SELECTOR_SCOPE_LABELS[selector.scope]}` : '',
    selector.includeSelf === false ? '不含自身' : '',
    selector.tag ? `标签 ${selector.tag}` : '',
    selector.era ? `时代 ${selector.era}` : '',
    selector.region ? `地区 ${selector.region}` : '',
    selector.random ? '随机选择' : '',
    ...(selector.filters ?? []).map((filter) => `${FILTER_LABELS[filter.field]} ${OPERATOR_LABELS[filter.operator ?? 'equals']} ${localizedValue(filter.value)}`)
  ].filter(Boolean);
  return `${SELECTOR_LABELS[selector.type]}${details.length ? `（${details.join('；')}）` : ''}`;
}

export function formatEffect(effect: EffectSpec): string {
  const amount = effect.amount ?? (typeof effect.value === 'number' ? effect.value : undefined);
  const unit = ['draw_cards', 'discard_cards'].includes(effect.type) ? '张'
    : ['add_marker', 'consume_marker'].includes(effect.type) ? '枚'
      : effect.type === 'repeat_ability' ? '次'
        : ['increase_capacity', 'decrease_capacity'].includes(effect.type) ? '格'
          : '点';
  const details = [
    amount !== undefined ? `${localizedValue(amount)}${typeof amount === 'number' ? unit : ''}` : '',
    effect.marker ? `${effect.marker}标记` : '',
    effect.status ? CARD_STATUS_LABELS[effect.status] ?? '特殊状态' : '',
    effect.duration ? `持续${typeof effect.duration === 'number' ? `${effect.duration}回合` : DURATION_LABELS[effect.duration]}` : '',
    effect.destination ? `移至${DESTINATION_LABELS[effect.destination]}` : '',
    effect.counter ? `按${COUNTER_LABELS[effect.counter]}` : '',
    effect.tag ? `标签 ${effect.tag}` : '',
    effect.multiplier !== undefined ? `比例 ${effect.multiplier <= 1 ? `${Math.round(effect.multiplier * 100)}%` : effect.multiplier}` : '',
    effect.scaleBy ? `按${SCALE_LABELS[effect.scaleBy]}结算` : '',
    effect.minimum !== undefined ? `至少 ${effect.minimum}` : '',
    effect.maximum !== undefined ? `最多 ${effect.maximum}` : '',
    effect.target ? formatSelector(effect.target) : ''
  ].filter(Boolean);
  return `${EFFECT_LABELS[effect.type]}${details.length ? ` · ${details.join(' · ')}` : ''}`;
}

export function formatLimit(limit?: TriggerLimit): string {
  if (!limit) return '不限次';
  return limit.scope === 'up_to' ? `最多 ${limit.count ?? 1} 次` : LIMIT_LABELS[limit.scope];
}

const EVENT_LABELS: Record<string, string> = {
  game_created: '战局建立', cards_drawn: '抽取卡牌', opponent_drew: '对手抽牌', front_revealed: '战线揭示', late_front_reveal: '延迟战线揭示', turn_started: '回合开始',
  turn_submitted: '行动提交', turn_plan_updated: '计划更新', turn_locked: '行动锁定', reveal_order: '揭示顺序', card_deployed: '卡牌部署', deployment_fizzled: '部署失效', card_revealed: '卡牌揭示',
  ability_started: '技能开始', ability_resolved: '技能结算', power_changed: '战力变化', allies_reinforced: '友军增援', energy_changed: '军令变化', cards_recruited: '征召卡牌', card_discarded: '卡牌弃置',
  card_destroyed: '角色阵亡', card_returned: '角色复归', front_blocked: '战线封锁', enemies_weakened: '敌军削弱', formation_changed: '阵形变化', card_copied: '卡牌复制', initiative_seized: '夺取制势',
  ability_registered: '技能触发', card_moved: '角色调遣', front_effect_resolved: '战线结算', turn_resolved: '回合结算', stake_changed: '战功生效', banner_raised: '举旗', banner_accepted: '接受举旗',
  player_withdrew: '玩家撤军', game_ended: '战局结束', reveal_all_early: '战线提前揭示', early_reveal: '提前揭示', card_status_changed: '状态变化', marker_changed: '标记变化',
  turn_undone: '撤销行动'
};

const DEPLOYMENT_FAILURE_LABELS: Record<string, string> = {
  card_left_hand: '卡牌已不在手牌中', front_capacity: '战线容量已满', front_restriction: '不符合战线部署规则', energy_changed: '军令不足'
};

export function formatCardStatus(status: string): string {
  if (status.startsWith('turn:')) return '本回合状态';
  return CARD_STATUS_LABELS[status] ?? '特殊状态';
}

export function deploymentFailureLabel(reason: unknown): string {
  return typeof reason === 'string' ? DEPLOYMENT_FAILURE_LABELS[reason] ?? '部署条件已发生变化' : '部署条件已发生变化';
}

export function eventLabel(event: GameEvent, cardName?: string, abilityName?: string): string {
  const base = EVENT_LABELS[event.type] ?? '战局变化';
  if (event.type === 'ability_started' || event.type === 'ability_resolved') {
    const phase = event.type === 'ability_started' ? '触发' : '完成';
    return `${cardName ?? '角色'} · ${abilityName ?? '技能'} ${phase}`;
  }
  if (event.type === 'ability_effect_resolved') {
    const effect = EFFECT_LABELS[event.payload.effectType as AtomicEffectType] ?? '技能效果';
    return `${cardName ?? '角色'} · ${effect}完成`;
  }
  if (cardName && ['card_deployed', 'card_revealed', 'card_destroyed', 'card_returned', 'card_moved'].includes(event.type)) return `${cardName} · ${base}`;
  return base;
}
