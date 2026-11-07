# dsh-side-chat-slash

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI 用的**侧边会话**，在 [`@flyer103/dsh-side-chat`](https://github.com/flyer103/dsh-side-chat) 0.7.0 基础上做了三处本地增强。

> **这是 fork，不是原创。** 代码主体来自 flyer103 的 [`dsh-side-chat`](https://github.com/flyer103/dsh-side-chat)（MIT 许可）。本仓库只增加了下面的「与原版的差异」所列改动，并保留原 LICENSE。

[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 它做什么

在主会话旁边开一条**侧边会话**：从当前会话 fork 出子会话，用**同一个 agent、同一套工具、同一个工作区**，可以真实修改文件；聊完关掉，主会话 transcript 完全不受影响。

## 与原版的差异

| # | 改动 | 说明 |
|---|---|---|
| 1 | **新增 `/side` 斜杠命令** | 原版只能从右侧边栏引导页点卡片进入。现在在主输入框敲 `/side` 回车即可拉起侧聊 tab。用宿主 `ctx.commands.register` 注册，不走客户端 `commandUi`（后者依赖会话摘要和 locale 服务，容易静默失效） |
| 2 | **打开请求桥接** | `/side` 不直接创建侧会话，而是抬高一个「请开 tab」标记；客户端每 2 秒轮询 `/side-chat/api/pending`，读到后调 `sidebarRight.openTab('side-chat')`。这样 tab 仍由客户端创建，保留原版「一 tab 一会话、关 tab 即销毁」的生命周期 |
| 3 | **审批策略固定 `never`** | 原版继承父会话的审批策略，但侧聊 tab 内不渲染审批提示，父会话为 `ask` 时会卡死。现在父会话为 `ask` 时侧聊固定 `never` |

## 安装

```bash
# GitHub
dsh plugin --profile desktop add github:lucyVan/dsh-side-chat-slash

# 本地路径
dsh plugin --profile desktop add /absolute/path/to/dsh-side-chat-slash
```

`--profile` 要选你实际运行的那一个：桌面应用用 `desktop`，自己起的 `dsh web` 进程用 `web`。

安装后**重启 DSH**：桌面应用先 ⌘Q 完全退出再打开；`dsh web` 进程直接重启。

## 使用

1. 打开任意有对话的会话
2. 输入框敲 **`/side`** 回车 → 右栏出现「侧边会话」tab
3. 在侧聊里发第一条消息 → 此时才真正 fork，空面板零成本
4. 关掉 tab 即销毁该侧会话；需要时再 `/side` 开新的

也保留原版的入口：右侧边栏引导页的「侧边会话」卡片。

## 与主会话的关系

- **继承**：fork 时带完整历史；同 preset、同 cwd、同 provider/model、同 sandbox
- **隔离**：侧聊对话不写主会话、不进会话列表、不进 subagent 目录
- **独立**：fork 之后主会话新消息不会推进来；每个侧聊各有自己的上下文
- **真实修改**：`write` / `edit` / `bash` 作用在同一工作区，主会话下次读就能看到
- **关闭即销毁**：侧会话的持久化日志会被删除（尽力而为）

## 与原版的已知限制（保留）

- 侧聊 tab 不渲染审批提示（已通过固定 `never` 规避）
- 关闭的 tab 无法恢复
- 每个侧聊首条请求约等于父会话下一次请求大小，同时开 N 个就是 ×N
- GUI 重启后侧聊全部消失
- 仅 Web 平台（含桌面窗口），无 CLI/TUI

## 兼容性

| 项 | 状态 |
|---|---|
| DSH 版本 | 验证于 `0.2.2-rc.1`；`package.json` 声明 `engines.dsh: >=0.2.2-rc.1 <0.3.0-0`，不合规环境安装期即报错，不合规环境安装期即被 DSH 拒绝 |
| 平台 | macOS 实测通过；Windows/Linux 未实测（代码无平台分支，理论上可用） |
| 界面 | 仅 Web GUI（Desktop 窗口或 `dsh web`），无 CLI/TUI |
| Node | `>= 22`（DSH 自带满足） |
| npm 依赖 | **零依赖**：不 import 任何 `@deepseek-ai/*` 包 |
| 浏览器模块依赖 | **零**：只 require `react`（外壳内置）与 `@deepseek-ai/dsh-client-ui-primitives`（平台种子表内置，含内置回退） |
| 宿主服务 | 必需 `agents`/`webServer`/`timer`/`commands`；`agentPresets`/`sandboxPolicy`/`approval`/`fileReferences`/`sessionPersistence` 缺失时自动降级 |
| 与原版共存 | **不可**同时安装原版 `@flyer103/dsh-side-chat`（同名路由与 tab 类型会冲突） |

> **DSH 升级后装不上怎么办**：`engines.dsh` 由 DSH 强制检查，宿主版本超出窗口时安装会被拒绝（并提示可能崩溃或数据损坏）。确需在未验证版本上试跑，可用 DSH 自带的精确版本豁免：
>
> ```bash
> dsh plugin --profile <name> allow-version <包名>@<版本> --dsh-version <宿主版本> --accept-risk
> ```
>
> 试跑前请先备份工作区。本插件依赖的宿主接口（`ctx.commands.register`、右栏 tab、`agents.create` 的 seed 语义）在 rc 阶段仍可能变动。

安装验证：在隔离 `DSH_HOME` 中用 `dsh plugin --profile web add github:lucyVan/dsh-side-chat-slash` 实测，依赖安装、bundle 登记、`--dump-config` 组装均正常。

## 卸载

```bash
dsh plugin --profile desktop remove dsh-side-chat-slash
```

然后重启 DSH。

## 致谢

- 原作者 [flyer103](https://github.com/flyer103)：[dsh-side-chat](https://github.com/flyer103/dsh-side-chat)
- 许可：MIT（见 [LICENSE](LICENSE)）
