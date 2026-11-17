// Offline checks for the Axure page contract and support-session transitions.
// No browser, SDK or network service is used.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
const pageName = "\u9996\u9875-\u5ba2\u670d\u5f39\u7a97";
const html = fs.readFileSync(path.join(root, pageName + ".html"), "utf8");
const js = fs.readFileSync(path.join(root, "custom/js/home-support.js"), "utf8");
const css = fs.readFileSync(path.join(root, "custom/css/home-support.css"), "utf8");
const configSource = fs.readFileSync(path.join(root, "custom/js/home-support-config.js"), "utf8");

assert.match(html, /width=800, initial-scale=1/);
assert.match(html, /<div id="base"><\/div>/);
assert.equal((html.match(/id="hs-support-window"/g) || []).length, 1);
assert.equal((html.match(/id="hs-support-backdrop"/g) || []).length, 1);
const backdropRule = /\.hs-support-backdrop\s*\{([^}]+)\}/.exec(css)[1];
assert.match(backdropRule, /position:\s*absolute/);
assert.match(backdropRule, /inset:\s*0/);
assert.match(backdropRule, /background:\s*rgba\(0,\s*0,\s*0,\s*\.4\)/);
const zIndex = selector => Number(new RegExp("\\." + selector + "\\s*\\{[^}]*z-index:\\s*(\\d+)").exec(css)[1]);
assert(zIndex("hs-launcher") < zIndex("hs-support-backdrop"));
assert(zIndex("hs-support-backdrop") < zIndex("hs-support-window"));
const htmlIds = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]));
for (const match of html.matchAll(/<use href="#([^"]+)"/g)) assert(htmlIds.has(match[1]), "Missing SVG icon: " + match[1]);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:#|https:)/.test(value)) continue;
  assert(!path.isAbsolute(value) && !value.startsWith("/"), "Resource must be relative: " + value);
  assert(fs.existsSync(path.join(root, value.split("?")[0])), "Missing local resource: " + value);
}
let pageData, documentData;
vm.runInNewContext(fs.readFileSync(path.join(root, "files", pageName, "data.js"), "utf8"), { $axure: { loadCurrentPage(value) { pageData = value; } } });
vm.runInNewContext(fs.readFileSync(path.join(root, "data/document.js"), "utf8"), { $axure: { loadDocument(value) { documentData = value; } } });
assert.equal(pageData.url, pageName + ".html");
assert.equal(pageData.page.name, pageName);
assert.equal(pageData.page.packageId, "home_support_floating");
assert.match(html, new RegExp('data-axure-page-id="' + pageData.page.packageId + '"'));
assert.equal(pageData.defaultAdaptiveView.size.width, 800);
assert.equal(pageData.defaultAdaptiveView.size.height, 926);
assert(Array.isArray(pageData.variables) && Array.isArray(pageData.page.diagram.objects));
const ids = new Set(); let target;
function walk(nodes, parent) {
  nodes.forEach(node => {
    if (node.id) { assert(!ids.has(node.id), "Duplicate sitemap id: " + node.id); ids.add(node.id); }
    if (node.id === "home_support_floating") { assert.equal(parent.id, "home_component_group"); target = node; }
    if (node.children) walk(node.children, node);
  });
}
walk(documentData.sitemap.rootNodes, null);
assert(target); assert.equal(target.pageName, pageName); assert.equal(target.url, pageData.url);
const snapshot = JSON.parse(fs.readFileSync(path.join(root, "scripts/ai-menu-snapshot.json"), "utf8"));
assert.equal(JSON.stringify(snapshot.rootNodes), JSON.stringify(documentData.sitemap.rootNodes), "Saved menu snapshot must match the sitemap");
for (const relative of [pageName + ".html", "files/" + pageName + "/data.js", "data/document.js", "scripts/ai-menu-snapshot.json"]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  assert(!source.includes("\ufffd"), "Replacement character: " + relative);
  assert(!/\?{3,}/.test(source), "Possible damaged Chinese: " + relative);
}

