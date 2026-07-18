import SwiftUI
import SwiftData

struct AIGenerateView: View {
    @Environment(\.modelContext) private var context
    @AppStorage("defaultSeasonings") private var defaultSeasoningsRaw = ""

    @State private var ingredientsText = ""
    @State private var requestNote = ""
    @State private var useDefaultSeasonings = true
    @State private var isLoading = false
    @State private var generated: GeneratedRecipe?
    @State private var errorMessage: String?
    @State private var savedAlert = false

    private var defaultSeasonings: [String] {
        defaultSeasoningsRaw
            .split(separator: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("今ある食材・調味料(1行に1つ)") {
                    TextField("例:\n鶏むね肉\nキャベツ\nオイスターソース",
                              text: $ingredientsText, axis: .vertical)
                        .lineLimit(4...10)
                }

                Section {
                    Toggle("常備調味料を使う前提にする", isOn: $useDefaultSeasonings)
                    if useDefaultSeasonings {
                        if defaultSeasonings.isEmpty {
                            Text("常備調味料が未設定です。設定タブで登録できます。")
                                .font(.caption).foregroundStyle(.orange)
                        } else {
                            Text(defaultSeasonings.joined(separator: "、"))
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }

                Section("リクエスト(任意)") {
                    TextField("例: さっぱりした味 / 15分以内 / 子ども向け",
                              text: $requestNote, axis: .vertical)
                        .lineLimit(1...3)
                }

                Section {
                    Button {
                        Task { await generate() }
                    } label: {
                        HStack {
                            Spacer()
                            if isLoading {
                                ProgressView().padding(.trailing, 4)
                                Text("生成中…")
                            } else {
                                Label("レシピを生成", systemImage: "sparkles")
                            }
                            Spacer()
                        }
                    }
                    .disabled(isLoading ||
                              ingredientsText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red).font(.subheadline)
                    }
                }

                if let recipe = generated {
                    generatedSection(recipe)
                }
            }
            .navigationTitle("AIレシピ生成")
            .alert("レシピに保存しました", isPresented: $savedAlert) {
                Button("OK") {}
            }
        }
    }

    @ViewBuilder
    private func generatedSection(_ recipe: GeneratedRecipe) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "sparkles").foregroundStyle(.purple)
                    Text(recipe.title).font(.headline)
                }
                Text(recipe.genre)
                    .font(.caption)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(Color(.systemGray6)).clipShape(Capsule())
            }
        }
        Section("食材") {
            ForEach(recipe.ingredients, id: \.self) { Text($0) }
        }
        Section("調味料") {
            ForEach(recipe.seasonings, id: \.self) { Text($0) }
        }
        Section("手順") {
            ForEach(Array(recipe.steps.enumerated()), id: \.offset) { i, step in
                Text("\(i + 1). \(step)")
            }
        }
        if !recipe.point.isEmpty {
            Section("ポイント") {
                Label(recipe.point, systemImage: "lightbulb")
            }
        }
        Section {
            Button {
                saveGenerated(recipe)
            } label: {
                Label("このレシピを保存", systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private func generate() async {
        errorMessage = nil
        generated = nil
        isLoading = true
        defer { isLoading = false }

        let ingredients = ingredientsText
            .split(separator: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        do {
            generated = try await ClaudeService.generateRecipe(
                availableIngredients: ingredients,
                defaultSeasonings: useDefaultSeasonings ? defaultSeasonings : [],
                requestNote: requestNote
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveGenerated(_ g: GeneratedRecipe) {
        let recipe = Recipe(
            title: g.title,
            genre: g.genre,
            ingredients: g.ingredients,
            seasonings: g.seasonings,
            steps: g.steps,
            memo: g.point.isEmpty ? "" : "ポイント: \(g.point)",
            isAIGenerated: true
        )
        context.insert(recipe)
        savedAlert = true
        generated = nil
        ingredientsText = ""
        requestNote = ""
    }
}
