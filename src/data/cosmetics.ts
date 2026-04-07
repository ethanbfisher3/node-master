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
};

export type Cosmetic = {
  id: string;
  name: string;
  description: string;
  price: number;
  priceType: "coins" | "real-money";
  owned: boolean;
  image: string | null;
  theme: Partial<AppThemePalette>;
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
      surfaceAlt: "#dcfce7",
    },
  },
  {
    id: "sunset-theme",
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
    id: "midnight-theme",
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
    id: "mint-theme",
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
];

export function resolveAppTheme(
  cosmeticId: string | null | undefined,
): AppThemePalette {
  const selectedCosmetic = cosmetics.find((item) => item.id === cosmeticId);
  return { ...DEFAULT_APP_THEME, ...(selectedCosmetic?.theme ?? {}) };
}

export default cosmetics;
