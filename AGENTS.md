# AGENTS.md

本项目是 Axure11 导出的 SaaS C 端客户端静态原型，部署到 GitHub Pages。维护时保持 Axure 原目录、运行时和页面导航逻辑，不改造成现代前端工程。

## 硬性规则

- 只用原生 HTML、CSS、JS；页面间使用相对路径。
- 不引入 React/Vue/Angular/Next/Vite/Webpack/npm 工程化/TypeScript 工程化/SPA 路由。
- 不修改 `resources/`、Axure runtime 核心 JS、Axure 原页面逻辑和原 CSS，除非用户明确要求。
- 可新增独立页面、`custom/css/`、`custom/js/`、assets、`files/页面名称/data.js`，以及必要的 `data/document.js` sitemap 入口。
- 公共自定义资产放在 `custom/`、`custom/css/`、`custom/js/`、`custom/assets/`，不要混入 Axure runtime 目录。
- AI 新增且要进入 Axure 菜单的 HTML 默认放项目根目录，不要默认放入 `custom/pages/`，否则左上角菜单可能无法识别。
- 读写中文文件名或中文内容时使用 UTF-8；PowerShell 读取显式加 `-Encoding UTF8`。
- 不运行会改写大量无关文件的格式化、构建或迁移命令。
- 不依赖本地绝对路径、构建命令或外部网络资源作为页面必要能力。

## 新增页面

新增前先找相近页面，复用现有静态页面结构、移动端密度、组件样式和交互方式。推荐结构：

```text
/页面名称.html
/custom/css/页面英文名.css
/custom/js/页面英文名.js
/files/页面名称/data.js
/files/页面名称/styles.css
```

HTML 必须：

- 可单独打开，也可从 `index.html` sitemap 菜单打开。
- 引用 `resources/css/axure_rp_page.css`、`data/styles.css`、`files/页面名称/styles.css`、自有 CSS、`data/document.js`、`files/页面名称/data.js`、`custom/js/axure-custom-page-ready.js`、`resources/scripts/axure/ios.js`；如有独立交互 JS，再引用自有 JS。
- `body` 带 `data-axure-page-id="page_id"`。
- `data-axure-page-id` 与 `files/页面名称/data.js` 的 `page.packageId` 一致。
- 自有 CSS/JS 放入 `custom/css/`、`custom/js/`。
- 内容面向真实 C 端用户任务，不做后台管理页或纯营销落地页。
- `#base` 保持 Axure 标准空容器，自定义布局、背景、grid/flex、`min-height: 100vh` 等样式放在 `#base` 内部容器上，不直接作用于 `#base`。
- 如依赖自定义 JS 渲染列表、标签页、弹窗、状态或编辑态，HTML 中先放可展示的首屏静态内容或兜底空态，不能只留空容器等待 JS 渲染。
- 自定义 JS 必须等 DOM 就绪后再查询元素和绑定事件，并对关键 DOM 做空值保护，避免一个元素缺失导致整页交互失效。

`files/页面名称/data.js` 必须调用 `$axure.loadCurrentPage(...)`，至少保证：

- `url` 与真实 HTML 文件名完全一致。
- `page.packageId` 与 HTML `data-axure-page-id` 一致。
- `page.name` 与菜单页面名称一致。
- 保留 Axure 常用 `variables`。
- `diagram.objects` 至少为空数组。
- `defaultAdaptiveView.size.width/height` 与实际画布一致；有页面外说明区时宽度也要同步加宽。

`files/页面名称/styles.css` 可以为空，但必须存在并被 HTML 引用。

## Sitemap

需要进入左上角页面目录菜单时，修改 `data/document.js`：

