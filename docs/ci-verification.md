# CI 与部署验收结果

- 时间：2026-10-28
- CI run：[40661732863](https://github.com/nine-mirrors/bishetong/actions/runs/40661732863)
- 结果：lint / unit / test / integration / e2e / docker / build 七个 job 全部 success
- Docker job 执行 `docker compose up -d --build`，MySQL、后端、前端容器启动成功；`/api/health` 与前端 8080 健康检查通过后自动清理
- E2E job 在 Ubuntu 上完成前端构建与 Playwright 三浏览器（Chromium / Firefox / WebKit）9 个用例
- integration job 在真实 MySQL 上执行名额并发、一人一项目并发与只读接口压测
- 前端单元测试：16 个用例（Vitest + Vue Test Utils + jsdom）
- 后端测试：40 个用例（27 个纯函数 + 13 个 HTTP 层接口）
- 演示数据：15 张表均有记录，8 份种子文档齐全
