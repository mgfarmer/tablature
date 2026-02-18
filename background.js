// Background service worker for Tablature extension
console.log('Tablature background service worker started');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.local.set({
      settings: {
        autoCloseDuplicates: false,
        maxTabsPerWindow: 50,
        enableNotifications: true
      },
      sessions: []
    });
  }
});

// Listen for tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  console.log('Tab created:', tab.id);
  
  // Check if we should auto-close duplicates
  const data = await chrome.storage.local.get('settings');
  if (data.settings && data.settings.autoCloseDuplicates) {
    checkForDuplicates(tab);
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tabId);
  }
});

// Check for duplicate tabs
async function checkForDuplicates(newTab) {
  try {
    const tabs = await chrome.tabs.query({});
    const duplicates = tabs.filter(tab => 
      tab.url === newTab.url && tab.id !== newTab.id
    );
    
    if (duplicates.length > 0) {
      console.log('Duplicate tab detected:', newTab.url);
      // Optionally close the new duplicate
      // await chrome.tabs.remove(newTab.id);
    }
  } catch (error) {
    console.error('Error checking duplicates:', error);
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  switch (message.action) {
    case 'getTabCount':
      chrome.tabs.query({}, (tabs) => {
        sendResponse({ count: tabs.length });
      });
      return true; // Keep the message channel open for async response
      
    case 'closeTab':
      chrome.tabs.remove(message.tabId, () => {
        sendResponse({ success: true });
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});
