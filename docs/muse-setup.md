# Meta Muse で定期出題する設定

Muse の画面や名称は確認できていない部分がある。実際の画面に合わせて読み替えること。

## 1. リポジトリを読めるようにする

リポジトリは公開されているので、GitHub を接続しなくても次の URL から読める。

- 出題手順書: https://raw.githubusercontent.com/k8kimura-gif/claude-cert-questions/main/docs/quiz-prompt.md
- リポジトリ: https://github.com/k8kimura-gif/claude-cert-questions

Muse が URL を読めない場合は、Muse の設定のコネクタから GitHub を接続し、このリポジトリへの読み取りだけを許可する。書き込みの権限は与えない。

## 2. 定期タスクを 2 つ登録する

資格ごとに 1 つずつ登録する。時刻は例。

**Developer(毎日 7:30)**

```
GitHub リポジトリ k8kimura-gif/claude-cert-questions の docs/quiz-prompt.md を読み、その手順に従って Developer – Foundations (CCDV-F) の問題を 5 問出題してください。
```

**Architect(毎日 12:30)**

```
GitHub リポジトリ k8kimura-gif/claude-cert-questions の docs/quiz-prompt.md を読み、その手順に従って Architect – Foundations (CCAR-F) の問題を 5 問出題してください。
```

## 3. 動作を確かめる

登録の前に、同じ文面を通常のチャットで 1 回送り、次の点を確認する。

- リポジトリの問題がそのまま出題される(Muse が自作した問題ではない)
- 回答するまで正解が表示されない
- 指定した資格の問題だけが出る

うまく動かない場合は、Claude のスケジュール実行に切り替える。同じ文面をそのまま使える。
