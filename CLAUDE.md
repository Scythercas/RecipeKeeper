# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (および Claude) 向けのガイドです。

## プロジェクト概要

RecipeKeeper は Expo(React Native)製のレシピ管理アプリ。**ネイティブ版(iOS/Android)とWeb版でアーキテクチャが異なる**:

- **ネイティブ版**: サーバーを持たず、データはすべて端末内(AsyncStorage + ファイルシステム)に保存する。唯一の外部通信は「AIレシピ生成」機能で、Anthropic API に直接リクエストする。ログイン等のアカウント機能は無い(個人利用前提)。
- **Web版**(GitHub Pagesで公開、`https://scythercas.github.io/RecipeKeeper/`): Supabase(Postgres + Auth + Storage + Edge Functions)を使った**複数ユーザー対応のアカウント制**。ログイン/サインアップ/パスワード再設定があり、レシピデータはユーザーごとにRLSで分離してPostgresに保存、写真はSupabase Storageに保存、AI生成はSupabase Edge Function経由(1ユーザー1日5回まで、あなたのAnthropicキーを共有)。詳細は下記「Web版アーキテクチャ」を参照。

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
- **git identityはこのリポジトリだけローカル設定で上書きしている**(2026年7月)。グローバル設定(`git config --global user.name/user.email`)は会社アドレス`ryo.igarashi@scsk-ahs.co.jp`になっているが、これは個人プロジェクトであり会社アドレスをコミット履歴に残したくないため、このリポジトリ直下で`git config --local user.name "Scythercas"` / `user.email "garyo20020124@gmail.com"`を設定済み。**このローカル設定を消したりグローバル設定に合わせたりしないこと。** なお`git push`の認証自体はGitHub CLI(`gh auth git-credential`)経由で、`gh auth status`で確認できる唯一のログイン先である`Scythercas`アカウントが使われる(認証は元々正しく、問題があったのはコミットの著者情報だけだった)。過去のコミット(このローカル設定より前のもの)は会社アドレスのまま残っており、意図的にhistory書き換えはしていない。

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
│                                  (画面を開いている間は`expo-keep-awake`でスリープを防止。
│                                  調理中に手が離れて画面ロックするのを避けるため、2026年7月追加)
│   └── recipe/[id]/edit.tsx      編集(モーダル、RecipeFormを利用)。ヘッダーに削除ボタンもある
│                                  (削除後は`router.dismissTo('/')`で編集モーダルと詳細画面を
│                                  まとめて閉じて一覧に戻る。`router.back()`だと削除済みの
│                                  詳細画面が一瞬「見つかりません」表示になるため)
└── src/
    ├── types.ts                  Recipe / CookLog 型、GENRES一覧
    ├── id.ts                     依存ライブラリなしの簡易ID生成
    ├── dialog.ts / dialog.web.ts 確認・エラーダイアログ(confirmDialog/alertDialog)。
    │                             ネイティブはAlert.alert、Webはwindow.confirm/alert
    │                             (react-native-webのAlert.alertがno-opなため必須)
    ├── storage.ts                AsyncStorageへのレシピ・常備調味料の永続化
    ├── photoStorage.ts           写真のリサイズ・JPEG圧縮・永続ディレクトリへの保存
    ├── claude.ts                 Anthropic Messages API直呼び出し + expo-secure-store
    ├── RecipesContext.tsx        レシピCRUDを提供するReact Context(useRecipes/useRecipe)
    ├── ToastContext.tsx          操作結果を伝える一時的なトースト通知(useToast)。ネイティブ・Web共通
    └── components/
        ├── RecipeForm.tsx        新規/編集で共有するフォーム本体
        ├── PhotoAttachEditor.tsx 写真の追加(ライブラリ/カメラ)・削除・圧縮呼び出し
        ├── PhotoCarousel.tsx     詳細画面での写真横スクロール表示
        ├── RecipeRow.tsx         一覧の1行
        ├── SwipeableRow.tsx      一覧行を左スワイプで削除ボタンを表示するラッパー
        ├── RatingPicker.tsx      1〜10点の採点チップ(RecipeForm・調理記録モーダルで共有)
        └── FilterChip.tsx        ジャンル選択チップ
