# 過去に実際に間違えた箇所

2026 年 11 月の検証で見つかった誤りと、その時点のドキュメントの記述。仕様は変わるので、ここに書いた内容も問題に使う前に本文で確かめる。この一覧は「どこを疑うべきか」の手がかりであって、正解の出典ではない。

## 名前や役割を取り違えたもの

| 話題 | 誤って書いたこと | ドキュメントの記述(2026-11) |
|---|---|---|
| スキルの `allowed-tools` | 使えるツールを制限する | 列挙したツールを事前に許可する。制限は `disallowed-tools` |
| CLI の `--allowedTools` | CI で使えるツールを絞る | 事前に許可するだけ。絞るのは `--tools` や deny ルール |
| サブエージェントを起動するツール | `Task` | `Agent`(以前の名前が `Task`) |
| MCP の接続開始 | `initialize` で始める | 現行の仕様(2026-07-28)はステートレスで `server/discover`。古い仕様が `initialize`。問題では両方に触れる |
| MCP の通知 | サーバーが任意に送る | 購読した対象について届く |
| `strict: true` の条件 | 必須フィールドの指定 | `additionalProperties: false` |

## 一律に言い切ったが、モデルや版によって違うもの

- プロンプトキャッシュの読み出しの倍率は、モデルによって異なる。
- `tool_choice` の `any` / `tool` による強制は、最新のモデルでは受け付けられないものがある。
- `stop_reason` の一覧は増えている(`model_context_window_exceeded` など)。「次の 4 つ」のような閉じた書き方をしない。

## 出典にないことを書いたもの

- 「ツールは 4〜5 個なら安定する」という数字。出典の記事に数字はない。
- 「長い入力の中ほどは抜けやすい」。公式ドキュメントにはない。書くなら広く知られた傾向として書き、公式が勧める配置(長い文書を先頭に、質問を末尾に)を併記する。
- 冪等性の問題に、その話題を扱っていない記事を参照として付けていた。一般的な設計の定石を問うなら、そう明記して無関係な参照を外す。
- 「まとめて 1 つのツールにする」を誤答にしていたが、出典の記事は統合を勧めている場面がある。出典が推奨する手法を誤答にしない。

## ページが動いたもの

- Claude Code のベストプラクティスは `https://code.claude.com/docs/en/best-practices` に移り、内容も書き直された。以前の記事にあった「テストを先に書く」「別のセッションにレビューさせる」は、現在のページでは同じ形で確認できない。関連する問題は残してあるが、裏付けは弱い。

## 作業上のつまずき

- macOS の `grep` は、行の長いファイルに `.{0,N}` を含む正規表現をかけると何も返さないことがある。`scripts/check-claims.mjs` を使う。
- ページのキーを短く指定すると別のページに一致する(`best_practices` が API キーの記事に当たった)。`check-claims.mjs` は複数に一致すると止まるので、キーを長くする。
- 試験の問題数や配点は第三者のサイトが出典で、Architect は未確認の値を含む。`exams/*.json` を変えるときは出典を確かめる。

## Architect – Professional の検証で見つかったもの(2026-11)

- 誤答を伸ばすときに、新しい文を置き換えずに元の文の後ろへ句点なしで連結してしまい、同じ意味の文が二重になった選択肢が 43 個あった。書き換えたら、文末が「。」で終わっているか、同じ内容を繰り返していないかを確かめる。直すと長さの偏りが戻るので、`length-bias.mjs` で測り直す。
- 問題文で「基本策」と言いながら、正解に高度な手法(外部知識の制限)を含めていた。出典が手法をどの区分に置いているかまで合わせる。
- `budget_tokens` を変えたとき、ツールやシステムプロンプトの階層のキャッシュが外れるかは「ブレークポイントの位置」ではなく「モデルが設定をプロンプトのどこに反映するか」で決まる。
- キャッシュ読み出しの倍率は、Opus 5.5 と Sonnet 5.5 が 0.05 倍、Fable 5.2 などが 0.025 倍。倍率を問うときは、標準の 0.1 倍が当てはまるモデルを問題文で指定する。
- 選択肢の `why` が別の選択肢の説明のまま残っていた(arp-dev-006 の c)。選択肢を差し替えたら `why` も合わせて直す。

## Associate – Foundations の作問で見つかったもの(2026-11)

