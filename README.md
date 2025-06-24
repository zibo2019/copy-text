# Smart Text Extractor - 智能文本提取器

<div align="center">

![Smart Text Extractor](assets/icon.png)

**一键复制网页所有元素或选中区域的纯文本**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Plasmo](https://img.shields.io/badge/built%20with-Plasmo-blueviolet.svg)](https://docs.plasmo.com/)

[功能特性](#功能特性) • [安装使用](#安装使用) • [开发指南](#开发指南) • [贡献指南](#贡献指南)

</div>

## 📖 项目简介

Smart Text Extractor 是一款强大的浏览器扩展，专为高效提取网页文本内容而设计。支持智能文本提取、格式清理，完全本地处理保护隐私。无论是复制整个页面的文本内容，还是精确选择特定区域，都能轻松完成。

## ✨ 功能特性

### 🎯 核心功能

- **一键复制全页** - 快速提取整个网页的文本内容
- **智能元素选择** - 精确选择页面中的任意元素进行文本提取
- **记忆上次选择** - 自动记住上次选择的元素，支持快速重复操作
- **编辑模式** - 切换页面可编辑状态，方便内容修改

### 🛠️ 智能处理

- **格式清理** - 自动清理多余的空白字符和格式
- **内容过滤** - 智能过滤广告、导航等无关内容
- **结构保持** - 可选择保持原有的文本结构和层次

### ⚡ 便捷操作

- **快捷键支持** - `Ctrl+Shift+C` 快速复制全页，`Ctrl+Shift+S` 选择元素
- **右键菜单** - 集成到浏览器右键菜单，随时可用
- **悬浮按钮** - 页面右上角悬浮按钮，支持自动隐藏
- **操作通知** - 实时反馈操作状态和结果

### 🔒 隐私保护

- **完全本地处理** - 所有文本处理都在本地进行，不上传任何数据
- **无网络请求** - 扩展运行过程中不会发送任何网络请求
- **数据安全** - 用户数据仅存储在本地浏览器中

## 🚀 安装使用

### 从源码安装

1. **克隆项目**

   ```bash
   git clone https://github.com/zibo2019/copy-text.git
   cd smart-text-extractor
   ```

2. **安装依赖**

   ```bash
   pnpm install
   # 或者使用 npm
   npm install
   ```

3. **构建扩展**

   ```bash
   pnpm build
   # 或者使用 npm
   npm run build
   ```

4. **加载到浏览器**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `build/chrome-mv3-prod` 文件夹

### 使用方法

#### 基础操作

1. **复制全页文本**
   - 点击页面右上角的悬浮按钮
   - 选择"复制全页"
   - 或使用快捷键 `Ctrl+Shift+C`

2. **选择元素提取**
   - 点击悬浮按钮选择"选择元素"
   - 鼠标悬停在目标元素上
   - 点击选中的元素即可复制其文本内容

3. **重复上次选择**
   - 如果之前选择过元素，菜单中会显示"上次选择"选项
   - 点击即可快速复制相同元素的文本

#### 高级设置

- **自动清理格式** - 清除多余的空白字符和换行
- **显示操作通知** - 显示复制成功等状态提示
- **自动隐藏按钮** - 鼠标离开后自动隐藏悬浮按钮
- **彻底隐藏按钮** - 完全隐藏悬浮按钮，仅通过快捷键使用

## 🛠️ 开发指南

本项目基于 [Plasmo](https://docs.plasmo.com/) 框架开发，使用 TypeScript 和 React。

### 开发环境设置

1. **启动开发服务器**

   ```bash
   pnpm dev
   # 或者使用 npm
   npm run dev
   ```

2. **加载开发版本**
   - 在浏览器扩展管理页面加载 `build/chrome-mv3-dev` 文件夹
   - 代码修改后会自动重新构建

### 项目结构

```
smart-text-extractor/
├── assets/              # 静态资源
│   └── icon.png        # 扩展图标
├── background.ts        # 后台脚本
├── content.ts          # 内容脚本（核心功能）
├── popup.tsx           # 弹出窗口界面
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
└── README.md          # 项目说明
```

### 核心文件说明

- **`content.ts`** - 主要的文本提取逻辑，包含智能选择器生成、文本处理等
- **`popup.tsx`** - 扩展的设置界面和快速操作面板
- **`background.ts`** - 后台服务，处理快捷键、右键菜单等
- **`package.json`** - 定义了扩展的权限、命令等配置

### 构建发布

```bash
# 构建生产版本
pnpm build

# 打包扩展（生成 .zip 文件）
pnpm package
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 进行类型安全的开发
- 遵循 ESLint 和 Prettier 的代码格式规范
- 为新功能添加适当的注释和文档
- 确保代码在不同浏览器中的兼容性

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Plasmo](https://docs.plasmo.com/) - 优秀的浏览器扩展开发框架
- [React](https://reactjs.org/) - 用户界面构建库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

## 📞 联系方式

如果您有任何问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/your-username/smart-text-extractor/issues)
- 发送邮件至：<18838186892@163.com>

---

<div align="center">

**如果这个项目对您有帮助，请给它一个 ⭐️**

</div>
