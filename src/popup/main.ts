import { DEFAULT_SETTINGS } from "../shared/constants.js";
import type {
  AddActiveTabResponse,
  DomainAggregate,
  GroupPriorityResponse,
  MessagePayload,
  PreviousSessionEntry,
  PreviousSessionsResponse,
  PriorityEntry,
  PriorityResponse,
  SettingsResponse,
  StoredSettings,
} from "../shared/types.js";

const runtimeAvailable =
  typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);

const priorityListEl = document.getElementById(
  "priority-list",
) as HTMLDivElement;
const domainSectionEl = document.getElementById(
  "domain-section",
) as HTMLElement;
const domainListEl = document.getElementById("domain-list") as HTMLDivElement;
const previousListEl = document.getElementById(
  "previous-list",
) as HTMLUListElement;
const statusEl = document.getElementById("status") as HTMLElement;
const timestampEl = document.getElementById("generated-at") as HTMLElement;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const groupButton = document.getElementById("group-tabs") as HTMLButtonElement;
const addActiveButton = document.getElementById(
  "add-active",
) as HTMLButtonElement;
const optionsButton = document.getElementById(
  "open-options",
) as HTMLButtonElement;
const sampleButton = document.getElementById(
  "load-sample",
) as HTMLButtonElement;
const previousTrigger = document.getElementById(
  "previous-tabs-trigger",
) as HTMLButtonElement;
const previousPopover = document.getElementById(
  "previous-popover",
) as HTMLDivElement;
const closePreviousButton = document.getElementById(
  "close-previous",
) as HTMLButtonElement;

interface PopupState {
  settings: StoredSettings;
  priority: PriorityResponse | null;
  previousSessions: PreviousSessionEntry[];
  mode: "live" | "sample";
}

const state: PopupState = {
  settings: DEFAULT_SETTINGS,
  priority: null,
  previousSessions: [],
  mode: runtimeAvailable ? "live" : "sample",
};

refreshButton.addEventListener("click", () => {
  void hydrate();
});

groupButton.addEventListener("click", () => {
  void handleGroupTabs();
});

addActiveButton.addEventListener("click", () => {
  void handleAddActiveTab();
});

optionsButton.addEventListener("click", () => {
  if (!runtimeAvailable) {
    setStatus("Options only available when the extension is running.");
    return;
  }
  chrome.runtime.openOptionsPage();
});

sampleButton.addEventListener("click", () => {
  loadSampleData(
    "Sample data loaded — hit Refresh to get back to live telemetry.",
  );
});

previousTrigger.addEventListener("click", () => openPreviousPopover());
closePreviousButton.addEventListener("click", () => closePreviousPopover());
previousPopover.addEventListener("click", (event) => {
  if (event.target === previousPopover) {
    closePreviousPopover();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !previousPopover.hasAttribute("hidden")) {
    closePreviousPopover();
  }
});

void hydrate();

async function hydrate() {
  setStatus("Updating…");
  if (!runtimeAvailable) {
    loadSampleData("Preview mode — connect to the browser to see live data.");
    return;
  }

  try {
    const [priority, settings, previous] = await Promise.all([
      sendMessage<PriorityResponse>({ kind: "tablature/getPriority" }),
      sendMessage<SettingsResponse>({ kind: "tablature/getSettings" }),
      sendMessage<PreviousSessionsResponse>({
        kind: "tablature/getPreviousSessions",
      }),
    ]);
    state.priority = priority;
    state.settings = settings?.settings ?? DEFAULT_SETTINGS;
    state.previousSessions = previous?.entries ?? [];
    state.mode = "live";
    render();
    setStatus("Ready.");
  } catch (error) {
    console.error("[tablature] failed to load popup data", error);
    setStatus("Unable to reach the background service worker.");
  }
}

async function handleGroupTabs() {
  if (!runtimeAvailable) {
    setStatus("Grouping is unavailable in preview mode.");
    return;
  }
  setStatus("Grouping priority tabs…");
  try {
    const response = await sendMessage<GroupPriorityResponse>({
      kind: "tablature/groupPriorityTabs",
    });
    if (response.groupedCount > 0) {
      setStatus(
        `Grouped ${response.groupedCount} tab${response.groupedCount === 1 ? "" : "s"}.`,
      );
    } else {
      setStatus("No ranked tabs are available to group.");
    }
    await hydrate();
  } catch (error) {
    console.error("[tablature] failed to group tabs", error);
    setStatus("Unable to group tabs — see console for details.");
  }
}

