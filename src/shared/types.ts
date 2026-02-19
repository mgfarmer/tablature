export interface SegmentSample {
  /** Epoch milliseconds when the active segment ended. */
  timestamp: number;
  /** Duration in seconds, already rounded. */
  duration: number;
}

export interface TabTelemetry {
  url: string;
  title: string;
  domain: string;
  tabId?: number;
  windowId?: number;
  faviconUrl?: string;
  lastActivatedAt: number;
  totalActiveSeconds: number;
  visitCount: number;
  recentSegments: SegmentSample[];
}

export interface PriorityEntry {
  url: string;
  title: string;
  domain: string;
  score: number;
  activeSeconds24h: number;
  visitCount24h: number;
  lastActivatedAt: number;
  tabId?: number;
  windowId?: number;
  faviconUrl?: string;
}

export interface DomainAggregate {
  domain: string;
  score: number;
  entries: PriorityEntry[];
}

export interface StoredSettings {
  idleThresholdMinutes: number;
  maxPriorityTabs: number;
  previousSessionCount: number;
  domainGroupingEnabled: boolean;
  visualCueEnabled: boolean;
}

export interface PreviousSessionEntry {
  url: string;
  title: string;
  domain: string;
  recordedAt: number;
  score: number;
}

export type MessagePayload =
  | { kind: "tablature/getPriority" }
  | { kind: "tablature/getSettings" }
  | { kind: "tablature/updateSettings"; settings: Partial<StoredSettings> }
  | { kind: "tablature/groupPriorityTabs" }
  | { kind: "tablature/getPreviousSessions" }
  | { kind: "tablature/addActiveTab" }
  | { kind: "tablature/dismissEntry"; url: string };

export interface PriorityResponse {
  entries: PriorityEntry[];
  domains?: DomainAggregate[];
  generatedAt: number;
}

export interface SettingsResponse {
  settings: StoredSettings;
}

export interface PreviousSessionsResponse {
  entries: PreviousSessionEntry[];
}

export interface GroupPriorityResponse {
  groupedCount: number;
  groupIds: number[];
}

export interface AddActiveTabResponse {
  entry: PriorityEntry | null;
}
