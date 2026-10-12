/// Raw native readings, in WKWebView points, before contract rules are applied.
struct NativeInputs: Decodable, Equatable, Sendable {
  struct Division: Decodable, Equatable, Sendable {
    var frame: Rect
    var isActive: Bool
  }

  /// `reservedRegions(kind: .division)`; empty below iOS 27.1. May include inactive regions.
  var divisions: [Division]
  var horizontalSizeClass: SizeClass
  /// The WKWebView's own `safeAreaInsets`.
  var safeAreaInsets: Insets
  /// The owning view controller's `view.layoutMargins`, not the WKWebView's.
  var layoutMargins: Insets
  var bounds: Rect
  var pageZoom: Double
}

func snapshot(from inputs: NativeInputs) -> BridgeState {
  let zoom = inputs.pageZoom
  return BridgeState(
    fold: inputs.divisions.first(where: \.isActive).map { $0.frame.scaled(by: zoom) },
    sizeClass: inputs.horizontalSizeClass,
    safeArea: inputs.safeAreaInsets.scaled(by: zoom),
    layoutMargins: inputs.layoutMargins.scaled(by: zoom)
  )
}

extension Rect {
  fileprivate func scaled(by zoom: Double) -> Rect {
    zoom == 1 ? self : Rect(x: x / zoom, y: y / zoom, width: width / zoom, height: height / zoom)
  }
}

extension Insets {
  fileprivate func scaled(by zoom: Double) -> Insets {
    zoom == 1
      ? self
      : Insets(top: top / zoom, right: right / zoom, bottom: bottom / zoom, left: left / zoom)
  }
}
