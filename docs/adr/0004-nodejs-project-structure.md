# ADR-0004: apps/api 的 Node.js 專案結構

- **狀態**: Accepted
- **日期**: 2026-11-05
- **決策者**: Paul
- **相關**: [ADR-0003](./0003-nodejs-backend-stack.md)

## Context

Phase 4.5 L1 要為 `apps/api` 建立 Node.js + TypeScript 基礎骨架。需決定：
- Module 系統（ESM vs CommonJS）
- 開發 workflow（tsc vs tsx vs ts-node）
- TypeScript 嚴格度
- 編譯目標

## Decisions

### 1. Module 系統: ESM（`"type": "module"`）

**理由**：
- 2026 新專案標準
- 原生支援 top-level await
- 和 Next.js 前端一致
- 未來 tree-shaking 友善

**代價**：
- 遇到 CJS 老套件要處理相容性
- `__dirname` 要用 `import.meta.url` 替代

### 2. 開發 workflow: tsx watch

**考慮過**：
- `tsc --watch` + `node dist/`：慢、要維護 dist
- `ts-node`：舊、速度慢
- `tsx`：快（esbuild）、watch 內建、ESM 原生 ⭐
- Node 22 原生 TS：太新、尚不穩定

**選 tsx 理由**：開發速度、零設定、watch 可靠。

### 3. Production: tsc + node

**不用 tsx 跑 production** 的理由：
- 純 node 更穩定
- 沒有額外依賴
- 效能可預測

**Workflow**：`tsc` 編譯成 `dist/` → `node dist/index.js`

### 4. TypeScript 嚴格度: `strict: true` + 額外檢查

打開所有嚴格選項：
- `strict: true`
- `noUnusedLocals`
- `noUnusedParameters`
- `noFallthroughCasesInSwitch`

**理由**：senior 專案的標準、CI 階段抓 bug 比 runtime 便宜 1000 倍。

### 5. 編譯目標: ES2022, module NodeNext

- `target: ES2022`：Node 20 支援、現代語法可用
- `module: NodeNext` + `moduleResolution: NodeNext`：讓 TS 用和 Node 一樣的 module 解析邏輯

## Consequences

### 正面
- 開發體驗極佳（tsx watch 快）
- Production 執行純 Node、穩定
- 型別嚴格、bug 編譯時就抓
- 設定簡單、無額外 bundler

### 負面
- 遇到 CJS 老套件相容性問題要處理
- `__dirname` 要用 workaround
- tsconfig 比較複雜（但業界通用）

## Review Date
2027-05: Node.js 原生 TS 支援成熟後、評估是否移除 tsx
