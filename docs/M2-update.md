# M2 - 接口形态与管理链路

## 本次完成
- 前端接入 mock API（localStorage 持久化，接口语义与真实后端一致）。
- 管理员登录页、后台页、路由守卫打通。
- 访客端读取“已发布配置”；管理员编辑“草稿配置”并发布。
- 支持管理员修改密码接口（当前在 store 已接入）。

## 新增核心文件
- `src/api/mockServer.js`：模拟服务层（login、draft、publish）。
- `src/stores/auth.js`：认证状态管理。
- `src/stores/handbook.js`：会议手册数据状态管理。
- `src/views/AdminLoginView.vue`：后台登录。
- `src/views/AdminDashboardView.vue`：草稿编辑与发布。
- `src/views/ModuleDetailView.vue`：模块详情页。

## 下一步（M3）
1. 对接真实后端 API。
2. 增加图片上传、模块排序、模块开关。
3. 增加“草稿与发布版本差异提示”。
4. 增加管理员密码强制修改弹层。
