export type AppThemePalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  text: string;
  mutedText: string;
  cardText: string;
  cardMutedText: string;
  buttonText: string;
  appTexture?: "wood" | "silver" | "bronze" | "marble" | "granite";
  appTextureSource?: number;
};

export type CosmeticCategory = "app-theme";

export type Cosmetic = {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  price: number;
  priceType: "coins" | "real-money";
  owned: boolean;
  image: string | null;
  theme?: Partial<AppThemePalette>;
};

export type ThemePack = {
  id: "theme_pack_light" | "theme_pack_dark" | "theme_pack_textures";
  name: string;
  description: string;
  cosmeticIds: string[];
};

export const DEFAULT_APP_THEME: AppThemePalette = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#dbeafe",
  primary: "#2563eb",
  text: "#0f172a",
  mutedText: "#64748b",
  cardText: "#0f172a",
  cardMutedText: "#64748b",
  buttonText: "#ffffff",
};

const cosmetics: Cosmetic[] = [
  {
    id: "green-theme",
    category: "app-theme",
    name: "Green Theme",
    description: "A refreshing green color scheme for the game.",
    price: 100,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      text: DEFAULT_APP_THEME.text,
      primary: "#16a34a",
      background: "#f0fdf4",
      surfaceAlt: "#b2f3c9",
    },
  },
  {
    id: "sunset-theme",
    category: "app-theme",
    name: "Sunset Theme",
    description: "Warm orange and rose tones across the app.",
    price: 120,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#ea580c",
      background: "#fff7ed",
      surfaceAlt: "#ffedd5",
      text: DEFAULT_APP_THEME.text,
      mutedText: "#9a3412",
    },
  },
  {
    id: "mint-theme",
    category: "app-theme",
    name: "Mint Theme",
    description: "Fresh mint and teal accent colors.",
    price: 130,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#0f766e",
      background: "#f0fdfa",
      surfaceAlt: "#ccfbf1",
      text: DEFAULT_APP_THEME.text,
    },
  },
  {
    id: "crimson-theme",
    category: "app-theme",
    name: "Crimson Theme",
    description: "Bold red accents for a high-energy style.",
    price: 150,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#b91c1c",
      background: "#fef2f2",
      surfaceAlt: "#fee2e2",
      text: DEFAULT_APP_THEME.text,
      mutedText: "#991b1b",
    },
  },
  {
    id: "gold-theme",
    category: "app-theme",
    name: "Gold Theme",
    description: "Premium gold highlights and warm neutrals.",
    price: 3.99,
    priceType: "real-money",
    owned: false,
    image: null,
    theme: {
      primary: "#b45309",
      background: "#fffbeb",
      surfaceAlt: "#fef3c7",
      text: DEFAULT_APP_THEME.text,
      mutedText: "#92400e",
    },
  },
  {
    id: "violet-theme",
    category: "app-theme",
    name: "Violet Theme",
    description: "Playful violet accents with soft contrast.",
    price: 2.99,
    priceType: "real-money",
    owned: false,
    image: null,
    theme: {
      primary: "#7c3aed",
      background: "#faf5ff",
      surfaceAlt: "#ede9fe",
      text: DEFAULT_APP_THEME.text,
      mutedText: "#5b21b6",
    },
  },
  {
    id: "berry-theme",
    category: "app-theme",
    name: "Berry Theme",
    description: "Rich berry tones with a soft cream contrast.",
    price: 160,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#be185d",
      background: "#fff1f2",
      surface: "#ffffff",
      surfaceAlt: "#ffe4e6",
      text: "#881337",
      mutedText: "#9f1239",
      cardText: "#4c0519",
      cardMutedText: "#9f1239",
      buttonText: "#ffffff",
    },
  },
  {
    id: "forest-theme",
    category: "app-theme",
    name: "Forest Theme",
    description: "Earthy greens and mossy highlights for calm play.",
    price: 175,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#15803d",
      background: "#f0fdf4",
      surface: "#ffffff",
      surfaceAlt: "#dcfce7",
      text: "#14532d",
      mutedText: "#166534",
      cardText: "#14532d",
      cardMutedText: "#166534",
      buttonText: "#ffffff",
    },
  },
  {
    id: "obsidian-theme",
    category: "app-theme",
    name: "Obsidian Theme",
    description: "A deep black-and-slate theme with crisp contrast.",
    price: 190,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#60a5fa",
      background: "#020617",
      surface: "#0f172a",
      surfaceAlt: "#1e293b",
      text: "#e2e8f0",
      mutedText: "#94a3b8",
      cardText: "#f8fafc",
      cardMutedText: "#cbd5e1",
      buttonText: "#ffffff",
    },
  },
  {
    id: "midnight-theme",
    category: "app-theme",
    name: "Midnight Theme",
    description: "Deep navy tones for a calm night look.",
    price: 140,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#1d4ed8",
      background: "#0f172a",
      surface: "#111827",
      surfaceAlt: "#1e293b",
      text: "#e2e8f0",
      mutedText: "#94a3b8",
      cardText: "#e2e8f0",
      cardMutedText: "#cbd5e1",
      buttonText: "#e2e8f0",
    },
  },
  {
    id: "midnight-rose-theme",
    category: "app-theme",
    name: "Midnight Rose",
    description: "Dark plum tones with a subtle rose glow.",
    price: 2.99,
    priceType: "real-money",
    owned: false,
    image: null,
    theme: {
      primary: "#fb7185",
      background: "#140b18",
      surface: "#1e1325",
      surfaceAlt: "#31213b",
      text: "#f5e8ef",
      mutedText: "#d8b4c0",
      cardText: "#fff1f2",
      cardMutedText: "#f9a8d4",
      buttonText: "#ffffff",
    },
  },
  {
    id: "dark-ember-theme",
    category: "app-theme",
    name: "Dark Ember",
    description: "Dark red and ember orange tones for an intense look.",
    price: 215,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#dc2626",
      background: "#1a0a0a",
      surface: "#2a1212",
      surfaceAlt: "#3f1d1d",
      text: "#fee2e2",
      mutedText: "#fca5a5",
      cardText: "#fef2f2",
      cardMutedText: "#fda4af",
      buttonText: "#ffffff",
    },
  },
  {
    id: "espresso-theme",
    category: "app-theme",
    name: "Espresso Theme",
    description: "Dark coffee browns with warm tan highlights.",
    price: 225,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#a16207",
      background: "#1c130d",
      surface: "#2d1f16",
      surfaceAlt: "#3f2a1d",
      text: "#fef3c7",
      mutedText: "#fcd34d",
      cardText: "#fef9c3",
      cardMutedText: "#fde68a",
      buttonText: "#ffffff",
    },
  },
  {
    id: "evergreen-night-theme",
    category: "app-theme",
    name: "Evergreen Night",
    description: "Dark green pine shades with cool mint accents.",
    price: 230,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#16a34a",
      background: "#08130c",
      surface: "#102016",
      surfaceAlt: "#1a2e22",
      text: "#dcfce7",
      mutedText: "#86efac",
      cardText: "#f0fdf4",
      cardMutedText: "#bbf7d0",
      buttonText: "#ffffff",
    },
  },
  {
    id: "wood-grain-theme",
    category: "app-theme",
    name: "Wood Grain",
    description: "Warm walnut and oak tones with a handcrafted feel.",
    price: 260,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#8b5a2b",
      background: "rgba(247, 239, 227, 0.3)",
      surface: "rgba(255, 250, 243, 0.6)",
      surfaceAlt: "rgba(232, 212, 189, 0.6)",
      text: "#4a2e1b",
      mutedText: "#7a4b2f",
      cardText: "#4a2e1b",
      cardMutedText: "#8a5a3a",
      buttonText: "#fffdf8",
      appTexture: "wood",
      appTextureSource: require("../images/wood_texture.jpg"),
    },
  },
  {
    id: "silver-satin-theme",
    category: "app-theme",
    name: "Silver Satin",
    description: "Brushed silver surfaces with cool blue-gray accents.",
    price: 270,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#94a3b8",
      background: "rgba(241, 245, 249, 0.6)",
      surface: "rgba(255, 255, 255, 0.6)",
      surfaceAlt: "rgba(220, 227, 234, 0.6)",
      text: "#334155",
      mutedText: "#64748b",
      cardText: "#334155",
      cardMutedText: "#64748b",
      buttonText: "#ffffff",
      appTexture: "silver",
      appTextureSource: require("../images/silver_texture.jpg"),
    },
  },
  {
    id: "bronze-forge-theme",
    category: "app-theme",
    name: "Bronze Forge",
    description: "Aged bronze and ember tones inspired by old metalwork.",
    price: 280,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#b66a2d",
      background: "rgba(253, 244, 234, 0.6)",
      surface: "rgba(255, 248, 239, 0.6)",
      surfaceAlt: "rgba(243, 220, 198, 0.6)",
      text: "#5d3a1a",
      mutedText: "#8b5a2b",
      cardText: "#5d3a1a",
      cardMutedText: "#a16207",
      buttonText: "#ffffff",
      appTexture: "bronze",
      appTextureSource: require("../images/bronze_texture.jpg"),
    },
  },
  {
    id: "marble-ivory-theme",
    category: "app-theme",
    name: "Marble Ivory",
    description: "Soft ivory stone tones with cool veined accents.",
    price: 300,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#64748b",
      background: "rgba(248, 250, 252, 0.6)",
      surface: "rgba(255, 255, 255, 0.6)",
      surfaceAlt: "rgba(236, 239, 243, 0.9)",
      text: "#334155",
      mutedText: "#64748b",
      cardText: "#334155",
      cardMutedText: "#64748b",
      buttonText: "#ffffff",
      appTexture: "marble",
      appTextureSource: require("../images/marble_texture.jpg"),
    },
  },
  {
    id: "granite-theme",
    category: "app-theme",
    name: "Granite",
    description: "Deep gray stone tones with warm undertones.",
    price: 300,
    priceType: "coins",
    owned: false,
    image: null,
    theme: {
      primary: "#525c66",
      background: "rgba(226, 232, 240, 0.68)",
      surface: "rgba(241, 245, 249, 0.72)",
      surfaceAlt: "rgba(203, 213, 225, 0.88)",
      text: "#1f2937",
      mutedText: "#475569",
      cardText: "#1f2937",
      cardMutedText: "#475569",
      buttonText: "#f8fafc",
      appTexture: "granite",
      appTextureSource: require("../images/granite_texture.jpg"),
    },
  },
];

