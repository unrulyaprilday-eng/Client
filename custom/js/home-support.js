(function () {
  "use strict";

  function ready() {
    var byId = function (id) { return document.getElementById(id); };
    var phone = byId("hs-phone");
    var shell = byId("hs-support-window");
    var launcher = byId("hs-launcher");
    var channelView = byId("hs-channel-view");
    var chatView = byId("hs-chat-view");
    var messages = byId("hs-messages");
    var composer = byId("hs-composer");
    var input = byId("hs-message-input");
    var sendButton = byId("hs-send");
    if (!phone || !shell || !launcher || !channelView || !chatView || !messages || !composer || !input || !sendButton) return;

    var config = window.HOME_SUPPORT_CONFIG || {};
    var launcherConfig = config.launcher || {};
    var storageKey = "play-home-support-prototype-v1";
    var view = "collapsed";
    var offlineDemo = false;
    var toastTimer;
    var replyTimers = {};
    var session = readSession();
    var previews = document.querySelectorAll("[data-preview]");
    var motionEffects = [];
    var motionVersion = 0;

    function readSession() {
      var fallback = { messages: [], draft: "", resumeChat: false, unread: false, chatStarted: false };
      try {
        var value = JSON.parse(window.sessionStorage.getItem(storageKey));
        if (!value || !Array.isArray(value.messages)) return fallback;
        fallback.messages = value.messages.filter(function (item) {
          return item && (item.role === "user" || item.role === "agent") && typeof item.text === "string" && typeof item.id === "string";
        }).map(function (item) {
          return { id: item.id, role: item.role, text: item.text.slice(0, 2000), time: typeof item.time === "number" ? item.time : Date.now(), status: item.status === "failed" ? "failed" : "sent", replied: item.replied === true };
        });
        fallback.draft = typeof value.draft === "string" ? value.draft.slice(0, 2000) : "";
        fallback.resumeChat = value.resumeChat === true;
        fallback.unread = value.unread === true;
        fallback.chatStarted = value.chatStarted === true || fallback.messages.length > 0;
      } catch (error) {
        // Storage may be unavailable for a local file. The mounted chat still persists in memory.
      }
      return fallback;
    }

    function persist() {
      session.draft = input.value;
      try { window.sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch (error) { /* In-memory fallback. */ }
    }

    function showToast(text) {
      var toast = byId("hs-toast");
      if (!toast) return;
      window.clearTimeout(toastTimer);
      toast.textContent = text;
      toast.hidden = false;
      toastTimer = window.setTimeout(function () { toast.hidden = true; }, 3000);
    }

    function clamp(value, min, max, fallback) {
      var number = Number(value);
      return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
    }

    function applyLauncherConfig() {
      var size = clamp(launcherConfig.size, 48, 80, 60);
      var inset = clamp(launcherConfig.inset, 8, 80, 16);
      var bottom = clamp(launcherConfig.bottom, 88, 500, 104);
      phone.style.setProperty("--hs-launcher-size", size + "px");
      phone.style.setProperty("--hs-launcher-inset", inset + "px");
      phone.style.setProperty("--hs-launcher-bottom", bottom + "px");
      if (launcherConfig.side === "left") {
        launcher.style.left = "var(--hs-launcher-inset)";
        launcher.style.right = "auto";
      }
      var label = byId("hs-launcher-label");
      if (label && typeof launcherConfig.label === "string") label.textContent = launcherConfig.label;
      var imagePath = launcherConfig.image;
      if (typeof imagePath === "string" && /^custom\/assets\/(?!.*(?:\.\.|[\\?#:]))[^<>]+\.(?:png|jpe?g|webp|gif|svg)$/i.test(imagePath)) {
        var image = document.createElement("img");
        image.alt = "";
        image.addEventListener("load", function () {
          launcher.insertBefore(image, launcher.firstChild);
          launcher.classList.add("hs-has-image");
          var icon = launcher.querySelector("svg");
          if (icon) icon.style.display = "none";
          if (label) label.hidden = true;
        }, { once: true });
        image.src = imagePath;
      }
      launcher.hidden = launcherConfig.enabled === false;
    }

    function safeChannelUrl(value, host) {
      try {
        var url = new URL(value);
        var validHost = url.hostname === host || url.hostname.endsWith("." + host);
        return url.protocol === "https:" && validHost && !url.username && !url.password ? url.href : null;
      } catch (error) { return null; }
    }

    function applyChannelConfig() {
      [ ["facebook", "facebook.com"], ["telegram", "t.me"] ].forEach(function (entry) {
        var key = entry[0];
        var anchor = byId("hs-" + key);
        var link = byId("hs-" + key + "-link");
        var copy = byId("hs-copy-" + key);
        var name = byId("hs-" + key + "-name");
        var availability = byId("hs-" + key + "-availability");
        var details = config.channelDetails && config.channelDetails[key];
        var raw = config.channels && config.channels[key];
        var url = safeChannelUrl(raw, entry[1]);
        if (name && details && typeof details.name === "string") { name.textContent = details.name; name.title = details.name; }
        if (availability && details && typeof details.availability === "string") {
          availability.textContent = details.availability;
          availability.title = "Online time: " + details.availability;
          availability.setAttribute("aria-label", availability.title);
        }
        [anchor, link].forEach(function (element) {
          if (!element) return;
          if (url) element.href = url;
          element.setAttribute("aria-disabled", String(!url));
          element.addEventListener("click", function (event) {
            if (!url) {
              event.preventDefault();
              showToast("This support channel is unavailable. Please use Online Support.");
            }
          });
        });
        if (link) { link.textContent = url || "Temporarily unavailable"; link.title = url || ""; }
        if (copy) {
          copy.disabled = !url;
          copy.addEventListener("click", function () { if (url) copySupportLink(url); });
        }
      });
    }

    function copySupportLink(url) {
      function copied() { showToast("Support link copied."); }
      function fallback() {
        var field = document.createElement("textarea");
        var previousFocus = document.activeElement;
        field.value = url;
        field.readOnly = true;
        field.className = "hs-sr-only";
        field.setAttribute("aria-label", "Support link");
        phone.appendChild(field);
        var success = false;
        try {
          field.focus({ preventScroll: true });
          field.select();
          field.setSelectionRange(0, url.length);
          success = document.execCommand("copy");
        } catch (error) { /* A local-file preview may restrict clipboard access. */ }
        field.remove();
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus({ preventScroll: true });
        if (success) copied();
        else showToast("Unable to copy. Press and hold the support link to copy it.");
      }
      try {
        if (window.navigator.clipboard && typeof window.navigator.clipboard.writeText === "function") {
          window.navigator.clipboard.writeText(url).then(copied, fallback);
        } else fallback();
      } catch (error) { fallback(); }
    }

    function cancelMotion() {
      motionVersion++;
      motionEffects.forEach(function (effect) { effect.onfinish = null; effect.cancel(); });
      motionEffects = [];
      shell.dataset.motion = "";
    }

    function animate(element, frames, options) {
      if (typeof element.animate !== "function" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return null;
      var effect = element.animate(frames, options);
      motionEffects.push(effect);
      return effect;
    }

    function measureLauncher() {
      if (typeof launcher.getBoundingClientRect !== "function") return null;
      // The launcher is normally hidden while chatting; measure its real destination.
      var wasHidden = launcher.hidden;
      var visibility = launcher.style.visibility;
      launcher.style.visibility = "hidden";
      launcher.hidden = false;
      var rect = launcher.getBoundingClientRect();
      launcher.hidden = wasHidden;
      launcher.style.visibility = visibility;
      return rect;
    }

    function frameAtRect(panelRect, targetRect, opacity, radius) {
      var scaleX = targetRect.width / panelRect.width;
      var scaleY = targetRect.height / panelRect.height;
      return {
        transform: "translate(" + (targetRect.left - panelRect.left) + "px, " + (targetRect.top - panelRect.top) + "px) scale(" + scaleX + ", " + scaleY + ")",
        opacity: opacity,
        borderRadius: radius
      };
    }

    function compactFrame(panelRect, launcherRect) {
      if (!panelRect || !launcherRect || !panelRect.width || !panelRect.height) return { transform: "scale(.08)", opacity: 0, borderRadius: "160px" };
      // Keep the whole window proportional, shrinking to a thumbnail centered on the button.
      var scale = Math.min(launcherRect.width / panelRect.width, launcherRect.height / panelRect.height, 1);
      var width = panelRect.width * scale;
      var height = panelRect.height * scale;
      return frameAtRect(panelRect, {
        left: launcherRect.left + (launcherRect.width - width) / 2,
        top: launcherRect.top + (launcherRect.height - height) / 2,
        width: width,
        height: height
      }, 0, (Math.max(launcherRect.width, launcherRect.height) / 2 / scale) + "px");
    }

    function animateView(previous, next, oldRect, launcherRect) {
      var currentVersion = motionVersion;
      var newRect = typeof shell.getBoundingClientRect === "function" ? shell.getBoundingClientRect() : null;
      var fullFrame = { opacity: 1, transform: "translate(0px, 0px) scale(1)", borderRadius: "16px" };
      shell.style.transformOrigin = newRect && launcherRect ? "0 0" : launcherConfig.side === "left" ? "0% 100%" : "100% 100%";
      if (next === "collapsed") {
        var startFrame = oldRect && newRect && newRect.width && newRect.height ? frameAtRect(newRect, oldRect, 1, "16px") : fullFrame;
        var endFrame = compactFrame(newRect, launcherRect);
        var closing = animate(shell, [
          Object.assign({ offset: 0 }, startFrame),
          { opacity: 1, offset: .7 },
          Object.assign({ offset: 1 }, endFrame)
        ], { duration: 280, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
        if (!closing) { shell.hidden = true; return; }
        shell.dataset.motion = "closing";
        closing.onfinish = function () {
          if (currentVersion !== motionVersion) return;
          shell.hidden = true;
          shell.dataset.motion = "";
          closing.cancel();
        };
        if (!launcher.hidden) animate(launcher, [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "scale(1)" }], { duration: 90, delay: 210, fill: "backwards", easing: "ease-out" });
        return;
      }
      if (previous === "collapsed") {
        var openingFrame = oldRect && newRect && newRect.width && newRect.height ? frameAtRect(newRect, oldRect, 1, "16px") : compactFrame(newRect, launcherRect);
        animate(shell, [Object.assign({ offset: 0 }, openingFrame), { opacity: 1, offset: .18 }, Object.assign({ offset: 1 }, fullFrame)], { duration: 320, easing: "cubic-bezier(.2,.75,.25,1)" });
      } else {
        if (oldRect && newRect && Math.abs(oldRect.height - newRect.height) > 1) animate(shell, [{ height: oldRect.height + "px" }, { height: newRect.height + "px" }], { duration: 220, easing: "cubic-bezier(.2,.75,.25,1)" });
        animate(next === "chat" ? chatView : channelView, [{ opacity: .25, transform: "translateY(5px) scale(.985)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 200, easing: "ease-out" });
      }
    }

    function scrollChat() { messages.scrollTop = messages.scrollHeight; }

    function setView(next, moveFocus) {
      var previous = view;
      var oldRect = !shell.hidden && typeof shell.getBoundingClientRect === "function" ? shell.getBoundingClientRect() : null;
      cancelMotion();
      var launcherRect = measureLauncher();
      view = next;
      var isChat = next === "chat";
      var isOpen = next !== "collapsed";
      // Keep the outgoing view mounted until the shrink animation finishes.
      shell.hidden = !isOpen && previous === "collapsed";
      shell.inert = !isOpen;
      launcher.hidden = isOpen || launcherConfig.enabled === false;
      launcher.setAttribute("aria-expanded", String(isOpen));
      if (isOpen || previous === "collapsed") {
        channelView.hidden = !isOpen || isChat;
        chatView.hidden = !isChat;
        shell.dataset.view = isChat ? "chat" : "channels";
        byId("hs-back").hidden = !isChat;
        byId("hs-minimize").hidden = !isChat;
        byId("hs-window-title").textContent = isChat ? "Online Support" : "How can we help?";
        byId("hs-window-subtitle").textContent = isChat ? "24/7 Customer Service" : "";
        byId("hs-window-subtitle").hidden = !isChat;
      }
      if (isOpen) session.resumeChat = isChat;
      if (isChat) {
        session.chatStarted = true;
        session.unread = false;
        scrollChat();
      }
      byId("hs-unread").hidden = !session.unread;
      var stateLabel = byId("hs-preview-state");
      if (stateLabel) stateLabel.textContent = isChat ? "在线聊天 · 会话保留" : isOpen ? "客服渠道选择" : "首页 · 客服入口";
      previews.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.preview === next)); });
      persist();
      if (previous !== next) animateView(previous, next, oldRect, launcherRect);
      if (moveFocus !== false) {
        if (isOpen) shell.focus({ preventScroll: true });
        else if (!launcher.hidden) launcher.focus({ preventScroll: true });
      }
    }

    function openSupport() { setView(session.resumeChat ? "chat" : "channels"); }

    function formatTime(value) {
      return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }

    function renderMessage(item) {
      var article = document.createElement("article");
      article.className = "hs-message hs-message-" + item.role;
      article.dataset.messageId = item.id;
      if (item.role === "agent") {
        var name = document.createElement("span");
        name.textContent = "Customer Care";
        article.appendChild(name);
      }
      var text = document.createElement("p");
      text.textContent = item.text;
      article.appendChild(text);
      var time = document.createElement("time");
      time.dateTime = new Date(item.time).toISOString();
      time.textContent = formatTime(item.time);
      article.appendChild(time);
      if (item.role === "user") {
        var status = document.createElement("span");
        status.className = "hs-message-status";
        status.textContent = item.status === "failed" ? "Not sent" : "Sent";
        article.appendChild(status);
        if (item.status === "failed") {
          var retry = document.createElement("button");
          retry.type = "button";
          retry.className = "hs-retry";
          retry.dataset.retry = item.id;
          retry.textContent = "Retry";
          retry.setAttribute("aria-label", "Retry sending message");
          article.appendChild(retry);
        }
      }
      return article;
    }

    function appendMessage(item) {
      session.messages.push(item);
      messages.appendChild(renderMessage(item));
      if (item.role === "agent" && view !== "chat") {
        session.unread = true;
        byId("hs-unread").hidden = false;
      }
      if (view === "chat") scrollChat();
      persist();
    }

    function answerFor(text) {
      if (/withdraw/i.test(text)) return "I can help with your withdrawal. Please share the withdrawal reference and the time you submitted it. Never share your password or verification code.";
      if (/deposit/i.test(text)) return "I can help with your deposit. Please share the payment method, amount and transaction reference so we can check it for you.";
      if (/account|login|password/i.test(text)) return "Let's check your account together. Are you having trouble signing in, or updating your account details? Please do not send your password or verification code.";
      return "Thanks for reaching out. Could you tell us a little more about the issue so we can help you?";
    }

    function scheduleReply(item) {
      if (item.status === "failed" || item.replied || replyTimers[item.id]) return;
      byId("hs-agent-status").textContent = "Customer Care is typing…";
      var delay = clamp(config.prototype && config.prototype.responseDelay, 300, 5000, 900);
      replyTimers[item.id] = window.setTimeout(function () {
        delete replyTimers[item.id];
        item.replied = true;
        appendMessage({ id: item.id + "-reply", role: "agent", text: answerFor(item.text), time: Date.now(), status: "sent", replied: true });
        byId("hs-agent-status").textContent = Object.keys(replyTimers).length ? "Customer Care is typing…" : "Online · Here to help, 24/7";
      }, delay);
    }

    function isOffline() { return offlineDemo || window.navigator.onLine === false; }

    function sendMessage(text) {
      text = String(text).trim().slice(0, 2000);
      if (!text) return;
      var failed = isOffline();
      var item = { id: "m-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8), role: "user", text: text, time: Date.now(), status: failed ? "failed" : "sent", replied: false };
      input.value = "";
      sendButton.disabled = true;
      byId("hs-quick-replies").hidden = true;
      setFeedback(failed);
      appendMessage(item);
      scheduleReply(item);
    }

    function setFeedback(failed) {
      var feedback = byId("hs-chat-feedback");
      feedback.hidden = !failed;
      feedback.textContent = failed ? "Message not sent. Check your connection, then tap Retry." : "";
    }

    function updateViewport() {
      var viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (viewportHeight > 0) phone.style.setProperty("--hs-viewport-height", viewportHeight + "px");
      var maxBottom = Math.max(88, phone.clientHeight - clamp(launcherConfig.size, 48, 80, 60) - 16);
      phone.style.setProperty("--hs-launcher-bottom", clamp(launcherConfig.bottom, 88, Math.min(500, maxBottom), 104) + "px");
      if (view === "chat") scrollChat();
    }

    launcher.addEventListener("click", openSupport);
    byId("hs-footer-support").addEventListener("click", openSupport);
    byId("hs-open-chat").addEventListener("click", function () { setView("chat"); });
    byId("hs-back").addEventListener("click", function () { setView("channels"); });
    byId("hs-minimize").addEventListener("click", function () { setView("collapsed"); });
    byId("hs-close").addEventListener("click", function () { setView("collapsed"); });
    // No overlay is created: outside clicks still reach the home controls.
    document.addEventListener("click", function (event) {
      if (view === "channels" && !shell.contains(event.target) && !launcher.contains(event.target) && !event.target.closest("[data-preview], #hs-footer-support")) setView("collapsed", false);
    });
    shell.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.preventDefault(); setView("collapsed"); }
    });
    composer.addEventListener("submit", function (event) { event.preventDefault(); sendMessage(input.value); });
    input.addEventListener("input", function () { sendButton.disabled = !input.value.trim(); persist(); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage(input.value); }
    });
    byId("hs-quick-replies").addEventListener("click", function (event) {
      var button = event.target.closest("[data-quick-reply]");
      if (button) sendMessage(button.dataset.quickReply);
    });
    messages.addEventListener("click", function (event) {
      var button = event.target.closest("[data-retry]");
      if (!button) return;
      var item = session.messages.find(function (message) { return message.id === button.dataset.retry; });
      if (!item || item.status !== "failed") return;
      if (isOffline()) { setFeedback(true); return; }
      item.status = "sent";
      var article = button.closest("[data-message-id]");
      if (article) article.replaceWith(renderMessage(item));
      setFeedback(session.messages.some(function (message) { return message.status === "failed"; }));
      persist();
      scheduleReply(item);
    });
    previews.forEach(function (button) { button.addEventListener("click", function () { setView(button.dataset.preview); }); });
    var offlineToggle = byId("hs-offline-toggle");
    if (offlineToggle) offlineToggle.addEventListener("click", function () {
      offlineDemo = !offlineDemo;
      offlineToggle.setAttribute("aria-pressed", String(offlineDemo));
      offlineToggle.textContent = offlineDemo ? "恢复正常发送" : "演示发送失败";
    });

    var gameGrid = byId("hs-game-grid");
    var games = {
      Popular: [["777", "Golden Fortune", "SLOTS", "gold"], ["♠ A", "Royal Blackjack", "LIVE CASINO", "green"], ["◆", "Gem Rush", "SLOTS", "purple"], ["♥ K", "Lucky Baccarat", "LIVE CASINO", "red"]],
      Slots: [["777", "Golden Fortune", "SLOTS", "gold"], ["◆", "Gem Rush", "SLOTS", "purple"]],
      Live: [["♠ A", "Royal Blackjack", "LIVE CASINO", "green"], ["♥ K", "Lucky Baccarat", "LIVE CASINO", "red"]],
      Sports: []
    };
    document.querySelectorAll("[data-game-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        document.querySelectorAll("[data-game-tab]").forEach(function (tab) { tab.classList.toggle("is-active", tab === button); tab.setAttribute("aria-pressed", String(tab === button)); });
        var category = button.dataset.gameTab;
        byId("hs-games-title").textContent = category + " Games";
        gameGrid.replaceChildren();
        games[category].forEach(function (game) {
          var tile = document.createElement("a");
          tile.href = "优惠.html";
          tile.className = "hs-game hs-game-" + game[3];
          [ ["span", "hs-game-art", game[0]], ["strong", "", game[1]], ["small", "", game[2]] ].forEach(function (part) {
            var element = document.createElement(part[0]); element.className = part[1]; element.textContent = part[2]; tile.appendChild(element);
          });
          gameGrid.appendChild(tile);
        });
        byId("hs-game-empty").hidden = games[category].length > 0;
      });
    });

    applyLauncherConfig();
    applyChannelConfig();
    input.value = session.draft;
    sendButton.disabled = !input.value.trim();
    session.messages.forEach(function (item) { messages.appendChild(renderMessage(item)); });
    byId("hs-quick-replies").hidden = session.messages.some(function (item) { return item.role === "user"; });
    setFeedback(session.messages.some(function (item) { return item.status === "failed"; }));
    setView("collapsed", false);
    session.messages.forEach(function (item) { if (item.role === "user") scheduleReply(item); });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", updateViewport);
    window.addEventListener("pagehide", persist);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
