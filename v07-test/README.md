# SNS WATCH BOX（仮）V0.7

WORK_DISPLAY_NAME: SNS-WATCH-007｜YouTube統合開発  
WORK_CODE: SNS-WATCH-007  
TASK_ID: SNS_WATCH_BOX_V07_YOUTUBE_INTEGRATION_V01  
試験公開URL: https://sasakijoe.github.io/x-patrol-assistant/v07-test/

**完成候補。Android実機は未検証のため、正式PASSではありません。** 公開・読戻しの実測結果は Evidence.json と RESULT.md を参照してください。

<!-- PUBLICATION_STATUS_START -->
公開状態: **DEPLOYED_VERIFIED_DESKTOP**

GitHub Pagesへ試験公開済み。公開実URLで起動・保存・復元の初回PC検証を完了しました。 mainの新規v07-test/20ファイルへの追加はユーザーの明示承認済みで、前回の承認待ちは解消しています。 既存ファイルとPages設定を変更しない範囲で公開します。

Android実機は **NOT_TESTED**、正式PASSではありません。初回公開検証は [Evidence.json](./Evidence.json) と [RESULT.md](./RESULT.md)、文書確定後の最終20ファイル照合は納品ZIP内のfinal読戻し記録を参照してください。
<!-- PUBLICATION_STATUS_END -->

## 使い方

1. Android Chromeでこの版を開いてインストールします。X・YouTubeの「共有」から「SNS WATCH BOX V0.7」を選びます。表示されない場合はURLをコピーして収集BOXに貼り付けます。
2. X投稿・プロフィール、YouTube動画・Shorts・個別ライブURLを続けて収集できます。動画IDとX投稿IDで重複排除します。共有本文は保存しません。
3. BOXでリンクとジャンルを選択し「選択を一括登録」。YouTubeは動画ウォッチ、Xは交流候補に振り分けます。投稿者名がないXリンクは公開投稿を確認して手入力します。
4. 動画の詳細からタイトル・チャンネル名・公開チャンネルURL・状態・メモ・複数ジャンルを編集できます。チャンネル情報は自動取得も推測もしません。手動登録したチャンネルを交流候補へ追加できます。
5. 「交流候補」ではXプロフィールまたはYouTubeチャンネルを手動登録できます。同一の正規化チャンネルURLを集約します。チャンネルID・別名・ハンドルが同一のチャンネルかはAPIなしでは判定しません。同じ人でもXとYouTubeは別候補です。
6. ジャンルを自由に追加・編集・削除できます。候補人数（X＋YouTube）と目標人数、動画件数を区別して表示します。削除しても候補・動画・履歴は残ります。
7. 巡回対象にチェックし、朝または夜の巡回を開始します。公開リンクを自分で開き、「確認を記録」で履歴を残します。動画や候補の削除後も履歴は残ります。
8. 「保存・設定」でJSONバックアップを保存します。復元はプレビュー後の統合です。同じIDでは現在の登録内容を優先し、未入力情報・ジャンル等を補います。復元前の原本も保存します。

## 保存・移行・復旧

ブラウザ内IndexedDB `sns-watch-v07` に保存。クラウド同期・外部データベース・アカウント登録はありません。タブ間はトランザクションで更新します。ブラウザデータを消すとV0.7内の移行前原本も消えるため、JSONを端末外へ保存してください。

初回のみ同じオリジン・ブラウザのV0.5 IndexedDBを読み取り専用で検証してコピーします。なければV0.5→V0.4→V0.3→V0.2のlocalStorageを確認します。元のDB・キーを更新せず、移行原本をV0.7内に保持します。V0.6は読書きしません。V0.6形式のバックアップは未対応です。別ブラウザ・端末では旧版のJSONを出力して読み込んでください。自動同期はしません。

壊れたデータは自動初期化せず読み込みを停止します。「生データを保存」で原本を確保し、有効なJSONを選択します。通常の統合ができない破損時は、内容と復旧の説明を確認して明示的に復旧します。旧版の保存領域はそのまま残ります。

