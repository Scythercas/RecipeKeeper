# RecipeKeeper — レシピ管理 iPhone アプリ

SwiftUI + SwiftData 製のレシピ管理アプリです。サーバー不要で、データはすべて端末内に保存されます(AIレシピ生成時のみAnthropic APIと通信します)。

## 機能

- レシピ登録: 参考サイトURL、手書きレシピの写真(カメラ撮影可)、完成写真を添付
- フィルタ: ジャンルのチップ選択 + 使う食材での絞り込み(複数指定可、カンマ区切り)+ 全文検索
- 作った回数の記録: 詳細画面の「作った！」ボタンでワンタップ記録
- 工夫の記録: 記録時に「今回の工夫」を一言メモとして添付。履歴として一覧表示
- AIレシピ生成: 今ある食材を入力するとClaudeがレシピを提案。気に入ったらそのまま保存
- 常備調味料: 設定タブで登録した調味料は「家にあるもの」としてAIが前提にする

## 動作要件

- Xcode 16 以降が動く macOS 環境(iOSアプリ開発にはMacが必須です)
  - **Mac実機がない場合**: 本書では AWS EC2 Mac インスタンス(AWSがリモートで時間貸ししているMac mini実機)上にXcode環境を構築する手順を記載しています。AWSアカウントとクレジットカードが必要です
- iOS 17 以降の iPhone(SwiftDataがiOS 17+のため)
- Apple ID(実機にインストールするには **Apple Developer Program(年額$99)への登録を推奨** — 理由は「3. 実機へのデプロイ」参照)
- AI生成機能を使う場合: Anthropic APIキー(有料・従量課金)

---

## 1. 環境構築(AWS EC2 Macインスタンスを使用)

Mac実機を持っていない前提の手順です。AWSが時間貸ししている「EC2 Macインスタンス」(Apple製Mac mini実機)を借りて、そこにVNCでリモート接続し、通常のMacと同じようにXcodeを操作します。

### 1-0. 全体の流れとコストの注意(必読)

- EC2 Macインスタンスは「**Dedicated Host**」という単位でMac mini実機を1台まるごと専有する方式です。Appleのソフトウェア使用許諾条件に基づき、AWS側で**一度確保すると最低24時間は解放(release)できない**という制約があります。24時間分の課金は確定で発生すると考えてください。
- 24時間経過後はいつでもインスタンスの停止・ホストの解放が可能です。**インスタンスをstopしただけではホストの課金は止まりません。** 作業がひと段落したら忘れずに Dedicated Host 自体を解放(Release)してください。
- 対応リージョン・対応インスタンスタイプ・料金は変更されることがあるため、作業前に必ず公式情報を確認してください:
  - インスタンスタイプ一覧: https://aws.amazon.com/ec2/instance-types/mac/
  - 料金表: https://aws.amazon.com/ec2/pricing/on-demand/ (`mac1.metal` / `mac2.metal` などで検索)
  - 目安(執筆時点、変動あり): `mac2.metal`(Apple M1 Mac mini)が us-east-1 で1時間あたり1ドル前後。最低利用の24時間で20〜25ドル程度。
- Xcodeのインストールやプロジェクト設定などの単発作業はまとめて一気に終わらせ、24時間を過ぎたら早めにホストを解放するとコストを抑えられます。

### 1-1. Dedicated Hostの確保とインスタンス起動

1. AWSマネジメントコンソール → EC2 → 左メニュー **Dedicated Hosts** → **Allocate host**
   - Instance family: `mac2`(Apple M1)。M2系が必要なら`mac2-m2`/`mac2-m2pro`、Intel版なら`mac1`(リージョンにより対応状況が異なります)
   - Availability Zone: 1つ選択(このあとインスタンス起動時に同じAZを指定します)
   - Quantity: 1 → Allocate host