- 页面 id 唯一。
- `pageName`、`url` 正确，URL 使用相对路径。
- 页面放在正确 C 端业务菜单下：`首页`、`游戏/玩法`、`钱包/资金`、`会员/权益`、`我的`、`客服/公告`。
- 优先用 Node 执行并解析 `$axure.loadDocument(...)` 得到对象后修改再回写，避免手拼压缩长行。
- 处理中文页面名时，用稳定 id 定位；Node 脚本内新增中文可用 Unicode 转义，验证断言也优先用 id/url，避免 PowerShell 编码误判。
- 修改菜单只改 `data/document.js` 的 `sitemap.rootNodes`，保留 `$axure.loadDocument(...)` 外壳。
- 复用已有菜单节点时保留原 `id / pageName / url / children`，不要无故重建节点。
- 不为了菜单目录调整而移动 HTML 文件位置，除非用户明确要求。
- 已知父级中文名时，优先按截图/面包屑推断父级，再用一次 `data/document.js` 解析确认；不要反复全局搜索和打印大段菜单。
- 新增节点只做“查父级、查是否已有同 id/pageName/url、插入或覆盖该节点”三步，不重建同级节点。
- 打印菜单校验时只输出目标父级的 `id/pageName/url` 三列，避免输出完整 `document.js` 或整棵 sitemap。
- 写入后立即校验：菜单节点 `id`、页面 `data.js` 的 `page.packageId`、页面 `url`、页面 `name` 四项必须一致。

## 菜单与快照

当前菜单基准保存在：

```text
scripts/ai-menu-snapshot.json
```

恢复脚本：

```text
restore-ai-menu.cmd
scripts/restore-ai-menu.js
```

Axure 重新导出后，执行一条命令恢复菜单：

```powershell
.\restore-ai-menu.cmd
```

当用户确认当前菜单结构已经调整正确，并希望作为以后恢复基准时，保存新快照：

```powershell
.\restore-ai-menu.cmd save
```

菜单恢复规则：

- 默认按 `scripts/ai-menu-snapshot.json` 恢复菜单结构。
- 恢复时保留 Axure 新导出的、快照里没有的菜单节点。
- 调整目录结构或移动菜单节点后，必须执行 `.\restore-ai-menu.cmd save` 更新快照。
- 新增 AI 页面菜单节点时，新增页面 `data.js` 的 `page.packageId` 必须与 sitemap 节点 `id` 一致。
- AI 新增节点的 `id` 应唯一；移动或复用已有节点时保留原 `id`。
- `.\restore-ai-menu.cmd save` 只能在菜单中文码点确认正常后执行；如果误保存了 `????` 快照，修复 `data/document.js` 后必须重新 save。

手动调整 sitemap 时：

