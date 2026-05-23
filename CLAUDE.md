# 高氏家族族谱系统

## 📋 项目概述

高氏家族族谱管理系统 — 一个完整的家族谱系 Web 应用，支持家族成员管理、族谱树可视化、数据统计、农历生辰转换、数据导入导出等功能。

- **前端**: React 18 + TypeScript + Ant Design 5 + Vite
- **后端**: Express (本地开发) / Cloudflare Pages Functions (部署)
- **数据库**: SQL.js (SQLite WebAssembly) + Cloudflare KV 持久化
- **数据源**: 预构建 SQLite 数据库（52 名成员，47 个辈分）

---

## 🚀 快速开始

### 本地开发

```bash
# 前端 + 后端 同时启动
npm run dev

# 或分别启动
npm run dev:server   # 后端 http://localhost:3001
npm run dev:client   # 前端 http://localhost:3000

# 单独运行 seed 填充数据库
cd server && npm run seed
```

### 本地预览 Cloudflare Pages

```bash
# 构建前端
npm run build

# 使用 wrangler 本地预览
npx wrangler pages dev client/dist
```

### 部署到 Cloudflare Pages

```bash
npm run pages:deploy
```

详见 [Cloudflare_Pages_部署指南.md](Cloudflare_Pages_部署指南.md)

---

## 🏗️ 技术架构

### 前端 (client/)

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Ant Design 5 | UI 组件库 |
| Vite | 构建工具 |
| Axios | HTTP 请求 |
| Recharts | 统计图表 |
| react-router-dom | 路由（预留） |
| dayjs | 日期处理 |
| html2canvas + jspdf | 导出 PDF |
| xlsx + file-saver | 导出 Excel |

### 后端 (server/ & functions/)

| 技术 | 用途 |
|------|------|
| Express | 本地开发服务器 |
| Cloudflare Pages Functions | 生产部署 |
| sql.js | SQLite WebAssembly 数据库 |
| multer | 头像文件上传（仅 Express） |
| lunar-javascript | 农历公历转换 |

### 数据库 (SQLite)

本地 Express 使用文件型 SQLite，Cloudflare 使用 KV 持久化。

**数据库加载优先级（server/db.js）**:
1. runtime `data.db`（/tmp 或本地）
2. `prebuilt.db` 预构建文件
3. `db-base64.js` 嵌入式 base64 字符串
4. `db_b64.txt` 文本文件
5. 空数据库（兜底）

**Cloudflare 加载优先级（functions/[[path]].js）**:
1. KV 命名空间 `DB` key: `db`
2. `db-base64.js` 嵌入式 base64 字符串
3. 空数据库（兜底）

---

## 📁 项目结构

```
gaoshijiazu1.0/
├── client/                        # React 前端
│   ├── src/
│   │   ├── api/index.ts           # API 请求封装
│   │   ├── types/index.ts         # TypeScript 类型定义
│   │   ├── App.tsx                # 主应用组件（左侧菜单导航）
│   │   ├── components/
│   │   │   ├── FamilyTree/        # 族谱导图（树形可视化）
│   │   │   ├── MemberForm/        # 成员新增/编辑表单
│   │   │   ├── Relationship/      # 关系查询
│   │   │   ├── Statistics/        # 数据统计（图表）
│   │   │   ├── LunarCalendar/     # 农历生辰转换
│   │   │   └── ImportExport/      # Excel/PDF 导入导出
│   │   └── styles/global.css      # 全局样式
│   ├── vite.config.ts             # Vite 配置（代理 /api → :3001）
│   └── package.json
│
├── server/                        # Express 后端（本地开发）
│   ├── index.js                   # 入口（端口 3001）
│   ├── app.js                     # Express 应用
│   ├── db.js                      # 数据库初始化（5 层降级加载）
│   ├── db-base64.js               # 嵌入式 base64 数据库
│   ├── db-helpers.js              # 数据库查询工具函数
│   ├── db_b64.txt                 # base64 文本备用
│   ├── prebuilt.db                # 预构建 SQLite 数据库
│   ├── seed.js                    # 种子数据（52 名成员 + 47 字辈）
│   └── routes/
│       ├── members.js             # 成员 CRUD + 族谱树
│       ├── generations.js         # 辈分列表
│       ├── statistics.js          # 统计数据聚合
│       └── lunar.js               # 农历生辰转换
│
├── functions/
│   └── [[path]].js                # Cloudflare Pages Functions 入口（全部路由）
│
├── wrangler.toml                  # Cloudflare 配置
├── package.json                   # 根项目管理
│
├── 人物关系，简介以及资料.txt       # 家族谱系完整文档
├── 高氏家族.xls                    # 家族谱系原始 Excel
├── 高氏家族.json                   # Excel 转换的 JSON 数据
└── Cloudflare_Pages_部署指南.md    # 部署手册
```