2. ホストのステータスが `Available` になるまで数分待つ
3. EC2 → **Instances** → **Launch instances**
   - Name: 任意(例 `recipekeeper-mac-build`)
   - AMI: `macOS` で検索し、Amazon提供の公式macOS AMI(例: "macOS Sonoma"/"macOS Sequoia")を選択。アーキテクチャ(arm64/Intel)は確保したホストに合わせる
   - Instance type: ホストに対応する型(例 `mac2.metal`)
   - Key pair: 新規作成してダウンロード(`.pem`)。SSH接続に使うので保管しておく
   - Network settings → Edit → Security group で以下を許可し、**送信元(Source)は自分のグローバルIPのみに絞る**:
     - SSH: TCP 22
     - 画面共有(VNC)用: TCP 5900
   - Advanced details → Tenancy: **Dedicated host** → 手順1で確保したホストを選択
   - Launch instance

### 1-2. SSHでパスワード設定 → VNCで画面接続

1. インスタンスが `Running` になったら Public IPv4 アドレスを確認
2. Windows側でGit Bash(またはPowerShell)からSSH接続:
   ```
   ssh -i my-key.pem ec2-user@<Public IP>
   ```
3. 接続できたら、macOS側の `ec2-user` アカウントにログインパスワードを設定(画面共有のログインに必要):
   ```
   sudo dscl . -passwd /Users/ec2-user
   ```
   プロンプトに従って新しいパスワードを入力
4. Windows PCに VNC クライアントをインストール(例: RealVNC Viewer、TigerVNC など)
5. VNCクライアントで `<Public IP>:5900` に接続し、ユーザー名 `ec2-user` と手順3で設定したパスワードでログイン
   → macOSのデスクトップ画面がWindows上に表示されます。以降はこの画面の中でMacを操作する感覚で進めます。

### 1-3. Apple ID サインイン & Xcodeインストール

1. VNC画面上で System Settings → Apple ID からサインイン(App StoreからのXcode取得、および後述のTestFlight配布に必要)
2. Xcodeの入手方法は2通り:
   - **App Store経由**: Launchpad → App Store → 「Xcode」を検索してインストール(十数GBあるので時間がかかります。ただしEC2インスタンスはAWSの高速回線を使うため、自宅回線より速く終わることが多いです)
   - **直接ダウンロード**: VNC画面上のSafariで https://developer.apple.com/download/all/ にアクセスし、対象バージョンの `.xip` をダウンロード → ダブルクリックで展開 → `Applications` フォルダへ移動
3. 初回起動時、追加コンポーネントのインストールを求められたら実行
4. Terminalで以下を実行し、コマンドラインツールとライセンスを有効化:
   ```
   sudo xcodebuild -license accept
   xcodebuild -runFirstLaunch
   ```

### 1-4. プロジェクトのソースコードをEC2 Macに転送

Windows上にあるこのリポジトリのコードをEC2 Macへ持っていきます。方法は2通り:

**方法A: scpで直接転送(手軽)**

Windows側のGit Bash/PowerShellから:
```
scp -i my-key.pem -r "RecipeKeeper" ec2-user@<Public IP>:~/Desktop/
```

**方法B: Gitリポジトリ経由(継続的に開発するなら推奨)**

1. Windows側でこのフォルダをGitHubなど(プライベートリポジトリ推奨)にpush
2. VNC画面上のTerminalで:
   ```
   git clone <リポジトリURL> ~/Desktop/RecipeKeeper
   ```

### 1-5. プロジェクト作成・ソースコードの配置

以降はEC2 Mac上のXcodeで、通常のMacと同じ手順です。

1. Xcode を起動 → **Create New Project**
2. **iOS → App** を選択して Next
3. 以下を入力:
   - Product Name: `RecipeKeeper`
   - Team: 自分のApple ID(Personal Team、または加入済みならDeveloper Programのチーム)
   - Organization Identifier: `com.あなたの名前` など(世界で一意になる文字列)
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **None**(SwiftDataのコードは同梱済みのため)
   - Include Tests: 任意(オフでOK)
