// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await updateTabStats();
  await loadTabs();
  
  // Set up event listeners
  document.getElementById('executeAction').addEventListener('click', handleActionExecution);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('refreshBtn').addEventListener('click', refreshData);
  
  // Listen for dropdown changes to enable/disable execute button
  document.getElementById('actionMenu').addEventListener('change', (e) => {
    document.getElementById('executeAction').disabled = !e.target.value;
  });
});

// Update tab and window statistics
async function updateTabStats() {
  try {
    const tabs = await chrome.tabs.query({});
    const windows = await chrome.windows.getAll();
    
    document.getElementById('tabCount').textContent = tabs.length;
    document.getElementById('windowCount').textContent = windows.length;
  } catch (error) {
    console.error('Failed to fetch tab and window statistics:', error);
  }
}

// Load and display all tabs
async function loadTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '';
    
    tabs.forEach(tab => {
      const tabItem = createTabElement(tab);
      tabList.appendChild(tabItem);
    });
  } catch (error) {
    console.error('Failed to load tabs for current window:', error);
  }
}

// Create a tab element
function createTabElement(tab) {
  const div = document.createElement('div');
  div.className = 'tab-item';
  div.innerHTML = `
    <div class="tab-title">${escapeHtml(tab.title)}</div>
    <div class="tab-url">${escapeHtml(tab.url || 'No URL')}</div>
  `;
  
  // Click to switch to tab
  div.addEventListener('click', () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });
  
  return div;
}

// Handle action execution from dropdown
async function handleActionExecution() {
  const action = document.getElementById('actionMenu').value;
  
  switch (action) {
    case 'list-tabs':
      await loadTabs();
      break;
    case 'close-duplicates':
      await closeDuplicateTabs();
      break;
    case 'group-by-domain':
      alert('Group by domain feature coming soon!');
      break;
    case 'save-session':
      await saveSession();
      break;
    default:
      alert('Please select an action');
  }
}

// Close duplicate tabs
async function closeDuplicateTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const urlMap = new Map();
    const duplicates = [];
    
    tabs.forEach(tab => {
      if (urlMap.has(tab.url)) {
        duplicates.push(tab.id);
      } else {
        urlMap.set(tab.url, tab.id);
      }
    });
    
    if (duplicates.length > 0) {
      await chrome.tabs.remove(duplicates);
      alert(`Closed ${duplicates.length} duplicate tab(s)`);
      await refreshData();
    } else {
      alert('No duplicate tabs found');
    }
  } catch (error) {
    console.error('Failed to close duplicate tabs:', error);
    alert('Error closing duplicate tabs');
  }
}

// Save current session
async function saveSession() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const session = {
      timestamp: new Date().toISOString(),
      tabs: tabs.map(tab => ({
        url: tab.url,
        title: tab.title
      }))
    };
    
    // Save to storage
    const data = await chrome.storage.local.get('sessions');
    const sessions = data.sessions || [];
    sessions.push(session);
    await chrome.storage.local.set({ sessions });
    
    alert('Session saved successfully!');
  } catch (error) {
    console.error('Failed to save tab session:', error);
    alert('Error saving session');
  }
}

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Refresh all data
async function refreshData() {
  await updateTabStats();
  await loadTabs();
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
