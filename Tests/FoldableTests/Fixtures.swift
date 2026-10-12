import Foundation
import Testing

@testable import Foldable

/// Repo-root `fixtures/` can't be a SwiftPM resource, so tests read it by path.
let bridgeFixturesDirectory = URL(fileURLWithPath: #filePath)
  .deletingLastPathComponent()
  .deletingLastPathComponent()
  .deletingLastPathComponent()
  .appendingPathComponent("fixtures/bridge")

struct BridgeFixture: Sendable, CustomTestStringConvertible {
  let name: String
  let nativeInputs: NativeInputs
  /// Canonical JSON of the fixture's `snapshot`, so comparisons check key names and `null` too.
  let snapshotJSON: String

  var testDescription: String { name }

  private struct File: Decodable {
    let name: String
    let nativeInputs: NativeInputs
  }

  init(url: URL) throws {
    let data = try Data(contentsOf: url)
    let file = try JSONDecoder().decode(File.self, from: data)
    let raw = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
    name = file.name
    nativeInputs = file.nativeInputs
    snapshotJSON = try canonicalJSON(fromObject: #require(raw["snapshot"]))
  }

  static func all() throws -> [BridgeFixture] {
    try FileManager.default
      .contentsOfDirectory(at: bridgeFixturesDirectory, includingPropertiesForKeys: nil)
      .filter { $0.pathExtension == "json" }
      .sorted { $0.lastPathComponent < $1.lastPathComponent }
      .map(BridgeFixture.init(url:))
  }
}

func canonicalJSON(fromObject object: Any) throws -> String {
  let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
  return String(decoding: data, as: UTF8.self)
}

func canonicalJSON(_ value: some Encodable) throws -> String {
  try canonicalJSON(fromObject: JSONSerialization.jsonObject(with: JSONEncoder().encode(value)))
}
