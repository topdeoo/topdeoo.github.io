# Quartz v5 迁移说明

## 迁移基线

- 框架基线：Quartz v5.0.0，官方 `v5` 提交
  [`507ad7f3`](https://github.com/jackyzha0/quartz/commit/507ad7f3d4601d83482f61930fccf1c77f42a072)。
- 内容仓库：`content` Git submodule，固定提交
  `c1c903cd746e78fc2fad9ac3d2dda13ac0b9b7f7`。
- 运行时与包管理器：Bun 1.3.14，由 `.bun-version`、`packageManager` 和
  `bun.lock` 共同固定。
- v4 基线验收值：263 个 Markdown 候选、过滤后 149 篇发布内容、224 个 HTML
  输出。
- v5 验收值：192 个 Markdown 候选（路径隐私规则在解析前生效）、过滤 43
  个、149 篇发布内容、74 个虚拟 tag 页面、224 个 HTML、278 个总输出。

迁移采用“官方 v5 基线 + 薄站点层”的方式，而不是把长期分叉的 v4 目录直接
merge 到 v5。这样保留内容契约和视觉身份，同时让构建器、SPA、搜索、图谱、
Explorer、callout、RSS/sitemap 等核心能力继续跟随 v5。

## 仓库边界

框架与内容仍然完全分离：

```text
Website/
├── quartz/              # Quartz v5 框架
├── plugins/             # 站点本地薄插件，不修改 Quartz core
├── quartz.config.yaml   # 站点配置与布局
├── content/             # 独立 Git submodule
├── bun.lock
└── quartz.lock.json     # Git 插件精确版本
```

首次克隆后执行：

```bash
git submodule update --init --recursive
bun ci
bun run plugins:install
```

内容仓库仍保留历史 `content/CNAME`，但 v5 的 extensionless asset slug 会改写其
文件名。为保证 GitHub Pages 得到大小写严格正确的 `public/CNAME`，该文件在
Assets 中被忽略，改由 `@quartz-community/cname` 根据 `baseUrl` 生成。

## Markdown YAML/frontmatter 契约

`@quartz-community/note-properties` 被配置为 YAML、`---` 分隔符、隐藏属性视图。
它继续使用 JSON 风格 YAML schema，因此日期仍是字符串，未知属性不会被丢弃或
拒绝。当前规则如下：

| 语义     | 保留的写法                                           |
| -------- | ---------------------------------------------------- |
| 标题     | `title`；缺失时回退文件名                            |
| 标签     | `tags` / `tag`；数组、单个字符串或逗号分隔字符串     |
| 别名     | `aliases` / `alias`；字符串或数组                    |
| 永久链接 | `permalink`，同时进入别名集合                        |
| CSS 类   | `cssclasses` / `cssclass`                            |
| 社交图片 | `socialImage` / `image` / `cover`                    |
| 创建日期 | `created` / `date`                                   |
| 修改日期 | `modified` / `lastmod` / `updated` / `last-modified` |
| 发布日期 | `published` / `publishDate` / `date`                 |
| 评论开关 | `comments: false` 或 `comments: "false"`             |
| 其他字段 | `location`、`zotero-key`、`status` 等未知键原样保留  |

发布边界严格保持 v4 语义：

- 只有 `publish: true` 或 `publish: "true"` 会发布。
- `publish: true` 加 `unlisted: true` 仍生成 HTML，但从搜索、Explorer、图谱、
  backlinks、Recent Notes、folder/tag 列表、RSS 与 sitemap 中隐藏。
- `draft` 不参与过滤；现有 `publish: true` 且 `draft: true` 的
  `SMT-Basic.md` 仍然发布。
- v5 默认的 `remove-draft` 已显式禁用。
- 默认展示日期仍为创建日期，而不是 v5 默认的修改日期。

旧 `RemoveDiary` 和 `RemoveLocal` 的路径规则已前移到精确的
`configuration.ignorePatterns`，因此 `10-daily`、`05-project`、`30-tasks`、
`Excalidraw`、`00-copilot`、`private` 等内容及同目录附件不会进入解析或 Assets
复制阶段。原先会误伤任意含 `task` 字符串路径的宽泛 glob 已删除。

旧规则中按 `Local` 标签过滤的部分没有可靠的 v5 社区插件，也不适合作为安全
边界；当前所有使用该标签的文件均在 `30-tasks`。新增私密内容必须放进硬忽略
目录，而不能只依赖标签。

完整库审计还发现 `.base`、构建用 `ref.bib` 和一个无引用文本文件会被 Assets
作为原始下载文件复制。它们现已显式忽略；`.canvas` 也在启用对应页面插件前默认
忽略。`ref.bib` 仍可由 Citations 在构建时直接读取。

推荐的新文章模板、字段类型和可见性矩阵见
[`AUTHORING.md`](./AUTHORING.md)。初始 v5 迁移没有批量改写 Obsidian 库；后续
已将 191 篇普通博客和 14 篇日志的核心 frontmatter 统一为推荐顺序与类型，同时
保留全部领域附加字段。

初始完整库审计曾覆盖 268 个 Markdown，其中 251 个带 frontmatter，未发现 YAML
解析错误。当时的 `publish` / `draft` 均为真正的 YAML boolean；库中没有既有
`unlisted`、`reviewAfter`、`staleAfter` 或 `stale` 字段，所以新增能力不会改变
旧文章含义。完整库与当前 `content` submodule 存在少量未同步文件，但双方的 149
篇公开集合一致；下次同步内容后仍应重新执行构建验收。

## 组件迁移

优先使用 v5 原生/官方社区包，避免继续维护 v4 内部 fork：

| v4 能力                             | v5 方案                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| FrontMatter                         | `@quartz-community/note-properties`                                                                                       |
| ExplicitPublish                     | `@quartz-community/explicit-publish`                                                                                      |
| 日期归一化                          | `@quartz-community/created-modified-date`                                                                                 |
| Obsidian/GFM/KaTeX/引用             | 对应 `@quartz-community/*` transformer                                                                                    |
| Poetry                              | 站点本地 `@virgiling/markdown-extensions`；输出转义后的 `<pre class="poetry">`                                            |
| FigureCaptions                      | 同一薄插件适配维护中的 [`rehype-image-caption`](https://github.com/Robot-Inventor/rehype-image-caption)                   |
| OutOfDate                           | 站点本地 `@virgiling/out-of-date`，使用 v5 callout 与可覆盖的复核规则                                                     |
| Unlisted                            | [`@quartz-community/unlisted-pages`](https://github.com/quartz-community/unlisted-pages)                                  |
| Search/Explorer/Graph/Backlinks/TOC | v5 社区组件                                                                                                               |
| Content/Folder/Tag 页面             | v5 page type 插件                                                                                                         |
| Giscus                              | `@quartz-community/comments`，保留仓库、分类和自定义主题                                                                  |
| 图片放大                            | [`vazome/quartz-image-zoom`](https://github.com/vazome/quartz-image-zoom/commit/eb516f150d95859c31c1fa5507f2fd81b35bbb15) |
| RSS/sitemap/alias                   | v5 ContentIndex 与 AliasRedirects                                                                                         |

图片放大是从 [quartz-community 仓库集合](https://github.com/orgs/quartz-community/repositories)
和 v5 生态中筛选出的维护中替代项，提交被固定在 `quartz.lock.json`。

Poetry 没有可直接采用的 MIT v5 插件，因此按行为独立重写，使用 HAST 文本节点而
不是旧版 raw HTML 插值。FigureCaptions 只做依赖适配，继续保留 v4 的“无说明图片
也包裹 `<figure>`”行为，且不会把 alt 自动显示为说明。OutOfDate 没有采用生态中
尚不成熟且日期优先级有误的移植，而是实现为不改 Quartz core 的本地组件：

- 默认仅检查 `01-courses/**` 与 `03-tools/**`；
- 默认阈值从旧版 45 天改为 365 天。完整库中 138 个候选有 137 个超过 45 天，
  旧阈值已失去区分度；
- 优先使用人工 `reviewed`，再使用 v5 归一化的修改/创建日期；
- 支持 `reviewAfter`、`staleAfter`、`stale: true` 与 `stale: false`。

仍暂不复现的 v4 定制为 PageNavigation、独立 `Local` 标签 filter，以及
FolderContent 的“存在正文时隐藏目录列表”行为。

`FloatingButtons` 在 v4 源码中存在但没有挂载，因此没有迁移。需要恢复其余缺口
时，应先确定期望行为，再实现为独立 v5 插件，避免重新 fork 核心框架。

## 有意采用的 v5 改进

- 恢复 v5 原生 Darkmode 开关，使保留的暗色调色板真正可用。
- 使用 v5 原生 ReaderMode、callout、SPA 和组件资源生命周期。
- ContentMeta 使用 v5 的“创建日期 + 阅读时间”，不复制旧组件的双日期内部
  实现。
- 使用 v5 标准 Folder/Tag 页面；这意味着带正文的 folder index 后仍会显示目录
  列表。
- 虚拟 tag 页面进入 v5 的层级 trie，因此 74 个 tag 页面继续显示完整中文
  Breadcrumbs，但仍不会被误当成真实 Markdown 内容。
- 发布隐私路径在 glob 阶段过滤，减少不应发布内容被解析或进入内存的机会。
- 可见性分成硬路径忽略、`publish` 构建许可和 `unlisted` 发现控制三层；每层
  语义单一，不再让 `draft` 或标签承担安全职责。
- 使用内容哈希后的 CSS/JS 资源和 v5 插件锁文件。
- ContentIndex 只接收真实 Markdown 内容；虚拟 folder/tag 页面不会再以构建时间
  污染 RSS、sitemap 或内容索引。

## 后续可选插件

本轮只启用了与现有发布契约兼容的
[`unlisted-pages`](https://github.com/quartz-community/unlisted-pages)。以下插件
经过评估但没有盲目开启：

- [`encrypted-pages`](https://github.com/quartz-community/encrypted-pages) 可用于
  静态加密页面，但不能替代硬忽略目录；弱密码的密文仍可离线尝试。
- [`og-image`](https://github.com/quartz-community/og-image) 可逐页生成分享图，
  但需先验证 Linux CI 中的中文字体和额外构建成本。
- [`bases-page`](https://github.com/quartz-community/bases-page) 暂不适合当前两份
  `type: map` 的 Base，而且默认不会遵守本站 `publish` opt-in 边界。

当前插件目录可参考
[`quartz-community/registry`](https://github.com/quartz-community/registry/blob/main/registry.json)。

## URL 兼容性

v5 会把内容 slug 统一为小写并规范化连字符。当前 149 篇内容中有 93 个路径包含
大小写变化。`AliasRedirects.enableCaseRedirects` 已开启：

- 在 GitHub Actions 的 Linux 大小写敏感文件系统中会生成旧大小写路径的跳转页。
- macOS 默认大小写不敏感文件系统无法同时写入大小写不同的两个文件，因此本地
  `public` 不会出现这些跳转页。
- v5 自动生成的 tag 虚拟页没有原始文件路径；计入层级 tag 的父级前缀后，当前
  74 个 tag URL 中有 59 个旧大小写形式无法由 AliasRedirects 自动恢复。尚未找到
  合适的社区组件，因此按约定保留为空白，等待后续决定是否补显式 redirect。

显式 `aliases` 与 `permalink` 仍由 AliasRedirects 生成跳转页。

## Bun 工作流

所有常用路径显式通过 Bun 执行：

```bash
bun run dev
bun run build
bun run check
bun run test
```

在 Bun 1.3.14 下，当前官方测试为 158/163 通过；未通过的 5 项全部位于未修改的
`quartz/cli/helpers.test.js`，原因是 Bun 的 `node:test` 兼容层尚未提供
`mock.method`。本站迁移没有为掩盖这一上游运行时差异而改写或新增测试；CI 继续
执行类型/格式检查与生产构建，本次迁移另以一次性输出断言和浏览器验收补足验证。

冷环境安装：

```bash
bun ci
bun run plugins:install
```

`plugins:install` 先只解析声明式配置并核对 `quartz.lock.json`，随后删除整个
`.quartz/plugins` 可执行工作树，再由上游 v5 安装器从锁定 commit 冷恢复插件。
恢复后会复核仓库来源/ref、Git HEAD commit object、普通/ignored 文件以及 Git
index 隐藏标记，最后用 Bun 生成 `.quartz/plugins/index.ts`。`prebuild` 会再次
完成完整性校验后重建索引；校验前不会加载外部插件代码，也不会隐式调用 npm。
CI 不缓存可执行插件工作树。

`plugins/*` 是 Bun workspace，根依赖使用 `workspace:*`。因此本地插件在
`node_modules` 中保持为指向源码的符号链接，编辑组件后不会因为 `file:` 依赖的
复制缓存而构建旧代码。

Quartz v5 的部分 CLI 维护路径仍硬编码 npm，尤其是框架 upgrade 和没有预编译
`dist/` 的 Git 插件。为保持纯 Bun：

- 不使用 `quartz upgrade` 更新框架；
- Git 插件只采用带预编译产物的版本；
- 不提交 `.quartz/` 或 `node_modules/`。

## GitHub Pages 与 Docker

`.github/workflows/deploy.yml`：

- 监听 `v5`；
- 使用 `secrets.BLOGS` 递归拉取私有/独立 content submodule；
- checkout 后不持久化该凭据，构建 job 只有只读 contents 权限，Pages/OIDC
  写权限仅授予 deploy job；
- 所有第三方 GitHub Actions 固定到对应主版本当前的完整 commit SHA；
- 读取 `.bun-version` 安装 Bun；
- 只缓存 Bun 包；Git 插件每次从锁定 commit 冷恢复；
- 依次运行 `bun ci`、`bun run plugins:install`、`bun run check` 和 Bun 构建；
- 使用官方 Pages artifact/deploy actions 发布 `public`。

Docker 采用“Bun 先构建、镜像只封装产物”的边界：先在可信工作区执行
`bun run build`，Dockerfile 再基于固定 OCI index digest 的
`oven/bun:1.3.14-slim` 复制 `public` 和 Bun 静态服务器。`.dockerignore` 是严格
allowlist，build context 不包含框架、content、依赖、Git 凭据，连
ExplicitPublish 过滤掉的普通草稿也不会进入镜像层或构建缓存；启动不依赖
Node/npm/npx。Dependabot 会单独跟踪 Docker 基础镜像更新。

## 后续更新 v5

当前官方 Quartz remote 名为 `public`。更新前先在独立分支操作：

```bash
git fetch public v5
git merge --no-ff public/v5
bun ci
bun run plugins:install
bun run check
bun run test
bun run build
```

重点检查上游是否改动了：

- `quartz/plugins/emitters/componentResources.ts` 中远程 CSS `@import` 提升逻辑；
- `quartz/util/sourcemap.ts` 中 Bun URL 兼容逻辑；
- `quartz.config.yaml` schema 与插件配置格式；
- 内容记录仍为 149，以及 `SMT-Basic.md` 仍然发布。

官方迁移背景可参考
[Quartz v5 migration guide](https://github.com/jackyzha0/quartz/blob/507ad7f3d4601d83482f61930fccf1c77f42a072/docs/getting-started/migrating.md)。
