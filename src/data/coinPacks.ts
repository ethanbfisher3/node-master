export type CoinPack = {
  id: string
  name: string
  description: string
  storeItemId: string | null
  coins: number
}

const coinPacks: CoinPack[] = [
  {
    id: "coin_pack_1",
    name: "Coin Pack I",
    description: "Get 100 coins to unlock new levels and cosmetics.",
    storeItemId: "coin_pack_1",
    coins: 100,
  },
  {
    id: "coin_pack_2",
    name: "Coin Pack II",
    description: "Get 300 coins to unlock new levels and cosmetics.",
    storeItemId: "coin_pack_2",
    coins: 300,
  },
  {
    id: "coin_pack_3",
    name: "Coin Pack III",
    description: "Get 1000 coins to unlock new levels and cosmetics.",
    storeItemId: "coin_pack_3",
    coins: 1000,
  },
]

export default coinPacks
