browser.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.url.startsWith("https://www.youtube.com/")) {
      // The user has changed pages on YouTube
      browser.tabs.sendMessage(details.tabId, {
        type: "handleYouTubeChange",
        url: details.url,
      });
    }
  });
  