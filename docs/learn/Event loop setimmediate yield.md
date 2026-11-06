# 用 setImmediate 切批，讓 CPU 密集計算不卡住 Node.js

> 一句話：`await` 不會自動讓出 event loop。要讓其他 request 插進來，必須讓「回來繼續算」變成 **macrotask**。

---

## 1. 問題是什麼

Node.js 只有**一條主執行緒**在跑 JS。一個 request 如果在做大量計算，其他 request 全部只能等。

```js
app.get('/report', (req, res) => {
  let sum = 0
  for (let i = 0; i < 10_000_000_000; i++) {
    sum += i
  }
  res.json({ sum })
})
```

這段在跑的期間，整個 server 無法回應任何請求，連 `/health` 都會逾時。

---

## 2. 解法

把計算切成小批，每算完一批就讓出主執行緒一次：

```js
app.get('/report', async (req, res) => {
  let sum = 0
  const batchSize = 1_000_000

  for (let i = 0; i < 10_000_000_000; i += batchSize) {
    for (let j = i; j < i + batchSize; j++) {
      sum += j
    }
    await new Promise(resolve => setImmediate(resolve))
    // ↑ 讓 event loop 繞一圈，處理其他 request，再回來算下一批
  }

  res.json({ sum })
})
```

---

## 3. 為什麼這樣寫

### 3.1 前置知識：執行順序的 4 條規則

1. **同步程式碼**最優先，從上到下全部跑完。
2. 接著**清空 microtask**：先清完 `nextTick` 佇列，再清完 Promise 佇列。
3. 進入 event loop，依照階段順序拿**一個 macrotask** 出來執行。
4. 每做完**一個** macrotask，回到第 2 步，清空 microtask 後才拿下一個。

| 類型 | 有哪些 | 什麼時候執行 |
|---|---|---|
| Microtask | `process.nextTick`、`.then`、`await` 後面的程式碼、`queueMicrotask` | 每個 macrotask 之間的縫隙，**必須全部清空**才能往下走 |
| Macrotask | `setTimeout`、`setInterval`、I/O callback、`setImmediate`、close 事件 | 屬於 event loop 的某個階段，繞到該階段才執行 |

新進來的 HTTP request 是 I/O，在 **poll 階段**才會被處理。

### 3.2 常見誤解：「遇到 await 就會去處理別的事」

如果寫成這樣：

```js
await Promise.resolve()   // 或 await null
```

實際流程：

1. 第一批算完，遇到 `await`，函式暫停。
2. 這個 Promise **已經 resolved**，所以 await 後面的程式碼立刻排進 **microtask**。
3. 規則 2：microtask 要全部清空 → 馬上執行 await 後面 → 算第二批 → 又 await → 又排一個 microtask → 繼續清……
4. 一萬批全部在**同一次清 microtask** 的過程中跑完。

event loop 從頭到尾沒走到 poll 階段，**其他 request 一樣全部卡住**，效果跟沒寫 await 幾乎相同。

> 重點：await 能讓給的只有 microtask。要讓給其他 request，Promise 必須在**之後的某個 macrotask** 裡才被 resolve。

### 3.3 setImmediate 做了什麼

```js
await new Promise(resolve => setImmediate(resolve))
```

意思是「這個 Promise 要等到 **check 階段**才 resolve」：

1. 第一批算完，`setImmediate` 把 `resolve` 排進 check 佇列（macrotask），函式暫停。
2. 目前的 request handler 結束，microtask 佇列是空的。
3. event loop 在 **poll 階段處理其他進來的 request** ← 目的達成
4. 到 check 階段執行 `resolve()`，await 後面的程式碼排進 microtask。
5. 清 microtask → 算第二批 → 排下一個 `setImmediate`。
6. 在 check 階段裡新排的 setImmediate 會等到**下一圈**才執行，所以中間又經過一次 poll。

本質：**把「回來繼續算」變成 macrotask，強迫 event loop 先繞過 poll 才能回來。**

---

## 4. 結果：各種寫法對照

| 寫法 | resolve 時機 | 其他 request 能插進來嗎 | 備註 |
|---|---|---|---|
| 不寫 await | — | ❌ | 完全卡死 |
| `await Promise.resolve()` | 立刻（microtask） | ❌ | 看起來有讓，其實沒有 |
| `process.nextTick(resolve)` | microtask | ❌ | 同上 |
| `setImmediate(resolve)` | check 階段（macrotask） | ✅ | **最適合** |
| `setTimeout(resolve, 0)` | timers 階段（macrotask） | ✅ | 每批至少延遲約 1ms，一萬批多出 10 秒以上 |

---

## 5. 自己驗證

加一個很快的路由：

```js
app.get('/ping', (req, res) => res.send('pong'))
```

測試時把迴圈上限改小一點（例如 `1_000_000_000`），然後：

```bash
curl localhost:3000/report &   # 背景執行，開始算
curl localhost:3000/ping       # 馬上打 ping
```

- **有 setImmediate**：`pong` 幾乎立刻回來。
- **沒有，或用 `await Promise.resolve()`**：`pong` 要等 `/report` 算完才回來。

---

## 6. 注意事項

- **總和會失真**：0 加到約 10¹⁰ 的結果約 5 × 10¹⁹，超過 `Number.MAX_SAFE_INTEGER`（約 9 × 10¹⁵）。真的要算請用 `BigInt`，或直接用公式 `n * (n - 1) / 2`。
- **切批只是不卡死，不是變快**：這個 request 本身還是一樣慢，多個 `/report` 同時進來時會輪流佔用主執行緒，大家都更慢。
- **batchSize 是取捨**：太小，讓出次數太多、額外開銷大；太大，其他 request 每次要等比較久。
- **真正的 CPU 密集工作**：用 `worker_threads` 丟到另一條執行緒算，主執行緒完全不受影響。setImmediate 切批適合「偶爾、中等份量」的計算。
- **不要用 nextTick 遞迴讓出**：microtask 會一直被清，event loop 永遠到不了下一階段，I/O 全部餓死。