```

上記はネイティブ版の構成(現在も正確)。Web版はこれに`.web.ts(x)`ファイルと`src/web/`ディレクトリが加わる。詳細は下記「Web版アーキテクチャ」を参照。リポジトリルート(このファイルと同じ階層)には他に `cloudflare-worker/`(廃止済み、削除予定)と `supabase/functions/`(Web版のAI生成用Edge Function)がある。

### データモデル(src/types.ts)

- `Recipe`: title / genres / sourceURL / ingredients / seasonings / steps / memo / isAIGenerated / createdAt / dishPhotos(完成写真のファイルURI配列)/ handwrittenPhotos(手書きレシピのファイルURI配列)/ cookLogs(調理記録の配列)/ rating(10点満点の採点、未評価は`null`)。SwiftData版と異なり、1つのJSONオブジェクトとしてAsyncStorageにまるごと保存する(正規化していない)。
- `rating`は`RecipeForm`(新規作成・編集画面で共通)、または詳細画面の「作った!」記録モーダルから更新できる(どちらも`src/components/RatingPicker.tsx`を共有)。モーダル側は`RecipesContext.rateRecipe(id, rating)`で単独更新し、調理記録の追加(`addCookLog`)とは別のAPI呼び出しになる。一覧画面の並び替えで「評価順」を選ぶと`rating`降順(未評価は最後)でソートする。Web版は`recipes`テーブルに`rating int check (rating between 1 and 10)`列を追加済み(2026年7月、`supabase db query --linked`で直接ALTER TABLEを実行、マイグレーションファイルは作成していない)。
- `CookLog`: `{ id, date, tweak, photos }`。`photos`は「作った!」記録モーダルで`PhotoAttachEditor`(ライブラリ/カメラ)から追加する、その回の完成写真(2026年7月追加、過去データは空配列)。`cookCount(recipe)` / `lastCooked(recipe)` はSwiftData版の計算プロパティに相当するヘルパー関数。
- レシピにまだ完成写真(`dishPhotos`)が1枚も無い状態で「作った!」を記録し写真を添付した場合、`app/recipe/[id]/index.tsx`の`recordCook()`がその写真を`photoStorage.duplicatePhoto`で複製した上で`dishPhotos`にも採用し、レシピのサムネになるようにしている(2026年7月追加)。複製せずに同じURI/パスを両方から参照すると、片方(調理記録側 or レシピ側)を削除したときにファイルの実体が消え、もう片方が壊れた画像になってしまうため、必ず別ファイルとして複製すること。この判定はdishPhotosが空の場合のみ(2回目以降の調理記録の写真では発火しない)。
- `genres: string[]`(2026年7月に`genre: string`単数から複数選択へ変更)。`GENRES`は固定の初期候補に過ぎず、`RecipeForm`の「新しいカテゴリーを追加」欄から自由に追加できる(永続化された別リストは持たず、既存レシピが使っているジャンルを`useRecipes()`から集計してチップ候補に出す方式)。ネイティブは`storage.ts`の`normalizeRecipe`が旧形式(`genre: string`)を読み込み時に`genres: [genre]`へ自動変換する(端末に残る旧データ対策)。Web版は`recipes`テーブルの`genre text`列を`genres text[]`列へ移行済み(2026年7月、既存行をバックフィルしてから旧列を削除)。

### データ永続化(src/storage.ts, src/RecipesContext.tsx)

- レシピ配列は1つのJSON(`recipekeeper.recipes.v1`キー)としてAsyncStorageに保存。`RecipesProvider`が起動時にロードし、`recipes` state が変化するたびに自動保存する。
- 写真は `dishPhotos`/`handwrittenPhotos` にBase64やblobとして埋め込まず、`expo-file-system` でアプリの永続ディレクトリ(`Paths.document/photos/`)にJPEGファイルとして保存し、そのURI文字列だけをJSONに持たせる。新しい画像取り込み経路を追加する場合も `photoStorage.saveCompressedPhoto` を通し、同じ圧縮(最大辺1600px・JPEG品質0.7)を適用すること。
- 既存の写真ファイルを削除リスクなしに複数箇所から使い回したい場合は`photoStorage.duplicatePhoto(uri)`で別ファイルとして複製してから使うこと(2026年7月追加、Web版は`supabase.storage.from('recipe-photos').copy()`)。同じURI/パスを2箇所のフィールドに直接コピーしない — このプロジェクトの削除処理(`deletePhoto`)は「参照が1箇所である」前提でファイルを問答無用に消すため、共有すると片方の削除がもう片方を巻き添えにする。
- `src/components/PhotoAttachEditor.tsx`はライブラリ/カメラのボタンを押してからピッカーが開く・圧縮が終わるまでの間`isBusy`でボタン自体を無効化している(2026年7月追加)。以前はガードが無く、連打すると同じ写真が誤って2重に登録される不具合があった。
- レシピ削除時は `RecipesContext.deleteRecipe` が関連する写真ファイルも `deletePhoto` で削除する。新しい削除経路を足す場合も同様に写真ファイルの掃除を忘れないこと。

### AI生成(src/claude.ts)

- `fetch` で `https://api.anthropic.com/v1/messages` を直接叩く実装(公式SDKは使っていない、Swift版と同じ方針)。
- リクエストボディの `model` は現在 `"claude-haiku-4-5-20251001"` にハードコードされている(`src/claude.ts`とWeb版の`supabase/functions/generate-recipe/index.ts`の両方で同じ文字列を使う)。**Anthropicのモデル名は変更されるため、AI生成機能が失敗する場合はまずこの文字列が現行の正式なモデルIDと一致しているか確認すること。** 元は`claude-sonnet-4-6`だったが、定型のJSON出力タスクである割に生成が遅いという指摘を受け、2026年7月にHaiku系(軽量・高速)へ変更した。Web版はコード変更後に`supabase functions deploy generate-recipe`での再デプロイが必要(Edge Function側は自動デプロイされない)。
- レスポンスは「JSONのみを出力せよ」という指示でプロンプト側から制御しており、Structured Outputs等の機構は使っていない。コードブロック記号が混入した場合の簡易除去処理あり。
- APIキーは `expo-secure-store` 経由で保存(iOSのKeychain/AndroidのKeystoreに相当)。`AsyncStorage`には保存しない。新しく秘密情報を扱うコードを追加する場合も同様の方針を守ること。
- **URLからのレシピ取り込み**(`importRecipeFromUrl`、2026年7月追加): クラシル・クックパッド・YouTube・レシピ記事等のURLを貼ると、ページを取得してテキスト化し、`generateRecipe`と同じ`GeneratedRecipe`形式のJSONをAIに抽出させる。DOMパーサーは追加せず正規表現で`<title>`/`meta description`/`og:description`/タグ除去後の本文を抜き出す簡易実装(`extractPageText`)。ネイティブはCORSの制約が無いので`fetch`で直接ページを取得できるが、**Web版はブラウザのCORSに阻まれるため`claude.web.ts`はSupabase Edge Function(`generate-recipe`)にURLを渡し、サーバー側でfetchさせる**(`try_consume_ai_generation`のレート制限も共有)。Edge Function側は任意のURLをサーバーからfetchするため`isBlockedHost`でlocalhost/プライベートIP/クラウドメタデータIPへのSSRFを拒否している(DNSリバインディングまでは防げない簡易チェック)。抽出できるのはページのHTMLに実際に含まれるテキストのみのため、JSでレンダリングされるサイトや、YouTubeの動画説明欄が短い場合は取り込み精度が落ちる既知の制限がある。プロンプト側に「見つからない場合は`{"error": "..."}`のみを返す」指示を入れ、それを明示的なエラーメッセージとして呼び出し元に伝える。ページfetch時は`PAGE_FETCH_HEADERS`(実ブラウザに近いUser-Agent/Accept/Accept-Language)を付けている(2026年7月追加)。ヘッダー無しだとYouTube等のbot対策で`HTTP 429`が返ることが報告されたための対策だが、**Supabase Edge Functionの送信元IPが共有クラウドIPのため、ヘッダーを付けてもYouTube側のIPベースのレート制限までは解消できない可能性がある**(ネイティブ版は利用者自身の端末IPからfetchするため、この問題が起きにくいと考えられる)。再発する場合は、原因はヘッダーではなくIPレピュテーションである可能性が高く、根本対応にはプロキシ等が必要になる。