async function handleAddActiveTab() {
  if (!runtimeAvailable) {
    injectSamplePriorityEntry();
    return;
  }
  const viewingSample = state.mode === "sample";
  setStatus("Promoting active tab…");
  addActiveButton.disabled = true;
  try {
    const response = await sendMessage<AddActiveTabResponse>({
      kind: "tablature/addActiveTab",
    });
    if (response.entry) {
      mergePriorityEntry(response.entry);
      render();
      const label =
        response.entry.title || response.entry.domain || "active tab";
      const sampleHint = viewingSample
        ? " Sample list updated — hit Refresh to jump back to live data."
        : "";
      setStatus(`Boosted “${label}”.${sampleHint}`);
      if (!viewingSample) {
        await hydrate();
      }
    } else {
      setStatus("No active tab detected.");
    }
  } catch (error) {
    console.error("[tablature] failed to add active tab", error);
    setStatus("Unable to promote tab — see console for details.");
  } finally {
    addActiveButton.disabled = false;
  }
}

async function sendMessage<T>(payload: MessagePayload): Promise<T> {
  return chrome.runtime.sendMessage(payload) as Promise<T>;
}

function render() {
  renderPriorityList();
  renderDomainSection();
  renderPreviousSessions();
}

function renderPriorityList() {
  priorityListEl.replaceChildren();
  const entries = state.priority?.entries ?? [];
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent =
      "No focused attention yet. Spend a little time in your tabs to populate this list.";
    priorityListEl.appendChild(empty);
    timestampEl.textContent = "";
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    fragment.appendChild(renderPriorityRow(entry, index + 1));
  });
  priorityListEl.append(fragment);
  const generatedAt = state.priority?.generatedAt ?? Date.now();
  timestampEl.textContent = `Updated ${formatRelative(generatedAt)} ago`;
}

function renderPriorityRow(entry: PriorityEntry, rank: number): HTMLElement {
  const row = document.createElement("article");
  row.className = "priority-row";
  row.style.setProperty("--index", String(rank));

  const badge = document.createElement("span");
  badge.className = "rank";
  badge.textContent = String(rank);

  const avatar = document.createElement("div");
  avatar.className = "favicon";
  if (entry.faviconUrl) {
    const img = document.createElement("img");
    img.src = entry.faviconUrl;
    img.alt = "";
    avatar.appendChild(img);
  } else {
    avatar.textContent = entry.domain.slice(0, 2).toUpperCase();
  }

  const meta = document.createElement("div");
  meta.className = "meta";

  const title = document.createElement("h3");
  title.textContent = entry.title || entry.url;
  meta.appendChild(title);

  const details = document.createElement("p");
  details.textContent = `${entry.domain} · ${formatDuration(entry.activeSeconds24h)} active · ${entry.visitCount24h} visit${
    entry.visitCount24h === 1 ? "" : "s"
  }`;
  meta.appendChild(details);

  const actions = document.createElement("div");
  actions.className = "row-actions";
  const lastActive = document.createElement("span");
  lastActive.textContent = `Last focused ${formatRelative(entry.lastActivatedAt)} ago`;
  actions.appendChild(lastActive);

  const dismiss = document.createElement("button");
  dismiss.className = "row-dismiss";
  dismiss.type = "button";
  dismiss.title = "Remove from list";
  dismiss.setAttribute("aria-label", "Remove from list");
  dismiss.textContent = "✕";
  dismiss.addEventListener("click", (event) => {
    event.stopPropagation();
    void handleDismissEntry(entry);
  });

  row.append(badge, avatar, meta, actions, dismiss);
  row.addEventListener("click", () => {
    if (!runtimeAvailable || typeof entry.tabId !== "number") {
      setStatus("Cannot activate tab in preview mode.");
      return;
    }
    chrome.tabs.update(entry.tabId, { active: true });
    if (typeof entry.windowId === "number") {
      chrome.windows.update(entry.windowId, { focused: true });
    }
    window.close();
  });

  return row;
}

