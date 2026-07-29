# virgiling.wiki — Quartz v5

本仓库只保存博客框架、主题和部署配置；文章继续由 `content` Git
submodule 独立维护。框架基于 Quartz v5，包管理器与运行时统一使用 Bun。

## 本地启动

需要 Git 与 `.bun-version` 指定的 Bun 版本。

```bash
git submodule update --init --recursive
bun ci
bun run plugins:install
bun run dev
```

默认预览地址为 `http://localhost:8080`。

## 常用命令

```bash
bun run dev      # 构建并启动本地预览
bun run build    # 生成 public/
bun run check    # TypeScript 与格式检查
bun run test     # 单元测试
```

不要使用 npm、pnpm 或 yarn 更新锁文件。Git 插件由
[`quartz.lock.json`](./quartz.lock.json) 固定提交，JavaScript 依赖由
[`bun.lock`](./bun.lock) 固定。

## Docker

先用 Bun 生成经过发布过滤的站点，再封装运行镜像：

```bash
bun run build
docker build -t virgiling-wiki .
docker run --rm -p 8080:8080 virgiling-wiki
```

Docker build context 只包含 `public/` 与 Bun 静态服务器，未发布 Markdown
不会进入镜像层或构建缓存。

完整的迁移决策、YAML/frontmatter 契约、组件缺口和后续升级方式见
[`MIGRATION_V5.md`](./MIGRATION_V5.md)。新文章的推荐 YAML、可见性与内容复核
字段见 [`AUTHORING.md`](./AUTHORING.md)。
