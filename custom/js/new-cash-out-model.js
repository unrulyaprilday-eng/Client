(function (root) {
  'use strict';
  function create(scenario) {
    var state = {
      tab: 'free', vip: true, free: 12650, deposit: 4000, newDeposit: 0, bonus: 2000,
      fixed: 1000, requiredFree: 10000, freeLeft: 0, weeklyLimit: 3, weeklyUsed: 1,
      depositBase: 1000, depositLeft: 0, capUsed: 0,
      resetAt: 'Oct 19, 2026, 00:00 UTC', account: '$jordan', method: 'Cash App',
      needsAccount: false, request: null, serial: 0
    };
    if (scenario === 'regular') { state.vip = false; state.free = 6800; }
    if (scenario === 'free-unmet') { state.free = 6800; state.freeLeft = 12000; }
    if (scenario === 'exhausted') { state.weeklyUsed = 3; }
    if (scenario.indexOf('deposit') === 0) { state.tab = 'deposit'; state.free = 0; }
    if (scenario === 'deposit-unmet') { state.deposit = 2100; state.depositLeft = 10000; state.account = ''; }
    if (scenario === 'deposit-100') state.deposit = 10000;
    if (scenario === 'deposit-120') state.deposit = 12000;
    if (scenario === 'deposit-used') { state.deposit = 12000; state.capUsed = 4000; }
    if (scenario === 'empty') { state.free = 0; state.deposit = 0; }
    return state;
  }
  function quote(s, type) {
    var pending = s.request && s.request.status === 'processing';
    var heldTimes = pending && s.request.type === 'free' ? 1 : 0;
    var heldCap = pending && s.request.type === 'deposit' ? s.request.amount : 0;
    var left = Math.max(0, s.weeklyLimit - s.weeklyUsed - heldTimes);
    var cap = Math.max(0, s.depositBase * 10 - s.capUsed - heldCap);
    var reasons = [];
    if (type === 'free') {
      if (!s.vip) reasons.push('VIP membership is required.');
      if (s.free < s.requiredFree) reasons.push('Reach ' + money(s.requiredFree) + ' in Free Play.');
      if (s.freeLeft > 0) reasons.push('Complete ' + money(s.freeLeft) + ' more in playthrough.');
      if (!left) reasons.push('Your weekly cash-outs have been used.');
    } else {
      if (s.deposit < s.depositBase * 3) reasons.push('Reach ' + money(s.depositBase * 3) + ' in Deposit Balance.');
      if (s.depositLeft > 0) reasons.push('Complete ' + money(s.depositLeft) + ' more in playthrough.');
      if (!cap) reasons.push('No redemption allowance remains for this deposit.');
    }
    if (pending) reasons.push('A cash-out is in progress.');
    var balance = s[type];
    var amount = type === 'free' ? s.fixed : Math.min(balance, cap);
    return { eligible: !reasons.length, canSubmit: !reasons.length && !!s.account && !s.needsAccount, reasons: reasons, amount: amount,
      freeze: balance, clear: Math.max(0, balance - amount), times: left, cap: cap };
  }
  function submit(s, type) {
    var q = quote(s, type);
    if (!q.canSubmit) return null;
    var req = { id: 'CO-DEMO-' + (++s.serial).toString().padStart(4, '0'), type: type,
      status: 'processing', stage: 0, freeze: q.freeze, amount: q.amount, clear: q.clear,
      account: s.account, method: s.method, ruleVersion: 'prototype-v1',
      source: type === 'free' ? 'reward-batch-demo' : 'deposit-batch-demo',
      playthroughLeft: type === 'free' ? s.freeLeft : s.depositLeft };
    s[type] -= req.freeze;
    s.request = req;
    return req;
  }
  function settle(s, result) {
    var r = s.request;
    if (!r || r.status !== 'processing') return false;
    if (result === 'unknown') { r.stage = 2; r.uncertain = true; return true; }
    if (result !== 'success' && result !== 'failed') return false;
    r.status = result;
    if (result === 'failed') { s[r.type] += r.freeze; s.needsAccount = true; }
    else if (r.type === 'free') s.weeklyUsed += 1;
    else s.capUsed += r.amount;
    return true;
  }
  function money(cents) { return '$' + (cents / 100).toFixed(2); }
  var api = { create: create, quote: quote, submit: submit, settle: settle, money: money };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CashOutDemo = api;
})(typeof window !== 'undefined' ? window : this);
