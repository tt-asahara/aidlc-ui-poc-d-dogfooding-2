# 段階の境目の確認 — 要件・設計 → 実装

**判定: PASS（つながりの抜けなし）**

## 確認した成果物

- ストーリー（user-stories、承認済み）: `inception/user-stories/traceability.json`
- 部品の設計（domain-design、承認済み）: `inception/domain-design/traceability.json`
- Unit の分割（units-generation、見直し後に再承認済み）: `inception/units-generation/traceability.json`
- 約束ごと（contract-design、再承認済み）は、要件の被覆を持たないため、この確認の対象外です。

## つながりの確認

| 確認内容 | 上流の件数 | 割り当て済み | 抜け（GAP） | 宛先のないもの（ORPHAN） | 無効な宛先 | 結果 |
|----------|-----------|--------------|-------------|--------------------------|------------|------|
| 要件 → ストーリー | 63 | 63（OK 59、Deferred 4） | 0 | 0 | 0 | PASS |
| ストーリー → 部品 | 18 | 18（OK 18） | 0 | 0 | 0 | PASS |
| ストーリー → Unit | 18 | 18（OK 18） | 0 | 0 | 0 | PASS |

検査ツール（aidlc-sensor-traceability）の結果は、3つとも抜け・宛先のないもの・無効な宛先が0件でした。

## 後の工程に回した要件（Deferred）

ストーリーにしない非機能の要件で、宛先の工程が決まっています。抜けではありません。

| 要件 | 内容 | 宛先 |
|------|------|------|
| NFR1 | 性能（明細 3,000 件で画面の更新 1 秒以内、1,000 行の取り込み 3 秒以内） | NFR 要件 |
| NFR3 | 外部への通信をしない | NFR 要件 |
| NFR6 | 対応ブラウザと画面幅・拡大 | NFR 要件 |
| NFR7 | 保守性・テスト（Vitest・Playwright、行カバレッジ 80%、Prettier・ESLint） | ビルドとテスト |

## 被覆率

- 要件 63件中63件がストーリーまたは後の工程に割り当て済み（100%）
- ストーリー 18件中18件が部品と Unit に割り当て済み（100%）
- 6つの Unit すべてに、1件以上のストーリーがある

## 持ち越す注意点（抜けではない）

- 契約レビューの R-01〜R-03・R-10・R-11 などの了承済みの指摘は、`delivery-planning/risk-and-sequencing-rationale.md` で各 Bolt に割り当てた。
