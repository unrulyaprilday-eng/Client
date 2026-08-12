# AGENTS.md

本项目是 Axure11 导出的 C 端移动客户端静态原型，部署到 GitHub Pages。保持 Axure 目录、运行时和页面导航，不改造成现代前端工程。

## 子代理调用

- 默认选择能可靠完成任务的最低级别；不确定时上调一级，质量优先于省 token。低到高：`Luna Max`（简单隔离/UI/CRUD/测试/文档）；`Terra High`（常规开发/bug/集成/中等重构）；`Terra Max`（中大型/跨模块/难 bug）；`Sol High`（重要功能/复杂业务/较大重构）；`Sol XHigh`（复杂架构/关键跨模块/困难调试）；`Sol Max`（关键架构/安全/支付钱包/数据库迁移/极端调试）。
- 只派发独立、可验收的子任务，并注明级别。子代理先读当前项目和目标端 `AGENTS.md`，检查现有代码，限范围修改，按目标端规则验证并回报改动/风险；超出级别只报 `ESCALATE`，由主代理决定升级。
- 最多 5 个并发，避免多个代理改同一文件；主代理负责整合、冲突处理和最终验证。本端作为独立项目打开时，本节直接生效；跨端访问先确认工作区权限。

## 硬性规则

- 只用原生 HTML、CSS、JS 和 Axure 页面壳；页面与资源使用相对路径。
- 不引入 React、Vue、Angular、NextJS、Vite、Webpack、npm、TypeScript 工程化或 SPA 路由。
- 不修改 `resources/`、Axure runtime 核心 JS、原有页面逻辑和全局 CSS，除非用户明确要求。
- 可新增独立页面、`custom/css/`、`custom/js/`、assets、页面 data/styles 及必要的 `data/document.js` 菜单入口；自定义资产放 `custom/` 体系。
- 要进 Axure 菜单的 AI HTML 默认放项目根目录，不放 `custom/pages/`；不依赖绝对路径、构建命令或外部网络资源，不批量改写无关文件。
- 中文文件名/内容使用 UTF-8；PowerShell 读取中文显式加 `-Encoding UTF8`。

## 新增页面

先找相近页面，复用其移动端密度、组件和交互。推荐结构：

```text
/页面名称.html
/custom/css/页面英文名.css
/custom/js/页面英文名.js
/files/页面名称/data.js
/files/页面名称/styles.css
```

HTML 必须可单独打开并可由 `index.html` 菜单打开，引用 Axure page CSS、`data/styles.css`、页面 styles、自有 CSS、`data/document.js`、页面 data、`custom/js/axure-custom-page-ready.js`、`resources/scripts/axure/ios.js`；有交互时再引自有 JS。

- `body data-axure-page-id` 与页面 data 的 `page.packageId` 一致；内容面向真实 C 端用户任务，不做后台管理页或纯营销页。
- `#base` 保持 Axure 空容器，自定义布局放内部容器。JS 渲染列表、Tab、弹窗或状态时，HTML 先有首屏静态内容/空态，JS 等 DOM 就绪并保护关键节点。
- 页面 data 调用 `$axure.loadCurrentPage(...)`，保证 `url`、`page.packageId`、`page.name`、`variables`、`diagram.objects` 正确；页面 styles 即使为空也必须存在并引用。
- `defaultAdaptiveView.size` 表示预览视窗，不是长页面总高度。

## 视窗与缩放

- 普通手机页按 `428x926`：`meta viewport` 使用 `width=428, initial-scale=1`，页面 data 同为 `428x926`；`body` 宽 428px、静态定位、margin 0，`.form_sketch` 透明，`#base` 只保留绝对定位和 z-index。
- “左手机页 + 右说明”按 `800x926`：viewport 和页面 data 使用 `800x926`，整体 `body/#base` 宽 800px，左侧手机仍为 428px，长内容由内部容器撑高。
- 长页面自然滚动，不把 `defaultAdaptiveView.size.height` 写成 1548/2168 等内容总高度，也不靠 `transform: scale`、`zoom` 或压缩手机页补救。
- 遇到“页面太小”“与 Rank 占比不一致”或刷新缩放闪动，先检查 adaptive height、viewport 宽度和 `body/#base` 标准尺寸。

