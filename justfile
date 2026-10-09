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
