# Quick Start Guide

## Get Started in 5 Minutes

### Step 1: Install the Extension

1. **Open Chrome or Edge**
   - Navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Select the `tablature` folder from your filesystem
   - The extension will appear in your toolbar

### Step 2: Try the Features

#### Open the Popup
- Click the Tablature icon in your browser toolbar
- You'll see:
  - Current tab and window count
  - A dropdown menu with quick actions
  - A list of all tabs in your current window

#### Test Quick Actions

1. **List All Tabs**
   - Select "List All Tabs" from dropdown
   - Click "Execute"
   - All tabs will be displayed below

2. **Close Duplicate Tabs**
   - Open the same website in 2-3 tabs (try google.com)
   - Select "Close Duplicate Tabs"
   - Click "Execute"
   - Watch as duplicates are automatically closed!

3. **Save Current Session**
   - Open several different websites
   - Select "Save Current Session"
   - Click "Execute"
   - Your session is now saved for later

### Step 3: Configure Settings

1. **Open Settings**
   - Click the "Settings" button in the popup
   - OR right-click the extension icon → "Options"

2. **Available Settings:**
   - ✅ Auto-close duplicate tabs
   - ✅ Enable notifications
   - ✅ Set max tabs per window
   - ✅ Clear saved sessions
   - ✅ Export your data

3. **Save Your Preferences**
   - Make your changes
   - Click "Save Settings"
   - Settings persist across browser sessions

## Key Files Overview

```
📁 tablature/
│
├── 📄 manifest.json          # Extension configuration
│   └── Defines permissions, popup, background worker
│
├── 📄 background.js          # Background service worker
│   └── Handles extension lifecycle and tab events
│
├── 📄 content.js            # Content script
│   └── Runs on all web pages
│
├── 📁 popup/                # Popup interface
│   ├── popup.html          # Structure
│   ├── popup.css           # Styling
│   └── popup.js            # Functionality
│
├── 📁 options/              # Settings page
│   ├── options.html        # Structure
│   ├── options.css         # Styling
│   └── options.js          # Functionality
│
└── 📁 icons/               # Extension icons
    └── README.md           # Icon guidelines
```

## What You Can Do Now

### As a User:
- ✨ Manage your browser tabs efficiently
- 🔍 Find and close duplicate tabs
- 💾 Save and restore browsing sessions
- ⚙️ Customize behavior via settings

### As a Developer:
- 📝 Modify the popup UI in `popup/`
- 🎨 Change the color scheme in CSS files
- ⚡ Add new quick actions in `popup/popup.js`
- 🔧 Add new background features in `background.js`
- 📊 Add tab analytics and insights
- 🌐 Integrate with external services

## Next Steps

1. **Add Custom Icons**
   - See `icons/README.md` for requirements
   - Replace placeholder icon references in manifest.json

2. **Customize the Extension**
   - Change colors in CSS files (search for `#667eea` and `#764ba2`)
   - Add new actions to the dropdown menu
   - Implement the "Group by Domain" feature

3. **Test Thoroughly**
   - Follow the `TESTING.md` guide
   - Test in multiple browsers
   - Try with many tabs open

4. **Package for Distribution**
   - Create proper icon files
   - Update version in manifest.json
   - Zip the extension folder
   - Submit to Chrome Web Store or Edge Add-ons

## Tips for Development

- **Live Reload**: After making changes, click the refresh icon on the extension card in `chrome://extensions/`
- **Debug Popup**: Right-click popup → "Inspect" to open DevTools
- **Debug Background**: Click "Service worker" link on extension card
- **Debug Content Script**: Open DevTools on any webpage

## Common Customizations

### Change Color Scheme
Edit the gradient colors in:
- `popup/popup.css` - lines with `#667eea` and `#764ba2`
- `options/options.css` - same color codes

### Add a New Action
1. Add option to dropdown in `popup/popup.html`
2. Add case in `handleActionExecution()` in `popup/popup.js`
3. Implement the feature function

### Modify Permissions
Edit `permissions` array in `manifest.json` - see [Chrome Extension Permissions](https://developer.chrome.com/docs/extensions/reference/permissions-list/)

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [Chrome APIs Reference](https://developer.chrome.com/docs/extensions/reference/)
- [Edge Extensions Documentation](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

## Need Help?

- Check `TESTING.md` for troubleshooting
- Review browser console for error messages
- Open an issue on GitHub
- Consult Chrome Extension documentation

---

**Happy Coding! 🚀**
