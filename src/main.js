import { DiscordSDK } from "@discord/embedded-app-sdk";
import "./styles.css";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const BASE_URL = import.meta.env.BASE_URL;
const ASSET_VERSION = "20260527-0312";
const versioned = (url) => `${url}?v=${ASSET_VERSION}`;
const SWF_URL = versioned(`${BASE_URL}LastLegacy2.swf`);
const RUFFLE_URL = `${BASE_URL}ruffle/ruffle.js`;
const KONGREGATE_API_URL = versioned(`${BASE_URL}API_AS3_Local.swf`);
const NEWGROUNDS_PROMO_URL = versioned(`${BASE_URL}NewgroundsPromo.swf`);

const playerHost = document.querySelector("#player");
const KEY_BINDINGS = {
  up: { key: "w", code: "KeyW", keyCode: 87 },
  down: { key: "s", code: "KeyS", keyCode: 83 },
  left: { key: "a", code: "KeyA", keyCode: 65 },
  right: { key: "d", code: "KeyD", keyCode: 68 },
  jump: { key: " ", code: "Space", keyCode: 32 },
  primary: { key: "z", code: "KeyZ", keyCode: 90 },
  secondary: { key: "x", code: "KeyX", keyCode: 88 },
  tertiary: { key: "c", code: "KeyC", keyCode: 67 },
  delta: {
    key: "Shift",
    code: "ShiftLeft",
    keyCode: 16,
    location: 1,
    shiftKey: true,
  },
  confirm: { key: "Enter", code: "Enter", keyCode: 13 },
  menu: { key: "Escape", code: "Escape", keyCode: 27 },
};

const MOBILE_CONTROLS = [
  { id: "up", keyId: "up", label: "▲", className: "mobile-control--up" },
  { id: "left", keyId: "left", label: "◀", className: "mobile-control--left" },
  { id: "down", keyId: "down", label: "▼", className: "mobile-control--down" },
  { id: "right", keyId: "right", label: "▶", className: "mobile-control--right" },
  { id: "primary", keyId: "primary", label: "Z", pointerAction: true },
  { id: "secondary", keyId: "secondary", label: "X" },
  { id: "tertiary", keyId: "tertiary", label: "C" },
  { id: "jump", keyId: "jump", label: "␣" },
  { id: "delta", keyId: "delta", label: "Shift" },
  { id: "confirm", keyId: "confirm", label: "↵" },
  { id: "menu", keyId: "menu", label: "Esc" },
];

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
    allowScriptAccess: true,
    letterbox: "on",
    scale: "exactFit",
    quality: "high",
    base: BASE_URL,
    urlRewriteRules: [
      [
        /^https:\/\/www\.kongregate\.com\/flash\/API_AS3_Local\.swf(?:\?.*)?$/,
        KONGREGATE_API_URL,
      ],
      [
        /^https:\/\/apifiles\.ngfiles\.com\/NewgroundsPromo\.swf(?:\?.*)?$/,
        NEWGROUNDS_PROMO_URL,
      ],
    ],
  };

  await loadScript(RUFFLE_URL);
  installMobileGestureGuards();

  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();
  playerHost.replaceChildren(player);
  player.style.width = "100%";
  player.style.height = "100%";
  await player.load(SWF_URL);
  installMobileControls(player);
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

function installMobileControls(player) {
  const existingControls = document.querySelector(".mobile-controls");
  if (existingControls) {
    existingControls.remove();
  }

  const controls = document.createElement("div");
  controls.className = "mobile-controls";
  controls.setAttribute("aria-label", "Mobil kontroller");
  controls.innerHTML = `
    <div class="mobile-menu-controls" aria-label="Menü kontrolleri">
      ${renderMobileButton("confirm")}
      ${renderMobileButton("menu")}
    </div>
    <div class="mobile-dpad" aria-label="Ok tuşları">
      ${["up", "left", "down", "right"].map(renderMobileButton).join("")}
    </div>
    <div class="mobile-action-pad" aria-label="Aksiyon tuşları">
      ${["primary", "secondary", "tertiary", "jump", "delta"].map(renderMobileButton).join("")}
    </div>
  `;

  playerHost.append(controls);

  const pressedKeys = new Set();
  const activePointers = new Map();
  const activeDirections = new Set();
  const lastAimVector = { x: 1, y: 0 };
  let aimFrame = 0;

  const updateAimVector = () => {
    let x = 0;
    let y = 0;

    if (activeDirections.has("left")) {
      x -= 1;
    }
    if (activeDirections.has("right")) {
      x += 1;
    }
    if (activeDirections.has("up")) {
      y -= 1;
    }
    if (activeDirections.has("down")) {
      y += 1;
    }

    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      lastAimVector.x = x / length;
      lastAimVector.y = y / length;
    }
  };

  const runAimLoop = () => {
    aimFrame = 0;
    sendVirtualPointer(player, "move", lastAimVector);

    if (activePointers.size > 0) {
      aimFrame = window.requestAnimationFrame(runAimLoop);
    }
  };

  const ensureAimLoop = () => {
    if (!aimFrame) {
      aimFrame = window.requestAnimationFrame(runAimLoop);
    }
  };

  const pressControl = (control, pointerId) => {
    activePointers.set(pointerId, control);
    controls
      .querySelector(`[data-control="${control.id}"]`)
      ?.classList.add("is-pressed");

    if (["up", "down", "left", "right"].includes(control.id)) {
      activeDirections.add(control.id);
      updateAimVector();
    }

    sendVirtualPointer(player, "move", lastAimVector);

    if (control.pointerAction) {
      sendVirtualPointer(player, "down", lastAimVector);
    }

    if (control.keyId) {
      pressKey(player, control.keyId, pressedKeys);
    }

    ensureAimLoop();
  };

  const releaseControl = (pointerId) => {
    const control = activePointers.get(pointerId);
    if (!control) {
      return;
    }

    activePointers.delete(pointerId);
    controls
      .querySelector(`[data-control="${control.id}"]`)
      ?.classList.remove("is-pressed");

    if (["up", "down", "left", "right"].includes(control.id)) {
      activeDirections.delete(control.id);
      updateAimVector();
    }

    if (control.keyId) {
      releaseKey(player, control.keyId, pressedKeys);
    }

    if (control.pointerAction) {
      sendVirtualPointer(player, "up", lastAimVector);
    }

    sendVirtualPointer(player, "move", lastAimVector);
  };

  controls.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-control]");
    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    button.setPointerCapture?.(event.pointerId);
    focusPlayer(player);
    pressControl(getMobileControl(button.dataset.control), event.pointerId);
  });

  controls.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    releaseControl(event.pointerId);
  });

  controls.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    releaseControl(event.pointerId);
  });

  controls.addEventListener("lostpointercapture", (event) => {
    releaseControl(event.pointerId);
  });

  controls.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  window.addEventListener("blur", releaseAllControls);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseAllControls();
    }
  });

  function releaseAllControls() {
    for (const pointerId of activePointers.keys()) {
      releaseControl(pointerId);
    }

    for (const keyId of pressedKeys) {
      dispatchKeyboardEvent(player, "keyup", KEY_BINDINGS[keyId]);
    }
    pressedKeys.clear();

    if (aimFrame) {
      window.cancelAnimationFrame(aimFrame);
      aimFrame = 0;
    }
  }
}

