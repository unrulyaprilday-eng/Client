(function (root) {
  'use strict';
  function create(scenario) {
    var state = {
      tab: 'free', playerType: 'free', retentionMet: false,
      free: 12650, deposit: 0, newDeposit: 0, bonus: 2000,
      // Example backend response only; no level threshold or retention gate is inferred here.
      vipCashOut: {
        enabled: true, tierLabel: 'VIP 2', amount: 1000, requiredBalance: 10000,
        playthroughRequired: 100000, limit: 3, period: 'week',
        resetAt: 'Oct 19, 2026, 00:00 UTC', version: 'demo-vip-cash-out-v1'
      },
      freePlaythroughDone: 100000, cashOutUsed: 1,
      depositBase: 1000, depositLeft: 0, capUsed: 0,
      account: '$jordan', method: 'Cash App',
      needsAccount: false, request: null, serial: 0
    };
    if (scenario === 'free-locked') {
      state.vipCashOut.enabled = false;
      state.vipCashOut.tierLabel = 'VIP 1';
      state.vipCashOut.amount = 0;
      state.vipCashOut.requiredBalance = 0;
      state.vipCashOut.playthroughRequired = 0;
      state.vipCashOut.limit = 0;
      state.cashOutUsed = 0;
      state.freePlaythroughDone = 0;
      state.free = 6800;
    }
    if (scenario === 'free-unmet') { state.free = 6800; state.freePlaythroughDone = 88000; }
    if (scenario === 'exhausted') { state.cashOutUsed = state.vipCashOut.limit; }
    if (scenario.indexOf('deposit') === 0) { state.tab = 'deposit'; state.playerType = 'deposit'; state.deposit = 4000; state.free = 0; }
    if (scenario === 'deposit-unmet') { state.deposit = 2100; state.depositLeft = 10000; state.account = ''; }
    if (scenario === 'deposit-100') state.deposit = 10000;
    if (scenario === 'deposit-120') state.deposit = 12000;
    if (scenario === 'deposit-used') { state.deposit = 12000; state.capUsed = 4000; }
    if (scenario === 'empty') { state.free = 0; state.deposit = 0; }
    return state;
  }
  function quote(s, type) {
    var config = s.vipCashOut;
    var pending = s.request && s.request.status === 'processing';
    var heldTimes = pending && s.request.type === 'free' ? 1 : 0;
    var heldCap = pending && s.request.type === 'deposit' ? s.request.amount : 0;
    var left = Math.max(0, config.limit - s.cashOutUsed - heldTimes);
    var playthroughLeft = Math.max(0, config.playthroughRequired - s.freePlaythroughDone);
    var cap = Math.max(0, s.depositBase * 10 - s.capUsed - heldCap);
    var reasons = [];
    if (type === 'free') {
      if (!config.enabled) reasons.push('Free Play cash-out is not available at your current VIP level.');
      else {
        if (s.free < config.requiredBalance) reasons.push('Reach ' + money(config.requiredBalance) + ' in Free Play.');
        if (playthroughLeft > 0) reasons.push('Complete ' + money(playthroughLeft) + ' more in playthrough.');
        if (!left) reasons.push('Your cash-out limit has been reached.');
      }
    } else {
      if (s.deposit < s.depositBase * 3) reasons.push('Reach ' + money(s.depositBase * 3) + ' in Deposit Balance.');
      if (s.depositLeft > 0) reasons.push('Complete ' + money(s.depositLeft) + ' more in playthrough.');
      if (!cap) reasons.push('No redemption allowance remains for this deposit.');
    }
    if (pending) reasons.push('A cash-out is in progress.');
    var balance = s[type];
    var amount = type === 'free' ? config.amount : Math.min(balance, cap);
    return { eligible: !reasons.length, canSubmit: !reasons.length && !!s.account && !s.needsAccount, reasons: reasons, amount: amount,
      freeze: balance, clear: Math.max(0, balance - amount), times: left, cap: cap, playthroughLeft: playthroughLeft };
  }
  function submit(s, type) {
    var q = quote(s, type);
    if (!q.canSubmit) return null;
    var req = { id: 'CO-DEMO-' + (++s.serial).toString().padStart(4, '0'), type: type,
      status: 'processing', stage: 0, freeze: q.freeze, amount: q.amount, clear: q.clear,
      account: s.account, method: s.method, ruleVersion: type === 'free' ? s.vipCashOut.version : 'demo-deposit-v1',
      vipConfig: type === 'free' ? JSON.parse(JSON.stringify(s.vipCashOut)) : null,
      source: type === 'free' ? 'reward-batch-demo' : 'deposit-batch-demo',
      playthroughLeft: type === 'free' ? q.playthroughLeft : s.depositLeft };
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
    else if (r.type === 'free') s.cashOutUsed += 1;
    else s.capUsed += r.amount;
    return true;
  }
  function money(cents) { return '$' + (cents / 100).toFixed(2); }
  var api = { create: create, quote: quote, submit: submit, settle: settle, money: money };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CashOutDemo = api;
})(typeof window !== 'undefined' ? window : this);
