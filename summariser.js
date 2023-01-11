const BUTTON_TEXT = "Summarize";
const BUTTON_WIDTH = 100; // px
let ACCESS_TOKEN = localStorage.getItem("summariser-extension-access-token") || "Bearer none" // if none then when user clicks the summarize button it will get it for them
let PFP = localStorage.getItem("summariser-extension-pfp") // if none then when user clicks the summarize button it will get it for them
let cookieString = localStorage.getItem("summariser-extension-cookie-string");
const CHUNK_SIZE = 16000; // messages are split into chunks in order to fit the full transcript to ChatGPT
let conversation = null; // ChatGPT conversation, if null then need to start one else continue existing conversation
const ENCODING = false; // encoding messages = more transcript can fit in less messages but can result in less accurate summaries and abilities

const lightSvg = lightThemeSVG();
const darkSvg = darkThemeSVG();

const darkThemeColors = {
  primaryColor: "rgba(53, 55, 64, 1)",
  primaryColorInvisible: "rgba(53, 55, 64, 0)",
  secondaryColor: "rgba(68, 70, 84, 1)",
  tertiaryColor: "rgba(68, 70, 84, 1)",
  fontColor: "rgba(255, 255, 255, 1)",
}

const lightThemeColors = {
  primaryColor: "rgba(255, 255, 255, 1)",
  primaryColorInvisible: "rgba(255, 255, 255, 0)",
  secondaryColor: "rgba(247, 247, 248, 1)",
  tertiaryColor: "rgba(217, 217, 217, 1)",
  fontColor: "rgba(0, 0, 0)",
}

function setLightThemeRoot() {
  document.documentElement.style.setProperty("--primary-color", lightThemeColors.primaryColor);
  document.documentElement.style.setProperty("--primary-color-invisible", lightThemeColors.primaryColorInvisible);
  document.documentElement.style.setProperty("--secondary-color", lightThemeColors.secondaryColor);
  document.documentElement.style.setProperty("--tertiary-color", lightThemeColors.tertiaryColor);
  document.documentElement.style.setProperty("--font-color", lightThemeColors.fontColor);
}

function setDarkThemeRoot() {
  document.body.classList.add("dark-theme");
  document.documentElement.style.setProperty("--primary-color", darkThemeColors.primaryColor);
  document.documentElement.style.setProperty("--primary-color-invisible", darkThemeColors.primaryColorInvisible);
  document.documentElement.style.setProperty("--secondary-color", darkThemeColors.secondaryColor);
  document.documentElement.style.setProperty("--tertiary-color", darkThemeColors.tertiaryColor);
  document.documentElement.style.setProperty("--font-color", darkThemeColors.fontColor);
}

const darkColorScheme = window.matchMedia("(prefers-color-scheme: dark)");
if (darkColorScheme.matches) {
  document.body.classList.add("dark-theme");
  setDarkThemeRoot()
} else {
  document.body.classList.add("light-theme");
  setLightThemeRoot()
}

// top 40 words in a text are assigned a special character to create a dictionary which ChatGPT will use to decode messages, this allows for more characters to be put in a single message
const specialCharacters = [
  'Ä', 'Ö', 'Ü', 'Æ', 'Ø', 'Å', 'ß', 'Œ', 'œ', 'ß', 'Ǟ', 'ǟ', 'Ǻ', 'ǻ',
  'Ⱥ', 'ɑ', 'ǝ', 'ə', 'ʌ', 'ɛ', 'ɜ', 'ɪ', 'ʊ', 'ʃ', 'ʒ', 'θ', 'ð', 'ŋ',
  'ʔ', 'ɾ', 'ɹ', 'ʁ', 'ʕ', 'ʢ', 'ʡ', 'ʔ', 'ʡ', 'ʔ', 'ʔ', 'ʔ'
];

// currently messages do not save but will later so its equivalent to an empty array
// === let MESSAGES = []
let MESSAGES = localStorage.getItem("summariser-extension-messages")
  ? JSON.parse(localStorage.getItem("summariser-extension-messages"))
  : (() => {
    localStorage.setItem("summariser-extension-messages", JSON.stringify(
      []
    ));
    return JSON.parse(localStorage.getItem("summariser-extension-messages"));
  })();

function waitForElement(selector) {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (document.querySelector(selector)) {
        resolve();
      }
    }, 500);

    setTimeout(() => { // longer than 60 seconds => cloudflare gave captcha
      clearInterval(checkInterval);
      reject();
    }, 60000);
  });
}

// gets the video watch id from the url
function getVideoId(url) {
  const urlParts = url.split('?');
  if (urlParts.length < 2) {
    return null;
  }

  // split the part after the '?' character by the '&' character
  const params = urlParts[1].split('&');
  for (const param of params) {
    // split the parameter by the '=' character
    const paramParts = param.split('=');
    if (paramParts.length < 2) {
      continue;
    }

    // if the parameter is for the video id, return it
    if (paramParts[0] === 'v') {
      return paramParts[1];
    }
  }

  // if the video id was not found, return null
  return null;
}

// get intial location
let currentLocation = getVideoId(window.location.toString());

// message received whenever a user in the active tab changes to another youtube domain page
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "handleYouTubeChange") {
    if (currentLocation !== getVideoId(message.url)) {
      const buttons = document.querySelectorAll(".summary-toggle-button");
      const extensions = document.querySelectorAll(".summariser-extension");

      for (const button of buttons) {
        button.parentNode.removeChild(button);
      }

      for (const extension of extensions) {
        extension.parentNode.removeChild(extension);
      }

      setTimeout(() => {
        if (!getVideoId(message.url)) {
          return
        }
        location.reload(); // reload to initialize the data for the new youtube video, only way for now
      }, 500)
    }
  }
});

