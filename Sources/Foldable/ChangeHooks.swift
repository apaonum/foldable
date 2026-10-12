#if canImport(UIKit)
  import ObjectiveC
  import UIKit
  import WebKit

  /// The spec's change signals are the WKWebView's own `layoutSubviews` and
  /// `safeAreaInsetsDidChange`: a Fold activating changes neither bounds nor traits, so only a
  /// layout pass reports it. The Host's web view can't be subclassed after the fact, so the two
  /// methods are exchanged once on WKWebView; web views without a Bridge only pay one lookup.
  @MainActor let installChangeHooks: Void = {
    exchange(#selector(UIView.layoutSubviews), with: #selector(WKWebView.foldableLayoutSubviews))
    exchange(
      #selector(UIView.safeAreaInsetsDidChange),
      with: #selector(WKWebView.foldableSafeAreaInsetsDidChange))
  }()

  @MainActor private func exchange(_ original: Selector, with replacement: Selector) {
    let cls: AnyClass = WKWebView.self
    guard let originalMethod = class_getInstanceMethod(cls, original),
      let replacementMethod = class_getInstanceMethod(cls, replacement)
    else { preconditionFailure("Foldable: missing \(original) on WKWebView") }
    // If WKWebView only inherits the method, add an override first so UIView itself is untouched.
    if class_addMethod(
      cls, original, method_getImplementation(replacementMethod),
      method_getTypeEncoding(replacementMethod))
    {
      class_replaceMethod(
        cls, replacement, method_getImplementation(originalMethod),
        method_getTypeEncoding(originalMethod))
    } else {
      method_exchangeImplementations(originalMethod, replacementMethod)
    }
  }

  extension WKWebView {
    // After the exchange these names call the original implementations.
    @objc fileprivate func foldableLayoutSubviews() {
      foldableLayoutSubviews()
      Bridge.attached(to: self)?.setNeedsRefresh()
    }

    @objc fileprivate func foldableSafeAreaInsetsDidChange() {
      foldableSafeAreaInsetsDidChange()
      Bridge.attached(to: self)?.setNeedsRefresh()
    }
  }
#endif
