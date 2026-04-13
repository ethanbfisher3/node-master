export const NO_ADS_PRICE = 5.0;
export const NO_ADS_REVENUECAT_ID = "remove_ads";
export const NO_ADS_ITEM_ID = "item:no-ads";

export const POPUP_AD_DURATION_SECONDS = 5;
export const DAILY_LEVEL_IDS = Array.from(
  { length: 10 },
  (_, index) => index + 1,
);
export const WEEKLY_LEVEL_IDS = Array.from(
  { length: 50 },
  (_, index) => index + 1,
);

export const PLAYER_PROGRESS_STORAGE_KEY = "node-master.player-progress";
export const COINS_STORAGE_KEY = "node-master.coins";
export const COMPLETED_LEVELS_STORAGE_KEY = "node-master.completed-levels";

export const SOLVED_HOLD_DURATION_MS = 700;
export const MIN_LEVELS_BETWEEN_INTERSTITIAL_ADS = 3;
export const MIN_TIME_BETWEEN_INTERSTITIAL_ADS_MS = 3 * 60 * 1000;

export const DEFAULT_CLASSIC_PACK_ID = "starter-1";
export const MIN_TIME_TRIAL_INTERSECTIONS = 2;
export const MAX_TIME_TRIAL_GENERATION_ATTEMPTS = 24;