function lightThemeSVG() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.className = "light-theme-svg";
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", "0 0 512 512");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M505.2 324.8l-47.73-68.78l47.75-68.81c7.359-10.62 8.797-24.12 3.844-36.06c-4.969-11.94-15.52-20.44-28.22-22.72l-82.39-14.88l-14.89-82.41c-2.281-12.72-10.76-23.25-22.69-28.22c-11.97-4.936-25.42-3.498-36.12 3.844L256 54.49L187.2 6.709C176.5-.6016 163.1-2.039 151.1 2.896c-11.92 4.971-20.4 15.5-22.7 28.19l-14.89 82.44L31.15 128.4C18.42 130.7 7.854 139.2 2.9 151.2C-2.051 163.1-.5996 176.6 6.775 187.2l47.73 68.78l-47.75 68.81c-7.359 10.62-8.795 24.12-3.844 36.06c4.969 11.94 15.52 20.44 28.22 22.72l82.39 14.88l14.89 82.41c2.297 12.72 10.78 23.25 22.7 28.22c11.95 4.906 25.44 3.531 36.09-3.844L256 457.5l68.83 47.78C331.3 509.7 338.8 512 346.3 512c4.906 0 9.859-.9687 14.56-2.906c11.92-4.969 20.4-15.5 22.7-28.19l14.89-82.44l82.37-14.88c12.73-2.281 23.3-10.78 28.25-22.75C514.1 348.9 512.6 335.4 505.2 324.8zM456.8 339.2l-99.61 18l-18 99.63L256 399.1L172.8 456.8l-18-99.63l-99.61-18L112.9 255.1L55.23 172.8l99.61-18l18-99.63L256 112.9l83.15-57.75l18.02 99.66l99.61 18L399.1 255.1L456.8 339.2zM256 143.1c-61.85 0-111.1 50.14-111.1 111.1c0 61.85 50.15 111.1 111.1 111.1s111.1-50.14 111.1-111.1C367.1 194.1 317.8 143.1 256 143.1zM256 319.1c-35.28 0-63.99-28.71-63.99-63.99S220.7 192 256 192s63.99 28.71 63.99 63.1S291.3 319.1 256 319.1z");

  svg.appendChild(path);

  return svg;
}

{/* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M421.6 379.9c-.6641 0-1.35 .0625-2.049 .1953c-11.24 2.143-22.37 3.17-33.32 3.17c-94.81 0-174.1-77.14-174.1-175.5c0-63.19 33.79-121.3 88.73-152.6c8.467-4.812 6.339-17.66-3.279-19.44c-11.2-2.078-29.53-3.746-40.9-3.746C132.3 31.1 32 132.2 32 256c0 123.6 100.1 224 223.8 224c69.04 0 132.1-31.45 173.8-82.93C435.3 389.1 429.1 379.9 421.6 379.9zM255.8 432C158.9 432 80 353 80 256c0-76.32 48.77-141.4 116.7-165.8C175.2 125 163.2 165.6 163.2 207.8c0 99.44 65.13 183.9 154.9 212.8C298.5 428.1 277.4 432 255.8 432z"/></svg> */}
function darkThemeSVG() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.className = "dark-theme-svg";
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", "0 0 512 512");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M421.6 379.9c-.6641 0-1.35 .0625-2.049 .1953c-11.24 2.143-22.37 3.17-33.32 3.17c-94.81 0-174.1-77.14-174.1-175.5c0-63.19 33.79-121.3 88.73-152.6c8.467-4.812 6.339-17.66-3.279-19.44c-11.2-2.078-29.53-3.746-40.9-3.746C132.3 31.1 32 132.2 32 256c0 123.6 100.1 224 223.8 224c69.04 0 132.1-31.45 173.8-82.93C435.3 389.1 429.1 379.9 421.6 379.9zM255.8 432C158.9 432 80 353 80 256c0-76.32 48.77-141.4 116.7-165.8C175.2 125 163.2 165.6 163.2 207.8c0 99.44 65.13 183.9 154.9 212.8C298.5 428.1 277.4 432 255.8 432z");

  svg.appendChild(path);

  return svg;
}

function settingsCogSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", "0 0 512 512");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336c44.2 0 80-35.8 80-80s-35.8-80-80-80s-80 35.8-80 80s35.8 80 80 80z");

  svg.appendChild(path);

  return svg;
}

// arrow svg for the enter button
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

// the loading dots which appear while ChatGPT hasn't finished typing
function loadingDots() {
  const dots = document.createElement("h1");
  dots.className = "loading-dots";
  dots.textContent = "."

  return dots;
}

// returns an svg for the user or and svg for ChatGPT which is OpenAI's logo
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
    if (PFP) {
      const pfp = document.createElement("img");
      pfp.src = PFP;
      pfp.className = "user-icon";
      return pfp;
    }

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

