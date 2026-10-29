(function () {
  'use strict';
  // Review fixtures only; real account state and eligibility must come from the API.
  var levels = [
    { name: 'VIP 0', deposit: 0, daily: 1, count: 1, cash: 5, balance: 100, multiplier: 10 },
    { name: 'VIP 1', deposit: 9.99, daily: 5, count: 1, cash: 10, balance: 100, multiplier: 10 },
    { name: 'VIP 2', deposit: 29.99, daily: 10, count: 3, cash: 10, balance: 100, multiplier: 10 },
    { name: 'VIP 3', deposit: 59.99, daily: 20, count: 5, cash: 20, balance: 200, multiplier: 10 }
  ];
  var mode = 'unpaid', current = 0, selected = 1;
  var claimEligible = true, cashRequiresDeposit = false;
  var claimed = false, busy = false, failNext = false, balance = 65;
  var weeklyDeposits = 0, upgradeDeposits = 0, remaining = 1, wagered = 420, wagerTarget = 1000;
  // Example API result: renewal status and expected level are not inferred from deposit progress.
  var retention = { depositRequired: 0, secured: true, expectedLevel: 0, benefitsThrough: null };
  var focusOrigin, toastTimer, claimTimer, cashTimer, cashBusy = false, compareTarget = 2;
  function el(id) { return document.getElementById(id); }
  function money(value) { return value === null ? '—' : '$' + Number(value.toFixed(2)); }
  function depositGap(rank) {
    if (rank <= current) return 0;
    return levels[rank].deposit === null ? null : Math.max(0, levels[rank].deposit - upgradeDeposits);
  }
  function requirements(level) { return level.balance === null ? 'Required Free Play balance: — · Playthrough: —' : money(level.balance) + ' Free Play balance + ' + level.multiplier + '× playthrough.'; }
  function cashReady() { return remaining > 0 && balance >= levels[current].balance && wagered >= wagerTarget && !cashRequiresDeposit && !cashBusy; }
  function retentionRulesContent() {
    return '<section class="vip-rule-section"><h3>Keep your VIP level</h3><p>Meet your weekly requirements to keep your VIP level for the next week. Your current benefits remain active through the date shown. Each week resets at 00:00 on Monday (server time).</p><p>If you do not qualify, your level drops by one when the period ends, to a minimum of VIP 0. VIP 0 requires no renewal.</p><p>Until then, cash-outs follow your current VIP level’s rules.</p></section>';
  }
  function toast(message) {
    clearTimeout(toastTimer); el('vip-toast').textContent = message; el('vip-toast').hidden = false;
    toastTimer = setTimeout(function () { el('vip-toast').hidden = true; }, 3500);
  }
  function render() {
    var own = selected === current, higher = selected > current, level = levels[selected];
    var upgradeTarget = higher ? selected : own && current === 0 ? 1 : null;
    el('level-tabs').hidden = current > 0;
    document.querySelectorAll('[data-level]').forEach(function (button) {
      var rank = Number(button.dataset.level);
      button.setAttribute('aria-pressed', String(rank === selected));
      button.setAttribute('data-current', String(rank === current));
      var caption = button.querySelector('[data-level-caption]');
      if (caption) caption.textContent = rank === current ? 'Current' : '';
    });
    el('current-badge').textContent = current === 0 ? 'Free member' : levels[current].name;
    el('preview-panel').hidden = own; el('benefits-panel').hidden = !own;
    el('preview-title').textContent = level.name;
    el('preview-threshold').textContent = level.deposit === 0 ? 'No weekly deposit required' : money(level.deposit) + ' in weekly deposits';
    el('preview-daily').textContent = money(level.daily); el('preview-cash').textContent = money(level.cash);
    el('preview-count').textContent = level.count === null ? 'Weekly cash-out limit: —' : 'Up to ' + level.count + ' cash-out' + (level.count === 1 ? '' : 's') + ' / week';
    el('preview-requirements').textContent = requirements(level);
    el('deposit-link').hidden = upgradeTarget === null;
    if (upgradeTarget !== null) {
      el('deposit-link').textContent = current === 0 ? 'Deposit to Become VIP ›' : 'Deposit to Become ' + levels[upgradeTarget].name + ' ›';
      el('deposit-link').href = '存款.html?targetVip=' + upgradeTarget + '&source=vip-benefits';
    }
    var actual = levels[current];
    el('daily-amount').textContent = money(actual.daily);
    el('claim-button').disabled = busy || claimed || !claimEligible || cashBusy;
    el('claim-button').textContent = busy ? 'Claiming…' : claimed ? 'Claimed today' : !claimEligible ? 'Not eligible to claim' : 'Claim ' + money(actual.daily) + ' Free Play ›';
    el('claim-foot').hidden = !claimed && claimEligible;
    el('claim-foot').textContent = claimed ? 'Added to your Free Play balance.' : 'Daily Free Play is not available for your account today.';
    el('cash-count').textContent = remaining + ' of ' + actual.count;
    el('cash-amount').textContent = money(actual.cash); el('requirements').textContent = requirements(actual);
    el('retention-expiry').textContent = retention.benefitsThrough || 'No expiration';
    el('retention-status').setAttribute('data-secured', String(retention.secured));
    el('retention-status').hidden = retention.secured;
    el('retention-status').textContent = retention.secured ? '✓ ' + actual.name + ' secured' : 'Expected level after expiry: ' + levels[retention.expectedLevel].name;
    el('retention-unmet-demo').setAttribute('aria-pressed', String(current === 2 && !retention.secured));
    el('retention-met-demo').setAttribute('aria-pressed', String(current === 2 && retention.secured));
    el('cash-eligibility').hidden = !cashRequiresDeposit && remaining > 0 && !cashReady();
    el('cash-eligibility').textContent = remaining === 0 ? 'No cash-outs left this week. Your weekly limit resets next week.' : cashRequiresDeposit ? 'A credited deposit is also required before you can cash out.' : cashReady() ? 'Requirements met · You can request a cash-out.' : '';
    el('cash-deposit-link').hidden = !cashRequiresDeposit;
    el('claim-lock-demo').setAttribute('aria-pressed', String(!claimEligible));
    el('cash-deposit-demo').setAttribute('aria-pressed', String(cashRequiresDeposit));
    document.querySelectorAll('[data-demo]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.demo === mode)); });
  }
  function setDemo(value) {
    clearTimeout(claimTimer); clearTimeout(toastTimer); clearTimeout(cashTimer);
    mode = value; current = value === 'paid' ? 2 : 0;
    selected = value === 'paid' ? current : 1; claimed = false; busy = false; cashBusy = false; failNext = false;
    claimEligible = true; cashRequiresDeposit = false;
    balance = 65; wagered = 420; wagerTarget = 1000;
    weeklyDeposits = value === 'paid' ? 30 : 0; upgradeDeposits = value === 'paid' ? 30 : 0; remaining = value === 'paid' ? 2 : 1;
    retention.depositRequired = value === 'paid' ? 49.95 : 0;
    retention.secured = value !== 'paid'; retention.expectedLevel = value === 'paid' ? 1 : 0;
    retention.benefitsThrough = value === 'paid' ? 'Oct 18, 2026' : null;
    el('vip-overlay').hidden = true; el('vip-toast').hidden = true; chooseLevel(selected);
  }
  function chooseLevel(value) {
    if (!Number.isInteger(value) || value < 0 || value > 3) return;
    selected = value; render();
    el('vip-status').textContent = levels[value].name + (value === current ? ', your current benefits.' : ' benefits preview. Your current level has not changed.');
  }
  function comparisonContent() {
    var options = '';
    levels.forEach(function (level, rank) {
      if (rank !== current) options += '<option value="' + rank + '"' + (rank === compareTarget ? ' selected' : '') + '>' + (rank === 0 ? 'Free' : level.name) + '</option>';
    });
    var content = '<div class="vip-compare-picker"><label for="compare-level">Compare your level with</label><select id="compare-level" data-compare-level>' + options + '</select></div>';
    content += '<table class="vip-compare-table"><thead><tr><th scope="col">Benefit</th><th scope="col">' + levels[current].name + '<small>Current</small></th><th scope="col">' + levels[compareTarget].name + '</th></tr></thead><tbody>';
    [['More to deposit', 'deposit', true], ['Daily Free Play', 'daily', true], ['Cash-outs per week', 'count', false], ['Each cash-out', 'cash', true], ['Free Play balance required', 'balance', true], ['Playthrough', 'multiplier', false]].forEach(function (row) {
      content += '<tr><th scope="row">' + row[0] + '</th>';
      [current, compareTarget].forEach(function (rank) {
        var value = row[1] === 'deposit' ? depositGap(rank) : levels[rank][row[1]];
        var label = value === null ? '—' : row[1] === 'deposit' && value === 0 ? 'Not required' : row[2] ? money(value) : value + (row[1] === 'multiplier' ? '×' : '');
        content += '<td>' + label + '</td>';
      });
      content += '</tr>';
    });
    content += '</tbody></table><p>Upgrade progress counts credited deposits. Daily rewards do not add to deposit progress.</p><p>Successful cash-out clears the Free Play balance included in your request.</p>';
    content += '<button class="vip-secondary" type="button" data-pick-level="' + compareTarget + '">View ' + levels[compareTarget].name + ' benefits ›</button>';
    return content;
  }
  function showDialog(kind, trigger) {
    if (trigger) focusOrigin = trigger;
    var content = '', title = '';
    if (kind === 'levels') {
      title = 'Choose a VIP level';
      content = '<p>Current level: ' + levels[current].name + '. View your benefits or preview another level.</p><div class="vip-level-grid">';
      for (var value = 0; value <= 3; value += 1) content += '<button type="button" data-pick-level="' + value + '" aria-pressed="' + (value === selected) + '">' + (value === 0 ? 'Free' : levels[value].name) + (value === current ? '<small>Current</small>' : '') + '</button>';
      content += '</div>';
    } else if (kind === 'compare') {
      title = 'Compare all levels';
      compareTarget = selected !== current ? selected : current < 3 ? current + 1 : 2;
      content = comparisonContent();
    } else if (kind === 'rules') {
      title = 'Level & renewal rules';
      content = '<section class="vip-rule-section"><h3>Upgrade your level</h3><p>Choose a higher level to see the remaining deposit amount. Your upgrade takes effect when deposits are credited and the requirements are met.</p></section>' + retentionRulesContent() + '<section class="vip-rule-section"><h3>Daily Free Play & cash-outs</h3><p>Claim the reward for your current level when available. Cash-outs require the qualifying balance, completed playthrough and remaining daily attempts.</p><p>Successful cash-out clears only the Free Play balance included in that request.</p></section>';
    } else if (kind === 'cash-confirm') {
      if (!cashReady() || busy) return;
      title = 'Confirm cash-out';
      content = '<div class="vip-progress-row"><p>Cash-out amount</p><strong>' + money(levels[current].cash) + '</strong></div><p>Free Play balance included: <strong>' + money(balance) + '</strong></p><p>This Free Play balance will be cleared only after your cash-out succeeds.</p><div class="vip-dialog-actions"><button class="vip-secondary" type="button" data-back-progress>Back</button><button class="vip-primary" type="button" data-confirm-cash>Confirm</button></div>';
    } else if (kind === 'cash-success') {
      title = 'Cash-out successful';
      content = '<div class="vip-progress-row"><p>Cash-out amount</p><strong>' + money(levels[current].cash) + '</strong></div><p>The Free Play balance included in your request has been cleared.</p><p>' + remaining + ' cash-out' + (remaining === 1 ? '' : 's') + ' left this week.</p><button class="vip-primary" type="button" data-close-content>Back to my benefits</button>';
    } else {
      title = 'Cash-Out Progress';
      var actual = levels[current];
      content = '<p>' + actual.name + ' · ' + remaining + ' of ' + actual.count + ' cash-outs left this week · ' + money(actual.cash) + ' each</p>';
      [['Free Play balance', balance, actual.balance], ['Playthrough · ' + actual.multiplier + '×', wagered, wagerTarget]].forEach(function (row) {
        content += '<div class="vip-progress-row"><p>' + row[0] + '</p><strong>' + money(row[1]) + ' / ' + money(row[2]) + '</strong><p>' + (row[1] >= row[2] ? 'Requirement met' : money(row[2] - row[1]) + ' more needed') + '</p><div class="vip-progress-track"><span style="width:' + Math.min(100, row[1] / row[2] * 100) + '%"></span></div></div>';
      });
      if (cashRequiresDeposit) content += '<p class="vip-eligibility-note">A credited deposit is also required before you can cash out.</p><a class="vip-secondary" href="存款.html?source=vip-cash-out">Go to Deposit ›</a>';
      var status = remaining === 0 ? 'Weekly limit reached' : cashRequiresDeposit ? 'Deposit required' : cashBusy ? 'Processing cash-out…' : cashReady() ? 'Ready to cash out' : 'Requirements not met';
      content += '<p class="vip-cash-status">' + status + '</p><p>' + (remaining === 0 ? 'Your weekly cash-out limit resets next week.' : cashReady() ? 'You can cash out ' + money(actual.cash) + ' with your current benefits.' : 'Use Free Play to meet the balance and playthrough requirements.') + '</p><p>Successful cash-out clears the Free Play balance included in your request.</p><button class="vip-primary" type="button" data-request-cash' + (cashReady() && !busy ? '' : ' disabled') + '>' + (cashReady() ? 'Cash Out ' + money(actual.cash) + ' ›' : status) + '</button>';
    }
    el('dialog-title').textContent = title; el('dialog-content').innerHTML = content;
    el('vip-overlay').hidden = false; document.querySelector('.vip-dialog').focus();
  }
  function closeDialog() { el('vip-overlay').hidden = true; if (focusOrigin && !focusOrigin.closest('[hidden]')) focusOrigin.focus(); }
  function init() {
    if (!el('claim-button') || !el('preview-panel')) return;
    document.querySelectorAll('[data-demo]').forEach(function (button) { button.addEventListener('click', function () { setDemo(button.dataset.demo); }); });
    document.querySelectorAll('[data-level]').forEach(function (button) { button.addEventListener('click', function () { chooseLevel(Number(button.dataset.level)); }); });
    el('dialog-content').addEventListener('click', function (event) {
      var target = event.target;
      var button = target.closest('[data-pick-level]');
      if (button) { closeDialog(); chooseLevel(Number(button.dataset.pickLevel)); document.querySelector('[data-level="' + selected + '"]').focus(); return; }
      if (target.closest('[data-request-cash]')) { showDialog('cash-confirm'); return; }
      if (target.closest('[data-back-progress]')) { showDialog('progress'); return; }
      if (target.closest('[data-close-content]')) { closeDialog(); return; }
      if (target.closest('[data-confirm-cash]') && cashReady() && !busy) {
        cashBusy = true;
        var included = balance;
        render();
        el('dialog-content').innerHTML = '<p class="vip-cash-status">Processing cash-out…</p><p>Your Free Play balance will be cleared after success.</p>';
        cashTimer = setTimeout(function () {
          cashBusy = false; balance = Math.max(0, balance - included); wagered = 0; remaining = Math.max(0, remaining - 1);
          render(); showDialog('cash-success');
        }, 700);
      }
    });
    el('dialog-content').addEventListener('change', function (event) {
      if (!event.target.matches('[data-compare-level]')) return;
      var value = Number(event.target.value);
      if (!Number.isInteger(value) || value < 0 || value > 3 || value === current) return;
      compareTarget = value; el('dialog-content').innerHTML = comparisonContent();
      document.querySelector('[data-compare-level]').focus();
    });
    el('claim-button').addEventListener('click', function () {
      if (!claimEligible || busy || cashBusy || claimed) return;
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
        var targets = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href], select, summary, [tabindex="0"]')).filter(function (node) { return node.getClientRects().length > 0; });
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
    el('cash-ready-demo').addEventListener('click', function () {
      clearTimeout(cashTimer); cashBusy = false; cashRequiresDeposit = false;
      balance = levels[current].balance; wagered = wagerTarget; remaining = levels[current].count;
      chooseLevel(current); showDialog('progress', el('progress-button'));
    });
    el('cash-limit-demo').addEventListener('click', function () {
      clearTimeout(cashTimer); cashBusy = false; remaining = 0;
      chooseLevel(current); showDialog('progress', el('progress-button'));
    });
    function setRetentionDemo(state) {
      if (current !== 2) setDemo('paid');
      weeklyDeposits = state === 'met' ? 49.95 : 30;
      retention.secured = state === 'met'; retention.expectedLevel = retention.secured ? 2 : 1;
      closeDialog(); chooseLevel(current);
    }
    el('retention-unmet-demo').addEventListener('click', function () { setRetentionDemo('unmet'); });
    el('retention-met-demo').addEventListener('click', function () { setRetentionDemo('met'); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
