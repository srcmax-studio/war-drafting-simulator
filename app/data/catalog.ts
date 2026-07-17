import rawAssets from '../../assets/card-images/generated/card-assets.json';
import rawCatalog from '../../data/characters/generated/catalog.json';
import rawCards from '../../data/characters/generated/tcg-cards.json';
import rawPresets from '../../data/characters/generated/preset-decks.json';
import rawCorePack from '../../data/characters/data/packs/core/pack.json';
import { FRONT_DEFINITIONS, type CardDefinition } from '~/common/src/index';

export interface PresetDeck {
  deckId: string;
  nameZh: string;
  nameEn: string;
  strategyZh: string;
  cardIds: string[];
}

export interface CardAssetEntry {
  cardId: string;
  characterUid: string;
  characterName: string;
  slug: string;
  imageKey: string;
  web?: string;
  thumbnail?: string;
  hd?: string;
  fallback: boolean;
}

export interface CatalogMetadata {
  schemaVersion: number;
  catalogVersion: string;
  packVersions: Record<string, string>;
  cards: number;
}

export interface ContentPackManifest {
  packId: string;
  setCode: string;
  nameZh: string;
  nameEn?: string;
  version: string;
  releaseStatus: 'development' | 'preview' | 'released' | 'retired';
  cards: string[];
  fronts: string[];
  tokens: string[];
  minimumGameVersion: string;
  descriptionZh: string;
}

export const CARDS = rawCards as unknown as CardDefinition[];
export const CARD_BY_ID: Readonly<Record<string, CardDefinition>> = Object.fromEntries(CARDS.map((card) => [card.cardId, card]));
export const PRESET_DECKS = rawPresets as PresetDeck[];
export const ASSET_ENTRIES = rawAssets as CardAssetEntry[];
export const ASSET_BY_CARD: Readonly<Record<string, CardAssetEntry>> = Object.fromEntries(ASSET_ENTRIES.map((entry) => [entry.cardId, entry]));
export const FRONTS = FRONT_DEFINITIONS;
export const CATALOG = rawCatalog as CatalogMetadata;
export const CATALOG_VERSION = CATALOG.catalogVersion;
export const PACK_VERSIONS: Readonly<Record<string, string>> = CATALOG.packVersions;
export const CONTENT_PACKS = [rawCorePack as unknown as ContentPackManifest];
export const CARD_ID_MIGRATIONS: Readonly<Record<string, string>> = Object.freeze({});
export { cardFallbackUrl, cardImageUrl } from '~/utils/card-images';