- 出典は主にヘルプセンター(`support.claude.com`)と Privacy Center(`privacy.claude.com`)。HTML から文字を抜き出したページは、ナビゲーションの文字列が混ざるので、照合の正規表現は本文の言い回しに合わせて長めに書く。
- モデル選択画面から外れたモデル(Haiku 4.5 など)を問題文に使っていた。学習データの期限など、モデルごとの事実を問うときは現行のモデルを使い、ページの表で値を確かめる。
- 現行の多くのモデルは、Claude アプリで思考(thinking)をオフにできない。「不要なら拡張思考をオフにする」を前提にした文を書かない。
- UI の設定名を、本文にない日本語訳で書いた(「アカウントのメモリを使う」)。別の問題の表記ともずれた。設定名は本文の英語表記のまま書く。
- 解説の締めに、出典にない一言を足していた(「意図的にできないようになっている」「〜に特化している」「回答は誤りを含みうる」など)。出典にない設計意図や性格づけは書かない。
- 誤答の `why` で「〜は戻らない。出典にもそうした記述はない」のように、断定したあとで出典がないことにも触れ、自己矛盾していた。根拠がないなら「出典に〜という記述はない」とだけ書く。

## トピック付けの試作で見つかったもの(2026-11-20)

- `platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use` は `define-tools` に転送される。結果の返し方は `handle-tool-calls`、並列呼び出しは `parallel-tool-use`、strict は `strict-tool-use` に分かれた。参照先は内容に合うページに付け替える。
- `www.anthropic.com/engineering/writing-tools-for-agents` は `www.anthropic.com/research/writing-tools-for-agents` に移った。
- 並列ツール呼び出しで「アプリケーションは並行して実行する」と書いていた。実行の順番はアプリケーションが選ぶもので、API は決めない。結果を 1 つの user メッセージにまとめて返すことが要点。
- `disable_parallel_tool_use` は `tool_choice` オブジェクトの中に書く。トップレベルのパラメータではない。
- 記憶の Pause memory は「新しい記憶が作られなくなるだけ」ではなく、記憶の利用も止める。
- Define tools は「不透明な内部参照ではなく、意味のある安定した識別子(slug や UUID)」を返すよう勧めている一方、記事 Writing effective tools for agents は uuid のような低水準の識別子を避けるよう勧めている。UUID について書くときは、どちらの出典の主張かを明示する。

## CCAO-F・CCDV-F の全問トピック付けで見つかったもの(2026-11-21)

移転したページ(参照先は移転先に付け替えた。CCAR-F と CCAR-P の問題には古い URL が残っている。転送されるので開けるが、内容が統合されて該当の記述が消えていることがある):

- プロンプトの個別ページ(`prompt-engineering/use-xml-tags`、`multishot-prompting`、`long-context-tips`、`system-prompts`、`be-clear-and-direct`、`chain-of-thought`、`chain-prompts`、`prompt-templates-and-variables`)は `prompt-engineering/claude-prompting-best-practices` に統合された。旧ページにあった言い回し(「各段階に注意を集中できる」など)は新しいページにないことがある。
- `about-claude/models/overview` → `models/overview`。`claude-on-vertex-ai` → `claude-models-on-google-cloud/google-managed`(ドキュメントの呼び名も「Vertex AI」ではなくなった)。
- `www.anthropic.com/engineering/*` の記事はすべて `www.anthropic.com/research/*` に移った。
- `test-and-evaluate/define-success` と `eval-tool` は `develop-tests` に転送される。

現在の仕様と食い違っていたもの(問題文・選択肢を直した):

- Cowork のクラウドのセッションが PC の接続済みフォルダを読み書きできるのは、デスクトップアプリが開いていて、かつセッションをデスクトップで始めたか予定タスクの場合だけ。「スマートフォンから始めたタスクでも、アプリが開いていれば使える」は誤り(asc-prod-025)。
- Managed Agents の実行環境は、既定は Anthropic のクラウドのサンドボックスだが、セルフホストのサンドボックスも選べる。「両方を Anthropic が運用する」と言い切らない(dev-agent-026)。
- 手動の chain-of-thought(`<thinking>` タグに推論を書かせる)は、思考がオフのときの代替。Fable 5.x、Opus 5.5、Opus 5、Sonnet 5.5 では思考に任せるよう勧められ、推論をタグで書かせるプロンプトは `reasoning_extraction` で断られることがある(dev-prompt-009)。
- Messages API の文書に「最初のメッセージは user でなければならない」という規則はない。書かれているのは、user と assistant が交互に並ぶターンで訓練されていることと、連続する同じロールは 1 ターンに結合されること(dev-app-019)。
- Claude Code の `-p` は、ドキュメントでは「非対話モード(non-interactive mode)」と呼ぶ。「ヘッドレスモード」は URL に残っているだけ(dev-cc-002)。
- アーティファクトの共有で「閲覧者はチャットの添付ファイルにもアクセスできる」という注意は、旧来のアーティファクト(「Share & copy link」)の節にある(asc-eval-041)。
- `temperature` などのサンプリング引数は、Claude 4.7 以降のモデルでは既定以外の値で 400 になり、API バージョン 2026-10-21 で削除された。
- プロンプトキャッシュの読み出しの倍率はモデルで異なる(多くは 0.1 倍、Opus 5.5 と Sonnet 5.5 は 0.05 倍、Fable 5.2 などは 0.025 倍)。

