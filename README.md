# Claude 資格対策

Claude の認定資格 Developer – Foundations (CCDV-F)、Architect – Foundations (CCAR-F)、Architect – Professional (CCAR-P)、Associate – Foundations (CCAO-F) の学習用アプリと問題バンク。

アプリ: https://k8kimura-gif.github.io/claude-cert-questions/

iPhone では Safari で開き、共有メニューから「ホーム画面に追加」する。

## できること

- 資格の切り替え(問題、成績、模試履歴は資格ごとに別管理)
- 今日の問題: 試験日までに全問を一巡できる量を毎日出題する。直近の確信あり正答の割合で量を増減する
- ひたすら解く: 「確信あり」か「迷った」で回答すると、すぐに解説が出る。ドメインで絞り込める
- 復習: 間違えた問題、迷って正解した問題、復習の期限が来た問題。確信して間違えた問題を最初に出す
- 模擬試験: 本番と同じ問題数、制限時間、ドメイン比率。終了まで正誤は出ない
- 成績: ドメイン別の正答率、確信度の内訳(迷って正解、確信ありで不正解)、日別の記録、模試の履歴

## 構成

| パス | 内容 |
|---|---|
| `index.html` `app.js` `styles.css` `sw.js` | アプリ本体。ビルド不要の静的ファイル |
| `exams/*.json` | 試験定義(ドメイン、配点、問題数、制限時間、試験日の初期値) |
| `questions/<資格>/<ドメイン>.json` | 問題バンク |
| `scripts/validate.mjs` | 問題バンクの検証 |
| `docs/design.md` | 設計 |
| `docs/quiz-prompt.md` | AI アシスタントに出題させるときの手順書 |
| `docs/muse-setup.md` | Meta Muse の定期出題の設定手順 |

## 開発

```bash
python3 -m http.server 8765
```

```bash
node scripts/validate.mjs
```

選択肢の長さから正解を推測できないかは、次で測れる。

```bash
node scripts/length-bias.mjs
```

main に push すると、検証を通ったものが GitHub Pages に公開される。

## 問題について

問題は公式の試験ガイドのドメインと公式ドキュメントをもとに自作したもので、実際の試験問題ではない。Anthropic の公認教材でもない。仕様の変更で内容が古くなることがあるため、各問題の参照先で最新の内容を確認すること。
