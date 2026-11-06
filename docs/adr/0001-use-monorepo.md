# ADR-0001: 使用 Monorepo 管理前後端

- **狀態**: Accepted
- **日期**: 2026-11-XX
- **決策者**: Paul

## Context

Orderly 包含兩個 app（Next.js 前端、Go 後端）和共用資源
（TypeScript 型別、文件、docker-compose）。需決定用 monorepo 還是兩個獨立 repo。

## Decision

採用 **pnpm workspaces** 的 monorepo 結構。單一 git repo 包含：

- `apps/web`（Next.js）
- `apps/api`（Go）
- `packages/shared-types`（前後端共用型別）

## Considered Alternatives

### 方案 A: 兩個獨立 repo

- 優點：各自 CI 簡單、權限分開
- 缺點：型別同步困難、全站 feature 要 2 份 PR

### 方案 B: Monorepo with Turborepo

- 優點：build cache、task 編排強
- 缺點：3 個 app 以下過度設計、對新手複雜

### 方案 C（採用）: Monorepo with pnpm workspaces

- 優點：設定極簡（10 行內）、磁碟省（硬連結）、禁幽靈依賴
- 缺點：task 編排沒 Turborepo 強（但目前用不到）

## Consequences

### 正面
- 前後端型別永遠同步（透過 `@orderly/shared-types`）
- 一次 PR 可改前後端
- docker-compose 統一管理所有 local 服務
- 單一 git history、容易追溯跨 app 的改動

### 負面
- CI 要分工（Go test + pnpm test）
- 新開發者要裝 pnpm + Go

## Review Date

2027-05: 評估是否要升到 Turborepo（當 apps 超過 4 個時）
