# M4 - 手机直连与 PWA

## 本次完成
- 支持手机同 Wi-Fi 直连访问（前端 `dev:lan`）。
- 前端 API 地址支持自动推断：`VITE_API_BASE_URL` 留空时使用 `http://<当前域名>:8090`。
- 后端 CORS 支持 `*` 或逗号分隔白名单，便于开发期手机联调。
- 新增 PWA 基础能力：
  - `public/manifest.webmanifest`
  - `public/sw.js`
  - `public/icons/icon.svg`
- 首页新增手机使用提示，可引导“添加到主屏幕”。

## 开发期手机使用说明
1. 电脑与手机连接同一 Wi-Fi。
2. 启动后端：`npm run dev`（8090）。
3. 启动前端：`npm run dev:lan`（5173）。
4. 手机访问：`http://<电脑IP>:5173`。

## 备注
- `CORS_ORIGIN=*` 仅建议开发期使用；生产请改为明确白名单域名。
- 当前仍是 H5 + PWA 方案，若后续上架微信生态，可在此基础迁移到微信小程序端。
