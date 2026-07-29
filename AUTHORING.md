# 博客写作与可见性约定

本文档描述本站在 Quartz v5 中实际执行的 YAML/frontmatter 规则。历史普通博客与
日志已经按同一组核心键完成规范化；新文章和模板继续使用下列格式。

## 推荐模板

```yaml
---
title: "标题"
description: null
tags:
  - Status/Pending
date: "2026-07-29"
lastmod: "2026-07-29"
draft: true
publish: false
cover: null
---
```

- 日期统一写成 `YYYY-MM-DD` 字符串，不使用 YAML 时间对象。
- 布尔值写 `true` / `false`，不要加引号。
- `tags` 使用 YAML 列表；没有值时优先写 `tags: []`，不要混用 `tag`。
- `published` 是发布日期字段，不是发布开关；真正的发布开关只有 `publish`。
- 旧文章中的 `updated`、`modified`、`created`、`aliases`、`alias` 等兼容字段仍然
  可用；Linter 排列核心键时会把这些领域字段原样保留在其后。

## Obsidian Linter

内容仓库只跟踪实际规则文件
`.obsidian/plugins/obsidian-linter/data.json`，不跟踪插件代码。Linter 目前只有
一套全局规则，不能针对普通博客和 `10-daily` 设置两套 profile，因此职责拆分为：

- `private/Templater/Blogs.md` 与 `private/Templater/Daily.md` 分别提供语义默认值；
- Linter 只维护两类笔记共有的键顺序、日期引号和 YAML 转义；
- `insert-yaml-attributes` 与 `yaml-timestamp` 保持关闭，避免对两类笔记注入同一套
  静态值，或在格式化时重写历史 `lastmod`；
- `05-project`、`private`、`Excalidraw` 与附件目录保持忽略，不参与自动格式化；
- `lastmod` 在实质修改或发布前由作者更新，Linter 不根据文件系统时间覆盖它。

Daily Notes 的目录与模板路径记录在 `.obsidian/daily-notes.json`，两份配置都随
内容仓库版本化。

## 三层可见性

| 目的           | YAML 或路径                        | 构建 HTML        | 出现在搜索、RSS、站点地图和列表 |
| -------------- | ---------------------------------- | ---------------- | ------------------------------- |
| 正常发布       | `publish: true`                    | 是               | 是                              |
| 仅允许直链访问 | `publish: true` + `unlisted: true` | 是               | 否                              |
| 编辑状态       | `draft: true`                      | 取决于 `publish` | 取决于 `publish` / `unlisted`   |
| 真正私密       | 放入硬忽略目录且不要发布           | 否               | 否                              |

`unlisted` 不是访问控制：知道 URL 的人仍可访问页面，公开文章中的链接也可能暴露
URL。敏感正文和附件都应放在 `private` 等硬忽略目录。`publish` 只过滤 Markdown
页面，不能保护位于公开目录中的图片、PDF 或其他附件。

当前硬忽略范围包括 `private`、`templates`、`.obsidian`、`10-daily`、
`05-project`、`30-tasks`、`00-copilot`、`Excalidraw`，以及暂不支持的
`.base` / `.canvas` 文件。路径规则会在解析和 Assets 复制之前生效。

`draft` 继续只表示编辑状态，不承担发布过滤。现有内容中有一篇合法文章同时使用
`draft: true` 与 `publish: true`，因此不能改用 Quartz 的 `remove-draft`。

## 内容复核与过期提示

课程与工具目录默认在最后复核或更新超过 365 天后显示提示。单篇文章可增加：

```yaml
reviewed: "2026-07-29"
reviewAfter: "2027-07-29"
staleAfter: 180
stale: true
```

- `reviewed`：人工确认内容仍有效的日期，优先于自动修改日期。
- `reviewAfter`：指定下一次复核期限；逾期后无论目录都会提示。
- `staleAfter`：覆盖默认天数，并让目录外的文章加入自动检查。
- `stale: true`：让目录外文章使用默认天数；`stale: false` 完全关闭该文章提示。

`reviewAfter` 与 `staleAfter` 通常选择一种即可。研究记录和归档默认不自动提示，
避免旧版 45 天阈值让几乎全部历史内容长期显示警告。

## 图片说明与诗歌块

图片后紧跟斜体段落会被转换为 `<figcaption>`：

```markdown
![替代文本](photo.jpg)
_(图片说明)_
```

替代文本只用于可访问性，不会被自动当成说明文字。诗歌继续使用原有 fence：

````markdown
```poetry
第一行
第二行
```
````

Poetry 内容按纯文本输出，保留换行，并进行 HTML 转义。
