const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const documentPath = path.join(rootDir, "data", "document.js");
const pageId = "withdrawal_rewards_notices";
const pageName = "提现与奖励提示";
const pageUrl = "withdrawal-rewards-notices.html";

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

const existing = findNode(documentData.sitemap.rootNodes, pageId);
if (existing && (existing.pageName !== pageName || existing.url !== pageUrl)) {
  throw new Error("已存在同 id 但 pageName/url 不一致的菜单节点");
}

const parent = findNode(documentData.sitemap.rootNodes, "game_play_group");
if (!parent || !Array.isArray(parent.children)) {
  throw new Error("未找到独立活动菜单节点");
}

if (!existing) {
  parent.children.push({
    id: pageId,
    pageName,
    type: "Wireframe",
    url: pageUrl,
    children: []
  });
}

fs.writeFileSync(documentPath, `$axure.loadDocument(${JSON.stringify(documentData, null, 2)});\n`, "utf8");
console.log(existing ? "菜单节点已存在，未重复添加。" : "已添加 提现与奖励提示 菜单节点。");
