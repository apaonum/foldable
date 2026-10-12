import UIKit
import WebKit

@testable import Foldable

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