// svg of a clipboard
function ClipboardSvg() {
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

// svg of a tick mark
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

// when a user clips the "Copy code" button the svg turns into a tick mark and the text to "Copied!" for two seconds before reverting back
async function handleCopyClick(copyTarget, copyButton) {
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

// formats the raw text that is given by the decoder from the text stream
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
  parent.textContent = text;

  if (!text.includes("\n")) { // one contiuous text
    return parent
  }

  parent.innerHTML = "";

  let arr = text.split("```");

  // the following code just interprets the text to see what the appropriate elements and format should be
  for (let i = 0; i < arr.length; i++) {
    if (i % 2 === 0) { // regular block
      let block = arr[i];
      let blockText = document.createElement("p");
      blockText.className = i === 0 ? "block-text-first" : "block-text";

      if (!block.includes("\n\n")) { // one block
        blockText.textContent = block;
        parent.appendChild(blockText);
        continue;
      }

      const blocks = arr[i].split("\n\n");

      for (let j = 0; j < blocks.length; j++) {
        block = blocks[j];
        blockText = document.createElement("p");
        blockText.className = j === 0 ? "block-text-first" : "block-text";

        if (!block.includes("\n")) { // not a list
          blockText.textContent = block;
          parent.appendChild(blockText);
          continue;
        }

        // is a list

        blockText = document.createElement("ul");
        blockText.className = "list";
        const lines = block.trimEnd().split("\n");

        for (let k = 0; k < lines.length; k++) {
          const line = lines[k];

          if (k === 0) {
            const heading = document.createElement("p");
            heading.className = k === 0 && j === 0 ? "block-text-first" : "block-text";
            heading.textContent = line;
            parent.appendChild(heading);
            continue;
          }

          const listElement = document.createElement("li");
          const filteredLine = line.trim().slice(1).trim();
          listElement.textContent = filteredLine;
          listElement.className = "list-element";
          blockText.appendChild(listElement);
        }

        parent.appendChild(blockText);
      }
    }
    else { // code block
      const block = arr[i];
      const newCodeBlock = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = block.trim();

      // no need to constantly add a new top bar, where the copy button, is if it is alrady added
      if (!newCodeBlock.querySelector(".code-top")) {
        const copyBlock = document.createElement("div");
        copyBlock.className = "code-top";

        const copyButton = document.createElement("button");
        copyButton.className = "copy-button"

        copyButton.appendChild(ClipboardSvg());

        const copyText = document.createElement("h4");
        copyText.textContent = "Copy code"
        copyButton.appendChild(copyText);

        copyButton.addEventListener("click", () => {
          handleCopyClick(code, copyButton);
        });

        copyBlock.appendChild(copyButton);
        newCodeBlock.appendChild(copyBlock)
      }

      newCodeBlock.appendChild(code);
      parent.appendChild(newCodeBlock);
    }

  }

  return parent;
}

// appends a new div to the .info-div
function newMessage(type, text) {
  if (type === "user") { // no need to format
    const message = document.createElement("div");
    message.className = "user-message";
    const icon = Icon("user");
    message.appendChild(icon);

    const h1 = document.createElement("h1");
    h1.className = "question";
    h1.textContent = text;
    message.appendChild(h1);

    return message
  }

  // else it's ChatGPT so should be formatted just like it is on the real thing
  const message = document.createElement("div");
  message.className = "assistant-message"
  const icon = Icon("assistant")
  message.appendChild(icon);

  const h1 = formatText(text); // formats
  h1.className = "question";
  message.appendChild(h1);

  return message
}

// updates the messages visible in the .info-div
// clears the div and adds the messages back
function updateMessages() {
  const infoDiv = document.querySelector(".info-div");

  const childDiv = infoDiv.querySelector('.lower-div');

  for (var i = 0; i < infoDiv.children.length; i++) {
    if (infoDiv.children[i] !== childDiv) {
      infoDiv.removeChild(infoDiv.children[i]);
      i--;
    }
  }


  for (let i = 0; i < MESSAGES.length; i++) {
    const message = MESSAGES[i]

    if (message.type === "summary" && message.custom_type !== "summary-text") continue;

    const messageDiv = newMessage(message.from, message.message);
    infoDiv.insertBefore(messageDiv, childDiv);
  }
}

waitForElement("#above-the-fold > #title").then(() => {
  init();
})

function init() {
  const buttons = document.querySelectorAll(".summary-toggle-button");
  const extensions = document.querySelectorAll(".summariser-extension");

  // removes any existing extension components
  for (const button of buttons) {
    button.parentNode.removeChild(button);
  }

  for (const extension of extensions) {
    extension.parentNode.removeChild(extension);
  }

  const scriptElements = document.querySelectorAll('script');

  // hides any visible script elements
  scriptElements.forEach(element => {
    element.style.display = 'none';
  });

  // only adds extension if on a youtube video
  if (!window.location.toString().includes("/watch?v=")) { return }
  const button_parent = document.querySelector("#above-the-fold > #title");
  button_parent.appendChild(Button());

  const extension_parent = document.getElementById("secondary-inner");
  extension_parent.appendChild(Extension());

  // adjusting youtube's elements for extension:
  button_parent.style.display = "flex";
  button_parent.style.alignItems = "top";

  const title = document.querySelector("h1.ytd-watch-metadata");
  title.style.width = `calc(100% - ${BUTTON_WIDTH}px)`;
}

// findCommonWords returns an array of objects, this is used by ChatGPT to decode encoded messages. Encoded messages = less characters needed to express full transcript.
function findCommonWords(text) {
  const mostAreaWords = findMostAreaWords(text); // get a descending list of words which take up the most space in a text (these are the best words to replace to maximise shortening)

  const commonWords = []; // ChatGPT will use this dictionary to interpret coded messages. Messages are coded to reduce the number of characters = less messages = less frequent timeouts.
  let specialCharactersCopy = specialCharacters.slice();

  for (let i = 0; i < mostAreaWords.length; i++) {
    const word = mostAreaWords[i];
    const randomIndex = Math.floor(Math.random() * specialCharactersCopy.length);

    const key = specialCharactersCopy[randomIndex];
    commonWords.push({ word: word.word, key }); // top 40 most "area" words are assigned a key from the specialCharacters array copy
    specialCharactersCopy.splice(randomIndex, 1); // avoid duplicate key assignment
    if (commonWords.length === 40) break;
  }

  return commonWords;
}

// returns the encoded transcript and the stringified dictionary that ChatGPT will use to decode it
function replaceWords(text) {
  let modifiedText = text; // final text to be returned
  let commonWordsString = ""; // stringified dictionary for ChatGPT to reference to 

  const commonWords = findCommonWords(text);

  commonWords.forEach((commonWord) => {
    // replaces every word in the text with its key
    console.log(commonWord.word);
    modifiedText = modifiedText.replace(new RegExp(`\\b${commonWord.word}\\b`, "g"), commonWord.key);

    // creates a stringified dictionary to send to ChatGPT, example: word=key,firefox=key2
    commonWordsString += `${commonWord.word}=${commonWord.key} `;
  });

  commonWordsString = commonWordsString.trimEnd();

  return { modifiedText, commonWordsString };
}

// returns a descending list of words which take up the most "area". area = frequency of the word * length of the word
function findMostAreaWords(text) {
  const words = text.split(" ");
  const results = [];

  for (const word of words) {
    // check if the word has already been added to the results array
    const existingResult = results.find((result) => result.word === word);
    if (existingResult) {
      // if the word has already been added, increment the frequency count
      existingResult.frequency++;
    } else {
      // if the word has not been added, add a new object to the results array
      results.push({
        word: word,
        length: word.length,
        frequency: 1
      });
    }
  }

  // sort the results array in descending order by frequency * length (area)
  results.sort((a, b) => b.frequency * b.length - a.frequency * a.length);
  return results;
}

async function updateAccessToken() {
  let receivedAccessToken;
  let receivedPfp;
  let receivedCookieString;
  let error;

  browser.runtime.sendMessage({ type: 'openTab' }); // sends a message to the background to open a new tab at https://chat.openai.com/chat, background script handles getting the access token and sends it back
  
  // creates a self-removing listener which removes itself after the first message it recieves to avoid stacking
  async function addMessageListener() {
    const listener = async (request, sender, sendResponse) => {
      if (request.accessToken) {
        if (request.error) {
          error = request.error;
          return;
        }
        ACCESS_TOKEN = "Bearer " + request.accessToken;
        PFP = request.pfp;
        cookieString = request.cookieString;
        receivedAccessToken = request.accessToken;
        receivedPfp = request.pfp;
        receivedCookieString = request.cookieString;
        await browser.runtime.onMessage.removeListener(listener);  // remove the listener after it has received the access token
        localStorage.setItem("summariser-extension-access-token", ACCESS_TOKEN); // set accesstoken in localstroage
        localStorage.setItem("summariser-extension-pfp", PFP);
        localStorage.setItem("summariser-extension-cookie-string");
        return "Updated access token and removed tab."
      }
    }
    browser.runtime.onMessage.addListener(listener);
  }

  // handles the response to the "openTab" message, the response has the accessToken
  await addMessageListener();

  if (!error) {
    return {receivedAccessToken, receivedPfp, receivedCookieString};
  }

  return {error}
} 

async function handleCloudflareCheck() {
  browser.runtime.sendMessage({ type: 'cloudflare' }); // sends a message to the background to open a new tab at https://chat.openai.com/chat, background script handles getting the access token and sends it back
  console.log("sent")
  // create a promise that resolves or rejects based on the response to the "cloudflare" message
  return new Promise((resolve, reject) => {
    const listener = (request, sender, sendResponse) => {
      if (request.cloudflare) {
        browser.runtime.onMessage.removeListener(listener);  // remove the listener after it has received the response
        if (request.cloudflare === "successful") {
          resolve("successful");
        } else {
          reject("unsuccessful");
        }
      }
    }
    browser.runtime.onMessage.addListener(listener);
  });
}

async function makeApiCall(ACCESS_TOKEN, body) {
  console.log(cookieString);
  // calls api point with appropriate body to start a new conversation
  try {
    const response = await fetch("https://chat.openai.com/backend-api/conversation", {
      "headers": {
        "Accept": "text/event-stream",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Authorization": ACCESS_TOKEN,
        "Cookie": cookieString,
      },
      "body": JSON.stringify(body),
      "method": "POST",
    });
    return response;
  }
  catch (error) {
    return null;
  }
}

// starts new conversation with ChatGPT
async function startNewConversation(initialMessage, type, custom_assistant_type) {
  type = type || "normal"; // if normal then shows up on .info-div otherwise doesn't show up
  custom_assistant_type = custom_assistant_type || ""; // if ChatGPT sends summary then should show
  console.log(type);
  const id = generateFormattedString(); // generates a random 28 char + 4 dashes string
  const parent_id = generateFormattedString();

  // body for post request
  let body = { "action": "next", "messages": [{ "id": id, "role": "user", "content": { "content_type": "text", "parts": [initialMessage] } }], "parent_message_id": parent_id, "model": "text-davinci-002-render" }

  // add new message from user to array, the messages array is used to relay responses onto the div
  MESSAGES.push({
    "from": "user",
    "message": initialMessage,
    "message_id": id,
    "parent_message_id": parent_id,
    "conversation_id": null,
    "type": type,
    "custom_type": "",
  })

  // add new message from ChatGPT to array
  // blank message that will be updated as text stream is recieved from response
  MESSAGES.push(
    {
      "from": "assistant",
      "message": "",
      "message_id": "",
      "conversation_id": "",
      "type": type,
      "custom_type": custom_assistant_type,
    })

  updateMessages(); // update messages in .info-div to show the user their queries are being processed.

  const response = await makeApiCall(ACCESS_TOKEN, body)
  const multiUtilButton = document.querySelector("[class^='multi-util']");

  console.log(response);

  if (!response) {
    multiUtilButton.className = "multi-util-oauth"
    multiUtilButton.textContent = "Network error ocurred, please refresh and try again.";
    return;
  }

  if (await response.ok === false) {
    return response
  }
  
  console.log(response);

  /*
    OK = Good
    Forbidden = Cloudflare
    Unauthorized = Invalid access token
    Too Many Requests = Timed out
    Internal Server Error = Unknown
  */

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) { // runs while the text stream isn't finished
    const { done, value } = await reader.read();
    if (done || decoder.decode(value).length === 14) { // length 14 implies <empty string> so done
      break;
    }

    // filtering the data for extraction of key values
    let string = decoder.decode(value).toString();
    let lines = string.split("\n\n");
    let data = getLastNonEmptyString(lines);
    let filtered = data.replace(/data: [DONE]: /g, "");
    filtered = filtered.replace(/data: /g, "");

    try {
      const message_response = JSON.parse(filtered);

      // key values from the response
      const response_message_id = message_response.message.id;
      const response_conversation_id = message_response.conversation_id;
      const response_error = message_response.error
      const response_message = message_response.message.content.parts[0]
      const response_role = message_response.message.role

      // update the latest message which is from ChatGPT as it was pushed earlier
      MESSAGES[MESSAGES.length - 1] =
      {
        "from": response_role,
        "message": response_message,
        "message_id": response_message_id,
        "conversation_id": response_conversation_id,
        "type": type,
        "custom_type": custom_assistant_type,
      }

      updateMessages(); // updates messages seen in the .info-div
    } catch (error) {

    }
  }

  return response;
}

