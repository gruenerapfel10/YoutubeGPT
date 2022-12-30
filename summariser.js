// Wait for the webpage to finish loading
// window.onload = () => {
  // Wait for 5 seconds
  // setTimeout(() => {
  //   // Create a link element
  //   const link = document.createElement('link');

  //   // Set the rel and href attributes of the link element
  //   link.rel = 'stylesheet';
  //   link.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.css';

  //   // Append the link element to the head element
  //   document.head.appendChild(link);

  //   // Create a script element
  //   const script = document.createElement('script');

  //   // Set the src attribute of the script element to the CDN link for the Prism.js library
  //   script.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';

  //   // Append the script element to the body element
  //   document.body.appendChild(script);
  // }, 5000);
// };

const BUTTON_TEXT = "Summarize";
const BUTTON_WIDTH = 100;
const EXTENSION_HEIGHT_CINEMA = 500;
const EXTENSION_WIDTH_CINEMA = 500;
const ACCESS_TOKEN = "";
const SESSION_TOKEN = ""
const chunkSize = 16000;
const promptString = ""
let conversation = null;

const specialCharacters = [
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  "|",
  "\\",
  "/",
  "+",
  "-",
  "_",
  "~"
];

let MESSAGES = localStorage.getItem("summariser-extension-messages")
  ? JSON.parse(localStorage.getItem("summariser-extension-messages"))
  : (() => {
    localStorage.setItem("summariser-extension-messages", JSON.stringify(
      []
    ));
    return JSON.parse(localStorage.getItem("summariser-extension-messages"));
  })();

// window.addEventListener('pageshow', function () { setTimeout(main, 5000) });

function getVideoId(url) {
  // Split the URL by the '?' character
  const urlParts = url.split('?');
  if (urlParts.length < 2) {
    return null;
  }

  // Split the part after the '?' character by the '&' character
  const params = urlParts[1].split('&');
  for (const param of params) {
    // Split the parameter by the '=' character
    const paramParts = param.split('=');
    if (paramParts.length < 2) {
      continue;
    }

    // If the parameter is for the video ID, return it
    if (paramParts[0] === 'v') {
      return paramParts[1];
    }
  }

  // If the video ID was not found, return null
  return null;
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "handleYouTubeChange") {
      // if (getVideoId(window.location.toString()) !== getVideoId(message.url)) {
      //   return;
      // }
      // Handle the change in YouTube
      // MESSAGES = [];
      // const extension = document.querySelectorAll(".summariser-extension");
      // const button = document.querySelectorAll(".main-toggle-button");

      // for (const element of extension) {
      //   element.parentNode.removeChild(element);
      // }

      // for (const element of button) {
      //   element.parentNode.removeChild(element);
      // }
  
      // // window.requestIdleCallback(() => { setTimeout(main, 3000) });

      // setTimeout(main, 3000);
  }
});

function ClipboardSvg() {
  // Create the SVG element and append it to the span
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.className = "clipboard-svg";
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "h-4 w-4");
  svg.setAttribute("height", "1em");
  svg.setAttribute("width", "1em");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2");
  svg.appendChild(path);

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "8");
  rect.setAttribute("y", "2");
  rect.setAttribute("width", "8");
  rect.setAttribute("height", "4");
  rect.setAttribute("rx", "1");
  rect.setAttribute("ry", "1");
  svg.appendChild(rect);
  return svg;
}

function TickSvg() {
  // Create the svg element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.className = "tick-svg";
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "h-4 w-4");
  svg.setAttribute("height", "1em");
  svg.setAttribute("width", "1em");

  // Create the polyline element
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", "20 6 9 17 4 12");

  // Append the polyline element to the svg element
  svg.appendChild(polyline);
  return svg;
}

async function handleCopyClick (copyTarget, copyButton) {
  const textarea = document.createElement("textarea");
  textarea.value = copyTarget.textContent;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);

  if (copyButton.querySelector("h4").textContent === "Copy code") {
    copyButton.querySelector("h4").textContent = "Copied!";
    copyButton.replaceChild(TickSvg(), copyButton.querySelector("svg"));
    setTimeout(async () => {
      copyButton.querySelector("h4").textContent = "Copy code";
      copyButton.replaceChild(ClipboardSvg(), copyButton.querySelector("svg"));
    }, 2000);
  }
}

