import SwiftUI
import SwiftData

@main
struct RecipeKeeperApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Recipe.self, CookLog.self])
    }
}

struct ContentView: View {
    var body: some View {
        TabView {
            RecipeListView()
                .tabItem { Label("レシピ", systemImage: "book") }

            AIGenerateView()
                .tabItem { Label("AIで作る", systemImage: "sparkles") }

            SettingsView()
                .tabItem { Label("設定", systemImage: "gearshape") }
        }
    }
}
