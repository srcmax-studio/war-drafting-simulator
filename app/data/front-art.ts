import type { FrontDefinition } from '~/common/src/index';

export type FrontArtVariant = 'thumbnail' | 'web' | 'hd';

export const frontArtUrl = (frontId: string, variant: FrontArtVariant = 'web'): string => {
  if (frontId.startsWith('front-slot-') || frontId === 'hidden') return '/assets/fronts/hidden.webp';
  const directory = variant === 'thumbnail' ? 'thumbnails' : variant;
  return `/assets/fronts/${directory}/${frontId}.webp`;
};

export const frontArtAlt = (front: Pick<FrontDefinition, 'nameZh' | 'art'>): string => front.art?.altZh || `${front.nameZh}战线场景`;

export const preloadFrontArt = (frontIds: readonly string[]): void => {
  if (!import.meta.client) return;
  for (const frontId of [...new Set(frontIds)].filter((id) => id && !id.startsWith('front-slot-'))) {
    const href = frontArtUrl(frontId);
    if (document.head.querySelector(`link[data-front-art="${CSS.escape(frontId)}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.dataset.frontArt = frontId;
    document.head.append(link);
  }
};