## 菜单与快照

- 只改 `data/document.js` 的 `sitemap.rootNodes`，保留 `$axure.loadDocument(...)` 外壳；页面 id 唯一，`pageName`/`url` 与文件一致。
- 节点放正确 C 端菜单：`首页`、`游戏/玩法`、`钱包/资金`、`会员/权益`、`我的`、`客服/公告`。不为菜单调整移动 HTML。
- 用 Node 解析对象后修改回写；按稳定 id 查父级和重复节点，只插入/覆盖目标节点，复用时保留 `id/pageName/url/children`。写入后校验 sitemap id、`packageId`、页面 `url/name`、归属和文件存在。
- 菜单基准为 `scripts/ai-menu-snapshot.json`；Axure 重导出后执行 `.\restore-ai-menu.cmd`。调整目录或确认结构正确后执行 `.\restore-ai-menu.cmd save`；恢复保留快照中没有的新导出节点。
- 新增 AI 节点 id 必须唯一；中文码点异常时先修复，不保存 `????` 快照。
- 复杂菜单解析/写回逻辑放固定 `scripts/*.js`，不要在 PowerShell 长 `node -e` 中直接混用 `$axure`、中文、JSON 和多层引号。中文断言用稳定 id/url 或 Unicode 转义，失败先区分脚本 quoting/编码与项目文件问题。

## UI 与业务

- 默认真实可用的移动端 C 端界面，围绕浏览、领取、充值、提款、权益、活动、客服和消息设计；入口、状态、空态、加载、异常、弹窗和确认反馈应完整。
- 避免后台报表、管理端筛选器、密集表格、纯营销页、夸张渐变/动画/留白和卡片套卡片。
- 突出金额、等级、进度、状态和奖励；资金/奖励/资格区分可用、冻结、处理中、已领取、已过期、未达标。业务规则以用户说明和参考页面为准，不套 A 端审核/结算口径。

## 页面外说明

面向评审、开发或产品的说明、跳转/按钮/文案备注不属于真实用户 UI，应放手机页外右侧画布，参考 `VIP CLUB 保级`：

- 画布常用 800px 宽、视窗 `800x926`；左侧手机保持 428px，右侧说明区约 296-324px，可用白底列和淡黄色说明卡。不要缩小手机页来容纳备注。
- 说明文字使用产品/开发语言，可用箭头定位；不要把配置字段或备注伪装成用户资产、奖励、提示或操作结果。
- 弹窗、Toast、Bottom Sheet 限制在左侧 428px 手机区，不覆盖右侧说明。若 JS 重写 `#base`，旁注优先静态放在其外并做去重。
- 页面过小或备注布局异常时，先恢复 `800x926` 视窗、800px 画布和 428px 手机页，不整体缩放 UI。

## 编码与验证

- 中文显示为 `?` 不等于损坏；实际码点为 `0x3f` 才需恢复。写入中文 HTML、页面 data、`data/document.js` 或快照后做码点检查并尽量保留原换行/BOM。
- 不用 PowerShell here-string/长 `node -e` 写中文、`$axure` 或多层引号；优先 `apply_patch` 或固定脚本，脚本内用 Unicode 转义。
- 默认只做相关静态检查，不跑浏览器、截图或 Playwright，除非用户明确要求。相关 JS 执行 `node --check`；改菜单时解析 `$axure.loadDocument(...)` 并检查目标 id、`pageName`、`url` 和归属。
- 核心交互按需检查入口/返回、弹窗、确认、状态、Tab、底部导航、空态/失败/处理中及金额权益；页面靠 JS 显示时确认 HTML 有兜底和 ready 初始化。

## 输出

只说明实际改动和关键验证结果；遇到环境/编码问题简述原因和替代验证方式，默认不输出 git 信息。
