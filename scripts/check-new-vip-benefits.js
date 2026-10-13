// Offline state-transition checks; no browser or live service is used.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const pageName = '\u65b0VIP \u5c55\u793a';
const html = fs.readFileSync(path.join(root, pageName + '.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'custom/js/new-vip-benefits.js'), 'utf8');
const nodes = new Map(), groups = { demo: [], dialog: [], close: [], level: [] };
function node(attrs = '') {
  const result = { dataset: {}, hidden: /\bhidden\b/.test(attrs), disabled: false, textContent: '', innerHTML: '', handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    setAttribute(key, value) { this[key] = value; }, focus() {}, closest() { return null; },
    querySelector() { return this.caption || (this.caption = { textContent: '' }); },
    offsetLeft: 0, offsetWidth: 96, clientWidth: 388 };
  for (const match of attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)) result.dataset[match[1]] = match[2];
  return result;
}
for (const tag of html.matchAll(/<[a-z][^>]*>/g)) {
  const attrs = tag[0], item = node(attrs), id = /\bid="([^"]+)"/.exec(attrs);
  if (id) { assert(!nodes.has(id[1]), 'Duplicate HTML id'); nodes.set(id[1], item); }
  if ('demo' in item.dataset) groups.demo.push(item);
  if ('dialog' in item.dataset) groups.dialog.push(item);
  if ('level' in item.dataset) groups.level.push(item);
  if (/\bdata-close\b/.test(attrs)) groups.close.push(item);
}
const dialog = node(), compareSelect = node(), timers = new Map(); let serial = 0;
const document = { readyState: 'complete', getElementById: id => nodes.get(id),
  querySelector: selector => selector === '.vip-dialog' ? dialog : selector === '[data-compare-level]' ? compareSelect : groups.level.find(item => selector === '[data-level="' + item.dataset.level + '"]'),
  querySelectorAll: selector => groups[selector.slice(6, -1)] || [], addEventListener() {} };
