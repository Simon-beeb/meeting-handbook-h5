# M5 - 正式上线（方案B）

目标：让用户可通过公网 HTTPS 链接直接打开（手机/电脑都可）。

## 架构
- 前端：Vercel（静态站点，自动 HTTPS）
- 后端：Render（Node API，自动 HTTPS）

## 0. 准备代码仓库
1. 把项目上传到 GitHub（一个仓库即可）。
2. 目录结构保持：
   - `frontend/`
   - `backend/`

## 1. 部署后端（Render）
1. 登录 Render，点击 **New +** → **Web Service**。
2. 选择你的 GitHub 仓库。
3. 配置：
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 环境变量（Environment）：
   - `PORT=8090`
   - `CORS_ORIGIN=https://<你的前端域名>`
   - `TOKEN_SECRET=<至少32位随机字符串>`
   - `TOKEN_TTL_SECONDS=604800`
   - `STORAGE_DRIVER=local`
   - `UPLOAD_BASE_URL=`（留空）
5. 部署完成后记下后端地址，例如：
   - `https://meeting-handbook-api.onrender.com`

## 2. 部署前端（Vercel）
1. 登录 Vercel，点击 **Add New** → **Project**。
2. 导入同一个 GitHub 仓库。
3. 配置：
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 在 Environment Variables 增加：
   - `VITE_USE_MOCK=false`
   - `VITE_API_BASE_URL=https://<你的后端域名>`
5. 点击 Deploy。
6. 部署后获得前端地址，例如：
   - `https://meeting-handbook.vercel.app`

## 3. 回填后端 CORS
把 Render 的 `CORS_ORIGIN` 改成你的真实前端域名（如上），保存后重启后端服务。

## 4. 手机直接打开
手机直接访问前端公网地址：
- `https://meeting-handbook.vercel.app`

然后可以在浏览器菜单选择“添加到主屏幕”。

## 5. 验收清单
- 访客端模块正常打开
- 管理员可登录
- 首次默认密码会强制改密
- Logo/背景图可上传
- 保存/发布成功
- 操作日志可见

## 6. 生产建议
- 必须改默认管理员密码
- `TOKEN_SECRET` 使用高强度随机值
- `CORS_ORIGIN` 不要使用 `*`
- 后续可将 `store.json` 迁移到 MySQL
