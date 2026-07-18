import SwiftUI

struct SettingsView: View {
    @AppStorage("defaultSeasonings") private var defaultSeasoningsRaw = ""

    @State private var newSeasoning = ""
    @State private var apiKeyInput = ""
    @State private var apiKeySaved = KeychainHelper.load(key: "anthropic_api_key") != nil

    private var seasonings: [String] {
        defaultSeasoningsRaw
            .split(separator: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    var body: some View {
        NavigationStack {
            Form {
                // 常備調味料
                Section {
                    ForEach(seasonings, id: \.self) { item in
                        Text(item)
                    }
                    .onDelete { indexSet in
                        var list = seasonings
                        for i in indexSet { list.remove(at: i) }
                        defaultSeasoningsRaw = list.joined(separator: "\n")
                    }
                    HStack {
                        TextField("例: 醤油、味噌、ごま油…", text: $newSeasoning)
                            .onSubmit(addSeasoning)
                        Button("追加", action: addSeasoning)
                            .disabled(newSeasoning.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                } header: {
                    Text("常備調味料")
                } footer: {
                    Text("ここに登録した調味料は、AIレシピ生成時に「家にあるもの」として扱われます。")
                }

                // よくある調味料の一括登録
                if seasonings.isEmpty {
                    Section {
                        Button("基本の調味料をまとめて登録") {
                            defaultSeasoningsRaw = [
                                "醤油", "みりん", "料理酒", "砂糖", "塩", "こしょう",
                                "味噌", "酢", "サラダ油", "ごま油", "オリーブオイル",
                                "めんつゆ", "鶏ガラスープの素", "コンソメ", "マヨネーズ", "ケチャップ"
                            ].joined(separator: "\n")
                        }
                    }
                }

                // APIキー
                Section {
                    if apiKeySaved {
                        Label("APIキー設定済み", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Button("APIキーを削除", role: .destructive) {
                            KeychainHelper.delete(key: "anthropic_api_key")
                            apiKeySaved = false
                        }
                    } else {
                        SecureField("sk-ant-… を貼り付け", text: $apiKeyInput)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Button("保存") {
                            let trimmed = apiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            KeychainHelper.save(key: "anthropic_api_key", value: trimmed)
                            apiKeyInput = ""
                            apiKeySaved = true
                        }
                        .disabled(apiKeyInput.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                } header: {
                    Text("Anthropic APIキー")
                } footer: {
                    Text("AIレシピ生成に必要です。console.anthropic.com で発行し、ここに貼り付けてください。キーは端末のKeychainに保存され、外部には送信されません(Anthropic APIへのリクエスト時のみ使用)。利用量に応じてAPI料金が発生します。")
                }
            }
            .navigationTitle("設定")
        }
    }

    private func addSeasoning() {
        let trimmed = newSeasoning.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !seasonings.contains(trimmed) else {
            newSeasoning = ""
            return
        }
        defaultSeasoningsRaw = (seasonings + [trimmed]).joined(separator: "\n")
        newSeasoning = ""
    }
}
