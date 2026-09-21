# M3 - 后端 API 与管理体系完善

## 本次完成
- 后端 `backend`（Express）扩展接口：
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/auth/change-password`
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `DELETE /api/admin/users/:username`
  - `GET /api/handbook/published`
  - `GET /api/handbook/draft`
  - `PUT /api/handbook/draft`
  - `POST /api/handbook/publish`
  - `POST /api/upload/image`
- 管理员由单账号升级为多账号（`admins[]`），支持管理员新增/移除管理员。
- 登录新增首次改密标记（`forceChangePassword`），默认密码首次登录会强制提示修改。
- 手册 `meeting` 新增 `backgroundUrl` 字段，支持首页背景图上传和替换。
- 前端 `src/api/client.js` 已对接新接口，增加 401 处理和管理员管理方法。
- 管理后台新增：
  - 操作日志面板（可查看登录、改密、保存、发布、账号变更记录）
  - 数据看板（模块数、启用数、管理员数、更新时间）
  - Logo 与背景图上传
  - 管理员账号管理
  - 首次登录改密弹层与发布前拦截

## 说明
- 上传接口默认返回本地 `/uploads/...` 静态路径，适合开发联调。
- 可通过 `STORAGE_DRIVER=external` + `UPLOAD_BASE_URL` 映射到外部存储地址。
- 当前数据持久化仍为 `backend/src/data/store.json`，后续可平滑替换 MySQL。

