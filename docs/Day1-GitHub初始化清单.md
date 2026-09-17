# Day 1 ｜ 创建 GitHub 仓库并保存第一次版本

> 项目文件夹：`D:\Vibe Coding\mini-hot`

---

## 执行状态（2026-09-17 15:40 更新）

由我代为执行，结果如下：

| 步骤 | 命令 | 状态 |
|---|---|---|
| 1 | `git init -b main` | ✅ 已完成 |
| 2 | 忽略规则验证（`git check-ignore`） | ✅ 7 类敏感文件全部命中 |
| 3 | `git remote add origin .../mini-hot.git` | ✅ 已完成 |
| 4 | `git add .` | ✅ 已完成（仅 2 个文件） |
| 5 | `git commit` | ✅ 已完成，提交 `cb94f4d` |
| 6 | `git push -u origin main` | ❌ **失败，需你在本机执行** |

### 推送失败原因

```
fatal: unable to access 'https://github.com/Panky-pan/mini-hot.git/':
CONNECT tunnel failed, response 502
```

这不是你的配置问题，也不是仓库地址错误。原因是**我的执行环境没有访问 GitHub 的网络权限**（网络请求被代理拦截，返回 502）。

我做了对比测试佐证：直接访问 `https://github.com/Panky-pan/mini-hot` 网页也超时，而我此前能正常访问该网页——说明是**环境网络限制**，非 GitHub 故障、非配置错误。

**好消息：前 5 步全部成功，提交已安全保存在本地。** 你现在只需在**自己的电脑**上敲一条命令即可完成推送。

---

## 你现在只需要做这一步

在你自己的 PowerShell 或 Git Bash 里执行：

```bash
cd "D:/Vibe Coding/mini-hot"
git push -u origin main
```

**成功时看到什么**：
```
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Writing objects: 100% (5/5), 1.5 KiB | 800 KiB/s, done.
To https://github.com/Panky-pan/mini-hot.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

**可能弹出登录窗口**：
- 若弹出浏览器授权页 → 点同意即可（你的电脑已配 `credential.helper = manager`，会记住凭据）
- 若要求输入密码 → **不能用账号密码**，需输入 Personal Access Token
  （GitHub 网页 → 右上角头像 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾选 `repo` 权限）

**若仍报 502**：说明你本机网络也需代理。把报错原文发我，或在终端里配置代理后重试。

---

## 本次已完成的操作记录

以下命令我已代你执行完毕，**无需重复**：

```bash
cd "D:/Vibe Coding/mini-hot"
git init -b main                                        # ✅ 创建仓库，分支 main
git check-ignore -v .env                                # ✅ 验证忽略规则
git remote add origin https://github.com/Panky-pan/mini-hot.git   # ✅ 配远程
git add .                                               # ✅ 暂存 2 个文件
git commit -m "Day 1｜初始化 mini-hot 仓库与忽略规则"      # ✅ 提交 cb94f4d
git push -u origin main                                 # ❌ 待你执行
```

---

## 已完成的验证结果

### 忽略规则验证（7 类敏感文件全部命中）

| 测试文件 | 命中规则 | 结果 |
|---|---|---|
| `.env` | `.gitignore:4:.env` | ✅ 已忽略 |
| `.env.local` | `.gitignore:99:*.local` | ✅ 已忽略 |
| `node_modules/react/index.js` | `.gitignore:23:node_modules/` | ✅ 已忽略 |
| `server/hot.db` | `.gitignore:43:*.db` | ✅ 已忽略 |
| `data/local.sqlite3` | `.gitignore:52:data/` | ✅ 已忽略 |
| `secrets.key` | `.gitignore:8:*.key` | ✅ 已忽略 |
| `config/credentials.json` | `.gitignore:12:*credentials*.json` | ✅ 已忽略 |

### 实际提交内容（仅 2 个文件）

```
A  .gitignore
A  docs/Day1-GitHub初始化清单.md
```

**确认**：无 `.env`、无 `node_modules`、无 `*.db`、无密钥文件。

### 提交记录

```
cb94f4d (root-commit) Day 1｜初始化 mini-hot 仓库与忽略规则
 2 files changed, 487 insertions(+)