function formatText(text) {
  /* Handle:
  [X] - regular blocks
  [X] - bullet points: check if sentence starts with "-"
  [] - numbers: use regex to see if sentence starts with "{number}."
  [] - tables: if it starts and ends with "|" then it's a table
  [X] - code
  */

  const parent = document.createElement("div");
  parent.style.width = "100%";
  parent.style.whiteSpace = "pre-wrap";
  parent.style.wordWrap = "break-word";
  parent.innerHTML = text;

  if (!text.includes("\n")) { // one contiuous text
    return parent
  }

  parent.innerHTML = "";

  let arr = text.split("```");
  
  for (let i = 0; i < arr.length; i++) {
    if (i % 2 === 0) {
      // regular block
      let block = arr[i];
      let blockText = document.createElement("p");
      blockText.className = i === 0 ? "block-text-first" : "block-text";

      if (!block.includes("\n\n")) { // one block
        blockText.innerHTML = block;
        parent.appendChild(blockText);
        continue;
      }

      const blocks = arr[i].split("\n\n");

      for (let j=0; j < blocks.length; j++) {
        block = blocks[j];
        blockText = document.createElement("p");
        blockText.className = j === 0 ? "block-text-first" : "block-text";

        if (!block.includes("\n")) { // not a list
          blockText.innerHTML = block;
          parent.appendChild(blockText);
          continue;
        }

        // is a list

        blockText = document.createElement("ul");
        blockText.className = "list";
        const lines = block.trimEnd().split("\n");

        for (let k=0; k < lines.length; k++) {
          const line = lines[k];

          if (k === 0) {
            const heading = document.createElement("p");
            heading.className = k === 0 && j === 0 ? "block-text-first" : "block-text";
            heading.innerHTML = line;
            parent.appendChild(heading);
            continue;
          }

          const listElement = document.createElement("li");
          const filteredLine = line.trim().slice(1).trim();
          listElement.innerHTML = filteredLine;
          listElement.className = "list-element";
          blockText.appendChild(listElement);
        }

        parent.appendChild(blockText);
      }

      // if (!block.includes("\n")) { // it is not a list
      //   parent.appendChild(blockText);
      //   continue;
      // }

      // // it is a list
      // const lines = block.split("\n");
      // blockText = document.createElement("ul"); // redefine blockText as a ul

      // for (let j=0; j < lines.length; j++) {
      //   const line = lines[j];
      //   if (j === 0) { // first line so should be heading
      //     const heading = document.createElement("p");
      //     heading.className = "block-text";
      //     heading.innerHTML = line;
      //     parent.appendChild(heading);
      //     continue
      //   }

      //   // other lines so should be list elements;
      //   const listElement = document.createElement("li");
      //   listElement.className = "list-element";
      //   const filteredLine = line.trim().slice(1).trim();
      //   listElement.innerHTML = filteredLine;
      //   blockText.appendChild(listElement);
      // }

      // parent.appendChild(blockText);
    }
    else {
      // code block
      const block = arr[i];
      const newCodeBlock = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = block.trim();
      // code.className = "language-javascript";
      code.style.backgroundColor = "#000";
      code.style.whiteSpace = "pre-wrap";

      if (!newCodeBlock.querySelector(".code-top")) {
        const copyBlock = document.createElement("div");
        copyBlock.className = "code-top";
  
        // Create the copy button
        const copyButton = document.createElement("button");
        copyButton.className = "copy-button"
  
        copyButton.appendChild(ClipboardSvg());
  
        // Create the text element and append it to the span
        const copyText = document.createElement("h4");
        copyText.textContent = "Copy code"
        copyButton.appendChild(copyText);
        
        copyButton.addEventListener("click", () => {
          handleCopyClick(code, copyButton);
        });

        copyBlock.appendChild(copyButton);
        newCodeBlock.appendChild(copyBlock)
      }
      
      // Append the copy button to the code block
      newCodeBlock.appendChild(code);
      parent.appendChild(newCodeBlock);
    }
    
  }

  return parent;
}

