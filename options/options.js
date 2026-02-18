// Load settings when page loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  // Set up event listeners
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('clearSessions').addEventListener('click', clearSessions);
  document.getElementById('exportData').addEventListener('click', exportData);
});

// Load settings from storage
async function loadSettings() {
  try {
    const data = await chrome.storage.local.get(['settings']);
    
    if (data.settings) {
      document.getElementById('autoCloseDuplicates').checked = data.settings.autoCloseDuplicates || false;
      document.getElementById('enableNotifications').checked = data.settings.enableNotifications !== false;
      document.getElementById('maxTabsPerWindow').value = data.settings.maxTabsPerWindow || 50;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', true);
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      autoCloseDuplicates: document.getElementById('autoCloseDuplicates').checked,
      enableNotifications: document.getElementById('enableNotifications').checked,
      maxTabsPerWindow: parseInt(document.getElementById('maxTabsPerWindow').value)
    };
    
    await chrome.storage.local.set({ settings });
    showStatus('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', true);
  }
}

// Clear saved sessions
async function clearSessions() {
  if (confirm('Are you sure you want to clear all saved sessions? This action cannot be undone.')) {
    try {
      await chrome.storage.local.set({ sessions: [] });
      showStatus('Sessions cleared successfully!');
    } catch (error) {
      console.error('Error clearing sessions:', error);
      showStatus('Error clearing sessions', true);
    }
  }
}

// Export data
async function exportData() {
  try {
    const data = await chrome.storage.local.get(['settings', 'sessions']);
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tablature-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Data exported successfully!');
  } catch (error) {
    console.error('Error exporting data:', error);
    showStatus('Error exporting data', true);
  }
}

// Show status message
function showStatus(message, isError = false) {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.className = isError ? 'status-message error' : 'status-message';
  
  // Clear message after 3 seconds
  setTimeout(() => {
    statusElement.textContent = '';
  }, 3000);
}