for (const match of source.matchAll(/el\('([^']+)'\)/g)) assert(nodes.has(match[1]), 'Missing DOM id: ' + match[1]);
vm.runInNewContext(source, { document, setTimeout(fn, delay) { timers.set(++serial, { fn, delay }); return serial; }, clearTimeout(id) { timers.delete(id); } });
const get = id => nodes.get(id);
const click = item => item.handlers.click.call(item, { target: item });
const demo = value => click(groups.demo.find(item => item.dataset.demo === value));
const runClaim = () => { for (const [id, timer] of [...timers]) if (timer.delay === 650) { timers.delete(id); timer.fn(); } };
const pick = value => get('dialog-content').handlers.click({ target: { closest: selector => selector === '[data-pick-level]' ? { dataset: { pickLevel: String(value) } } : null } });
const action = selector => get('dialog-content').handlers.click({ target: { closest: value => value === selector ? {} : null } });
assert.equal(groups.level.length, 15);
assert.equal(get('preview-panel').hidden, false);
assert.equal(get('benefits-panel').hidden, true);
assert.equal(get('preview-title').textContent, 'VIP 2');
assert.equal(groups.level[1]['aria-pressed'], 'true');
assert.equal(groups.level[0].caption.textContent, 'Current');
assert.equal(get('return-current').hidden, false);
assert.match(get('current-reward-title').textContent, /VIP 1.*\$5/);
click(get('claim-button')); runClaim(); assert.notEqual(get('claim-button').textContent, 'Claimed today');
click(get('return-current'));
assert.equal(get('benefits-panel').hidden, false);
assert.equal(get('daily-amount').textContent, '$5');
assert.equal(get('current-badge').textContent, 'VIP 1');
assert.equal(get('claim-button').disabled, false);
assert.equal(get('cash-deposit-link').hidden, true);
click(get('claim-button')); runClaim(); assert.equal(get('claim-button').textContent, 'Claimed today');
click(groups.level[1]); assert.equal(get('preview-title').textContent, 'VIP 2');
assert.equal(get('benefits-panel').hidden, true);
assert.equal(get('return-current').hidden, true);
click(groups.level[0]); assert.equal(get('claim-button').textContent, 'Claimed today');
click(get('reset-demo'));
click(get('cash-deposit-demo')); assert.equal(get('cash-deposit-link').hidden, false);
assert.equal(get('claim-button').disabled, false);
click(get('progress-button')); assert.match(get('dialog-content').innerHTML, /credited deposit/);
click(groups.close[0]);
click(get('claim-lock-demo')); assert.equal(get('claim-button').disabled, true);
click(get('claim-button')); runClaim(); assert.equal(get('claim-button').textContent, 'Not eligible to claim');
click(get('progress-button')); assert.equal(get('vip-overlay').hidden, false);
click(groups.close[0]); click(get('claim-lock-demo'));
pick(15); assert.match(get('deposit-link').href, /targetVip=15&/); assert.equal(get('preview-daily').textContent, '—');
assert.equal(get('current-badge').textContent, 'VIP 1');
demo('paid'); assert.equal(get('benefits-panel').hidden, false); assert.equal(get('cash-count').textContent, '2 of 3');
click(groups.level[0]); assert.equal(get('deposit-link').hidden, true); assert.equal(get('benefits-panel').hidden, true);
pick(2); assert.equal(get('benefits-panel').hidden, false);
assert.equal(groups.level[1].caption.textContent, 'Current');
click(get('claim-button')); click(get('claim-button'));
assert.equal([...timers.values()].filter(timer => timer.delay === 650).length, 1);
runClaim(); assert.equal(get('claim-button').textContent, 'Claimed today');
click(get('progress-button')); assert.match(get('dialog-content').innerHTML, /\$75 \/ \$100/);
click(groups.close[0]); click(get('next-level'));
assert.equal(get('preview-title').textContent, 'VIP 3'); assert.equal(get('current-badge').textContent, 'VIP 2');
click(get('return-current')); assert.equal(get('claim-button').textContent, 'Claimed today');
click(get('fail-demo')); click(get('claim-button')); runClaim();
assert.equal(get('claim-button').disabled, false); assert.match(get('vip-toast').textContent, /Unable to claim/);
click(get('claim-button')); runClaim(); assert.equal(get('claim-button').textContent, 'Claimed today');
demo('paid'); click(get('claim-button')); demo('unpaid'); runClaim();
assert.equal(get('benefits-panel').hidden, true); assert.equal(get('current-badge').textContent, 'VIP 1');
assert.equal(get('preview-title').textContent, 'VIP 2');
assert.equal(get('claim-button').disabled, false);
assert.notEqual(get('claim-button').textContent, 'Claimed today');
click(groups.dialog.find(item => item.dataset.dialog === 'compare'));
assert.match(get('dialog-content').innerHTML, /class="vip-compare-table"/);
assert.match(get('dialog-content').innerHTML, /value="0"[^>]*>Free</);
assert.match(get('dialog-content').innerHTML, /value="15"/);
assert.equal((get('dialog-content').innerHTML.match(/<tr>/g) || []).length, 7);
get('dialog-content').handlers.change({ target: { value: '15', matches: () => true } });
assert.match(get('dialog-content').innerHTML, /data-pick-level="15"/);
get('dialog-content').handlers.change({ target: { value: '0', matches: () => true } });
assert.doesNotMatch(get('dialog-content').innerHTML, /data-pick-level="0"/);
click(groups.close[0]);
demo('paid'); click(get('cash-ready-demo'));
assert.match(get('dialog-content').innerHTML, /Ready to cash out/);
assert.doesNotMatch(get('dialog-content').innerHTML, /data-request-cash disabled/);
action('[data-request-cash]'); assert.equal(get('dialog-title').textContent, 'Confirm cash-out');
assert.match(get('dialog-content').innerHTML, /included:.*\$100/);
action('[data-back-progress]'); assert.match(get('dialog-content').innerHTML, /\$100 \/ \$100/);
action('[data-request-cash]'); action('[data-confirm-cash]'); action('[data-confirm-cash]');
assert.equal([...timers.values()].filter(timer => timer.delay === 700).length, 1);
assert.equal(get('cash-count').textContent, '3 of 3');
for (const [id, timer] of [...timers]) if (timer.delay === 700) { timers.delete(id); timer.fn(); }
assert.equal(get('dialog-title').textContent, 'Cash-out successful');
assert.equal(get('cash-count').textContent, '2 of 3');
action('[data-close-content]'); click(get('progress-button'));
assert.match(get('dialog-content').innerHTML, /\$0 \/ \$100/);
click(get('cash-limit-demo')); assert.match(get('dialog-content').innerHTML, /Daily limit reached/);
assert.match(get('dialog-content').innerHTML, /data-request-cash disabled/);
demo('paid'); click(get('progress-button'));
assert.match(get('dialog-content').innerHTML, /\$420 \/ \$1000/);

// Weekly retention is separate from reward and cash-out eligibility.
demo('unpaid'); click(groups.level[0]);
assert.equal(get('retention-expiry').textContent, 'No expiration');
assert.equal(get('retention-progress').textContent, '$0 / $0');
assert.equal(get('retention-status').textContent, '✓ VIP 1 secured');
assert.equal(get('claim-button').disabled, false);
click(groups.dialog.find(item => item.dataset.dialog === 'rules'));
assert.equal(get('dialog-title').textContent, 'Level & renewal rules');
assert.match(get('dialog-content').innerHTML, /00:00 on Monday/);
assert.match(get('dialog-content').innerHTML, /drops by one.*minimum of VIP 1/);
assert.match(get('dialog-content').innerHTML, /cash-outs follow your current VIP level/);

demo('paid');
assert.equal(get('retention-expiry').textContent, 'Oct 18, 2026');
assert.equal(get('retention-progress').textContent, '$30 / $49.95');
assert.equal(get('retention-status').textContent, 'Expected level after expiry: VIP 1');
assert.equal(get('retention-status')['data-secured'], 'false');
assert(!groups.dialog.some(item => item.dataset.dialog === 'retention'), 'Retention summary must not open the old details dialog');
click(get('retention-unmet-demo'));
assert.equal(get('current-badge').textContent, 'VIP 2', 'Unmet retention must not downgrade before review');
pick(3);
assert.equal(get('benefits-panel').hidden, true, 'Retention belongs to the current level, not the preview');
assert.match(get('preview-threshold').textContent, /\$29.99/);

click(get('retention-unmet-demo')); click(get('cash-ready-demo'));
const readyContent = get('dialog-content').innerHTML;
const readyCount = get('cash-count').textContent;
assert.match(readyContent, /Ready to cash out/);
assert.doesNotMatch(readyContent, /data-request-cash disabled/);
click(get('retention-met-demo'));
assert.equal(get('retention-status').textContent, '✓ VIP 2 secured');
assert.equal(get('retention-status')['data-secured'], 'true');
assert.equal(get('retention-progress').textContent, '$49.95 / $49.95');
assert.equal(get('retention-expiry').textContent, 'Oct 18, 2026', 'Secured status must not invent a new validity date');
assert.equal(get('current-badge').textContent, 'VIP 2');
assert.equal(get('claim-button').disabled, false);
assert.equal(get('cash-count').textContent, readyCount, 'Retention must not grant or reset attempts');
click(get('progress-button'));
assert.equal(get('dialog-content').innerHTML, readyContent, 'Securing retention must not alter cash-out eligibility or playthrough');
click(get('retention-unmet-demo'));
assert.equal(get('retention-progress').textContent, '$30 / $49.95');
assert.equal(get('retention-status').textContent, 'Expected level after expiry: VIP 1');
click(get('progress-button')); action('[data-request-cash]'); action('[data-confirm-cash]');
for (const [id, timer] of [...timers]) if (timer.delay === 700) { timers.delete(id); timer.fn(); }
assert.equal(get('retention-progress').textContent, '$30 / $49.95', 'Cash-out must not reset retention progress');
assert.equal(get('retention-status').textContent, 'Expected level after expiry: VIP 1');
demo('unpaid');
assert.equal(get('retention-expiry').textContent, 'No expiration', 'Returning to VIP1 must clear stale retention state');
assert.equal(get('retention-status').textContent, '✓ VIP 1 secured');

for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert(fs.existsSync(path.join(root, match[1].split('?')[0])), 'Missing asset');
assert(!html.includes('\ufffd') && !html.includes('????'), 'Encoding');
console.log('PASS: VIP previews/rewards, 15 levels, comparison, claim retry, cash-out confirmation/limits, weekly retention states and downgrade copy, independent eligibility/playthrough, DOM and assets.');