```

`(root-commit)` = 第一次提交（无父提交），即你要的「第一次版本」。

---

## 推送后在 GitHub 上验证

打开 `https://github.com/Panky-pan/mini-hot`

**应看到**：
- 不再是 `This repository is empty.`
- 文件列表：`.gitignore` 和 `docs/`
- 顶部显示 `1 commit`
- 提交说明 `Day 1｜初始化 mini-hot 仓库与忽略规则`

**逐项确认以下内容都不存在**（核心验收）：

| 不应出现 | 说明 |
|---|---|
| `.env` / `.env.local` | 环境变量、密钥 |
| `node_modules` | 依赖目录 |
| `dist` / `build` | 构建产物 |
| `*.db` / `*.sqlite` | 本地数据库 |
| `*.log` | 日志 |
| `secrets.json` / `*.key` / `*.pem` | 密钥与证书 |

验证无误后，在本地跑一次确认同步：
```bash
cd "D:/Vibe Coding/mini-hot"
git status
```
应显示 `Your branch is up to date with 'origin/main'.` 和 `nothing to commit, working tree clean`。

> 💡 补充：`mini-hot` 目前是空项目，所以仓库里只有 `.gitignore` 和清单文档，**没有项目代码**。这是「从零开始」的正常结果——新代码你后续写完，再 `git add . && git commit -m "说明" && git push` 即可。

---

## 附：忽略文件设计说明

`mini-hot\.gitignore` 覆盖四类你点名禁止上传的内容：

| 类别 | 覆盖规则 |
|---|---|
| **密钥 / 密码** | `.env`、`.env.*`、`*.pem`、`*.key`、`*.p12`、`*.pfx`、`*credentials*.json`、`*secret*.json`、`passwords.txt` |
| **依赖目录** | `node_modules/`、`.pnpm-store/`、`.yarn/cache/`、`vendor/`、`bower_components/` |
| **本地数据库** | `*.db`、`*.db-wal`、`*.db-shm`、`*.sqlite`、`*.sqlite3`、`*.mdb`、`*.accdb`、`data/` |
| **构建产物** | `dist/`、`build/`、`out/`、`.vite/`、`*.tsbuildinfo` |

另含日志、缓存、编辑器与系统文件规则。特设 `!.env.example` 例外——将来可放不含真实密钥的模板文件。

---

## 必须知道的坑

`.gitignore` **只对「还没被 Git 跟踪」的文件生效**。

若某文件已被 `git add` 或 `git commit` 过，之后再写进 `.gitignore` **也不会**把它从仓库移除：

```bash
git rm --cached 文件名      # 从 Git 跟踪列表摘掉，保留本地文件
```

**万一不小心把密钥提交并推送了**，顺序很重要：
1. **立刻去发密钥的平台作废 / 轮换那个密钥**（最重要，Git 历史很难彻底清除）
2. 再从仓库移除文件
3. 加进 `.gitignore`
4. 重新提交

---

## 以后的日常提交流程

在 `D:\Vibe Coding\mini-hot` 下依次：

```bash
git status                      # 先看要提交什么，确认没有敏感文件
git add .
git commit -m "说明你做了什么"
git push
```

---

## 常见意外与处理

**Q：推送提示 `rejected` 或 `fetch first`**
说明远程有本地没有的提交。先停手，把报错原文发我。

**Q：想改上一次的提交说明**
`git commit --amend -m "新说明"`，然后 `git push -f`（强制推送有风险，建议先问我）。

**Q：`node_modules` 还是被提交了**
`git rm -r --cached node_modules`，确认它在 `.gitignore` 里，再提交。
