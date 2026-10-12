#if canImport(UIKit)
  import ObjectiveC
  import UIKit
  import WebKit

  /// Reports the Fold, Size Class, safe area and layout margins of one WKWebView to its page.
  ///
  /// Keep the web view edge-to-edge in its view controller's view and set
  /// `scrollView.contentInsetAdjustmentBehavior = .never`, or the reported geometry lands in the
  /// wrong coordinate space. Don't replace or re-inject the bootstrap yourself.
  @MainActor public final class Bridge {
    /// Reads native inputs; tests substitute it to drive delivery without scripting Posture.
    typealias InputsReader = @MainActor (WKWebView) -> NativeInputs

    private weak var webView: WKWebView?
    private let readInputs: InputsReader
    private var seed: WKUserScript?
    private(set) var state: BridgeState

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

    @discardableResult
    static func attach(to webView: WKWebView, readInputs: @escaping InputsReader) -> Bridge {
      if let existing = objc_getAssociatedObject(webView, &bridgeKey) as? Bridge { return existing }
      let bridge = Bridge(webView: webView, readInputs: readInputs)
      // The web view owns its Bridge, so state is per WKWebView and dies with it.
      objc_setAssociatedObject(webView, &bridgeKey, bridge, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
      bridge.installSeed()
      return bridge
    }

    /// Re-reads native inputs and replaces the seed. Seam for live change detection (#26) and
    /// navigation (#27), which push the same state with a higher `seq`.
    func refresh() {
      guard let webView else { return }
      let next = snapshot(from: readInputs(webView))
      guard next != state else { return }
      state = next
      installSeed()
    }

    private func installSeed() {
      guard let webView else { return }
      let source: String
      do {
        source = try seedSource(for: state)
      } catch {
        // Only non-finite geometry can fail to encode; without a seed the page falls back on its own.
        assertionFailure("Foldable: could not encode Bridge state: \(error)")
        return
      }
      let next = WKUserScript(
        source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true, in: .page)
      let ucc = webView.configuration.userContentController
      let scripts = replacingSeed(in: ucc.userScripts, current: seed, with: next)
      ucc.removeAllUserScripts()
      scripts.forEach(ucc.addUserScript)
      seed = next
    }
  }

  nonisolated(unsafe) private var bridgeKey: UInt8 = 0

  extension NativeInputs {
    @MainActor static func read(from webView: WKWebView) -> NativeInputs {
      NativeInputs(
        divisions: divisions(of: webView),
        horizontalSizeClass: webView.traitCollection.horizontalSizeClass == .regular
          ? .regular : .compact,
        safeAreaInsets: Insets(webView.safeAreaInsets),
        // The web view's own layoutMargins omit the system minimum; the owner's view has it.
        layoutMargins: ownerView(of: webView).map { Insets($0.layoutMargins) }
          ?? Insets(top: 0, right: 0, bottom: 0, left: 0),
        bounds: Rect(webView.bounds),
        pageZoom: Double(webView.pageZoom)
      )
    }

    @MainActor private static func divisions(of webView: WKWebView) -> [Division] {
      guard #available(iOS 27.1, *) else { return [] }
      return webView.reservedRegions(kind: .division).map {
        Division(frame: Rect($0.frame), isActive: $0.isActive)
      }
    }

    @MainActor private static func ownerView(of view: UIView) -> UIView? {
      var responder: UIResponder? = view
      while let next = responder {
        if let controller = next as? UIViewController { return controller.view }
        responder = next.next
      }
      return nil
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
