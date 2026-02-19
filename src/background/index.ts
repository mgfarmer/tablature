import {
  ACTIVE_WINDOW_HOURS,
  ALARM_INTERVAL_MINUTES,
  ALARM_NAMES,
  DEFAULT_SETTINGS,
  PRIORITY_GROUP_COLOR,
  PRIORITY_GROUP_NAME,
  SEGMENT_MIN_SECONDS,
  STORAGE_KEYS,
  VISIT_MIN_SECONDS,
} from "../shared/constants.js";
import {
  MS_IN_SECOND,
  clamp,
  domainFromUrl,
  now,
  pruneSegments,
  recencyMultiplier,
  sumSegmentsWithinHours,
} from "../shared/util.js";
import type {
  AddActiveTabResponse,
  DomainAggregate,
  GroupPriorityResponse,
  MessagePayload,
  PreviousSessionEntry,
  PriorityEntry,
  PriorityResponse,
  SettingsResponse,
  StoredSettings,
  TabTelemetry,
} from "../shared/types.js";

const localStorageArea = chrome.storage.local;
const syncStorageArea = chrome.storage?.sync ?? chrome.storage.local;
const MAX_SEGMENTS_PER_TAB = 120;

interface AttentionState {
  tabId: number | null;
  windowId: number | null;
  startedAt: number | null;
}

const state: {
  telemetry: Map<number, TabTelemetry>;
  previousSessions: PreviousSessionEntry[];
  settings: StoredSettings;
  attention: AttentionState;
  focusedWindowId: number | null;
  lastFocusedTabId: number | null;
  idleState: chrome.idle.IdleState;
} = {
  telemetry: new Map(),
  previousSessions: [],
  settings: DEFAULT_SETTINGS,
  attention: { tabId: null, windowId: null, startedAt: null },
  focusedWindowId: null,
  lastFocusedTabId: null,
  idleState: "active",
};

let flushInFlight: Promise<void> | null = null;
type PreviousSessionsEntryResponse = { entries: PreviousSessionEntry[] };

const ready = initialize().catch((error) => {
  console.error("[tablature] failed to initialize", error);
  throw error;
});

chrome.runtime.onMessage.addListener(
  (message: MessagePayload, _sender, sendResponse) => {
    ready
      .then(() => handleMessage(message))
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error("[tablature] message handling failed", error);
        sendResponse({
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  },
);

chrome.commands.onCommand.addListener((command) => {
  ready
    .then(async () => {
      if (command === "tablature.group-priority") {
        await groupPriorityTabs();
      }
    })
    .catch((error) => console.error("[tablature] command error", error));
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  ready
    .then(() => handleTabActivated(activeInfo))
    .catch((error) => console.error("[tablature] tabs.onActivated", error));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  ready
    .then(() => handleTabRemoved(tabId))
    .catch((error) => console.error("[tablature] tabs.onRemoved", error));
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  ready
    .then(() => handleTabUpdated(changeInfo, tab))
    .catch((error) => console.error("[tablature] tabs.onUpdated", error));
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  ready
    .then(() => handleWindowFocusChange(windowId))
    .catch((error) =>
      console.error("[tablature] windows.onFocusChanged", error),
    );
});

chrome.idle.onStateChanged.addListener((newState) => {
  ready
    .then(() => handleIdleStateChange(newState))
    .catch((error) => console.error("[tablature] idle.onStateChanged", error));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAMES.flush) {
    ready
      .then(() => flushState("alarm"))
      .catch((error) => console.error("[tablature] flush alarm error", error));
  }
});

chrome.runtime.onStartup.addListener(() => {
  ready
    .then(() => flushState("startup"))
    .catch((error) => console.error("[tablature] startup flush error", error));
});

chrome.runtime.onSuspend?.addListener(() => {
  finalizeAttention("suspend");
  void flushState("suspend");
});

async function initialize(): Promise<void> {
  await Promise.all([
    loadSettings(),
    loadTelemetry(),
    loadPreviousSessions(),
    captureInitialFocus(),
  ]);
  await warmActiveTab();
  chrome.idle.setDetectionInterval(
    Math.max(15, Math.round(state.settings.idleThresholdMinutes * 60)),
  );
  chrome.alarms.create(ALARM_NAMES.flush, {
    delayInMinutes: ALARM_INTERVAL_MINUTES,
    periodInMinutes: ALARM_INTERVAL_MINUTES,
  });
  console.info("[tablature] telemetry engine ready");
}

async function loadSettings(): Promise<void> {
  const stored = await syncStorageArea.get(STORAGE_KEYS.settings);
  const merged = sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEYS.settings] as StoredSettings | undefined),
  });
  state.settings = merged;
}