function createBlock(text) {
  // Handle regular blocks and lists
  const blockText = document.createElement("p");
  blockText.innerHTML = text;
  blockText.className = "block-text";

  if (!text.includes("\n")) {
    // Regular block
    return blockText;
  } else {
    // List
    const lines = text.split("\n");
    const list = document.createElement("ul");
    list.className = "list";

    for (let j = 0; j < lines.length; j++) {
      let line = lines[j].replace(/-/g, "");
      line = line.trimStart();

      if (line.trim().length !== 0) {
        const listElement = document.createElement("li");
        listElement.innerHTML = line;
        listElement.className = "list-element";
        list.appendChild(listElement);
      }
    }

    return list;
  }
}

function createTextBlock(text) {
  // Create regular block of text
  const blockText = document.createElement("p");
  blockText.innerHTML = text;
  blockText.className = "block-text";
  return blockText;
}

function createCodeBlock(code) {
  // Create code block
  const newCodeBlock = document.createElement("pre");
  const codeElement = document.createElement("code");
  newCodeBlock.appendChild(codeElement);
  codeElement.innerHTML = code;
  return newCodeBlock;
}

function newMessage(type, text) {
  if (type === "user") {
    const message = document.createElement("div");
    message.className = "user-message";
    const icon = Icon("user");
    message.appendChild(icon);

    const h1 = document.createElement("h1");
    h1.className = "question";
    h1.innerHTML = text;
    message.appendChild(h1);

    return message
  }

  const message = document.createElement("div");
  message.className = "assistant-message"
  const icon = Icon("assistant")
  message.appendChild(icon);

  const h1 = formatText(text);
  h1.className = "question";
  message.appendChild(h1);

  return message
}

function updateMessages() {
  const infoDiv = document.querySelector(".info-div");
  infoDiv.innerHTML = "";
  for (let i = 0; i < MESSAGES.length; i++) {
    const message = MESSAGES[i]

    const messageDiv = newMessage(message.from, message.message);
    infoDiv.appendChild(messageDiv);
  }
}


function findPrevParentMessageId(messageString) {
  // Find the index of the message with the inputted message string
  const messageIndex = MESSAGES.findIndex(message => message.message === messageString);

  // If the message was not found, return null
  if (messageIndex === -1) {
    return null;
  }

  // If the message is the first in the list, return null
  if (messageIndex === 0) {
    return null;
  }

  // Otherwise, return the parent message ID of the previous message
  return MESSAGES[messageIndex - 1].parent_message_id;
}

window.requestIdleCallback(() => { setTimeout(main, 3000) });

function main() {
  const scriptElements = document.querySelectorAll('script');

  scriptElements.forEach(element => {
    element.style.display = 'none';
  });
  if (!window.location.toString().includes("/watch?v=")) { return }
  const button_parent = document.querySelector("#above-the-fold > #title");
  button_parent.appendChild(Button());

  const extension_parent = document.getElementById("secondary-inner");
  extension_parent.appendChild(Extension());

  // youtube's elements style adjustments:
  button_parent.style.display = "flex";
  button_parent.style.alignItems = "top";

  const title = document.querySelector("h1.ytd-watch-metadata");
  title.style.width = `calc(100% - ${BUTTON_WIDTH}px)`;
}

function findCommonWords(text) {
  // Create an array of all the words in the text
  const mostAreaWords = findMostAreaWords(text);

  // Create a table of the 20 most common words
  const commonWords = [];
  let key = "@";
  let specialCharactersCopy = specialCharacters.slice();
  for (let i = 0; i < mostAreaWords.length; i++) {
    const word = mostAreaWords[i];
    const randomIndex = Math.floor(
      Math.random() * specialCharactersCopy.length
    );
    key = specialCharactersCopy[randomIndex];
    commonWords.push({ word: word.word, key });
    specialCharactersCopy.splice(randomIndex, 1); // remove the character from the array
    if (commonWords.length === 20) break;
  }

  return commonWords;
}

function replaceWords(text) {
  let modifiedText = text;
  const commonWords = findCommonWords(text);
  let commonWordsString = "";

  commonWords.forEach((word) => {
    commonWordsString += `${word.word}=${word.key} `;
  });

  commonWordsString.trimEnd();

  commonWords.forEach((commonWord) => {
    modifiedText = modifiedText.replace(
      new RegExp(`\\b${commonWord.word}\\b`, "gi"),
      commonWord.key
    );
  });
  return { modifiedText, commonWordsString };
}

