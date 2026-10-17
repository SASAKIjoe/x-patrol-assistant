# RESULT — SNS-WATCH-007

判定: **HOLD_ANDROID_PHYSICAL**

GitHub Pagesへ試験公開済み。公開実URLで起動・保存・復元の初回PC検証を完了しました。 Android実機は未検証のため正式PASSにしません。

試験URL: https://sasakijoe.github.io/x-patrol-assistant/v07-test/

| 項目 | 結果 |
| --- | --- |
| ローカル自動試験 | PASS 31/31 |
| ローカルChrome操作 | PASS 15/15 |
| 実ブラウザ保存・移行・復旧 | PASS_REAL_CHROME_STORAGE |
| 公開状態 | DEPLOYED_VERIFIED_DESKTOP |
| GitHub読戻し（生成時点） | PASS（20ファイルSHA256一致） |
| Pages HTTP/SHA256（生成時点） | PASS |
| Pages実URL操作 | PASS_DESKTOP_ONLY |
| 最終20ファイル照合 | 製品文書確定後のfinal読戻し記録を参照 |
| Android実機 | NOT_TESTED（正式PASS前） |

公開承認時のmain基準: commit `58bfec8763557c3cf392a2f8751a4bb89b0cf6c8` / tree `edd1debe74294aa149894c284b1f032cc2fdd7f6`。既存93ファイル・99エントリを基準に既存Git blobを照合します。

新規v07-test/20ファイルのみを公開対象とし、V0.5・V0.6および既存ファイルは変更しません。mainの新規v07-test/20ファイルへの追加はユーザーの明示承認済みで、前回の承認待ちは解消しています。

Evidence.jsonは文書生成時点の初回公開ランタイム・PC検証のスナップショットです。文書とSHA256の確定後に行う最終20ファイルの完全一致は、納品ZIP内 evidence/github-readback-final.json と evidence/pages-readback-final.json に記録します。自己参照を避けるため最終読戻し後は製品文書を再生成しません。

[Evidence.json](./Evidence.json) / [SHA256.txt](./SHA256.txt) / [Logs.txt](./Logs.txt)
