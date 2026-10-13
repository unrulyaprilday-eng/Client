const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const M = require('../custom/js/new-cash-out-model.js');
const root = path.resolve(__dirname, '..');
const name = '\u65b0\u63d0\u6b3e\u9875\u9762';
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let doc, page;
vm.runInNewContext(read('data/document.js'), { $axure: { loadDocument(d) { doc = d; } } });
vm.runInNewContext(read('files/' + name + '/data.js'), { $axure: { loadCurrentPage(p) { page = p; } } });
const flatten = nodes => nodes.flatMap(n => [n, ...flatten(n.children || [])]);
const all = flatten(doc.sitemap.rootNodes);
const ids = all.map(n => n.id).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, 'Nonempty sitemap IDs must be unique');
const node = all.filter(n => n.id === 'new_cash_out');
assert.equal(node.length, 1);
assert.equal(node[0].pageName, name);
assert.equal(node[0].url, name + '.html');
assert.ok(all.find(n => n.id === 'withdrawal_group').children.includes(node[0]));
assert.equal(page.page.packageId, node[0].id);
assert.equal(page.page.name, name);
assert.equal(page.url, node[0].url);
assert.equal(page.defaultAdaptiveView.size.width, 800);
assert.equal(page.defaultAdaptiveView.size.height, 926);
const html = read(name + '.html');
assert.ok(html.includes('data-axure-page-id="new_cash_out"'));
assert.ok(html.includes('width=800, initial-scale=1'));
assert.ok(html.includes('<div id="base"></div>'));
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  assert.ok(!/^https?:/.test(match[1]), 'External asset: ' + match[1]);
  assert.ok(fs.existsSync(path.join(root, match[1].split('?')[0])), 'Missing: ' + match[1]);
}
const files = [name + '.html', 'files/' + name + '/data.js', 'custom/js/new-cash-out.js', 'custom/js/new-cash-out-model.js', 'custom/css/new-cash-out.css', 'custom/docs/new-cash-out-backend.md', 'data/document.js', 'scripts/ai-menu-snapshot.json'];
for (const file of files) {
  const text = read(file);
  assert.ok(!text.includes('\uFFFD'), 'Replacement character: ' + file);
  assert.ok(!/\?{3,}/.test(text), 'Possible damaged text: ' + file);
}
assert.equal(name.codePointAt(0), 0x65b0);
assert.equal(JSON.stringify(JSON.parse(read('scripts/ai-menu-snapshot.json')).rootNodes), JSON.stringify(doc.sitemap.rootNodes));
for (const [scenario, amount, freeze] of [['deposit-ready', 4000, 4000], ['deposit-100', 10000, 10000], ['deposit-120', 10000, 12000], ['deposit-used', 6000, 12000]]) {
  const s = M.create(scenario);
  assert.equal(M.quote(s, 'deposit').amount, amount);
  const r = M.submit(s, 'deposit');
  assert.equal(r.freeze, freeze);
  assert.equal(r.clear, freeze - amount);
  assert.equal(s.deposit, 0);
  assert.equal(M.submit(s, 'deposit'), null, 'Duplicate submit must not create a request');
  const freeBefore = s.free;
  s.free += 1500;
  s.newDeposit += 1000;
  assert.ok(M.settle(s, 'unknown'));
  assert.equal(s.deposit, 0, 'Timeout must not refund');
  assert.ok(M.settle(s, 'failed'));
  assert.equal(s.deposit, freeze, 'Failure must restore all frozen funds');
  assert.equal(s.free, freeBefore + 1500);
  assert.equal(s.newDeposit, 1000);
  assert.equal(s.depositLeft, 0);
  assert.equal(M.quote(s, 'deposit').eligible, true, 'Financial eligibility must survive release');
  assert.equal(M.quote(s, 'deposit').canSubmit, false, 'Account requirement must still block submission');
  assert.equal(M.settle(s, 'failed'), false);
  assert.equal(M.settle(s, 'success'), false, 'Terminal outcome cannot settle twice');
}
for (const type of ['free', 'deposit']) {
  const s = M.create(type === 'free' ? 'free-ready' : 'deposit-120');
  const previousTimes = s.cashOutUsed;
  const r = M.submit(s, type);
  if (type === 'free') assert.equal(M.quote(s, type).times, 1, 'Reserve one weekly use');
  else assert.equal(M.quote(s, type).cap, 0, 'Reserve redemption cap');
  s.free += 1500;
  s.newDeposit += 1000;
  const freeBefore = s.free;
  assert.ok(M.settle(s, 'success'));
  assert.equal(s.free, freeBefore, 'Success must preserve new rewards');
  assert.equal(s.newDeposit, 1000, 'Success must preserve new deposits');
  assert.equal(M.settle(s, 'success'), false);
  if (type === 'free') assert.equal(s.cashOutUsed, previousTimes + 1);
  else assert.equal(s.capUsed, r.amount);
}
for (const scenario of ['free-locked', 'free-unmet', 'exhausted', 'empty']) assert.equal(M.quote(M.create(scenario), 'free').eligible, false);
assert.equal(M.quote(M.create('deposit-unmet'), 'deposit').eligible, false);
const freeFailure = M.create('free-ready');
M.submit(freeFailure, 'free');
freeFailure.free += 1500;
assert.equal(M.quote(freeFailure, 'free').times, 1);
M.settle(freeFailure, 'failed');
assert.equal(freeFailure.free, 14150, 'Return original Free Play without overwriting new winnings');
assert.equal(M.quote(freeFailure, 'free').times, 2, 'Release reserved weekly use');
assert.equal(M.quote(freeFailure, 'free').playthroughLeft, 0, 'Keep original completed playthrough');
const noAccount = M.create('deposit-ready');
noAccount.account = '';
assert.equal(M.quote(noAccount, 'deposit').eligible, true);
assert.equal(M.quote(noAccount, 'deposit').amount, 4000, 'A missing payout account must not zero the eligible amount');
assert.equal(M.submit(noAccount, 'deposit'), null, 'Cannot submit before account completion');
assert.ok(!html.includes('value="loading"') && !html.includes('value="error"'), 'Generic framework owns loading states');
assert.ok(!html.includes('VIP required'), 'Do not label default VIP members as non-VIP');

