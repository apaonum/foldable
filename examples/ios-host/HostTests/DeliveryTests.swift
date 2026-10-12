import Testing
import UIKit
import WebKit

@testable import Foldable

/// Bridge delivery on iOS WebKit, driven through the internal input closure so no Posture has to be
/// set by hand. Change signals are real: frame changes, safe-area changes and trait overrides.
@MainActor @Suite(.serialized) struct DeliveryTests {
  @Test func seedStateIsVisibleBeforeFirstPaint() async throws {
    let page = try await HostedPage(inputs: .book)

    let seen = try await page.eval(
      "return [window.seenAtParse, window.firstFrame, window.__foldableBridge.seq]")
    #expect(seen as? [String] == ["book", "book", "1"])
  }

  @Test func changedInputsArriveAsOnePushPerRunLoopTurn() async throws {
    let page = try await HostedPage(inputs: .flat)

    // Several signals with changing readings in one turn, as during a Posture change.
    for inputs in [NativeInputs.book, .bookCompact, .tabletop] {
      page.inputs = inputs
      page.web.frame = page.web.frame.insetBy(dx: 1, dy: 0)
      page.web.layoutIfNeeded()
    }
    page.owner.additionalSafeAreaInsets.top = 1
    page.owner.view.layoutIfNeeded()
    try await page.settle()

    let pushes = try await page.pushes()
    #expect(pushes == ["2:tabletop"])
    let value =
      try await page.eval("return document.documentElement.dataset.foldablePosture") as? String
    #expect(value == "tabletop")
  }

  @Test func unchangedInputsSendNothing() async throws {
    let page = try await HostedPage(inputs: .book)

    page.web.frame = page.web.frame.insetBy(dx: 10, dy: 10)
    page.owner.additionalSafeAreaInsets.top = 5
    page.flipSizeClass()
    page.owner.view.layoutIfNeeded()
    try await page.settle()

    let pushes = try await page.pushes()
    #expect(pushes == [])
  }

  @Test func eachChangeSignalPushesOnItsOwn() async throws {
    let page = try await HostedPage(inputs: .flat)

    // layoutSubviews alone: a Fold activating changes nothing but the next layout pass.
    page.inputs = .book
    page.web.setNeedsLayout()
    page.web.layoutIfNeeded()
    try await page.settle()
    // The Size Class trait alone.
    page.inputs = .bookCompact
    page.flipSizeClass()
    try await page.settle()
    // safeAreaInsetsDidChange alone. UIKit always pairs it with a layout pass, so call it directly.
    page.inputs = .tabletop
    page.web.safeAreaInsetsDidChange()
    try await page.settle()

    let pushes = try await page.pushes()
    #expect(pushes == ["2:book", "3:book", "4:tabletop"])
    let value = try await page.eval("return window.__foldableBridge.state.sizeClass") as? String
    #expect(value == "regular")
  }

  @Test func pageDropsAnOlderSeq() async throws {
    let page = try await HostedPage(inputs: .flat)
    page.inputs = .book
    page.web.setNeedsLayout()
    try await page.settle()

    let stale = try pushArgument(for: snapshot(from: .tabletop), seq: 1)
    _ = try await page.web.callAsyncJavaScript(
      "window.__foldableBridge.receive(s)", arguments: ["s": stale], contentWorld: .page)

    let pushes = try await page.pushes()
    #expect(pushes == ["2:book"])
    let value =
      try await page.eval("return document.documentElement.dataset.foldablePosture") as? String
    #expect(value == "book")
  }

  @Test func reloadSeedsTheLatestState() async throws {
    let page = try await HostedPage(inputs: .flat)
    page.inputs = .tabletop
    page.web.setNeedsLayout()
    try await page.settle()

    try await page.load()

    let value = try await page.eval("return window.seenAtParse") as? String
    #expect(value == "tabletop")
  }
}

extension NativeInputs {
  private static func inner(_ divisions: [Division], _ sizeClass: SizeClass) -> NativeInputs {
    NativeInputs(
      divisions: divisions, horizontalSizeClass: sizeClass,
      safeAreaInsets: Insets(top: 0, right: 84, bottom: 34, left: 0),
      layoutMargins: Insets(top: 0, right: 84, bottom: 34, left: 20),
      bounds: Rect(x: 0, y: 0, width: 951, height: 669), pageZoom: 1)
  }

  static let flat = inner(
    [.init(frame: Rect(x: 475.5, y: 0, width: 0, height: 669), isActive: false)], .regular)
  static let book = inner(
    [.init(frame: Rect(x: 455.5, y: 0, width: 40, height: 669), isActive: true)], .regular)
  static let bookCompact = inner(
    [.init(frame: Rect(x: 455.5, y: 0, width: 40, height: 669), isActive: true)], .compact)
  static let tabletop = inner(
    [.init(frame: Rect(x: 0, y: 455.5, width: 669, height: 40), isActive: true)], .regular)
}
