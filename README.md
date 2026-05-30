# YY IM 即时通讯系统

一套完整的 IM 即时通讯解决方案，包含：

- **后端服务** (`server/`)：Go + Gin + GORM + MySQL，单二进制部署，内置 WebSocket 实时消息，并托管 Web 管理后台静态资源。监听端口 **2026**。
- **Web 管理后台** (`admin/`)：React + Ant Design，提供快速安装向导、管理员登录、用户/会话/消息管理、在线统计等。
- **移动端 App** (`mobile/`)：React Native (Expo) + Ant Design Mobile，内置后端地址 `https://api.mizhiyun.cloud`，支持注册/登录、通讯录、单聊/群聊、基于 WebSocket 的实时消息。

## 架构概览

```
┌────────────────────┐        WSS / HTTPS        ┌──────────────────────────────┐
│  React Native App   │ ───────────────────────▶ │  Go 后端 (端口 2026)           │
│  (api.mizhiyun.cloud)│                          │  - REST API  /api/*           │
└────────────────────┘                           │  - WebSocket /api/ws          │
                                                  │  - 托管 ./web 静态资源 (管理后台) │
┌────────────────────┐         HTTP/HTTPS         │  - MySQL (GORM)               │
│  浏览器 (管理后台)    │ ───────────────────────▶ │                               │
└────────────────────┘                           └──────────────────────────────┘
```

## 部署（生产）

后端编译为单个 Linux 二进制文件，**二进制与 `web/` 静态资源目录同级**：

```
/opt/yy-im/
├── yy-im          # 后端可执行文件
└── web/           # 管理后台静态资源 (admin 构建产物)
    ├── index.html
    └── assets/
```

1. 从 [Releases](../../releases) 下载对应架构的二进制（`yy-im-linux-amd64` 或 `yy-im-linux-arm64`）与 `web.zip`，解压 `web.zip` 使 `web/` 与二进制同级。
2. 运行二进制：`./yy-im-linux-amd64`（默认监听 `:2026`，可用环境变量 `YY_PORT` 覆盖）。
3. 浏览器访问 `http://<服务器IP或域名>:2026`，会自动进入 **快速安装页面**。
4. 填写 MySQL 连接信息与管理员账号（默认 `admin / admin123`），点击安装。
5. 安装完成后即可使用管理员账号登录管理后台。
6. 移动端 App 已内置 `https://api.mizhiyun.cloud`，后端正常运行即可直接使用。

> 安装信息会写入二进制同级目录的 `config.json`（可参考 `config.example.json`）。删除该文件可重新触发安装流程。

### 版本与自动升级

当前应用版本为 **V1**。后端启动时会读取数据库中记录的版本号，若与当前版本不一致，会自动执行 `AutoMigrate`（新增表/字段）并将版本号更新为当前版本。因此**新增的数据表和字段只需重启后端即可生效**，无需手动迁移。

## 本地开发

### 后端

```bash
cd server
go run .            # 监听 :2026；YY_WEB_DIR 可指定静态资源目录
```

### 管理后台

```bash
cd admin
npm install
npm run dev         # http://localhost:5173 ，/api 已代理到 :2026
```

### 移动端

```bash
cd mobile
npm install --legacy-peer-deps
npm start           # Expo 开发服务器
```

## 持续集成 / 打包

GitHub Actions 工作流位于 `.github/workflows/`：

- **`ci.yml`**：在 push / PR 时对后端 (`go vet` + `go build`)、管理后台 (`lint` + `build`)、移动端 (`typecheck`) 进行校验。
- **`release.yml`**：在打 tag (`v*`) 或手动触发时：
  - 构建管理后台并交叉编译 Linux (amd64/arm64) 二进制，**直接产出独立资源**：`yy-im-linux-amd64`、`yy-im-linux-arm64`、`web.zip`、`config.example.json`（不再嵌套打包）。
  - 通过 `expo prebuild` + Gradle 构建 Android **APK** (`yy-im.apk`)。
  - 打 tag 时自动上传到对应 GitHub Release。

## 主要 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/install/status` | 安装状态 |
| POST | `/api/install` | 执行安装 |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/me` | 当前用户 |
| GET | `/api/users/search` | 搜索用户 |
| GET/POST | `/api/contacts` | 通讯录 |
| GET | `/api/conversations` | 会话列表 |
| POST | `/api/conversations/private` | 打开/创建单聊 |
| POST | `/api/conversations/group` | 创建群聊 |
| GET/POST | `/api/conversations/:id/messages` | 历史消息 / 发送消息 |
| GET | `/api/ws` | WebSocket（实时消息） |
| GET | `/api/admin/users` | 用户列表（支持 `keyword` 搜索） |
| POST | `/api/admin/users/:id/ban` | 封禁用户（原因 + 可选起止时间） |
| POST | `/api/admin/users/:id/unban` | 解封用户 |
| GET | `/api/admin/groups` | 群聊列表 |
| GET | `/api/admin/groups/:id/members` | 群成员列表 |
| DELETE | `/api/admin/groups/:id/members/:uid` | 移除群成员 |
| DELETE | `/api/admin/groups/:id` | 解散群聊 |
| GET | `/api/admin/*` | 其余管理后台接口（需管理员） |

### WebSocket 协议

连接：`wss://<host>/api/ws?token=<JWT>`

客户端 → 服务端：

```json
{ "type": "send", "data": { "conversation_id": 1, "type": "text", "content": "你好" } }
{ "type": "read", "data": { "conversation_id": 1, "last_message_id": 99 } }
```

服务端 → 客户端：

```json
{ "type": "message",  "data": { /* Message */ } }
{ "type": "read",     "data": { "conversation_id": 1, "user_id": 2, "last_message_id": 99 } }
{ "type": "presence", "data": { "user_id": 2, "online": true } }
```
