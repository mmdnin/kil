# WaveMaker Cards - 现代化写作应用

基于 wavemaker-v5 重构的纯前端写作应用，采用现代化玻璃态 UI 设计，支持卡片管理、可视化关系图、自动保存等功能。

## ✨ 特性亮点

### 🎨 现代化 UI 设计
- **玻璃态/毛玻璃效果**：采用亚克力材质设计，通透轻盈
- **柔和配色**：紫色渐变主题，视觉舒适
- **圆角设计**：大量使用圆角元素，操作友好
- **流畅动画**：丝滑的过渡效果

### 📝 核心功能
- **智能编辑器**：基于 TipTap 的富文本编辑器
- **自动保存**：浏览器文件系统 API + 防抖动自动保存
- **卡片系统**：数据库/词典卡片管理，支持正文引用
- **关系图谱**：可拖动的星图/连线图（类似 ComfyUI）
- **思维导图**：可视化知识结构

### 🔧 技术优势
- **纯前端架构**：无需后端服务器，数据本地存储
- **PWA 支持**：离线可用，可安装为桌面应用
- **响应式设计**：适配各种设备尺寸

---

## 🚀 快速开始（开箱即用）

### 方式一：直接运行（推荐）

```bash
# 1. 进入项目目录
cd wavemaker-v2

# 2. 安装依赖（首次运行需要）
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 打开浏览器访问 http://localhost:3434
```

### 方式二：生产环境构建

```bash
# 1. 构建生产版本
npm run build

# 2. 预览构建结果
npm run preview

# 3. 部署
# 将 dist/ 目录部署到任意静态网站托管服务
# 如：Vercel, Netlify, GitHub Pages, Nginx 等
```

### 方式三：直接使用构建后的 H5 应用

如果你想要完全独立的 H5 应用文件：

```bash
# 构建后，dist/ 目录包含所有静态资源
# 可以直接用浏览器打开 dist/index.html
# 或部署到任何 Web 服务器
```

---

## 📦 项目结构说明

```
wavemaker-v2/
├── index.html          # 入口 HTML 文件
├── package.json        # 项目配置和依赖
├── vite.config.js      # Vite 构建配置
├── public/             # 静态资源目录
│   └── favicon.ico
├── src/                # 源代码目录
│   ├── main.js         # 应用入口
│   ├── App.vue         # 根组件
│   ├── css/            # 样式文件
│   │   └── global.css  # 全局样式（玻璃态效果等）
│   ├── components/     # 组件目录
│   │   ├── HomeView.vue       # 主页视图
│   │   ├── TopToolbar.vue     # 顶部工具栏
│   │   ├── RelationshipGraph.vue  # 关系图谱组件
│   │   ├── Cards/
│   │   │   └── CardsView.vue  # 卡片管理视图
│   │   ├── Mindmap/
│   │   │   └── MindMapView.vue # 思维导图视图
│   │   └── Writer/
│   │       ├── WriterView.vue    # 写作编辑器视图
│   │       ├── TipTapEditor.vue  # TipTap 编辑器组件
│   │       └── BookSidebar.vue   # 书籍侧边栏
│   ├── mixins/         # Vue 混入
│   └── store/          # 状态管理
└── node_modules/       # 依赖包（构建后生成）
```

---

## ❓ 常见问题

### Q: 为什么项目里看起来只有 JS 文件？

**A:** 实际上项目使用的是 **Vue 3 单文件组件 (.vue 文件)**，这是一种将 HTML、CSS、JavaScript 整合在一起的文件格式。

查看源码请关注：
- `src/App.vue` - 根组件
- `src/components/*.vue` - 各个功能组件
- `src/main.js` - 应用入口（仅少量初始化代码）

`.vue` 文件在构建时会被 Vite 编译成浏览器可执行的 JavaScript，所以你在 `dist/` 构建目录中看到的会是编译后的 JS 文件。

**技术栈说明：**
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **TipTap** - 富文本编辑器框架
- **Dexie.js** - IndexedDB 封装库（用于本地数据存储）
- **SweetAlert2** - 美观的弹窗库

### Q: 如何修改样式/UI？

**A:** 主要样式文件位于：
- `src/css/global.css` - 全局样式（玻璃态效果、配色方案）
- 各组件内的 `<style>` 标签 - 组件级样式

修改玻璃态效果可调整 `backdrop-filter`、`background` 的 rgba 值等属性。

### Q: 自动保存在哪里？

**A:** 数据存储在浏览器的 **IndexedDB** 中，使用 Dexie.js 进行管理。
- 打开浏览器开发者工具 → Application → IndexedDB 可查看数据
- 支持通过卡片系统的导出功能备份数据

### Q: 如何自定义主题颜色？

**A:** 修改 `src/css/global.css` 中的 CSS 变量：
```css
:root {
  --primary-color: #8b5cf6;  /* 主色调 */
  --glass-bg: rgba(255, 255, 255, 0.1);  /* 玻璃背景 */
  --glass-border: rgba(255, 255, 255, 0.2);  /* 玻璃边框 */
}
```

---

## 🛠️ 开发指南

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

### 添加新功能

1. 在 `src/components/` 创建新组件
2. 在 `App.vue` 中注册路由/导航
3. 使用 Dexie.js 进行数据存储
4. 遵循现有玻璃态设计规范

---

## 📱 部署指南

### 部署到 Vercel（推荐）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 构建项目
npm run build

# 3. 部署
vercel --prod
```

### 部署到 GitHub Pages

```bash
# 1. 安装 gh-pages
npm install --save-dev gh-pages

# 2. 在 package.json 添加脚本
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# 3. 执行部署
npm run deploy
```

### 使用 Nginx 部署

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🎯 使用说明

### 写作流程

1. **进入写作页面**：从主页点击「新建文章」或选择已有文章
2. **编辑内容**：使用富文本编辑器编写内容
3. **引用卡片**：输入 `@` 可快速引用数据库/词典卡片
4. **自动保存**：编辑内容会自动保存，无需手动操作
5. **查看关系**：切换到关系图谱查看卡片间的关联

### 卡片管理

1. **创建卡片**：在卡片视图新建数据库/词典卡片
2. **编辑卡片**：点击卡片进行编辑
3. **建立关联**：在卡片间建立连接关系
4. **可视化展示**：在关系图谱中拖动节点查看结构

### 关系图谱操作

- **拖动节点**：鼠标左键拖动节点调整位置
- **缩放视图**：鼠标滚轮缩放
- **平移画布**：鼠标右键拖动或空格 + 左键
- **查看详情**：点击节点查看卡片详情

---

## 🔗 相关资源

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [TipTap 编辑器](https://tiptap.dev/)
- [Dexie.js](https://dexie.org/)
- [原项目 wavemaker-v5](https://github.com/wavemakercards/wavemaker-v5)

---

## 📄 许可证

本项目基于 wavemaker-v5 改写，遵循原项目许可证。

---

## 💡 提示

- 首次运行请确保网络连接正常（需下载依赖）
- 建议使用现代浏览器（Chrome、Edge、Firefox 最新版）
- 定期通过卡片系统导出数据以防丢失
- 生产环境部署前请运行 `npm run build` 进行优化构建

祝你使用愉快！🎉