async function handleDismissEntry(entry: PriorityEntry): Promise<void> {
  if (state.priority) {
    state.priority.entries = state.priority.entries.filter(
      (e) => e.url !== entry.url,
    );
  }
  renderPriorityList();
  if (runtimeAvailable) {
    try {
      await sendMessage<undefined>({
        kind: "tablature/dismissEntry",
        url: entry.url,
      });
    } catch (error) {
      console.error("[tablature] failed to dismiss entry", error);
    }
  }
}

function renderDomainSection() {
  const aggregates = state.priority?.domains ?? [];
  const domainGroupingEnabled =
    state.settings?.domainGroupingEnabled ??
    DEFAULT_SETTINGS.domainGroupingEnabled;
  const shouldShow = Boolean(domainGroupingEnabled && aggregates.length);
  domainSectionEl.toggleAttribute("hidden", !shouldShow);
  if (!shouldShow) {
    domainListEl.replaceChildren();
    return;
  }
  const fragment = document.createDocumentFragment();
  aggregates.forEach((group) => {
    fragment.appendChild(renderDomainCard(group));
  });
  domainListEl.replaceChildren(fragment);
}

function renderDomainCard(group: DomainAggregate): HTMLElement {
  const card = document.createElement("div");
  card.className = "domain-card";
  const heading = document.createElement("div");
  heading.className = "domain-head";
  const title = document.createElement("strong");
  title.textContent = group.domain;
  heading.appendChild(title);
  const score = document.createElement("span");
  score.textContent = `${group.entries.length} tabs · ${formatDuration(sumDuration(group.entries))}`;
  heading.appendChild(score);
  card.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "domain-list";
  group.entries.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.title || entry.url;
    list.appendChild(item);
  });
  card.appendChild(list);
  return card;
}

function sumDuration(entries: PriorityEntry[]): number {
  return entries.reduce((total, entry) => total + entry.activeSeconds24h, 0);
}

function openPreviousPopover() {
  previousPopover.removeAttribute("hidden");
  previousPopover.setAttribute("aria-hidden", "false");
}

function closePreviousPopover() {
  previousPopover.setAttribute("hidden", "");
  previousPopover.setAttribute("aria-hidden", "true");
}