function findMostAreaWords(text) {
  // Split the text into an array of words
  const words = text.split(" ");

  // Create an empty array to store the results
  const results = [];

  // Iterate over the array of words
  for (const word of words) {
    // Check if the word has already been added to the results array
    const existingResult = results.find((result) => result.word === word);
    if (existingResult) {
      // If the word has already been added, increment the frequency count
      existingResult.frequency++;
    } else {
      // If the word has not been added, add a new object to the results array
      results.push({
        word: word,
        length: word.length,
        frequency: 1
      });
    }
  }

  // Sort the results array in descending order by frequency * length (area)
  results.sort((a, b) => b.frequency * b.length - a.frequency * a.length);

  // Return the results array
  return results;
}

const escapeString = str => str.replace(/[\\"\[\]]/g, "\\$&");

async function startNewConversation(initialMessage) {
  const id = generateFormattedString();
  const parent_id = generateFormattedString();

  let body = { "action": "next", "messages": [{ "id": id, "role": "user", "content": { "content_type": "text", "parts": [initialMessage] } }], "parent_message_id": parent_id, "model": "text-davinci-002-render" }

  MESSAGES.push({
    "from": "user",
    "message": initialMessage,
    "message_id": id,
    "parent_message_id": parent_id,
    "conversation_id": null,
  })

  MESSAGES.push(
    {
      "from": "assistant",
      "message": "",
      "message_id": "",
      "conversation_id": "",
    })

  updateMessages();

  const response = await fetch("https://chat.openai.com/backend-api/conversation", {
    "headers": {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0",
      "Accept": "text/event-stream",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJoZW5yeS5ncmV5Lm1haWxAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImdlb2lwX2NvdW50cnkiOiJHQiJ9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsidXNlcl9pZCI6InVzZXItbkM2TDNtUEhScDlEVEgzSEFmSkhibHh2In0sImlzcyI6Imh0dHBzOi8vYXV0aDAub3BlbmFpLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExMjE1MzE2MjA2NTQwNDg4MzE5NCIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTY3MjM1ODMyMCwiZXhwIjoxNjcyOTYzMTIwLCJhenAiOiJUZEpJY2JlMTZXb1RIdE45NW55eXdoNUU0eU9vNkl0RyIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgbW9kZWwucmVhZCBtb2RlbC5yZXF1ZXN0IG9yZ2FuaXphdGlvbi5yZWFkIG9mZmxpbmVfYWNjZXNzIn0.tbTqzXKUAX9qyYzK4LgrvrHofMaNu_fSiQF-ojLgLmTZYhZFMBQrBhj0Y6Y5ipqFD9P61bKSoxZWFZ34GUFNoqR0UUn5VqWy6b9xsVBtmkdzrCkXu6IZP1FOGTDuwwWjF6N2mxqGpznnConlbRe6woAN0Vb-Am6-hRrDQ3cOgkPjdXIWFlk-KoydQonUSt4ZE7b7Cvn60cA8vvvZK81J9BdF5-P08Yq0MXsRrf4zuCM1qoEOK19NWba0_VPlwmYICB5hT7r8JHIvjHaoNf9DNTsX59ZfdkxHtJ6k4FmoApSmsxnFe6xfX-mYRSeepXV_x-0pPT0qo2dR0B4esq_sGw",
    },
    "body": JSON.stringify(body),
    "method": "POST",
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let isFirstMessage = true;

  while (true) {
    const { done, value } = await reader.read();
    if (done || decoder.decode(value).length === 14) {
      break;
    }

    let string = decoder.decode(value).toString();
    let lines = string.split("\n\n");
    let data = getLastNonEmptyString(lines);
    let filtered = data.replace(/data: [DONE]: /g, "");
    filtered = filtered.replace(/data: /g, "");

    try {
      const message_response = JSON.parse(filtered);

      const response_message_id = message_response.message.id;
      const response_conversation_id = message_response.conversation_id;
      const response_error = message_response.error
      const response_message = message_response.message.content.parts[0]
      const response_role = message_response.message.role

      if (isFirstMessage) {
        isFirstMessage = false;
      }

      MESSAGES[MESSAGES.length - 1] =
      {
        "from": response_role,
        "message": response_message,
        "message_id": response_message_id,
        "conversation_id": response_conversation_id
      }

      updateMessages();
    } catch (error) {

    }
  }

  const latestMessage = MESSAGES[MESSAGES.length - 1];

  return { response, id, parent_id };
}

async function continueConversation(message) {
  const id = generateFormattedString();
  let last_user_message = MESSAGES[MESSAGES.length - 2];
  let last_assistant_message = MESSAGES[MESSAGES.length - 1];
  const conversation_id = last_assistant_message.conversation_id

  let body = { "action": "next", "conversation_id": conversation_id, "messages": [{ "id": id, "role": "user", "content": { "content_type": "text", "parts": [message] } }], "parent_message_id": last_assistant_message.message_id, "model": "text-davinci-002-render" }

  MESSAGES.push({
    "from": "user",
    "message": message,
    "message_id": id,
    "parent_message_id": last_user_message.message_id,
    "conversation_id": conversation_id
  });

  MESSAGES.push(
    {
      "from": "assistant",
      "message": "",
      "message_id": "",
      "conversation_id": conversation_id,
    })

  updateMessages();

  const response = await fetch("https://chat.openai.com/backend-api/conversation", {
    "headers": {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0",
      "Accept": "text/event-stream",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJoZW5yeS5ncmV5Lm1haWxAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImdlb2lwX2NvdW50cnkiOiJHQiJ9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsidXNlcl9pZCI6InVzZXItbkM2TDNtUEhScDlEVEgzSEFmSkhibHh2In0sImlzcyI6Imh0dHBzOi8vYXV0aDAub3BlbmFpLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExMjE1MzE2MjA2NTQwNDg4MzE5NCIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTY3MjM1ODMyMCwiZXhwIjoxNjcyOTYzMTIwLCJhenAiOiJUZEpJY2JlMTZXb1RIdE45NW55eXdoNUU0eU9vNkl0RyIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgbW9kZWwucmVhZCBtb2RlbC5yZXF1ZXN0IG9yZ2FuaXphdGlvbi5yZWFkIG9mZmxpbmVfYWNjZXNzIn0.tbTqzXKUAX9qyYzK4LgrvrHofMaNu_fSiQF-ojLgLmTZYhZFMBQrBhj0Y6Y5ipqFD9P61bKSoxZWFZ34GUFNoqR0UUn5VqWy6b9xsVBtmkdzrCkXu6IZP1FOGTDuwwWjF6N2mxqGpznnConlbRe6woAN0Vb-Am6-hRrDQ3cOgkPjdXIWFlk-KoydQonUSt4ZE7b7Cvn60cA8vvvZK81J9BdF5-P08Yq0MXsRrf4zuCM1qoEOK19NWba0_VPlwmYICB5hT7r8JHIvjHaoNf9DNTsX59ZfdkxHtJ6k4FmoApSmsxnFe6xfX-mYRSeepXV_x-0pPT0qo2dR0B4esq_sGw",
    },
    "body": JSON.stringify(body),
    "method": "POST",
  });

  console.log(response);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done || decoder.decode(value).length === 14) {
      break;
    }

    let string = decoder.decode(value).toString();
    let lines = string.split("\n\n");
    let data = getLastNonEmptyString(lines);
    let filtered = data.replace(/data: [DONE]: /g, "");
    filtered = filtered.replace(/data: /g, "");

    try {
      const message_response = JSON.parse(filtered);

      const response_message_id = message_response.message.id;
      const response_conversation_id = message_response.conversation_id;
      const response_error = message_response.error
      const response_message = message_response.message.content.parts[0]
      const response_role = message_response.message.role

      MESSAGES[MESSAGES.length - 1] =
      {
        "from": response_role,
        "message": response_message,
        "message_id": response_message_id,
        "conversation_id": conversation_id,
      }

      updateMessages();
    } catch (error) {

    }
  }

  const latestMessage = MESSAGES[MESSAGES.length - 1];

  // moderations(latestMessage.message, latestMessage.message_id, latestMessage.conversation_id);

  // reader.cancel();

  return { response };
}

function Button() {
  const scriptTags = document.querySelectorAll('script');
  let ytInitialData;
  let apiKeySource;
  let apiKey;

  for (const scriptTag of scriptTags) {
    if (scriptTag.textContent.includes('var ytInitialData = ')) {
      ytInitialData = scriptTag;
    } else if (scriptTag.textContent.includes("INNERTUBE_API_KEY")) {
      apiKeySource = scriptTag
    }
  }

  // Use a regular expression to parse the function
  let regex = /ytcfg\.set\((\{.*\})\);/;
  let match = regex.exec(apiKeySource.textContent);

  // Extract the object from the match
  const obj = JSON.parse(match[1]);
  // Use the parsed data
  apiKey = obj.INNERTUBE_API_KEY;

  regex = /ytInitialData\s*=\s*(.+?);/;
  match = regex.exec(ytInitialData.innerHTML);

  const startIndex = ytInitialData.innerHTML.indexOf('"getTranscriptEndpoint":{"params":"');
  const endIndex = ytInitialData.innerHTML.indexOf('"}', startIndex);

  const isTranscriptAvailable = startIndex !== 0 && endIndex !== 0;

  const substring = ytInitialData.innerHTML.substring(startIndex, endIndex + 3);

  const button = document.createElement("button");
  let summarizeDisabled = false;

  button.innerHTML = isTranscriptAvailable && substring.toLowerCase().includes("gettranscriptendpoint") ? BUTTON_TEXT : "Not available"
  button.className = "main-toggle-button"

  if (!isTranscriptAvailable || !substring.toLowerCase().includes("gettranscriptendpoint")) {
    return button;
  }

  const params = substring.split(':')[2].replace(/[}"\\]/g, "");

  button.addEventListener("click", async (event) => {
    const extension = document.querySelector(".summariser-extension");
    extension.style.display === "none" ? extension.style.display = "flex" : extension.style.display = "none";

    if (summarizeDisabled === false) {
      const r = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}&prettyPrint=false`, {
        "body": JSON.stringify({
          "context": {
            "client": {
              "clientName": "WEB",
              "clientVersion": "2.20221220.09.00",
              "utcOffsetMinutes": 0,
            }
          },
          "params": params
        }),
        "method": "POST"
      });

      const json = await r.json();

      console.log(JSON.stringify(json));
      
      let chunks = [];

      const initialSegments =
        json.actions[0].updateEngagementPanelAction.content.transcriptRenderer
          .content.transcriptSearchPanelRenderer.body.transcriptSegmentListRenderer
          .initialSegments;

      let transcription = "";

      for (let segment of initialSegments) {
        transcription +=
          segment.transcriptSegmentRenderer.snippet.runs[0].text + " ";
      }

      let start = 0;
      let count = 0;
      let isFirstMessage = true;
      const summarisePrompt = `summarise the given texts treating them as one whole continuous transcription. Use chapters and use bullet points in your summary, use your own knowledge to aid yourself in interpretation and context. Your summary needs to be detailed and accurate but concise, be prepared to answer any questions about the video or topics, themes discussed in the video. Remember to use chapters and bullet points. ALSO remember that if i use words like "video" or "transcript" i am asking about the transcript that I gave you, start your summary with "Got It." to show you understand.`

      while (start < transcription.length) {
        const VIDEO_NAME = document.querySelector("h1.ytd-watch-metadata > yt-formatted-string:nth-child(1)").innerText;
        const VIDEO_DATE = "";
        const VIDEO_DESCRIPTION = "";
        const OTHER_CONTEXT = "";
        const prompt = `roleplay: i will give you a series of transcript parts for a youtube video, you need to use a dictionary that i give you to interpret the encoded messages, once i tell you SUMMARIZE, you should summarise the entire transcript by treating all of the individual parts i gave you as one whole transcript, if asked to write code you should use proper formatting, you should only reply with "Understood." until i tell you to summarise, you should be prepared to answer any questions about the video or anything as usual, we start now, this youtube video is called "${VIDEO_NAME}", remember you should only summarise if i tell you to, if you see !!! it is a palceholder for a profanity, whenever I refer to a transcript or video assume that i'm referring to this video's transcript unless explicitly stated otherwise, remember to also use your own knowledge to add further understanding and context for yourself: `

        // add a preferred level of detail setting

        const difference = isFirstMessage ? chunkSize - (prompt.length + 100) : chunkSize

        let chunk = transcription.slice(start, start + difference);
        chunk = chunk.replace(/\[Music\]/g, "");
        chunk = chunk.replace(/\[ __ \]/g, "!!!");
        count += 1;
        let modification = replaceWords(
          `TRANSCRIPT YOUTUBE VIDEO PART ${count}: ${chunk}`
        );
        chunk = modification.modifiedText;
        chunk = chunk.replace(/\s+/g, " ");
        const final = `${prompt}
      ${modification.commonWordsString} ${chunk}`;

        if (isFirstMessage) {
          isFirstMessage = false;
          chunks.push(final);
          start += difference;
        } else {
          chunks.push(chunk);
          start += difference;
        }
      }

      chunks.push(summarisePrompt);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (i === 0) {
          // first chunk so need to use startNewConversation function
          conversation = await startNewConversation(chunk);
        } else {
          // continue the conversation
          conversation = await continueConversation(chunk);
        }
      }

      if (chunks.length > 1) {
        // if more than one chunk then can't be one message, handle this maybe inform the user
      } else {
        // regular procedure
      }
    }
    summarizeDisabled = true;

  });

  return button
}

function arrowSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("stroke-width", "0");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "h-50 w-50 rotate-90");
  svg.setAttribute("height", "1em");
  svg.setAttribute("width", "1em");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z");
  path.setAttribute("transform", "rotate(90) translate(0,-20)");
  svg.appendChild(path);
  return svg;
}

function loadingDots() {
  const dots = document.createElement("h1");
  dots.className = "loading-dots";
  dots.innerHTML = "."
  return dots;
}

function Icon(type) {
  if (type === "assistant") {
    const div = document.createElement("div");
    div.className = "assistant-icon";

    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("width", "41");
    svg.setAttribute("height", "41");
    svg.setAttribute("viewBox", "0 0 41 41");
    svg.setAttribute("strokeWidth", "1.5");
    svg.setAttribute("class", "h-6 w-6");

    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

    path.setAttribute("d", "M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z");

    svg.appendChild(path);
    div.appendChild(svg);

    return div;
  } else {
    const div = document.createElement("div");
    div.className = "user-icon";

    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("stroke", "#fff");
    svg.setAttribute("fill", "none");
    svg.setAttribute("strokeWidth", "1.5");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("strokeLinecap", "round");
    svg.setAttribute("strokeLinejoin", "round");
    svg.setAttribute("class", "h-6 w-6");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    path.setAttribute("d", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2");

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "7");
    circle.setAttribute("r", "4");

    svg.appendChild(path);
    svg.appendChild(circle);
    div.appendChild(svg);

    return div;
  }
}

function generateFormattedString() {
  const characters = '0123456789abcdef';
  let formattedString = '';

  for (let i = 0; i < 32; i++) {
    formattedString += characters[Math.floor(Math.random() * characters.length)];

    if (i === 7 || i === 11 || i === 15 || i === 19) {
      formattedString += '-';
    }
  }

  return formattedString;
}

function getLastNonEmptyString(strings) {
  for (let i = strings.length - 1; i >= 0; i--) {
    if (strings[i]) {
      return strings[i];
    }
  }
  return "";
}

function Extension() {
  let isLoading = false;
  let conversation_id = null;
  const extension = document.createElement("div");
  extension.className = "summariser-extension";
  extension.style.display = "none";
  extension.style.height = `${getComputedStyle(document.querySelector("#ytd-player")).height}`
  
  window.addEventListener('resize', function() {
    extension.style.height = `${getComputedStyle(document.querySelector("#ytd-player")).height}`
  });  

  const infoDivContainer = document.createElement("div");
  infoDivContainer.className = "info-div-container";
  const infoDiv = document.createElement("div");
  infoDiv.className = "info-div";
  infoDivContainer.appendChild(infoDiv);
  let isAtBottom = true;

  infoDiv.addEventListener('scroll', () => {
    isAtBottom = infoDiv.scrollTop == infoDiv.scrollHeight - infoDiv.clientHeight;
  });
  
  function smoothScrollToBottom() {
    // get the current scroll position and the distance to the bottom
    const currentScrollPos = infoDiv.scrollTop;
    const distanceToBottom = infoDiv.scrollHeight - infoDiv.clientHeight - currentScrollPos;
  
    // calculate the duration of the scroll animation based on the distance
    const scrollDuration = Math.abs(distanceToBottom) * 0.02; // 0.1 is the scroll speed
  
    // scroll to the bottom using an animation
    infoDiv.scrollTo({
      top: infoDiv.scrollHeight - infoDiv.clientHeight,
      behavior: 'smooth',
    });
  
    // set a timeout to reset the isAtBottom flag after the animation is complete
    setTimeout(() => {
      isAtBottom = true;
    }, scrollDuration);
  }
  
  setInterval(() => {
    if (isAtBottom) {
      smoothScrollToBottom();
    }
  }, 50);
  
  

  for (let i = 0; i < MESSAGES.length; i++) {
    const message = MESSAGES[i]

    const messageDiv = newMessage(message.from, message.message);

    infoDiv.appendChild(messageDiv);
  }

  function updateMessages() {
    infoDiv.innerHTML = "";
    for (let i = 0; i < MESSAGES.length; i++) {
      const message = MESSAGES[i];

      const messageDiv = newMessage(message.from, message.message);

      infoDiv.appendChild(messageDiv);
    }
  }

  const inputFormContainer = document.createElement("div");
  inputFormContainer.className = "input-form-container";

  const inputForm = document.createElement("form");
  inputForm.className = "input-form";

  const textareaContainer = document.createElement("div");
  textareaContainer.className = "textarea-container";
  const textarea = document.createElement("textarea");
  textarea.rows = 1;

  let timeoutId;

  const debounce = (fn, delay) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(fn, delay);
  };

  function resizeTextarea() {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.top =
      (textareaContainer.offsetHeight - textarea.offsetHeight) / 2 + "px";
  }

  // Auto-resize textarea on input
  textarea.addEventListener("input", () => {
    debounce(resizeTextarea, 25);  // execute resizeTextarea after 100ms of inactivity
  });

  function handleSubmit(event) {
    event.preventDefault();
    textarea.innerHTML = "";
    enterButton.innerHTML = "";
    enterButton.disabled = true;
    const loading = loadingDots();
    enterButton.appendChild(loading);
    isLoading = true;
    const input = textarea.value;

    updateMessages();

    async function updateDiv() {
      while (isLoading) {
        if (loading.innerHTML === "...") {
          loading.innerHTML = ""
        }
        loading.innerHTML += "."
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      enterButton.disabled = false;
      enterButton.innerHTML = ""
      enterButton.appendChild(arrowSvg());
    }

    const getSession = async () => {
      const res = await fetch("https://chat.openai.com/api/auth/session", {
        headers: {
          cookie: `__Secure-next-auth.session-token=${SESSION_TOKEN}`,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      alert(await res.json());

      // return accessToken;
    };

    // getSession();
    // let conversation;

    async function fetchData() {
      if (!conversation) {
        conversation = await startNewConversation(input);
      } else {
        conversation = await continueConversation(input);
      }

      isLoading = false;
    }

    updateDiv(); // updates the inner HTML of the div every 0.5 seconds
    fetchData(); // fetches data
  }

  const enterButton = document.createElement("button");
  enterButton.appendChild(arrowSvg());

  enterButton.addEventListener("click", handleSubmit)

  enterButton.className = "enter-button"

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && isLoading === false) {
      handleSubmit(event);
      textarea.value = "";
      resizeTextarea();
    }
  });

  textareaContainer.append(enterButton)

  textareaContainer.appendChild(textarea);

  inputForm.appendChild(textareaContainer);

  inputFormContainer.appendChild(inputForm);

  extension.appendChild(infoDivContainer);
  extension.appendChild(inputFormContainer);
  return extension;
}

/*
  
***REMOVED***
***REMOVED***

***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
  [X] - Text formatting


***REMOVED***
***REMOVED***















*/