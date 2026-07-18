import Foundation
import SwiftData

// MARK: - 料理ジャンル
enum Genre: String, CaseIterable, Identifiable {
    case washoku = "和食"
    case yoshoku = "洋食"
    case chuka = "中華"
    case korean = "韓国"
    case ethnic = "エスニック"
    case italian = "イタリアン"
    case dessert = "デザート"
    case other = "その他"

    var id: String { rawValue }
}

// MARK: - レシピ本体
@Model
final class Recipe {
    var title: String
    var genre: String                 // Genre.rawValue を保存(自由入力も許容)
    var sourceURL: String             // 参考にしたサイトのURL(任意)
    var ingredients: [String]         // 食材
    var seasonings: [String]          // 調味料
    var steps: [String]               // 手順
    var memo: String                  // 自由メモ
    var isAIGenerated: Bool           // AI生成レシピかどうか
    var createdAt: Date

    // 写真はDBファイル肥大化を防ぐため外部ストレージに保存
    @Attribute(.externalStorage) var dishPhotos: [Data]         // 完成写真
    @Attribute(.externalStorage) var handwrittenPhotos: [Data]  // 手書きレシピの写真

    @Relationship(deleteRule: .cascade, inverse: \CookLog.recipe)
    var cookLogs: [CookLog]

    init(
        title: String = "",
        genre: String = Genre.washoku.rawValue,
        sourceURL: String = "",
        ingredients: [String] = [],
        seasonings: [String] = [],
        steps: [String] = [],
        memo: String = "",
        isAIGenerated: Bool = false,
        dishPhotos: [Data] = [],
        handwrittenPhotos: [Data] = []
    ) {
        self.title = title
        self.genre = genre
        self.sourceURL = sourceURL
        self.ingredients = ingredients
        self.seasonings = seasonings
        self.steps = steps
        self.memo = memo
        self.isAIGenerated = isAIGenerated
        self.createdAt = .now
        self.dishPhotos = dishPhotos
        self.handwrittenPhotos = handwrittenPhotos
        self.cookLogs = []
    }

    /// 作った回数
    var cookCount: Int { cookLogs.count }

    /// 最後に作った日
    var lastCooked: Date? { cookLogs.map(\.date).max() }
}

// MARK: - 調理記録(1回作るごとに1件。工夫メモを添付できる)
@Model
final class CookLog {
    var date: Date
    var tweak: String        // レシピにない工夫の記録
    var recipe: Recipe?

    init(date: Date = .now, tweak: String = "") {
        self.date = date
        self.tweak = tweak
    }
}
