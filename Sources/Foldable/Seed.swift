import Foundation

/// The bootstrap IIFE built from `packages/core` (ADR 0001). Never hand-edit; rebuild it.
let bootstrapSource: String = {
  guard let url = Bundle.module.url(forResource: "bootstrap", withExtension: "js"),
    let source = try? String(contentsOf: url, encoding: .utf8)
  else { fatalError("Foldable: bundled bootstrap.js is missing from the package resources") }
  return source
}()

/// The seed is always `seq` 1; the bootstrap global starts one below (JS `SEED_SEQ - 1` in
/// bridge-global.ts), and live pushes continue from here. SeedTests guards the pair.
let seedSeq = 1

/// Bootstrap plus the current state. The snapshot is embedded as a JSON literal, which is
/// valid JS, so no string escaping of values is needed.
func seedSource(for state: BridgeState) throws -> String {
  let encoder = JSONEncoder()
  encoder.outputFormatting = [.sortedKeys]
  let json = String(
    decoding: try encoder.encode(SeqSnapshot(state: state, seq: seedSeq)), as: UTF8.self)
  return bootstrapSource + "\nwindow.__foldableBridge.receive(\(json));\n"
}

/// A push's `callAsyncJavaScript` argument. WebKit only accepts JSON-like Foundation values, so the
/// snapshot goes through the same encoder as the seed and is never built as a JS string.
func pushArgument(for state: BridgeState, seq: Int) throws -> [String: Any] {
  let data = try JSONEncoder().encode(SeqSnapshot(state: state, seq: seq))
  guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    preconditionFailure("SeqSnapshot always encodes to a JSON object")
  }
  return object
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

/// The Host's scripts in their original order, minus the current seed (matched by identity, never
/// by content), followed by the new seed. Generic so the ordering rule is testable without WebKit.
func replacingSeed<Script: AnyObject>(in scripts: [Script], current: Script?, with seed: Script)
  -> [Script]
{
  scripts.filter { $0 !== current } + [seed]
}