function renderPreviousSessions() {
  previousListEl.replaceChildren();
  if (!state.previousSessions.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent =
      "No historical highlights yet. Close a few tabs and we will stash the best ones here.";
    previousListEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.previousSessions.forEach((entry) => {
    fragment.appendChild(renderPreviousRow(entry));
  });
  previousListEl.append(fragment);
}

function renderPreviousRow(entry: PreviousSessionEntry): HTMLLIElement {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";

  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = entry.title || entry.url;

  const meta = document.createElement("span");
  meta.className = "tab-meta";
  meta.textContent = `${entry.domain} · saved ${formatRelative(entry.recordedAt)} ago`;

  button.append(title, meta);
  button.addEventListener("click", () => {
    if (!runtimeAvailable) {
      setStatus("Cannot open tabs in preview mode.");
      return;
    }
    chrome.tabs.create({ url: entry.url, active: true });
    window.close();
  });

  item.appendChild(button);
  return item;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return "moments";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) {
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

function formatRelative(timestamp: number): string {
  const deltaSeconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s`;
  }
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function setStatus(message: string) {
  statusEl.textContent = message;
}

function loadSampleData(
  statusMessage = "Preview mode — connect to the browser to see live data.",
) {
  const generatedAt = Date.now();
  const sampleEntries: PriorityEntry[] = [
    {
      url: "https://github.com/mgfarmer/tablature",
      title: "Feature spec – Tablature",
      domain: "github.com",
      score: 320,
      activeSeconds24h: 2800,
      visitCount24h: 12,
      lastActivatedAt: generatedAt - 3 * 60 * 1000,
    },
    {
      url: "https://mail.google.com",
      title: "Inbox – Personal",
      domain: "mail.google.com",
      score: 210,
      activeSeconds24h: 1800,
      visitCount24h: 7,
      lastActivatedAt: generatedAt - 15 * 60 * 1000,
    },
    {
      url: "https://calendar.google.com",
      title: "Calendar",
      domain: "calendar.google.com",
      score: 150,
      activeSeconds24h: 900,
      visitCount24h: 3,
      lastActivatedAt: generatedAt - 60 * 60 * 1000,
    },
    {
      url: "https://github.com/issues",
      title: "Assigned issues",
      domain: "github.com",
      score: 140,
      activeSeconds24h: 700,
      visitCount24h: 4,
      lastActivatedAt: generatedAt - 90 * 60 * 1000,
    },
    {
      url: "https://docs.google.com/document/d/123",
      title: "Product brief draft",
      domain: "docs.google.com",
      score: 135,
      activeSeconds24h: 640,
      visitCount24h: 3,
      lastActivatedAt: generatedAt - 110 * 60 * 1000,
    },
    {
      url: "https://notion.so/workspace-roadmap",
      title: "Roadmap board",
      domain: "notion.so",
      score: 120,
      activeSeconds24h: 520,
      visitCount24h: 5,
      lastActivatedAt: generatedAt - 2 * 60 * 60 * 1000,
    },
    {
      url: "https://stackoverflow.com/questions/123",
      title: "TypeScript idle handler",
      domain: "stackoverflow.com",
      score: 115,
      activeSeconds24h: 480,
      visitCount24h: 4,
      lastActivatedAt: generatedAt - 2.5 * 60 * 60 * 1000,
    },
    {
      url: "https://figma.com/file/xyz/mockups",
      title: "Popup concepts",
      domain: "figma.com",
      score: 108,
      activeSeconds24h: 430,
      visitCount24h: 2,
      lastActivatedAt: generatedAt - 3 * 60 * 60 * 1000,
    },
    {
      url: "https://slack.com/app_redirect?channel=design",
      title: "#design-sync",
      domain: "slack.com",
      score: 96,
      activeSeconds24h: 360,
      visitCount24h: 6,
      lastActivatedAt: generatedAt - 3.5 * 60 * 60 * 1000,
    },
    {
      url: "https://news.ycombinator.com",
      title: "Hacker News",
      domain: "news.ycombinator.com",
      score: 90,
      activeSeconds24h: 300,
      visitCount24h: 3,
      lastActivatedAt: generatedAt - 4 * 60 * 60 * 1000,
    },
  ];

  state.priority = {
    generatedAt,
    entries: sampleEntries,
    domains: buildDomainAggregates(sampleEntries),
  };
  state.settings = DEFAULT_SETTINGS;
  state.mode = "sample";
  state.previousSessions = sampleEntries.slice(0, 5).map((entry, index) => ({
    url: entry.url,
    title: entry.title,
    domain: entry.domain,
    recordedAt: generatedAt - (index + 1) * 45 * 60 * 1000,
    score: entry.score,
  }));
  render();
  setStatus(statusMessage);
}

function buildDomainAggregates(entries: PriorityEntry[]): DomainAggregate[] {
  const domainMap = new Map<string, DomainAggregate>();
  for (const entry of entries) {
    const group = domainMap.get(entry.domain) ?? {
      domain: entry.domain,
      score: 0,
      entries: [],
    };
    group.entries = [...group.entries, entry];
    group.score += entry.score;
    domainMap.set(entry.domain, group);
  }
  return Array.from(domainMap.values()).filter(
    (group) => group.entries.length > 1,
  );
}

function mergePriorityEntry(entry: PriorityEntry) {
  const generatedAt = Date.now();
  const base = state.priority ?? { generatedAt, entries: [], domains: [] };
  const entries = [...base.entries];
  const existingIndex = entries.findIndex(
    (candidate) => candidate.url === entry.url,
  );
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }
  entries.sort(
    (a, b) =>
      b.score - a.score || (b.lastActivatedAt ?? 0) - (a.lastActivatedAt ?? 0),
  );
  state.priority = {
    generatedAt,
    entries,
    domains: buildDomainAggregates(entries),
  };
}

function injectSamplePriorityEntry() {
  const generatedAt = Date.now();
  const topScore = state.priority?.entries?.[0]?.score ?? 150;
  const entry: PriorityEntry = {
    url: `https://preview.local/tab-${generatedAt}`,
    title: "Active tab (preview)",
    domain: "preview.local",
    score: topScore + 25,
    activeSeconds24h: 600,
    visitCount24h: 1,
    lastActivatedAt: generatedAt,
  };
  mergePriorityEntry(entry);
  state.mode = "sample";
  render();
  setStatus("Added a mock active tab to the sample list.");
}
