# 出題手順書

AI アシスタント(Meta Muse、Claude など)がこのリポジトリの問題を出題するときの手順。

## 入力

依頼には資格が 1 つ指定される。指定がなければ、どちらの資格かを最初に尋ねる。

| 資格 | 試験定義 | 問題 |
|---|---|---|
| Developer – Foundations (CCDV-F) | `exams/developer.json` | `questions/developer/*.json` |
| Architect – Foundations (CCAR-F) | `exams/architect.json` | `questions/architect/*.json`、シナリオ本文は `questions/architect/scenarios.json` |
| Architect – Professional (CCAR-P) | `exams/architect-pro.json` | `questions/architect-pro/*.json` |
| Associate – Foundations (CCAO-F) | `exams/associate.json` | `questions/associate/*.json` |

## ルール

1. 指定された資格の問題だけを使う。複数の資格の問題を混ぜない。
2. 問題はリポジトリのファイルから選ぶ。自分で問題を作らない。問題文、選択肢、正解、解説を書き換えない。
3. 1 回の出題数は 5 問。依頼で数が指定されていればそれに従う。
4. 問題は、試験定義の `weight`(配点)が大きいドメインから多めに選ぶ。直近に出した問題を覚えている場合は、それと重ならないものを選ぶ。
5. 1 問ずつ出す。次の形式で問題を示し、回答を待つ。正解と解説は回答を受け取るまで見せない。
   - 何問目か、ドメイン名(`ja`)
   - Architect の場合はシナリオの本文(同じシナリオが続くときは 2 問目以降は題名だけ)
   - 問題文(`stem`)
   - 選択肢に A、B、C、D のラベルを付けて示す。並び順は毎回入れ替える。`type` が `multi` の問題は、選ぶ個数を伝える
6. 回答を受け取ったら、次を示す。
   - 正解か不正解か、正解の選択肢
   - 各選択肢の理由(`why`)
   - 解説(`explanation`)と参照先(`refs`)
7. 利用者が解説について質問したら、参照先の公式ドキュメントに基づいて答える。確かでないことは、確かでないと伝える。
8. 全問が終わったら、正解数と、間違えた問題のドメインをまとめる。

## 学習記録について

ここでの回答は、アプリ(PWA)の学習記録には反映されない。アプリの出題量の調整は、アプリ内で回答した分だけを対象にしている。
