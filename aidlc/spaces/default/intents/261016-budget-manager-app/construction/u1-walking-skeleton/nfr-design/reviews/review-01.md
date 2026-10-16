## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T15:31:04Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 確かめ方 (NFR3.2) | NFR3.2 の確かめ方は「ビルドの出力 `app/dist/` に `http://`・`https://` で始まる読み込み先がない」ことを、ビルド後のテストで確かめるとしている。しかし React DOM の本番ビルドには、仕様上の名前空間の文字列（`http://www.w3.org/2000/svg` など）やエラー案内の URL（`https://react.dev/errors/` など）が文字列として含まれるのが一般的な挙動である。dist 全体を文字列検索するテストは必ず失敗し、Code Generation は検索範囲を弱めるか、テストを通すために場当たり的に例外を足すことになる。 | 検査の対象を「読み込み先」に限定して明記する。例えば `index.html` の src・href、CSS の url() と @import、JS の import() と動的に作る script・link に限る。JS 内の名前空間・案内用の文字列は対象外とし、その理由をテスト設計に書く。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 保存の手順（DataStore.commit）手順 3 と 起動時に保存領域が使えないとき | 「起動時は読み込みの使えない失敗を保存データなしと同じに扱い、最初の登録で STORAGE_WRITE になる」とある。ところが commit の手順 3 は、保存領域の読み直しで読めなければ STORE_UNREADABLE を返し、状態を unreadable にする。localStorage へのアクセス自体が SecurityError で失敗する環境では getItem も例外になるため、最初の登録は STORAGE_WRITE ではなく STORE_UNREADABLE になる。2 つの記述が矛盾し、利用者に見える表示（BR4.3 と BR4.2・BR4.6）が実装者の解釈で変わる。 | 手順 3 で、保存領域へのアクセス自体の失敗（例外）と、保存済みの文字が読めない場合（JSON・版の不正）を分けて扱いを書く。アクセス失敗は「保存データなし」として進めて手順 5 の STORAGE_WRITE に流すか、起動時の扱いを STORE_UNREADABLE に揃えるかのどちらかに決め、双方の節を一致させる。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 予想外の失敗（Q3） | Error Boundary はレンダー中の例外だけを受け止め、イベントハンドラー（登録の送信、CSV の書き出しのクリック）と非同期処理の例外は受け止めない。また AppShell（起動時の読み込みと組み立て）は 3 つの区切りの外側にあるため、そこでの例外は画面全体が白くなる。設計は「予想外の失敗は区切りごとに role=alert で出る」と読めるが、実際に起こりうる箇所をカバーしていない。 | ハンドラー内の予想外の例外を、try/catch で捕まえてエラー状態に載せ、Boundary に再スローする方針を書く。AppShell 全体を囲む最上位の Boundary も足す。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > Content-Security-Policy | `default-src 'none'` と `img-src`・`font-src 'self'` では、data: の URL が許可されない。Vite は既定で 4KB 未満の資産を data: URL として埋め込む（`build.assetsInlineLimit`）ため、画像や書体を足した時点で CSP に黙って阻止される。 | ビルド設定で `assetsInlineLimit: 0` を指定する旨と、dist に data: の読み込みがないことの確認を足す。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/logical-components.md > インフラ設計へ渡すこと | localStorage は配信元ごとに分かれるため、プレビューのアドレスとポートの固定が必要と書くだけで、設計として決めていない。ポートが使用中だと Vite preview は別のポートに自動で切り替わり、保存データが見えなくなる。 | `vite preview` の port を固定し、`strictPort: true` を指定する方針を NFR7.3 に書く。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| 検証ツール | 実行なし（このステージに指定されたツールはなし） | 成果物の読み取りと、上流の要件との突き合わせだけで判定した |

### Summary

CSP の meta 要素の指定は、React と Vite の出力、Blob による CSV ダウンロードと両立しており、方向は妥当である。ただし、NFR3.2 の dist 検査は React の既定の出力で必ず失敗し、保存領域が使えない場合の挙動が手順 3 と起動時の記述で矛盾している。この 2 件の Major を直してから再レビューしてほしい。