// continues existing conversation with ChatGPT
async function continueConversation(message, type, custom_assistant_type) {
  type = type || "normal";
  custom_assistant_type = custom_assistant_type || ""; // if ChatGPT sends summary then should show
  console.log(type);
  const id = generateFormattedString();
  let last_user_message = MESSAGES[MESSAGES.length - 2];
  let last_assistant_message = MESSAGES[MESSAGES.length - 1];
  const conversation_id = last_assistant_message.conversation_id

  let body = { "action": "next", "conversation_id": conversation_id, "messages": [{ "id": id, "role": "user", "content": { "content_type": "text", "parts": [message] } }], "parent_message_id": last_assistant_message.message_id, "model": "text-davinci-002-render" }

  // pushes message to array to be displayed to the user in the .info-div
  MESSAGES.push({
    "from": "user",
    "message": message,
    "message_id": id,
    "parent_message_id": last_user_message.message_id,
    "conversation_id": conversation_id,
    "type": type,
    "custom_type": "",
  });

  // pushes blank message from ChatGPT to be updated later when response is given
  MESSAGES.push(
    {
      "from": "assistant",
      "message": "",
      "message_id": "",
      "conversation_id": conversation_id,
      "type": type,
      "custom_type": custom_assistant_type,
    })

  updateMessages(); // updates the messages displayed to the user in the .info-div

  const response = await makeApiCall(ACCESS_TOKEN, body)
  const multiUtilButton = document.querySelector("[class^='multi-util']");

  console.log(body);
  console.log(ACCESS_TOKEN);
  console.log(response);

  if (!response) {
    multiUtilButton.className = "multi-util-oauth"
    multiUtilButton.textContent = "Network error ocurred, please refresh and try again.";
    return;
  }

  if (await response.ok === false) {
    return response
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) { // runs while the text stream isn't finished
    const { done, value } = await reader.read();
    if (done || decoder.decode(value).length === 14) { // conditions to check for when to stop
      break;
    }

    // data filtration so that key data values can be extracted
    let string = decoder.decode(value).toString();
    let lines = string.split("\n\n");
    let data = getLastNonEmptyString(lines);
    let filtered = data.replace(/data: [DONE]: /g, "");
    filtered = filtered.replace(/data: /g, "");

    try {
      const message_response = JSON.parse(filtered);

      // key values from the response
      const response_message_id = message_response.message.id;
      const response_conversation_id = message_response.conversation_id;
      const response_error = message_response.error
      const response_message = message_response.message.content.parts[0]
      const response_role = message_response.message.role

      // updates the latest message in the array because that is ChatGPT's message as pushed earlier
      MESSAGES[MESSAGES.length - 1] =
      {
        "from": response_role,
        "message": response_message,
        "message_id": response_message_id,
        "conversation_id": conversation_id,
        "type": type,
        "custom_type": custom_assistant_type,
      }

      updateMessages(); // updates the messages as seen on .info-div
    } catch (error) {
      // error handling here
    }
  }

  return response ; // arbitrary return data
}

