(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function showToast(phone, message) {
    var toast = phone ? phone.querySelector(".phone-toast") : null;
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toast.hideTimer);
    toast.hideTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function setLeftState(root, state) {
    var firstPhone = root.querySelector('[data-phone="first"]');
    var title = root.querySelector("#leftStateTitle");
    var rule = root.querySelector("#leftStateRule");
    if (!firstPhone) {
      return;
    }

    var isFirstVisit = state === "first";
    firstPhone.querySelectorAll("[data-first-only]").forEach(function (element) {
      element.hidden = !isFirstVisit;
    });
    firstPhone.querySelectorAll("[data-web-only]").forEach(function (element) {
      element.hidden = isFirstVisit;
    });
    firstPhone.setAttribute("aria-label", isFirstVisit ? "首次访问状态" : "Web 登录状态");

    root.querySelectorAll("[data-left-state]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-left-state") === state);
    });

    if (title) {
      title.textContent = isFirstVisit ? "首次访问" : "Web 登录";
    }
    if (rule) {
      rule.textContent = isFirstVisit
        ? "未安装客户端：APK 主推荐，PWA 作为次级入口。"
        : "可直接游玩；使用首页轻提示持续推荐 APK，不阻断登录。";
    }
  }

  ready(function () {
    var root = document.querySelector(".install-prototype-canvas");
    if (!root) {
      return;
    }

    root.querySelectorAll("[data-left-state]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLeftState(root, button.getAttribute("data-left-state") || "first");
      });
    });

    root.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var phone = button.closest(".phone-preview");
        var action = button.getAttribute("data-action");

        if (action === "download-apk") {
          showToast(phone, "APK download started");
          return;
        }

        if (action === "install-pwa") {
          showToast(phone, "PWA install prompt opened");
          return;
        }

        if (action === "open-app") {
          showToast(phone, "Opening the official App...");
          return;
        }

        if (action === "dismiss-upgrade") {
          var banner = button.closest(".upgrade-banner");
          if (banner) {
            banner.hidden = true;
          }
          showToast(phone, "Upgrade reminder dismissed");
          return;
        }

        if (action === "continue-web") {
          if (phone && phone.getAttribute("data-phone") === "first") {
            setLeftState(root, "web");
          } else if (phone) {
            var sheet = button.closest(".install-sheet");
            var scrim = phone.querySelector(".install-scrim");
            if (sheet) {
              sheet.hidden = true;
            }
            if (scrim) {
              scrim.hidden = true;
            }
          }
          showToast(phone, "Continuing on Web");
        }
      });
    });
  });
})();
