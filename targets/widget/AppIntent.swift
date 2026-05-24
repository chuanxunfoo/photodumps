import AppIntents
import WidgetKit

private let appGroupId = "group.com.yourname.dumpitapp.widgets"
private let manifestKey = "pd_widget_manifest"

struct ManifestItem: Codable {
    let id: String
    let templateId: String?
    let caption: String?
}

struct WidgetDesignEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Design")
    static var defaultQuery = WidgetDesignQuery()

    var id: String
    var displayName: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(displayName)")
    }
}

struct WidgetDesignQuery: EntityQuery {
    func entities(for identifiers: [WidgetDesignEntity.ID]) async throws -> [WidgetDesignEntity] {
        loadDesigns().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [WidgetDesignEntity] {
        let designs = loadDesigns()
        if designs.isEmpty {
            return [WidgetDesignEntity(id: "none", displayName: "Save a widget in Dumplt first")]
        }
        return designs
    }

    func defaultResult() async -> WidgetDesignEntity? {
        loadDesigns().first
    }
}

func loadDesigns() -> [WidgetDesignEntity] {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let json = defaults.string(forKey: manifestKey),
          let data = json.data(using: .utf8),
          let items = try? JSONDecoder().decode([ManifestItem].self, from: data) else {
        return []
    }
    return items.map { item in
        let label = (item.caption?.isEmpty == false) ? item.caption! : (item.templateId ?? "My widget")
        return WidgetDesignEntity(id: item.id, displayName: label)
    }
}

struct SelectWidgetDesignIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose design"
    static var description = IntentDescription("Pick which saved Dumplt widget to show.")

    @Parameter(title: "Design")
    var design: WidgetDesignEntity?
}
