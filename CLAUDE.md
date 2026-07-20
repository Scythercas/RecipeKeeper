# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (および Claude) 向けのガイドです。

## プロジェクト概要

RecipeKeeper は Expo(React Native)製の iOS/Android レシピ管理アプリ。サーバーは持たず、データはすべて端末内(AsyncStorage + ファイルシステム)に保存する。唯一の外部通信は「AIレシピ生成」機能で、Anthropic API に直接リクエストする。

主な機能:
- レシピ登録(参考サイトURL、手書きレシピ写真、完成写真)
- ジャンル/食材でのフィルタ・全文検索
- 「作った！」ボタンでの調理回数記録 + 工夫メモの履歴
- 手元の食材と常備調味料からAIがレシピを1件提案(そのまま保存可能)

詳しいセットアップ・デプロイ手順は [README.md](README.md) を参照。

## 開発環境に関する重要な制約

- **開発者はMac実機を持っていない。** そのためこのプロジェクトは意図的にExpo(マネージドワークフロー)を採用している。日々の動作確認はExpo GoアプリでのQRコードスキャンで行い、TestFlight配布が必要な場合もEAS Build(クラウドビルド)を使うため、Mac/Xcodeは一切登場しない。**新機能の実装で「Xcodeで確認してください」的な前提を持ち込まない。** bare React Native CLIへの移行やネイティブモジュールの追加(Podfile編集が必要になるもの)は、この前提を壊すため慎重に検討すること。
- **このリポジトリを直接操作している Claude Code (このエージェント) はWindows環境で動作しており、実機やシミュレータでの動作確認は行えない。** ただし `npx tsc --noEmit`(型チェック)と `npx expo export --platform ios`(Metroバンドルが通るかの確認)はこの環境でも実行でき、実際に有効な検証手段になる。コード変更後はこの2つを実行してから完了を報告すること。「Expo Goで動作確認しました」のような、実際に行っていない主張はしない。
- 以前のバージョンはSwiftUI + SwiftData製のネイティブiOSアプリで、AWS EC2 Macインスタンス上でXcodeを操作する構成だった。React Native化はその構成を置き換えるために行った(EC2 Macのセットアップの手間とコストを避けるため)。過去のSwiftコードやAWS関連の手順は残っていない。

## アーキテクチャ

```
RecipeKeeper/                      Expoプロジェクトルート(README.mdのあるリポジトリルートではなく、その下の同名ディレクトリ)
├── app.json                      Expo設定。アプリ名、iOS/Androidの権限文言、プラグイン設定
├── app/                          expo-routerによるファイルベースルーティング
│   ├── _layout.tsx               RecipesProviderでラップしたルートStack
│   ├── (tabs)/_layout.tsx        タブ構成(レシピ / AIで作る / 設定)
│   ├── (tabs)/index.tsx          レシピ一覧(検索・ジャンル/食材フィルタ・並び替え)
│   ├── (tabs)/ai.tsx             AIレシピ生成
│   ├── (tabs)/settings.tsx       常備調味料・APIキー管理
│   ├── recipe/new.tsx            新規作成(モーダル、RecipeFormを利用)
│   └── recipe/[id]/index.tsx     詳細表示・「作った!」記録
│   └── recipe/[id]/edit.tsx      編集(モーダル、RecipeFormを利用)
└── src/
    ├── types.ts                  Recipe / CookLog 型、GENRES一覧
    ├── id.ts                     依存ライブラリなしの簡易ID生成
    ├── storage.ts                AsyncStorageへのレシピ・常備調味料の永続化
    ├── photoStorage.ts           写真のリサイズ・JPEG圧縮・永続ディレクトリへの保存
    ├── claude.ts                 Anthropic Messages API直呼び出し + expo-secure-store
    ├── RecipesContext.tsx        レシピCRUDを提供するReact Context(useRecipes/useRecipe)
    └── components/
        ├── RecipeForm.tsx        新規/編集で共有するフォーム本体
        ├── PhotoAttachEditor.tsx 写真の追加(ライブラリ/カメラ)・削除・圧縮呼び出し
        ├── PhotoCarousel.tsx     詳細画面での写真横スクロール表示
        ├── RecipeRow.tsx         一覧の1行
        └── FilterChip.tsx        ジャンル選択チップ
```

### データモデル(src/types.ts)

