/// Bridge Contract v1 types. Field names and JSON shape are frozen; see the spec's "Bridge Contract".
struct Rect: Codable, Equatable, Sendable {
  var x: Double
  var y: Double
  var width: Double
  var height: Double
}

struct Insets: Codable, Equatable, Sendable {
  var top: Double
  var right: Double
  var bottom: Double
  var left: Double
}

enum SizeClass: String, Codable, Sendable {
  case compact
  case regular
}

struct BridgeState: Codable, Equatable, Sendable {
  var fold: Rect?
  var sizeClass: SizeClass
  var safeArea: Insets
  var layoutMargins: Insets

  private enum CodingKeys: String, CodingKey { case fold, sizeClass, safeArea, layoutMargins }

  // Synthesized Codable omits nil keys; the contract requires an explicit `"fold": null`.
  func encode(to encoder: any Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(fold, forKey: .fold)
    try container.encode(sizeClass, forKey: .sizeClass)
    try container.encode(safeArea, forKey: .safeArea)
    try container.encode(layoutMargins, forKey: .layoutMargins)
  }
}
