(function () {
  'use strict';
  function init() {
    var content = document.getElementById('co-content');
    var modal = document.getElementById('co-modal');
    var dialog = document.getElementById('co-dialog');
    var scenario = document.getElementById('co-scenario');
    var feedback = document.getElementById('co-demo-result');
    var M = window.CashOutDemo;
    if (!content || !modal || !dialog || !scenario || !feedback || !M) return;
    var state = M.create(scenario.value);
    var returnFocus = null, modalKind = '', accountOrigin = '', accountDraft = null, reviewSnapshot = '';
    var m = M.money;
    function amountLabel(value) { return m(value).replace(/\.00$/, ''); }
    var methods = ['Cash App', 'PayPal', 'Card', 'Chime', 'ACH'];
    function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function icon(name) {
      var paths = {
        crown: '<path d="m3 7 5 4 4-7 4 7 5-4-3 12H6Z"/><path d="M7 22h10"/>',
        bank: '<path d="m3 8 9-5 9 5ZM3 21h18M5 18V11m5 7V11m4 7V11m5 7V11"/>',
        card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
        coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 4 16 4 16 0V6M4 11v5c0 4 16 4 16 0v-5M4 16v4c0 4 16 4 16 0v-4"/>',
        doc: '<path d="M6 2h9l4 4v16H6ZM14 2v5h5M9 11h7M9 15h7M9 19h5"/>',
        arrow: '<path d="m9 5 7 7-7 7"/>',
        check: '<path d="m5 12 5 5 9-10"/>'
      };
      return '<svg class="co-icon" viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.doc) + '</svg>';
    }
    function row(label, value) { return '<div class="co-row"><span>' + label + '</span><strong>' + value + '</strong></div>'; }
    function primary(text, action, disabled) { return '<button type="button" class="co-primary" data-action="' + action + '"' + (disabled ? ' disabled' : '') + '>' + text + '</button>'; }
    function pending() { return state.request && state.request.status === 'processing'; }
    function mask(value) { return esc(value.slice(0, 3)) + '••••'; }
    function footer(withBonus) {
      return '<nav class="co-footer' + (state.tab === 'deposit' ? ' co-footer-deposit' : '') + '" aria-label="More options">' +
        (withBonus ? '<a href="PIGGY BANK.html">' + icon('doc') + 'Bonus Bank ' + icon('arrow') + '</a>' : '') +
        '<button type="button" data-action="rules">' + (state.tab === 'free' ? icon('doc') : '') + (state.tab === 'free' ? 'View rules' : 'Cash-out rules') + icon('arrow') + '</button></nav>';
    }
    function paymentIcon(method) {
      if (method === 'Card' || method === 'ACH') return '<span class="co-pay-icon">' + icon(method === 'Card' ? 'card' : 'bank') + '</span>';
      return '<span class="co-pay-icon co-pay-' + method.toLowerCase().replace(/ /g, '-') + '">' + (method === 'Cash App' ? '$' : method === 'PayPal' ? 'P' : 'C') + '</span>';
    }
    function paymentMethods(selected) {
      return '<div class="co-methods">' + methods.map(function (method) {
        return '<button type="button" class="co-method" data-method="' + method + '" aria-pressed="' + (selected === method) + '">' + paymentIcon(method) + '<span>' + method + '</span></button>';
      }).join('') + '</div>';
    }
    function accountButton() {
      return '<button type="button" class="co-account" data-action="account"><span>' + (state.account ? mask(state.account) : 'Add payout account') + '</span><span>' + (state.account ? 'Change ' : '') + icon('arrow') + '</span></button>';
    }
    function balanceCard() {
      var free = state.tab === 'free';
      return '<section class="co-card co-balance"><span class="co-label">' + (free ? 'Free Play' : 'Deposit') + ' balance' + (pending() ? ' · available' : '') + '</span><strong class="co-amount">' + m(free ? state.free : state.deposit + state.newDeposit) + '</strong></section>';
    }
    function onSuccess(q) {
      return '<section class="co-outcome"><h3>' + icon('doc') + 'On success</h3>' + row('Free Play:', m(q.freeze) + ' → $0') + row('Deposit balance:', 'unchanged') + '</section>';
    }
    function excessNotice(q) {
      return q.clear ? '<p class="co-excess">' + m(q.clear) + ' above your remaining limit will be cleared on success.</p>' : '';
    }
    function compactDepositSummary(q) {
      return '<section class="co-summary">' + row('You receive', m(q.amount)) + row(state.newDeposit ? 'This balance after cash-out' : 'Deposit balance after cash-out', '$0.00') + '</section>' + excessNotice(q);
    }
    function reviewDetails(type, q) {
      return '<div class="co-review-rows">' + row('From', type === 'free' ? 'Free Play' : 'Deposit Balance') + row('Balance locked on submission', m(q.freeze)) +
        (q.clear ? row(type === 'free' ? 'Cleared in addition to payout' : 'Above-limit amount cleared', m(q.clear)) : '') +
        row('This balance on success', '$0.00') + '</div><p class="co-small">New funds and ' + (type === 'free' ? 'Deposit Balance' : 'Free Play') + ' are not affected. If this request fails, the full ' + m(q.freeze) + ' returns to its original balance.</p>';
    }
    function activeRequest() {
      return state.request && state.request.type === state.tab && !state.request.dismissed;
    }
    function requestView() {
      var r = state.request;
      var label = r.type === 'free' ? 'Free Play' : 'Deposit Balance';
      var html = balanceCard() + '<section class="co-card co-request">';
      if (r.status === 'processing') {
        html += '<span class="co-badge">Processing</span><h2>Cash-out requested</h2><strong class="co-amount">' + m(r.amount) + '</strong><p class="co-request-id">' + r.id + '</p>' +
          row('Locked · ' + label, m(r.freeze)) + '<ol class="co-timeline">' + ['Submitted', 'In review', 'Payment'].map(function (text, i) {
            return '<li class="' + (i < r.stage ? 'done' : i === r.stage ? 'current' : '') + '">' + text + '</li>';
          }).join('') + '</ol>' + (r.uncertain ? '<p class="co-pending-note">We’re checking your payment result. Your funds stay locked until it is confirmed.</p>' : '<p class="co-small">Your other available funds can still be used.</p>') +
          primary('Cash-out processing', 'review', true) + '<button type="button" class="co-text-link" data-action="request-details">View request details</button>';
      } else if (r.status === 'success') {
        html += '<div class="co-result-icon">' + icon('check') + '</div><h2>Cash-out completed</h2><strong class="co-amount">' + m(r.amount) + '</strong><p>Paid to ' + esc(r.method) + ' · ' + mask(r.account) + '</p><p class="co-small">Only this request’s locked balance was settled. New funds have been kept.</p>' + primary('Back to Cash Out', 'dismiss-result', false) + '<button type="button" class="co-text-link" data-action="request-details">View request details</button>';
      } else {
        html += '<span class="co-badge">Returned</span><h2>Cash-out not completed</h2><strong class="co-amount">' + m(r.freeze) + '</strong><p>Returned to ' + label + '.</p><div class="co-condition"><span class="co-status-icon">!</span><div>We couldn’t verify your payout account. Update it before requesting again.</div></div><p class="co-small">Your original playthrough progress and cash-out allowance are restored.</p>' +
          primary('Update payout account', 'account', false) + '<button type="button" class="co-text-link" data-action="dismiss-result">Back to Cash Out</button>';
      }
      return html + '</section>' + footer(state.tab === 'free');
    }
    function pendingOther() {
      return pending() ? '<button type="button" class="co-inline-notice" data-action="current-request">A cash-out is in progress <span>View ›</span></button>' : '';
    }
    function freeContent() {
      if (activeRequest()) return requestView();
      var q = M.quote(state, 'free');
      var html = balanceCard() + pendingOther();
      if (!state.vip) return html + '<section class="co-card co-entry"><div class="co-entry-main"><span class="co-entry-icon gold">' + icon('crown') + '</span><div><div class="co-topline"><h2>Free Play Cash-Out</h2><span class="co-badge outlined">VIP required</span></div><p>Requires VIP, qualifying balance<br>and completed playthrough.</p></div></div><a class="co-outline" href="新VIP 展示.html">View VIP Benefits ' + icon('arrow') + '</a></section><section class="co-card co-entry"><div class="co-entry-main"><span class="co-entry-icon">' + icon('coins') + '</span><div><h2>Bonus Bank</h2><p>Bonus credits, not cash.<br>A deposit is required to<br>unlock credits.</p></div></div><a class="co-outline" href="PIGGY BANK.html">View Conversion ' + icon('arrow') + '</a></section>' + footer(false);
      var percent = Math.min(100, Math.floor(state.free / state.requiredFree * 100));
      html += '<section class="co-card co-vip-card"><div class="co-topline"><div class="co-offer"><span class="co-vip">VIP 2</span><div><small>Cash-out amount</small><strong>' + amountLabel(state.fixed) + '</strong></div></div><span class="co-badge ' + (q.eligible ? 'ready' : '') + '">' + (q.eligible ? '<span class="co-mini-check">✓</span> Ready to request' : 'Not ready yet') + '</span></div><div class="co-rows">' +
        row('Free Play balance', m(state.free) + ' / ' + m(state.requiredFree)) + '<div class="co-progress-line"><div class="co-progress ' + (percent === 100 ? 'complete' : '') + '" role="progressbar" aria-label="Required balance" aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + percent + '%"></span></div><span>' + percent + '%</span></div>' +
        row('Playthrough left', m(state.freeLeft)) + row('Cash-outs left this week', q.times + ' of ' + state.weeklyLimit) + '</div>';
      if (!q.eligible) {
        var reasons = q.reasons.filter(function (text) { return text !== 'Your weekly cash-outs have been used.' && text !== 'A cash-out is in progress.'; });
        if (!q.times) reasons.push('Weekly limit reached. Resets ' + state.resetAt + '.');
        if (reasons.length) html += '<div class="co-condition co-condition-plain"><span class="co-status-icon">!</span><div>' + reasons.map(esc).join(' ') + '</div></div>';
      } else html += onSuccess(q);
      if (state.needsAccount) html += '<p class="co-excess">Update your payout account before submitting again.</p>';
      html += primary('Request ' + amountLabel(state.fixed), 'review', !q.eligible);
      html += q.eligible ? '<div class="co-footnote">Review and confirm next.</div>' : '<p class="co-legal">' + icon('doc') + '<span>On success, the Free Play balance in this request resets to $0. Deposit balance is unaffected.</span></p>';
      return html + '</section>' + footer(true);
    }
    function depositContent() {
      if (activeRequest()) return requestView();
      var q = M.quote(state, 'deposit');
      var html = pendingOther() + '<section class="co-card co-deposit-conditions">' + row(state.newDeposit ? 'This deposit balance' : 'Deposit balance', m(state.deposit)) +
        (state.newDeposit ? '<p class="co-small">Other available deposits: ' + m(state.newDeposit) + '. Assessed separately.</p>' : '') +
        row('Balance required', m(state.depositBase * 3) + (state.deposit >= state.depositBase * 3 ? ' <span class="co-row-check">✓</span>' : '')) +
        row('Playthrough left', m(state.depositLeft) + (!state.depositLeft ? ' <span class="co-row-check">✓</span>' : '')) + '</section>';
      var reasons = q.reasons.filter(function (text) { return text !== 'A cash-out is in progress.'; });
      html += '<div class="co-condition ' + (q.eligible ? 'success' : '') + '"><span class="co-status-icon">' + (q.eligible ? '✓' : '!') + '</span><div><strong>' + (q.eligible ? 'Ready to request' : 'Not ready yet') + '</strong><p>' +
        (q.eligible ? 'You meet all requirements. Your maximum eligible amount will be applied automatically.' : reasons.map(esc).join(' ') || 'Wait for your current cash-out to finish.') + '</p></div></div>' +
        '<section class="co-card co-cash-amount"><span class="co-label">Available to cash out <button type="button" class="co-info" data-action="limit" aria-label="How the cash-out amount is calculated">ⓘ</button></span><strong class="co-amount gold">' + m(q.eligible ? q.amount : 0) + '</strong>' +
        (q.eligible ? '<div class="co-small">Maximum eligible amount applied automatically.</div>' : '') + '</section>' +
        '<h2 class="co-payment-title">Cash out to</h2>' + paymentMethods(state.method) + accountButton();
      if (state.needsAccount) html += '<p class="co-excess">Update your payout account before submitting again.</p>';
      if (q.eligible) html += compactDepositSummary(q);
      html += '<div class="co-deposit-action' + (!q.eligible ? ' is-unmet' : '') + '">' + primary(q.eligible ? 'Review ' + amountLabel(q.amount) + ' Cash-Out' : 'Review Cash-Out', 'review', !q.eligible) + '</div>' +
        (q.eligible ? '<div class="co-footnote">Review details before submitting.</div>' : '');
      return html + footer(false);
    }
    function render() {
      document.querySelectorAll('[data-tab]').forEach(function (button) {
        button.setAttribute('aria-selected', String(button.dataset.tab === state.tab));
        button.tabIndex = button.dataset.tab === state.tab ? 0 : -1;
      });
      content.setAttribute('aria-labelledby', state.tab + '-tab');
      content.innerHTML = state.tab === 'free' ? freeContent() : depositContent();
      document.querySelectorAll('[data-demo]').forEach(function (button) {
        button.disabled = button.dataset.demo !== 'reset' && (!pending() || (button.dataset.demo === 'win' && !state.free));
      });
    }
    function openDialog(kind, html) {
      if (modal.hidden) returnFocus = document.activeElement;
      modalKind = kind;
      dialog.innerHTML = html;
      modal.hidden = false;
      dialog.focus();
    }
    function closeDialog() {
      modal.hidden = true;
      modalKind = '';
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      else document.querySelector('[data-tab="' + state.tab + '"]').focus();
    }
    function cancel(label) { return '<button type="button" class="co-secondary" data-action="close">' + (label || 'Not now') + '</button>'; }
    function cancelDialog() {
      if (modalKind === 'account' && accountOrigin === 'review' && state.account && !state.needsAccount) openReview(false);
      else closeDialog();
    }
    function signature(q) { return JSON.stringify([state.tab, q.amount, q.freeze, q.clear, q.times, q.cap, state.method, state.account]); }
    function openReview(changed) {
      var q = M.quote(state, state.tab);
      if (!q.eligible) return;
      if (!state.account || state.needsAccount) { openAccount('review'); return; }
      reviewSnapshot = signature(q);
      openDialog('review', '<h2 id="co-dialog-title">Review Cash-Out</h2>' + (changed ? '<p class="co-excess">Your details have changed. Please review the updated amount.</p>' : '') +
        '<span class="co-label">You receive</span><strong class="co-amount gold">' + m(q.amount) + '</strong><div class="co-review-account"><span>' + esc(state.method) + '</span>' + accountButton() + '</div>' +
        reviewDetails(state.tab, q) + primary('Confirm ' + amountLabel(q.amount) + ' Cash-Out', 'submit', false) + cancel());
    }
    function openAccount(origin) {
      accountOrigin = origin || (modalKind === 'review' ? 'review' : 'page');
      accountDraft = { method: state.method, account: state.account };
      renderAccount();
    }
    function renderAccount() {
      var placeholders = { 'Cash App': '$yourname', 'PayPal': 'name@example.com', 'Card': 'Card ending in 1234', 'Chime': '$ChimeSign', 'ACH': 'Bank account ending in 1234' };
      openDialog('account', '<h2 id="co-dialog-title">Payout account</h2>' + paymentMethods(accountDraft.method) +
        '<label for="co-account-input">' + esc(accountDraft.method) + '<input id="co-account-input" type="text" maxlength="60" autocomplete="off" placeholder="' + placeholders[accountDraft.method] + '" value="' + esc(accountDraft.account) + '"></label><p class="co-small">Use an account you own.</p><div id="co-account-error" class="co-error" role="status"></div>' + primary('Save and continue', 'save-account', false) + cancel());
    }
    function rules() {
      var free = state.tab === 'free';
      openDialog('rules', '<h2 id="co-dialog-title">Cash-out rules</h2><p>' + (free ? 'Free Play cash-outs require VIP, a qualifying balance and completed playthrough. Your VIP tier sets the fixed payout and weekly limit.' : 'Your eligible deposit balance must reach 3× the corresponding deposit, with 10× deposit playthrough completed. The payout is your eligible balance or remaining redemption limit, whichever is lower. The total limit is 10× the corresponding deposit.') +
        '</p><p>The balance shown in your review is locked while processing. On success, it is settled, including any amount shown as cleared. If the request fails, the full locked balance is returned.</p><p>New funds and their game results are unaffected.</p>' +
        (free ? '<p>Bonus Bank contains bonus credits, not cash. A deposit is required to unlock credits under its rules.</p>' : '') + primary('Got it', 'close', false));
    }
    function requestDetails() {
      var r = state.request;
      if (!r) return;
      openDialog('details', '<h2 id="co-dialog-title">Request details</h2>' + row('Request', r.id) + row('Status', r.status === 'failed' ? 'Returned' : r.status === 'success' ? 'Completed' : 'Processing') + row('Payout', m(r.amount)) + row('Payout account', esc(r.method) + ' · ' + mask(r.account)) +
        row('Locked at submission', m(r.freeze)) + (r.clear ? row('Clear on success', m(r.clear)) : '') +
        (r.type === 'free' ? row('Weekly cash-outs reserved', r.status === 'processing' ? '1' : '0') : '') +
        '<p>Only the funds in this request are affected. Other available funds can still be used.</p>' + primary('Got it', 'close', false));
    }
    document.querySelector('.co-board').addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.tab) { state.tab = button.dataset.tab; render(); return; }
      if (button.dataset.method) {
        if (modalKind === 'account') {
          if (accountDraft.method !== button.dataset.method) { accountDraft.method = button.dataset.method; accountDraft.account = ''; renderAccount(); }
        } else if (state.method !== button.dataset.method) {
          openAccount('page'); accountDraft.method = button.dataset.method; accountDraft.account = ''; renderAccount();
        }
        return;
      }
      if (button.dataset.demo) { demo(button.dataset.demo); return; }
      var action = button.dataset.action;
      if (action === 'review') openReview(false);
      if (action === 'close') cancelDialog();
      if (action === 'rules') rules();
      if (action === 'request-details') requestDetails();
      if (action === 'current-request' && pending()) { state.tab = state.request.type; render(); }
      if (action === 'dismiss-result' && state.request && !pending()) { state.request.dismissed = true; render(); }
      if (action === 'account') openAccount();
      if (action === 'limit') {
        var q = M.quote(state, 'deposit');
        openDialog('limit', '<h2 id="co-dialog-title">Your cash-out amount</h2>' + row('Corresponding deposit', m(state.depositBase)) + row('Total redemption limit · 10×', m(state.depositBase * 10)) + row('Already used', m(state.capUsed)) + row('Remaining limit', m(q.cap)) + '<p>We apply your eligible balance or the remaining limit, whichever is lower. Any amount above the limit is shown before you confirm.</p>' + primary('Got it', 'close', false));
      }
      if (action === 'save-account') {
        var input = document.getElementById('co-account-input');
        if (!input || input.value.trim().length < 3) { document.getElementById('co-account-error').textContent = 'Enter your payout account details.'; return; }
        var origin = accountOrigin;
        state.account = input.value.trim(); state.method = accountDraft.method; state.needsAccount = false;
        if (state.request && state.request.status === 'failed') state.request.dismissed = true;
        render();
        if (origin === 'review') openReview(false); else closeDialog();
      }
      if (action === 'submit' && modalKind === 'review') {
        var quote = M.quote(state, state.tab);
        if (!quote.canSubmit) { closeDialog(); render(); return; }
        if (reviewSnapshot !== signature(quote)) { openReview(true); return; }
        button.disabled = true;
        var r = M.submit(state, state.tab);
        closeDialog(); render();
        if (r) feedback.textContent = '已提交演示申请：冻结 ' + m(r.freeze) + '，到账 ' + m(r.amount) + '。展开下方可模拟申请结果。';
      }
    });
    document.addEventListener('keydown', function (event) {
      if (modal.hidden) {
        if (event.target.matches('[data-tab]') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault(); state.tab = state.tab === 'free' ? 'deposit' : 'free'; render(); document.querySelector('[data-tab="' + state.tab + '"]').focus();
        }
        return;
      }
      if (event.key === 'Escape') { cancelDialog(); return; }
      if (event.key === 'Tab') {
        var nodes = dialog.querySelectorAll('button:not(:disabled), input, a[href]');
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    function reset() { closeDialog(); state = M.create(scenario.value); render(); feedback.textContent = '已重置示例。可点击左侧按钮体验确认流程。'; }
    function demo(action) {
      if (action === 'reset') { reset(); return; }
      if (!pending()) return;
      var message = '';
      if (action === 'reward') { state.free += 1000; message = '免费奖励 +$10，旧申请冻结金额不变。'; }
      if (action === 'win' && state.free > 0) { state.free += 500; message = '免费游戏净赢 +$5，仍归属免费资金。'; }
      if (action === 'deposit') { state.newDeposit += 1000; message = '新充值 +$10，单独记录，不并入旧申请。'; }
      if (action === 'progress') { state.request.stage = Math.min(2, state.request.stage + 1); message = '已推进处理进度。'; }
      if (action === 'unknown') { M.settle(state, 'unknown'); message = '支付结果未知，继续核对，不退款。'; }
      if (action === 'success' || action === 'failed') {
        M.settle(state, action);
        message = action === 'success' ? '只结算旧申请，新增资金保留。' : '完整原路释放；示例要求更新收款账户。';
      }
      if (!modal.hidden) closeDialog();
      render(); feedback.textContent = message + ' 当前充值 ' + m(state.deposit + state.newDeposit) + ' / 免费 ' + m(state.free) + '。';
    }
    scenario.addEventListener('change', reset);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