### フィルタ・検索(app/(tabs)/index.tsx)

- 上部の検索欄は**レシピ名のみ**を対象にした部分一致(食材は含まない)。食材の絞り込みは下の「食材で絞り込む」欄で行う、複数食材のAND一致専用の別コントロール。かつては1つの検索欄が名前と食材の両方を検索していて紛らわしかったため、役割を分離した(2026年7月)。
- 食材フィルタは大文字小文字を無視した**文字列の部分一致**。表記ゆれ(「たまねぎ/玉ねぎ」など)は正規化していない。Swift版から引き継いだ既知の制限であり、意図的な単純実装。
- 「食材で絞り込む」の下に「除外する食材」欄があり(2026年7月追加)、こちらは**いずれか一致で除外**(含む側のANDとは逆の「いずれか含む」判定)。含む/除外の両フィルタは独立していて、同じ食材を両方に入れると常に0件になる(未対応、意図的にバリデーションはしていない)。
- 検索欄・食材フィルタ(含む/除外)の3つのTextInputには`autoComplete="off"` `textContentType="none"`を付けている(2026年7月追加)。付けないとブラウザ(特にChrome)がユーザーの登録済みメールアドレス等をこれらの欄に誤って自動入力することがあったための対策。新しく自由入力のTextInputを追加する場合、ログイン/サインアップ画面のような本来autofillが有用な場面を除き、同様に付けることを検討すること。
- カテゴリー(ジャンル)チップも複数選択可能で、選択したジャンルを**すべて含む**レシピだけを表示するAND一致(食材フィルタと同じ考え方)。OR的な「いずれか含む」は提供していない。候補チップは固定の`GENRES`と、既存レシピが実際に使っているジャンル(`recipes.flatMap(r => r.genres)`)の和集合。
- カテゴリーチップを囲む`ScrollView(horizontal)`(`genreScroll`)は高さをコンテンツ任せにせず`height: 40`を明示している。自動計算に任せるとスマホ表示時にチップ下部がわずかに見切れることがあったため(react-navigationタブバーの高さ問題と同種の対策、2026年7月)。

