# ブログ機能の設定

ブログ一覧・記事ページは `/api/blog` を経由してmicroCMSから公開済み記事を読み込みます。APIキーはVercelのサーバー環境変数だけで使うため、閲覧者のブラウザーには公開されません。読み取り用と投稿用のAPIキーは分けてください。

## microCMSのAPI設定

microCMSのサービスドメインは `kinomidesignblog`、APIエンドポイントIDは `blog` です。APIは「リスト形式」で作成し、フィールドは次のIDで用意してください。

| フィールドID | 種類 | 必須 | 用途 |
| --- | --- | --- | --- |
| `title` | テキスト | はい | 記事タイトル |
| `body` | リッチエディタ | はい | 記事本文 |
| `summary` | テキストエリア | いいえ | 一覧の概要文 |
| `category` | テキスト | いいえ | カテゴリ |
| `eyecatch` | 画像 | いいえ | アイキャッチ画像 |

microCMSのAPI設定で、公開記事をGETできる読み取り専用APIキーを発行してください。書き込み権限は付けないでください。

## Vercelの設定（サイト表示用）

Vercelの対象プロジェクトを開き、Settings → Environment Variables で次の変数を追加します。

| 名前 | 値 |
| --- | --- |
| `MICROCMS_READ_API_KEY` | microCMSで発行した読み取り専用APIキー |

Production（必要であれば Preview も）に適用し、Save後にDeploymentsから最新デプロイを再実行してください。値をGitHub、コード、チャット、スクリーンショットへ貼らないでください。

## 記事一覧・詳細ページ

- 一覧: `/blog/`
- 詳細: `/blog/article.html?id=記事ID`

公開済み記事を新着順に表示し、9件ずつページ送りします。記事本文は安全のため、対応タグを限定して表示します。

## Node.jsから記事を作成する

Node.js 18以降を使います。リポジトリ直下の `.env.example` を `.env` にコピーし、サービスID、`blog` エンドポイント、書き込み権限のAPIキーを設定してください。`.env` はGit管理対象外です。書き込みキーはブラウザー用コードや記事JSONに書かないでください。

記事JSONを作成します。本文はHTMLで指定でき、画像はHTTPSの画像URLを使えます。

```json
{
  "title": "ブランドの魅力を伝えるホームページの考え方",
  "body": "<p>ホームページを作る前に、まず届けたい相手と伝えたい魅力を整理してみましょう。</p><h2>伝える順番を整える</h2><p>お客様の悩み、事業の強み、相談方法の順に伝えると、必要な情報が届きやすくなります。</p>",
  "summary": "ホームページで事業の魅力を伝えるために、制作前に整理したいポイントを紹介します。",
  "category": "ブランドづくり"
}
```

下書き作成（既定）:

```sh
node scripts/create-blog-post.mjs path/to/article.json
```

内容を確認して公開する場合だけ `--publish` を明示します。microCMSに登録済みの公開記事は、その場でサイトに表示されます。

```sh
node scripts/create-blog-post.mjs path/to/article.json --publish
```

`eyecatch` など追加フィールドを使う場合は、microCMS側に同じフィールドIDを作成し、記事JSONへ値を追加してください。APIが受け付ける値の形式はフィールドの種類に従います。
