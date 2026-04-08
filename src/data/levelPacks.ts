export type LevelPack = {
  id: string
  name: string
  description: string
  defaultOwned: boolean
  storeItemId: string | null
  price: number
  priceType: "coins" | "real-money"
  levelIds: number[]
}

type LevelPackSeed = {
  id: string
  name: string
  description: string
  defaultOwned: boolean
  storeItemId: string | null
  price: number
  priceType: "coins" | "real-money"
}

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
    id: "advanced-1",
    name: "Advanced Pack I",
    description: "Premium extra pack available to purchase in the store.",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-1",
    price: 250,
    priceType: "coins",
  },
  {
    id: "advanced-2",
    name: "Advanced Pack II",
    description: "Another full premium set for long sessions.",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-2",
    price: 350,
    priceType: "coins",
  },
  {
    id: "advanced-3",
    name: "Advanced Pack III",
    description: "Final premium pack with full progression length.",
    defaultOwned: false,
    storeItemId: "level-pack:advanced-3",
    price: 450,
    priceType: "coins",
  },
]

export function createLevelPacks(levelCount: number): LevelPack[] {
  const safeCount = Math.max(1, Math.floor(levelCount))
  const allLevelIds = Array.from({ length: safeCount }, (_, index) => index + 1)

  return LEVEL_PACK_SEEDS.map((seed) => ({
    ...seed,
    levelIds: [...allLevelIds],
  }))
}
