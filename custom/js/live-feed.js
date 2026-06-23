(function () {
  var intervalIds = {
    single: null,
    multi: null
  };

  var feedItems = [
    { icon: "🔥", text: "J***3 won ₹12,560 in Gates of Olympus" },
    { icon: "🎉", text: "R***8 claimed ₹500 activity reward" },
    { icon: "🏆", text: "M***2 reached VIP8" },
    { icon: "💎", text: "A***7 unlocked ₹1,888 weekly rebate" },
    { icon: "🎁", text: "K***9 claimed ₹300 mission reward" },
    { icon: "⚡", text: "T***4 won ₹8,260 in Sweet Bonanza" },
    { icon: "🍀", text: "L***6 received ₹188 lucky bonus" },
    { icon: "👑", text: "S***1 completed VIP upgrade to VIP9" },
    { icon: "🎯", text: "P***8 finished the daily quest and got ₹88" },
    { icon: "🚀", text: "H***5 won ₹15,200 in Aviator" },
    { icon: "💰", text: "D***2 withdrew ₹6,600 successfully" },
    { icon: "🎊", text: "V***4 got ₹1,200 cashback from weekend event" },
    { icon: "🌟", text: "N***7 opened a mystery chest and won ₹260" },
    { icon: "🪙", text: "Q***1 earned ₹999 from referral reward" },
    { icon: "🏅", text: "B***3 completed 7-day sign-in for ₹128" },
    { icon: "🎰", text: "C***6 won ₹9,880 in Fortune Tiger" },
    { icon: "💥", text: "Y***9 hit a combo reward worth ₹2,222" },
    { icon: "🎖", text: "F***2 reached Platinum rank and got ₹680" },
    { icon: "🧧", text: "G***8 claimed ₹888 festival gift" },
    { icon: "✨", text: "U***5 completed recharge task and got ₹158" }
  ];

  function toggleSwitch(button) {
    var next = button.getAttribute("data-on") !== "true";
    button.setAttribute("data-on", next ? "true" : "false");
    button.classList.toggle("on", next);
    return next;
  }

  function createFeedItem(item) {
    return '<article class="feed-item"><span class="feed-icon">' +
      item.icon +
      "</span><strong>" +
      item.text +
      "</strong></article>";
  }

  function renderFeedItems() {
    var singleTrack = document.getElementById("singleTrack");
    var tripleTrack = document.getElementById("tripleTrack");
    var html = feedItems.map(createFeedItem).join("");
    var loopHtml = html + html;

    if (singleTrack) {
      singleTrack.innerHTML = loopHtml;
    }

    if (tripleTrack) {
      tripleTrack.innerHTML = loopHtml;
    }
  }

  function updateTitles(value) {
    var text = value || "中奖动态";
    Array.prototype.forEach.call(document.querySelectorAll(".component-title"), function (node) {
      node.textContent = text;
    });
  }

  function startSingleTicker(ms) {
    var track = document.getElementById("singleTrack");
    if (!track) return;
    var items = Array.prototype.slice.call(track.children);
    if (!items.length) return;
    var total = feedItems.length;
    var step = items[0].offsetHeight + 8;

    if (intervalIds.single) window.clearInterval(intervalIds.single);

    var index = 0;
    track.style.transition = "transform 0.35s ease";
    track.style.transform = "translateY(0)";
    intervalIds.single = window.setInterval(function () {
      index += 1;
      track.style.transform = "translateY(" + (-step * index) + "px)";
      if (index === total) {
        window.setTimeout(function () {
          track.style.transition = "none";
          track.style.transform = "translateY(0)";
          track.offsetHeight;
          track.style.transition = "transform 0.35s ease";
          index = 0;
        }, 360);
      }
    }, ms);
  }

  function startMultiTicker(ms) {
    var track = document.getElementById("tripleTrack");
    if (!track) return;
    var items = Array.prototype.slice.call(track.children);
    if (!items.length) return;
    var total = feedItems.length;
    var step = items[0].offsetHeight + 8;

    if (intervalIds.multi) window.clearInterval(intervalIds.multi);

    var index = 0;
    track.style.transition = "transform 0.35s ease";
    track.style.transform = "translateY(0)";
    intervalIds.multi = window.setInterval(function () {
      index += 1;
      track.style.transform = "translateY(" + (-step * index) + "px)";
      if (index === total) {
        window.setTimeout(function () {
          track.style.transition = "none";
          track.style.transform = "translateY(0)";
          track.offsetHeight;
          track.style.transition = "transform 0.35s ease";
          index = 0;
        }, 360);
      }
    }, ms);
  }

  function startTicker(ms) {
    startSingleTicker(ms);
    startMultiTicker(ms);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var titleToggle = document.getElementById("titleToggle");
    var iconToggle = document.getElementById("iconToggle");
    var intervalSelect = document.getElementById("intervalSelect");

    renderFeedItems();
    updateTitles("中奖动态");
    startTicker(3000);

    if (titleToggle) {
      titleToggle.addEventListener("click", function () {
        var isOn = toggleSwitch(titleToggle);
        Array.prototype.forEach.call(document.querySelectorAll(".component-title"), function (node) {
          node.hidden = !isOn;
        });
      });
    }

    if (iconToggle) {
      iconToggle.addEventListener("click", function () {
        var isOn = toggleSwitch(iconToggle);
        Array.prototype.forEach.call(document.querySelectorAll(".feed-icon"), function (node) {
          node.hidden = !isOn;
        });
      });
    }

    if (intervalSelect) {
      intervalSelect.addEventListener("change", function () {
        var seconds = Number(intervalSelect.value.replace(" 秒", ""));
        startTicker(seconds * 1000);
      });
    }
  });
})();
