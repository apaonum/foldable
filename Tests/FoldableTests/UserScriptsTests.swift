import Testing

@testable import Foldable

@Suite struct UserScriptsTests {
  final class Script {
    let name: String
    init(_ name: String) { self.name = name }
  }

  private let a = Script("a")
  private let b = Script("b")
  private let c = Script("c")

  @Test func firstAttachAppendsOneSeedAfterTheHostScriptsInOrder() {
    let seed = Script("seed")
    let result = replacingSeed(in: [a, b, c], current: nil, with: seed)
    #expect(result.map(\.name) == ["a", "b", "c", "seed"])
  }

  @Test func replacingRemovesTheOldSeedByIdentityAndKeepsHostOrder() {
    let old = Script("seed")
    let lookalike = Script("seed")
    let new = Script("seed2")
    let result = replacingSeed(in: [a, old, b, lookalike], current: old, with: new)
    #expect(
      result.map { ObjectIdentifier($0) } == [a, b, lookalike, new].map { ObjectIdentifier($0) })
  }
}