4. 保存場所を選んで Create
5. 自動生成された `ContentView.swift` と `RecipeKeeperApp.swift` を**削除**(右クリック → Delete → Move to Trash)
6. 転送した `RecipeKeeper/` フォルダ内の以下8ファイルを、Xcode左側のプロジェクトナビゲータへドラッグ&ドロップ:
   - `RecipeKeeperApp.swift`
   - `Models.swift`
   - `RecipeListView.swift`
   - `RecipeDetailView.swift`
   - `RecipeEditView.swift`
   - `AIGenerateView.swift`
   - `ClaudeService.swift`
   - `SettingsView.swift`
7. ダイアログで **「Copy files to destination」にチェック**、Targetの `RecipeKeeper` にチェックが入っていることを確認して Finish

### 1-6. カメラ権限の設定(必須)

カメラ撮影機能を使うため、権限の説明文を追加します。

1. プロジェクトナビゲータで青いプロジェクトアイコン → TARGETS の `RecipeKeeper` → **Info** タブ
2. 一覧のどこかで右クリック → Add Row
3. Key に `Privacy - Camera Usage Description`(生のキー名は `NSCameraUsageDescription`)
4. Value に「手書きレシピや料理の写真を撮影するためにカメラを使用します」と入力

※ フォトライブラリは `PhotosPicker` を使っているため権限設定は不要です。

### 1-7. シミュレータで動作確認

1. Xcode 上部のデバイス選択で iPhone のシミュレータ(例: iPhone 16)を選択
2. ⌘R(Run)でビルド&起動

VNC越しでもシミュレータ操作に支障はありません(画面の描画がやや遅延することがある程度です)。ただしシミュレータにはカメラがないため、カメラ機能の確認は「3. 実機へのデプロイ」の手順で行ってください。

---

## 2. AIレシピ生成のセットアップ

