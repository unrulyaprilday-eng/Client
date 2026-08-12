const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const documentPath = path.join(rootDir, "data", "document.js");
const pageId = "piggy_bank_recharge_mode";
const pageName = "PIGGY BANK\u5145\u503c\u89e3\u9501";
const pageUrl = "PIGGY BANK\u5145\u503c\u89e3\u9501.html";

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

const allNodes = findNode(documentData.sitemap.rootNodes, pageId);
if (allNodes && (allNodes.pageName !== pageName || allNodes.url !== pageUrl)) {
  throw new Error("已存在同 id 但 pageName/url 不一致的菜单节点");
}

const parent = findNode(documentData.sitemap.rootNodes, "game_play_group");
if (!parent || !Array.isArray(parent.children)) {
  throw new Error("未找到独立活动菜单节点");
}

if (!allNodes) {
  parent.children.splice(1, 0, {
    id: pageId,
    pageName,
    type: "Wireframe",
    url: pageUrl,
    children: []
  });
}

fs.writeFileSync(documentPath, `$axure.loadDocument(${JSON.stringify(documentData, null, 2)});\n`, "utf8");
console.log(allNodes ? "菜单节点已存在，未重复添加。" : "已添加 PIGGY BANK 充值解锁菜单节点。");
