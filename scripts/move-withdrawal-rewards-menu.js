const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const documentPath = path.join(rootDir, "data", "document.js");
const pageId = "withdrawal_rewards_notices";
const pageName = "提现与奖励提示";
const pageUrl = "withdrawal-rewards-notices.html";
const folderId = "withdrawal_group";
const folderName = "提款";

let documentData = null;
let source = fs.readFileSync(documentPath, "utf8");
source = source.replace(/^\s*\.loadDocument\s*\(/, "$axure.loadDocument(");
new Function("$axure", source)({
  loadDocument(value) {
    documentData = value;
  }
});

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (Array.isArray(node.children)) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function removeNode(nodes, id) {
  let removed = null;
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node.id === id) {
      removed = node;
      nodes.splice(index, 1);
      continue;
    }
    if (Array.isArray(node.children)) {
      const nested = removeNode(node.children, id);
      if (nested && !removed) removed = nested;
    }
  }
  return removed;
}

const rootNodes = documentData.sitemap.rootNodes;
const existing = findNode(rootNodes, pageId);
if (existing && (existing.pageName !== pageName || existing.url !== pageUrl)) {
  throw new Error("已存在同 id 但 pageName/url 不一致的菜单节点");
}

const pageNode = existing || {
  id: pageId,
  pageName,
  type: "Wireframe",
  url: pageUrl,
  children: []
};
removeNode(rootNodes, pageId);

let folder = findNode(rootNodes, folderId);
if (!folder) {
  folder = {
    id: folderId,
    pageName: folderName,
    type: "Folder",
    url: "",
    children: []
  };
  const gameIndex = rootNodes.findIndex((node) => node.id === "game_play_group");
  rootNodes.splice(gameIndex >= 0 ? gameIndex + 1 : rootNodes.length, 0, folder);
} else {
  if (folder.pageName !== folderName || folder.type !== "Folder") {
    throw new Error("已存在同 id 但目录信息不一致的节点");
  }
  if (!Array.isArray(folder.children)) folder.children = [];
}

folder.children = folder.children.filter((node) => node.id !== pageId);
folder.children.push(pageNode);
fs.writeFileSync(documentPath, `$axure.loadDocument(${JSON.stringify(documentData, null, 2)});\n`, "utf8");
console.log(`已将 ${pageName} 移入 ${folderName} 目录。`);
