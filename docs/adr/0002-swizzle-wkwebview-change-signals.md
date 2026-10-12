# Swizzle WKWebView's layoutSubviews and safeAreaInsetsDidChange process-wide

A Fold activating changes neither the web view's bounds nor its traits, and iOS has no Fold-change notification, so the only signal is a layout pass on the WKWebView itself. The Host owns its web view and can't subclass it after the fact, and asking every Host to forward `layoutSubviews` makes the Bridge easy to wire wrong. So on the first `Bridge.attach(to:)` the Bridge exchanges `layoutSubviews` and `safeAreaInsetsDidChange` on the `WKWebView` class, once per process. The replacements call the original first, then refresh the attached Bridge; a web view with no Bridge pays one associated-object lookup per call. If `WKWebView` only inherits a method, an override is added to `WKWebView` first, so `UIView` is never touched.

The swizzle fails safe. Both methods are looked up before anything changes; if either is missing, nothing is exchanged, a fault is logged, and every Bridge falls back to KVO on `frame` and `bounds` plus the `horizontalSizeClass` trait registration. In that mode a Fold that activates with no geometry or trait change is missed until the next one.

## Considered Options

- A `WKWebView` subclass the Host must use: the Bridge's whole promise is `attach(to:)` on the Host's existing web view, and many Hosts get their web view from frameworks that create it.
- Host forwarding (the Host calls `bridge.setNeedsRefresh()` from its own `viewDidLayoutSubviews`): the view controller's layout pass isn't the web view's, and a Host that forgets gets silently stale state.
- KVO and trait signals only: misses the Fold activating on its own, which is the case foldable exists for.

## Consequences

- Every `WKWebView` in the process, including third-party ones (ads, auth SDKs), runs the replacement. It only calls the original and does a lookup, but a crash inside another library's override would now have a foldable frame on its stack.
- Another library that swizzles the same methods composes with this one: each exchange wraps the one installed before it.