並行作業でつまずいたもの:

- 担当ごとに作ったトピックの ID が 27 件衝突し、ID は違うが同じ話題のものもできた(`claude-code-memory` と `claude-md` など)。`apply-topics.mjs` は同じ ID を黙って置き換えるので、統合してから適用する。
- 統合の差分を担当ごとの差分より先に適用すると、統合版が上書きされて消える。
- 照合ファイルのページのキーが複数のファイルに一致して止まることが多かった(MCP の仕様のページなど)。キーを長くする。

裏付けが弱いまま残したもの(正解は変えていない。次に見直すときの候補):

- dev-app-028: モデル ID の綴り誤りで 404 が返るという個別の記述がない。
- dev-app-062: 冪等性は公式ドキュメントにない。解説では一般的な設計の定石と明記した。
- dev-sec-009、dev-sec-011: 一般的な安全対策として解説した。
- dev-agent-015、025、027: 出典の記述との対応が弱い。
- dev-app-039 の d、dev-app-046 の b: 誤答として弱い。
- asc-eval-027: Sonnet 4.6 がまだモデル選択の画面にあるかは確かめていない。
- Team プランのページは 200K のコンテキストと書いており、コンテキストウィンドウの記事と食い違う。どちらかを問う問題を作るときは両方のページを確かめる。

## CCAR-F の全問トピック付けで見つかったもの(2026-11-21)

担当を直列に回し、前の担当の `topics/architect.json` を次の担当が読んでから作業した。直列にすると ID の衝突は起きず、統合の工程が要らなかった。ただし developer と同じ ID のトピックを CCAR-F 向けに作り直したもの(`compaction`、`multi-agent-systems`、`claude-code-subagents`、`claude-code-hooks`、`claude-md` など)は、developer 版をコピーして上書きしないよう、指示書で毎回伝えた。

現在の仕様と食い違っていたもの(問題文・選択肢を直した):

- 「長いプロンプトの中ほどが見落とされやすい」は公式資料にない。公式の長文の配置は、長い資料を上部に、質問と指示を末尾に置く(テストで最大 30% 改善)、複数の文書は `<document>` で囲み `<source>` などのサブタグを付ける(arch-ctx-009、arch-ctx-023)。
- few-shot の例の数の目安は、Prompting best practices で 3〜5 件(arch-prompt-002)。
- Edit の置換で `old_string` が一意でないときは、前後を含めて一意にするか `replace_all: true`。部分的な変更に Write を使わない(arch-tool-020)。
- 個人用・実験的な MCP サーバーは、既定の local スコープが勧められる。user スコープは複数のプロジェクトで使うもの向け(arch-tool-023)。
- Claude Code と Agent SDK では tool search が既定で有効で、開始時に読み込むのはツール名とサーバーの指示だけ(arch-tool-026)。
- Message Batches の 1 件の中でも、サーバーツール(web search など)のループは回る。往復が要るのはクライアントツール(arch-tool-035)。

あとから直したもの(2026-11-21):

- arch-prompt-032: Structured outputs は文字列の `format`(`date` など)と `pattern` に対応するので、「スキーマをさらに厳密にする」は誤答として成り立たなかった。表記に効かない変更(required に加える)に差し替えた。`format: "date"` で出力の表記がどう強制されるかはページに書かれていない。
- arch-agent-026: Agent SDK の `allowedTools` は事前承認で、使えるツールを絞らない。Agent は確認なしで動くツール。
- arch-cc-013: 読み込まれた CLAUDE.md やルールの確認は `/context`(`/context all`)。`/memory` は場所の一覧と編集用。
- arch-cc-037: プロジェクトの `.claude/settings.json` の `permissions.allow` は workspace trust を受け入れた後にだけ使われ、`claude -p` と SDK は trust のダイアログを出さない。信頼していないフォルダでは deny と ask だけが効く。正解は `--settings`(GitHub Actions では `settings` 入力)にした。`--settings` の allow が trust を経ずに効くという直接の記述はなく、GitHub Actions のページの記述に基づく。
- arch-cc-026: Best practices の「What you can stop doing」は「CLAUDE.md に構成とファイル配置を書く」を古い助言とする。一方 Memory のページは project layout を書く例に残しており、2 ページが食い違う。

ほかに覚えておくこと:

- Claude Code の Best practices の「What you can stop doing」には、もう不要とされた助言が並ぶ(コンテキストを守るためにサブエージェントを使う、など)。古い助言を正解の根拠にしない。
- `slash-commands` のページは転送されるだけなので、refs から外す。
- 強制のツール指定(`tool_choice` の `any` と `tool`)は、Opus 5.5、Sonnet 5.5、Fable 5.2 などで 400 エラーになる。
- 記事の本文は空白が連続するので、照合の正規表現は語の間を `\s+` でつなぐ。
