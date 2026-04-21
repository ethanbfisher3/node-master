export type LevelPack = {
  id: string;
  name: string;
  description: string;
  defaultOwned: boolean;
  storeItemId: string | null;
  price?: number;
  priceType: "coins" | "real-money";
  levelIds: number[];
};

type LevelPackSeed = {
  id: string;
  name: string;
  description: string;
  defaultOwned: boolean;
  storeItemId: string | null;
  price?: number;
  priceType: "coins" | "real-money";
};

const LEVEL_PACK_SEEDS: LevelPackSeed[] = [
  {
    id: "starter-1",
    name: "Starter Pack I",
    description: "Core untangle set for warm-up sessions.",
    defaultOwned: true,
    storeItemId: null,
    price: 0,
    priceType: "coins",
  },
  {
    id: "starter-2",
    name: "Starter Pack II",
    description: "A second full pack with the same progression depth.",
    defaultOwned: true,
    storeItemId: null,
    price: 0,
    priceType: "coins",
  },
  {
    id: "starter-3",
    name: "Starter Pack III",
    description: "Another complete pack to keep the grind going.",
    defaultOwned: true,
    storeItemId: null,
    price: 0,
    priceType: "coins",
  },
  {
    id: "starter-4",
    name: "Starter Pack IV",
    description: "Full-length challenges tuned for quick play loops.",
    defaultOwned: true,
    storeItemId: null,
    price: 0,
    priceType: "coins",
  },
  {
    id: "starter-5",
    name: "Starter Pack V",
    description: "A fifth default pack with full level count.",
    defaultOwned: true,
    storeItemId: null,
    price: 0,
    priceType: "coins",
  },
  {
    id: "reverse-1",
    name: "Reverse Pack",
    description: "Start solved, then cross every line to finish.",
    defaultOwned: true,
    storeItemId: null,
    price: 0,
    priceType: "coins",
  },
  {
    id: "level_pack_1",
    name: "Advanced Pack I",
    description: "220 more levels to play!",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-1",
    priceType: "real-money",
  },
  {
    id: "level_pack_2",
    name: "Advanced Pack II",
    description: "220 more levels to play!",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-2",
    priceType: "real-money",
  },
];

export function createLevelPacks(levelCount: number): LevelPack[] {
  const safeCount = Math.max(1, Math.floor(levelCount));
  const allLevelIds = Array.from(
    { length: safeCount },
    (_, index) => index + 1,
  );

  return LEVEL_PACK_SEEDS.map((seed) => ({
    ...seed,
    levelIds: [...allLevelIds],
  }));
}
