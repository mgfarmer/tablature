# Testing Guide for Tablature Extension

## How to Test the Extension

### 1. Load the Extension in Chrome/Edge

1. Open Chrome or Edge browser
2. Navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" button
5. Navigate to and select the `tablature` directory
6. The extension should now appear in your extensions list

### 2. Testing the Popup

1. **Open the Popup:**
   - Click the Tablature icon in your browser toolbar
   - The popup should display with a gradient header

2. **Test Quick Actions Dropdown:**
   - Select "List All Tabs" from the dropdown
   - Click "Execute" - should show all tabs in the current window
   - Try "Close Duplicate Tabs" - opens multiple duplicate tabs first to test

3. **Check Tab Statistics:**
   - Should show the count of open tabs
   - Should show the count of open windows

4. **Test Tab List:**
   - Each tab should be clickable
   - Clicking should switch to that tab

5. **Test Buttons:**
   - "Settings" button should open the options page
   - "Refresh" button should update the tab list and statistics

### 3. Testing the Settings Page

1. **Open Settings:**
   - Right-click the extension icon → "Options"
   - OR click "Settings" button in the popup

2. **Test Settings Controls:**
   - Toggle "Automatically close duplicate tabs"
   - Toggle "Enable notifications"
   - Change "Maximum tabs per window" value
   - Click "Save Settings" - should show success message

3. **Test Data Management:**
   - Click "Clear Saved Sessions" - should ask for confirmation
   - Click "Export Data" - should download a JSON file

### 4. Testing the Background Service Worker

1. **View Console Logs:**
   - Go to `chrome://extensions/`
   - Find Tablature extension
   - Click "Service worker" link to open DevTools
   - Should see "Tablature background service worker started"

2. **Test Tab Events:**
   - Open a new tab - should log "Tab created"
   - Close a tab - should trigger background logic

### 5. Testing Content Scripts

1. **Open Console on Any Page:**
   - Open any web page
   - Open DevTools (F12)
   - Check Console tab
   - Should see "Tablature content script loaded on: [URL]"

### 6. Testing Quick Actions

#### Close Duplicate Tabs:
1. Open the same URL in multiple tabs (e.g., google.com in 3 tabs)
2. Click extension icon
3. Select "Close Duplicate Tabs"
4. Click "Execute"
5. Should show alert with number of duplicates closed
6. Only one instance of the URL should remain

#### Save Current Session:
1. Open several tabs with different URLs
2. Click extension icon
3. Select "Save Current Session"
4. Click "Execute"
5. Should show "Session saved successfully!"
6. Go to Settings → "Export Data" to verify session was saved

## Expected Behavior

### Popup Interface
- ✅ Gradient purple header
- ✅ Dropdown menu with 4 options
- ✅ Execute button (disabled when no option selected)
- ✅ Two statistics boxes (tabs and windows)
- ✅ List of current window tabs
- ✅ Settings and Refresh buttons in footer

### Settings Page
- ✅ Full-page interface with gradient header
- ✅ Three sections: General Settings, Data Management, About
- ✅ Checkbox controls for boolean settings
- ✅ Number input for max tabs
- ✅ Action buttons (Clear, Export)
- ✅ Status messages after actions

### Background Worker
- ✅ Logs installation event
- ✅ Creates default settings on first install
- ✅ Monitors tab creation and updates
- ✅ Responds to messages from popup/content scripts

## Common Issues and Solutions

### Extension Won't Load
- **Issue:** "Manifest file is missing or unreadable"
- **Solution:** Ensure manifest.json is in the root directory

### Icons Not Showing
- **Issue:** Default Chrome icon appears
- **Solution:** This is expected - see icons/README.md for adding custom icons

### Popup Not Opening
- **Issue:** Clicking icon does nothing
- **Solution:** Check browser console for errors, ensure popup files exist

### Settings Not Saving
- **Issue:** Settings reset after browser restart
- **Solution:** Check chrome.storage permissions in manifest.json

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup opens and displays correctly
- [ ] Dropdown menu is functional
- [ ] Tab statistics display correctly
- [ ] Tab list shows current tabs
- [ ] Clicking tabs switches to them
- [ ] Settings page opens
- [ ] Settings can be saved and persist
- [ ] Background worker starts correctly
- [ ] Content scripts load on pages
- [ ] Close duplicates feature works
- [ ] Save session feature works
- [ ] Export data downloads JSON file

## Browser Compatibility Testing

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Edge (latest)
- [ ] Brave
- [ ] Opera

## Performance Testing

- Open 50+ tabs and verify popup remains responsive
- Check memory usage in Task Manager
- Verify no console errors during normal operation
