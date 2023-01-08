const ChatGPT_URL = "https://chat.openai.com/chat";
const ChatGPT_Auth_Endpoint = "https://chat.openai.com/api/auth/session";

const getAccessToken = async (cookieString) => {
  console.log(cookieString);
  const response = await fetch(ChatGPT_Auth_Endpoint, {
    headers: {
      cookie: cookieString,
    },
  });

  const json = await response.json();

  const accessToken = json.accessToken;

  console.log(json);
  const pfp = json.user.image;

  return { accessToken, pfp };
}

function handleTabUpdate(tabId, changeInfo, tab) {
  if (tab.url.indexOf("youtube.com") >= 0) { // check if change occurred from youtube
    if (changeInfo.url) { // check if tab url changed
      browser.tabs.query({ active: true }).then((activeTabs) => { // get active tab
        if (activeTabs[0].id === tabId) { // check if new tab is the active tab (because background playlists might trigger it)
          browser.tabs.sendMessage(tabId, { type: "handleYouTubeChange", url: changeInfo.url }); // tells content script to reload
        }
      });
    }
  }
}

// listen for tab changes
browser.tabs.onUpdated.addListener(handleTabUpdate);

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  /*
    Open background tab,
    Get cookies,
    Make cookie string,
    Get access token & pfp from getAccessToken(),
    Return access token & pfp,
    Close background tab,
  */

  if (request.type === 'openTab') {
    browser.tabs.create({ url: ChatGPT_URL, active: false }, function (tab) { // open chat gpt in background
      browser.tabs.onUpdated.addListener(async function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') { // on loaded
          chrome.tabs.onUpdated.removeListener(listener);
          
          const cookieArray = {};

          function getCookies() {
            return new Promise((resolve, reject) => {
              browser.cookies.getAll({ url: "https://chat.openai.com/chat" }, async function (cookies) {
                for (const cookie of cookies) {
                  switch (cookie.name) {
                    case "cf_clearance":
                      cookieArray["cf_clearance"] = cookie.value;
                      break;
                    case "intercom-session-dgkjq2bp":
                      cookieArray["intercom-session-dgkjq2bp'"] = cookie.value;
                      break;
                    case "intercom-device-id-dgkjq2bp":
                      cookieArray["intercom-device-id-dgkjq2bp'"] = cookie.value;
                      break;
                    case "__Secure-next-auth.session-token":
                      cookieArray["__Secure-next-auth.session-token"] = cookie.value;
                      break;
                    case "mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel":
                      cookieArray["mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel"] = cookie.value;
                      break;
                    case "__Host-next-auth.csrf-token":
                      cookieArray["__Host-next-auth.csrf-token"] = cookie.value;
                      break;
                    case "__Secure-next-auth.callback-url":
                      cookieArray["__Secure-next-auth.callback-url"] = cookie.value;
                      break;
                  }
                }

                // these are all the relevant cookies, might change in the future
                const cookieString = `cf_clearance=${cookieArray["cf_clearance"]}; intercom-session-dgkjq2bp=${cookieArray["intercom-session-dgkjq2bp"]}; intercom-device-id-dgkjq2bp=${cookieArray["intercom-device-id-dgkjq2bp"]}; __Secure-next-auth.session-token=${cookieArray["__Secure-next-auth.session-token"]}; mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel=${cookieArray["mp_d7d7628de9d5e6160010b84db960a7ee_mixpanel"]}; __Host-next-auth.csrf-token=${cookieArray["__Host-next-auth.csrf-token"]}; __Secure-next-auth.callback-url=${cookieArray["__Secure-next-auth.callback-url"]}`;

                const { accessToken, pfp } = await getAccessToken(cookieString);
                resolve({ accessToken, pfp });
              });
            });
          }

          const {accessToken, pfp} = await getCookies();
          chrome.tabs.sendMessage(sender.tab.id, {accessToken, pfp, tabId: tab.id});
          chrome.tabs.remove(tab.id, function() {
            chrome.tabs.update(sender.tab.id, {active: true});
          });

        }
      });
    });
  }


  /*
    Open background tab,
    Wait for element to exist using waitElement(),
    If exists => cloudflare verification passed,
    If more than 1 minute then => cloudflare asking for captcha solve so inform user,
  */

  if (request.type === 'cloudflare') {
    browser.tabs.create({ url: 'https://chat.openai.com/chat', active: false }, function (tab) {
      waitForElement(tab.id, ".scrollbar-trigger").then(() => {
        chrome.tabs.sendMessage(sender.tab.id, { "cloudflare": "successful" });
        chrome.tabs.remove(tab.id, function () {
          // chrome.tabs.update(sender.tab.id, { active: true });
        });
      }).catch(() => {
        chrome.tabs.sendMessage(sender.tab.id, { "cloudflare": "unsuccessful" });
        // chrome.tabs.remove(tab.id, function () {
        //   chrome.tabs.update(sender.tab.id, { active: true });
        // });
      });
    });
  }
});

function waitForElement(tabId, selector) {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      browser.tabs.executeScript(tabId, {
        code: `JSON.stringify(!!document.querySelector("${selector}"))`
      }).then((results) => {
        if (JSON.parse(results[0])) { // element matching the selector exists
          clearInterval(checkInterval);
          resolve();
        }
      });
    }, 500);

    setTimeout(() => { // longer than 60 seconds => cloudflare gave captcha
      clearInterval(checkInterval);
      reject();
    }, 60000);
  });
}