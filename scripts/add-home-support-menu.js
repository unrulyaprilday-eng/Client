const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const documentPath = path.join(root, "data/document.js");
const pageId = "home_support_floating";
const pageName = "\u9996\u9875-\u5ba2\u670d\u5f39\u7a97";
const pageUrl = pageName + ".html";
const original = fs.readFileSync(documentPath, "utf8");
let documentData;
vm.runInNewContext(original, { $axure: { loadDocument(value) { documentData = value; } } });
if (!documentData || !Array.isArray(documentData.sitemap.rootNodes)) throw new Error("Invalid Axure sitemap");
const nodes = [];
function collect(list, parent) {
  list.forEach(node => { nodes.push({ node, parent }); if (node.children) collect(node.children, node); });
}
collect(documentData.sitemap.rootNodes, null);
const parents = nodes.filter(entry => entry.node.id === "home_component_group");
if (parents.length !== 1 || !Array.isArray(parents[0].node.children)) throw new Error("Home menu parent must be unique");
const parent = parents[0].node;
const matches = nodes.filter(entry => entry.node.id === pageId || entry.node.url === pageUrl);
if (matches.length > 1) throw new Error("Duplicate support page");
if (matches.length) {
  const existing = matches[0];
  if (existing.parent !== parent || existing.node.id !== pageId || existing.node.pageName !== pageName || existing.node.url !== pageUrl) throw new Error("Existing support page identity or parent mismatch");
  console.log("Home support menu already exists.");
} else {
  if (!fs.existsSync(path.join(root, pageUrl))) throw new Error("Support page is missing");
  parent.children.push({ id: pageId, pageName, type: "Wireframe", url: pageUrl, children: [] });
  // Replace only the rootNodes array to preserve the Axure wrapper and unrelated content.
  const start = original.indexOf("[", original.indexOf('"rootNodes"'));
  if (start < 0) throw new Error("Cannot locate rootNodes");
  let depth = 0, quoted = false, escaped = false, end = -1;
  for (let index = start; index < original.length; index++) {
    const character = original[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "[") depth++;
    else if (character === "]" && --depth === 0) { end = index + 1; break; }
  }
  if (end < 0) throw new Error("Cannot locate end of rootNodes");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const encoded = JSON.stringify(documentData.sitemap.rootNodes, null, 2).split("\n").map((line, index) => index ? "    " + line : line).join(newline);
  const updated = original.slice(0, start) + encoded + original.slice(end);
  let verified;
  vm.runInNewContext(updated, { $axure: { loadDocument(value) { verified = value; } } });
  if (JSON.stringify(verified) !== JSON.stringify(documentData)) throw new Error("Sitemap write verification failed");
  fs.writeFileSync(documentPath, updated, "utf8");
  console.log("Added home support page to the Home menu.");
}
