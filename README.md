# 会议手册 H5（路线A）

移动优先的会议手册网页应用，包含访客端与管理员端。

## 当前进度
- M1：前端工程初始化（Vue3 + Vite）
- M2：访客端 + 管理端 + 草稿/发布流程（mock）
- M3：后端 API 对接 + 管理员体系 + 首次改密 + 背景图上传 + 操作日志
- M4：手机可直接访问（局域网）+ PWA 安装能力

## 目录
- `frontend/`：H5 前端
- `backend/`：API（Express + JSON持久化）
- `docs/`：阶段说明

## 启动后端
```bash
cd backend
npm install
npm run dev
```

## 启动前端
```bash
cd frontend
npm install
npm run dev:lan
```

## 手机直接访问（同一 Wi-Fi）
1. 在电脑执行 `ipconfig`，找到本机 IPv4（例如 `192.168.1.23`）。
2. 手机浏览器访问 `http://192.168.1.23:5173`。
3. 如果前端连接真实后端（`VITE_USE_MOCK=false`），请确保后端在电脑已启动，且 `.env` 中 `CORS_ORIGIN=*`（仅开发期）。
4. 手机浏览器可选择“添加到主屏幕”，像小程序一样打开。

## 前端环境变量
- `VITE_USE_MOCK=true`：使用本地 mock（默认）
- `VITE_USE_MOCK=false`：连接真实后端
- `VITE_API_BASE_URL=`：留空时自动用 `http://<当前域名>:8090`

## 后端环境变量
- `PORT=8090`
- `CORS_ORIGIN=*`（开发期）
- `TOKEN_SECRET=change-this-in-production`
- `TOKEN_TTL_SECONDS=604800`
- `STORAGE_DRIVER=local`：本地上传
- `STORAGE_DRIVER=external` + `UPLOAD_BASE_URL=https://your-cdn/path`：外部存储映射

## 默认登录
- 用户名：`admin`
- 密码：`admin123`
- 首次登录会强制提示修改密码

## 已支持能力
- 访客端只显示启用模块，并按排序展示
- 管理员可编辑模块标题/副标题/内容、显隐与排序
- 管理员可上传 Logo 和背景图（同一上传接口）
- 管理员可新增/移除其他管理员账号
- 管理员后台含简版数据看板（模块数、启用数、管理员数、更新时间）
- 管理员后台支持查看最近操作日志（登录、改密、保存、发布、管理员变更等）
- 管理员端新增手机底部导航与悬浮保存/发布快捷操作



## 正式上线（公网链接）
- 按 docs/M5-production-deploy.md 执行，可获得手机可直接打开的 HTTPS 链接。

