function handleTabUpdate(tabId, changeInfo, tab) {
  // Check if the tab is in youtube.com
  if (tab.url.includes("youtube.com")) {
    // Check if the tab's URL has changed
    if (changeInfo.url) {
      // Get the active tab
      browser.tabs.query({active: true}).then((activeTabs) => {
        // Check if the updated tab is the active tab
        if (activeTabs[0].id === tabId) {
          browser.tabs.sendMessage(tabId, {type: "handleYouTubeChange", url: changeInfo.url});
        }
      });
    }
  }
}

// Add a listener for tab updates
browser.tabs.onUpdated.addListener(handleTabUpdate);