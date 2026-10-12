import UIKit
import WebKit

@testable import Foldable

/// An edge-to-edge WKWebView in a child view controller of the test host's key window.
@MainActor final class HostedPage {
  var inputs: NativeInputs
  let owner = UIViewController()
  let web = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
  /// The Host's own navigation delegate, set after `Bridge.attach` as a Host would.
  let navigation = NavigationWaiter()

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

  init(inputs: NativeInputs, hostScripts: [WKUserScript] = []) async throws {
    self.inputs = inputs
    hostScripts.forEach(web.configuration.userContentController.addUserScript)
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

    // WebKit can keep the web view alive past this page, and later layout passes still refresh it.
    Bridge.attach(to: web, readInputs: { [weak self] _ in self?.inputs ?? inputs })
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
    try await navigation.finished()
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

enum HarnessError: Error { case noKeyWindow, navigationTimedOut }

/// The Host's navigation delegate in tests. `finished()` throws on a failed navigation or after a
/// timeout, so a navigation that never finishes fails the test instead of hanging the run.
@MainActor final class NavigationWaiter: NSObject, WKNavigationDelegate {
  private var continuation: CheckedContinuation<Void, any Error>?
  private var outcome: Result<Void, any Error>?
  /// Runs while a navigation is still provisional, before WebKit allows it.
  var beforeAllowing: (() async throws -> Void)?
  var onCommit: (() -> Void)?
  private(set) var commits = 0

  func reset() { outcome = nil }

  func finished(timeout: Duration = .seconds(10)) async throws {
    if let outcome { return try outcome.get() }
    let timer = Task { [weak self] in
      try await Task.sleep(for: timeout)
      self?.complete(.failure(HarnessError.navigationTimedOut))
    }
    defer { timer.cancel() }
    try await withCheckedThrowingContinuation { continuation = $0 }
  }

  private func complete(_ result: Result<Void, any Error>) {
    guard outcome == nil else { return }
    outcome = result
    continuation?.resume(with: result)
    continuation = nil
  }

  func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async
    -> WKNavigationActionPolicy
  {
    try? await beforeAllowing?()
    return .allow
  }

  func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
    commits += 1
    onCommit?()
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    complete(.success(()))
  }

  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: any Error
  ) {
    complete(.failure(error))
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: any Error)
  {
    complete(.failure(error))
  }
}