async function loadTelemetry(): Promise<void> {
  const stored = await localStorageArea.get(STORAGE_KEYS.telemetry);
  const records = stored[STORAGE_KEYS.telemetry] as TabTelemetry[] | undefined;
  if (!Array.isArray(records)) {
    return;
  }
  for (const entry of records) {
    if (typeof entry.tabId !== "number") {
      continue;
    }
    entry.recentSegments = pruneSegments(entry.recentSegments ?? []);
    if (entry.recentSegments.length > MAX_SEGMENTS_PER_TAB) {
      entry.recentSegments.splice(
        0,
        entry.recentSegments.length - MAX_SEGMENTS_PER_TAB,
      );
    }
    state.telemetry.set(entry.tabId, entry);
  }
}

async function loadPreviousSessions(): Promise<void> {
  const stored = await localStorageArea.get(STORAGE_KEYS.previousSessions);
  const entries = stored[STORAGE_KEYS.previousSessions] as
    | PreviousSessionEntry[]
    | undefined;
  if (Array.isArray(entries)) {
    state.previousSessions = entries.slice(
      0,
      state.settings.previousSessionCount,
    );
  }
}

async function captureInitialFocus(): Promise<void> {
  try {
    const window = await chrome.windows.getLastFocused();
    state.focusedWindowId = window?.id ?? null;
  } catch {
    state.focusedWindowId = null;
  }
}

async function warmActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab) {
    await focusTab(tab);
  }
}

async function handleMessage(
  message: MessagePayload,
): Promise<
  | PriorityResponse
  | SettingsResponse
  | GroupPriorityResponse
  | PreviousSessionsEntryResponse
  | AddActiveTabResponse
  | undefined
> {
  switch (message.kind) {
    case "tablature/getPriority":
      return buildPriorityResponse();
    case "tablature/getSettings":
      return { settings: state.settings } satisfies SettingsResponse;
    case "tablature/updateSettings":
      await applySettingsUpdate(message.settings);
      return { settings: state.settings } satisfies SettingsResponse;
    case "tablature/groupPriorityTabs":
      return groupPriorityTabs();
    case "tablature/getPreviousSessions":
      return { entries: state.previousSessions };
    case "tablature/addActiveTab":
      return addActiveTabToPriority();
    case "tablature/dismissEntry":
      dismissTelemetryEntry(message.url);
      return undefined;
    default:
      return undefined;
  }
}

function dismissTelemetryEntry(url: string): void {
  for (const [tabId, entry] of state.telemetry) {
    if (entry.url === url) {
      state.telemetry.delete(tabId);
    }
  }
  queueFlush();
}

async function handleTabActivated(
  activeInfo: chrome.tabs.TabActiveInfo,
): Promise<void> {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await focusTab(tab);
  } catch (error) {
    console.warn("[tablature] unable to resolve activated tab", error);
  }
}

async function focusTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    return;
  }
  state.lastFocusedTabId = tab.id;

  if (state.attention.tabId === tab.id) {
    const existing = upsertTelemetry(tab);
    if (state.attention.startedAt === null && canTrackWindow(tab.windowId)) {
      state.attention.startedAt = now();
      existing.lastActivatedAt = state.attention.startedAt;
    }
    return;
  }

  finalizeAttention("tab-switch");
  const entry = upsertTelemetry(tab);
  entry.lastActivatedAt = now();
  state.attention = {
    tabId: tab.id,
    windowId: tab.windowId ?? null,
    startedAt: canTrackWindow(tab.windowId) ? now() : null,
  };
}

async function handleTabRemoved(tabId: number): Promise<void> {
  if (state.attention.tabId === tabId) {
    finalizeAttention("tab-removed");
  }
  if (state.lastFocusedTabId === tabId) {
    state.lastFocusedTabId = null;
  }
  archiveTelemetry(tabId);
}

function archiveTelemetry(tabId: number): void {
  const entry = state.telemetry.get(tabId);
  if (!entry) {
    return;
  }
  const priorityEntry = telemetryToPriorityEntry(entry);
  if (priorityEntry) {
    appendPreviousSessions([priorityEntry]);
  }
  state.telemetry.delete(tabId);
  queueFlush();
}

