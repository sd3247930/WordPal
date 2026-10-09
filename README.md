# WordPal · 单词小搭子

自然拼读、FSRS 间隔重复与水 / 火 / 土 / 风伙伴陪伴的离线学习应用。
uni-app + Vue 3 + TypeScript + Pinia，支持 HBuilderX Android 标准基座调试。

```sh
npm install
npm run dev:h5
npm run typecheck
npm test
npm run test:ui
npm run build:app
npm run build:mp-weixin
```

HBuilderX 导入本工程目录。CLI 项目的 manifest 和 pages 配置位于 src。
运行 → 运行到手机或模拟器 → Android 设备 → 标准基座。
CLI 编译器与手机调试基座需匹配 5.26；更新后先停止旧编译，再执行 `npm ci`。标准基座的应用图标由基座自身决定，正式图标需要独立打包验证。

四主题分别采用不等宽 Bento、克制 Swiss、奶油 Soft 与低眩光 OLED，支持导航轨、侧栏与多栏平板布局。页面共享品牌 Header、主次按钮、触摸选项、分段与图标控件，并支持大字体和键盘焦点。
四宠使用经过元数据清理的用户插画。DCloud CLI 依赖与 Android 5.26 标准基座已对齐；更新后先停止旧编译，再执行 npm ci。

宠物屋增加四象领地、状态浮层、独立场景切换、喂食确认、成长 / 装扮面板与阶段解锁相册，保留原学习与养成规则。

学习页包含自动混合题型、每轮错词回看、儿童评分与相对复习日期；单词本支持搜索、重点/系统建议、稍后标记、四点记忆状态及手机 Sheet / 平板详情。五页导航共用原创 SVG 与小程序 PNG 兼容资源。正式学习、SRS 与奖励沿用原规则，家长清除同时清除新增的界面进度和单词标记。

功能包括到期复习优先、五种学习模式、任务异常恢复、四宠独立成长、四主题、五档窗口布局、键盘快捷键、大字体、减少动效、家长设置和本地数据删除。
课程内容支持 JSON、CSV、受控 Markdown 和带媒体 ZIP；家长验证后可导入、预览、确认复用、选择、归档、回退内容版本和导出。文本最大 2MiB，ZIP 最大 50MiB，每包最多 2000 词。家长本机用途声明不授予公开发布许可。

保留 20 个原创启蒙词与 4 课，新增原创小学主题试点 120 词、6 单元、24 课、6 个短故事和 3 条拼读规则，未冒充出版社教材。其中 20 词复用现有离线音频与拼读，100 词缺少该资源，120 词缺少词图；缺资源的玩法会关闭，文字学习可继续。

跨课程同义词共享一张记忆卡，课节进度独立。整课检查、词义配对、字母拼装、句子排序/填空、故事阅读及媒体练习独立保存，不重复改变 FSRS 或发奖。v1 档案通过备份、读回校验和指针切换迁移，冻结正式队列与输入；损坏最新档案时停止写入。学习备份只在本机保存和恢复，与公开课程包区分。

主词库导入工具将社区 CSV 清洗为 WordPal 课程，保留来源摘要、重复引用和资源缺项，页面只读取标准课程。已在本机接入 901 条来源记录、795 个唯一词条、12 册、72 单元、210 课节，并生成 783 个离线 en-US 系统语音片段，其余复用已有音频。可按教材系列、起始年级、年级、册次与 Unit 选择；L1–L5 保持独立能力起点。来源未明确教材系列和年份，界面标记待核对，不能当作已认证的 PEP 三年级起点词库。

新增连胜挑战与每题 15 秒的闪电判断，限时题显式开始、退后台或切页暂停、重启等待继续。游戏记录不改变正式排程、奖励或能力推荐；正式学习仍包括闪现、连接、听音、拼写、听写与每轮错词回看。

第三方词表、生成音频和本机 ZIP 不进入公开 Git。公开检出通过安装脚本生成空目录；实际本机内容位于被忽略的 `src/content/local-courses/`、`src/static/local-master-audio/` 和 `private/master-vocabulary/`。原始数据及 QA 参考文件保留在系统临时目录。音标、双口音、例句、词图与人工审核拼读可按 schema 补充，缺项不自动编造。

H5 导入、备份恢复、刷新媒体恢复与离线播放已自动验证；Android 5.26 标准基座已实测文件/ZIP 导入、重启资源读回和同词十次重播。Android 物理断网重启、iOS 与微信真机验证仍待补齐。iOS 文件选择入口保持粘贴降级；小程序构建通过不等于真机验证。
语音评分、多孩子、云同步、Apple Pencil 属于后续扩展。