## Web版アーキテクチャ(Supabase)

ネイティブ版は上記の通りサーバーレスのまま。**Web版だけ**、`src/`配下の`*.web.ts(x)`ファイルと`app/`配下の一部ルートを使って、Supabaseベースの別実装に差し替えている。

### プラットフォーム分岐の方式

Metro/Expo Routerは`foo.web.tsx`という同名ファイルをWebビルド時にだけ自動解決する。この機能を使い、**ネイティブ用ファイルは一切編集せず**、Web専用の実装を並べて追加する方針を徹底している:

- `src/RecipesContext.tsx`(ネイティブ、AsyncStorage) ⇔ `src/RecipesContext.web.tsx`(Web、Supabase)
- `src/photoStorage.ts`(ネイティブ、expo-file-system) ⇔ `src/photoStorage.web.ts`(Web、Supabase Storage)
- `src/claude.ts`(ネイティブ、SecureStore+Anthropic直呼び) ⇔ `src/claude.web.ts`(Web、Supabase Edge Function経由)
- `app/(tabs)/settings.tsx`(ネイティブ) ⇔ `app/(tabs)/settings.web.tsx`(Web、実体は`src/components/AIUsageIndicator.tsx`と同様のパターン)

新しい `src/web/` ディレクトリに、Web専用のヘルパー(`supabaseClient.ts`, `AuthContext.tsx`, `recipeMappers.ts`)と、実際の画面コンポーネント(`src/web/screens/*.tsx`)が入っている。

`src/web/screens/SignupScreen.tsx` はアカウント登録の入り口として、機能説明・イラスト付きのマーケティング的なレイアウト(2026年7月追加)。イラストは画像アセットを追加せず、既存の「タブアイコンは絵文字」方針を踏襲して絵文字とViewの組み合わせだけで表現している(散らばった情報源→1つのカードに集約、という構図)。`useWindowDimensions`で幅860px以上なら2カラム(左に訴求文・右にフォーム)、それ未満は縦積みに切り替える。この画面だけ内容が長くなるため`ScrollView`で包んでいる(他のログイン系画面は短いため素の`View`のまま)。

`src/web/screens/SettingsScreen.tsx` は2026年7月に全体をカード型レイアウトへリデザインした。背景`#F5F1EA`の上に、白背景・角丸14・薄いシャドウの`Card`コンポーネント(このファイル内だけのローカルヘルパー、共通コンポーネント化はしていない)を並べる方式。セクション順は上から「アカウント」「AIポイント(金色タイントの`Card`、絵文字+大きな数字で強調)」「パスワード(`/change-password`へ遷移するボタンのみ、入力欄自体は無い)」「常備調味料(タップで開閉するcollapsible、デフォルトは閉じた状態)」「アカウントの削除(意図的に最下部)」。パスワード変更は`src/web/screens/ChangePasswordScreen.tsx`(+ `app/change-password.tsx`のフォールバックと`app/change-password.web.tsx`のReact.lazyシム、`WebRootLayout.tsx`の`Stack`に登録)という別画面に分離し、成功時は`useToast`でトースト表示後`router.back()`で設定画面に戻る(以前は設定画面にインラインで3つのパスワード入力欄が常に表示されていた)。

