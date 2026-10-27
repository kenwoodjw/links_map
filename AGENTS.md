<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 项目工作命令与协作
- 需求与验收：docs/product.md；设计：docs/design.md；运行结构与状态约定：docs/architecture.md。按既有文档维护，避免重复。
- 安装：`pnpm install --frozen-lockfile`；无全局 pnpm 时可用 `npx --yes pnpm install --frozen-lockfile`。当前锁文件的 esbuild 构建脚本可能被 pnpm 11 提示未批准；先核验实际构建，不更换锁文件或静默放开脚本。
- 开发：`pnpm dev --hostname 0.0.0.0 --port 3000`；生产构建：`pnpm build`；生产预览：`pnpm start --hostname 0.0.0.0 --port 3001`。
- 检查：`pnpm exec tsc --noEmit`、`pnpm lint`、`git diff --check`。也可用对应 node_modules/.bin 命令。
- UI 至少实际检查 1440×900、375×812、768px 和 1024px；核查搜索/筛选、手机单抽屉返回、键盘编辑、记录重开与刷新、图片和存储失败。桌面侧栏非模态；窄屏背景 inert、焦点限制在当前抽屉。
- 使用任务分支，保护已有改动。阶段顺序独占工作目录，交接后停止写入；并行修改需独立分支和 worktree。交付明确提交与本地预览、截图及验证证据，再交 QAReviewer 独立验收。合并、部署与发布由用户决定。