function renderMobileButton(controlId) {
  const control = getMobileControl(controlId);
  const classes = ["mobile-control", control.className].filter(Boolean).join(" ");

  return `
    <button
      class="${classes}"
      type="button"
      tabindex="-1"
      aria-label="${control.id}"
      data-control="${control.id}"
    >${control.label}</button>
  `;
}

function getMobileControl(controlId) {
  return MOBILE_CONTROLS.find((control) => control.id === controlId);
}

function pressKey(player, keyId, pressedKeys) {
  if (pressedKeys.has(keyId)) {
    return;
  }

  pressedKeys.add(keyId);
  dispatchKeyboardEvent(player, "keydown", KEY_BINDINGS[keyId]);
}

function releaseKey(player, keyId, pressedKeys) {
  if (!pressedKeys.has(keyId)) {
    return;
  }

  pressedKeys.delete(keyId);
  dispatchKeyboardEvent(player, "keyup", KEY_BINDINGS[keyId]);
}

function dispatchKeyboardEvent(player, type, binding) {
  if (!binding) {
    return;
  }

  focusPlayer(player);

  for (const target of getKeyboardTargets(player)) {
    target.dispatchEvent(createKeyboardEvent(type, binding));
  }
}

function createKeyboardEvent(type, binding) {
  const event = new KeyboardEvent(type, {
    key: binding.key,
    code: binding.code,
    location: binding.location ?? 0,
    shiftKey: binding.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
    composed: true,
  });

  Object.defineProperty(event, "keyCode", { get: () => binding.keyCode });
  Object.defineProperty(event, "which", { get: () => binding.keyCode });
  Object.defineProperty(event, "charCode", { get: () => 0 });

  return event;
}

function getKeyboardTargets(player) {
  return [getPointerTarget(player)].filter(Boolean);
}

function sendVirtualPointer(player, type, vector) {
  const target = getPointerTarget(player);
  const rect = player.getBoundingClientRect();

  if (!target || rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const point = getAimPoint(rect, vector);
  const pointerType = type === "move" ? "pointermove" : `pointer${type}`;
  const mouseType = type === "move" ? "mousemove" : `mouse${type}`;

  dispatchPointerEvent(target, pointerType, point, type);
  dispatchMouseEvent(target, mouseType, point, type === "down");

  if (type === "up") {
    dispatchMouseEvent(target, "click", point, false);
  }
}

function getAimPoint(rect, vector) {
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.52;
  const radiusX = rect.width * 0.32;
  const radiusY = rect.height * 0.3;

  return {
    clientX: centerX + vector.x * radiusX,
    clientY: centerY + vector.y * radiusY,
  };
}

function getPointerTarget(player) {
  return (
    player.shadowRoot?.querySelector("canvas") ||
    player.shadowRoot?.querySelector("#container") ||
    player
  );
}

function dispatchPointerEvent(target, type, point, action) {
  if (!window.PointerEvent) {
    return;
  }

  target.dispatchEvent(
    new PointerEvent(type, {
      ...point,
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: action === "move" ? -1 : 0,
      buttons: action === "down" ? 1 : 0,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

function dispatchMouseEvent(target, type, point, isDown) {
  target.dispatchEvent(
    new MouseEvent(type, {
      ...point,
      button: isDown ? 0 : 0,
      buttons: isDown ? 1 : 0,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    }),
  );
}

function focusPlayer(player) {
  player.setAttribute("tabindex", "0");
  player.focus?.({ preventScroll: true });
}

function installMobileGestureGuards() {
  if (window.__lastLegacyMobileGestureGuardsInstalled) {
    return;
  }

  window.__lastLegacyMobileGestureGuardsInstalled = true;

  document.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(eventName, (event) => {
      event.preventDefault();
    });
  }
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
