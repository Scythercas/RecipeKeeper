# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (および Claude) 向けのガイドです。

## プロジェクト概要

RecipeKeeper は SwiftUI + SwiftData 製の iOS レシピ管理アプリ。サーバーは持たず、データはすべて端末内(SwiftData)に保存する。唯一の外部通信は「AIレシピ生成」機能で、Anthropic API に直接リクエストする。

主な機能:
- レシピ登録(参考サイトURL、手書きレシピ写真、完成写真)
- ジャンル/食材でのフィルタ・全文検索
- 「作った！」ボタンでの調理回数記録 + 工夫メモの履歴
- 手元の食材と常備調味料からAIがレシピを1件提案(そのまま保存可能)

詳しいセットアップ・デプロイ手順は [README.md](README.md) を参照。

## 開発環境に関する重要な制約

- **開発者はMac実機を持っていない。** Xcodeでのビルド・実行は、AWS EC2 Macインスタンス(リモートのMac mini実機)にVNCで接続して行う([README.md](README.md) の「1. 環境構築」参照)。コード変更を提案するときは、ユーザーが毎回EC2 Macを起動してビルド確認するコストが小さくないことを踏まえ、可能な限り一度の変更で完結させる。
- **このリポジトリを直接操作している Claude Code (このエージェント) はWindows環境で動作しており、Swiftコードのビルド・実行は行えない。** Xcode/シミュレータでの動作確認はユーザー側(EC2 Mac + VNC)でのみ可能。コード変更後に「ビルドが通ることを確認しました」のような主張はしないこと。構文・型の妥当性は目視で確認し、実際の動作確認が必要な変更ではその旨をユーザーに伝える。
- **実機(iPhone)へのインストールはUSB接続ができない。** EC2 Macは物理USBポートにアクセスできないため、実機テストは基本的に TestFlight 経由(Apple Developer Program加入が前提)になる([README.md](README.md) の「3. 実機へのデプロイ」参照)。「USBでつないで⌘R」という前提の手順は提案しない。
- EC2 Macの Dedicated Host は最低24時間の課金が確定するため、ユーザーがEC2 Macを都度気軽に起動するとは限らない。複数の細かい確認を要する変更よりも、まとめて検証できる変更を優先する。

## アーキテクチャ

```
RecipeKeeper/
├── RecipeKeeperApp.swift   エントリポイント。TabView(レシピ / AIで作る / 設定)+ modelContainer
├── Models.swift            SwiftDataモデル。Recipe(レシピ本体)と CookLog(調理記録、1回ごとに1件)
├── RecipeListView.swift    一覧・検索・ジャンル/食材フィルタ・並び替え
├── RecipeDetailView.swift  詳細表示・「作った！」記録・工夫メモ履歴
├── RecipeEditView.swift    新規作成/編集フォーム・写真添付(PhotosPicker + カメラ)
├── AIGenerateView.swift    食材入力 → ClaudeService呼び出し → 生成結果のプレビューと保存
├── ClaudeService.swift     Anthropic Messages APIの直呼び出し(SDK不使用)+ Keychainヘルパー
└── SettingsView.swift      常備調味料の登録・Anthropic APIキーの保存/削除
```

### データモデル(Models.swift)

- `Recipe`: title / genre / sourceURL / ingredients / seasonings / steps / memo / isAIGenerated / createdAt に加え、写真は `dishPhotos` (完成写真) と `handwrittenPhotos` (手書きレシピ) を `@Attribute(.externalStorage)` で保持(DBファイル肥大化防止)。`cookCount` / `lastCooked` は `cookLogs` から算出する計算プロパティ。
- `CookLog`: `Recipe` に `.cascade` で従属する調理記録1件。`date` と `tweak`(工夫メモ)を持つ。
- `Genre` は `String` rawValue の enum だが、`Recipe.genre` は自由文字列としても保存されるため、enumにない値も許容される(AI生成結果や過去データとの互換性のため)。

### AI生成(ClaudeService.swift)

- `URLSession` で `https://api.anthropic.com/v1/messages` を直接叩く実装(公式SDKは使っていない)。
- リクエストボディの `model` は現在 `"claude-sonnet-4-6"` にハードコードされている。**Anthropicのモデル名は変更されるため、AI生成機能が失敗する場合はまずこの文字列が現行の正式なモデルIDと一致しているか確認すること。**
- レスポンスは「JSONのみを出力せよ」という指示でプロンプト側から制御しており、Structured Outputs等の機構は使っていない。コードブロック記号(` ```json `)が混入した場合の簡易除去処理あり。
- APIキーは `KeychainHelper` 経由でKeychainに保存(`UserDefaults`/`AppStorage`には保存しない)。新しく秘密情報を扱うコードを追加する場合も同様の方針を守ること。

### フィルタ・検索(RecipeListView.swift)

- 食材フィルタは `localizedCaseInsensitiveContains` による**文字列の部分一致**。表記ゆれ(「たまねぎ/玉ねぎ」など)は正規化していない。この挙動を「バグ」として修正しようとする場合は、既知の制限として意図的に単純実装にしていることをREADMEで確認すること。

## コーディング方針

- 依存パッケージなし(SwiftUI / SwiftData / PhotosUI / Security のみ)。新機能追加でも安易に外部ライブラリを増やさない。
- 写真は保存前に `PhotoAttachEditor.compress` でリサイズ・JPEG圧縮してから保存する(RecipeEditView.swift)。新しい画像取り込み経路を追加する場合も同じ圧縮を通すこと。
- コメントは最小限。既存ファイルも「なぜ」を説明する一言コメントのみで、実装の説明コメントはほぼ無い方針を踏襲する。

## 既知の制限(README.mdより)

- バックアップ機能なし(iCloudバックアップの範囲内のみ)。CloudKit同期は未実装。
- 食材フィルタは文字列部分一致のみ、食材マスタの正規化はしていない。
- AI生成はネットワーク必須、数秒〜十数秒かかる。
- 手書きレシピは写真保存のみでOCR(文字起こし)は行わない。
