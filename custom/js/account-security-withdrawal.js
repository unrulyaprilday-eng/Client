(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function showToast(root, message) {
    var toast = root.querySelector(".security-toast");
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

  ready(function () {
    var root = document.querySelector(".security-prototype");
    if (!root) {
      return;
    }

    root.querySelectorAll(".send-code").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.disabled) {
          return;
        }

        var remaining = 60;
        button.disabled = true;
        button.textContent = remaining + "s";
        showToast(root, "验证码已发送");

        var timer = window.setInterval(function () {
          remaining -= 1;
          if (remaining <= 0) {
            window.clearInterval(timer);
            button.disabled = false;
            button.textContent = "重新发送";
            return;
          }
          button.textContent = remaining + "s";
        }, 1000);
      });
    });

    root.querySelectorAll(".security-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var message = form.getAttribute("data-complete-message") || "设置已保存";
        showToast(root, message);
      });
    });

    root.querySelectorAll(".icon-back").forEach(function (button) {
      button.addEventListener("click", function () {
        showToast(root, "已关闭");
      });
    });
  });
})();
