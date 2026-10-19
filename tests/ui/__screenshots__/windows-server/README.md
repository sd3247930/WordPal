# Windows Server 合成视觉基线

此目录为固定 `windows-2025` GitHub Actions 运行器、Playwright 1.56.1 的正式参考 PNG；使用源码中的合成学习档案，不含用户真实学习记录、账号截图或私有设计源图。

生成记录：[基线渲染任务](https://github.com/sd3247930/WordPal/actions/runs/39199374106)，应用源码版本 1.2.3。112 张 PNG 已核对文件清单、图片元数据，并复核手机浅色、手机深色、平板宠物屋及单词本的代表性画面。

Windows 客户端与 Server 的字体回退和行高有所差异，客户端基线保留在父目录。设置 `WORDPAL_VISUAL_PROFILE=windows-server` 选择本组；CI 保留 1% 像素差异阈值并禁止自动更新。基线生成与回归比较是两个独立步骤，参考图审核通过后仍必须运行完整回归。
