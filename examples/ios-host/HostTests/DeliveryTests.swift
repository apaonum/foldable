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

/// An edge-to-edge WKWebView in a child view controller of the test host's key window.
@MainActor final class HostedPage {
  var inputs: NativeInputs
  let owner = UIViewController()
  let web = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
  private let navigation = NavigationWaiter()

  private static let html = """
    <!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <script>
      window.seenAtParse = document.documentElement.getAttribute('data-foldable-posture');
      requestAnimationFrame(() => {
        window.firstFrame = document.documentElement.getAttribute('data-foldable-posture');
      });
      window.pushes = [];
      addEventListener('__foldablebridgechange', () => window.pushes.push(
        window.__foldableBridge.seq + ':' + document.documentElement.getAttribute('data-foldable-posture')));
    </script>
    """

  init(inputs: NativeInputs) async throws {
    self.inputs = inputs
    let root = try await Self.rootViewController()
    root.addChild(owner)
    owner.view.frame = root.view.bounds
    root.view.addSubview(owner.view)
    owner.didMove(toParent: root)

    web.frame = owner.view.bounds
    web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    web.scrollView.contentInsetAdjustmentBehavior = .never
    owner.view.addSubview(web)
    owner.view.layoutIfNeeded()

    Bridge.attach(to: web, readInputs: { [unowned self] _ in self.inputs })
    web.navigationDelegate = navigation
    try await load()
  }

  isolated deinit {
    owner.willMove(toParent: nil)
    owner.view.removeFromSuperview()
    owner.removeFromParent()
  }

  func load() async throws {
    navigation.reset()
    web.loadHTMLString(Self.html, baseURL: URL(string: "https://test.localhost/"))
    await navigation.finished()
    // Two frames so the first-paint probe has run; then drop pushes caused by setting up the page.
    _ = try await web.callAsyncJavaScript(
      "await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); window.pushes = [];",
      contentWorld: .page)
    try await settle()
    _ = try await eval("window.pushes = []; return 0")
  }

  /// Lets queued refreshes run. Pushes are queued before the next script call, so its result
  /// already reflects them.
  func settle() async throws {
    try await Task.sleep(for: .milliseconds(100))
  }

  /// Overrides the Size Class to the one the display doesn't have, so the trait really changes.
  func flipSizeClass() {
    web.traitOverrides.horizontalSizeClass =
      web.traitCollection.horizontalSizeClass == .regular ? .compact : .regular
  }

  func pushes() async throws -> [String] {
    try await eval("return window.pushes") as? [String] ?? []
  }

  func eval(_ body: String) async throws -> Any? {
    let value = try await web.callAsyncJavaScript(body, contentWorld: .page)
    if let array = value as? [Any] { return array.map { "\($0)" } }
    return value
  }

  private static func rootViewController() async throws -> UIViewController {
    for _ in 0..<50 {
      let window = UIApplication.shared.connectedScenes
        .compactMap { ($0 as? UIWindowScene)?.keyWindow }.first
      if let root = window?.rootViewController { return root }
      try await Task.sleep(for: .milliseconds(100))
    }
    throw HarnessError.noKeyWindow
  }
}

enum HarnessError: Error { case noKeyWindow }

@MainActor final class NavigationWaiter: NSObject, WKNavigationDelegate {
  private var continuation: CheckedContinuation<Void, Never>?
  private var done = false

  func reset() { done = false }

  func finished() async {
    if done { return }
    await withCheckedContinuation { continuation = $0 }
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    done = true
    continuation?.resume()
    continuation = nil
  }
}
