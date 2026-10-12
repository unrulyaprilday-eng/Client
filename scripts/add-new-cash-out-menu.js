const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/document.js');
const source = fs.readFileSync(file, 'utf8');
let doc;
vm.runInNewContext(source, { $axure: { loadDocument(value) { doc = value; } } });
const flatten = nodes => nodes.flatMap(node => [node, ...flatten(node.children || [])]);
const nodes = flatten(doc.sitemap.rootNodes);
const parent = nodes.find(node => node.id === 'withdrawal_group');
if (!parent) throw new Error('Missing withdrawal_group');
const id = 'new_cash_out';
const name = '\u65b0\u63d0\u6b3e\u9875\u9762';
const url = name + '.html';
if (!fs.existsSync(path.join(root, url))) throw new Error('Missing page');
const existing = nodes.filter(node => node.id === id || node.url === url);
if (existing.length > 1) throw new Error('Duplicate target node');
if (existing.length && !(parent.children || []).includes(existing[0])) throw new Error('Target exists in another parent');
if (existing.length && (existing[0].id !== id || existing[0].pageName !== name || existing[0].url !== url)) throw new Error('Target identity differs');
if (!existing.length) {
  parent.children = parent.children || [];
  parent.children.push({ id, pageName: name, type: 'Wireframe', url, children: [] });
  // Replace only the rootNodes array; preserve every byte outside it.
  const marker = /"rootNodes"\s*:\s*\[/g;
  const match = marker.exec(source);
  if (!match) throw new Error('Missing rootNodes array');
  const start = match.index + match[0].lastIndexOf('[');
  let depth = 0, quoted = false, escaped = false, end = -1;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error('Unclosed rootNodes array');
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const replacement = JSON.stringify(doc.sitemap.rootNodes, null, 2).replace(/\n/g, eol + '    ');
  const next = source.slice(0, start) + replacement + source.slice(end);
  let verify;
  vm.runInNewContext(next, { $axure: { loadDocument(value) { verify = value; } } });
  if (JSON.stringify(verify) !== JSON.stringify(doc)) throw new Error('Document mismatch');
  fs.writeFileSync(file, next, 'utf8');
}
console.log('Verified: withdrawal_group > new_cash_out (' + url + ')');
