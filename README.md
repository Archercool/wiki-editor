# 在线可编辑知识库

基于 GitHub Pages 的在线知识库，支持网页直接编辑。

## 功能特点

- **在线阅读**：任何人都可以浏览知识库
- **在线编辑**：登录 GitHub 后可直接在网页上编辑
- **实时预览**：编辑时支持分屏预览
- **图片上传**：支持粘贴、拖拽、点击上传图片
- **自动部署**：保存后自动部署到 GitHub Pages

## 快速开始

### 阅读知识库

直接访问：`https://archercool.github.io/wiki-editor/`

### 编辑知识库

1. 点击页面右下角的编辑按钮 ✏️
2. 输入你的 GitHub Personal Access Token
3. 编辑文章并保存

### 获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 填写 Note: `wiki-editor`
4. 勾选权限: `repo`
5. 点击 "Generate token"
6. 复制生成的 Token

## 目录结构

```
wiki-editor/
├── index.html          # 阅读入口（Docsify）
├── edit.html           # 编辑器页面
├── js/
│   ├── auth.js         # 认证模块
│   ├── github-api.js   # GitHub API 封装
│   ├── editor.js       # 编辑器核心逻辑
│   └── uploader.js     # 图片上传模块
├── css/
│   └── edit.css        # 编辑器样式
├── wiki/               # 知识库内容
│   ├── INDEX.md
│   ├── AI/
│   ├── 产品优化/
│   └── ...
├── assets/
│   └── images/         # 图片存储
├── _sidebar.md         # 侧边栏导航
└── HOME.md             # 首页
```

## 技术栈

- **阅读端**：Docsify（静态文档生成器）
- **编辑器**：Vditor（所见即所得 Markdown 编辑器）
- **存储**：GitHub API（直接操作仓库）
- **部署**：GitHub Pages + GitHub Actions

## 快捷键

- `Ctrl + S`：保存文章
- `Ctrl + Z`：撤销
- `Ctrl + Shift + Z`：重做
- `Ctrl + E`：切换预览模式

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/Archercool/wiki-editor.git
cd wiki-editor

# 本地运行（需要 Python）
python -m http.server 8080

# 或使用 Node.js
npx serve .
```

## License

MIT