---

## 🗄️ 数据库 Schema

### members 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT NOT NULL | 姓名 |
| pai_name | TEXT | 派名（字辈名） |
| generation_id | INTEGER FK | 辈分 ID |
| gender | TEXT | 性别（男/女） |
| birth_year/month/day/hour/minute | INTEGER | 出生日期时间 |
| is_deceased | INTEGER | 是否已故 |
| death_year/month/day/hour/minute | INTEGER | 逝世日期时间 |
| father_id | INTEGER FK | 父亲 ID |
| father_order | INTEGER | 父系排行 |
| spouse_info | TEXT(JSON) | 配偶信息 JSON 数组 |
| avatar | TEXT | 头像（URL 或 data URL） |
| notes | TEXT | 备注 |
| is_adopted | INTEGER | 是否嗣/出嗣 |
| adoption_note | TEXT | 嗣信息说明 |
| is_shang | INTEGER | 是否殇 |
| has_posterity | INTEGER | 是否有后代 |
| order_index | INTEGER | 排序索引 |
| burial | TEXT | 葬地 |
| residence | TEXT | 居地 |

### generations 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| number | INTEGER UNIQUE | 代次编号（16-62） |
| pai_zi | TEXT | 字辈（行/修/学/积/正...） |
| description | TEXT | 描述 |

### children 表（父子关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| father_id | INTEGER FK | 父亲 ID |
| child_id | INTEGER UNIQUE FK | 子女 ID |
| child_order | INTEGER | 排行 |

---

## 🌐 API 端点

### 成员管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/members` | 获取所有成员列表 |
| GET | `/api/members/:id` | 获取单个成员详情 |
| POST | `/api/members` | 新增成员 |
| PUT | `/api/members/:id` | 更新成员信息 |
| DELETE | `/api/members/:id` | 删除成员 |
| GET | `/api/members/:id/children` | 获取某成员子女列表 |
| GET | `/api/members/tree/all` | 获取完整族谱树（根为第16代） |

### 辈分 & 统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/generations` | 获取所有辈分（按代次排序） |
| GET | `/api/statistics` | 获取统计数据（总人数/在世/已故/性别/年代分布） |

### 工具

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/lunar/convert` | 公历转农历（含生肖、时辰） |
| POST | `/api/upload-avatar` | 上传头像 |
| GET | `/api/health` | 健康检查 + 数据库状态 |

### 农历转换请求格式

```json
{
  "year": 1825,
  "month": 8,
  "day": 18,
  "hour": 3,
  "minute": 0,
  "type": "birth"  // 或 "death"
}
```

---

## 🔧 开发指南

### 代码规范

- **前端**: React 函数组件 + TypeScript + antd 组件
- **后端**: Express Router / Cloudflare Functions handler
- **数据库**: sql.js prepared statements（参数化查询防注入）
- **命名**: camelCase（JS/TS）、snake_case（数据库字段）

### 数据库操作模式

**Express 版**:
```javascript
import { query, get } from '../db-helpers.js';

// 查询列表
const members = query(req.db, 'SELECT * FROM members WHERE generation_id = ?', [genId]);

