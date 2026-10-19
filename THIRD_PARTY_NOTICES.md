# 第三方组件

`fflate` 0.8.3 用于本机课程 ZIP 的压缩与解压，采用 MIT 许可。

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Android 发行采用 DCloud 官方 5.26 离线运行时。CI 依赖归档仅包含 `tools/android/runtime-libraries.json` 中锁定的六个原始 AAR 和官方 `license.md`，发布在 [SDK 构建依赖](https://github.com/sd3247930/WordPal/releases/tag/android-sdk-5.26)。官方许可允许免费使用和复制，DCloud 与其他原作者保留各自知识产权；该归档不属于 WordPal 原创源码许可。SDK 的隐私条款、使用限制和免责声明以归档中保留的官方许可为准。正式 APK 不包含证书私钥或密码。

其余依赖的许可随对应 npm / Maven 包提供。此文件不是全部依赖的完整许可清单；新增或升级依赖时需依据锁文件和实际捆绑内容继续核对版权声明、许可全文及 NOTICE。开发工具依赖与最终 App 内的运行库应分别核对。

图标、词表、录音与宠物素材的来源及再分发权限见 `ASSET_RIGHTS.md`，当前待权利人核验；清除图片元数据不等于获得授权。原始设计图、私有教材与内部文档不随公共源码发行。项目源码许可证仍待决定，不由本文件代为授权。
