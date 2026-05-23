# Cloudflare Pages 部署完整步骤指南

## 前言

本项目已完成从 Vercel 到 Cloudflare Pages 的迁移，支持完整的家族谱系 CRUD 功能（增删改查）。

---

## 一、前置准备

### 1. 账号与仓库
- **GitHub 仓库**: `https://github.com/wsjinge/gaoshijiazu`
- **Cloudflare 账号**: 需要 Cloudflare 账号（免费）
- **本地 Git**: 已配置 Git 并推送最新代码

### 2. 本地代码状态检查
```bash
# 检查本地提交
git log --oneline -1
# 应显示: feat: 迁移至 Cloudflare Pages 部署，修复数据库加载

# 推送到 GitHub（如果网络允许）
git push origin master
```

---

## 二、Cloudflare Pages 项目创建

### 步骤 1: 登录 Cloudflare Dashboard
访问: https://dash.cloudflare.com/
- 使用 Cloudflare 账号登录
- 点击左侧菜单 **Pages**

### 步骤 2: 创建 Pages 项目
1. 点击 **Create a project**
2. 选择 **Connect to Git**
3. 连接 GitHub:
   - 点击 **Connect GitHub**
   - 授权 Cloudflare 访问 GitHub
   - 选择仓库: `wsjinge/gaoshijiazu`
4. 项目设置:
   - **Project name**: `gaoshijiazu` (或自定义名称)
   - **Production branch**: `master`

### 步骤 3: 构建配置
填写以下设置:

| 配置项 | 值 |
|--------|-----|
| **Framework preset** | `None` |
| **Build command** | `cd client && npm install && npm run build` |
| **Build output directory** | `client/dist` |
| **Root directory** | `/` (不填，保持默认) |

点击 **Save and Deploy**

---

## 三、环境配置（关键步骤）

### 1. KV 命名空间创建

数据库持久化需要 KV 存储（否则每次冷启动都会丢失修改）。

#### 创建 KV 命名空间:
1. 在 Cloudflare Dashboard 左侧菜单，点击 **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 命名空间名称: `gaoshijiazu-db` (或任意名称)
4. 点击 **Add**

### 2. KV 绑定到 Pages 项目

1. 返回 **Pages** → 选择项目 `gaoshijiazu`
2. 点击 **Settings** → **Functions**
3. 找到 **KV namespace bindings** 部分
4. 点击 **Add binding**:
   - **Variable name**: `DB` (必须是 `DB`)
   - **KV namespace**: 选择刚创建的 `gaoshijiazu-db`
5. 点击 **Save**

**注意**: 变量名必须是 `DB`，这是代码中引用的名称。

---

## 四、兼容性设置

### nodejs_compat 标志

代码使用 `Buffer` 和 Node.js API，需要启用兼容性标志。

检查 `wrangler.toml`:
```toml
pages_build_output_dir = "client/dist"
compatibility_flags = ["nodejs_compat"]
```

Cloudflare Pages 会自动读取此配置。如果需要手动设置:
1. Pages → 项目 → **Settings** → **Functions**
2. 找到 **Compatibility flags** 部分
3. 添加: `nodejs_compat`

---

## 五、部署验证

### 1. 触发首次部署
创建项目后，Cloudflare 会自动触发首次部署:
- 查看部署进度（Build logs）
- 等待状态变为 **Success**

### 2. 获取域名
部署成功后，Cloudflare 会提供:
- **默认域名**: `https://gaoshijiazu.pages.dev`
- 可在 **Custom domains** 添加自定义域名

### 3. 测试功能
访问网站，测试以下功能:

#### 基础功能:
- ✅ 查看家族树（应显示所有成员）
- ✅ 统计数据（总人数 52 人）
- ✅ 成员详情查看

#### CRUD 功能（需要 KV 绑定）:
- ✅ 添加新成员
- ✅ 编辑成员信息
- ✅ 删除成员
- ✅ 上传头像

#### 健康检查:
访问 `/api/health`:
```json
{
  "status": "ok",
  "members": 52,
  "generations": 47,
  "runtime": "cloudflare-pages"
}
```

---

## 六、常见问题排查

### 问题 1: 数据显示为 0 人

**原因**: KV 命名空间未绑定或变量名错误
**解决**:
1. 检查 KV 绑定变量名是否为 `DB`
2. 确认 KV 命名空间已创建
3. 等待几分钟让配置生效

### 问题 2: 修改后数据丢失

**原因**: 未配置 KV 或 KV 写入失败
**解决**:
1. 确认 KV 命名空间绑定
2. 查看 Cloudflare Pages 函数日志（Logs → Functions）
3. 检查 `env.DB` 是否可用

### 问题 3: 图片上传失败

**原因**: Cloudflare Pages 无文件系统
**解决**:
- 当前实现已改为 **data URL** 存储（base64 编码）
- 图片存储在数据库中，无需文件系统
- 检查头像字段是否包含 `data:image/...;base64,...`

### 问题 4: 部署失败

**常见错误**:
- Build command 失败: 检查 `client/` 目录的 package.json
- 依赖安装失败: 确认 `npm install` 可正常运行
- 输出目录不存在: 确认 `client/dist` 已生成

---

## 七、本地开发与预览

### 1. 本地运行 Express 版本
```bash
npm run dev
# 访问 http://localhost:3000
```

### 2. 本地预览 Cloudflare Pages
使用 Wrangler CLI:
```bash
# 安装 wrangler（如果未安装）
npm install -g wrangler

# 本地预览 Pages Functions
wrangler pages dev client/dist
```

---

## 八、进阶配置

### 1. 自定义域名
1. Pages → 项目 → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入域名: 如 `gaoshijiazu.com`
4. 添加 DNS 记录（Cloudflare 会指引）

### 2. 分支预览
- Cloudflare Pages 会为每个分支创建预览 URL
- 格式: `https://<commit-hash>.gaoshijiazu.pages.dev`

### 3. 环境变量
如需添加其他环境变量:
1. Pages → 项目 → **Settings** → **Environment variables**
2. 添加变量（如 API keys）

---

## 九、数据备份与迁移

### 1. 数据库导出
Cloudflare KV 中的数据可以通过:
- Dashboard: Workers → KV → 选择命名空间 → 查看/导出
- Wrangler CLI: `wrangler kv:key get --binding=DB db`

### 2. 迁移到 D1（可选）
如果需要更强的数据库功能（SQL 查询）:
- 可考虑迁移到 **Cloudflare D1**（SQLite 兼容）
- 需修改代码使用 D1 API

---

## 十、监控与日志

### 1. 查看部署日志
Pages → 项目 → **Deployments** → 点击部署记录

### 2. 实时函数日志
Pages → 项目 → **Logs** → **Functions**
- 查看每次请求的日志
- 调试错误信息

### 3. 分析与监控
Pages → 项目 → **Analytics**
- 查看请求量、错误率、性能

---

## 总结

完成以上步骤后，你的高氏家族谱系系统将在 Cloudflare Pages 上运行:
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 持久化数据存储（通过 KV）
- ✅ 免费（Cloudflare Pages 免费，KV 有免费额度）

**关键要点**:
1. KV 命名空间变量名必须是 `DB`
2. `nodejs_compat` 兼容性标志必须启用
3. 构建命令和输出目录配置正确

如有问题，查看 **Functions Logs** 排查。

---

**文档版本**: 2026-05-22
**项目版本**: 3d914a9 (feat: 迁移至 Cloudflare Pages 部署)