const configured = M.create('free-ready');
configured.vipCashOut.tierLabel = 'VIP 1';
assert.equal(M.quote(configured, 'free').eligible, true, 'Availability must come from config, not a hardcoded VIP level');
const originalQuote = M.quote(configured, 'free');
configured.retentionMet = !configured.retentionMet;
configured.playerType = 'deposit';
assert.deepEqual(M.quote(configured, 'free'), originalQuote, 'Retention and player type cannot add withdrawal conditions');
const originalUses = configured.cashOutUsed;
configured.free += 1000;
assert.equal(configured.cashOutUsed, originalUses, 'Claiming a reward cannot add or reset uses');
assert.equal(M.quote(configured, 'free').times, originalQuote.times);
configured.vipCashOut.amount = 2000;
configured.vipCashOut.requiredBalance = 20000;
configured.vipCashOut.playthroughRequired = 110000;
configured.vipCashOut.limit = 5;
configured.vipCashOut.period = 'day';
assert.equal(M.quote(configured, 'free').amount, 2000);
assert.equal(M.quote(configured, 'free').times, 4);
assert.equal(M.quote(configured, 'free').playthroughLeft, 10000);
assert.equal(M.quote(configured, 'free').eligible, false, 'Use the configured balance and playthrough requirements');
configured.free = 20000;
configured.freePlaythroughDone = 110000;
const configRequest = M.submit(configured, 'free');
assert.ok(configRequest);
configured.vipCashOut.amount = 5000;
configured.vipCashOut.enabled = false;
assert.equal(configRequest.amount, 2000);
assert.equal(configRequest.vipConfig.amount, 2000, 'The request retains its rule snapshot');
assert.equal(configRequest.vipConfig.period, 'day');
const independentDeposit = M.create('deposit-ready');
independentDeposit.vipCashOut.enabled = false;
independentDeposit.retentionMet = false;
assert.equal(M.quote(independentDeposit, 'deposit').canSubmit, true, 'Deposit rules must stay independent of Free Play VIP eligibility and retention');

