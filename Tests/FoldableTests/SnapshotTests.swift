import Foundation
import Testing

@testable import Foldable

@Suite struct SnapshotTests {
  @Test(arguments: try BridgeFixture.all())
  func producesTheSharedFixtureJSON(_ fixture: BridgeFixture) throws {
    let snapshot = snapshot(from: fixture.nativeInputs)
    #expect(try canonicalJSON(snapshot) == fixture.snapshotJSON)
  }

  @Test func coversEveryBridgeFixture() throws {
    #expect(try BridgeFixture.all().count == 8)
  }
}

@Suite struct SnapshotZoomTests {
  @Test func dividesGeometryByPageZoom() throws {
    let inputs = NativeInputs(
      divisions: [.init(frame: Rect(x: 455.5, y: 0, width: 40, height: 669), isActive: true)],
      horizontalSizeClass: .regular,
      safeAreaInsets: Insets(top: 0, right: 84, bottom: 34, left: 0),
      layoutMargins: Insets(top: 0, right: 84, bottom: 34, left: 20),
      bounds: Rect(x: 0, y: 0, width: 951, height: 669),
      pageZoom: 2
    )
    #expect(
      snapshot(from: inputs)
        == BridgeState(
          fold: Rect(x: 227.75, y: 0, width: 20, height: 334.5),
          sizeClass: .regular,
          safeArea: Insets(top: 0, right: 42, bottom: 17, left: 0),
          layoutMargins: Insets(top: 0, right: 42, bottom: 17, left: 10)
        ))
  }
}
