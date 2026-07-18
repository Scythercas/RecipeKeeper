import SwiftUI
import SwiftData
import PhotosUI

struct RecipeEditView: View {
    // nil のときは新規作成
    let recipe: Recipe?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var genre = Genre.washoku.rawValue
    @State private var sourceURL = ""
    @State private var ingredientsText = ""   // 1行1項目
    @State private var seasoningsText = ""
    @State private var stepsText = ""
    @State private var memo = ""
    @State private var dishPhotos: [Data] = []
    @State private var handwrittenPhotos: [Data] = []

    var body: some View {
        Form {
            Section("基本情報") {
                TextField("レシピ名", text: $title)
                Picker("ジャンル", selection: $genre) {
                    ForEach(Genre.allCases) { Text($0.rawValue).tag($0.rawValue) }
                }
                TextField("参考サイトURL(任意)", text: $sourceURL)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }

            Section("食材(1行に1つ)") {
                TextField("例:\n鶏もも肉 300g\n玉ねぎ 1個",
                          text: $ingredientsText, axis: .vertical)
                    .lineLimit(3...10)
            }

            Section("調味料(1行に1つ)") {
                TextField("例:\n醤油 大さじ2\nみりん 大さじ1",
                          text: $seasoningsText, axis: .vertical)
                    .lineLimit(2...8)
            }

            Section("手順(1行に1ステップ)") {
                TextField("例:\n鶏肉を一口大に切る\nフライパンで焼く",
                          text: $stepsText, axis: .vertical)
                    .lineLimit(3...12)
            }

            Section("完成写真") {
                PhotoAttachEditor(photos: $dishPhotos)
            }

            Section("手書きレシピの写真") {
                PhotoAttachEditor(photos: $handwrittenPhotos)
            }

            Section("メモ") {
                TextField("自由メモ", text: $memo, axis: .vertical)
                    .lineLimit(2...6)
            }
        }
        .navigationTitle(recipe == nil ? "新規レシピ" : "レシピを編集")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("キャンセル") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("保存") { save() }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .onAppear(perform: load)
    }

    private func load() {
        guard let r = recipe else { return }
        title = r.title
        genre = r.genre
        sourceURL = r.sourceURL
        ingredientsText = r.ingredients.joined(separator: "\n")
        seasoningsText = r.seasonings.joined(separator: "\n")
        stepsText = r.steps.joined(separator: "\n")
        memo = r.memo
        dishPhotos = r.dishPhotos
        handwrittenPhotos = r.handwrittenPhotos
    }

    private func lines(_ text: String) -> [String] {
        text.split(separator: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    private func save() {
        let target = recipe ?? Recipe()
        target.title = title.trimmingCharacters(in: .whitespaces)
        target.genre = genre
        target.sourceURL = sourceURL.trimmingCharacters(in: .whitespaces)
        target.ingredients = lines(ingredientsText)
        target.seasonings = lines(seasoningsText)
        target.steps = lines(stepsText)
        target.memo = memo
        target.dishPhotos = dishPhotos
        target.handwrittenPhotos = handwrittenPhotos
        if recipe == nil { context.insert(target) }
        dismiss()
    }
}

// MARK: - 写真の追加・削除UI(ライブラリ + カメラ)
struct PhotoAttachEditor: View {
    @Binding var photos: [Data]
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showingCamera = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !photos.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(photos.enumerated()), id: \.offset) { index, data in
                            if let ui = UIImage(data: data) {
                                Image(uiImage: ui)
                                    .resizable().scaledToFill()
                                    .frame(width: 80, height: 80)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .overlay(alignment: .topTrailing) {
                                        Button {
                                            photos.remove(at: index)
                                        } label: {
                                            Image(systemName: "xmark.circle.fill")
                                                .foregroundStyle(.white, .black.opacity(0.6))
                                        }
                                        .padding(2)
                                    }
                            }
                        }
                    }
                }
            }
            HStack {
                PhotosPicker(selection: $pickerItems, maxSelectionCount: 5, matching: .images) {
                    Label("ライブラリ", systemImage: "photo.on.rectangle")
                }
                .buttonStyle(.bordered)

                Button {
                    showingCamera = true
                } label: {
                    Label("カメラ", systemImage: "camera")
                }
                .buttonStyle(.bordered)
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task {
                for item in items {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let compressed = compress(data) {
                        photos.append(compressed)
                    }
                }
                pickerItems = []
            }
        }
        .sheet(isPresented: $showingCamera) {
            CameraPicker { image in
                if let data = image.jpegData(compressionQuality: 0.7) {
                    photos.append(data)
                }
            }
            .ignoresSafeArea()
        }
    }

    /// 保存容量節約のためリサイズ + JPEG圧縮
    private func compress(_ data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let maxSide: CGFloat = 1600
        let scale = min(1, maxSide / max(image.size.width, image.size.height))
        let newSize = CGSize(width: image.size.width * scale,
                             height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.7)
    }
}

// MARK: - カメラ(UIImagePickerControllerのラッパー)
struct CameraPicker: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.onCapture(image)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
