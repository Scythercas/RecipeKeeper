import SwiftUI
import SwiftData

enum SortOrder: String, CaseIterable, Identifiable {
    case newest = "新しい順"
    case mostCooked = "作った回数順"
    case title = "名前順"
    var id: String { rawValue }
}

struct RecipeListView: View {
    @Query(sort: \Recipe.createdAt, order: .reverse) private var recipes: [Recipe]
    @Environment(\.modelContext) private var context

    @State private var searchText = ""
    @State private var selectedGenre: String? = nil
    @State private var ingredientFilter = ""
    @State private var sortOrder: SortOrder = .newest
    @State private var showingNewRecipe = false

    // フィルタ済みレシピ
    private var filtered: [Recipe] {
        var result = recipes

        if let genre = selectedGenre {
            result = result.filter { $0.genre == genre }
        }
        if !ingredientFilter.isEmpty {
            let keys = ingredientFilter
                .replacingOccurrences(of: "、", with: ",")
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
            // 入力した食材をすべて含むレシピに絞る(調味料も対象)
            result = result.filter { recipe in
                let all = (recipe.ingredients + recipe.seasonings).joined(separator: " ")
                return keys.allSatisfy { all.localizedCaseInsensitiveContains($0) }
            }
        }
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText)
                || $0.ingredients.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }
        switch sortOrder {
        case .newest:     result.sort { $0.createdAt > $1.createdAt }
        case .mostCooked: result.sort { $0.cookCount > $1.cookCount }
        case .title:      result.sort { $0.title < $1.title }
        }
        return result
    }

    // 登録済みレシピに実際に存在するジャンル一覧
    private var genresInUse: [String] {
        Array(Set(recipes.map(\.genre))).sorted()
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterBar
                List {
                    ForEach(filtered) { recipe in
                        NavigationLink(value: recipe) {
                            RecipeRow(recipe: recipe)
                        }
                    }
                    .onDelete { indexSet in
                        for i in indexSet { context.delete(filtered[i]) }
                    }
                }
                .overlay {
                    if filtered.isEmpty {
                        ContentUnavailableView(
                            recipes.isEmpty ? "レシピがありません" : "該当なし",
                            systemImage: "fork.knife",
                            description: Text(recipes.isEmpty
                                ? "右上の＋から追加するか、AIタブで生成できます"
                                : "フィルタ条件を変えてみてください")
                        )
                    }
                }
            }
            .navigationTitle("レシピ")
            .navigationDestination(for: Recipe.self) { RecipeDetailView(recipe: $0) }
            .searchable(text: $searchText, prompt: "レシピ名・食材で検索")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Picker("並び順", selection: $sortOrder) {
                            ForEach(SortOrder.allCases) { Text($0.rawValue).tag($0) }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingNewRecipe = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showingNewRecipe) {
                NavigationStack { RecipeEditView(recipe: nil) }
            }
        }
    }

    // ジャンル + 食材フィルタ
    private var filterBar: some View {
        VStack(spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "すべて", isSelected: selectedGenre == nil) {
                        selectedGenre = nil
                    }
                    ForEach(genresInUse, id: \.self) { genre in
                        FilterChip(label: genre, isSelected: selectedGenre == genre) {
                            selectedGenre = (selectedGenre == genre) ? nil : genre
                        }
                    }
                }
                .padding(.horizontal)
            }
            HStack {
                Image(systemName: "carrot")
                    .foregroundStyle(.secondary)
                TextField("使う食材で絞り込み(例: 鶏肉, なす)", text: $ingredientFilter)
                    .textFieldStyle(.roundedBorder)
                if !ingredientFilter.isEmpty {
                    Button { ingredientFilter = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }
}

struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.systemGray5))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct RecipeRow: View {
    let recipe: Recipe

    var body: some View {
        HStack(spacing: 12) {
            if let data = recipe.dishPhotos.first, let ui = UIImage(data: data) {
                Image(uiImage: ui)
                    .resizable().scaledToFill()
                    .frame(width: 56, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(.systemGray5))
                    .frame(width: 56, height: 56)
                    .overlay(Image(systemName: "fork.knife").foregroundStyle(.secondary))
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text(recipe.title).font(.headline).lineLimit(1)
                    if recipe.isAIGenerated {
                        Image(systemName: "sparkles")
                            .font(.caption).foregroundStyle(.purple)
                    }
                }
                HStack(spacing: 8) {
                    Text(recipe.genre)
                        .font(.caption)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color(.systemGray6))
                        .clipShape(Capsule())
                    if recipe.cookCount > 0 {
                        Label("\(recipe.cookCount)回", systemImage: "flame")
                            .font(.caption).foregroundStyle(.orange)
                    }
                }
            }
        }
    }
}
