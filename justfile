# 显示可用命令及说明。
default:
    @just --list

# 启动后端服务（由使用者本人运行，包含原生编译）。
backend:
    cargo run --offline

# 启动前端开发服务。
[working-directory('web')]
frontend:
    pnpm dev --host 127.0.0.1

# 仅运行 Rust 测试。
test:
    cargo test --offline

# 校验性能样本的已知精确结果，仅运行该集成测试。
perf-check:
    cargo test --offline --test performance fixed_samples_have_known_exact_results -- --exact

# 独立测量两种算法；可用 BO_PERF_SAMPLE、BO_PERF_ALGORITHM、BO_PERF_ROUNDS 筛选。
perf:
    cargo test --offline --test performance independent_timings -- --exact --ignored --nocapture --test-threads=1

# 单算法采样负载；必须设置 BO_PERF_SAMPLE 和 BO_PERF_ALGORITHM。
perf-profile:
    cargo test --offline --test performance profile_one_algorithm -- --exact --ignored --nocapture --test-threads=1

# 从前端案例导出独立性能夹具；不启动后端。
[working-directory('web')]
perf-export:
    pnpm run perf:export

# 只运行 Rust 案例性能诊断；读取已导出夹具，不调用前端工具。
perf-cases profile="test":
    cargo test --offline --profile {{profile}} --lib algorithms::segment_intersection::bo::http::case_performance::actual_case_timings -- --exact --ignored --nocapture --test-threads=1

# 独立临时端口测量真实教学体验；BO_PERF_MODE=full 测完整生成，cancel 测提早取消。
perf-learning:
    node tools/algorithms/segment_intersection/bo/measure-learning.ts

# 捕获或逐步比较完整 HTTP 教学语义；基线采用 gzip JSONL，拒绝覆盖。
trace-baseline mode baseline:
    node tools/algorithms/segment_intersection/bo/compare-traces.ts {{mode}} {{quote(baseline)}}

# 一键启动临时后端并运行无头 E2E，结束后自动清理（包含原生编译，由使用者运行）。
[positional-arguments]
test-e2e *args:
    pnpm --dir web test:e2e --config ../playwright.config.ts "$@"

# 检查前端及根目录 E2E 编排配置的类型。
[working-directory('web')]
typecheck:
    pnpm typecheck
    pnpm exec tsc --project ../tsconfig.json

# 运行前端 lint。
[working-directory('web')]
lint:
    pnpm lint

# 一键运行类型检查、lint、Rust 测试和 E2E（包含原生编译，由使用者运行）。
check: typecheck lint test test-e2e