```text
src/pages         七个业务页面
src/components    共享 UI 组件与宠物资源入口
src/layouts       自适应应用壳
src/stores        学习、课程、独立活动、复习、宠物、主题、档案
src/services      内容导入、版本媒体仓库、存储迁移、音频、窗口与导航
src/styles        语义 token、四主题、响应布局、可访问性
packages          学习领域、FSRS、拼读、内容 schema、宠物、UI Kit
tests             领域测试、交互测试、截图基线
```

课程转换与检查：

```sh
npm run course:validate
npm run course:import -- --file private/lesson.csv --course-id my-course --title 自编词表 --local-use --output private/course.json
npm run vocabulary:import -- --local-use
npm run fltrp:import -- --local-use
npm run fltrp:validate -- --local-use
```

外研版词表导入器读取 `private/course-import/fltrp/raw.json`，验证六册来源、词义去重、课节大小与现有课程契约，再合并到被忽略的本机课程目录。原图、提取文本和生成课程不进入公开仓库；默认 CI 使用独立的原创合成教材。

主词库工具使用 gh 读取固定提交，也可通过 `--file` 导入本机 CSV；非固定摘要的文件会记录为本机未核对来源。生成音频需要 Windows 离线英语系统语音。开发运行自动使用本机词库，可设置 `VITE_WORDPAL_LOCAL_CONTENT=0` 隔离；包含这些私用资源的发行构建必须显式设置 `VITE_WORDPAL_LOCAL_CONTENT=1`，该开关只表示构建本机测试包，不授予再分发许可。公开发行应从不含私用资源的干净检出构建。

数据结构参考 [pep-english-vocabulary](https://github.com/billyjr/pep-english-vocabulary)，PEP 与音标 QA 参考 [pep-english-words](https://github.com/cyforkk/pep-english-words) 和 [english-words](https://github.com/jinronga/english-words)，未复制其未授权例句、图片或音频。架构与玩法仅借鉴通用思路，没有引入第三方应用代码。

运行本机词库专属界面验证时，设置 `WORDPAL_TEST_LOCAL_CONTENT=1` 和独立的 `WORDPAL_TEST_PORT`，再执行 `npx playwright test tests/ui/master-vocabulary.spec.ts`。默认 UI 测试隔离本机内容；已占用的开发服务器应停止或改用独立测试端口。

无来源与再分发许可的导入内容留在本机。ZIP 使用 fflate 0.8.3，许可见 THIRD_PARTY_NOTICES.md。

运行 npm run sync:hbuilder 可同步到同级 HBuilderProjects 下的 WordPal，目标可通过脚本参数覆盖。
调试同步复制源码、工具、测试和本机文档，不复制 private、依赖、构建产物或本地凭据；它不是 Git 发布流程。

项目根目录下的 `docs/` 与 `private/` 仅保留在本机，严禁纳入 Git、强制添加或上传。测试结果、trace、HAR、覆盖率、构建产物和依赖也被忽略；测试源码及合成视觉基线正常存档。

```sh
npm run git:hooks
npm run purity
```

每个新克隆的工作区先安装版本化 hooks。每次 Git 存档前运行纯净扫描；提交钩子检查整个暂存区的实际内容，提交信息钩子检查秘密、隐私和本地路径，推送钩子复查本地提交历史。扫描失败或无法运行会阻止操作，不能使用 `--no-verify` 绕过。

需要检查本机保留内容时运行 `powershell -ExecutionPolicy Bypass -File tools/preflight-scan.ps1 -IncludeLocalOnly`。命中报告仅显示类别和相对位置，原始值不会打印。公开候选中的真实姓名、地址、图像内容及素材许可仍需人工核对，自动模式不能替代这一步。

## 自然拼读覆盖

音块与发音的同步高亮只对**已审核词条**生效。拼读覆盖按每次导入的可审核资源确定，课程安装不自动生成音素或精确时间轴；没有已审核拆分的词条使用整词回退，卡片显示「拼读拆分正在审核，先听完整发音」，时序提示为「以完整单词的标准发音为准」。高亮颜色统一为信号灯三色（红 → 绿 → 蓝循环），整词回退与单音块词条固定使用蓝色。补齐计划见本机文档 `docs/content-roadmap.md`（不入公开仓库）。
