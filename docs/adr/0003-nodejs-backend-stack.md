# ADR-0003: Node.js Backend 技術棧選型

- **狀態**: Accepted
- **日期**: 2026-11-05
- **決策者**: Paul
- **相關**: [ADR-0002](./0002-nodejs-instead-of-go.md)

## Context

在 ADR-0002 決定把 backend 從 Go 換成 Node.js + TypeScript 後，需要為 Orderly 選擇完整的 backend 技術棧。這份 ADR 把所有相關選型整理在一起、每個都做過 trade-off 分析。

## Decision 總覽

| 分類 | 選擇 | 主要 trade-off |
|------|------|---------------|
| Framework | **Fastify** | 不選 Express（維護模式） |
| DB 存取 | **pg + pgtyped** | 不選 ORM（保留 SQL 技能） |
| Validation | **Zod** | 業界標準、無爭議 |
| 測試 | **Jest** | 不選 Vitest（Jest 資源多） |
| HTTP Client | **axios** | 不選原生 fetch（axios 熟悉） |
| Linter/Formatter | **ESLint + Prettier** | 不選 Biome（Next.js 預設） |

---

## 1. Framework: Fastify

### 考慮的方案

**Express**:
- ✅ 15 年老牌、生態系最大
- ❌ 進入維護模式、更新緩慢
- ❌ TypeScript 支援要自己配
- ❌ 無內建 schema 驗證
- ❌ 效能基準比 Fastify 慢 2-3 倍

**Fastify**（採用）:
- ✅ TypeScript 原生支援
- ✅ 內建 JSON Schema 驗證（配合 Zod）
- ✅ Plugin encapsulation 嚴格、避免全域污染
- ✅ 效能業界領先
- ✅ 2024+ 新 Node.js 專案首選
- ❌ 比 Express 新、學習資源相對少（但官方文件極佳）

**Hono**:
- ✅ 最快、edge runtime 友善
- ❌ 太新、node 專案生態系還不成熟

### Review Date
2027-05: 如果 Fastify 遇到 plugin 不足、考慮切 Hono

---

## 2. DB 存取: pg + pgtyped（type-safe raw SQL）

### 核心哲學

**堅持寫 raw SQL、但要有 type safety**——不走 ORM 路線。

### 考慮的方案

**Prisma**:
- ✅ 功能完整、文件最好
- ❌ 需要學 Prisma schema 語言
- ❌ Client 檔案大（2-5 MB）
- ❌ 複雜 query 難表達、要 escape 到 raw SQL

**Drizzle ORM**:
- ✅ 語法接近 SQL、輕量
- ✅ TypeScript 型別推導強
- ❌ 還是半 ORM、不是真正的 SQL

**Kysely**（SQL query builder）:
- ✅ TypeScript-first、type-safe
- ❌ 還是用 TS 組 query、不是真 SQL

**postgres.js**:
- ✅ 最簡單、template literal 漂亮
- ❌ 查詢結果是 `any[]`、無 type safety

**pg（node-postgres）**:
- ✅ 業界事實標準、最接近 Go pgx 體驗
- ❌ 無 type safety（單用時）

**pg + pgtyped**（採用）:
- ✅ 寫真正的 SQL（.sql 檔案）
- ✅ 工具自動生成 TypeScript 型別
- ✅ 相當於 Node.js 版的 sqlc（跟 Go 版技術哲學一致）
- ✅ 零 runtime overhead
- ✅ Phase 3-4 學的 SQL 技能完全接續
- ✅ Phase 4 L4 的 EXPLAIN 分析技巧真的用得到
- ❌ 多一個 codegen build step
- ❌ 工具較小眾

### 為什麼不選 ORM

ORM 看似方便，但代價：
- 隱藏 N+1 問題（Phase 4 L2 學過的痛）
- 複雜 query 效能難預測
- 失去對 SQL plan 的掌控
- Senior 面試偏好 raw SQL 能力

寫 raw SQL + 自動生成型別 = 兩全其美。

### Review Date
2027-05: 若 pgtyped 維護不佳、考慮 Kysely

---

## 3. Validation: Zod

### 考慮的方案

**Joi**:
- ❌ 老、TypeScript 整合弱

**Yup**:
- ❌ 舊時代選擇、TS 支援普通

**Zod**（採用）:
- ✅ TypeScript-first、schema 和型別雙向生成
- ✅ 業界事實標準（2024+）
- ✅ 和 Fastify、tRPC、Next.js server actions 整合深
- ✅ 可以在前後端共用（透過 `packages/shared-types`）

無爭議決策。

---

## 4. 測試: Jest

### 考慮的方案

**Jest**（採用）:
- ✅ 15 年老牌、生態系最大、資源最多
- ✅ ChatGPT/Stack Overflow 答案海量
- ✅ 對 Node.js 新手友善
- ✅ Mocking 強
- ❌ ESM 支援要配置
- ❌ 啟動較慢

**Vitest**:
- ✅ 快 3-10 倍
- ✅ ESM 原生、Vite 生態
- ❌ 新、資源較少

### 選 Jest 的理由

作為 Node.js 初學階段、資源豐富度優先於效能。效能瓶頸還遠未到。等熟悉 Node.js 後可評估切 Vitest。

### Review Date
2027-05: 熟悉 Node.js 後評估是否切 Vitest

---

## 5. HTTP Client: axios

### 考慮的方案

**原生 fetch**（Node 20+）:
- ✅ 內建、不用裝
- ✅ 和瀏覽器一致
- ❌ API 較底層、錯誤處理要多寫

**undici**:
- ✅ Node 原生底層實作、最快
- ❌ API 較複雜

**axios**（採用）:
- ✅ 熟悉的 API
- ✅ 攔截器方便（auth token 注入）
- ✅ 文件最多、資源豐富
- ❌ Bundle 50KB
- ❌ 額外依賴

### 選 axios 的理由

Backend 呼叫第三方 API 情境（Stripe、SendGrid 等）、axios 的開發體驗最好、資源最豐富。效能差異在這些 I/O-bound 場景下可忽略。

---

## 6. Linter/Formatter: ESLint + Prettier

### 考慮的方案

**Biome**:
- ✅ Rust 寫的、快 10-100 倍
- ✅ Lint + format 一個工具搞定
- ❌ 新、plugin 生態系小
- ❌ Next.js 整合不如 ESLint 深

**ESLint + Prettier**（採用）:
- ✅ Next.js create-next-app 預設
- ✅ 業界 95% 在用
- ✅ Plugin 生態系無敵（含 TypeScript、React、Fastify 專用）
- ✅ 作者前端經驗熟悉
- ❌ 兩個工具要維護
- ❌ 比 Biome 慢

### 選 ESLint + Prettier 的理由

與 Next.js 專案預設一致、不增加新工具認知負擔。等 Biome 生態成熟（2027+）再評估切換。

### Review Date
2027-05: 評估 Biome 生態是否成熟

---

## Consequences

### 正面
- 所有選型都有明確 trade-off 分析
- 以「資源豐富、對新手友善」為主軸（Jest、axios、ESLint）
- 關鍵策略決策（raw SQL）保留學習連續性
- Fastify + Zod + pg + pgtyped 組合 2024+ 業界主流

### 負面
- Fastify、pgtyped 相對新、遇到問題 debug 可能較難
- 比全部用最新工具（Biome、Vitest、Hono）效能略低

### 風險緩解
- 每個選型都設 Review Date 定期評估
- 複雜功能實作前、先確認框架有對應 plugin/範例
