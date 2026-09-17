# Day 1 ｜ 创建 GitHub 仓库并保存第一次版本

> 面向 Git 初学者。每一步都写清：**在哪个文件夹执行**、**命令做什么**、**成功时看到什么**。
> 项目文件夹：`D:\Vibe Coding\mini-hot`

---

## 开始之前的现状说明

我检查环境时发现，你的情况和你以为的不太一样，先说清楚，避免误会：

| 项 | 实际情况 |
|---|---|
| 项目文件夹 `mini-hot` | ✅ 存在，但是**完全空的**（0 个文件） |
| `mini-hot` 是否已是 Git 仓库 | ✅ 不是，状态干净，可直接初始化 |
| `mini-hot\.gitignore` | ✅ 我已创建（你选的"从零开始"，只需要这个配置文件） |
| GitHub 仓库 `mini-hot` | ✅ 已确认存在且为空，可直接用 |
| 原来的 `mini-hot-hub` | ❌ 已被删除，按你的选择**不找回** |

**重要提醒**：`mini-hot` 是空文件夹，所以按本清单执行后，GitHub 上会看到一个**只含 `.gitignore` 的仓库**，没有项目代码。这是"从零开始"的正常结果——新代码你后续自己写，写完再 `git add . && git commit && git push` 即可。

---

## 第 0 步：打开终端并进入项目文件夹

**在哪个文件夹执行**：打开终端（推荐开始菜单搜 `Git Bash`），然后执行

```bash
cd "D:/Vibe Coding/mini-hot"
```

**命令做什么**：把终端的工作目录切换到项目文件夹。后面所有命令都在这里执行。

**成功时看到什么**：没有报错。

> ⚠️ **已知环境问题**：你的 Git Bash 里 `ls`、`cat`、`find`、`grep` 这些基础命令**全部报 `command not found`**（我检查时实测过）。
> 所以清单里我**刻意避开了这些命令**，全部改用 `git` 原生命令验证 —— 这些是能正常跑的。
> 如果哪条命令报 `command not found`，那不是你操作错了，是环境问题，告诉我即可。

---

## 第 1 步：确认忽略文件已就位

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git status
```

**命令做什么**：先看 Git 能不能识别这个目录。此时还没初始化，所以会报错——**这是预期的**，用来确认路径正确。

**成功时看到什么**：
```
fatal: not a git repository (or any of the parent directories): .git
```

看到这个才是对的，说明你在正确的文件夹里。

然后确认忽略文件在（用 Git 自带的方式列目录）：
```bash
git ls-files --others --exclude-standard
```

**成功时看到什么**：输出 `.gitignore`

> 💡 这条命令的意思是「列出所有未被忽略、也未被跟踪的文件」。它应该只列出 `.gitignore`。
> 现在目录里只有这一个文件，所以很正常。

---

## 第 2 步：初始化仓库

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git init -b main
```

**命令做什么**：在当前目录创建一个全新的 Git 仓库，并把默认分支命名为 `main`。
`-b main` 是为了避免旧版 Git 默认用 `master` 导致分支名不一致。

**成功时看到什么**：
```
Initialized empty Git repository in D:/Vibe Coding/mini-hot/.git/
```

验证：
```bash
git status
```
应看到：
```
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .gitignore

nothing added to commit but untracked files present (use "git add" to track)
```

**关键点**：`Untracked files` 下面**只有 `.gitignore` 一行**。这就是空项目该有的样子。

---

## 第 3 步：确认忽略文件内容生效

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git check-ignore -v .env
git check-ignore -v node_modules/whatever.txt
git check-ignore -v hot.db
```

**命令做什么**：问 Git「这几个文件会被忽略吗」。`-v` 表示顺便告诉我是哪条规则命中的。

**成功时看到什么**：每条都输出一行，形如
```
.gitignore:4:.env   .env
.gitignore:24:node_modules/   node_modules/whatever.txt
.gitignore:49:*.db   hot.db
```

这说明三类敏感文件（**密钥**、**依赖目录**、**本地数据库**）都已被正确忽略。

> 💡 `git check-ignore` 是验证忽略规则最可靠的方式——比肉眼看文件内容强，因为它直接问 Git 的真实判断。

---

## 第 4 步：确认远程仓库地址

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

先不加远程，只做核对。**去浏览器打开** `https://github.com/Panky-pan/mini-hot`

