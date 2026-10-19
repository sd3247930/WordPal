# WordPal · 单词小搭子

自然拼读、间隔复习与四象伙伴陪伴的离线优先英语学习应用。

[打开网页版](https://sd3247930.github.io/WordPal/) · [下载 Android APK](https://github.com/sd3247930/WordPal/releases/latest/download/WordPal.apk) · [版本发布](https://github.com/sd3247930/WordPal/releases) · [构建说明](BUILD.md)

## 安装使用

### 方式一：手机直接安装（推荐）

1. 用手机浏览器打开 [WordPal 网页版](https://sd3247930.github.io/WordPal/)。
2. 点右上角灵石左侧 **「📲 安装」**，再点面板内 **「📥 下载应用（APK）」**。
3. 下载后打开 APK，按系统提示允许当前浏览器安装应用，再完成安装。
4. 桌面出现 **WordPal 单词小搭子** 图标后，即可打开学习。

固定直链（始终指向最新正式发布的同名附件）：[WordPal.apk](https://github.com/sd3247930/WordPal/releases/latest/download/WordPal.apk)。适用于 Android；iPhone / iPad 使用网页版，也可通过 Safari「添加到主屏幕」。

网页和 App 的学习档案分别保存在各自设备内，不会自动同步。迁移时在网页 **「设置 → 家长设置 → 本机学习备份」** 导出，再到 App 的相同位置选择备份、校验恢复范围并确认。自导入教材须先在目标 App 安装对应课程；课程文件与学习备份分别迁移。恢复会替换目标档案，请先备份。

### 方式二：本地构建

参见 [BUILD.md](BUILD.md)。Android 使用 DCloud 5.26 离线 SDK、Java 21、Gradle 8.14.3 与 Android SDK 36，保留既有正式签名。缺少签名配置时停止，不退回 debug 签名。

## 功能

- **顺序学习与独立进度**：切换教材立即生效，各教材分别保存正式队列、输入草稿和完整学习进度。
- **六环节学习**：闪现、连接、听音、拼写、听写、复习巩固；能力起点 L1–L5 控制题型，缺少资源时明确降级。
- **自然拼读**：音块与发音同步高亮，采用红、绿、蓝；精确拆分和时间轴仅在已审核词条可用，其余使用整词回退。
- **间隔复习**：基于 ts-fsrs 的记忆排程；自由练习、重播和额外错词回看不重复改写正式排程或发奖。
- **单词本**：当前教材 / 全部单词、搜索、熟知度、到期、重点、错词、整册词卡与分页。
- **四象伙伴**：玄冥、祝融、后土、飞廉，包含陪伴、喂食、成长、装扮与相册。
- **家长设置**：随机乘法验证、每日新词上限、能力起点、课程管理、本机备份恢复和确认删除。
- **外观与适配**：瑞士专注、奶油粘土双主题；浅色、深色、大字体、减少动效、手机和平板响应布局。
- **离线内容**：JSON / CSV / 受控 Markdown / 媒体 ZIP 课程导入，文件大小、资源摘要、引用和路径校验。

公开检出默认提供 **20 个原创启蒙示例词、4 课**、离线系统语音和辅助插画，并保留原创课程 Schema 示例。它不是完整出版社教材或真人英式词典录音库。未取得公开授权的教材与媒体只在本机导入使用，不进入仓库或公开发布包。

## 技术栈

| 层级 | 实现 |
| --- | --- |
| 应用 | uni-app、Vue 3.4、TypeScript 5.6 |
| 状态 | Pinia 2.1，本地持久化与版本迁移 |
| 学习 | ts-fsrs 5.4，独立的学习 / 拼读 / 课程领域模块 |
| 构建 | Vite 5、Sass，DCloud CLI 5.26 固定版本 |
| Android | DCloud 离线 SDK 5.26、Gradle 8.14.3、AGP 8.12、Java 21 |
| 内容 | fflate 0.8，媒体摘要校验；H5 IndexedDB / App 本机文件区 |
| 验证 | Node test runner、tsx、vue-tsc、Playwright |
| 发布 | GitHub Actions、GitHub Pages、GitHub Releases |

## 开发与检查

需要 Node.js 24，首次安装后启用仓库 hooks：

```sh
npm ci
npm run git:hooks
npm run dev:h5
```

```sh
npm run purity
npm run typecheck
npm test
npx playwright install chromium
npm run test:ui
npm run build:h5
npm run build:app
npm run build:mp-weixin
npm run check:release
```

HBuilderX 导入项目时使用与 CLI 匹配的 **5.26** 基座。配置在 `src/manifest.json` 与 `src/pages.json`。独立 APK 和标准基座属于不同应用沙箱，安装 APK 不会自动继承基座档案。

默认视觉基线来自 Windows 客户端；CI 固定使用 Windows Server 2025 的独立合成基线，保持原像素差异阈值。完整界面测试分三组运行。手动基线工作流只导出使用合成档案生成的正式参考 PNG，需人工复核后提交；普通 CI 仅比较既有基线，不自动更新，也不上传 trace、HAR 或普通测试输出。

开发服务器默认只绑定本机回环地址，并限制私有文件访问。公开发行从干净检出构建，禁止启用本机课程或合成验收开关。编译成功与浏览器设备模拟不等于所有 Android、iOS 设备均已完成实测。

## 项目结构

```text
src/pages          首页、学习、宠物屋、单词本、设置、家长、成就与教材库
src/components     共享组件、品牌 Header、安装面板与学习卡片
src/stores         档案、课程、学习、活动、宠物、主题与复习状态
src/services       音频、媒体仓库、导入、备份迁移与导航
src/styles         主题 Token、响应布局与可访问性
packages           学习、FSRS、自然拼读、课程 Schema 等领域模块
android            无凭据、无 SDK 二进制的原生工程模板
tools/android      官方 SDK 校验、原生工程生成与 APK 审计
tests              单元测试、界面测试与合成视觉基线
.github/workflows  验证、网页部署与 Android Release 工作流
```

## 自动发布

`main` 更新后由 Actions 构建网页并部署 [GitHub Pages](https://sd3247930.github.io/WordPal/)。匹配版本的 `v*` 标签触发 Android 签名、审计与 Releases 发布，附件固定命名 `WordPal.apk`。启用 Android 云端构建前必须按 [BUILD.md](BUILD.md) 配置受保护的发布环境、官方 SDK 下载源与签名参数；未配置时不会生成伪成功安装包。

## 数据与公开范围

学习数据默认留在当前设备。课程导入与学习备份是两种不同文件；备份包含个人学习记录，不能上传仓库。使用 DCloud 运行时的发行包还受其 SDK 协议和隐私条款约束。

根目录 `private/`、`docs/`、本机词库、签名与环境配置、依赖、构建产物和临时测试输出均不存档、不推送。每次提交、推送前执行纯净扫描，提交 hook 另扫描整个 Git 索引，推送 hook 检查提交历史。审计报告只保存在本机，不打印密码或 Key 原值。

源码许可证尚未另行授予；可查看和参考公开源码，其他使用须向维护者确认。素材与教材的授权独立于源码，见 [ASSET_RIGHTS.md](ASSET_RIGHTS.md)；第三方运行库见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。贡献说明与漏洞反馈见 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md)。