### ⚠️ `app/` 配下のルートファイルには要注意(このハマりどころに時間を使ったので必ず読むこと)

`src/`配下の普通のimportは`.web.ts(x)`の自動解決が問題なく効く(検証済み: ネイティブのbundleに`expo-secure-store`の文字列が一切含まれないことをgrepで確認済み)。しかし **`app/`配下の「ルートファイル」は挙動が異なる**:

1. **プラットフォーム拡張子だけのルートは存在できない。** `expo-router`のルート探索(`getRoutesCore.js`)は、`login.web.tsx`のような「`.web.tsx`はあるがプレーンな`.tsx`が無い」ルートに対して、実際にそのルートへ遷移した瞬間(ビルド時ではなく**実行時**)に`"The file ... does not have a fallback sibling file without a platform extension."`という例外を投げる。Web限定のルートを作る場合も、**必ず中身が空でもいいので同名のプレーンな`.tsx`フォールバックを置くこと**(`app/login.tsx`, `app/signup.tsx`, `app/forgot-password.tsx`, `app/reset-password.tsx`, `app/change-password.tsx`が実例。ネイティブでは`_layout.tsx`がこれらを一切参照しないので実質使われない)。
2. **`app/`配下の`.web.tsx`ファイルは、ネイティブ向けビルドの成果物(.hbc)にも物理的に含まれてしまう**(実行はされないが、コードは残る)。これは`expo-router`のルート探索がプラットフォームを問わず全ファイルを候補として扱うため。`React.lazy`で遅延importにしても、React Native(Hermes)は単一バンドルなので、コード自体はバンドルに残る(実行されないだけ)。そのため、Web専用ルート(`login.web.tsx`等)は**Supabaseクライアントなどへの静的importを直接書かず**、実体を`src/web/screens/*.tsx`に置いて`React.lazy(() => import(...))`経由で読み込む薄いシムにしてある。ネイティブのバンドルサイズは数百KB増える(実測+約570KB)が、実行時に読み込まれることはない(`grep`で`ai_generation_usage`等の文字列がネイティブbundleに含まれないことを都度確認している)。
3. **`app/+html.tsx`によるHTMLカスタマイズ(`viewport-fit=cover`の追加など)は、`app.json`の`web.output`が`"static"`のときしか効かない。** このプロジェクトはSPA向けの`"single"`モード(デフォルト)を使っているため、`+html.tsx`は無視される。`"static"`への切り替えは(クライアント専用のSupabaseコードがNode.js側の事前レンダリングでクラッシュしうるなど)リスクが大きいため見送り、代わりに**`npx expo export --platform web`の実行後、`dist/index.html`の`<meta name="viewport">`を手動で`viewport-fit=cover`付きに書き換えてからデプロイする**運用にしている。
4. **Metroのトランスフォームキャッシュが、`.env`の値の変更を検知しないことがある。** ソースコード自体は変わっていないため、`.env`を更新しても古い値(例: テスト用のダミーURL)がバンドルに埋め込まれたままになるケースが実際に発生した。`.env`を変更した後の本番ビルドは、必ず`npx expo export --platform web --clear`で明示的にキャッシュをクリアすること。

### Supabaseスキーマ・設定

