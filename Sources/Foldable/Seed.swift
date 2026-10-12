import Foundation

/// The bootstrap IIFE built from `packages/core` (ADR 0001). Never hand-edit; rebuild it.
let bootstrapSource: String = {
  guard let url = Bundle.module.url(forResource: "bootstrap", withExtension: "js"),
    let source = try? String(contentsOf: url, encoding: .utf8)
  else { fatalError("Foldable: bundled bootstrap.js is missing from the package resources") }
  return source
}()

/// The seed is always `seq` 1; the bootstrap global starts at 0, and live pushes continue from here.
let seedSeq = 1

/// Bootstrap plus the current state. The snapshot is embedded as a JSON literal, which is
/// valid JS, so no string escaping of values is needed.
func seedSource(for state: BridgeState) throws -> String {
  let encoder = JSONEncoder()
  encoder.outputFormatting = [.sortedKeys]
  let json = String(decoding: try encoder.encode(SeqSnapshot(state: state, seq: seedSeq)), as: UTF8.self)
  return bootstrapSource + "\nwindow.__foldableBridge.receive(\(json));\n"
}

/// Wire form of a push: the full state plus `seq`, flattened into one object.
struct SeqSnapshot: Encodable {
  var state: BridgeState
  var seq: Int

  private enum CodingKeys: String, CodingKey { case seq }

  func encode(to encoder: any Encoder) throws {
    try state.encode(to: encoder)
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(seq, forKey: .seq)
  }
}
