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

# 运行全量测试，包含无头浏览器 E2E。
test:
    cargo test --offline

# 单独运行无头浏览器 E2E，可通过 BO_E2E_GREP 筛选。
[working-directory('web')]
test-e2e:
    pnpm test:e2e

# 检查前端类型。
[working-directory('web')]
typecheck:
    pnpm typecheck

# 运行前端 lint。
[working-directory('web')]
lint:
    pnpm lint

# 依次运行类型检查、lint 和全量测试。
check: typecheck lint test