- テーブル: `recipes`(`rating int check (rating between 1 and 10)`列を含む、未評価は`NULL`), `cook_logs`(`user_id`で所有者を持ちRLSで分離。`photos text[] not null default '{}'`列を追加済み、2026年7月), `ai_generation_usage`(1ユーザー1日ごとの生成回数。`try_consume_ai_generation` SECURITY DEFINER関数経由でのみ加算でき、`ai_generation_usage_owner_select`ポリシーで本人だけ閲覧可)。
- `ai_points`テーブル(2026年7月追加)。`user_id uuid primary key references auth.users(id)`, `points int not null default 10`, `last_login_bonus_date date`。**今後追加予定のAIによるレシピ管理補助機能**(まだ未実装)の利用制限を管理するための残高で、現行のレシピ生成機能の1日5回制限(`ai_generation_usage`)とは別の独立した仕組み。RLSは本人のみ`select`可(`ai_points_owner_select`)、更新は下記の2つのSECURITY DEFINER関数経由のみ。
  - `handle_new_user_ai_points()`: `auth.users`への`insert`トリガー(`on_auth_user_created_ai_points`)から呼ばれ、新規サインアップ時に`points = 10`の行を自動作成する。
  - `claim_daily_login_bonus()`: `auth.uid()`を内部で使うため`p_user_id`引数を取らず、Edge Function経由にせず`authenticated`ロールに直接`grant execute`している(他人のポイントを操作できないため安全)。`last_login_bonus_date < current_date`(またはNULL)の場合のみ`points`を+1して`last_login_bonus_date`を今日の日付に更新、既に今日付与済みなら何もせず現在の残高を返す。`src/web/AuthContext.tsx`の`AuthProvider`が`onAuthStateChange`/`getSession`でセッションを検知するたびに(ただし同じユーザーIDに対しては`claimedUserIdRef`で1回だけ)このRPCを呼ぶ。**上限(キャップ)は設けていない**——「全ユーザーを10で初期化し、ログインで1日1ポイント増える」という指示をそのまま実装したもので、無限に貯まり続ける設計になっている。上限が必要な場合は`claim_daily_login_bonus()`の`update`に`least(points + 1, N)`を足すだけで対応できる。既存ユーザーへの初期10ポイント付与はマイグレーションSQLで一括`insert`済み(マイグレーションファイルは作成せず`supabase db query --linked --file`で直接実行、他のスキーマ変更と同じ方針)。残高は`src/web/screens/SettingsScreen.tsx`の「アカウント」セクションに表示している(消費する機能がまだ無いので表示のみ)。
- **`try_consume_ai_generation`はアプリ所有者本人のアカウント(`garyo20020124@gmail.com`)だけ、1日の生成回数上限を実質無制限(`2147483647`)にしている**(2026年7月、`p_user_id`から`auth.users.email`を引いてハードコードされたメールアドレスと比較)。カウント自体は他ユーザーと同様に記録されるため、利用状況の把握はできる。この関数を編集する際は必ずこの分岐を維持すること。`src/components/AIUsageIndicator.web.tsx`の`UNLIMITED_EMAIL`定数も同じメールアドレスをハードコードしており、該当アカウントでは「残りX/5」ではなく「本日の生成回数: X回(無制限アカウント)」と表示する。両者は独立した箇所に同じ文字列がある(共有定数化していない)ので、対象メールアドレスを変更する場合は両方直すこと。
- Storage: `recipe-photos`バケット(公開・パスは`${user_id}/${filename}.jpg`というフラット構成。レシピID単位にしていないのは、新規レシピ作成時点ではレシピIDがまだ確定していないため)。
- Edge Function: `supabase/functions/generate-recipe/`。JWT検証 → レート制限判定 → プロンプト構築 → Anthropic呼び出し、を一括で行う。`ANTHROPIC_API_KEY`と`DAILY_AI_LIMIT`をシークレットとして保持。
- Edge Function: `supabase/functions/delete-account/`(2026年7月追加、アカウント削除機能)。JWT検証 → `recipe-photos`バケットの`${user_id}/`配下を`service_role`で列挙・削除 → `auth.admin.deleteUser(userId)`。`recipes`/`cook_logs`/`ai_generation_usage`/`ai_points`はauth.usersへの`on delete cascade`で自動削除されるため、Storageのファイルだけ手動で先に消す(外部キーで紐付いていないため)。`src/web/screens/SettingsScreen.tsx`の「アカウントの削除」ボタンから`supabase.functions.invoke('delete-account')`で呼び出し、成功後に`supabase.auth.signOut()`してログイン画面へ戻す。
- **`Alert.alert`は確認ダイアログとして使えない**(react-native-webの実装が`static alert() {}`という完全な no-op のため、ネイティブでは動くがWebでは何も起きない)。この問題により`app/recipe/[id]/edit.tsx`のレシピ削除確認がWeb版で無反応になっていたバグを2026年7月に発見・修正した。対応として`src/dialog.ts`(ネイティブ、`Alert.alert`をPromiseでラップ)と`src/dialog.web.ts`(Web、`window.confirm`/`window.alert`)を追加し、`confirmDialog`/`alertDialog`という共通APIに統一。`edit.tsx`・`app/recipe/[id]/index.tsx`(調理記録の記録・削除の失敗表示)・`SettingsScreen.tsx`(アカウント削除の確認)がこれ経由になっている。**新しく確認ダイアログやエラー表示を追加する場合は素の`Alert.alert`を使わず、必ずこの`src/dialog`経由にすること**(ただし`app/(tabs)/index.tsx`の一覧画面の削除失敗時など、他にも残っているエラー用`Alert.alert`呼び出しがあり、そちらは未対応のままWeb版では無反応)。
- ローカルでのSupabase CLI操作(`supabase secrets set` / `supabase functions deploy` / `supabase db query --linked`でのSQL実行等)は`supabase login`のブラウザ認証さえ済んでいれば、このエージェントが直接実行できる(実際にRLSポリシー追加などを代行した実績あり)。ダッシュボードでの手動設定が必要なのは主にAuth周りのURL Configuration(Site URL / Redirect URLs)。

