export type ViewType =
  | "home"
  | "admin"
  | "level-packs"
  | "levels"
  | "daily-weekly-levels"
  | "time-trial"
  | "store"
  | "game"
  | "complete"
  | "time-trial-result"
  | "settings"

export type PlayMode = "classic" | "daily" | "weekly" | "time-trial"

export type TrialDuration = 30 | 60 | 120

export type TimeTrialState = {
  nodeCount: number | null
  durationSeconds: TrialDuration
  timeLeftSeconds: number
  active: boolean
  solvedCount: number
  earnedCoins: number
}
