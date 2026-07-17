import type { CardDefinition } from '~/common/src/types';

export function cardImageUrl(card: Pick<CardDefinition, 'imageKey' | 'nameZh'>): string {
  const extension = useRuntimeConfig().public.assetExtension;
  return `/cards/${encodeURIComponent(card.imageKey ?? card.nameZh)}.${extension}`;
}

export function cardFallbackUrl(card: Pick<CardDefinition, 'era' | 'faction' | 'nameZh'>): string {
  const hue = [...(card.era || card.faction)].reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0) % 360;
  const initials = card.nameZh.slice(0, 2).replace(/[&<>"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700"><rect width="500" height="700" fill="hsl(${hue} 18% 18%)"/><path d="M0 520L500 320V700H0Z" fill="hsl(${hue} 28% 28%)"/><circle cx="250" cy="270" r="126" fill="none" stroke="hsl(${hue} 34% 58%)" stroke-width="5"/><text x="250" y="300" text-anchor="middle" fill="#eee7d7" font-size="94" font-family="serif">${initials}</text><text x="250" y="630" text-anchor="middle" fill="#eee7d7" font-size="34" font-family="sans-serif">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
