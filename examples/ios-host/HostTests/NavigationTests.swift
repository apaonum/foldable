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

  @Test func theHostDelegateStillGetsEveryCallback() async throws {
    let page = try await HostedPage(inputs: .book)
    var policyAsked = false
    page.navigation.beforeAllowing = { policyAsked = true }

    try await page.load()

    // load() itself waits on the Host delegate's didFinish.
    #expect(policyAsked)
    #expect(page.navigation.commits == 2)
  }

  @Test func aHostDelegateSetLaterKeepsGettingCallbacksAndPushes() async throws {
    let page = try await HostedPage(inputs: .book)
    let replacement = NavigationWaiter()
    page.web.navigationDelegate = replacement

    page.web.loadHTMLString("<p>next", baseURL: URL(string: "https://test.localhost/next"))
    try await replacement.finished()

    #expect(replacement.commits == 1)
    let seq = try await page.eval("return window.__foldableBridge.seq") as? Int
    #expect(seq == 3)
  }

  @Test func aChangeBeforeCommitIsSeededIntoTheNewPage() async throws {
    let page = try await HostedPage(inputs: .flat)
    page.navigation.beforeAllowing = {
      page.inputs = .tabletop
      page.web.setNeedsLayout()
      try await page.settle()
    }

    try await page.load()

    let seen = try await page.eval("return window.seenAtParse") as? String
    #expect(seen == "tabletop")
  }

  @Test func aChangeAfterCommitIsVisibleOnTheNewPage() async throws {
    let page = try await HostedPage(inputs: .flat)
    page.navigation.onCommit = {
      page.inputs = .book
      page.web.setNeedsLayout()
    }

    try await page.load()
    try await page.settle()

    let posture =
      try await page.eval("return document.documentElement.dataset.foldablePosture") as? String
    #expect(posture == "book")
  }

  @Test func hostScriptsKeepTheirOrderAcrossManySeedReplacements() async throws {
    let page = try await HostedPage(inputs: .flat, hostScripts: [hostScript("a"), hostScript("b")])
    let ucc = page.web.configuration.userContentController
    let added = hostScript("c")
    ucc.addUserScript(added)
    let host = ucc.userScripts.filter { !$0.source.hasPrefix(bootstrapSource) }

    for inputs in Array(repeating: [NativeInputs.book, .tabletop, .flat], count: 10).joined() {
      page.inputs = inputs
      page.web.setNeedsLayout()
      try await page.settle()
    }
    try await page.load()

    let scripts = ucc.userScripts
    #expect(scripts.count == 4)
    #expect(zip(scripts, host).allSatisfy { $0 === $1 })
    #expect(scripts.last?.source.hasPrefix(bootstrapSource) == true)
    let ran = try await page.eval("return [window.hostOrder.join(''), window.seenAtParse]")
    #expect(ran as? [String] == ["abc", "none"])
  }

  private func hostScript(_ name: String) -> WKUserScript {
    WKUserScript(
      source: "(window.hostOrder ??= []).push('\(name)');", injectionTime: .atDocumentStart,
      forMainFrameOnly: true)
  }
}
