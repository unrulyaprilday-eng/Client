# AGENTS.md

本项目是 Axure11 导出的 SaaS C 端客户端静态原型，部署到 GitHub Pages。维护时保持 Axure 原目录、运行时和页面导航逻辑，不改造成现代前端工程。

## 硬性规则

- 只用原生 HTML、CSS、JS；页面间使用相对路径。
- 不引入 React/Vue/Angular/Next/Vite/Webpack/npm 工程化/TypeScript 工程化/SPA 路由。
- 不修改 `resources/`、Axure runtime 核心 JS、Axure 原页面逻辑和原 CSS，除非用户明确要求。
- 可新增独立页面、`custom/css/`、`custom/js/`、assets、`files/页面名称/data.js`，以及必要的 `data/document.js` sitemap 入口。
- 读写中文文件名或中文内容时使用 UTF-8；PowerShell 读取显式加 `-Encoding UTF8`。
- 不运行会改写大量无关文件的格式化、构建或迁移命令。

## 新增页面

新增前先找相近页面，复用现有静态页面结构、移动端密度、组件样式和交互方式。推荐结构：

```text
/页面名称.html
/custom/css/页面英文名.css
/custom/js/页面英文名.js
/files/页面名称/data.js
```

HTML 必须：

- 可单独打开，也可从 `index.html` sitemap 菜单打开。
- 引用 `data/document.js` 和 `files/页面名称/data.js`。
- `body` 带 `data-axure-page-id="page_id"`。
- `data-axure-page-id` 与 `files/页面名称/data.js` 的 `page.packageId` 一致。
- 自有 CSS/JS 放入 `custom/css/`、`custom/js/`。
- 内容面向真实 C 端用户任务，不做后台管理页或纯营销落地页。

`files/页面名称/data.js` 必须调用 `$axure.loadCurrentPage(...)`，至少保证：

- `url` 与真实 HTML 文件名完全一致。
- `page.packageId` 与 HTML `data-axure-page-id` 一致。
- `page.name` 与菜单页面名称一致。
- `defaultAdaptiveView.size.width/height` 与实际画布一致；有页面外说明区时宽度也要同步加宽。

## Sitemap

需要进入左上角页面目录菜单时，修改 `data/document.js`：

- 页面 id 唯一。
- `pageName`、`url` 正确，URL 使用相对路径。
- 页面放在正确 C 端业务菜单下：`首页`、`游戏/玩法`、`钱包/资金`、`会员/权益`、`我的`、`客服/公告`。
- 优先用 Node 执行并解析 `$axure.loadDocument(...)` 得到对象后修改再回写，避免手拼压缩长行。
- 处理中文页面名时，用稳定 id 定位；Node 脚本内新增中文可用 Unicode 转义，验证断言也优先用 id/url，避免 PowerShell 编码误判。

## UI 与业务

- 默认移动端 C 端界面：信息层级清晰、可读、真实可用。
- 围绕用户任务设计：浏览、领取、充值、提款、查看权益、参与活动、联系客服、查看消息等。
- 控件需表达真实路径：按钮、入口、状态、空态、加载态、弹窗、确认反馈、异常提示尽量完整。
- 避免后台报表感、管理端筛选器、密集表格、纯营销页、夸张渐变、过度动画、过度留白、卡片套卡片。
- 金额、等级、进度、状态、奖励等关键数据要突出；说明文字不要伪装成资产、奖励或操作结果。
- 业务字段、规则、状态流转以本次用户说明和参考页面为准，不把单页细节固化成通用规则。
- 涉及资金、奖励、活动资格时，区分可用、冻结、处理中、已领取、已过期、未达标等状态。
- 不把 A 端商户、运营、财务审核、报表统计、结算依据等口径直接套到 C 端页面。

## 页面外说明文字

当用户要“说明文字”“开发/产品备注”“跳转说明”“按钮说明”“文案说明”“像 VIP CLUB 保级一样的说明”时，先判断这些内容是否属于真实 C 端用户 UI。若只是给评审、开发、产品或原型阅读者看的备注，不属于用户实际看到的业务界面，应放在手机页面外的右侧画布区域，并用箭头指向对应 UI。

规则：

- 参考 `VIP CLUB 保级`：整体画布加宽，手机页面固定左侧，说明框放右侧。
- 同步修改 HTML/CSS 和 `files/页面名称/data.js` 的 `defaultAdaptiveView.size.width`，否则 Axure 预览会裁掉右侧说明。
- 常用布局：画布宽 `800px`；手机页 `#base` 宽 `428px` 左对齐；说明框 `left: 463px; width: 324px`。
- 说明框可用淡黄色背景、细边框、13px 文本；箭头从说明框指向页面内对应元素，箭头落点应靠近被解释的标题、按钮、状态或区域。
- 说明文字不要放进手机 UI 内，不要让用户误以为是业务提示、资产、奖励、操作结果或真实用户可见提示。
- 按钮跳转说明也属于页面外说明：例如 `Play Now：点击跳转到网站首页。`、`Live Support：点击跳转到客服。`，说明框应放在 UI 外并用箭头指向按钮区域，按钮自身仍保持原页面按钮样式。
- 文案命名说明也属于页面外说明：例如 `维护结束倒计时`、`维护结束` 这类“字样描述”，应在 UI 外说明框中描述中文/英文文案，箭头指向页面内对应标题或状态文字，不要额外塞进用户 UI。
- 若页面由 JS 重写 `#base`，旁注优先静态写在 HTML 的 `#base` 外；JS 可做去重兜底。

## 验证

默认只做静态验证，不做浏览器预览、截图、Playwright 或视觉自动化，除非用户明确要求。只运行与本次改动相关的低成本命令。

每次修改后至少检查相关 JS：

```text
node --check data/document.js
node --check files/页面名称/data.js
node --check custom/js/页面英文名.js
```

只检查实际存在或本次修改相关的文件。修改 sitemap 时必须解析 `data/document.js` 验证：

- `$axure.loadDocument(...)` 能成功执行。
- 能找到目标页面 id。
- `pageName`、`url` 与真实页面一致。
- 目标节点位于正确业务菜单下。

涉及核心交互时，按需验证入口按钮、返回路径、弹窗开关、确认动作、状态切换、标签页、底部导航、空态/失败态/处理中状态、关键金额与权益状态。

验证失败时区分产品文件失败和验证脚本编码/断言失败；遇到 PowerShell 中文乱码，用 Unicode 转义或只断言 id/url 后重跑。

## 输出

交付说明保持简洁，只说实际改动和关键验证结果。不要固定罗列所有路径、导航和 data 文件，除非对当前问题有帮助或用户明确要求。遇到工具环境问题，简短说明原因和替代验证方式。
