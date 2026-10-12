#if canImport(UIKit)
  import Testing
  import UIKit
  import WebKit

  @testable import Foldable

  private final class Plain: NSObject {
    @objc dynamic func present() -> Int { 1 }
    @objc dynamic func replacement() -> Int { 2 }
  }

  @MainActor @Suite struct ChangeHooksTests {
    @Test func aMissingMethodChangesNothingAndDoesNotCrash() {
      let installed = exchangeAll(
        on: Plain.self,
        [
          (#selector(Plain.present), #selector(Plain.replacement)),
          (NSSelectorFromString("absentFoldableMethod"), #selector(Plain.replacement)),
        ])

      #expect(!installed)
      #expect(Plain().present() == 1)
      #expect(Plain().replacement() == 2)
    }

    @Test func withoutHooksABoundsChangeStillTriggersARead() async throws {
      let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 466, height: 678))
      var reads = 0
      Bridge.attach(
        to: web,
        readInputs: { _ in
          reads += 1
          return NativeInputs(
            divisions: [], horizontalSizeClass: .compact,
            safeAreaInsets: Insets(top: 0, right: 0, bottom: 0, left: 0),
            layoutMargins: Insets(top: 0, right: 0, bottom: 0, left: 0),
            bounds: Rect(x: 0, y: 0, width: 466, height: 678), pageZoom: 1)
        }, changeHooks: false)
      let before = reads

      web.frame = CGRect(x: 0, y: 0, width: 951, height: 669)
      try await Task.sleep(for: .milliseconds(100))

      #expect(reads > before)
    }
  }
#endif