- 先解析 `data/document.js` 得到真实 `sitemap.rootNodes`，不要直接手改 Axure 压缩变量表。
- 如果 `data/document.js` 是 `$axure.loadDocument((function(){...})())` 形式，可用 Node 临时提供 `$axure.loadDocument = d => doc = d` 读取对象。
- 写回时保留 `$axure.loadDocument(...)` 外壳，可以写成格式化 JSON，便于后续维护。
- 重排后检查顶层顺序、关键子级归属、页面 `url` 和文件是否存在。

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
- 常用布局：画布宽 `800px`；手机页保持 `428px` 原尺寸左对齐；说明框 `left: 463px; width: 324px`。
- 不要为了放下右侧说明而缩放手机页面、压缩字号或缩小内容占比；手机 UI 仍按真实移动端密度设计，右侧只是原型备注区。
- 自定义静态页推荐在 `#base` 内加一层外部画布容器，例如 `.prototype-canvas { position: relative; width: 800px; min-height: ...; }`，再把手机页面容器放在左侧 `width: 428px`，说明区、箭头、弹窗等放在同一画布坐标系内。
- 如果用户在桌面/Axure 预览里反馈整体仍显小，可保留内部逻辑画布 `800px`，外层展示画布放大到 `1120px`，并用内部 stage 统一 `transform: scale(1.4); transform-origin: left top;` 放大手机页和右侧说明；同时把 `data.js` 的 `defaultAdaptiveView.size.width/height` 同步到放大后的展示画布。
- HTML 有页面外说明时，`meta viewport` 应与展示画布宽度一致，常规为 `width=800, initial-scale=1`；若使用 1.4 倍放大展示画布，则使用 `width=1120, initial-scale=1`。没有页面外说明的纯手机页仍使用 `width=428`。
- `files/页面名称/data.js` 的 `defaultAdaptiveView.size.width/height` 必须等于最终展示画布尺寸，常规右侧说明为 `800px` 宽，1.4 倍放大时为 `1120px` 宽；高度必须覆盖手机页和右侧说明的最大内容高度。只改 CSS 宽高但不改 `data.js` 会导致预览裁切。
- 说明框可用淡黄色背景、细边框、13px 文本；箭头从说明框指向页面内对应元素，箭头落点应靠近被解释的标题、按钮、状态或区域。
- 说明文字不要放进手机 UI 内，不要让用户误以为是业务提示、资产、奖励、操作结果或真实用户可见提示。
- 右侧说明内容应使用产品/开发可读语言，说明配置映射、按钮跳转、状态变化、特殊规则等；不要把后台配置表格、管理端字段密集塞进 C 端手机 UI。
- 如果页面有弹窗、Toast、底部 Sheet 等交互层，默认仍限制在左侧 `428px` 手机区域内，不要覆盖右侧说明框；必要时用画布内绝对定位或固定宽度控制。
- 按钮跳转说明也属于页面外说明：例如 `Play Now：点击跳转到网站首页。`、`Live Support：点击跳转到客服。`，说明框应放在 UI 外并用箭头指向按钮区域，按钮自身仍保持原页面按钮样式。
- 文案命名说明也属于页面外说明：例如 `维护结束倒计时`、`维护结束` 这类“字样描述”，应在 UI 外说明框中描述中文/英文文案，箭头指向页面内对应标题或状态文字，不要额外塞进用户 UI。
- 若页面由 JS 重写 `#base`，旁注优先静态写在 HTML 的 `#base` 外；JS 可做去重兜底。
- 若用户后续指出“页面太小”“参考 Rank 的布局和占比”“说明放右边”，优先检查该页是否误用 `428px` 画布或把手机页缩放了；修复方向是加宽外层画布到 `800px` 并保持手机页 `428px`，不是整体缩小 UI。

## 编码与 Windows 注意事项

- 控制台显示中文为 `?` 不一定代表文件损坏；必须检查文件实际内容或字符码点。
- 若码点是 `0x3f`，说明中文已经真实损坏，需要从备份或 Git 对象恢复。
- 写入 `data/document.js`、页面 `data.js` 或中文 HTML 后，至少做一次中文关键字/码点验证。
- 不要把包含中文字符串的长脚本通过 PowerShell here-string 管道传给 Node/Python 后直接写入项目文件。
- 不要在 PowerShell 双引号命令中直接写未转义的 `$axure`，否则可能被展开成空字符串并写坏 `data/document.js` 外壳。
- 需要写中文内容时，优先使用 `apply_patch`；脚本写入时使用 Unicode 转义字符串生成 UTF-8。
- 不假设系统一定存在 `git` 命令；需要恢复文件时优先用可用 Git 工具，必要时再从 `.git` 对象库读取。
- 创建中文命名页面文件本身优先用 `apply_patch`，不要用 PowerShell/Node 脚本批量写中文文件名。

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

检查保持简单，不要求每次都做完整浏览器预览；但如果页面靠 JS 才能显示数据、状态或切换 Tab，至少要确认 HTML 有兜底内容，JS 不会在 DOM 未生成时提前绑定失败。避免重复打印完整 `data/document.js` 或做无关的全项目扫描。

## 输出

交付说明保持简洁，只说实际改动和关键验证结果。不要固定罗列所有路径、导航和 data 文件，除非对当前问题有帮助或用户明确要求。遇到工具环境问题，简短说明原因和替代验证方式。