### `cloudflare-worker/` は廃止済み(削除はまだ)

Web版のAI生成は当初Cloudflare Workerによる合言葉プロキシ方式だったが、Supabase Edge Functionに置き換えて廃止した。`worker.js`の先頭に廃止済みコメントがあるのみで、ディレクトリ自体はまだ削除していない(実際にデプロイ済みのWorkerを止める作業がユーザー側の`wrangler`権限で必要なため)。

### Web版のデプロイ手順

`gh-pages`ブランチは、`develop/v001`と共通祖先を持たない**orphanブランチ**で、`npx expo export --platform web`の出力(+ 下記の手動パッチ)だけを置く。手順:

```
cd RecipeKeeper
npx expo export --platform web --clear
# dist/index.html を手動編集(builtin +html.tsxが効かないための代替):
#   1. viewport meta タグに viewport-fit=cover を追記
#   2. <style id="expo-reset"> 内の html,body,#root の height:100% の直後に height:100dvh を追記
#      (モバイルSafariは100%/100vhがアドレスバー分を考慮しないため、タブバー等が
#       画面下端で見切れる原因になる。100dvhは実際に見えている範囲を正しく反映する)
#   3. <link rel="apple-touch-icon" href="/RecipeKeeper/apple-touch-icon.png" />
#      <link rel="manifest" href="/RecipeKeeper/manifest.json" />
#      <meta name="theme-color" content="#F5ECE1" /> を追記
#      (スマホでブックマーク・ホーム画面に追加した際のアイコン用。2026年7月導入)
cp dist/index.html dist/404.html
# ↑ GitHub Pagesは/RecipeKeeper/settingsのような直接URL(ブックマーク・リロード・
#   他サイトからのリンク)に対応する物理ファイルが無いため素で404を返す。SPA(このアプリ)
#   はクライアント側ルーティングなので、404.htmlをindex.htmlと同一内容にしておけば
#   GitHub Pagesがそれを返し、その後はexpo-routerがwindow.location.pathnameを見て
#   正しい画面を描画する(2026年7月導入)。index.htmlを更新したら404.htmlも必ず同期すること。
git worktree add ../<temp-dir-name> gh-pages
cd ../<temp-dir-name>
# 既存の _expo/assets/favicon.ico/index.html/404.html/metadata.json/apple-touch-icon.png/manifest.json を
# git rm -r してから dist の中身を丸ごとコピー
git add -A && git commit -m "..." && git push origin gh-pages
cd ../RecipeKeeper && git worktree remove ../<temp-dir-name> --force
```

`gh-pages`は普段チェックアウトして作業する場所ではない(過去に誤って作業ディレクトリをgh-pagesのままにして、`.wrangler`や`.expo`のキャッシュファイルを誤コミットした事故があった)。必ずworktreeで隔離すること。

### アプリアイコン・Webの各種アイコン(2026年7月刷新)

