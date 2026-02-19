import type { StoredSettings } from "./types.js";

export const STORAGE_KEYS = {
  telemetry: "tablature.telemetry",
  settings: "tablature.settings",
  previousSessions: "tablature.previousSessions",
} as const;

export const ACTIVE_WINDOW_HOURS = 24;
export const RECENCY_DECAY_HOURS = 48;
export const SEGMENT_MIN_SECONDS = 1;
export const VISIT_MIN_SECONDS = 5;

export const PRIORITY_GROUP_NAME = "🔥 Priority";
export const PRIORITY_GROUP_COLOR: chrome.tabGroups.ColorEnum = "red";

export const DEFAULT_SETTINGS: StoredSettings = {
  idleThresholdMinutes: 3,
  maxPriorityTabs: 5,
  previousSessionCount: 20,
  domainGroupingEnabled: false,
  visualCueEnabled: false,
};

export const ALARM_NAMES = {
  flush: "tablature.flush",
} as const;

export const ALARM_INTERVAL_MINUTES = 0.5; // 30 seconds
