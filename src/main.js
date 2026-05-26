import { DiscordSDK } from "@discord/embedded-app-sdk";
import "./styles.css";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const BASE_URL = import.meta.env.BASE_URL;
const SWF_URL = `${BASE_URL}LastLegacy2.swf`;
const RUFFLE_URL = `${BASE_URL}ruffle/ruffle.js`;

const statusEl = document.querySelector("#status");
const playerHost = document.querySelector("#player");
const fullscreenButton = document.querySelector("#fullscreenButton");

function setStatus(message) {
  statusEl.textContent = message;
}

async function bootDiscordSdk() {
  if (!DISCORD_CLIENT_ID) {
    setStatus("Yerel mod: Discord client id yok.");
    return;
  }

  const sdk = new DiscordSDK(DISCORD_CLIENT_ID);
  await sdk.ready();
  setStatus("Discord Activity hazir.");
}

async function bootRuffle() {
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    autoplay: "on",
    unmuteOverlay: "hidden",
    showSwfDownload: false,
    splashScreen: false,
    contextMenu: "off",
    letterbox: "on",
    scale: "showAll",
    quality: "high",
    base: BASE_URL,
  };

  await loadScript(RUFFLE_URL);

  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();
  playerHost.replaceChildren(player);
  player.style.width = "100%";
  player.style.height = "100%";
  setStatus("Oyun yukleniyor...");
  await player.load(SWF_URL);
  setStatus("Oyun yuklendi.");

  fullscreenButton.addEventListener("click", () => {
    player.requestFullscreen?.();
  });
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
    setStatus("Yukleme hatasi. Konsolu kontrol et.");
  }
}

main();
