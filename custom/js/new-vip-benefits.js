(function () {
  'use strict';
  // Review fixtures only; real account state and eligibility must come from the API.
  var levels = [
    { name: 'Free', deposit: 0, daily: 1, count: 1, cash: 5, balance: 100, multiplier: 10 },
    { name: 'VIP 1', deposit: 0, daily: 5, count: 1, cash: 10, balance: 100, multiplier: 10 },
    { name: 'VIP 2', deposit: 29.99, daily: 10, count: 3, cash: 10, balance: 100, multiplier: 10 },
    { name: 'VIP 3', deposit: 59.99, daily: 20, count: 5, cash: 20, balance: 200, multiplier: 10 }
  ];
  for (var rank = 4; rank <= 15; rank += 1) {
    levels.push({ name: 'VIP ' + rank, deposit: null, daily: null, count: null, cash: null, balance: null, multiplier: null });
  }
  var mode = 'unpaid', current = 1, selected = 2;
  var claimEligible = true, cashRequiresDeposit = false;
  var claimed = false, busy = false, failNext = false, balance = 65;
  var weeklyDeposits = 0, remaining = 1, wagered = 420, wagerTarget = 1000;
  var focusOrigin, toastTimer, claimTimer;
  function el(id) { return document.getElementById(id); }
  function money(value) { return value === null ? '—' : '$' + Number(value.toFixed(2)); }
  function requirements(level) { return level.balance === null ? 'Benefit details are currently unavailable.' : money(level.balance) + ' Free Play balance + ' + level.multiplier + '× playthrough.'; }
  function toast(message) {
    clearTimeout(toastTimer); el('vip-toast').textContent = message; el('vip-toast').hidden = false;
    toastTimer = setTimeout(function () { el('vip-toast').hidden = true; }, 3500);
  }
  function render() {
    var own = selected === current, higher = selected > current, level = levels[selected];
    document.querySelectorAll('[data-level]').forEach(function (button) {
      var rank = Number(button.dataset.level);
      button.setAttribute('aria-pressed', String(rank === selected));
      button.querySelector('[data-level-caption]').textContent = rank === current ? 'Current' : 'View benefits';
    });
    el('current-badge').textContent = levels[current].name;
    el('preview-panel').hidden = own; el('benefits-panel').hidden = !own;
    el('return-current').hidden = own;
    el('return-current').textContent = 'View my ' + levels[current].name + ' benefits';
    el('preview-context').textContent = 'Current: ' + levels[current].name + (higher ? ' · Upgrade preview' : ' · Benefits comparison');
    el('preview-eyebrow').textContent = higher ? 'BENEFITS AFTER UPGRADE' : 'LEVEL BENEFITS · PREVIEW ONLY';
    el('preview-title').textContent = level.name;
    el('preview-threshold').textContent = level.deposit === null ? 'Deposit requirement currently unavailable' : money(level.deposit) + ' in weekly deposits';
    el('preview-daily').textContent = money(level.daily); el('preview-cash').textContent = money(level.cash);
    el('preview-count').textContent = level.count === null ? 'Cash-out limit unavailable' : 'Up to ' + level.count + ' cash-outs / day';
    el('preview-requirements').textContent = requirements(level);
    el('deposit-remaining').textContent = level.deposit === null ? 'Review the available deposit options on Deposit.' : 'Deposit ' + money(Math.max(0, level.deposit - weeklyDeposits)) + ' more to reach the ' + level.name + ' deposit requirement.';
    el('deposit-link').textContent = 'Deposit to Upgrade to VIP' + selected + ' ›';
    el('deposit-link').href = '存款.html?targetVip=' + selected + '&source=vip-benefits';
    el('deposit-link').hidden = !higher;
    el('deposit-remaining').hidden = !higher;
    el('upgrade-foot').hidden = !higher;
    el('deposit-status').hidden = mode !== 'pending' && mode !== 'failed';
    el('deposit-status').textContent = mode === 'pending' ? 'Your deposit is processing. Your current level has not changed.' : mode === 'failed' ? 'Your deposit was unsuccessful. No upgrade has been applied.' : '';
    var actual = levels[current];
    el('daily-amount').textContent = money(actual.daily);
    el('claim-button').disabled = busy || claimed || !claimEligible;
    el('claim-button').textContent = busy ? 'Claiming…' : claimed ? 'Claimed today' : !claimEligible ? 'Not eligible to claim' : 'Claim ' + money(actual.daily) + ' Free Play ›';
    el('claim-foot').textContent = claimed ? 'Added to your Free Play balance.' : !claimEligible ? 'Daily reward eligibility has not been confirmed. Please contact support.' : 'Claim your daily Free Play before you play.';
    el('cash-count').textContent = remaining + ' of ' + actual.count;
    el('cash-amount').textContent = money(actual.cash); el('requirements').textContent = requirements(actual);
    el('cash-eligibility').hidden = !cashRequiresDeposit;
    el('cash-eligibility').textContent = cashRequiresDeposit ? 'A credited deposit is also required before you can cash out.' : '';
    el('cash-deposit-link').hidden = !cashRequiresDeposit;
    el('claim-lock-demo').setAttribute('aria-pressed', String(!claimEligible));
    el('cash-deposit-demo').setAttribute('aria-pressed', String(cashRequiresDeposit));
    el('next-level').hidden = current >= 15; el('next-level').textContent = 'Explore VIP ' + (current + 1) + ' benefits ›';
    document.querySelectorAll('[data-demo]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.demo === mode)); });
  }
  function setDemo(value) {
    clearTimeout(claimTimer); clearTimeout(toastTimer);
    mode = value; current = value === 'paid' ? 2 : 1;
    selected = value === 'paid' ? current : 2; claimed = false; busy = false; failNext = false;
    claimEligible = true; cashRequiresDeposit = false;
    balance = 65; weeklyDeposits = value === 'paid' ? 29.99 : 0; remaining = value === 'paid' ? 2 : 1;
    el('vip-overlay').hidden = true; el('vip-toast').hidden = true; chooseLevel(selected);
  }
  function chooseLevel(value) {
    if (!Number.isInteger(value) || value < 1 || value > 15) return;
    selected = value; render();
    var button = document.querySelector('[data-level="' + value + '"]');
    var strip = el('level-tabs');
    if (button) strip.scrollLeft = Math.max(0, button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2);
    el('vip-status').textContent = levels[value].name + (value === current ? ', your current benefits.' : ' benefits preview. Your current level has not changed.');
  }
  function showDialog(kind, trigger) {
    focusOrigin = trigger;
    var content = '', title = '';
    if (kind === 'levels') {
      title = 'Choose a VIP level';
      content = '<p>Current level: ' + levels[current].name + '. View your benefits or preview another level.</p><div class="vip-level-grid">';
      for (var value = 1; value <= 15; value += 1) content += '<button type="button" data-pick-level="' + value + '" aria-pressed="' + (value === selected) + '">' + levels[value].name + (value === current ? '<small>Current</small>' : '') + '</button>';
      content += '</div>';
    } else if (kind === 'compare') {
      title = 'Compare all levels';
      content = '<p>15 VIP levels. Expand levels to compare benefits. Free is shown as a separate reference.</p>';
      levels.forEach(function (level, i) {
        content += '<details class="vip-compare-card"' + (i === current || i === selected ? ' open' : '') + '><summary>' + level.name + (i === current ? '<small>Current level</small>' : i === 0 ? '<small>Non-VIP</small>' : '') + '</summary><dl>';
        [['Weekly deposits', 'deposit', true], ['Daily Free Play', 'daily', true], ['Cash-outs / day', 'count', false], ['Each cash-out', 'cash', true], ['Required balance', 'balance', true], ['Playthrough', 'multiplier', false]].forEach(function (row) {
          var value = level[row[1]];
          var label = value === null ? '—' : row[1] === 'deposit' && i <= 1 ? 'Not required' : row[2] ? money(value) : value + (row[1] === 'multiplier' ? '×' : '');
          content += '<div><dt>' + row[0] + '</dt><dd>' + label + '</dd></div>';
        });
        content += '</dl>' + (level.daily === null ? '<p>Benefit details are currently unavailable.</p>' : '');
        if (i > current) content += '<button class="vip-secondary" type="button" data-pick-level="' + i + '">Preview VIP ' + i + ' benefits ›</button>';
        content += '</details>';
      });
      content += '<p>A successful cash-out clears the Free Play balance included in that request.</p>';
    } else if (kind === 'rules') {
      title = 'Upgrade rules';
      content = '<ul><li>VIP 1 is your starting level. There are 15 VIP levels in total.</li><li>Previewing a higher level does not activate its benefits.</li><li>Choose your payment method and a fixed amount on Deposit. Your target level is carried over for reference.</li><li>Pending or failed deposits do not count toward an upgrade. Your level and benefits update only after the deposit is credited and eligibility is confirmed.</li><li>Claiming Free Play does not complete cash-out requirements. Check your balance, playthrough progress and remaining daily cash-outs separately.</li></ul>';
    } else {
      title = 'Cash-Out Progress';
      var actual = levels[current];
      content = '<p>' + actual.name + ' · ' + remaining + ' of ' + actual.count + ' cash-outs left today · ' + money(actual.cash) + ' each</p>';
      [['Free Play balance', balance, actual.balance], ['Playthrough · ' + actual.multiplier + '×', wagered, wagerTarget]].forEach(function (row) {
        content += '<div class="vip-progress-row"><p>' + row[0] + '</p><strong>' + money(row[1]) + ' / ' + money(row[2]) + '</strong><p>' + money(Math.max(0, row[2] - row[1])) + ' more needed</p><div class="vip-progress-track"><span style="width:' + Math.min(100, row[1] / row[2] * 100) + '%"></span></div></div>';
      });
      if (cashRequiresDeposit) content += '<p class="vip-eligibility-note">A credited deposit is also required before you can cash out.</p><a class="vip-secondary" href="存款.html?source=vip-cash-out">Go to Deposit ›</a>';
      content += '<p>Play with your Free Play balance to make progress. Meet all cash-out requirements before requesting a cash-out.</p><p>A successful cash-out clears the Free Play balance included in that request.</p><button class="vip-primary" type="button" disabled>Requirements not met</button>';
    }
    el('dialog-title').textContent = title; el('dialog-content').innerHTML = content;
    el('vip-overlay').hidden = false; document.querySelector('.vip-dialog').focus();
  }
  function closeDialog() { el('vip-overlay').hidden = true; if (focusOrigin && !focusOrigin.closest('[hidden]')) focusOrigin.focus(); }
  function init() {
    if (!el('claim-button') || !el('preview-panel')) return;
    document.querySelectorAll('[data-demo]').forEach(function (button) { button.addEventListener('click', function () { setDemo(button.dataset.demo); }); });
    document.querySelectorAll('[data-level]').forEach(function (button) { button.addEventListener('click', function () { chooseLevel(Number(button.dataset.level)); }); });
    el('next-level').addEventListener('click', function () { chooseLevel(current + 1); el('return-current').focus(); });
    el('return-current').addEventListener('click', function () { chooseLevel(current); document.querySelector('[data-level="' + current + '"]').focus(); });
    el('dialog-content').addEventListener('click', function (event) {
      var button = event.target.closest('[data-pick-level]'); if (!button) return;
      closeDialog(); chooseLevel(Number(button.dataset.pickLevel)); document.querySelector('[data-level="' + selected + '"]').focus();
    });
    el('claim-button').addEventListener('click', function () {
      if (!claimEligible || busy || claimed || selected !== current) return;
      busy = true; render();
      claimTimer = setTimeout(function () {
        busy = false;
        if (failNext) { failNext = false; toast('Unable to claim. Please try again.'); }
        else { claimed = true; balance += levels[current].daily; toast(money(levels[current].daily) + ' added to your Free Play balance.'); }
        render();
      }, 650);
    });
    document.querySelectorAll('[data-dialog]').forEach(function (button) { button.addEventListener('click', function () { showDialog(button.dataset.dialog, button); }); });
    el('progress-button').addEventListener('click', function () { showDialog('progress', this); });
    document.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', closeDialog); });
    document.addEventListener('keydown', function (event) {
      if (el('vip-overlay').hidden) return;
      if (event.key === 'Escape') closeDialog();
      if (event.key === 'Tab') {
        var dialog = document.querySelector('.vip-dialog');
        var targets = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href], summary, [tabindex="0"]')).filter(function (node) { return node.getClientRects().length > 0; });
        var first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    el('reset-demo').addEventListener('click', function () { setDemo(mode); chooseLevel(current); toast('Claim demo reset.'); });
    el('fail-demo').addEventListener('click', function () { setDemo(mode); chooseLevel(current); failNext = true; toast('The next claim will show a retry state.'); });
    el('claim-lock-demo').addEventListener('click', function () {
      clearTimeout(claimTimer); busy = false; claimEligible = !claimEligible;
      chooseLevel(current);
    });
    el('cash-deposit-demo').addEventListener('click', function () { cashRequiresDeposit = !cashRequiresDeposit; chooseLevel(current); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