function handleTabUpdated(
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
): void {
  if (!tab.id) {
    return;
  }
  const entry = state.telemetry.get(tab.id);
  if (!entry) {
    return;
  }
  if (changeInfo.title) {
    entry.title = changeInfo.title;
  }
  if (changeInfo.favIconUrl) {
    entry.faviconUrl = changeInfo.favIconUrl;
  }
  if (changeInfo.url) {
    entry.url = changeInfo.url;
    entry.domain = domainFromUrl(changeInfo.url);
  }
}

async function handleWindowFocusChange(windowId: number): Promise<void> {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    state.focusedWindowId = null;
    finalizeAttention("window-blur");
    return;
  }
  state.focusedWindowId = windowId;
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) {
    await focusTab(tab);
  }
}

async function handleIdleStateChange(
  newState: chrome.idle.IdleState,
): Promise<void> {
  state.idleState = newState;
  if (newState === "active") {
    if (state.focusedWindowId !== null) {
      const [tab] = await chrome.tabs.query({
        active: true,
        windowId: state.focusedWindowId,
      });
      if (tab) {
        await focusTab(tab);
        return;
      }
    }
    return;
  }
  finalizeAttention("idle");
}

function canTrackWindow(windowId?: number | null): boolean {
  if (!windowId || state.focusedWindowId === null) {
    return false;
  }
  return state.idleState === "active" && windowId === state.focusedWindowId;
}

function finalizeAttention(reason: string): void {
  if (!state.attention.tabId || state.attention.startedAt === null) {
    state.attention.startedAt = null;
    return;
  }

  const elapsedMs = now() - state.attention.startedAt;
  const durationSeconds = Math.round(elapsedMs / MS_IN_SECOND);
  const entry = state.telemetry.get(state.attention.tabId);

  if (entry && durationSeconds >= SEGMENT_MIN_SECONDS) {
    const timestamp = now();
    entry.recentSegments.push({ timestamp, duration: durationSeconds });
    entry.recentSegments = pruneSegments(entry.recentSegments);
    if (entry.recentSegments.length > MAX_SEGMENTS_PER_TAB) {
      entry.recentSegments.splice(
        0,
        entry.recentSegments.length - MAX_SEGMENTS_PER_TAB,
      );
    }
    entry.totalActiveSeconds += durationSeconds;
    if (durationSeconds >= VISIT_MIN_SECONDS) {
      entry.visitCount += 1;
    }
    entry.lastActivatedAt = timestamp;
  }

  state.attention = { tabId: null, windowId: null, startedAt: null };
  queueFlush();
}

function upsertTelemetry(tab: chrome.tabs.Tab): TabTelemetry {
  if (!tab.id) {
    throw new Error("Tab is missing an id");
  }
  const nowTs = now();
  let entry = state.telemetry.get(tab.id);
  if (!entry) {
    entry = {
      url: tab.url ?? "about:blank",
      title: tab.title ?? "Untitled tab",
      domain: domainFromUrl(tab.url ?? "about:blank"),
      tabId: tab.id,
      windowId: tab.windowId,
      faviconUrl: tab.favIconUrl,
      lastActivatedAt: nowTs,
      totalActiveSeconds: 0,
      visitCount: 0,
      recentSegments: [],
    };
    state.telemetry.set(tab.id, entry);
  } else {
    entry.url = tab.url ?? entry.url;
    entry.title = tab.title ?? entry.title;
    entry.domain = tab.url ? domainFromUrl(tab.url) : entry.domain;
    entry.windowId = tab.windowId ?? entry.windowId;
    entry.faviconUrl = tab.favIconUrl ?? entry.faviconUrl;
  }
  return entry;
}

