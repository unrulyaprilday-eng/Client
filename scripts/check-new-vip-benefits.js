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
  const result = { dataset: {}, hidden: /\bhidden\b/.test(attrs), disabled: false, textContent: '', innerHTML: '', handlers: {}, style: {},
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
const runTimer = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
const pick = value => get('dialog-content').handlers.click({ target: { closest: selector => selector === '[data-pick-level]' ? { dataset: { pickLevel: String(value) } } : null } });
const action = selector => get('dialog-content').handlers.click({ target: { closest: value => value === selector ? {} : null } });

assert.deepEqual(groups.level.map(item => item.dataset.level), ['0', '1', '2', '3']);
assert.equal(get('current-badge').textContent, 'Free member');
assert.equal(get('level-tabs').hidden, false, 'The unpaid VIP1 preview keeps the four-level selector visible');
assert.equal(get('claim-foot').hidden, true, 'The unclaimed reward has no extra helper line');
assert.match(html, /width=800, initial-scale=1/);
assert.match(fs.readFileSync(path.join(root, 'files', pageName, 'data.js'), 'utf8'), /"width": 800, "height": 926/);
assert.match(html, /data-level="0"[^>]*>Free</);
assert.equal(get('benefits-panel').hidden, true, 'The default VIP1 preview must not show the VIP0 claim card');
assert.equal(get('preview-title').textContent, 'VIP 1');
assert.match(get('preview-threshold').textContent, /\$9\.99 in weekly deposits/);
assert.match(get('preview-count').textContent, /1 cash-out \/ week/);
assert.match(get('deposit-link').href, /targetVip=1&/);
click(groups.level[0]);
assert.equal(get('benefits-panel').hidden, false);
assert.equal(get('daily-amount').textContent, '$1');
click(get('claim-button')); runTimer(650);
assert.equal(get('claim-button').textContent, 'Claimed today', 'VIP0 can claim its daily reward on the Free tab');
assert.equal(get('claim-foot').hidden, false, 'Claim confirmation appears after claiming');
click(groups.level[1]);
assert.equal(get('preview-panel').hidden, false);
assert.equal(get('benefits-panel').hidden, true);
assert.equal(get('deposit-link').href, '存款.html?targetVip=1&source=vip-benefits');
click(groups.level[3]);
assert.equal(get('preview-title').textContent, 'VIP 3');
assert.match(get('preview-threshold').textContent, /\$59\.99 in weekly deposits/);
assert.match(get('deposit-link').href, /targetVip=3&/);
assert.equal(get('current-badge').textContent, 'Free member', 'Preview must not change the actual level');

click(get('reset-demo'));
assert.equal(get('current-badge').textContent, 'Free member');
click(get('claim-lock-demo'));
assert.equal(get('claim-button').disabled, true);
click(get('claim-button')); runTimer(650);
assert.equal(get('claim-button').textContent, 'Not eligible to claim');
click(get('claim-lock-demo'));
click(get('cash-deposit-demo'));
assert.equal(get('cash-deposit-link').hidden, false);
click(get('progress-button'));
assert.match(get('dialog-content').innerHTML, /credited deposit/);
click(groups.close[0]);

demo('paid');
assert.equal(get('current-badge').textContent, 'VIP 2');
assert.equal(get('level-tabs').hidden, true, 'The VIP2 current-benefits view hides the preview selector');
assert.equal(get('claim-foot').hidden, true, 'The VIP2 reward card stays compact before claiming');
assert.equal(get('cash-count').textContent, '2 of 3');
assert.equal(get('daily-amount').textContent, '$10');
assert.equal(get('deposit-link').hidden, true, 'Current VIP2 view should not show an upgrade CTA');
click(groups.level[3]);
assert.equal(get('deposit-link').href, '存款.html?targetVip=3&source=vip-benefits');
click(groups.level[2]);
click(get('claim-button')); runTimer(650);
assert.equal(get('claim-button').textContent, 'Claimed today');
click(get('progress-button'));
assert.match(get('dialog-content').innerHTML, /\$75 \/ \$100/);
click(groups.close[0]);
click(get('fail-demo')); click(get('claim-button')); runTimer(650);
assert.equal(get('claim-button').disabled, false);
assert.match(get('vip-toast').textContent, /Unable to claim/);
click(get('claim-button')); runTimer(650);
assert.equal(get('claim-button').textContent, 'Claimed today');

demo('unpaid');
assert.equal(get('level-tabs').hidden, false, 'Switching back to an unpaid account restores the level selector');
click(groups.dialog.find(item => item.dataset.dialog === 'compare'));
assert.match(get('dialog-content').innerHTML, /class="vip-compare-table"/);
assert.match(get('dialog-content').innerHTML, /Cash-outs per week/);
assert.match(get('dialog-content').innerHTML, /value="1"[^>]*>VIP 1/);
assert.match(get('dialog-content').innerHTML, /value="3"/);
assert.doesNotMatch(get('dialog-content').innerHTML, /value="4"/);
assert.equal((get('dialog-content').innerHTML.match(/<tr>/g) || []).length, 7);
get('dialog-content').handlers.change({ target: { value: '3', matches: () => true } });
assert.match(get('dialog-content').innerHTML, /data-pick-level="3"/);
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
runTimer(700);
assert.equal(get('dialog-title').textContent, 'Cash-out successful');
assert.match(get('dialog-content').innerHTML, /left this week/);
assert.equal(get('cash-count').textContent, '2 of 3');
action('[data-close-content]'); click(get('progress-button'));
assert.match(get('dialog-content').innerHTML, /\$0 \/ \$100/);
click(get('cash-limit-demo'));
assert.match(get('dialog-content').innerHTML, /Weekly limit reached/);
assert.match(get('dialog-content').innerHTML, /data-request-cash disabled/);
demo('paid'); click(get('progress-button'));
assert.match(get('dialog-content').innerHTML, /\$420 \/ \$1000/);

// Weekly retention remains separate from daily claims and cash-out eligibility.
demo('unpaid'); click(groups.level[0]);
assert.equal(get('retention-expiry').textContent, 'No expiration');
assert.equal(get('retention-status').hidden, true);
click(groups.dialog.find(item => item.dataset.dialog === 'rules'));
assert.match(get('dialog-content').innerHTML, /00:00 on Monday/);
assert.match(get('dialog-content').innerHTML, /minimum of VIP 0/);
click(groups.close[0]);
demo('paid');
assert.equal(get('retention-expiry').textContent, 'Oct 18, 2026');
assert.equal(get('retention-status').hidden, false);
assert.equal(get('retention-status').textContent, 'Expected level after expiry: VIP 1');
click(get('retention-unmet-demo'));
assert.equal(get('current-badge').textContent, 'VIP 2', 'Unmet retention must not downgrade before review');
click(get('retention-met-demo'));
assert.equal(get('retention-status').hidden, true);
assert.equal(get('cash-count').textContent, '2 of 3');

for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert(fs.existsSync(path.join(root, match[1].split('?')[0])), 'Missing asset: ' + match[1]);
assert(!html.includes('\ufffd') && !html.includes('????'), 'Encoding');
assert(!html.includes('vip-level-table'), 'Removed the long all-level table');
console.log('PASS: compact VIP0-VIP3 preview, VIP0 daily claim, level deposit thresholds, comparison, weekly cash-out flows and renewal states.');
