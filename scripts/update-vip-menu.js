const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const documentPath = path.join(rootDir, "data", "document.js");
const pageName = "\u65b0VIP \u5c55\u793a";
const pageUrl = `${pageName}.html`;
const oldPages = [
  ["onbtmf", "vip_club.html"],
  ["p17udf", "vip_club___.html"],
  ["3vstxy", "vip_club____en.html"]
];

function parseDocument(source) {
  let documentData;
  new Function("$axure", source)({ loadDocument(value) { documentData = value; } });
  assert(Array.isArray(documentData?.sitemap?.rootNodes), "Missing sitemap.rootNodes");
  return documentData;
}

function collect(nodes, result = []) {
  for (const node of nodes) {
    result.push(node);
    if (Array.isArray(node.children)) collect(node.children, result);
  }
  return result;
}

function detach(nodes, id) {
  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].id === id) return nodes.splice(index, 1)[0];
    const found = detach(nodes[index].children || [], id);
    if (found) return found;
  }
  return null;
}

function assertUniqueIds(nodes) {
  const ids = new Set();
  for (const node of collect(nodes)) {
    // Axure exports anonymous folders with empty ids.
    if (!node.id) continue;
    assert(!ids.has(node.id), `Duplicate sitemap id: ${node.id}`);
    ids.add(node.id);
  }
}

function rootNodesSpan(source) {
  const match = /"rootNodes"\s*:\s*\[/.exec(source);
  assert(match, "Missing rootNodes array");
  const start = match.index + match[0].lastIndexOf("[");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return [start, index + 1];
  }
  throw new Error("Unclosed rootNodes array");
}

const source = fs.readFileSync(documentPath, "utf8");
const documentData = parseDocument(source);
const before = JSON.parse(JSON.stringify(documentData));
const nodes = documentData.sitemap.rootNodes;
assertUniqueIds(nodes);
const originalPages = oldPages.map(([id, url]) => {
  const node = collect(nodes).find((entry) => entry.id === id);
  assert(node && node.url === url, `Missing or conflicting original VIP page: ${id}`);
  return JSON.parse(JSON.stringify(node));
});

const anchorIndex = nodes.findIndex((node) => node.id === "vip_group" || node.id === "membership_benefits_group" || node.id === oldPages[0][0]);
let vip = detach(nodes, "vip_group");
assert(!vip || vip.type === "Folder", "Conflicting VIP folder id");
vip ||= { id: "vip_group", pageName: "VIP", type: "Folder", url: "", children: [] };
vip.children ||= [];
const membership = collect(nodes).find((node) => node.id === "membership_benefits_group");
if (membership && membership.type === "Folder" && !(membership.children || []).length) {
  detach(nodes, membership.id);
}
nodes.splice(anchorIndex < 0 ? nodes.length : Math.min(anchorIndex, nodes.length), 0, vip);
assert(nodes.includes(vip), "VIP must be a root folder");
for (const [id] of oldPages) vip.children.push(detach(nodes, id));

const existingPage = detach(nodes, "new_vip_benefits");
assert(!existingPage || (existingPage.pageName === pageName && existingPage.url === pageUrl), "Conflicting new VIP page id");
vip.children.push(existingPage || { id: "new_vip_benefits", pageName, type: "Wireframe", url: pageUrl, children: [] });
assertUniqueIds(nodes);
for (const original of originalPages) assert.deepStrictEqual(vip.children.find((node) => node.id === original.id), original);
for (const [id] of [...oldPages, ["new_vip_benefits", pageUrl]]) {
  assert(vip.children.filter((node) => node.id === id).length === 1, `VIP ownership mismatch: ${id}`);
}

const [start, end] = rootNodesSpan(source);
const newline = source.includes("\r\n") ? "\r\n" : "\n";
const replacement = JSON.stringify(nodes, null, 2).replace(/\n/g, `${newline}    `);
const output = source.slice(0, start) + replacement + source.slice(end);
const parsedOutput = parseDocument(output);
before.sitemap.rootNodes = [];
const outsideSitemap = JSON.parse(JSON.stringify(parsedOutput));
outsideSitemap.sitemap.rootNodes = [];
assert.deepStrictEqual(outsideSitemap, before, "Document changed outside sitemap.rootNodes");
const [newStart, newEnd] = rootNodesSpan(output);
assert.strictEqual(output.slice(0, newStart), source.slice(0, start));
assert.strictEqual(output.slice(newEnd), source.slice(end));
for (const node of [vip, ...vip.children]) {
  assert(!node.pageName.includes("?"), `Invalid question-mark code point in page name: ${node.id}`);
  if (node.url) assert(!node.url.includes("?"), `Invalid question-mark code point in page URL: ${node.id}`);
}
fs.writeFileSync(documentPath, output, "utf8");
console.log("VIP menu updated; original nodes preserved, non-empty ids unique, document bytes outside rootNodes unchanged.");
for (const node of vip.children) {
  console.log(`${vip.pageName} / ${node.pageName}: ${node.url}${fs.existsSync(path.join(rootDir, node.url)) ? "" : " (page creation pending)"}`);
}
