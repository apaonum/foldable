import Testing
import UIKit
import WebKit

@testable import Foldable

/// The Bridge across reloads and navigations: seed replacement, the re-push after `didCommit`, and
/// coexistence with the Host's own navigation delegate and user scripts.
@MainActor @Suite(.serialized) struct NavigationTests {
  @Test func stateIsRePushedAfterEachCommit() async throws {
    let page = try await HostedPage(inputs: .book)

    try await page.load()

    // The seed is seq 1, the first load's commit pushed 2, this load's commit 3.
    let seq = try await page.eval("return window.__foldableBridge.seq") as? Int
    #expect(seq == 3)
  }
}
