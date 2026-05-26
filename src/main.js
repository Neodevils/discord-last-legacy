import { DiscordSDK } from "@discord/embedded-app-sdk";
import "./styles.css";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const BASE_URL = import.meta.env.BASE_URL;
const SWF_URL = `${BASE_URL}LastLegacy2.swf`;
const RUFFLE_URL = `${BASE_URL}ruffle/ruffle.js`;

const playerHost = document.querySelector("#player");

function installKongregateStub() {
  const kongregate = {
    stats: {
      submit: () => {},
    },
    services: {
      addEventListener: () => {},
      connect: () => {},
      getGameAuthToken: () => "",
      getUserId: () => "0",
      getUsername: () => "Guest",
      isGuest: () => true,
      showRegistrationBox: () => {},
    },
    scores: {
      showTab: () => {},
    },
    mtf: {
      showTab: () => {},
    },
  };

  window.kongregate = window.kongregate || kongregate;
  window.kongregateAPI = window.kongregateAPI || {
    getAPI: () => window.kongregate,
    loadAPI: (callback) => {
      if (typeof callback === "function") {
        callback();
      }
    },
  };
}

async function bootDiscordSdk() {
  if (!DISCORD_CLIENT_ID) {
    return;
  }

  const sdk = new DiscordSDK(DISCORD_CLIENT_ID);
  await sdk.ready();

  await sdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["rpc.activities.write"],
  });

  await sdk.commands.setActivity({
    activity: {
      type: 0,
      details: "Last Legacy 2",
      state: "Playing",
      instance: true,
    },
  });
}

async function bootRuffle() {
  installKongregateStub();

  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    autoplay: "on",
    unmuteOverlay: "hidden",
    showSwfDownload: false,
    splashScreen: true,
    contextMenu: "off",
    letterbox: "on",
    scale: "exactFit",
    quality: "high",
    base: BASE_URL,
  };

  await loadScript(RUFFLE_URL);

  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();
  playerHost.replaceChildren(player);
  player.style.width = "100%";
  player.style.height = "100%";
  await player.load(SWF_URL);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

async function main() {
  bootDiscordSdk().catch((error) => {
    console.warn("Discord SDK unavailable outside an Activity session.", error);
  });

  try {
    await bootRuffle();
  } catch (error) {
    console.error(error);
  }
}

main();