class Element {
  constructor(tag = "div", attrs = "") {
    this.tagName = tag; this.hidden = /\bhidden\b/.test(attrs); this.value = ""; this.textContent = "";
    this.children = []; this.handlers = {}; this.attributes = {}; this.dataset = {}; this.disabled = false; this.inert = false;
    this.clientHeight = 926; this.scrollHeight = 1000; this.scrollTop = 0;
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.classList = { add() {}, toggle() {} };
    for (const match of attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)) this.dataset[match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = match[2];
  }
  addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  replaceChildren(...children) { this.children = []; children.forEach(child => this.appendChild(child)); }
  insertBefore(child) { child.parent = this; this.children.unshift(child); }
  replaceWith(child) { const index = this.parent.children.indexOf(this); this.parent.children[index] = child; child.parent = this.parent; }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  select() {}
  setSelectionRange() {}
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  querySelector() { return null; }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  closest(selector) {
    const found = selector.split(",").some(part => {
      part = part.trim();
      if (part[0] === "#") return this.id === part.slice(1);
      const match = /^\[data-([a-z-]+)\]$/.exec(part);
      return match && Object.hasOwn(this.dataset, match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()));
    });
    return found ? this : this.parent ? this.parent.closest(selector) : null;
  }
}
function createEnvironment(storage = new Map(), options = {}) {
  const nodes = new Map(), previews = [], tabs = [], timers = new Map(); let timerId = 0;
  const effects = [], clipboardWrites = [];
  const document = new Element(); document.readyState = "complete";
  const stack = [];
  const voidTags = new Set(["meta", "link", "use", "path", "rect", "circle", "img", "input", "br"]);
  for (const match of html.matchAll(/<(\/?)\s*([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const [, closing, tag, attrs] = match;
    if (closing) {
      const index = stack.map(item => item.tagName).lastIndexOf(tag);
      if (index >= 0) stack.length = index;
      continue;
    }
    const element = new Element(tag, attrs);
    element.ownerDocument = document;
    if (stack.length) stack[stack.length - 1].appendChild(element);
    const id = /\bid="([^"]+)"/.exec(attrs);
    if (id) { assert(!nodes.has(id[1]), "Duplicate DOM id: " + id[1]); element.id = id[1]; nodes.set(id[1], element); }
    if (element.dataset.preview) previews.push(element);
    if (element.dataset.gameTab) tabs.push(element);
    if (!voidTags.has(tag) && !/\/$/.test(attrs)) stack.push(element);
  }
  document.getElementById = id => nodes.get(id);
  document.querySelectorAll = selector => selector === "[data-preview]" ? previews : selector === "[data-game-tab]" ? tabs : [];
  document.createElement = tag => { const element = new Element(tag); element.ownerDocument = document; return element; };
  document.execCommand = command => {
    assert.equal(command, "copy");
    if (options.copyFails) return false;
    clipboardWrites.push(nodes.get("hs-phone").children.at(-1).value);
    return true;
  };
  const window = new Element();
  window.navigator = { onLine: true };
  if (options.clipboardApi) window.navigator.clipboard = { writeText(text) {
    return { then(success, failure) { if (options.clipboardRejects) failure(); else { clipboardWrites.push(text); success(); } } };
  } };
  window.matchMedia = () => ({ matches: options.reducedMotion === true });
  window.getComputedStyle = element => ({ opacity: element.testOpacity ?? "1" });
  if (options.motion) nodes.forEach(element => {
    element.getBoundingClientRect = () => {
      if (element.id === "hs-launcher") {
        const phone = nodes.get("hs-phone");
        const size = parseFloat(phone.style["--hs-launcher-size"]) || 60;
        const inset = parseFloat(phone.style["--hs-launcher-inset"]) || 16;
        const bottom = parseFloat(phone.style["--hs-launcher-bottom"]) || 104;
        return { left: element.style.left ? inset : 428 - inset - size, top: 926 - bottom - size, width: size, height: size };
      }
      const isChat = element.dataset.view === "chat";
      const height = isChat ? 630 : 456;
      return { left: 18, top: 926 - (isChat ? 88 : 144) - height, width: 394, height };
    };
    element.animate = (frames, timing) => {
      const effect = { frames, timing, element, cancel() { this.cancelled = true; }, finish() { if (this.onfinish) this.onfinish(); } };
      effects.push(effect); return effect;
    };
  });
  window.innerHeight = 926;
  window.visualViewport = new Element(); window.visualViewport.height = 926;
  window.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  window.sessionStorage = { getItem(key) { if (options.noStorage) throw Error("Storage disabled"); return storage.get(key); }, setItem(key, value) { if (options.noStorage) throw Error("Storage disabled"); storage.set(key, value); } };
  const context = { window, document, URL };
  vm.runInNewContext(configSource, context);
  if (options.badLinks) window.HOME_SUPPORT_CONFIG.channels = { facebook: "javascript:alert(1)", telegram: "https://t.me.attacker.test/path" };
  if (options.customLauncher) window.HOME_SUPPORT_CONFIG.launcher = { side: "left", size: 72, inset: 20, bottom: 120, label: "Help" };
  vm.runInNewContext(js, context);
  const get = id => { assert(nodes.has(id), "Missing node: " + id); return nodes.get(id); };
  const fire = (element, type, additions = {}) => {
    const event = { target: element, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; }, ...additions };
    (element.handlers[type] || []).forEach(handler => handler(event)); return event;
  };
  const click = element => {
    for (let node = element; node; node = node.parent) if (node.hidden || node.inert || node.disabled) return { blocked: true };
    const event = fire(element, "click");
    for (let node = element.parent; node && !event.propagationStopped; node = node.parent) (node.handlers.click || []).forEach(handler => handler(event));
    if (!event.propagationStopped) (document.handlers.click || []).forEach(handler => handler(event));
    return event;
  };
  const flush = () => { for (const [id, handler] of [...timers]) { timers.delete(id); handler(); } };
  const submit = text => { get("hs-message-input").value = text; fire(get("hs-message-input"), "input"); fire(get("hs-composer"), "submit"); };
  const stored = () => JSON.parse(storage.get("play-home-support-prototype-v1"));
  return { get, click, fire, flush, submit, stored, window, document, storage, previews, tabs, effects, clipboardWrites };
}
const env = createEnvironment();
const { get, click, fire, flush, submit, stored } = env;
assert.equal(get("hs-support-window").hidden, true);
assert.equal(get("hs-support-backdrop").hidden, true);
assert.equal(get("hs-home-surface").inert, false);
assert(get("hs-home-surface").contains(get("hs-footer-support")));
assert(get("hs-phone").contains(get("hs-support-backdrop")));
assert(!get("hs-home-surface").contains(get("hs-support-backdrop")));
click(get("hs-launcher"));
assert.equal(get("hs-support-backdrop").hidden, false);
assert.equal(get("hs-home-surface").inert, true);
assert.equal(get("hs-support-window").attributes["aria-modal"], "true");
assert.equal(get("hs-channel-view").hidden, false);
assert.equal(get("hs-chat-view").hidden, true);
assert.equal(get("hs-facebook-name").textContent, "Official Facebook");
assert.equal(get("hs-telegram-name").textContent, "Official Telegram");
assert.equal(get("hs-telegram-availability").textContent, "Online · 24/7");
assert.equal(get("hs-facebook-availability").textContent, "Online · 24/7");
assert.equal(get("hs-telegram-availability").title, "Online time: 24/7");
assert.equal(get("hs-facebook-name").tagName, "a");
assert.equal(get("hs-facebook-name").href, get("hs-facebook").href);
assert.equal(get("hs-telegram-name").tagName, "a");
assert.equal(get("hs-telegram-name").href, get("hs-telegram").href);
let bubbledClicks = 0;
env.document.addEventListener("click", () => bubbledClicks++);
const facebookClick = click(get("hs-facebook-name"));
assert(!facebookClick.defaultPrevented, "Stopping bubbling must retain external-link navigation");
assert.equal(facebookClick.propagationStopped, true);
assert.equal(bubbledClicks, 0, "Panel clicks do not bubble outside the support window");
assert(!click(get("hs-telegram-name")).defaultPrevented);
click(get("hs-copy-facebook"));
click(get("hs-copy-telegram"));
assert.deepEqual(env.clipboardWrites, ["https://www.facebook.com/777vip", "https://t.me/zzyybb4"]);
assert.equal(get("hs-facebook-link").href, "https://www.facebook.com/777vip");
assert.equal(get("hs-facebook-link").textContent, "https://www.facebook.com/777vip");
assert.equal(get("hs-telegram-link").href, "https://t.me/zzyybb4");
assert.equal(get("hs-telegram-link").textContent, "https://t.me/zzyybb4");
assert.equal(get("hs-support-window").dataset.view, "channels", "Copy stays in the channel panel");
click(get("hs-open-chat"));
assert.equal(get("hs-support-window").dataset.view, "chat");
assert.equal(get("hs-back").hidden, false);
assert.equal(get("hs-minimize").hidden, false);
const chatOutside = click(get("hs-support-backdrop"));
assert.equal(chatOutside.defaultPrevented, true);
assert.equal(chatOutside.propagationStopped, true);
assert.equal(bubbledClicks, 0);
assert.equal(get("hs-support-window").hidden, false, "Outside click must leave a chat open");
assert.equal(get("hs-support-backdrop").hidden, false);
for (const type of ["wheel", "touchmove"]) {
  const event = fire(get("hs-support-backdrop"), type);
  assert.equal(event.defaultPrevented, true, "Backdrop must consume " + type);
  assert.equal(event.propagationStopped, true);
}
assert.equal(get("hs-send").disabled, true);
submit("  "); assert.equal(stored().messages.length, 0);
submit("Help with my deposit <script>alert(1)</script>");
assert.equal(stored().messages.length, 1);
assert.equal(get("hs-messages").children.at(-1).children[0].textContent, "Help with my deposit <script>alert(1)</script>", "Messages must render as text");
get("hs-message-input").value = "Unsent draft"; fire(get("hs-message-input"), "input");
click(get("hs-minimize"));
assert.equal(get("hs-launcher").hidden, false);
assert.equal(get("hs-support-backdrop").hidden, true);
assert.equal(get("hs-home-surface").inert, false);
assert.equal(get("hs-support-window").attributes["aria-modal"], "false");
assert.equal(env.document.activeElement, get("hs-launcher"));
flush();
assert.equal(stored().messages.length, 2, "Reply continues while minimized");
assert.equal(get("hs-unread").hidden, false);
click(get("hs-launcher"));
assert.equal(get("hs-chat-view").hidden, false);
assert.equal(get("hs-message-input").value, "Unsent draft");
assert.equal(get("hs-unread").hidden, true);
click(get("hs-back"));
assert.equal(get("hs-channel-view").hidden, false);
assert.equal(get("hs-support-backdrop").hidden, false);
assert.equal(stored().messages.length, 2);
click(get("hs-open-chat")); click(get("hs-close")); click(get("hs-launcher"));
assert.equal(get("hs-chat-view").hidden, false, "Close hides the window and retains its session");
assert.equal(stored().messages.length, 2);
click(get("hs-back"));
const beforeOutside = JSON.stringify(stored());
const channelOutside = click(get("hs-support-backdrop"));
assert.equal(channelOutside.defaultPrevented, true);
assert.equal(channelOutside.propagationStopped, true);
assert.equal(get("hs-support-window").hidden, true, "Outside click collapses channel chooser");
assert.equal(get("hs-support-backdrop").hidden, true);
assert.equal(get("hs-home-surface").inert, false);
assert.equal(JSON.stringify(stored()), beforeOutside, "Outside collapse retains session and draft");
click(get("hs-launcher")); assert.equal(get("hs-channel-view").hidden, false);
click(get("hs-open-chat"));
click(get("hs-offline-toggle")); submit("Withdrawal question");
assert.equal(stored().messages.at(-1).status, "failed");
assert.equal(get("hs-chat-feedback").hidden, false);
const retry = get("hs-messages").children.at(-1).children.at(-1);
fire(get("hs-messages"), "click", { target: retry });
assert.equal(stored().messages.at(-1).status, "failed");
click(get("hs-offline-toggle"));
fire(get("hs-messages"), "click", { target: retry }); flush();
assert.equal(stored().messages.length, 4);
assert.equal(stored().messages[2].status, "sent");
const reloaded = createEnvironment(env.storage);
reloaded.click(reloaded.get("hs-launcher"));
assert.equal(reloaded.get("hs-chat-view").hidden, false);
assert.equal(reloaded.stored().messages.length, 4);
assert.equal(reloaded.get("hs-message-input").value, "");
const beforeEmpty = reloaded.stored().messages.length;
reloaded.submit("  "); assert.equal(reloaded.stored().messages.length, beforeEmpty);
const quick = new Element("button"); quick.dataset.quickReply = "I need help with my account.";
reloaded.fire(reloaded.get("hs-quick-replies"), "click", { target: quick }); reloaded.flush();
assert.equal(reloaded.stored().messages.length, beforeEmpty + 2);
const noStorage = createEnvironment(new Map(), { noStorage: true, customLauncher: true });
assert.equal(noStorage.get("hs-launcher").style.left, "var(--hs-launcher-inset)");
assert.equal(noStorage.get("hs-launcher-label").textContent, "Help");
noStorage.click(noStorage.get("hs-launcher")); noStorage.click(noStorage.get("hs-open-chat")); noStorage.submit("Account"); noStorage.flush();
noStorage.click(noStorage.get("hs-close")); noStorage.click(noStorage.get("hs-launcher"));
assert.equal(noStorage.get("hs-chat-view").hidden, false, "Storage restrictions must preserve in-page session");
const badLinks = createEnvironment(new Map(), { badLinks: true });
badLinks.click(badLinks.get("hs-launcher"));
assert.equal(badLinks.click(badLinks.get("hs-facebook")).defaultPrevented, true);
assert.equal(badLinks.click(badLinks.get("hs-telegram")).defaultPrevented, true);
assert.equal(badLinks.get("hs-toast").hidden, false);
assert.equal(badLinks.get("hs-copy-facebook").disabled, true);
assert.equal(badLinks.get("hs-copy-telegram").disabled, true);
assert.equal(badLinks.click(badLinks.get("hs-telegram-link")).defaultPrevented, true);
assert.equal(badLinks.click(badLinks.get("hs-facebook-name")).defaultPrevented, true);
assert.equal(badLinks.click(badLinks.get("hs-telegram-name")).defaultPrevented, true);
const clipboardApi = createEnvironment(new Map(), { clipboardApi: true });
clipboardApi.click(clipboardApi.get("hs-launcher"));
clipboardApi.click(clipboardApi.get("hs-copy-telegram"));
assert.deepEqual(clipboardApi.clipboardWrites, ["https://t.me/zzyybb4"]);
const rejectedClipboard = createEnvironment(new Map(), { clipboardApi: true, clipboardRejects: true });
rejectedClipboard.click(rejectedClipboard.get("hs-launcher"));
rejectedClipboard.click(rejectedClipboard.get("hs-copy-telegram"));
assert.deepEqual(rejectedClipboard.clipboardWrites, ["https://t.me/zzyybb4"], "Denied Clipboard API falls back to local-file copy");
const failedCopy = createEnvironment(new Map(), { copyFails: true });
failedCopy.click(failedCopy.get("hs-launcher"));
failedCopy.click(failedCopy.get("hs-copy-telegram"));
assert.match(failedCopy.get("hs-toast").textContent, /Unable to copy/);
const animated = createEnvironment(new Map(), { motion: true });
animated.click(animated.get("hs-launcher"));
const maskOpening = animated.effects.find(effect => effect.element.id === "hs-support-backdrop");
assert.equal(maskOpening.frames[0].opacity, 0);
assert.equal(maskOpening.frames[1].opacity, 1);
assert.equal(maskOpening.timing.duration, 180);
assert.equal(animated.effects.at(-1).timing.duration, 320);
assert.match(animated.effects.at(-1).frames[0].transform, /scale/);
function assertAtLauncher(frame, panel, launcher) {
  const match = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+), ([-\d.]+)\)/.exec(frame.transform);
  assert(match, "Compact frame must translate and scale toward the launcher");
  const [, x, y, sx, sy] = match.map(Number);
  assert(Math.abs(sx - sy) < 1e-8, "Whole panel must keep its proportions");
  assert(sx > 0 && sx < .2, "Whole panel must shrink to button size");
  assert(Math.abs(panel.left + panel.width / 2 + x - launcher.left - launcher.width / 2) < .01, "Horizontal center must reach the button");
  assert(Math.abs(panel.top + panel.height / 2 + y - launcher.top - launcher.height / 2) < .01, "Vertical center must reach the button");
}
assertAtLauncher(animated.effects.at(-1).frames[0], animated.get("hs-support-window").getBoundingClientRect(), animated.get("hs-launcher").getBoundingClientRect());
assert.equal(animated.get("hs-support-window").style.transformOrigin, "50% 50%");
animated.click(animated.get("hs-open-chat"));
assert.equal(animated.effects.filter(effect => effect.element.id === "hs-support-backdrop").length, 1, "Switching views must retain the backdrop without a new fade");
assert.equal(animated.effects.at(-1).timing.duration, 200);
const expansion = animated.effects.find(effect => effect.timing.duration === 260);
assert.equal(expansion.frames[0].height, "456px");
assert.equal(expansion.frames[0].transform, "translateY(-56px)", "Expansion starts at the previous bottom edge");
assert.equal(expansion.frames[1].height, "630px");
assert.equal(expansion.frames[1].transform, "translateY(0px)", "Chat expands downward as well as upward");
animated.submit("Deposit help");
animated.click(animated.get("hs-close"));
assert.equal(animated.get("hs-support-window").hidden, false, "Closing animation keeps the outgoing view visible");
assert.equal(animated.get("hs-chat-view").hidden, false);
assert.equal(animated.get("hs-support-window").inert, true);
assert.equal(animated.get("hs-support-backdrop").hidden, false, "Closing animation must retain the click blocker");
assert.equal(animated.get("hs-home-surface").inert, true);
const maskClosing = animated.effects.filter(effect => effect.element.id === "hs-support-backdrop").at(-1);
assert.equal(maskClosing.frames[1].opacity, 0);
assert.equal(maskClosing.timing.duration + maskClosing.timing.delay, 280, "Backdrop and window finish closing together");
const firstClose = animated.effects.find(effect => effect.timing.duration === 280);
assertAtLauncher(firstClose.frames.at(-1), animated.get("hs-support-window").getBoundingClientRect(), animated.get("hs-launcher").getBoundingClientRect());
const staleFinish = firstClose.onfinish;
animated.get("hs-support-backdrop").testOpacity = ".35";
animated.click(animated.get("hs-launcher"));
staleFinish();
assert.equal(animated.get("hs-support-window").hidden, false, "Reopening cancels a pending close");
assert.equal(animated.get("hs-support-window").inert, false);
assert.equal(animated.get("hs-support-backdrop").hidden, false, "A stale close must not hide a reopened backdrop");
assert.equal(animated.get("hs-home-surface").inert, true);
assert.equal(maskClosing.cancelled, true);
assert.equal(animated.effects.filter(effect => effect.element.id === "hs-support-backdrop").at(-1).frames[0].opacity, .35, "Interrupted fade resumes from the displayed opacity");
animated.click(animated.get("hs-close"));
animated.effects.filter(effect => effect.timing.duration === 280).at(-1).finish();
assert.equal(animated.get("hs-support-window").hidden, true);
assert.equal(animated.get("hs-support-backdrop").hidden, true);
assert.equal(animated.get("hs-home-surface").inert, false);
animated.click(animated.get("hs-launcher"));
assert.equal(animated.get("hs-chat-view").hidden, false);
assert.equal(animated.stored().messages.length, 1, "Motion never destroys the session");
const leftMotion = createEnvironment(new Map(), { motion: true, customLauncher: true });
leftMotion.click(leftMotion.get("hs-launcher"));
assertAtLauncher(leftMotion.effects.at(-1).frames[0], leftMotion.get("hs-support-window").getBoundingClientRect(), leftMotion.get("hs-launcher").getBoundingClientRect());
leftMotion.click(leftMotion.get("hs-close"));
assertAtLauncher(leftMotion.effects.find(effect => effect.timing.duration === 280).frames.at(-1), leftMotion.get("hs-support-window").getBoundingClientRect(), leftMotion.get("hs-launcher").getBoundingClientRect());
const reduced = createEnvironment(new Map(), { motion: true, reducedMotion: true });
reduced.click(reduced.get("hs-launcher")); reduced.click(reduced.get("hs-close"));
assert.equal(reduced.effects.length, 0);
assert.equal(reduced.get("hs-support-window").hidden, true);
assert.equal(reduced.get("hs-support-backdrop").hidden, true);
assert.equal(reduced.get("hs-home-surface").inert, false);
assert.equal(click(env.tabs.find(button => button.dataset.gameTab === "Sports")).blocked, true, "An open chat makes home controls inert");
assert.equal(get("hs-game-empty").hidden, true);
assert.equal(get("hs-support-window").hidden, false);
click(get("hs-close"));
click(env.tabs.find(button => button.dataset.gameTab === "Sports"));
assert.equal(get("hs-game-empty").hidden, false);
assert.equal(get("hs-support-window").hidden, true, "Home controls work again after support closes");
console.log("PASS: Axure page/menu, retained chat, contact copy, 40% backdrop layering, outside clicks, blocked home controls, coordinated fades, interrupted transitions and reduced motion.");