**成功时看到什么**：页面显示 `This repository is empty.`（我已确认过，它确实是空的）

> ⚠️ 若显示的**不是** `mini-hot`，或仓库已有内容，先停下来告诉我，不要继续。
> 因为第 7 步会把你的内容推到这个地址。

---

## 第 5 步：添加远程仓库地址

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git remote add origin https://github.com/Panky-pan/mini-hot.git
```

**命令做什么**：给本地仓库登记一个远程地址，起名叫 `origin`。
`origin` 是 Git 的惯例叫法，可以理解为「老家的门牌号」——以后 `git push` 就是往这个地址送。

**成功时看到什么**：没有输出（Git 的哲学：没消息就是好消息）。验证：

```bash
git remote -v
```
应看到两行，地址都必须是 `mini-hot`：
```
origin  https://github.com/Panky-pan/mini-hot.git (fetch)
origin  https://github.com/Panky-pan/mini-hot.git (push)
```

**仔细核对是 `mini-hot`，不是 `mini-hot-hub`。**

---

## 第 6 步：把文件放入暂存区

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git add .
```

**命令做什么**：把当前目录下所有**未被忽略**的文件标记为「准备提交」。
`.gitignore` 里列出的文件会被自动跳过。

**成功时看到什么**：没有输出。验证：

```bash
git status
```
应看到 `.gitignore` 出现在 `Changes to be committed`（绿色）下：
```
Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   .gitignore
```

**确认没有 `node_modules`、没有 `.env`、没有 `*.db`。**

---

## 第 7 步：创建第一次提交

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git commit -m "chore: 初始化 mini-hot 仓库与忽略规则"
```

**命令做什么**：把暂存区的内容打包成一条历史记录，附上说明文字。
提交说明用中文没问题，Git 支持 UTF-8。

**成功时看到什么**：
```
[main (root-commit) a1b2c3d] chore: 初始化 mini-hot 仓库与忽略规则
 1 file changed, 62 insertions(+)
 create mode 100644 .gitignore
```

关键看 **`(root-commit)`** —— 它表示这是仓库的第一次提交（没有父提交），正是你要的「第一次版本」。

验证：
```bash
git log --oneline
```
应只有**一行**，就是你刚写的提交。

---

## 第 8 步：推送到 GitHub

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

**命令**
```bash
git push -u origin main
```

**命令做什么**：把本地 `main` 分支上传到 `origin`。
`-u` 的作用是记住「本地 main 对应远程 main」，以后你只敲 `git push` 就够了。

**成功时看到什么**：
```
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Writing objects: 100% (3/3), 1.2 KiB | 1.2 MiB/s, done.
To https://github.com/Panky-pan/mini-hot.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

**可能遇到**：弹出登录窗口（浏览器授权，或要求输入用户名 + Personal Access Token）。

> ⚠️ GitHub **不接受账号密码**推送。若被要求密码，需要输入 **Personal Access Token**。
> 若卡在这一步，把看到的提示**原文**发我，我给你具体生成步骤。

---

## 第 9 步：验证结果（你说的验证方式）

### 验证点 1：仓库有内容了

浏览器打开 `https://github.com/Panky-pan/mini-hot`

**成功时看到什么**：
- 不再是 `This repository is empty.`
- 文件列表出现 **`.gitignore`**
- 顶部显示 **`1 commit`**
- 提交说明显示 `chore: 初始化 mini-hot 仓库与忽略规则`

### 验证点 2：敏感文件没有出现 ✅（核心）

