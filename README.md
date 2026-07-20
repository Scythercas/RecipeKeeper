# RecipeKeeper — レシピ管理 iPhone アプリ

Expo(React Native)製のレシピ管理アプリです。サーバー不要で、データはすべて端末内に保存されます(AIレシピ生成時のみAnthropic APIと通信します)。

**Mac実機を持っていなくても開発・実機確認ができる構成**を前提にしています(詳細は後述)。

## 機能

- レシピ登録: 参考サイトURL、手書きレシピの写真(カメラ撮影可)、完成写真を添付
- フィルタ: ジャンルのチップ選択 + 使う食材での絞り込み(複数指定可、カンマ区切り)+ 全文検索
- 作った回数の記録: 詳細画面の「作った！」ボタンでワンタップ記録
- 工夫の記録: 記録時に「今回の工夫」を一言メモとして添付。履歴として一覧表示
- AIレシピ生成: 今ある食材を入力するとClaudeがレシピを提案。気に入ったらそのまま保存
- 常備調味料: 設定タブで登録した調味料は「家にあるもの」としてAIが前提にする

## 動作要件

- Node.js 20 以降、npm
- スマートフォン(iPhone/Android)+ **Expo Go** アプリ(App Store / Google Playで無料配布)
- AI生成機能を使う場合: Anthropic APIキー(有料・従量課金)
- 実機用の単独アプリ(TestFlight配布やApp Store公開)を作る場合のみ: Expoアカウント(無料)+ Apple Developer Program(年額$99、iOS配布時)

**Macは一切不要です。** Windows/Linux上でExpo(マネージドワークフロー)を使い、日々の開発・動作確認は「Expo Go」アプリでのQRコードスキャンだけで完結します。TestFlight配布や実際のアプリとしてのビルドが必要になった場合も、Expoのクラウドビルドサービス(EAS Build)がリモートでiOSビルドを行うため、やはりMacは不要です。

---

## 1. 環境構築

### 1-1. Node.jsのインストール

1. https://nodejs.org から LTS版をインストール(Windowsの場合はインストーラでOK)
2. 確認:
   ```
   node -v
   npm -v
   ```

### 1-2. 依存パッケージのインストール

リポジトリ直下ではなく `RecipeKeeper/` がExpoプロジェクトのルートです。

```
cd RecipeKeeper
npm install
```

### 1-3. スマートフォンにExpo Goをインストール

- iPhone: App Store で「Expo Go」を検索してインストール
- Android: Google Play で「Expo Go」を検索してインストール

### 1-4. 開発サーバーの起動 → 実機で確認

```
cd RecipeKeeper
npm start
```

1. ターミナルにQRコードが表示されます
2. iPhoneの場合: 標準カメラアプリでQRコードを読み取り、「Expo Goで開く」をタップ
3. Androidの場合: Expo Goアプリ内の「Scan QR code」でQRコードを読み取る
4. 数秒〜数十秒でアプリがビルドされ、実機上でそのまま起動します

PCとスマートフォンが**同じWi-Fiネットワーク**に接続されている必要があります。ホテルのWi-Fiなど端末間通信が制限されたネットワークでは繋がらないことがあるので、その場合は `npx expo start --tunnel` を試してください(やや遅くなりますが、異なるネットワーク越しでも接続できます)。

コードを保存すると、実機側の画面が自動的にリロードされます(Fast Refresh)。**AWSやXcodeのセットアップ、EC2 Macの起動待ちは一切不要です。**

---

## 2. AIレシピ生成のセットアップ