let apiKey;
let params;
let userLanguageCode;

// sets apiKey, params, and userLanguage
function setCredentials() {
  const scriptTags = document.querySelectorAll('script');
  // searches for the script tag with needed data to set the apiKey, params, and userLanguage variables
  for (const scriptTag of scriptTags) {
    // gets and sets the "params" which is needed as part of the body for the post request to get the transcript of the youtube video 
    if (scriptTag.textContent.includes('var ytInitialData = ')) {
      const startIndex = scriptTag.innerHTML.indexOf('"getTranscriptEndpoint":{"params":"');
      const endIndex = scriptTag.innerHTML.indexOf('"}', startIndex);
      const substring = scriptTag.innerHTML.substring(startIndex, endIndex + 3);
      params = substring.split(':')[2].replace(/[}"\\]/g, ""); // set params
      const requestLanguageStartIndex = scriptTag.innerHTML.indexOf('"requestLanguage":"');
      const requestLanguageEndIndex = scriptTag.innerHTML.indexOf('"', requestLanguageStartIndex + 18);
      const substring2 = scriptTag.innerHTML.substring(requestLanguageStartIndex, requestLanguageEndIndex + 3);
      userLanguageCode = substring2.split(':')[substring2.split(':').length - 1].replace("\"","");
    }
    // gets and sets the api key using regex
    else if (scriptTag.textContent.includes("INNERTUBE_API_KEY")) {
      const regex = /ytcfg\.set\((\{.*\})\);/;
      let match = regex.exec(scriptTag.textContent);
      apiKey = JSON.parse(match[1]).INNERTUBE_API_KEY; // set api key
    }
  }
}

function isTranscriptAvailable() {
  let available = false;

  let paths = document.querySelectorAll("path, [type='path'], input[type='path']");

  // checks if transcript is available by searching for specific attribute values
  for (let i = 0; i < paths.length; i++) {
    let path = paths[i];
    if (path.getAttribute("d") === "M5,11h2v2H5V11z M15,15H5v2h10V15z M19,15h-2v2h2V15z M19,11H9v2h10V11z M22,6H2v14h20V6z M3,7h18v12H3V7z") {
      available = true;
    }
  }

  return available;
}

async function getVideoTranscript(apiKey, params) {
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
  
  // all of the transcript lines
  const initialSegments =
    json.actions[0].updateEngagementPanelAction.content.transcriptRenderer
      .content.transcriptSearchPanelRenderer.body.transcriptSegmentListRenderer
      .initialSegments;

  let transcription = ""; // stores the entire transcription

  // combines all lines from the intialSegments to form one giant transcript
  for (let segment of initialSegments) {
    let text = "";

    if(segment.transcriptSegmentRenderer.snippet.runs) {
      text = segment.transcriptSegmentRenderer.snippet.runs[0].text
    }

    transcription += segment.transcriptSegmentRenderer.startTimeText.simpleText + " " + text + " ";
  }
  return transcription;
}

function Button() {
  let transcriptAvailable = isTranscriptAvailable();

  const button = document.createElement("button");
  let hasAlreadySummarized = false; // used to stop users from repeatedly clicking the summarize button with effect other than to toggle open and close

  button.textContent = transcriptAvailable ? BUTTON_TEXT : "Not available";
  button.className = "summary-toggle-button";
  
  if (!transcriptAvailable) {
    return button;
  }

  setCredentials(); // sets apiKey and params

  button.addEventListener("click", async (event) => {
    const extension = document.querySelector(".summariser-extension");
    extension.style.display === "none" ? extension.style.display = "flex" : extension.style.display = "none";

    // if hasn't already summarized
    if (hasAlreadySummarized === false) {
      const VIDEO_NAME = document.querySelector("h1.ytd-watch-metadata > yt-formatted-string:nth-child(1)").innerText;
      const VIDEO_LENGTH = document.querySelector(".ytp-time-duration").textContent;

      // the initial prompt to be included with the summary, it tells ChatGPT how to interpret the message
      const prompt = `YOU CAN SPEAK LANGUAGE CODE: "${userLanguageCode}" EACH TRANSCRIPT LINE HAS A TIMESTAMP PRECEDING IT. You are a highly  proficient AI at processing large youtube video transcripts. You meticulously study and read every word of the transcript parts I give you. If asked to write code you should use proper formatting. You should only reply with "Understood." once you read the texts. You should be prepared to answer any questions about the video or anything as usual, we start now, this youtube video is called "${VIDEO_NAME}" and is ${VIDEO_LENGTH} long. If I use words like "video" or "transcript" assume that I'm referring to this video's transcript unless explicitly stated otherwise. Remember to also use your own knowledge to add further understanding and context for yourself: `

      let transcription = await getVideoTranscript(apiKey, params);

      let summarisePrompt = `ONLY REPLY IN THIS LANGUAGE CODE: ${userLanguageCode} VIDEO LENGTH = ${VIDEO_LENGTH}. DO NOT FORGET THIS TRANSCRIPT I HAVE GIVEN YOU CONSIDER THE TRANSCRIPT IF YOU ARE UNSURE OF WHAT I AM ASKING YOU FOR. Whenever i talk about a "video" assume that it is about the transcript. with that being said: roleplay continued: as you are such a proficient ai you have read the transcript parts I gave you meticulously and are now ready to answer any and all questions about it in EXHAUSTIVE and COMPLETE detail. Whenever a user asks a question about the video transcript you always re-read the transcript every time to make sure you haven't missed anything. However you are so good that you are also able to do anything that you normally would be able to do like formatting code snippets. ATTENTION: REPLY ONLY IN THE LANGUAGE I TOLD YOU TO REPLY IN, you must write, using bullet points and chapters, the best most high quality summary imaginable of the video transcript. penultimately as part of your roleplay if i use words like "video" or "vid" you must assume i am talking about the transcript i have given you .` // [DELETED PROMPTS DUE TO DISABLED ENCODING]: ATTENTION: In the transcript parts I have given you there are a number of strange characters, you need to use this dictionary to interpret the encoded messages as part of the roleplay: ${modification.commonWordsString}. ALSO TRANSLATE ENCODED MESSAGES BACK TO READABLE TEXT WHEN REPLYING

      sendmessageToChatGPT(transcription, "summary", ENCODING, prompt, summarisePrompt)
    }

    // once summary is given the summarize button should not give another summary if clicked, it should only toggle the extension's visibility
    hasAlreadySummarized = true;
  });

  return button
}

// generates the ids for starting a new conversation
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

// this component is the status bar which is in the .tool-bar-container
// it shows errors if any occur with the request
// when clicked it handles these errors; if access token is invalid it handles, if cloudflare check it handles and if rate limited it tells the user
function MultiUtilButton() {
  const button = document.createElement("button");
  button.className = "multi-util-hidden";

  return button;
}

// the ToolBar is the component under .textarea-container
function ToolBar() {
  const container = document.createElement("div");
  container.className = "tool-bar-container";

  const settings = document.createElement("button");
  settings.className = "settings-button";
  settings.appendChild(settingsCogSvg());

  settings.addEventListener("click", (event) => {
    event.preventDefault();
  })

  const themeButton = document.createElement("button");
  themeButton.className = "theme-button";

  const darkColorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  themeButton.appendChild(darkColorScheme.matches ? lightSvg : darkSvg);
  
  themeButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (document.body.classList.contains("light-theme")) {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");

      if (themeButton.querySelector("svg")) {
        themeButton.removeChild(themeButton.querySelector("svg"))
      }

      themeButton.appendChild(lightSvg);
      setDarkThemeRoot();
    } else if (document.body.classList.contains("dark-theme")) {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      if (themeButton.querySelector("svg")) {
        themeButton.removeChild(themeButton.querySelector("svg"))
      }
      
      themeButton.appendChild(darkSvg);
      setLightThemeRoot();
    }
  });

  const status = MultiUtilButton();

  status.addEventListener("click", (event) => {
    event.preventDefault();
    browser.runtime.sendMessage({ type: 'openTab' }); // sends a message to the background to open a new tab at https://chat.openai.com/chat, background script handles getting the access token and sends it back

    // creates a self-removing listener which removes itself after the first message it recieves to avoid stacking
    function addMessageListener() {
      const listener = (request, sender, sendResponse) => {
        if (request.accessToken) {
          ACCESS_TOKEN = "Bearer " + request.accessToken;
          browser.runtime.onMessage.removeListener(listener);  // remove the listener after it has received the access token
          localStorage.setItem("summariser-extension-access-token", ACCESS_TOKEN); // set accesstoken in localstroage

          const multiUtilButton = document.querySelector("[class^='multi-util']");
          multiUtilButton.className = "multi-util-button"
          multiUtilButton.textContent = "Refreshed Successfully!";

          setTimeout(() => { // hide after two seconds as not to be an eyesore
            multiUtilButton.className = "multi-util-hidden"
            multiUtilButton.textContent = "";
          }, 2000)
        }
      }
      browser.runtime.onMessage.addListener(listener);
    }

    // handles the response to the "openTab" message, the response has the accessToken
    addMessageListener();
  });


  container.appendChild(status);
  container.appendChild(settings);
  container.appendChild(themeButton);

  return container;
}

