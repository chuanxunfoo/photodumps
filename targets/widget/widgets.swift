import WidgetKit
import SwiftUI
import UIKit

private let appGroupId = "group.com.yourname.dumpitapp.widgets"
private let activeIdKey = "pd_active_widget_id"
private let activeCaptionKey = "pd_active_caption"
private let activePreviewB64Key = "pd_active_preview_b64"
private let manifestKey = "pd_widget_manifest"

struct PhotodumpsWidgetEntry: TimelineEntry {
    let date: Date
    let image: UIImage?
    let caption: String?
}

struct PhotodumpsProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> PhotodumpsWidgetEntry {
        PhotodumpsWidgetEntry(date: Date(), image: nil, caption: "Dumplt")
    }

    func snapshot(for configuration: SelectWidgetDesignIntent, in context: Context) async -> PhotodumpsWidgetEntry {
        loadEntry(configuration: configuration)
    }

    func timeline(for configuration: SelectWidgetDesignIntent, in context: Context) async -> Timeline<PhotodumpsWidgetEntry> {
        let entry = loadEntry(configuration: configuration)
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60 * 30)))
    }

    private func loadEntry(configuration: SelectWidgetDesignIntent) -> PhotodumpsWidgetEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let widgetId = configuration.design?.id
            ?? defaults?.string(forKey: activeIdKey)
        let caption = configuration.design?.displayName
            ?? defaults?.string(forKey: activeCaptionKey)
        let image = loadImage(widgetId: widgetId, defaults: defaults)
        return PhotodumpsWidgetEntry(date: Date(), image: image, caption: caption)
    }

    private func loadImage(widgetId: String?, defaults: UserDefaults?) -> UIImage? {
        guard let widgetId = widgetId, widgetId != "none" else { return nil }

        if let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) {
            let url = container.appendingPathComponent("previews/\(widgetId).png")
            if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
                return img
            }
        }

        if let defaults = defaults,
           widgetId == defaults.string(forKey: activeIdKey),
           let b64 = defaults.string(forKey: activePreviewB64Key),
           let data = Data(base64Encoded: b64),
           let img = UIImage(data: data) {
            return img
        }

        return nil
    }
}

struct PhotodumpsWidgetView: View {
    var entry: PhotodumpsProvider.Entry

    var body: some View {
        ZStack {
            if let image = entry.image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                LinearGradient(
                    colors: [Color(red: 0.23, green: 0.36, blue: 0.99), Color(red: 0.08, green: 0.08, blue: 0.13)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                VStack(spacing: 6) {
                    Text("Dumplt")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("Open Dumplt → save a widget → Edit this widget to pick a design")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.85))
                        .multilineTextAlignment(.center)
                }
                .padding(10)
            }
        }
        .clipped()
        .containerBackground(for: .widget) {
            Color.clear
        }
    }
}

struct PhotodumpsStickerWidget: Widget {
    let kind: String = "PhotodumpsStickerWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectWidgetDesignIntent.self, provider: PhotodumpsProvider()) { entry in
            PhotodumpsWidgetView(entry: entry)
        }
        .configurationDisplayName("Dumplt")
        .description("Shows a sticker widget you saved in Dumplt.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

#Preview(as: .systemSmall) {
    PhotodumpsStickerWidget()
} timeline: {
    PhotodumpsWidgetEntry(date: .now, image: nil, caption: nil)
}