1. https://console.anthropic.com にアクセスしてアカウント作成
2. Billing でクレジットを購入(従量課金。最新の料金は https://docs.claude.com を参照)
3. **API Keys** でキーを発行(`sk-ant-` で始まる文字列)
4. アプリの「設定」タブ → Anthropic APIキー欄に貼り付けて保存

キーは端末のKeychainに暗号化保存されます。

### コストと注意点(正直な話)

- レシピ1回の生成は数円程度ですが、従量課金なので使った分だけ請求されます。Console側で**利用上限(Spend Limit)を設定しておくことを強く推奨**します。
- この構成は「自分専用アプリ」前提です。**App Storeで一般公開する場合、各ユーザーに自分のAPIキーを入れさせる設計は現実的でなく、アプリにキーを埋め込むのは抽出されるためNGです。** 公開するなら自前のバックエンド(プロキシサーバー)経由でAPIを呼ぶ構成に変更してください。

---

## 3. 実機(自分のiPhone)へのデプロイ

**重要な制約:** EC2 Macインスタンスは AWS のデータセンターにある実機です。物理的に USB ケーブルで自分の iPhone を接続することができません。そのため、通常Macで使われる「iPhoneをUSB接続して無料Apple IDのまま⌘Rで実機インストール」という手順は、EC2 Macでは基本的に使えません。

現実的な方法は次の1択です。

### Apple Developer Program(年額 $99 / 約15,000円)+ TestFlight

ケーブル不要・インターネット経由で配布できるため、リモートのEC2 Macと相性の良い方法です。無料アカウント運用に比べて費用はかかりますが、EC2 Macを使う時点でAWS利用料も発生しているので、素直にこちらへ加入するのが結果的にシンプルです。

1. https://developer.apple.com/programs/ で Apple Developer Program に登録(年額 $99)。反映まで数時間〜1日程度かかることがあります
2. Xcode → Settings → Accounts で登録したApple IDでサインインし、Teamが有料プログラムのもの(個人名 + "(Personal Team)" ではない方)になっていることを確認
3. プロジェクトナビゲータ → TARGETS `RecipeKeeper` → **Signing & Capabilities**:
   - Automatically manage signing: オン
   - Team: 手順2のチームを選択
   - Bundle Identifier が他と重複しているとエラーになるので、その場合は末尾に数字を足すなどして変更
4. Xcode で Product → **Archive**(この時点でシミュレータではなく "Any iOS Device" をビルド先に選んでおく)
5. Organizer が開いたら **Distribute App → TestFlight & App Store Connect** → Upload
6. https://appstoreconnect.apple.com でアプリの情報(名前・プライバシー情報など最低限)を登録し、アップロードしたビルドと紐付け
7. TestFlight タブで**内部テスターとして自分(および家族)のApple IDを招待**(内部テスターなら審査不要・最大100人、数分で使えるようになります)
8. iPhone に **TestFlightアプリ**(App Store)をインストール → 届いた招待メール、またはTestFlightアプリ内の通知から「インストール」
9. コードを変更するたびに手順4〜5を繰り返してビルドを上げ直せば、TestFlight経由で最新版がiPhoneに反映されます(各ビルドは90日間有効、審査不要)

**メリット:** USB不要、7日制限なし、家族への配布も同じ手順、そのままApp Store公開への導線にもなる。

### (参考)無料Apple IDでの直接インストールが使えない理由

通常のMacであれば無料Apple IDでもUSB接続だけで7日間有効なインストールが可能ですが、**EC2 MacインスタンスにはUSBポートへの物理アクセスがないため、この方法は使えません**。ローカルのiPhoneをネットワーク経由でリモートMacにUSB転送する商用ツール(usbfluxdなど)も存在しますが、セットアップが煩雑で安定性にも難があり、本書では扱いません。素直にDeveloper Programに加入してTestFlightを使うことを推奨します。

### App Store公開する場合

1. 上記と同様に Archive → App Store Connect へアップロード
2. App Store Connect でスクリーンショット、説明文、プライバシー情報を登録
3. 審査に提出(通常1〜3日)
4. **前述の通り、公開するならAPIキーの扱いをバックエンド経由に変更してからにしてください。** また、AI生成コンテンツを含むアプリは審査で用途の説明を求められることがあります。

---

## 4. 既知の制限・今後の改善候補

- **バックアップ**: データは端末内のみ。iPhoneのiCloudバックアップに含まれますが、機種変更時の明示的なエクスポート機能はありません。CloudKit連携(SwiftDataの`ModelConfiguration`でiCloud同期)を足すのが次の一手です。
- **食材フィルタは文字列の部分一致**です。「鶏」で鶏もも・鶏むねに一致する半面、表記ゆれ(「たまねぎ/玉ねぎ」)は別物扱いになります。厳密にやるなら食材マスタの正規化が必要です。
- **AI生成はネットワーク必須**で、レスポンスに数秒〜十数秒かかります。
- 手書きレシピは写真として保存するだけで、**文字起こし(OCR)はしません**。やりたければVision framework、またはClaude APIの画像入力で拡張できます。

## ファイル構成

```
RecipeKeeper/
├── README.md                     ← このファイル
├── CLAUDE.md                     ← Claude Code向けの開発ガイド
└── RecipeKeeper/
    ├── RecipeKeeperApp.swift     ← エントリポイント + タブ構成
    ├── Models.swift              ← Recipe / CookLog(SwiftData)
    ├── RecipeListView.swift      ← 一覧・検索・ジャンル/食材フィルタ
    ├── RecipeDetailView.swift    ← 詳細・作った記録・工夫メモ
    ├── RecipeEditView.swift      ← 追加/編集・写真(ライブラリ/カメラ)
    ├── AIGenerateView.swift      ← 食材からAIレシピ生成
    ├── ClaudeService.swift       ← Claude API呼び出し + Keychain
    └── SettingsView.swift        ← 常備調味料・APIキー管理
```