let loadingDotsInterval;

function updateEnterButton(update) {
  const enterButton = document.querySelector(".enter-button");
  enterButton.textContent = "";

  if (update === "loaded") {
    enterButton.disabled = false;
    enterButton.appendChild(arrowSvg());
    clearInterval(loadingDotsInterval);
    return;
  }

  if (update === "loading") {
    enterButton.disabled = true;
    const dots = loadingDots();
    enterButton.appendChild(dots);
    loadingDotsInterval = setInterval(() => {
      if (dots.textContent === "...") {
        dots.textContent = "";
      }
      dots.innerHTML += ".";
    }, 500);
  }
}

async function handleError(statusText) {
  const multiUtilButton = document.querySelector("[class^='multi-util']");

  let shouldRetry = false;

  // handle errors
  if (statusText === "Unauthorized") {
    // Update access token and try again
    const updatedData = await updateAccessToken();

    if (updatedData.error) {
      multiUtilButton.className = "multi-util-cooldown"
      multiUtilButton.textContent = "Rate limited by ChatGPT. Reset your details for you.";
      localStorage.setItem("summariser-extension-access-token", "Bearer none");
      localStorage.setItem("summariser-extension-pfp", "");
      shouldRetry = false;
      return shouldRetry;
    }

    ACCESS_TOKEN = updatedData.accessToken;
    PFP = updatedData.pfp;
    cookieString = updatedData.cookieString;
      
    multiUtilButton.className = "multi-util-button"
    multiUtilButton.textContent = "Refreshed Successfully! Retrying previous request in 2 seconds.";

    await new Promise(resolve => setTimeout(resolve, 2000)); // small delay
    shouldRetry = true;
  }
  else if (statusText === "Forbidden") { // sometimes also because unauthorized
    ACCESS_TOKEN = await updateAccessToken();

    // if (!localStorage.getItem("summariser-extension-access-token")) {
    //   ACCESS_TOKEN = await updateAccessToken();
    //   localStorage.setItem("summariser-extension-access-token", ACCESS_TOKEN);
    // }
    
    multiUtilButton.className = "multi-util-cloudflare"
    multiUtilButton.textContent = "Cloudflare check required. Handling.";

    try {
      const cloudflareStatus = await handleCloudflareCheck();
      multiUtilButton.className = "multi-util-button"
      multiUtilButton.textContent = "Refreshed Successfully! Retrying previous request in 2 seconds.";
      shouldRetry = true;
    } catch (error) {
      multiUtilButton.className = "multi-util-setup"
      multiUtilButton.textContent = "Likely captcha requires solving, please solve then come back.";
      shouldRetry = false;
    }

  } else if (statusText === "Too Many Requests") {
    multiUtilButton.className = "multi-util-cooldown"
    multiUtilButton.textContent = "Rate limited by ChatGPT. Reset your details for you.";
    localStorage.setItem("summariser-extension-access-token", "Bearer none");
    localStorage.setItem("summariser-extension-pfp", "");
    shouldRetry = false;
  } else if (statusText === "Internal Server Error") {
    multiUtilButton.className = "multi-util-setup"
    multiUtilButton.textContent = "Unknown error occurred. Retrying.";

    shouldRetry = true;
  }

  return shouldRetry;
}

