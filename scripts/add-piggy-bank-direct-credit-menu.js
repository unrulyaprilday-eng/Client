const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const documentPath = path.join(rootDir, "data", "document.js");
const pageId = "piggy_bank_direct_credit";
const pageName = "PIGGY BANK\u76f4\u63a5\u5230\u8d26";
const pageUrl = "PIGGY BANK\u76f4\u63a5\u5230\u8d26.html";

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
  const rechargeIndex = parent.children.findIndex((node) => node.id === "piggy_bank_recharge_mode");
  const insertAt = rechargeIndex >= 0 ? rechargeIndex + 1 : parent.children.length;
  parent.children.splice(insertAt, 0, {
    id: pageId,
    pageName,
    type: "Wireframe",
    url: pageUrl,
    children: []
  });
}

fs.writeFileSync(documentPath, `$axure.loadDocument(${JSON.stringify(documentData, null, 2)});\n`, "utf8");
console.log(existing ? "菜单节点已存在，未重复添加。" : "已添加 PIGGY BANK 直接到账菜单节点。");
