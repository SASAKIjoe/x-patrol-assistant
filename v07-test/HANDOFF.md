# HANDOFF — SNS-WATCH-007

完成候補: V0.7 / SNS-WATCH-007-V07RC1

GitHub Pagesへ試験公開済み。公開実URLで起動・保存・復元の初回PC検証を完了しました。

公開URL: https://sasakijoe.github.io/x-patrol-assistant/v07-test/

公開元GitHub: https://github.com/SASAKIjoe/x-patrol-assistant/tree/main/v07-test

独立ブランチ: https://github.com/SASAKIjoe/x-patrol-assistant/tree/v07-test/v07-test

- 共有→収集BOX→一括登録→動画ウォッチ／交流候補を実装。
- チャンネルは手動登録。動画からの推測はなし。
- ジャンル管理・目標人数・朝夜巡回・履歴・旧版の非破壊コピー・原本保管・JSON統合復元。
- 無料静的配信、APIなし、外部ランタイム依存なし。
- 独立DB sns-watch-v07、SW swb07-shell-*、v07-test専用スコープ。
- mainへの追加は承認範囲の新規v07-test/20ファイルのみ。既存ファイルとPages設定は変更しません。

公開承認時のmain基準: commit `58bfec8763557c3cf392a2f8751a4bb89b0cf6c8` / tree `edd1debe74294aa149894c284b1f032cc2fdd7f6`。既存93ファイル・99エントリを基準に既存Git blobを照合します。

次はAndroid実機テスト結果を入力してください。公開承認は完了しています。 Android.md A01-A23で機種・OS・Chrome版・インストール名・各試験結果を記録します。Android実機は **NOT_TESTED**、officialPassはfalseです。

Evidence.jsonは文書生成時点の初回公開ランタイム・PC検証のスナップショットです。文書とSHA256の確定後に行う最終20ファイルの完全一致は、納品ZIP内 evidence/github-readback-final.json と evidence/pages-readback-final.json に記録します。自己参照を避けるため最終読戻し後は製品文書を再生成しません。

テスト再実行（納品ZIPを展開したルート）:

`node --test tests/core.test.mjs tests/service-worker.test.mjs tests/dependency-audit.test.mjs`

`node tests/browser.mjs`

`node tests/storage-browser.mjs`

公開操作テストでは環境変数 WATCH_URL=https://sasakijoe.github.io/x-patrol-assistant/v07-test/ を指定してbrowser.mjsを実行します。Playwrightの場所はWATCH_NODE_MODULES、ChromeはWATCH_CHROMEで設定できます。

HTTP403が発生した場合は原因を記録して停止し、別アカウントや別経路で再試行しません。
