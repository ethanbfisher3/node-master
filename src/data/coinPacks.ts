export type CoinPack = {
  id: string;
  name: string;
  description: string;
  storeItemId: string | null;
  coins: number;
  priceDollars: number;
};

const coinPacks: CoinPack[] = [
  {
    id: "coin-pack-1",
    name: "Coin Pack I",
    description: "Get 100 coins to unlock new levels and cosmetics.",
    storeItemId: "coin_pack_1",
    coins: 100,
    priceDollars: 1.0,
  },
  {
    id: "coin-pack-2",
    name: "Coin Pack II",
    description: "Get 500 coins to unlock new levels and cosmetics.",
    storeItemId: "coin_pack_2",
    coins: 300,
    priceDollars: 2.5,
  },
  {
    id: "coin-pack-3",
    name: "Coin Pack III",
    description: "Get 1000 coins to unlock new levels and cosmetics.",
    storeItemId: "coin_pack_3",
    coins: 1000,
    priceDollars: 5.0,
  },
];

export default coinPacks;
