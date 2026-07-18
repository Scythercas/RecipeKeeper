import Foundation
import Security

// MARK: - AI生成レシピの受け皿
struct GeneratedRecipe: Decodable {
    let title: String
    let genre: String
    let ingredients: [String]
    let seasonings: [String]
    let steps: [String]
    let point: String   // ワンポイントアドバイス
}

enum ClaudeServiceError: LocalizedError {
    case noAPIKey
    case badResponse(String)
    case parseFailed

    var errorDescription: String? {
        switch self {
        case .noAPIKey:
            return "APIキーが未設定です。設定タブから登録してください。"
        case .badResponse(let detail):
            return "APIエラー: \(detail)"
        case .parseFailed:
            return "レシピの解析に失敗しました。もう一度お試しください。"
        }
    }
}

// MARK: - Claude API 呼び出し
struct ClaudeService {

    static func generateRecipe(
        availableIngredients: [String],
        defaultSeasonings: [String],
        requestNote: String
    ) async throws -> GeneratedRecipe {

        guard let apiKey = KeychainHelper.load(key: "anthropic_api_key"),
              !apiKey.isEmpty else {
            throw ClaudeServiceError.noAPIKey
        }

        let seasoningNote = defaultSeasonings.isEmpty
            ? "特になし"
            : defaultSeasonings.joined(separator: "、")

        let prompt = """
        あなたは家庭料理のレシピ作成アシスタントです。以下の条件でレシピを1つ考えてください。

        ## 手元にある食材
        \(availableIngredients.joined(separator: "、"))

        ## 常備している調味料(これらは追加購入なしで使える前提)
        \(seasoningNote)

        ## リクエスト
        \(requestNote.isEmpty ? "特になし" : requestNote)

        ## 条件
        - 上記の食材と常備調味料だけで作れること(足りない材料を要求しない)
        - 分量は2人分を目安に具体的に書く
        - 手順は家庭で再現しやすい粒度で書く

        ## 出力形式
        次のJSONのみを出力してください。前置き・後書き・コードブロック記号は一切不要です。
        {
          "title": "レシピ名",
          "genre": "和食/洋食/中華/韓国/エスニック/イタリアン/デザート/その他 のいずれか",
          "ingredients": ["食材 分量", ...],
          "seasonings": ["調味料 分量", ...],
          "steps": ["手順1", "手順2", ...],
          "point": "ワンポイントアドバイス"
        }
        """

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.timeoutInterval = 60

        let body: [String: Any] = [
            "model": "claude-sonnet-4-6",
            "max_tokens": 1500,
            "messages": [["role": "user", "content": prompt]]
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw ClaudeServiceError.badResponse("不明なレスポンス")
        }
        guard http.statusCode == 200 else {
            let detail = String(data: data, encoding: .utf8) ?? "status \(http.statusCode)"
            throw ClaudeServiceError.badResponse("HTTP \(http.statusCode): \(detail.prefix(200))")
        }

        // レスポンスから text ブロックを抽出
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = json["content"] as? [[String: Any]] else {
            throw ClaudeServiceError.parseFailed
        }
        let text = content
            .filter { ($0["type"] as? String) == "text" }
            .compactMap { $0["text"] as? String }
            .joined()

        // 万一コードブロックで囲まれていた場合に備えて除去
        let cleaned = text
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard let recipeData = cleaned.data(using: .utf8),
              let recipe = try? JSONDecoder().decode(GeneratedRecipe.self, from: recipeData) else {
            throw ClaudeServiceError.parseFailed
        }
        return recipe
    }
}

// MARK: - APIキー保存用のKeychainヘルパー
// UserDefaultsは平文保存になるため、秘密情報はKeychainに保存する
enum KeychainHelper {

    static func save(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)  // 既存があれば削除して上書き

        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