// 查询单条
const member = get(req.db, 'SELECT * FROM members WHERE id = ?', [id]);

// 写入（使用 prepare/bind/step 模式）
const stmt = req.db.prepare('INSERT INTO members (name) VALUES (?)');
stmt.bind([name]);
stmt.step();
stmt.free();
req.saveDb();  // 持久化到磁盘
```

**Cloudflare 版**:
```javascript
import { query, get } from '../functions/[[path]].js';

// 使用内置 helper，需要手动持久化
query(database, 'SELECT * FROM members WHERE id = ?', [id]);
run(database, 'INSERT INTO members (name) VALUES (?)', [name]);
// 写操作后：
context.waitUntil(saveDb(database, env));
```

### 关键注意事项

1. **spouse_info** 字段是 JSON 字符串，前端/API 需 `JSON.parse()`
2. **头像在 Cloudflare 上存储为 data URL**（无文件系统）
3. **Cloudflare KV 写操作必须使用 `context.waitUntil()`**
4. **Express 版用于本地开发，Cloudflare 版用于生产部署**
5. **数据库变更后执行 `npm run seed` 重新生成**

### 新增页面步骤

1. 在 `client/src/components/` 下创建组件目录
2. 编写组件（React + TypeScript + antd）
3. 在 `App.tsx` 添加 menuItem 和 renderPage case
4. 如需新增 API 端点，在 `functions/[[path]].js` 的 `handleApi` 中添加路由

---

## 🚢 部署要点

### Cloudflare Pages 部署

详见 [Cloudflare_Pages_部署指南.md](Cloudflare_Pages_部署指南.md)

**必需配置**:
1. KV 命名空间绑定 → 变量名：`DB`
2. `nodejs_compat` 兼容性标志
3. 构建命令：`cd client && npm install && npm run build`
4. 输出目录：`client/dist`

### GitHub 推送

```bash
git add -A
git commit -m "描述变更"
git push origin master
```

---

## 📊 前端页面介绍

| 页面 | 组件 | 功能 |
|------|------|------|
| 🏠 族谱导图 | FamilyTree | 树形可视化，展开/折叠子孙节点，点击查看详情 |
| ➕ 新增人口 | MemberForm | 添加/编辑成员表单（含农历生辰字段） |
| 🔗 关系查询 | Relationship | 查询成员关系链 |
| 📅 农历生辰 | LunarCalendar | 公历→农历生辰转换工具 |
| 📈 数据统计 | Statistics | 图表展示人口统计（柱状图、饼图） |
| 📤 导入导出 | ImportExport | 导出 Excel/PDF，导入 Excel |

---

## 🛡️ 权限配置

自动权限规则存储在 `~/.claude/settings.json`，对所有项目生效。

详见 [Claude自动权限配置说明.md](Claude自动权限配置说明.md)

核心权限：
- `Read` / `Write` / `Edit` / `Glob` / `Grep` — 文件读写操作
- `Bash(git *)` — Git 全套操作
- `Bash(npm *)` / `Bash(node *)` — Node.js 操作
- `Bash(python *)` / `Bash(pip *)` — Python 操作
- `Bash(cat *)` / `Bash(ls *)` / `Bash(rm *)` — 文件管理

---

## 📦 依赖管理

### 根目录
- `cors`, `express`, `lunar-javascript`, `multer`, `sql.js`

### 前端 (client/)
- `react`, `antd`, `@ant-design/icons`, `axios`, `recharts`
- `dayjs`, `file-saver`, `xlsx`, `html2canvas`, `jspdf`
- 构建: `typescript`, `vite`, `@vitejs/plugin-react`

---

## 🔄 常见操作

```bash
# 本地完整运行
npm run dev

# 仅运行后端
npm run dev:server

# 仅运行前端
npm run dev:client

# 构建前端
npm run build

# 数据库重新填充
cd server && npm run seed

# 数据转 JSON 预览
node convert_excel_to_json.js
```