export const THEME_PACKS: ThemePack[] = [
  {
    id: "theme_pack_light",
    name: "Light Theme Pack",
    description: "A curated set of bright themes for a clean daytime look.",
    cosmeticIds: [
      "green-theme",
      "sunset-theme",
      "mint-theme",
      "crimson-theme",
      "gold-theme",
      "violet-theme",
      "berry-theme",
      "forest-theme",
    ],
  },
  {
    id: "theme_pack_dark",
    name: "Dark Theme Pack",
    description: "A curated set of dark themes for a night-mode vibe.",
    cosmeticIds: [
      "obsidian-theme",
      "midnight-theme",
      "midnight-rose-theme",
      "dark-ember-theme",
      "espresso-theme",
      "evergreen-night-theme",
    ],
  },
  {
    id: "theme_pack_textures",
    name: "Texture Pack",
    description:
      "A curated collection of wood, silver, bronze, platinum, and stone-inspired looks for themes.",
    cosmeticIds: [
      "wood-grain-theme",
      "silver-satin-theme",
      "bronze-forge-theme",
      "platinum-ice-theme",
      "marble-ivory-theme",
      "granite-theme",
    ],
  },
];

export function resolveAppTheme(
  cosmeticId: string | null | undefined,
): AppThemePalette {
  const selectedCosmetic = cosmetics.find(
    (item) => item.id === cosmeticId && item.category === "app-theme",
  );
  return { ...DEFAULT_APP_THEME, ...(selectedCosmetic?.theme ?? {}) };
}

export default cosmetics;
