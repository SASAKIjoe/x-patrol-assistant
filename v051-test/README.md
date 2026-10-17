# X-PATROL-051 / V0.51 独立試験版

WORK_DISPLAY_NAME: X-PATROL-051｜コンパクト一覧・巡回更新・スクロール復帰

TASK_ID: X_PATROL_V051_COMPACT_CANDIDATE_LIST_AND_RETURN_POSITION_V01

原本: SASAKIjoe/x-patrol-assistant の v05-test、commit a52cf832f02f4d71a94e909b6c7af016f7eee608。

## 使う順序

1. 今までのV0.5の「保存・設定」からJSONバックアップを端末へ保存する。
2. 同じAndroid Chromeの通常モードでV0.51の試験URLを開く。共有先へ追加する場合はV0.51を別アプリとしてインストールする。
3. 「交流候補」で2行の一覧を使う。行をタップすると詳細、Xへのリンク、メモ、状態、削除、確認記録が開く。
4. 「更新」で端末の確認記録から要確認を再計算する。Xの新規投稿を取得する機能ではない。新着は常に未判定。
5. 下の候補からXを開いて戻り、同じ候補に復帰するかを確認する。Android実機の最終判定は HANDOFF.md の1件にまとめる。

## データの扱い

V0.51は専用IndexedDB `xpatrol-v051-test` を使用する。同じブラウザ・同じオリジンにV0.5の有効なデータがあれば、初回に読み取り専用でコピーする。コピー後の同期や旧版への書き戻しは行わない。旧版のDBが存在することを安全に確認できない環境では、旧版から保存したJSONを「保存・設定」で復元する。別ブラウザ、プライベートモード、別端末には自動移行できない。

JSONデータ形式は互換性のためversion 5を保持する。復元はプレビュー後の明示操作でV0.51の保存領域を置き換える。元データ保存と初期化の対象もV0.51のみ。定期バックアップを続ける。

画面状態はタブ単位のsessionStorageへ保存する。選択タブ、絞り込み、並び順、展開行、候補IDと行内オフセット・scrollYを再現する。端末がアプリを強制終了してセッション自体を消した場合や保存禁止の場合は保証できない。旧版に戻って作業を続けても旧版のデータは維持される。

## 要確認と並び順

未確認・確認時刻不明・最終確認から12時間経過した候補を要確認として扱う。時刻のない旧記録から時刻を推測しない。「最近登録」は最初の保存投稿のaddedAtを使い、日時がない場合は元の登録順を補助にする。新着投稿の有無・オンライン状態は取得しない。X API、有料サービス、自動収集、スクレイピング、自動いいね、常時監視を使わない。将来の公式API接続案だけを evidence/API_OPTIONS.md に記載。

## PWAと共有

manifestのid/scope/start_url/share_targetは `/x-patrol-assistant/v051-test/` に独立。SWは同階層だけを扱い、`xp051-shell-` の古い自分のキャッシュのみ削除する。旧版や並行版のSW登録・キャッシュ・ソースを変更しない。

共有はGET形式で、初回に共有文面が静的ホストへ届く可能性がある。旧ルートSWが初回を制御している場合、その旧SWの広いキャッシュ挙動も残る。受信後はURLから共有パラメータを除去し、正規化した投稿URLだけを保存する。V0.51のSWは共有クエリをキャッシュしない。既存SWを削除して解決する操作はしない。

Xリンクは通常の別タブリンク（noopener/noreferrer）で開く。AndroidでXアプリに切り替わるかは端末設定による。リンクの長押し・ユーザーのタブ選択を妨げない。Xを開いたことだけでは確認済みにしない。

## 検証と再実行

tests/ にデータルール、保存分離、SW、依存関係、既存操作の回帰、150候補のAndroid幅ブラウザ検証を収録。evidence/ が今回の結果。RESULT.md の状態を正とし、Android実機未確認を正式PASSと扱わない。

Node.js 22以上、Playwright、Chromeが必要。tests内の実行環境パスは当作業環境の値なので、再実行環境に合わせて調整する。原本比較用repo/はピン留めした参照であり、編集しない。

```text
node --test tests/core.test.mjs tests/storage*.mjs tests/service-worker.test.mjs tests/dependency-audit.test.mjs
node tests/regression.mjs
node tests/compact-browser.mjs
```

完全ZIPのSHA256は同梱内容のSHA256SUMS.txtおよび隣接するZIP.sha256を参照。元のV0.2〜V0.5とV0.6/V0.7の変更は含めない。
