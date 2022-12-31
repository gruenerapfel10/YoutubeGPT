const getAccessToken = async (cookieString) => {
  const response = await fetch("https://chat.openai.com/api/auth/session", {
    headers: {
      cookie: cookieString,
    },
  });

  const json = await response.json();
  const accessToken = json.accessToken;
  return accessToken;
}

function handleTabUpdate(tabId, changeInfo, tab) {
  // Check if the tab is in youtube.com
  if (tab.url.includes("youtube.com")) {
    // Check if the tab's URL has changed
    if (changeInfo.url) {
      // Get the active tab
      browser.tabs.query({ active: true }).then((activeTabs) => {
        // Check if the updated tab is the active tab
        if (activeTabs[0].id === tabId) {
          browser.tabs.sendMessage(tabId, { type: "handleYouTubeChange", url: changeInfo.url });
        }
      });
    }
  }
}

// Add a listener for tab updates
browser.tabs.onUpdated.addListener(handleTabUpdate);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'openTab') {
    chrome.tabs.create({ url: 'https://chat.openai.com/chat', active: false }, function (tab) {
      chrome.tabs.onUpdated.addListener(async function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          const cookieNames = ['cf_clearance', 'intercom-session-dgkjq2bp', 'intercom-device-id-dgkjq2bp', '__Secure-next-auth.session-token', 'mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel'];
          const cookieArray = {

          }

          let cf_clearance;
          let intercom_session;
          let intercom_device;
          let secure_auth;
          let misc;

          const getCookies = () => {
            return new Promise((resolve, reject) => {
              browser.cookies.getAll({url: "https://chat.openai.com/chat"}, async function(cookies) {
                for (const cookie of cookies) {
                  if (cookieNames.includes(cookie.name.toString())) {
                    if (cookie.name === "cf_clearance") {
                      cookieArray["cf_clearance"] = cookie.value;
                    } else if (cookie.name === "intercom-session-dgkjq2bp") {
                      cookieArray["intercom-session-dgkjq2bp'"] = cookie.value;
                    } else if (cookie.name === "intercom-device-id-dgkjq2bp") {
                      cookieArray["intercom-device-id-dgkjq2bp'"] = cookie.value;
                    } else if (cookie.name === "__Secure-next-auth.session-token") {
                      cookieArray["__Secure-next-auth.session-token"] = cookie.value;
                    } else if (cookie.name === "mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel") {
                      cookieArray["mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel"] = cookie.value;
                    }
                  }
                }
                
                let finalString = "";
    
                for (let i=0; i < Object.keys(cookieArray).length; i++) {
                  const cookieName = Object.keys(cookieArray)[i];
                  const cookieValue = Object.values(cookieArray)[i];
                  finalString += cookieName + "=" + cookieValue + ";";
                }
    
                const accessToken = await getAccessToken(finalString);
                resolve(accessToken);
              });
            });
          };

          const accessToken = await getCookies();

          chrome.tabs.sendMessage(sender.tab.id, {accessToken});
          chrome.tabs.remove(tab.id, function() {
            chrome.tabs.update(sender.tab.id, {active: true});
          });
        }
      });
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === "send-retry") {
    chrome.tabs.sendMessage(sender.tab.id, {type: "retry"});
  }
});