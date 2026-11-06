# ADR-0002: 從 Go 換成 Node.js + TypeScript 作為 Backend

- **狀態**: Accepted
- **日期**: 2026-11-05
- **決策者**: Paul
- **取代**: 無（這是新決策，但影響 Phase 1-4 期間用 Go 建立的 ~/go/orders）

## Context

這個專案的起點是 2026 中期的後端學習計畫——Phase 1-4 用 Go 完成了訂單系統的
核心（Gin + pgx + PostgreSQL）、學習了 HTTP、Go 語言、訂單業務邏輯、DB 進階
（索引、N+1、Isolation、Pool、Migration 等）。

在 Phase 5 L4（API 設計）後、準備進入 L6 一致性之前，我決定把專案方向
從「純後端學習」轉成「全端工程師轉職作品」（決定做 Orderly 電商平台）。
這個轉向觸發了技術棧的重新評估。

## Decision

Backend 從 **Go + Gin + sqlc** 換成 **Node.js 20 + TypeScript + Fastify + Drizzle ORM**。

## 考慮的方案

### 方案 A：保持 Go（原方案）

**優點**：
- 前面 35 課的 code 直接可用、不浪費
- Go 全端工程師在市場上較稀有、履歷差異化
- Goroutine 原生並發、適合高流量下單

**缺點**：
- 前後端型別只能靠 OpenAPI 生成（多一道工）
- 全端職缺中 Go 佔比小（台灣約 15-20%）
- 前後端兩個語言、心智切換成本高

### 方案 B（採用）：換 Node.js + TypeScript

**優點**：
- 前後端同語言——TypeScript 型別、Zod schema、utility 函式全部可共用
- Next.js + Node.js backend 是業界全端標準組合
- 全端職缺中 Node.js 佔比 70-80%
- Fastify 效能已夠支撐電商 MVP 規模
- 作者 TypeScript 熟（前端經驗 5 年+）、進度可加快

**缺點**：
- 前面 Go 專案 code 作廢（但觀念保留）
- 需要新學 server-side Node.js（event loop、module、Fastify、Drizzle）
- 面試差異化減弱（Node.js 全端是「標準組合」而非稀有）

### 方案 C：混合（前端 Next.js API Routes 做 BFF、保留 Go API）

**優點**：
- 兩個語言都保留
- 前端可用 API Routes 做輕量整合

**缺點**：
- 複雜度爆炸——兩個 runtime、兩套部署、兩份 Dockerfile
- 不符合「專案是為了學全端」的目標
- 面試說明負擔（為什麼用兩個 backend）

## Consequences

### 正面
- 前後端共用：型別（`packages/shared-types`）、驗證 schema（Zod）、utility 函式
- Monorepo 價值最大化（同語言 workspace 整合更深）
- 學到 server-side Node.js 完整棧（event loop、Fastify、Drizzle、Zod）
- 作品集對準台灣主流全端職缺
- 用決策本身當面試題材：「我做過技術棧遷移、知道權衡」

### 負面
- 需要額外 4 堂課補 Node.js backend 基礎（Phase 4.5）
- 前面 Go code 沒有繼續演化、但保留在 `archive/go-api/` 供對照
- 面試被問「為什麼你剛學完 Go 就換」需要清楚說明（這份 ADR 就是答案）

## 技術棧對照

| 功能 | Go 方案 | Node.js 方案 |
|------|---------|-------------|
| Runtime | Go 1.23 | Node.js 20 + TypeScript strict |
| Framework | Gin | Fastify |
| ORM | sqlc + pgx | Drizzle ORM |
| Validation | 手寫 | Zod |
| 測試 | testing + testify | Vitest |
| WebSocket | gorilla/websocket | ws |
| Task Queue | goroutine + channel | BullMQ + Redis |
| 部署 | Cloud Run | Fly.io 或 Railway |

## 哪些觀念不變（跨語言可遷移）

Phase 1-4 學的以下觀念在 Node.js 版本完全適用：
- HTTP 協議、REST、middleware 模式
- PostgreSQL 操作、索引、N+1、Isolation levels
- Transaction、SELECT FOR UPDATE、Pool 設計
- Migration 策略、Normalization
- Repository pattern、Dependency Injection
- JWT 驗證、bcrypt 密碼 hash
- 錯誤處理分類（sentinel error → Zod + custom error classes）

## 保留 Go 專案的處理

`~/go/orders` 和原本的 `apps/api` 移動到 `archive/go-api/`：
- 不再演化、不納入 CI
- README 加註說明：「原始 Go 實作的學習記錄」
- 作為「同一個功能、兩個語言」的對照（學習價值）
- 面試可拿出來講遷移動機

## Review Date

- 2027-02：評估 Node.js stack 在開發 Orderly 過程中是否真的更快
- 2027-05：如果有新功能（例如重運算的推薦引擎）需要高效能、考慮用 Go 寫獨立 microservice

## 相關連結

- Fastify 官方文件: https://fastify.dev/
- Drizzle ORM: https://orm.drizzle.team/
- 業界 Node.js 技術棧趨勢（State of JS 2024）
