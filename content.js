// Content script for Tablature extension
console.log('Tablature content script loaded on:', window.location.href);

// Example: Listen for messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.action) {
    case 'getPageInfo':
      sendResponse({
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || 'No description'
      });
      break;
      
    case 'highlightLinks':
      highlightAllLinks();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

// Example function: Highlight all links on the page
function highlightAllLinks() {
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    link.style.backgroundColor = 'yellow';
    link.style.transition = 'background-color 1s';
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      link.style.backgroundColor = '';
    }, 2000);
  });
}

// Example: Send page load notification to background
chrome.runtime.sendMessage({
  action: 'pageLoaded',
  url: window.location.href,
  title: document.title
});