1. https://console.anthropic.com にアクセスしてアカウント作成
2. Billing でクレジットを購入(従量課金。最新の料金は https://docs.claude.com を参照)
3. **API Keys** でキーを発行(`sk-ant-` で始まる文字列)
4. アプリの「設定」タブ → Anthropic APIキー欄に貼り付けて保存

キーは端末の Secure Store(iOSのKeychain / AndroidのKeystoreに相当)に暗号化保存されます。

### コストと注意点(正直な話)

- レシピ1回の生成は数円程度ですが、従量課金なので使った分だけ請求されます。Console側で**利用上限(Spend Limit)を設定しておくことを強く推奨**します。
- この構成は「自分専用アプリ」前提です。**App Storeで一般公開する場合、各ユーザーに自分のAPIキーを入れさせる設計は現実的でなく、アプリにキーを埋め込むのは抽出されるためNGです。** 公開するなら自前のバックエンド(プロキシサーバー)経由でAPIを呼ぶ構成に変更してください。

---

## 3. 実機への配布(Expo Go以外の方法が必要な場合)

「1-4」のExpo Go経由の確認は開発中はこれで十分ですが、Expo Goには次のような制約があります。

- 常にExpo Goアプリ内で動く(ホーム画面に単独のアプリアイコンとしては置けない)
- 開発サーバーを起動しているPCがオンラインである必要がある(`npx expo start`していない状態では開けない。`--tunnel`や後述のビルドなら不要)

家族に配ったり、単独アプリとしてホーム画面に置きたい場合は、**EAS Build**(Expoのクラウドビルドサービス)でTestFlight配布用のビルドを作成します。**この工程もクラウド上で行われるため、Macは不要です。**

### 3-1. EASの準備

```
cd RecipeKeeper
npm install -g eas-cli
eas login
eas build:configure
```

`eas login` は無料のExpoアカウントで構いません(https://expo.dev で作成)。

### 3-2. iOSビルド(TestFlight配布)

TestFlightで配布するには Apple Developer Program(年額$99)への登録と、App Store Connectでのアプリ登録が必要です(この部分はAppleの制約であり、Expoを使っても回避できません)。

1. https://developer.apple.com/programs/ で登録
2. 次のコマンドを実行:
   ```
   eas build --platform ios --profile production
   ```
   初回はApple IDでのサインインを求められます(Xcode不要、CLIから直接行えます)。ビルドはEAS側のクラウドマシンで実行され、進捗はターミナルまたは https://expo.dev のダッシュボードで確認できます(数分〜十数分程度)
3. ビルド完了後、そのまま提出:
   ```
   eas submit --platform ios --latest
   ```
4. https://appstoreconnect.apple.com でアプリ情報(名前・プライバシー情報など最低限)を登録
5. TestFlight タブで内部テスターとして自分や家族のApple IDを招待(審査なしで最大100人)
6. iPhoneに **TestFlightアプリ**をインストール → 招待メールまたはTestFlightアプリ内の通知から「インストール」

以降、コードを更新するたびに `eas build` → `eas submit` を実行すればTestFlight経由で最新版が反映されます。

### 3-3. Androidビルド(参考)

Android実機への配布はさらに簡単です(Google Playの年会費もDeveloper Programのような縛りもありません)。

```
eas build --platform android --profile preview
```

ビルドされた `.apk` のダウンロードリンクが発行されるので、Android端末でリンクを開いてそのままインストールできます(「提供元不明のアプリ」の許可が必要な場合があります)。

### 3-4. App Store公開する場合

1. `eas build --platform ios --profile production` → `eas submit` でアップロード
2. App Store Connect でスクリーンショット、説明文、プライバシー情報を登録
3. 審査に提出(通常1〜3日)
4. **前述の通り、公開するならAPIキーの扱いをバックエンド経由に変更してからにしてください。** また、AI生成コンテンツを含むアプリは審査で用途の説明を求められることがあります。

---

## 4. 既知の制限・今後の改善候補

- **バックアップ**: データは端末内のAsyncStorage/ファイルシステムのみ。iPhoneのiCloudバックアップの範囲には含まれますが、機種変更時の明示的なエクスポート機能はありません。
- **食材フィルタは文字列の部分一致**です。「鶏」で鶏もも・鶏むねに一致する半面、表記ゆれ(「たまねぎ/玉ねぎ」)は別物扱いになります。厳密にやるなら食材マスタの正規化が必要です。
- **AI生成はネットワーク必須**で、レスポンスに数秒〜十数秒かかります。
- 手書きレシピは写真として保存するだけで、**文字起こし(OCR)はしません**。
- IDの衝突対策は簡易的な生成方法(タイムスタンプ+乱数)に留めています。個人利用の範囲では十分ですが、多人数での同時利用は想定していません。

## ファイル構成

```
RecipeKeeper/
├── README.md                     ← このファイル
├── CLAUDE.md                     ← Claude Code向けの開発ガイド
└── RecipeKeeper/                 ← Expo(React Native)プロジェクトルート
    ├── app.json                  ← Expo設定(アプリ名・権限文言・プラグイン)
    ├── package.json
    ├── tsconfig.json
    ├── app/                      ← 画面(expo-routerによるファイルベースルーティング)
    │   ├── _layout.tsx           ← ルートレイアウト(RecipesProvider + Stack)
    │   ├── (tabs)/
    │   │   ├── _layout.tsx       ← タブ構成(レシピ / AIで作る / 設定)
    │   │   ├── index.tsx         ← レシピ一覧・検索・フィルタ
    │   │   ├── ai.tsx            ← AIレシピ生成
    │   │   └── settings.tsx      ← 常備調味料・APIキー管理
    │   └── recipe/
    │       ├── new.tsx           ← 新規レシピ作成(モーダル)
    │       └── [id]/
    │           ├── index.tsx     ← レシピ詳細・「作った！」記録
    │           └── edit.tsx      ← レシピ編集(モーダル)
    └── src/
        ├── types.ts              ← Recipe / CookLog 型定義
        ├── id.ts                 ← 簡易ID生成
        ├── storage.ts             ← AsyncStorageへの永続化
        ├── photoStorage.ts        ← 写真のリサイズ・圧縮・ファイル保存
        ├── claude.ts               ← Anthropic API呼び出し + Secure Store
        ├── RecipesContext.tsx      ← レシピデータのReact Context
        └── components/             ← PhotoAttachEditor / RecipeForm など
```
