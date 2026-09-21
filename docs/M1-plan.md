# M1 - H5 前端工程初始化（移动优先）

## 本次完成
- 建立 `frontend` 正式工程骨架（Vite + Vue3 + Router + Pinia）。
- 迁移手机端首页与议程页为组件化结构。
- 采用移动优先样式，最大宽度按手机画布控制，平板/桌面自动扩展。

## 目录
- `frontend/src/views/HomeView.vue`：手机端首页（模块入口）
- `frontend/src/views/AgendaView.vue`：手机端议程页
- `frontend/src/styles.css`：移动优先全局样式

## 下一步（M2）
1. 接入后端 API（登录、配置读取、配置发布）。
2. 增加管理员路由与权限守卫。
3. 图片上传改为对象存储服务。
4. 加入草稿/发布双版本机制。

## 启动（有 Node 环境时）
```bash
cd frontend
npm install
npm run dev
```