上限は1回100リンク、BOX1万件、候補5000人、動画2万件、X投稿2万件、履歴5万件、ジャンル200件、データ/バックアップ10MB、移行原本100件です。原本を含む容量制限に達すると保存を中止します。バックアップを保管して記録を整理してください。

## API・プライバシー

X・YouTube API、スクレイピング、外部フォント、解析、認証、常時クリップボード監視は使いません。自動いいね・フォローも行いません。SNSページへは利用者がリンクを押した時に移動します。公開URLの存在や投稿者の実在は検証しません。名前・メモは利用者が入力したものだけを端末に保持します。認証情報や連絡先などの個人情報を入力する用途ではありません。

GitHub Pagesの静的配信に合わせ共有はGET形式です。初回や専用Service Workerが未制御の場合に共有クエリがホストへ送られる可能性があります。制御後はクエリなしのシェルを使用し、共有内容をキャッシュしません。保存成功後にアドレス欄からクエリを消しますが、既に届いたホストの記録を削除するものではありません。機密の文章を共有しないでください。共有タイトル・本文全体は保存しません。

Web Share Targetにはインストール済みPWAと対応Android環境が必要です。デスクトップでのクエリ試験はOS共有シートの実機検証ではありません。[Chrome公式仕様](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)。手順は [Android.md](./Android.md) を参照。

## 独立配信

V0.7のManifest ID・scope・起動・共有先・SWスコープは `/x-patrol-assistant/v07-test/`。キャッシュ名は `swb07-shell-*`。旧版のファイル・SW・キャッシュ・保存キーを変更しません。初回に旧ルートの広いSWがページを扱う場合がありますが、旧SWを解除せずV0.7専用SWへ制御が移るのを待ちます。

必須ランタイム12ファイルは `index.html`、`style.css`、`app.mjs`、`core.mjs`、`storage.mjs`、`legacy-v05.mjs`、`manifest.webmanifest`、`sw.js`、`icon.svg`、`icon192.png`、`icon512.png`、`maskable512.png`。外部ランタイム依存はありません。欠落時は不完全なSWを有効化しません。文書を含む配布物は20ファイルで、SHA256.txtには自身を除く19ファイルの指紋を記録します。納品ZIP内の `evidence/release-files.json` にはSHA256.txtも含め全20ファイルを記録します。

GitHub Pagesは既存mainを配信しているため、新規 `v07-test/` だけを追加して公開します。独立ブランチ `v07-test` にも同じ候補を置きます。mainの既存ファイルはGit blobで変更なしを照合します。

公開基準はユーザー承認後に取得したmainです。基準commit・treeと既存ファイル数は [Evidence.json](./Evidence.json) のbaselineおよび納品ZIP内 `evidence/deploy.json`、`evidence/approved-baseline-tree.json` に記録します。以前の公開前HTTP404・承認拒否は履歴として保持し、現在の公開可否の判定には使いません。

## 検証と引継ぎ

ローカル自動テスト・ブラウザ操作・移行試験の生ログは納品ZIPの `evidence/`、再実行スクリプトは `tests/`。Node.jsとPlaywright/Chromeで実行します。合成テストデータのみを使用し、実際のSNSページやユーザーの保存データは収集しません。

Evidence.jsonは文書生成時点の初回公開ランタイム・PCブラウザ検証のスナップショットです。文書とSHA256を確定して公開後、全20ファイルの最終一致を `evidence/github-readback-final.json` と `evidence/pages-readback-final.json` に記録します。文書の自己参照チェックサムを避けるため、最終読戻し後は製品文書を再生成しません。公開PC検証が通っても、Android.md A01–A23が実機で確認されるまで正式PASSにしません。

実測結果: [Evidence.json](./Evidence.json) · [Logs.txt](./Logs.txt) · [RESULT.md](./RESULT.md) · [HANDOFF.md](./HANDOFF.md) · [NEXT_INPUT.md](./NEXT_INPUT.md)