async function sendmessageToChatGPT(message, messageType = "normal", encodingEnabled = false, prompt = "", summarisePrompt = "") {
  updateEnterButton("loading");
  
  let chunks = [];
  let start = 0;
  let count = 0;

  const splitMessageIntoChunks = (message, chunkSize) => {
    while (start < message.length) {
      const chunk = message.slice(start, start + chunkSize);
      chunks.push(chunk);
      start += chunkSize;
    }
  };

  switch (messageType) {
    case "summary":
      splitMessageIntoChunks(message, count === 0 ? CHUNK_SIZE - (prompt.length + 100) : CHUNK_SIZE);
      chunks = chunks.map(chunk => chunk.replace(/\[Music\]/g, "").replace(/\s+/g, " "));
      chunks = chunks.map((chunk, index) => {
        if (encodingEnabled) {
          return replaceWords(`REPLY WITH "UNDERSTOOD." TRANSCRIPT YOUTUBE VIDEO PART ${index + 1}: READ CAREFULLY AND REMEMBER FULLY: ${chunk}`).modifiedText;
        }
        return index === 0 ? `${prompt} TRANSCRIPT PART 1: ${chunk}` : `TRANSCRIPT YOUTUBE VIDEO PART ${index + 1}: ${chunk}`;
      });
      chunks.push(summarisePrompt);
      break;
    case "normal":
      splitMessageIntoChunks(message, CHUNK_SIZE);
      break;
  }

  let i = 0;
  while (i < chunks.length) {
    const chunk = chunks[i];
    let type;
    if (!conversation) {
      type = "start";
      conversation = await startNewConversation(chunk, messageType, i === chunks.length - 1 ? "summary-text" : "");
    } else {
      type = "continue";
      conversation = await continueConversation(chunk, messageType, i === chunks.length - 1 ? "summary-text" : "");
    }
  
    if (await conversation.ok === false) {
      const shouldRetry = await handleError(await conversation.statusText);
      const multiUtilButton = document.querySelector("[class^='multi-util']");

      await new Promise(resolve => setTimeout(resolve, 2000));

      multiUtilButton.className = "multi-util-hidden"
      multiUtilButton.textContent = "";

      if (shouldRetry) {
        if (type === "start") {
          conversation = null;
          MESSAGES = []
          updateMessages();
        } else if (type === "continue") {
          MESSAGES.splice(-2);
          updateMessages();
        }
        continue;
      }
    }
  
    i += 1;
  }

  updateEnterButton("loaded");
  
}