在仓库页面确认以下内容**都不存在**：

| 不应出现 | 说明 |
|---|---|
| `.env` / `.env.local` | 环境变量、密钥 |
| `node_modules` | 依赖目录 |
| `dist` / `build` | 构建产物 |
| `*.db` / `*.sqlite` | 本地数据库 |
| `*.log` | 日志 |
| `secrets.json` / `*.key` / `*.pem` | 密钥与证书 |

现在仓库里应该**只有 `.gitignore` 一个文件**。若看到其它文件，告诉我。

### 验证点 3：本地与远程一致

**在哪个文件夹执行**：`D:\Vibe Coding\mini-hot`

```bash
git status
```
**成功时看到什么**：
```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```
`working tree clean` = 所有东西都存好了，没有任何未保存的改动。

```bash
git log --oneline
```
应只显示一行提交。

---

## 完成标准对照表

| 完成标准 | 状态 | 证据 |
|---|---|---|
| 环境检查完成 | ✅ 已完成 | Git 2.55.0、用户名邮箱已配、无缺工具 |
| 创建合适的忽略文件 | ✅ 已创建（我代做） | `mini-hot\.gitignore` |
| 禁止上传 .env | ⏳ 待验证 | 第 3 步 check-ignore + 第 9 步验证点 2 |
| 禁止上传密码 / API 密钥 | ⏳ 待验证 | 已含 `*.key`/`*.pem`/`*credentials*.json`/`*secret*.json` |
| 禁止上传依赖目录 | ⏳ 待验证 | `node_modules/` 已在忽略清单 |
| 禁止上传本地数据库 | ⏳ 待验证 | `*.db`/`*.sqlite*`/`data/` 已在忽略清单 |
| GitHub 上能看到仓库内容 | ⏳ 待验证 | 第 9 步验证点 1 |
| 敏感文件未出现在仓库 | ⏳ 待验证 | 第 9 步验证点 2 |

---

## 一个必须知道的坑

`.gitignore` **只对「还没被 Git 跟踪」的文件生效**。

如果某个文件已经被 `git add` 或 `git commit` 过，之后再写进 `.gitignore` **也不会**把它从仓库移除。正确做法是：

```bash
git rm --cached 文件名
```

把它从 Git 的跟踪列表里摘掉（**保留本地文件**），然后重新提交。

**万一不小心把密钥提交并推送了**，顺序很重要：
1. **立刻去发密钥的平台作废 / 轮换那个密钥**（最重要，Git 历史很难彻底清除）
2. 再从仓库移除文件
3. 加进 `.gitignore`
4. 重新提交

---

## 常见意外与处理

**Q：以后写完代码怎么提交？**
在 `D:\Vibe Coding\mini-hot` 下依次：
```bash
git status              # 先看要提交什么，确认没有敏感文件
git add .
git commit -m "说明你做了什么"
git push
```

**Q：推送失败，提示 `rejected` 或 `fetch first`**
说明远程有本地没有的提交。先停手，把报错原文发我。

**Q：推送后想改提交说明**
`git commit --amend -m "新说明"`，然后 `git push -f`。
但**强制推送有风险**，建议先问我。

**Q：`node_modules` 还是被提交了**
执行 `git rm -r --cached node_modules`，确认它在 `.gitignore` 里，再提交。

---

## 命令速查（第 2～8 步浓缩版）

在 `D:\Vibe Coding\mini-hot` 下依次执行：

```bash
git init -b main
git status
git check-ignore -v .env          # 验证忽略规则生效
git remote add origin https://github.com/Panky-pan/mini-hot.git
git remote -v                     # 确认是 mini-hot
git add .
git status                        # 确认敏感文件不在绿色清单
git commit -m "chore: 初始化 mini-hot 仓库与忽略规则"
git log --oneline                 # 确认一行、(root-commit)
git push -u origin main
git status                        # 应显示 working tree clean
```
