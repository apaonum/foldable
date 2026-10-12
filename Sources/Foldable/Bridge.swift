#if canImport(UIKit)
  import ObjectiveC
  import UIKit
  import WebKit

  /// Reports the Fold, Size Class, safe area and layout margins of one WKWebView to its page.
  ///
  /// Keep the web view edge-to-edge in its view controller's view and set
  /// `scrollView.contentInsetAdjustmentBehavior = .never`, or the reported geometry lands in the
  /// wrong coordinate space. Don't replace or re-inject the bootstrap yourself.
  ///
  /// Set `navigationDelegate` before or after attaching; the Bridge forwards every callback to
  /// it. Reading `navigationDelegate` back returns the Bridge's forwarding proxy.
  @MainActor public final class Bridge {
    /// Reads native inputs; tests substitute it to drive delivery without scripting Posture.
    typealias InputsReader = @MainActor (WKWebView) -> NativeInputs

    private weak var webView: WKWebView?
    private let readInputs: InputsReader
    private var seed: WKUserScript?
    private(set) var state: BridgeState
    /// The `seq` of the last snapshot handed to the page; the seed counts as the first.
    private var seq = seedSeq
    private var refreshScheduled = false
    private let navigation = NavigationProxy()
    private var delegateObservation: NSKeyValueObservation?
    private(set) var usesChangeHooks = true
    private var geometryObservations: [NSKeyValueObservation] = []

    private init(webView: WKWebView, readInputs: @escaping InputsReader) {
      self.webView = webView
      self.readInputs = readInputs
      state = snapshot(from: readInputs(webView))
    }

    /// Attaches the Bridge to `webView`, or returns the one already attached. Pages loaded after
    /// this call see the current state before first paint.
    @discardableResult
    public static func attach(to webView: WKWebView) -> Bridge {
      attach(to: webView, readInputs: NativeInputs.read(from:))
    }

    /// `changeHooks: false` stands in for a runtime where the swizzle couldn't be installed.
    @discardableResult
    static func attach(
      to webView: WKWebView, readInputs: @escaping InputsReader,
      changeHooks: Bool = changeHooksInstalled
    ) -> Bridge {
      if let existing = attached(to: webView) { return existing }
      let bridge = Bridge(webView: webView, readInputs: readInputs)
      // The web view owns its Bridge, so state is per WKWebView and dies with it.
      objc_setAssociatedObject(webView, &bridgeKey, bridge, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
      bridge.installSeed()
      bridge.observeCommits(of: webView)
      bridge.usesChangeHooks = changeHooks
      if !changeHooks { bridge.observeGeometry(of: webView) }
      webView.registerForTraitChanges([UITraitHorizontalSizeClass.self]) {
        (webView: WKWebView, _: UITraitCollection) in
        attached(to: webView)?.setNeedsRefresh()
      }
      return bridge
    }

    static func attached(to webView: WKWebView) -> Bridge? {
      objc_getAssociatedObject(webView, &bridgeKey) as? Bridge
    }

    /// Called on every change signal. Several signals in one run-loop turn (a layout pass usually
    /// brings bounds, safe area and traits together) collapse into one read and at most one push.
    func setNeedsRefresh() {
      guard !refreshScheduled else { return }
      refreshScheduled = true
      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        refreshScheduled = false
        refresh()
      }
    }

    /// Re-reads native inputs; when they changed, replaces the seed and pushes the new state.
    func refresh() {
      guard let webView else { return }
      let next = snapshot(from: readInputs(webView))
      guard next != state else { return }
      state = next
      installSeed()
      push()
    }

    /// Sends the current state with the next `seq`. Seam for navigation (#27): re-push after
    /// `didCommit`, since a committed page may have been seeded with an older state.
    func push() {
      guard let webView else { return }
      seq += 1
      let argument: [String: Any]
      do {
        argument = try pushArgument(for: state, seq: seq)
      } catch {
        reportEncodeFailure(error)
        return
      }
      // Fails harmlessly when no seeded page is loaded yet (e.g. before the first navigation);
      // the replaced seed covers the next page.
      webView.callAsyncJavaScript(
        "window.__foldableBridge.receive(s)", arguments: ["s": argument], in: nil, in: .page)
    }

    /// A page committed while the state changed may carry an older seed, so every commit gets a
    /// push. The proxy wraps whatever delegate the Host has set, now or later, and forwards to it.
    private func observeCommits(of webView: WKWebView) {
      navigation.onCommit = { [weak self] in self?.push() }
      wrapNavigationDelegate(of: webView)
      delegateObservation = webView.observe(\.navigationDelegate) { webView, _ in
        MainActor.assumeIsolated {
          Bridge.attached(to: webView)?.wrapNavigationDelegate(of: webView)
        }
      }
    }

    /// Fallback without the change hooks: frame and bounds changes still refresh, but a Fold that
    /// activates with no geometry or trait change is missed until the next one (ADR 0002).
    private func observeGeometry(of webView: WKWebView) {
      geometryObservations = [
        webView.observe(\.frame) { webView, _ in
          MainActor.assumeIsolated { Bridge.attached(to: webView)?.setNeedsRefresh() }
        },
        webView.observe(\.bounds) { webView, _ in
          MainActor.assumeIsolated { Bridge.attached(to: webView)?.setNeedsRefresh() }
        },
      ]
    }

    private func reportEncodeFailure(_ error: Error) {
      log.error("Foldable: could not encode Bridge state: \(String(describing: error))")
      assertionFailure("Foldable: could not encode Bridge state: \(error)")
    }

    private func wrapNavigationDelegate(of webView: WKWebView) {
      guard webView.navigationDelegate !== navigation else { return }
      navigation.host = webView.navigationDelegate
      // Re-setting also makes WebKit re-read which delegate methods the proxy now responds to.
      webView.navigationDelegate = navigation
    }

    private func installSeed() {
      guard let webView else { return }
      let source: String
      do {
        source = try seedSource(for: state)
      } catch {
        // Only non-finite geometry can fail to encode; without a seed the page falls back on its own.
        reportEncodeFailure(error)
        return
      }
      let next = WKUserScript(
        source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true, in: .page)
      let contentController = webView.configuration.userContentController
      let scripts = replacingSeed(
        in: contentController.userScripts, current: seed, with: next)
      contentController.removeAllUserScripts()
      scripts.forEach(contentController.addUserScript)
      seed = next
    }
  }

  nonisolated(unsafe) private var bridgeKey: UInt8 = 0

  /// Sits in `navigationDelegate` in front of the Host's delegate: it sees `didCommit`, and every
  /// message the Host's delegate handles, `didCommit` included, is forwarded to it unchanged.
  /// `navigationDelegate` therefore reads back as this proxy, not the Host's object.
  private final class NavigationProxy: NSObject, WKNavigationDelegate {
    // WebKit queries `responds(to:)` and forwarding outside Swift's actor model, on the main thread.
    nonisolated(unsafe) weak var host: (any WKNavigationDelegate)?
    var onCommit: (() -> Void)?

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
      onCommit?()
      host?.webView?(webView, didCommit: navigation)
    }

    override func responds(to selector: Selector!) -> Bool {
      super.responds(to: selector) || host?.responds(to: selector) == true
    }

    override func forwardingTarget(for selector: Selector!) -> Any? {
      host?.responds(to: selector) == true ? host : super.forwardingTarget(for: selector)
    }
  }

  extension Rect {
    init(_ rect: CGRect) {
      self.init(
        x: Double(rect.origin.x), y: Double(rect.origin.y),
        width: Double(rect.width), height: Double(rect.height))
    }
  }

  extension Insets {
    init(_ insets: UIEdgeInsets) {
      self.init(
        top: Double(insets.top), right: Double(insets.right),
        bottom: Double(insets.bottom), left: Double(insets.left))
    }
  }
#endif
