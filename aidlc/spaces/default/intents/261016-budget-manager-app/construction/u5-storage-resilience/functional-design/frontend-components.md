# 画面部品の設計 — U5 保存の異常・別タブ対応・サンプル

U5 で足す画面部品は、全体のお知らせ枠（NoticeBannerView）だけです。置き場所は、U1 の AppShell で決めた「全体のお知らせ枠の置き場所」（見出しと「1 登録」の間）です。動きの手順は `functional-spec.md`、規則は `rules.md` にあります。

## 部品の階層（U1 からの変化）

```
AppShell
├─ 本文へ移動
├─ 見出し
├─ NoticeBannerView（新規。全体のお知らせ枠）
│   ├─ 読めない知らせ（role="alert"。閉じる操作なし）
│   ├─ 保存できない知らせ（role="alert"。閉じる操作なし）
│   └─ 別のタブの変更の知らせ（role="status"。「閉じる」ボタン）
├─ EntryFormView「1 登録」（U1 のまま）
├─ ReviewView「2 確認」（U1 のまま）
└─ ExportView「3 書き出し」（U1 のまま）
```

<!-- Text fallback: AppShell の下で、見出しと「1 登録」の間に NoticeBannerView を置く。中に、読めない知らせ（alert、閉じられない）、保存できない知らせ（alert、閉じられない）、別タブの変更の知らせ（status、閉じるボタンあり）がある。登録・確認・書き出しの区切りは U1 のまま。 -->

## NoticeBannerView

| 項目 | 内容 |
|------|------|
| 受け取るもの | storeStatus（ready・unreadable）、storageAvailable（真偽）、otherTabNotice（表示するかどうか）、onDismissOtherTab（「閉じる」の処理） |
| 自分で持つ状態 | なし（表示の有無は AppShell が持つ） |
| 呼ぶもの | なし |

表示の決まり（BR5.4）:

| 状態 | 出す知らせ |
|------|-----------|
| storeStatus が unreadable | 「保存データを読み込めませんでした。データは消していません。」と、止めている操作の説明（「登録・予算の保存・CSV の取り込みは、いまは使えません。」）。role="alert" |
| storageAvailable が偽 | 「このブラウザでは保存できません。登録などの操作をしても保存されません」。role="alert"（Q3 の回答の文言を、実際の動きに合わせて直したもの。レビュー R-01） |
| otherTabNotice が真（unreadable でないとき） | 「別のタブで変更がありました。最新の内容を読み込みました」と「閉じる」ボタン。role="status" |

止めている操作の説明に「予算の保存」と「CSV の取り込み」を含めるのは、詳細モックアップの文言どおりです。

AppShell が持つ otherTabNotice:

- externalChange を受け取ったら真にする。
- 「閉じる」か committed で偽にする。

## アクセシビリティ

- 知らせの領域は、ページを開いたときから空の状態で置いておき、中身を入れ替える（読み上げ機能が変化に気づくため）。
- alert と status を別の要素にする。
- 「閉じる」ボタンには「別のタブの変更の知らせを閉じる」という名前を付ける。押したら操作位置を「1 登録」の見出しへ移す。
- 色だけで種類を伝えない。見出しの文字（「保存データの問題」「別のタブの変更」）を付ける。
- 操作する要素に data-testid を付ける（notice-corrupt、notice-unavailable、notice-other-tab、notice-other-tab-close）。

## 見た目

- 詳細モックアップの見本（`assets/refined-mockup.html` の app-storage-corrupt、app-other-tab-changed）に合わせる。
- 見た目は CSS のファイルに書き、style 属性は使わない（CSP）。
- alert の枠は警告の色と太い左の線、status の枠は落ち着いた色にする。どちらもコントラスト 4.5:1 以上。
