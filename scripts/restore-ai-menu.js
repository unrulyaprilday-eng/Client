const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const documentPath = path.join(rootDir, "data", "document.js");
const snapshotPath = path.join(__dirname, "ai-menu-snapshot.json");

function loadAxureDocument(filePath) {
  let loadedDocument = null;
  let source = fs.readFileSync(filePath, "utf8");
  if (/^\s*\.loadDocument\s*\(/.test(source)) {
    source = source.replace(/^\s*\.loadDocument\s*\(/, "$axure.loadDocument(");
  }
  const runner = new Function("$axure", source);
  runner({
    loadDocument(document) {
      loadedDocument = document;
    }
  });

  if (!loadedDocument || !loadedDocument.sitemap || !Array.isArray(loadedDocument.sitemap.rootNodes)) {
    throw new Error("data/document.js 中没有读取到有效的 sitemap.rootNodes");
  }

  return loadedDocument;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectNodes(nodes, allNodes = []) {
  for (const node of nodes) {
    allNodes.push(node);
    if (Array.isArray(node.children)) collectNodes(node.children, allNodes);
  }
  return allNodes;
}

function findNodeBySignature(nodes, signature) {
  for (const node of nodes) {
    if (getNodeSignature(node) === signature) return node;
    if (Array.isArray(node.children)) {
      const found = findNodeBySignature(node.children, signature);
      if (found) return found;
    }
  }
  return null;
}

function getNodeSignature(node) {
  return [node.id || "", node.pageName || "", node.url || ""].join("\u0000");
}

function buildSignatureCounts(nodes) {
  const counts = new Map();
  for (const node of collectNodes(nodes)) {
    const signature = getNodeSignature(node);
    counts.set(signature, (counts.get(signature) || 0) + 1);
  }
  return counts;
}

function readSnapshot() {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`未找到菜单快照：${path.relative(rootDir, snapshotPath)}。请先执行 restore-ai-menu.cmd save`);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  if (!snapshot || !Array.isArray(snapshot.rootNodes)) {
    throw new Error("菜单快照格式无效，缺少 rootNodes");
  }

  return snapshot;
}

function saveSnapshot(documentData) {
  const snapshot = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    source: "data/document.js sitemap.rootNodes",
    rootNodes: documentData.sitemap.rootNodes
  };

  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`已保存当前菜单快照：${path.relative(rootDir, snapshotPath)}`);
  console.log(`顶层菜单数量：${snapshot.rootNodes.length}`);
}

function appendNewAxureNodes(restoredRootNodes, currentRootNodes, snapshotCounts, addedNodes) {
  function visit(currentNodes, restoredParent) {
    for (const currentNode of currentNodes) {
      const signature = getNodeSignature(currentNode);
      const remainingCount = snapshotCounts.get(signature) || 0;

      if (remainingCount <= 0) {
        const newNode = clone(currentNode);
        if (restoredParent) {
          if (!Array.isArray(restoredParent.children)) restoredParent.children = [];
          restoredParent.children.push(newNode);
        } else {
          restoredRootNodes.push(newNode);
        }
        addedNodes.push(newNode);
        continue;
      }

      snapshotCounts.set(signature, remainingCount - 1);
      const restoredNode = findNodeBySignature(restoredRootNodes, signature);
      if (restoredNode && Array.isArray(currentNode.children)) {
        visit(currentNode.children, restoredNode);
      }
    }
  }

  visit(currentRootNodes, null);
}

function restoreSnapshot(documentData) {
  const snapshot = readSnapshot();
  const restoredRootNodes = clone(snapshot.rootNodes);
  const snapshotCounts = buildSignatureCounts(restoredRootNodes);
  const addedNodes = [];

  appendNewAxureNodes(restoredRootNodes, documentData.sitemap.rootNodes, snapshotCounts, addedNodes);
  documentData.sitemap.rootNodes = restoredRootNodes;

  fs.writeFileSync(documentPath, `$axure.loadDocument(${JSON.stringify(documentData, null, 2)});\n`, "utf8");

  console.log("菜单已按快照恢复。");
  if (addedNodes.length > 0) {
    console.log("同时保留了 Axure 新增菜单：");
    for (const node of addedNodes) {
      console.log(`- ${node.pageName}${node.url ? ` (${node.url})` : ""}`);
    }
  }
}

function main() {
  const command = (process.argv[2] || "restore").toLowerCase();
  const documentData = loadAxureDocument(documentPath);

  if (command === "save" || command === "snapshot") {
    saveSnapshot(documentData);
    return;
  }

  if (command === "restore") {
    restoreSnapshot(documentData);
    return;
  }

  console.log("用法：");
  console.log("  restore-ai-menu.cmd save     保存当前菜单快照");
  console.log("  restore-ai-menu.cmd          按快照恢复菜单");
}

try {
  main();
} catch (error) {
  console.error("菜单处理失败：");
  console.error(error.message);
  process.exit(1);
}
