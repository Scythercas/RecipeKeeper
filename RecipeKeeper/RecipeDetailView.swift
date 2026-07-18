import SwiftUI
import SwiftData

struct RecipeDetailView: View {
    @Bindable var recipe: Recipe
    @Environment(\.modelContext) private var context

    @State private var showingEdit = false
    @State private var showingCookSheet = false
    @State private var newTweak = ""

    var body: some View {
        List {
            // 完成写真
            if !recipe.dishPhotos.isEmpty {
                Section {
                    PhotoCarousel(photos: recipe.dishPhotos)
                        .listRowInsets(EdgeInsets())
                }
            }

            // 基本情報
            Section {
                HStack {
                    Text(recipe.genre)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Color(.systemGray6)).clipShape(Capsule())
                    Spacer()
                    Label("\(recipe.cookCount)回作った", systemImage: "flame")
                        .foregroundStyle(.orange)
                }
                if let url = URL(string: recipe.sourceURL), !recipe.sourceURL.isEmpty {
                    Link(destination: url) {
                        Label("参考サイトを開く", systemImage: "safari")
                    }
                }
            }

            // 手書きレシピ写真
            if !recipe.handwrittenPhotos.isEmpty {
                Section("手書きレシピ") {
                    PhotoCarousel(photos: recipe.handwrittenPhotos)
                        .listRowInsets(EdgeInsets())
                }
            }

            if !recipe.ingredients.isEmpty {
                Section("食材") {
                    ForEach(recipe.ingredients, id: \.self) { Text($0) }
                }
            }
            if !recipe.seasonings.isEmpty {
                Section("調味料") {
                    ForEach(recipe.seasonings, id: \.self) { Text($0) }
                }
            }
            if !recipe.steps.isEmpty {
                Section("手順") {
                    ForEach(Array(recipe.steps.enumerated()), id: \.offset) { i, step in
                        HStack(alignment: .top, spacing: 10) {
                            Text("\(i + 1)")
                                .font(.caption.bold())
                                .frame(width: 22, height: 22)
                                .background(Color.accentColor.opacity(0.15))
                                .clipShape(Circle())
                            Text(step)
                        }
                    }
                }
            }
            if !recipe.memo.isEmpty {
                Section("メモ") { Text(recipe.memo) }
            }

            // 調理記録と工夫
            Section("調理記録・工夫") {
                if recipe.cookLogs.isEmpty {
                    Text("まだ記録がありません")
                        .foregroundStyle(.secondary)
                }
                ForEach(recipe.cookLogs.sorted { $0.date > $1.date }) { log in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(log.date, format: .dateTime.year().month().day())
                            .font(.caption).foregroundStyle(.secondary)
                        if !log.tweak.isEmpty {
                            Label(log.tweak, systemImage: "lightbulb")
                                .font(.subheadline)
                        }
                    }
                }
                .onDelete { indexSet in
                    let sorted = recipe.cookLogs.sorted { $0.date > $1.date }
                    for i in indexSet { context.delete(sorted[i]) }
                }
            }
        }
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("編集") { showingEdit = true }
            }
        }
        .safeAreaInset(edge: .bottom) {
            Button {
                newTweak = ""
                showingCookSheet = true
            } label: {
                Label("作った！", systemImage: "frying.pan")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .padding()
            .background(.ultraThinMaterial)
        }
        .sheet(isPresented: $showingEdit) {
            NavigationStack { RecipeEditView(recipe: recipe) }
        }
        .sheet(isPresented: $showingCookSheet) {
            NavigationStack {
                Form {
                    Section("今回の工夫(任意)") {
                        TextField("例: 砂糖を半分にして蜂蜜を追加",
                                  text: $newTweak, axis: .vertical)
                            .lineLimit(3...6)
                    }
                }
                .navigationTitle("調理を記録")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("キャンセル") { showingCookSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("記録") {
                            let log = CookLog(tweak: newTweak.trimmingCharacters(in: .whitespacesAndNewlines))
                            log.recipe = recipe
                            context.insert(log)
                            showingCookSheet = false
                        }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }
}

struct PhotoCarousel: View {
    let photos: [Data]

    var body: some View {
        TabView {
            ForEach(Array(photos.enumerated()), id: \.offset) { _, data in
                if let ui = UIImage(data: data) {
                    Image(uiImage: ui)
                        .resizable().scaledToFill()
                        .frame(maxWidth: .infinity)
                        .clipped()
                }
            }
        }
        .tabViewStyle(.page)
        .frame(height: 220)
    }
}
