export type LevelPack = {
  id: string;
  name: string;
  description: string;
  defaultOwned: boolean;
  storeItemId: string | null;
  levelIds: number[];
};

type LevelPackSeed = {
  id: string;
  name: string;
  description: string;
  defaultOwned: boolean;
  storeItemId: string | null;
};

const LEVEL_PACK_SEEDS: LevelPackSeed[] = [
  {
    id: "starter-1",
    name: "Starter Pack I",
    description: "Core untangle set for warm-up sessions.",
    defaultOwned: true,
    storeItemId: null,
  },
  {
    id: "starter-2",
    name: "Starter Pack II",
    description: "A second full pack with the same progression depth.",
    defaultOwned: true,
    storeItemId: null,
  },
  {
    id: "starter-3",
    name: "Starter Pack III",
    description: "Another complete pack to keep the grind going.",
    defaultOwned: true,
    storeItemId: null,
  },
  {
    id: "starter-4",
    name: "Starter Pack IV",
    description: "Full-length challenges tuned for quick play loops.",
    defaultOwned: true,
    storeItemId: null,
  },
  {
    id: "starter-5",
    name: "Starter Pack V",
    description: "A fifth default pack with full level count.",
    defaultOwned: true,
    storeItemId: null,
  },
  {
    id: "advanced-1",
    name: "Advanced Pack I",
    description: "Premium extra pack available to purchase in the store.",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-1",
  },
  {
    id: "advanced-2",
    name: "Advanced Pack II",
    description: "Another full premium set for long sessions.",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-2",
  },
  {
    id: "advanced-3",
    name: "Advanced Pack III",
    description: "Final premium pack with full progression length.",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-3",
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
