import Foundation
import JavaScriptCore
import Testing

@testable import Foldable

@Suite struct SeedTests {
  /// Just enough DOM for the bootstrap IIFE: a root element that records CSS writes.
  private static let domStub = """
    var written = {};
    var window = globalThis;
    var Event = function (type) { this.type = type; };
    var dispatched = [];
    window.dispatchEvent = function (e) { dispatched.push(e.type); };
    window.document = { documentElement: {
      style: { setProperty: function (k, v) { written[k] = v; } },
      setAttribute: function (k, v) { written[k] = v; },
    } };
    """

  private func run(_ source: String) throws -> JSContext {
    let context = try #require(JSContext())
    context.evaluateScript(Self.domStub)
    context.evaluateScript(source)
    if let exception = context.exception { Issue.record("JS threw: \(exception)") }
    return context
  }

  @Test func seedHandsTheStateToTheBundledBootstrapAtSeqOne() throws {
    let fixture = try #require(try BridgeFixture.all().first { $0.name == "book-regular" })
    let state = snapshot(from: fixture.nativeInputs)

    let context = try run(try seedSource(for: state))

    let bridge = try #require(context.evaluateScript("window.__foldableBridge"))
    #expect(bridge.forProperty("version").toInt32() == 1)
    #expect(bridge.forProperty("seq").toInt32() == 1)
    let stateJSON = context.evaluateScript("JSON.stringify(window.__foldableBridge.state)")
    #expect(
      try canonicalJSON(
        fromObject: JSONSerialization.jsonObject(
          with: Data(try #require(stateJSON?.toString()).utf8))) == fixture.snapshotJSON)
    #expect(context.evaluateScript("written['data-foldable-posture']").toString() == "book")
    #expect(context.evaluateScript("written['--foldable-fold-x']").toString() == "455.5px")
  }

  @Test func seedCarriesExplicitNullFold() throws {
    let state = BridgeState(
      fold: nil, sizeClass: .compact,
      safeArea: Insets(top: 0, right: 84, bottom: 34, left: 0),
      layoutMargins: Insets(top: 0, right: 84, bottom: 34, left: 20))

    let context = try run(try seedSource(for: state))

    #expect(context.evaluateScript("window.__foldableBridge.state.fold === null").toBool())
    #expect(context.evaluateScript("written['data-foldable-fold']").toString() == "inactive")
  }
}

@Suite struct PushArgumentTests {
  @Test func flattensTheStateAndSeqIntoPlainJSONValues() throws {
    let state = BridgeState(
      fold: nil, sizeClass: .compact,
      safeArea: Insets(top: 0, right: 84, bottom: 34, left: 0),
      layoutMargins: Insets(top: 0, right: 84, bottom: 34, left: 20))

    let argument = try pushArgument(for: state, seq: 2)

    #expect(
      try canonicalJSON(fromObject: argument)
        == #"{"fold":null,"layoutMargins":{"bottom":34,"left":20,"right":84,"top":0},"safeArea":{"bottom":34,"left":0,"right":84,"top":0},"seq":2,"sizeClass":"compact"}"#
    )
  }
}
