import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";
import type { StoredSettings } from "../shared/types.js";

const storageArea = chrome.storage?.sync ?? chrome.storage.local;

const form = document.getElementById("settings-form") as HTMLFormElement;
const idleThresholdInput = document.getElementById(
  "idle-threshold",
) as HTMLInputElement;
const maxPriorityInput = document.getElementById(
  "max-priority",
) as HTMLInputElement;
const previousSessionInput = document.getElementById(
  "previous-session-count",
) as HTMLInputElement;
const domainGroupingInput = document.getElementById(
  "domain-grouping",
) as HTMLInputElement;
const visualCueInput = document.getElementById(
  "visual-cue",
) as HTMLInputElement;
const statusEl = document.getElementById("save-status") as HTMLElement;

let currentSettings: StoredSettings = { ...DEFAULT_SETTINGS };
let saveTimeout: number | null = null;
let saving = false;

async function loadSettings(): Promise<StoredSettings> {
  const result = await storageArea.get(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEYS.settings] as StoredSettings | undefined),
  };
}

function render(settings: StoredSettings) {
  idleThresholdInput.value = settings.idleThresholdMinutes.toString();
  maxPriorityInput.value = settings.maxPriorityTabs.toString();
  previousSessionInput.value = settings.previousSessionCount.toString();
  domainGroupingInput.checked = settings.domainGroupingEnabled;
  visualCueInput.checked = settings.visualCueEnabled;
}

function coerceNumber(input: HTMLInputElement, fallback: number): number {
  const raw = Number(input.value);
  const min = input.min ? Number(input.min) : undefined;
  const max = input.max ? Number(input.max) : undefined;
  let next = Number.isFinite(raw) ? raw : fallback;
  if (min !== undefined) {
    next = Math.max(min, next);
  }
  if (max !== undefined) {
    next = Math.min(max, next);
  }
  input.value = Math.round(next).toString();
  return next;
}

function queueSave(updated: Partial<StoredSettings>) {
  currentSettings = { ...currentSettings, ...updated };
  if (saveTimeout) {
    window.clearTimeout(saveTimeout);
  }
  statusEl.textContent = "Pending changes…";
  saveTimeout = window.setTimeout(commitSave, 400);
}

async function commitSave() {
  if (saving) {
    return;
  }
  saveTimeout = null;
  saving = true;
  statusEl.textContent = "Saving…";
  try {
    await storageArea.set({
      [STORAGE_KEYS.settings]: currentSettings,
    });
    statusEl.textContent = "All changes saved.";
  } catch (error) {
    console.error("Failed to save settings", error);
    statusEl.textContent = "Unable to save — check console logs.";
  } finally {
    saving = false;
  }
}

function bindEvents() {
  idleThresholdInput.addEventListener("change", () =>
    queueSave({
      idleThresholdMinutes: coerceNumber(
        idleThresholdInput,
        DEFAULT_SETTINGS.idleThresholdMinutes,
      ),
    }),
  );
  maxPriorityInput.addEventListener("change", () =>
    queueSave({
      maxPriorityTabs: coerceNumber(
        maxPriorityInput,
        DEFAULT_SETTINGS.maxPriorityTabs,
      ),
    }),
  );
  previousSessionInput.addEventListener("change", () =>
    queueSave({
      previousSessionCount: coerceNumber(
        previousSessionInput,
        DEFAULT_SETTINGS.previousSessionCount,
      ),
    }),
  );
  domainGroupingInput.addEventListener("change", () =>
    queueSave({ domainGroupingEnabled: domainGroupingInput.checked }),
  );
  visualCueInput.addEventListener("change", () =>
    queueSave({ visualCueEnabled: visualCueInput.checked }),
  );
  form.addEventListener("submit", (event) => event.preventDefault());
}

(async function init() {
  try {
    currentSettings = await loadSettings();
    render(currentSettings);
    bindEvents();
    statusEl.textContent = "All changes saved.";
  } catch (error) {
    console.error("Unable to load settings", error);
    statusEl.textContent = "Unable to load settings — refresh and try again.";
  }
})();
