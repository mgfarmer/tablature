# Tablature Plan

## What is it

Tablature is a local-only chromium browser extension that aides the user in keeping track of "important" tabs, specifically for users that tend to have so many tabs open that it is nearly impossible to find that one tab your looking for.  This extension supports both Chrome and Edge (and any other browser that allows use of Chrome and Edge extensions.)

## Functional Requirements

1. Tab Activity Monitoring
The core engine must track "active attention" rather than just "open duration" to ensure the data is meaningful.

F1.1: Active Session Tracking: The system shall record the start and end timestamps whenever a tab becomes the active tab in its window (chrome.tabs.onActivated).

F1.2: Window Focus Awareness: The system shall pause the active timer if the browser window loses focus to the OS (e.g., switching to an IDE or Terminal or any other App) and resume when focus returns (chrome.windows.onFocusChanged).

F1.3: Idle Detection: The system shall pause time tracking if the user becomes idle (no mouse/keyboard input) for a configurable threshold, defaulting to 3 minute (chrome.idle).

F1.4: Persistence: Active session data must be periodically flushed to chrome.storage.local to prevent data loss during Service Worker suspension or browser crashes.

1. Importance Heuristics
The "Importance" of a tab is a derived metric calculated from gathered telemetry.

F2.1: Weighted Scoring: The system shall calculate a "Priority Score" based on:

Primary: Total active time in the last 24 hours.

Secondary: Frequency of visits (switches to the tab for mre than 5 seconds, shorter vists are likely tab-hunting by the user).

Recency: A decay factor that lowers the priority over time not visted, eventually reach zero (no longer important) after 2 days.

F2.2: Domain Aggregation (Optional): The system should optionally group importance by domain (e.g., three different GitHub PR tabs contribute to a "GitHub" domain).

1. User Interface & Organization
Facilities for the user to find and interact with high-priority tabs.

F3.1: Quick-Access Popup: A browser action popup shall display a ranked list of the top N "Important Tabs.". If the user enable domain grouping, then the popup menu should list domains groups in a submenu only when the domain has more than 1 item.

Clicking an item must focus the specific tab and its parent window.

Items must display the site's favicon and (optionally) the cumulative active time and/or ranked priority.  Items should be listed in priority order.

F3.2: Dynamic Tab Grouping: The extension shall provide a "Group Priority Tabs" commands that:

  1. Identifies the top 3-5 tabs and moves them to the first positions in the tab strip. Places them in a named, colored Chrome Tab Group (e.g., "🔥 Priority").

  2. For domain groups, allow the user to create a Tab Group for the domain.

F3.3: Visual Cues (Favicon/Title): Optionally, the system shall prepend a symbol (e.g., "⭐") to the document title of the top X highest-ranked tabs via a content script.

F3.4: The popup menu should have a "Previous Session" submenu that displays the last 20? important tabs from previous browser sessions.

1. System Architecture (Non-Functional)
NF4.1: Manifest V3 Compliance: All background logic must reside in a non-persistent Service Worker.

NF4.2: Cross-Chromium Support: The codebase shall remain compatible with both chrome.*and browser.* namespaces (aliased) to support Chrome and Edge simultaneously.

NF4.3: Resource Efficiency: Monitoring logic must be event-driven; no setInterval polling for time tracking to minimize CPU and battery impact.

Data Schema (Proposed)
To keep your storage lean, I recommend a flat object keyed by tabId for live sessions, and a more permanent record keyed by URL or domain to track importance across browser restarts:

JSON
{
  "tab_telemetry": {
    "tab_12345": {
      "total_seconds": 3600,
      "last_activated": 1708266000,
      "domain": "github.com"
    }
  }
}
