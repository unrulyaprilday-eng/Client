(function () {
  var MAIN_DOMAIN_FALLBACK = "https://www.example.com";
  var DEFAULT_DURATION_SECONDS = 12 * 60 * 60 + 45 * 60 + 13;

  function query(name) {
    var match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  function getMainDomain() {
    return query("main") || query("domain") || MAIN_DOMAIN_FALLBACK;
  }

  function formatTime(seconds) {
    var safe = Math.max(0, seconds);
    var hours = Math.floor(safe / 3600);
    var minutes = Math.floor((safe % 3600) / 60);
    var secs = safe % 60;
    return [hours, minutes, secs].map(function (value) {
      return value < 10 ? "0" + value : String(value);
    }).join(":");
  }

  function supportUrl() {
    return query("support") || "客服弹窗.html";
  }

  function buildMaintenance(root) {
    root.className += " maintenance-active";
    root.innerHTML =
      '<main class="maintenance-shell" aria-labelledby="maintenance-title">' +
        '<div class="maintenance-logo">LOGO</div>' +
        '<div class="maintenance-visual" aria-hidden="true"></div>' +
        '<section class="maintenance-status">' +
          '<p class="maintenance-kicker" id="maintenance-title">Site upgrading, launching in:</p>' +
          '<div class="maintenance-countdown-row">' +
            '<div class="maintenance-countdown" data-maintenance-countdown>00:00:00</div>' +
            '<span class="maintenance-tag">维护结束倒计时</span>' +
          '</div>' +
          '<p class="maintenance-message">We sincerely apologize as we are currently upgrading our system. Please wait for the service to resume.</p>' +
        '</section>' +
        '<section class="maintenance-info">Maintenance notice: payment, games and account services are temporarily unavailable. Your balance and records remain protected.</section>' +
        '<div class="maintenance-actions">' +
          '<a class="maintenance-btn" data-maintenance-support href="' + supportUrl() + '">Live Support</a>' +
        '</div>' +
      '</main>';
  }

  function buildNotice(root) {
    root.className += " maintenance-active maintenance-notice";
    root.innerHTML =
      '<main class="maintenance-shell" aria-labelledby="maintenance-title">' +
        '<div class="maintenance-logo">LOGO</div>' +
        '<div class="maintenance-visual" aria-hidden="true"></div>' +
        '<section class="maintenance-status">' +
          '<p class="maintenance-kicker" id="maintenance-title">Site maintenance in progress</p>' +
          '<div class="maintenance-countdown-row">' +
            '<div class="maintenance-countdown maintenance-notice-title">Service temporarily unavailable</div>' +
            '<span class="maintenance-tag">系统维护中</span>' +
          '</div>' +
          '<p class="maintenance-message">We are improving the gaming experience. Please check back later or contact live support for assistance.</p>' +
        '</section>' +
        '<section class="maintenance-info">Maintenance notice: login, wallet and game services may be unavailable during this period. Your account balance and records remain protected.</section>' +
        '<div class="maintenance-actions">' +
          '<a class="maintenance-btn" data-maintenance-support href="' + supportUrl() + '">Live Support</a>' +
        '</div>' +
      '</main>';
  }

  function buildFinished(root) {
    var mainDomain = getMainDomain();
    root.className += " maintenance-active maintenance-finished";
    root.innerHTML =
      '<main class="maintenance-shell" aria-labelledby="maintenance-title">' +
        '<div class="maintenance-logo">LOGO</div>' +
        '<div class="maintenance-visual" aria-hidden="true"></div>' +
        '<section class="maintenance-status">' +
          '<p class="maintenance-kicker" id="maintenance-title">Maintenance completed</p>' +
          '<div class="maintenance-countdown-row">' +
            '<div class="maintenance-countdown">Service is back online</div>' +
            '<span class="maintenance-tag">维护已结束</span>' +
          '</div>' +
          '<p class="maintenance-message">The upgrade has been completed. Please return to the main domain to continue using your account.</p>' +
        '</section>' +
        '<section class="maintenance-info">If the page does not open automatically, tap the button below to visit the main domain.</section>' +
        '<div class="maintenance-actions">' +
          '<a class="maintenance-btn" data-maintenance-home href="' + mainDomain + '">Play Now</a>' +
          '<a class="maintenance-btn secondary" href="' + supportUrl() + '">Live Support</a>' +
        '</div>' +
      '</main>';
  }

  function startCountdown(root) {
    var node = root.querySelector("[data-maintenance-countdown]");
    var target = query("end");
    var remaining = parseInt(query("seconds"), 10);

    if (target) {
      remaining = Math.ceil((new Date(target).getTime() - Date.now()) / 1000);
    }
    if (!Number.isFinite(remaining)) {
      remaining = DEFAULT_DURATION_SECONDS;
    }

    function tick() {
      node.textContent = formatTime(remaining);
      if (remaining <= 0) {
        window.location.href = "维护结束.html?main=" + encodeURIComponent(getMainDomain());
        return;
      }
      remaining -= 1;
      window.setTimeout(tick, 1000);
    }

    tick();
  }

  function ensureActions(root, isFinished) {
    var existing = root.querySelector(".maintenance-actions");
    if (existing) {
      return;
    }

    var actions = document.createElement("div");
    actions.className = "maintenance-actions";
    if (isFinished) {
      actions.innerHTML =
        '<a class="maintenance-btn" data-maintenance-home href="' + getMainDomain() + '">Play Now</a>' +
        '<a class="maintenance-btn secondary" href="' + supportUrl() + '">Live Support</a>';
    } else {
      actions.innerHTML = '<a class="maintenance-btn" data-maintenance-support href="' + supportUrl() + '">Live Support</a>';
    }
    root.appendChild(actions);
  }

  function init() {
    var root = document.getElementById("base");
    if (!root) {
      return;
    }

    var isFinished = document.body.getAttribute("data-maintenance-state") === "finished";
    var isNotice = document.body.getAttribute("data-maintenance-state") === "notice";
    if (isFinished) {
      buildFinished(root);
      ensureActions(root, true);
      var homeButton = document.querySelector("[data-maintenance-home]");
      if (homeButton) {
        homeButton.setAttribute("href", getMainDomain());
      }
      return;
    }

    if (isNotice) {
      buildNotice(root);
      ensureActions(root, false);
      var noticeSupportButton = document.querySelector("[data-maintenance-support]");
      if (noticeSupportButton) {
        noticeSupportButton.setAttribute("href", supportUrl());
      }
      return;
    }

    buildMaintenance(root);
    ensureActions(root, false);
    var supportButton = document.querySelector("[data-maintenance-support]");
    if (supportButton) {
      supportButton.setAttribute("href", supportUrl());
    }
    startCountdown(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