let autoScroll = true
let timeoutId;

const debounce = (fn, delay) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(fn, delay);
};

// the gui for ChatGPT
function Extension() {
  const extension = document.createElement("div");
  extension.className = "summariser-extension";
  extension.style.display = "none";

  const infoDivContainer = document.createElement("div");
  infoDivContainer.className = "info-div-container";

  const infoDiv = document.createElement("div"); // where all the messages are shown
  infoDiv.className = "info-div";

  const lowerDiv = document.createElement("div");
  lowerDiv.className = "lower-div";
  
  infoDiv.appendChild(lowerDiv)

  infoDivContainer.appendChild(infoDiv);
  
  // requestanimationframe for smoother scroll
  let oldScrollY = infoDiv.scrollY;

  infoDiv.onscroll = function(e) {
    if(oldScrollY < infoDiv.scrollY){
      if (infoDiv.scrollTop !== 0) {
        autoScroll = false;
      }
    } else {
      autoScroll = infoDiv.scrollTop >= (infoDiv.scrollHeight - infoDiv.clientHeight) - 60
    }
    oldScrollY = infoDiv.scrollY;
  }

  extension.style.height = "auto";

  setInterval(() => {
    if (autoScroll) {
      infoDiv.scrollTop = (infoDiv.scrollHeight - infoDiv.clientHeight)
    }
  }, 100);

  extension.style.height = "auto";

  const inputFormContainer = document.createElement("div");
  inputFormContainer.className = "input-form-container";

  const inputForm = document.createElement("form");
  inputForm.className = "input-form";

  const textareaContainer = document.createElement("div");
  textareaContainer.className = "textarea-container";

  const textarea = document.createElement("textarea");
  textarea.rows = 1;
  
  const playerElement = document.querySelector("#ytd-player");
  let playerHeight = parseInt(getComputedStyle(playerElement).height);

  // set initial heights
  infoDivContainer.style.height = `${parseInt(getComputedStyle(document.querySelector("#ytd-player")).height) + 160 + "px"}`;
  extension.style.width = `calc(100% + ${getComputedStyle(document.querySelector("#columns")).marginRight})`;

  // adjust heights on resize to be consistent with the size of youtube video player
  window.addEventListener('resize', function () {
    playerHeight = parseInt(getComputedStyle(playerElement).height);
    infoDivContainer.style.height = `${playerHeight + 160}px`;
    extension.style.width = `calc(100% + ${getComputedStyle(document.querySelector("#columns")).marginRight})`;
  });

  // auto scaling of code with input
  function resizeTextarea() {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.top =
      (textareaContainer.offsetHeight - textarea.offsetHeight) / 2 + "px";
  }

  function handleInput(event) {
    debounce(resizeTextarea, 25);
  }

  function handleKeydown(event) {
    resizeTextarea();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (textarea.value.length < 1 || enterButton.disabled) {
        return;
      }
      handleSubmit(event);
    }
  }

  // auto-resize textarea on input
  textarea.addEventListener("input", handleInput);
  textarea.addEventListener("keydown", handleKeydown);

  // handle text submit
  function handleSubmit(event) {
    event.preventDefault();
    const input = textarea.value;
    textarea.value = "";

    updateMessages();
    
    sendmessageToChatGPT(input);
  }

  const enterButton = document.createElement("button");
  enterButton.className = "enter-button";
  enterButton.appendChild(arrowSvg());

  enterButton.addEventListener("click", clickHandler);

  function clickHandler(event) {
    event.preventDefault();
    if (textarea.value.length < 1 || document.querySelector(".enter-button").disabled) {
      return;
    }
    
    handleSubmit(event);
  }

  textareaContainer.append(enterButton);
  textareaContainer.appendChild(textarea);
  inputForm.appendChild(textareaContainer);
  inputForm.appendChild(ToolBar());
  inputFormContainer.appendChild(inputForm);
  extension.appendChild(infoDivContainer);
  extension.appendChild(inputFormContainer);
  return extension;
}