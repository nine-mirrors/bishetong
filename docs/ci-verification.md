# CI 与部署验收结果

- 时间：2026-10-28
- CI run：[40615825656](https://github.com/nine-mirrors/bishetong/actions/runs/40615825656)
- 结果：lint / unit / test / docker / build 五个 job 全部 success
- Docker job 执行 `docker compose up -d --build`，MySQL、后端、前端容器启动成功；`/api/health` 与前端 8080 健康检查通过后自动清理
- 前端单元测试：16 个用例（Vitest + Vue Test Utils + jsdom）
- 后端测试：39 个用例（27 个纯函数 + 12 个 HTTP 层接口）
- 演示数据：15 张表均有记录，8 份种子文档齐全
