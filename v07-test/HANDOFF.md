# HANDOFF — SNS-WATCH-007

完成候補: V0.7 / SNS-WATCH-007-V07RC1

公開URL: https://sasakijoe.github.io/x-patrol-assistant/v07-test/

GitHub: https://github.com/SASAKIjoe/x-patrol-assistant/tree/v07-test/v07-test

- 共有→収集BOX→一括登録→動画ウォッチ／交流候補の流れを実装。
- チャンネルは手動登録。動画からの推測はなし。
- ジャンル管理・目標人数・朝夜巡回・履歴・旧版の非破壊コピー・原本保管・JSON統合復元。
- 無料静的配信、APIなし、外部ランタイム依存なし。
- 独立DB sns-watch-v07、SW swb07-shell-*、v07-test専用スコープ。
- mainへの追加はPages公開用の新規v07-test/のみ。既存ファイルはGit blobで照合。

残作業は [Android.md](./Android.md) A01-A23 の実機確認。機種・OS・Chrome版・インストール名・各試験結果を記録してください。実機結果が届くまで正式PASSに更新しません。

テスト再実行（納品ZIPを展開したルート）:

`node --test tests/core.test.mjs tests/service-worker.test.mjs tests/dependency-audit.test.mjs`

`node tests/browser.mjs`

`node tests/storage-browser.mjs`

公開操作は環境変数 WATCH_URL=https://sasakijoe.github.io/x-patrol-assistant/v07-test/ を指定してbrowser.mjsを実行。Playwrightの場所はWATCH_NODE_MODULES、ChromeはWATCH_CHROMEで設定できます。

HTTP403が発生した場合は原因を記録して停止し、別アカウントや別経路で再試行しません。
