## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T15:32:53Z
**Iteration:** 2

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 確かめ方 (NFR3.2) | NFR3.2 の確かめ方は「ビルドの出力 `app/dist/` に `http://`・`https://` で始まる読み込み先がない」ことを、ビルド後のテストで確かめるとしている。しかし React DOM の本番ビルドには、仕様上の名前空間の文字列（`http://www.w3.org/2000/svg` など）やエラー案内の URL（`https://react.dev/errors/` など）が文字列として含まれるのが一般的な挙動である。dist 全体を文字列検索するテストは必ず失敗し、Code Generation は検索範囲を弱めるか、テストを通すために場当たり的に例外を足すことになる。 | 検査の対象を「読み込み先」に限定して明記する。例えば `index.html` の src・href、CSS の url() と @import、JS の import() と動的に作る script・link に限る。JS 内の名前空間・案内用の文字列は対象外とし、その理由をテスト設計に書く。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 保存の手順（DataStore.commit）手順 3 と 起動時に保存領域が使えないとき | 「起動時は読み込みの使えない失敗を保存データなしと同じに扱い、最初の登録で STORAGE_WRITE になる」とある。ところが commit の手順 3 は、保存領域の読み直しで読めなければ STORE_UNREADABLE を返し、状態を unreadable にする。localStorage へのアクセス自体が SecurityError で失敗する環境では getItem も例外になるため、最初の登録は STORAGE_WRITE ではなく STORE_UNREADABLE になる。2 つの記述が矛盾し、利用者に見える表示（BR4.3 と BR4.2・BR4.6）が実装者の解釈で変わる。 | 手順 3 で、保存領域へのアクセス自体の失敗（例外）と、保存済みの文字が読めない場合（JSON・版の不正）を分けて扱いを書く。アクセス失敗は「保存データなし」として進めて手順 5 の STORAGE_WRITE に流すか、起動時の扱いを STORE_UNREADABLE に揃えるかのどちらかに決め、双方の節を一致させる。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 予想外の失敗（Q3） | Error Boundary はレンダー中の例外だけを受け止め、イベントハンドラー（登録の送信、CSV の書き出しのクリック）と非同期処理の例外は受け止めない。また AppShell（起動時の読み込みと組み立て）は 3 つの区切りの外側にあるため、そこでの例外は画面全体が白くなる。設計は「予想外の失敗は区切りごとに role=alert で出る」と読めるが、実際に起こりうる箇所をカバーしていない。 | ハンドラー内の予想外の例外を、try/catch で捕まえてエラー状態に載せ、Boundary に再スローする方針を書く。AppShell 全体を囲む最上位の Boundary も足す。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > Content-Security-Policy | `default-src 'none'` と `img-src`・`font-src 'self'` では、data: の URL が許可されない。Vite は既定で 4KB 未満の資産を data: URL として埋め込む（`build.assetsInlineLimit`）ため、画像や書体を足した時点で CSP に黙って阻止される。 | ビルド設定で `assetsInlineLimit: 0` を指定する旨と、dist に data: の読み込みがないことの確認を足す。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/logical-components.md > インフラ設計へ渡すこと | localStorage は配信元ごとに分かれるため、プレビューのアドレスとポートの固定が必要と書くだけで、設計として決めていない。ポートが使用中だと Vite preview は別のポートに自動で切り替わり、保存データが見えなくなる。 | `vite preview` の port を固定し、`strictPort: true` を指定する方針を NFR7.3 に書く。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md > 信頼性の設計 > NFR5.3、NFR4.3 | 手順 3 の改訂で、保存領域へのアクセス失敗は手順 5 へ進む（書き込みを試みる）ことになった。しかし NFR5.3 は「手順 3 で読めないときは、保存領域に書かない」のままで、「読めない」がアクセス失敗を含むのか壊れた文字だけなのかが読み取れない。NFR4.3 も DataStore.load でのアクセス失敗の扱いを書いていない。 | NFR5.3 を「保存されている文字が壊れているとき」に限ると明記し、NFR4.3 に「アクセス失敗は保存データなしとして扱う」を一文足す。 | New |

> R-01 Not re-checked this round

> R-02 Not re-checked this round

> R-03 Not re-checked this round

> R-04 Not re-checked this round

> R-05 Not re-checked this round

### Resolved

| ID | Resolution |
|---|---|
| R-01 | NFR3.2 の検査対象が読み込み先（index.html の src と href、CSS の url() と @import、JS の import() の行き先）に絞られ、JS の文字列全体は除外され、その理由も書かれている。React の出力で必ず失敗する問題は解消した。 |
| R-02 | commit 手順 3 がアクセス失敗（手順 5 から STORAGE_WRITE）と壊れた保存文字（STORE_UNREADABLE）に分かれ、起動時の節とも一致した。 |
| R-03 | 最も外側の Error Boundary と、イベント処理・非同期の例外を状態に載せて次の表示で再スローする方式が書かれ、受け止められない範囲の穴が閉じた。 |
| R-04 | assetsInlineLimit を 0 にし、NFR3.2 の検査が data: も対象にしているため、CSP との食い違いは解消した。 |
| R-05 | preview は 127.0.0.1、固定ポートと strictPort、テスト用に別の固定ポートとし、logical-components.md と NFR7.3 に反映された。具体的な番号はインフラ設計で決める旨が明記されている。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability.json の JSON 検査 | PASS | 構文は正しい |

### Summary

前回の Major 2 件と Minor 3 件はすべて解消した。新たな Critical と Major はなく、R-06 は文言の整合を取るだけの Minor である。READY とする。