// Run handlers with a minimal DOM facade; no browser, network or payment calls.
function uiScenario(value, configure) {
  const element = (dataset = {}) => ({ dataset, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; }, setAttribute() {}, focus() {} });
  const elements = Object.fromEntries(['co-content', 'co-modal', 'co-dialog', 'co-scenario', 'co-demo-result', 'co-account-input', 'co-account-error'].map(id => [id, element()]));
  elements['co-modal'].hidden = true;
  elements['co-scenario'].value = value;
  const board = element();
  const tabs = [element({ tab: 'free' }), element({ tab: 'deposit' })];
  const document = {
    readyState: 'complete', activeElement: tabs[0],
    getElementById(id) { return elements[id]; }, contains() { return true; }, addEventListener() {},
    querySelector(selector) { return selector === '.co-board' ? board : tabs.find(tab => selector.includes(tab.dataset.tab)); },
    querySelectorAll(selector) { return selector === '[data-tab]' ? tabs : []; }
  };
  const uiModel = Object.assign({}, M, { create(scenario) { const state = M.create(scenario); if (configure) configure(state); return state; } });
  vm.runInNewContext(read('custom/js/new-cash-out.js'), { document, window: { CashOutDemo: uiModel } });
  return { elements, page: () => elements['co-content'].innerHTML, popup: () => elements['co-dialog'].innerHTML,
    click(dataset) { const button = element(dataset); board.handlers.click({ target: { closest() { return button; } } }); } };
}
const ui = uiScenario('free-ready');
assert.ok(ui.page().includes('On success'));
assert.ok(!ui.page().includes('Balance locked on submission'), 'Keep full freeze details out of the main page');
ui.click({ action: 'review' });
assert.ok(ui.popup().includes('Balance locked on submission'));
ui.click({ action: 'account' });
ui.click({ method: 'PayPal' });
ui.click({ action: 'close' });
assert.ok(ui.popup().includes('Review Cash-Out') && ui.popup().includes('Cash App'), 'Cancel account changes must preserve the original account and return to review');
ui.click({ action: 'account' });
ui.click({ method: 'PayPal' });
ui.elements['co-account-input'].value = 'demo@example.com';
ui.click({ action: 'save-account' });
assert.ok(ui.popup().includes('Review Cash-Out') && ui.popup().includes('PayPal'), 'Saving from review must return to review with the changed account');
ui.click({ action: 'submit' });
assert.ok(ui.page().includes('Cash-out requested'));
assert.ok(!ui.page().includes('Not ready yet'), 'Do not show an unmet application form below a processing request');
ui.click({ demo: 'success' });
assert.ok(ui.page().includes('Cash-out completed') && !ui.page().includes('Not ready yet'), 'Show one result view at a time');
const depositUi = uiScenario('deposit-120');
assert.ok(depositUi.page().includes('$20.00 above your remaining limit'));
depositUi.click({ action: 'review' });
depositUi.click({ action: 'submit' });
depositUi.click({ demo: 'reward' });
depositUi.click({ demo: 'win' });
depositUi.click({ demo: 'failed' });
assert.ok(depositUi.page().includes('$120.00') && depositUi.page().includes('Returned to Deposit Balance'));
depositUi.click({ tab: 'free' });
assert.ok(depositUi.page().includes('$15.00'), 'The UI must retain new rewards and their game result after releasing the old request');
const closedUi = uiScenario('free-locked');
assert.ok(closedUi.page().includes('Not available at your current VIP level (VIP 1)'));
assert.ok(!closedUi.page().includes('VIP required') && !closedUi.page().includes('VIP 2 required'));
const dailyUi = uiScenario('exhausted', s => {
  s.vipCashOut.tierLabel = 'VIP 1';
  s.vipCashOut.period = 'day';
  s.vipCashOut.resetAt = 'Oct 14, 2026, 00:00 UTC';
});
assert.ok(dailyUi.page().includes('Cash-outs left today') && dailyUi.page().includes('Oct 14, 2026, 00:00 UTC'));
assert.ok(!dailyUi.page().includes('this week'));
console.log('PASS: menu/page identity, relative assets, 800x926 viewport, UTF-8 and snapshot.');
console.log('PASS: automatic amounts, full freeze, quota reservation, timeout handling, duplicate events and new-fund isolation.');
console.log('PASS: review/account return paths, cancellation, isolated result screens and visible new-fund balances (without a browser).');
console.log('PASS: VIP configuration controls availability, amounts, requirements and periods independently of retention and player type.');