- `Recipe`: title / genre / sourceURL / ingredients / seasonings / steps / memo / isAIGenerated / createdAt / dishPhotos(完成写真のファイルURI配列)/ handwrittenPhotos(手書きレシピのファイルURI配列)/ cookLogs(調理記録の配列)。SwiftData版と異なり、1つのJSONオブジェクトとしてAsyncStorageにまるごと保存する(正規化していない)。
- `CookLog`: `{ id, date, tweak }`。`cookCount(recipe)` / `lastCooked(recipe)` はSwiftData版の計算プロパティに相当するヘルパー関数。
- `GENRES` は固定の文字列配列だが、`Recipe.genre` は自由文字列としても保存されるため、配列にない値も許容される(AI生成結果や過去データとの互換性のため)。

### データ永続化(src/storage.ts, src/RecipesContext.tsx)

- レシピ配列は1つのJSON(`recipekeeper.recipes.v1`キー)としてAsyncStorageに保存。`RecipesProvider`が起動時にロードし、`recipes` state が変化するたびに自動保存する。
- 写真は `dishPhotos`/`handwrittenPhotos` にBase64やblobとして埋め込まず、`expo-file-system` でアプリの永続ディレクトリ(`Paths.document/photos/`)にJPEGファイルとして保存し、そのURI文字列だけをJSONに持たせる。新しい画像取り込み経路を追加する場合も `photoStorage.saveCompressedPhoto` を通し、同じ圧縮(最大辺1600px・JPEG品質0.7)を適用すること。
- レシピ削除時は `RecipesContext.deleteRecipe` が関連する写真ファイルも `deletePhoto` で削除する。新しい削除経路を足す場合も同様に写真ファイルの掃除を忘れないこと。

### AI生成(src/claude.ts)

- `fetch` で `https://api.anthropic.com/v1/messages` を直接叩く実装(公式SDKは使っていない、Swift版と同じ方針)。
- リクエストボディの `model` は現在 `"claude-sonnet-4-6"` にハードコードされている。**Anthropicのモデル名は変更されるため、AI生成機能が失敗する場合はまずこの文字列が現行の正式なモデルIDと一致しているか確認すること。**
- レスポンスは「JSONのみを出力せよ」という指示でプロンプト側から制御しており、Structured Outputs等の機構は使っていない。コードブロック記号が混入した場合の簡易除去処理あり。
- APIキーは `expo-secure-store` 経由で保存(iOSのKeychain/AndroidのKeystoreに相当)。`AsyncStorage`には保存しない。新しく秘密情報を扱うコードを追加する場合も同様の方針を守ること。

### フィルタ・検索(app/(tabs)/index.tsx)

- 食材フィルタは大文字小文字を無視した**文字列の部分一致**。表記ゆれ(「たまねぎ/玉ねぎ」など)は正規化していない。Swift版から引き継いだ既知の制限であり、意図的な単純実装。

## コーディング方針

- 依存パッケージは最小限に保つ(expo-router, expo-image-picker, expo-image-manipulator, expo-file-system, expo-secure-store, @react-native-async-storage/async-storage 程度)。状態管理ライブラリやUIキットなど、React Contextで十分な範囲に新たな依存を増やさない。
- タブアイコンは絵文字(Text)で表現しており、`@expo/vector-icons` 等のアイコンライブラリは意図的に導入していない。
- 写真は保存前に `photoStorage.saveCompressedPhoto` でリサイズ・JPEG圧縮してから保存する。新しい画像取り込み経路を追加する場合も同じ関数を通すこと。
- コメントは最小限。「なぜ」を説明する一言コメントのみで、実装の説明コメントは書かない方針を踏襲する。

## 変更後の確認方法(このエージェント自身が実行できること)

Mac/実機がなくても、このエージェントが実行できる検証は以下の2つ。コード変更後は必ず実行してから完了を報告すること。

```
cd RecipeKeeper
npx tsc --noEmit          # 型チェック
npx expo export --platform ios   # Metroバンドルが通るか(importミス等の検出)
```

実機での見た目や操作感の確認はユーザー側(Expo Goアプリ)でのみ可能。UIの見た目に関わる変更では、その旨を伝えること。

## 既知の制限(README.mdより)

- バックアップ機能なし(端末内のAsyncStorage/ファイルシステムのみ)。
- 食材フィルタは文字列部分一致のみ、食材マスタの正規化はしていない。
- AI生成はネットワーク必須、数秒〜十数秒かかる。
- 手書きレシピは写真保存のみでOCR(文字起こし)は行わない。
- IDは簡易生成(タイムスタンプ+乱数)。個人利用前提で、多人数同時利用は想定していない。
