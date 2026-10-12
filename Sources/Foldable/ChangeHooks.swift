#if canImport(UIKit)
  import ObjectiveC
  import UIKit
  import WebKit

  /// The spec's change signals are the WKWebView's own `layoutSubviews` and
  /// `safeAreaInsetsDidChange`: a Fold activating changes neither bounds nor traits, so only a
  /// layout pass reports it. The Host's web view can't be subclassed after the fact, so the two
  /// methods are exchanged once on WKWebView; web views without a Bridge only pay one lookup.
  /// `false` when the runtime lacks a method: nothing is exchanged and each Bridge falls back to
  /// KVO and trait signals (see ADR 0002).
  @MainActor let changeHooksInstalled: Bool = {
    let installed = exchangeAll(
      on: WKWebView.self,
      [
        (#selector(UIView.layoutSubviews), #selector(WKWebView.foldableLayoutSubviews)),
        (
          #selector(UIView.safeAreaInsetsDidChange),
          #selector(WKWebView.foldableSafeAreaInsetsDidChange)
        ),
      ])
    #if DEBUG
      if !installed {
        log.debug(
          "Foldable: WKWebView change hooks unavailable; falling back to KVO and trait signals")
      }
    #endif
    return installed
  }()

  /// Exchanges every pair, or none: if any method is missing on `cls`, nothing changes.
  @MainActor func exchangeAll(on cls: AnyClass, _ pairs: [(Selector, Selector)]) -> Bool {
    var methods: [(Selector, Method, Method)] = []
    for (original, replacement) in pairs {
      guard let originalMethod = class_getInstanceMethod(cls, original),
        let replacementMethod = class_getInstanceMethod(cls, replacement)
      else { return false }
      methods.append((original, originalMethod, replacementMethod))
    }
    for (original, originalMethod, replacementMethod) in methods {
      exchange(cls, original, originalMethod, replacementMethod)
    }
    return true
  }

  @MainActor private func exchange(
    _ cls: AnyClass, _ original: Selector, _ originalMethod: Method, _ replacementMethod: Method
  ) {
    // If the class only inherits the method, add an override first so the superclass is untouched.
    if class_addMethod(
      cls, original, method_getImplementation(replacementMethod),
      method_getTypeEncoding(replacementMethod))
    {
      class_replaceMethod(
        cls, method_getName(replacementMethod), method_getImplementation(originalMethod),
        method_getTypeEncoding(originalMethod))
    } else {
      method_exchangeImplementations(originalMethod, replacementMethod)
    }
  }

  extension WKWebView {
    // After the exchange these names call the original implementations.
    @objc fileprivate func foldableLayoutSubviews() {
      foldableLayoutSubviews()
      // Reading the division regions inside the pass makes UIKit lay the web view out again
      // when one flips; the read in the deferred refresh alone misses it (ADR 0003).
      if #available(iOS 27.1, *), Bridge.attached(to: self)?.usesChangeHooks == true {
        _ = reservedRegions(kind: .division)
      }
      hookFired()
    }

    @objc fileprivate func foldableSafeAreaInsetsDidChange() {
      foldableSafeAreaInsetsDidChange()
      hookFired()
    }

    private func hookFired() {
      guard let bridge = Bridge.attached(to: self), bridge.usesChangeHooks else { return }
      bridge.setNeedsRefresh()
    }
  }
#endif
