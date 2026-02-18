# Tablature

Your Intelligent Tab Manager - A browser extension for Chrome, Edge, and other Chromium-based browsers.

## Features

- **Quick Actions Menu**: Dropdown menu with common tab management actions
- **Tab Statistics**: See open tabs and window count at a glance
- **Tab List**: View and switch between tabs directly from the popup
- **Duplicate Tab Detection**: Find and close duplicate tabs
- **Session Management**: Save and restore tab sessions
- **Customizable Settings**: Configure extension behavior to your preferences

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/mgfarmer/tablature.git
   cd tablature
   ```

2. Load the extension in Chrome/Edge:
   - Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `tablature` directory

3. The extension icon should appear in your browser toolbar

### For Production

*Coming soon: Chrome Web Store and Edge Add-ons listing*

## Usage

### Popup Interface

Click the Tablature icon in your browser toolbar to open the popup with:

- **Quick Actions Dropdown**: Select from actions like:
  - List All Tabs
  - Close Duplicate Tabs
  - Group by Domain (coming soon)
  - Save Current Session

- **Statistics**: View your current open tabs and window count

- **Tab List**: Click any tab in the list to switch to it

- **Settings Button**: Opens the settings page for configuration

### Settings Page

Right-click the extension icon and select "Options" or click the Settings button in the popup to configure:

- Auto-close duplicate tabs
- Enable/disable notifications
- Set maximum tabs per window
- Clear saved sessions
- Export your data

## Project Structure

```
tablature/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker for background tasks
├── content.js            # Content script injected into web pages
├── popup/
│   ├── popup.html        # Popup interface
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup functionality
├── options/
│   ├── options.html      # Settings page
│   ├── options.css       # Settings styles
│   └── options.js        # Settings functionality
└── icons/
    └── README.md         # Icon requirements and guidelines
```

## Development

### Adding Icons

The extension requires icon files. See `icons/README.md` for details on:
- Required sizes: 16x16, 32x32, 48x48, 128x128 pixels
- Design recommendations
- Tools for creating icons

### Manifest V3

This extension uses Manifest V3, which is the latest extension platform for Chrome and Edge. Key features:
- Service workers instead of background pages
- Improved security and performance
- Compatible with Chrome 88+ and Edge 88+

### Extension APIs Used

- `chrome.tabs` - Tab management
- `chrome.windows` - Window management
- `chrome.storage.local` - Local data storage
- `chrome.runtime` - Messaging and extension lifecycle

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Opera (Chromium-based)
- ✅ Other Chromium-based browsers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See LICENSE file for details.

## Roadmap

- [ ] Tab grouping by domain
- [ ] Tab search functionality
- [ ] Keyboard shortcuts
- [ ] Tab history and analytics
- [ ] Cloud sync for sessions
- [ ] Dark mode
- [ ] Customizable themes

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
