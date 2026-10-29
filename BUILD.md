# 构建与发布 WordPal

WordPal 使用 **uni-app / Vue 3 / TypeScript / Pinia**，Android 使用 **DCloud 5.26 离线 SDK + Gradle**。本项目没有 Capacitor，不使用 `cap sync`。

## 网页与开发

需要 Node.js 24、npm 和项目锁定的依赖。

```sh
npm ci
npm run git:hooks
npm run typecheck
npm test
npm run dev:h5
```

生成网页：`npm run build:h5`。GitHub Pages 构建设置 `WORDPAL_BASE_PATH=/WordPal/`，产物为 `dist/build/h5/`，使用 hash 路由。

公开构建必须在不含本机词库和私用素材的干净检出中执行，保持 `VITE_WORDPAL_LOCAL_CONTENT=0`。`private/`、`docs/`、本机课程目录、测试输出和签名文件均不纳入 Git、网页部署或 Release 附件。

## Android 本地构建

1. 安装 Java 21、Gradle 8.14.3、Android SDK Platform 36 和 Build Tools 36.0.0，配置 `ANDROID_HOME`。
2. 从 [DCloud 官方 Android 离线 SDK 页面](https://nativesupport.dcloud.net.cn/AppDocs/download/android.html) 下载与编译器一致的 **5.26.2026091802** 正式版，并解压到本机非公开目录。
3. 执行 `npm ci`、`npm run build:app`。
4. 执行下列命令，将 `<sdk-directory>` 换为本机解压位置。工具仅提取六个 SHA256 已锁定的库，创建的工程与媒体都留在被忽略的 `build/`。

```sh
node tools/android/prepare-project.mjs --sdk <sdk-directory>
gradle --no-daemon --project-dir build/android assembleRelease
node tools/android/audit-release.mjs
```

构建前由当前进程环境注入下列配置，**不要把实际值写进命令、源码、Gradle 文件或提交信息**：

| 配置 | 用途 |
| --- | --- |
| `WORDPAL_DCLOUD_APPKEY` | 与 AppID、包名和签名相匹配的 DCloud Android 客户端 AppKey |
| `WORDPAL_SIGN_STORE_FILE` | 仅在本机/临时运行器存在的签名文件位置 |
| `WORDPAL_SIGN_ALIAS` | 既有证书别名 |
| `WORDPAL_SIGN_STORE_PASSWORD` | 证书库密码 |
| `WORDPAL_SIGN_KEY_PASSWORD` | 私钥密码 |
| `WORDPAL_EXPECTED_CERT_SHA256` | 预期证书公开 SHA256 指纹，用于最终校验 |

版本以 `package.json` 和 `src/manifest.json` 为准，两处必须一致；包名固定 `com.wordpal.app`。通过审计后的附件为 `build/release/WordPal.apk` 与 `WordPal.apk.sha256`。

Vite 编译同时生成被 Git 忽略的 `src/static/build-info.json` 并复制到运行资源。其应用版本、提交与源码 SHA256 用于比对 HBuilderX、网页和 APK；指纹包含应用源码、公开静态资源及编译配置，统一文本换行，排除本机教材/媒体与生成标识自身。APK 审计要求这些字段匹配当前发布检出，并拒绝开发模式或含本机内容的构建。调试与正式包的编译模式及沙箱不同，不以整个二进制字节相同作为一致性条件。

**缺少正式签名时终止构建，不自动使用 debug 签名。** 已安装正式版需要沿用原证书，随意切换签名会导致无法覆盖升级。DCloud 客户端 AppKey 按官方机制进入 APK，证书私钥及密码不进入 APK。

## GitHub Actions

- `verify.yml`：检查源码纯净度、类型、测试及三个平台编译。
- `pages.yml`：`main` 更新后构建公开 H5 并部署 GitHub Pages。
- `android-release.yml`：推送与版本一致的 `v*` 标签后，构建、签名、审计并创建 Releases。只在本仓库的标签上运行，不在 PR 中使用签名配置。

先在 GitHub 启用 Actions 来源的 Pages，并创建 `android-release` Environment。正式签名涉及将凭据交给 GitHub 运行器；项目的凭据禁止上传规则仍然适用，**只有仓库所有者明确允许将下列项目存入加密 Environment Secrets 后才能配置**。

| Environment Secrets | 内容 |
| --- | --- |
| `WORDPAL_DCLOUD_APPKEY` | 既有匹配 AppKey |
| `WORDPAL_SIGN_STORE_BASE64` | 既有 keystore 文件的 Base64，仅保存为加密 Secret |
| `WORDPAL_SIGN_ALIAS` | 既有别名 |
| `WORDPAL_SIGN_STORE_PASSWORD` / `WORDPAL_SIGN_KEY_PASSWORD` | 既有密码 |
| `WORDPAL_ANDROID_SDK_URL` | 可由运行器下载的官方 5.26 SDK HTTPS 归档地址，不能直接使用网盘分享页面 |

Environment Variables：`WORDPAL_ANDROID_SDK_SHA256` 为该归档的 SHA256；`WORDPAL_EXPECTED_CERT_SHA256` 为既有证书的公开 SHA256。SDK 归档不提交源码库；脚本同时校验归档与六个实际库的摘要，版本不符将终止。

本仓库构建依赖使用 [官方 5.26 运行库归档](https://github.com/sd3247930/WordPal/releases/tag/android-sdk-5.26)，仅包含六个已核验运行库及原始许可，不含项目本机教材、媒体或文档。该预发布依赖不设为最新版，APK 固定直链只指向正式应用 Release。`android-release` 环境限制为 `v*` 标签，工作流还校验标签属于 `main` 历史且与源码版本一致。

配置齐全后运行：

```sh
npm run purity
git tag v<package-version>
git push origin v<package-version>
```

在 GitHub Actions 查看 Android release 任务。成功后附件固定命名为 **WordPal.apk**，最新版直链为 [下载 WordPal APK](https://github.com/sd3247930/WordPal/releases/latest/download/WordPal.apk)。Secrets 缺失时流程明确失败，不发布无法升级或无法启动的替代包。

## 发布边界

公开包提供原创启蒙示例内容。出版社教材、用户课程、真人词典音频、学习档案和本机设计文档不能随公开构建上传。素材授权记录见 [ASSET_RIGHTS.md](ASSET_RIGHTS.md)，第三方依赖说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

签名文件、密码、AppKey 原值和用户学习备份不得成为 Git 文件、Actions 日志或 Release 附件。每次存档先执行纯净扫描，再扫描整个暂存区；不能绕过 hooks。
