#if canImport(UIKit)
  import Testing
  import UIKit
  import WebKit

  @testable import Foldable

  @MainActor @Suite struct BridgeAttachTests {
    private func hostScript(_ source: String) -> WKUserScript {
      WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
    }

    @Test func attachAddsExactlyOneSeedAfterTheHostScriptsInOrder() throws {
      let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 466, height: 678))
      let ucc = web.configuration.userContentController
      let host = [hostScript("/*a*/"), hostScript("/*b*/")]
      host.forEach(ucc.addUserScript)

      Bridge.attach(to: web)

      let scripts = ucc.userScripts
      #expect(scripts.count == 3)
      #expect(scripts[0] === host[0])
      #expect(scripts[1] === host[1])
      let seed = scripts[2]
      #expect(seed.injectionTime == .atDocumentStart)
      #expect(seed.isForMainFrameOnly)
      #expect(seed.source.hasPrefix(bootstrapSource))
      #expect(seed.source.contains("window.__foldableBridge.receive("))
    }

    @Test func attachingTwiceKeepsOneSeedAndReturnsTheSameBridge() {
      let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 466, height: 678))
      let first = Bridge.attach(to: web)
      let second = Bridge.attach(to: web)
      #expect(first === second)
      #expect(web.configuration.userContentController.userScripts.count == 1)
    }

    @Test func eachWebViewGetsItsOwnBridge() {
      let one = WKWebView(frame: .zero)
      let two = WKWebView(frame: .zero)
      #expect(Bridge.attach(to: one) !== Bridge.attach(to: two))
    }

    @Test(.enabled(if: !runsIOS27Point1OrLater, "needs a runtime older than iOS 27.1"))
    func belowIOS27Point1TheSeedCarriesNullFold() throws {
      let controller = UIViewController()
      let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 951, height: 669))
      controller.view.addSubview(web)

      let bridge = Bridge.attach(to: web)

      #expect(bridge.state.fold == nil)
      let seed = try #require(web.configuration.userContentController.userScripts.last)
      #expect(seed.source.contains(#""fold":null"#))
    }

    @Test func seedRunsBeforePageScriptsInThePageWorld() async throws {
      let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 466, height: 678))
      web.scrollView.contentInsetAdjustmentBehavior = .never
      let inputs = NativeInputs(
        divisions: [.init(frame: Rect(x: 455.5, y: 0, width: 40, height: 669), isActive: true)],
        horizontalSizeClass: .regular,
        safeAreaInsets: Insets(top: 0, right: 84, bottom: 34, left: 0),
        layoutMargins: Insets(top: 0, right: 84, bottom: 34, left: 20),
        bounds: Rect(x: 0, y: 0, width: 951, height: 669), pageZoom: 1)
      Bridge.attach(to: web, readInputs: { _ in inputs })

      let navigation = NavigationWaiter()
      web.navigationDelegate = navigation
      web.loadHTMLString(
        """
        <script>window.seenAtParse = document.documentElement.getAttribute('data-foldable-posture');</script>
        """,
        baseURL: URL(string: "https://test.localhost/"))
      await navigation.finished()

      let seen =
        try await web.callAsyncJavaScript(
          "return [window.seenAtParse, window.__foldableBridge.seq, window.__foldableBridge.state.fold.x]",
          contentWorld: .page) as? [Any]
      #expect(seen?[0] as? String == "book")
      #expect(seen?[1] as? Int == 1)
      #expect(seen?[2] as? Double == 455.5)
    }
  }

  private let runsIOS27Point1OrLater: Bool = {
    if #available(iOS 27.1, *) { return true }
    return false
  }()

  @MainActor final class NavigationWaiter: NSObject, WKNavigationDelegate {
    private var continuation: CheckedContinuation<Void, Never>?
    private var done = false

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
#endif
