# dsh-side-chat-slash

A **side chat** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI, built on [`@flyer103/dsh-side-chat`](https://github.com/flyer103/dsh-side-chat) 0.7.0.

> **This is a fork, not an original work.** The bulk of the code comes from flyer103's [`dsh-side-chat`](https://github.com/flyer103/dsh-side-chat) (MIT licensed). This repository adds only the changes listed below and keeps the original LICENSE.

[English](README.md) | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What it does

Opens a **side conversation** next to the main session: it forks the current session into a child conversation that runs the **same agent, same tools and same workspace**, and can really edit files. Close it when done — the main transcript is never touched.

## Differences from upstream

| # | Change | Why |
|---|---|---|
| 1 | **New `/side` slash command** | Upstream only offers the right-sidebar guide card. `/side` + Enter now opens a side-chat tab from the composer. Registered as a **host** command (`ctx.commands.register`) rather than a client `commandUi` contribution, which depends on the session summary and a client locale service and can silently disappear |
| 2 | **Open-request bridge** | `/side` does not create a side session itself; it raises a "please open a tab" flag that the client polls (`/side-chat/api/pending`, every 2s) and then calls `sidebarRight.openTab('side-chat')`. The tab still owns the session, so upstream's one-tab-one-session (and close-disposes) lifecycle is preserved |
| 3 | **Approval pinned to `never`** | Upstream inherits the parent's approval policy, but the side-chat tab renders no approval prompt — a parent on `ask` would leave the side agent waiting forever. A parent `ask` is now downgraded to `never` for the side chat |

## Install

```bash
# GitHub
dsh plugin --profile desktop add github:lucyVan/dsh-side-chat-slash

# Local checkout
dsh plugin --profile desktop add /absolute/path/to/dsh-side-chat-slash
```

`--profile` must name the profile you actually run: `desktop` for the Desktop app, `web` for a `dsh web` process.

Restart DSH afterwards (quit the Desktop app with ⌘Q and reopen it; restart a `dsh web` process).

## Usage

1. Open any session that has at least one message
2. Type **`/side`** in the composer and press Enter — a side-chat tab appears in the right sidebar
3. Send the first message in that tab; the fork happens then, so an empty tab costs nothing
4. Close the tab to destroy that side chat; run `/side` again for a new one

The upstream entry point (the "Side chat" card on the right sidebar's guide page) still works.

## Relationship to the main session

- **Inherits** the full history at fork time, the same preset, cwd, provider/model and sandbox mode
- **Isolated**: side-chat turns never enter the main transcript, the session list or the subagent catalog
- **Independent**: main-session messages after the fork do not flow into it; each side chat has its own context
- **Really edits files**: `write` / `edit` / `bash` act on the same workspace, so the main session sees the change on its next read
- **Destroyed on close**: the side session's persisted log is removed (best effort)

## Known limitations (inherited)

- The side-chat tab does not render approval prompts (mitigated by pinning `never`)
- A closed tab cannot be restored
- Each side chat's first request is roughly the size of the parent's next request; N concurrent side chats multiply that
- GUI restarts lose every side session
- Web platform only (including the Desktop window); no CLI/TUI surface

## Compatibility

| Item | Status |
|---|---|
| DSH version | Verified on `0.2.2-rc.1`; `package.json` declares `engines.dsh: >=0.2.2-rc.1 <0.3.0-0`, so an incompatible host fails at install time instead of at runtime |
| Platform | Tested on macOS; Windows/Linux untested (no platform-specific code, expected to work) |
| UI | Web GUI only (Desktop window or `dsh web`); no CLI/TUI surface |
| Node | `>= 22` (satisfied by DSH's bundled runtime) |
| npm dependencies | **None**: imports no `@deepseek-ai/*` package |
| Browser module dependencies | **None**: requires only `react` (shell-provided) and `@deepseek-ai/dsh-client-ui-primitives` (platform seed table, with a built-in fallback) |
| Host services | Requires `agents`/`webServer`/`timer`/`commands`; degrades gracefully when `agentPresets`/`sandboxPolicy`/`approval`/`fileReferences`/`sessionPersistence` are absent |
| Coexistence | **Cannot** be installed alongside upstream `@flyer103/dsh-side-chat` (duplicate routes and tab type) |

Install verification: `dsh plugin --profile web add github:lucyVan/dsh-side-chat-slash` was run in an isolated `DSH_HOME`; dependency install, bundle registration and `--dump-config` composition all succeeded.

## Uninstall

```bash
dsh plugin --profile desktop remove dsh-side-chat-slash
```

Then restart DSH.

## Credits

- Original author [flyer103](https://github.com/flyer103): [dsh-side-chat](https://github.com/flyer103/dsh-side-chat)
- License: MIT (see [LICENSE](LICENSE))
