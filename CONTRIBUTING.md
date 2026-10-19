# 贡献指南

项目源码许可证尚待维护者确定，素材再分发范围也需单独确认。在许可明确前，请勿将本仓库视为已获得开源再分发授权。

## 本地验证

使用 Node.js 22（至少 22.18）或 24（至少 24.11）及锁定依赖：

```sh
npm ci
npm run git:hooks
npm run typecheck
npm test
npm run build:h5
npm run build:app
npm run build:mp-weixin
npm run check:release
npx playwright install chromium
npm run test:ui
```

HBuilderX 使用 5.26，与当前 DCloud 编译器版本组匹配。H5 默认仅监听本机。正式发布包不得包含合成测试课程；开发模式可使用测试课程，特殊生产验收构建需显式设置 `VITE_WORDPAL_ACCEPTANCE=1`，此类产物不得作为普通发行包。

## 修改与测试

- 遵循 AGENTS.md。保留现有学习、复习、奖励、家长保护和四象伙伴的业务约定。
- 用合成档案验证删除、卸载与故障恢复；不要用真实教材和儿童档案做破坏性回归。
- 选择必需的有效配置与临时视觉高亮分别处理；重复点击取消高亮不能使课程、主题或学习模式变成无效配置。
- 修改截图基线前解释布局变化，核对实际图片和无障碍行为；不要放宽阈值掩盖缺陷。
- 使用小而聚焦的提交，并说明修改目的、测试结果、未覆盖平台与回退方式。

## 公开内容

`private/`、`docs/`、依赖、构建输出、测试报告与原始档案不得提交。新增字体、图片、音频和教材须先核实再分发授权、元数据与来源。每次暂存、提交或推送前运行 `npm run purity`；禁止强制加入忽略目录或绕过 hooks。安全问题按 SECURITY.md 处理。