function telemetryToPriorityEntry(entry: TabTelemetry): PriorityEntry | null {
  entry.recentSegments = pruneSegments(entry.recentSegments ?? []);
  if (!entry.recentSegments.length) {
    return null;
  }
  if (entry.recentSegments.length > MAX_SEGMENTS_PER_TAB) {
    entry.recentSegments.splice(
      0,
      entry.recentSegments.length - MAX_SEGMENTS_PER_TAB,
    );
  }
  const { totalSeconds: activeSeconds24h, visitCount: visitCount24h } =
    sumSegmentsWithinHours(entry.recentSegments, ACTIVE_WINDOW_HOURS);
  if (!activeSeconds24h && !visitCount24h) {
    return null;
  }
  const recencyBoost = recencyMultiplier(entry.lastActivatedAt);
  const score = activeSeconds24h + visitCount24h * 20 + recencyBoost * 120;
  return {
    url: entry.url,
    title: entry.title,
    domain: entry.domain,
    score,
    activeSeconds24h,
    visitCount24h,
    lastActivatedAt: entry.lastActivatedAt,
    tabId: entry.tabId,
    windowId: entry.windowId,
    faviconUrl: entry.faviconUrl,
  };
}

function buildPriorityResponse(): PriorityResponse {
  const entries: PriorityEntry[] = [];
  for (const telemetryEntry of state.telemetry.values()) {
    const priority = telemetryToPriorityEntry(telemetryEntry);
    if (priority) {
      entries.push(priority);
    }
  }
  entries.sort((a, b) => b.score - a.score);
  const limited = entries.slice(0, state.settings.maxPriorityTabs);
  const domains = state.settings.domainGroupingEnabled
    ? buildDomainAggregates(limited)
    : undefined;
  return {
    entries: limited,
    domains,
    generatedAt: now(),
  };
}

function buildDomainAggregates(entries: PriorityEntry[]): DomainAggregate[] {
  const map = new Map<string, DomainAggregate>();
  for (const entry of entries) {
    const aggregate = map.get(entry.domain) ?? {
      domain: entry.domain,
      score: 0,
      entries: [],
    };
    aggregate.entries.push(entry);
    aggregate.score += entry.score;
    map.set(entry.domain, aggregate);
  }
  return Array.from(map.values())
    .filter((group) => group.entries.length > 1)
    .sort((a, b) => b.score - a.score);
}

async function resolveActiveTab(): Promise<chrome.tabs.Tab | null> {
  const candidateIds = [state.attention.tabId, state.lastFocusedTabId].filter(
    (value): value is number => typeof value === "number",
  );
  for (const tabId of candidateIds) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab?.id) {
        console.info("[tablature] resolver using cached tab", {
          tabId: tab.id,
          url: tab.url,
          source: "cache",
        });
        return tab;
      }
    } catch (error) {
      console.warn("[tablature] unable to resolve cached tab", tabId, error);
    }
  }

  const queries: chrome.tabs.QueryInfo[] = [
    { active: true, lastFocusedWindow: true, windowType: "normal" },
    { active: true, lastFocusedWindow: true },
    { active: true, windowType: "normal" },
    { active: true },
  ];
  for (const query of queries) {
    try {
      const tabs = await chrome.tabs.query(query);
      const match = selectPreferredTab(tabs);
      if (match) {
        console.info("[tablature] resolver using query match", {
          query,
          tabId: match.id,
          url: match.url,
        });
        return match;
      }
    } catch (error) {
      console.warn("[tablature] tab query failed", query, error);
    }
  }

  try {
    const windows = await chrome.windows.getAll({
      populate: true,
      windowTypes: ["normal"],
    });
    for (const window of windows) {
      const tab = window.tabs?.find(
        (candidate) => candidate.active && candidate.id,
      );
      if (tab?.id) {
        console.info("[tablature] resolver using windows fallback", {
          windowId: window.id,
          tabId: tab.id,
          url: tab.url,
        });
        return tab;
      }
    }
  } catch (error) {
    console.warn("[tablature] windows.getAll fallback failed", error);
  }
  console.warn("[tablature] active-tab resolver exhausted all strategies");
  return null;
}

