#if canImport(UIKit)
  import UIKit
  import WebKit

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
#endif
