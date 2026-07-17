import type { FrontDefinition } from '~/common/src/index';

export const FRONT_CATEGORY_LABELS: Record<string, string> = {
  economy: '军令与资源',
  'high-risk': '高风险',
  power: '战力',
  '战力': '战力',
  trait: '角色特征',
  movement: '位置与调遣',
  dynamic: '动态规则',
  death: '阵亡与复归',
  capacity: '容量与部署',
  control: '控制',
  hidden: '揭示与情报',
  '技能': '技能'
};

export const FRONT_COMPLEXITY_LABELS: Record<FrontDefinition['complexity'], string> = {
  simple: '基础',
  advanced: '进阶',
  chaotic: '高风险'
};

export const frontPresentationLabels = (front: Pick<FrontDefinition, 'categories' | 'tags'>): string[] => [
  ...new Set([
    ...front.categories.map((item) => FRONT_CATEGORY_LABELS[item] ?? '特殊规则'),
    ...front.tags.filter((item) => !/[A-Za-z_-]/u.test(item))
  ])
];

export const frontFrequencyLabel = (weight: number): string => weight >= 1.2 ? '常见' : weight >= 0.8 ? '标准' : '少见';