function selectPreferredTab(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab | null {
  if (!tabs.length) {
    return null;
  }
  if (typeof state.focusedWindowId === "number") {
    const focused = tabs.find(
      (tab) => tab.windowId === state.focusedWindowId && tab.id,
    );
    if (focused) {
      return focused;
    }
  }
  return tabs.find((tab) => tab.id) ?? null;
}

async function addActiveTabToPriority(): Promise<AddActiveTabResponse> {
  const tab = await resolveActiveTab();
  if (!tab || !tab.id) {
    console.warn(
      "[tablature] addActiveTab invoked with no active tab detected",
    );
    return { entry: null };
  }
  console.info("[tablature] addActiveTab boosting tab", {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url,
    title: tab.title,
  });
  const entry = upsertTelemetry(tab);
  const bonusSeconds = 600;
  const timestamp = now();
  entry.recentSegments.push({ timestamp, duration: bonusSeconds });
  entry.recentSegments = pruneSegments(entry.recentSegments);
  if (entry.recentSegments.length > MAX_SEGMENTS_PER_TAB) {
    entry.recentSegments.splice(
      0,
      entry.recentSegments.length - MAX_SEGMENTS_PER_TAB,
    );
  }
  entry.totalActiveSeconds += bonusSeconds;
  entry.visitCount += 1;
  entry.lastActivatedAt = timestamp;
  queueFlush();
  return { entry: telemetryToPriorityEntry(entry) };
}

async function applySettingsUpdate(
  patch: Partial<StoredSettings>,
): Promise<void> {
  const next = sanitizeSettings({ ...state.settings, ...patch });
  state.settings = next;
  chrome.idle.setDetectionInterval(
    Math.max(15, Math.round(next.idleThresholdMinutes * 60)),
  );
  state.previousSessions = state.previousSessions.slice(
    0,
    next.previousSessionCount,
  );
  await syncStorageArea.set({ [STORAGE_KEYS.settings]: next });
}

function sanitizeSettings(settings: StoredSettings): StoredSettings {
  return {
    idleThresholdMinutes: clamp(
      Math.round(settings.idleThresholdMinutes),
      1,
      30,
    ),
    maxPriorityTabs: clamp(Math.round(settings.maxPriorityTabs), 3, 10),
    previousSessionCount: clamp(
      Math.round(settings.previousSessionCount),
      5,
      50,
    ),
    domainGroupingEnabled: Boolean(settings.domainGroupingEnabled),
    visualCueEnabled: Boolean(settings.visualCueEnabled),
  };
}

async function groupPriorityTabs(): Promise<GroupPriorityResponse> {
  const { entries } = buildPriorityResponse();
  const response: GroupPriorityResponse = { groupedCount: 0, groupIds: [] };
  const tabsByWindow = new Map<number, number[]>();

  for (const entry of entries) {
    if (typeof entry.tabId !== "number" || typeof entry.windowId !== "number") {
      continue;
    }
    const list = tabsByWindow.get(entry.windowId) ?? [];
    list.push(entry.tabId);
    tabsByWindow.set(entry.windowId, list);
  }

  for (const [windowId, tabIds] of tabsByWindow.entries()) {
    try {
      const groupId = await chrome.tabs.group({ tabIds });
      response.groupIds.push(groupId);
      await chrome.tabGroups.update(groupId, {
        title: PRIORITY_GROUP_NAME,
        color: PRIORITY_GROUP_COLOR,
        collapsed: false,
      });
      await chrome.tabs.move(tabIds, { index: 0, windowId });
      response.groupedCount += tabIds.length;
    } catch (error) {
      console.warn("[tablature] unable to group tabs", error);
    }
  }

  return response;
}

function appendPreviousSessions(entries: PriorityEntry[]): void {
  if (!entries.length) {
    return;
  }
  const recordedAt = now();
  const fresh: PreviousSessionEntry[] = entries.map((entry) => ({
    url: entry.url,
    title: entry.title,
    domain: entry.domain,
    recordedAt,
    score: entry.score,
  }));
  const deduped = state.previousSessions.filter(
    (existing) => !fresh.some((entry) => entry.url === existing.url),
  );
  state.previousSessions = [...fresh, ...deduped].slice(
    0,
    state.settings.previousSessionCount,
  );
}

function queueFlush(): void {
  void flushState("queue");
}

async function flushState(source: string): Promise<void> {
  if (!state.telemetry.size && !state.previousSessions.length) {
    return;
  }
  if (flushInFlight) {
    await flushInFlight;
    return;
  }
  flushInFlight = (async () => {
    const payload = Array.from(state.telemetry.values()).map((entry) => ({
      ...entry,
      recentSegments: entry.recentSegments.slice(-MAX_SEGMENTS_PER_TAB),
    }));
    await localStorageArea.set({
      [STORAGE_KEYS.telemetry]: payload,
      [STORAGE_KEYS.previousSessions]: state.previousSessions.slice(
        0,
        state.settings.previousSessionCount,
      ),
    });
    console.debug("[tablature] state flushed", source, payload.length);
  })().finally(() => {
    flushInFlight = null;
  });
  await flushInFlight;
}