- `RecipeKeeper/assets/icon.png`(アプリ本体アイコン)・`favicon.png`(Webタブアイコン)・`android-icon-foreground.png`(Androidアダプティブアイコン前景)は同一画像を使っている。以前はExpoのデフォルトプレースホルダー(青い山形ロゴ)のまま未設定だった。
- `android-icon-background.png`(旧デフォルトの方眼グリッド画像)は削除し、`app.json`の`android.adaptiveIcon`から`backgroundImage`を外して`backgroundColor: "#F5ECE1"`(アイコンに合わせた生成り色)のみで背景を出す方式にした。**`android-icon-monochrome.png`は未更新のまま**(Android 13+のテーマアイコン用に単色シルエット画像が必要だが、この環境に画像加工ツールが無く生成できていない、既知の未対応)。
- `RecipeKeeper/public/`ディレクトリは`npx expo export --platform web`実行時に中身がそのまま`dist/`直下にコピーされる(Expoの標準機能、CRA等のpublicフォルダと同様)。ここに`apple-touch-icon.png`(iOS Safariの「ホーム画面に追加」用)と`manifest.json`(Android Chromeの「ホーム画面に追加」用、Web App Manifest)を置いている。両方とも1024x1024の単一画像のみを指定しており、複数解像度は用意していない(画像加工ツールが無いため)。
- `src/web/screens/SignupScreen.tsx`のヒーローイラストの収束先(「散らばった情報源→1つに集約」の着地点)は、以前は絵文字+Viewで手描きしていたが、実際の`assets/icon.png`を`require`して表示するよう変更した。

## コーディング方針

- 依存パッケージは最小限に保つ(expo-router, expo-image-picker, expo-image-manipulator, expo-file-system, expo-secure-store, expo-keep-awake, @react-native-async-storage/async-storage 程度)。状態管理ライブラリやUIキットなど、React Contextで十分な範囲に新たな依存を増やさない。`@supabase/supabase-js`はWeb専用ファイルからしか参照しない前提で追加した例外(上記「プラットフォーム分岐の方式」参照)。
- `src/components/SwipeableRow.tsx`(一覧のスワイプ削除)は`react-native-gesture-handler`を追加せず、React Native本体の`PanResponder`だけで実装している(依存追加を避ける方針のため)。`onMoveShouldSetPanResponder`で横方向の動きだけを拾うことで、素早いタップは下の`Pressable`にそのまま素通りする。
- ユーザー操作の結果は`src/ToastContext.tsx`の`useToast().showToast(message)`で一時的なトースト通知として伝える(2026年7月導入)。保存・削除・調理記録など「画面遷移や一覧の見た目だけでは伝わりにくい操作」に使う。エラーは従来どおり`Alert.alert`(明示的な確認が必要なため)、成功はトースト、と使い分ける。
- タブアイコンは絵文字(Text)で表現しており、`@expo/vector-icons` 等のアイコンライブラリは意図的に導入していない。
- 写真は保存前に `photoStorage.saveCompressedPhoto` でリサイズ・JPEG圧縮してから保存する。新しい画像取り込み経路を追加する場合も同じ関数を通すこと。
- コメントは最小限。「なぜ」を説明する一言コメントのみで、実装の説明コメントは書かない方針を踏襲する。

## 変更後の確認方法(このエージェント自身が実行できること)

Mac/実機がなくても、このエージェントが実行できる検証は以下。コード変更後は必ず実行してから完了を報告すること。

```
cd RecipeKeeper
npx tsc --noEmit                  # 型チェック(.web.tsxも同じコンパイル対象に含まれる)
npx expo export --platform ios    # Metroバンドルが通るか(importミス等の検出)
npx expo export --platform web    # Web版のビルド確認。.env変更後は必ず --clear を付ける
```

Web版に変更が及ぶ場合、念のためiOS向けの出力(`.hbc`)を`grep`して、Web専用の識別子(テーブル名やSupabase関連の文字列など)が紛れ込んでいないかも確認するとよい(「Web版アーキテクチャ」の注意点2を参照)。

実機・実ブラウザでの見た目や操作感の確認は、ネイティブはユーザー側(Expo Goアプリ)、Webはユーザー側の実ブラウザでのみ可能。UIの見た目に関わる変更では、その旨を伝えること。

## 既知の制限(README.mdより)

- ネイティブ版はバックアップ機能なし(端末内のAsyncStorage/ファイルシステムのみ)。Web版はSupabaseにデータがあるためこの制限はない。
- 食材フィルタは文字列部分一致のみ、食材マスタの正規化はしていない(ネイティブ・Web共通)。
- AI生成はネットワーク必須、数秒〜十数秒かかる。Web版は1ユーザー1日5回までの制限あり(`ai_generation_usage`テーブル)、ネイティブ版は制限なし(自分のAPIキーを使うため)。
- 手書きレシピは写真保存のみでOCR(文字起こし)は行わない。
- ネイティブ版のIDは簡易生成(タイムスタンプ+乱数)。個人利用前提で、多人数同時利用は想定していない。Web版はSupabaseのUUIDを使い、複数ユーザーを前提とする。
