import Foldable
import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication, configurationForConnecting session: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default", sessionRole: session.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene, willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let scene = scene as? UIWindowScene else { return }
    let window = UIWindow(windowScene: scene)
    // Under XCTest the harness adds its own web views; the demo page would only add noise.
    let isTestHost = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
    window.rootViewController = isTestHost ? UIViewController() : HostViewController()
    window.makeKeyAndVisible()
    self.window = window
  }
}

/// A plain view controller with one edge-to-edge WKWebView: the setup the Bridge expects.
final class HostViewController: UIViewController {
  private let webView = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    webView.frame = view.bounds
    webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.isInspectable = true
    view.addSubview(webView)

    Bridge.attach(to: webView)
    guard let page = Bundle.main.url(forResource: "index", withExtension: "html") else {
      preconditionFailure("index.html is missing from the app bundle")
    }
    webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
  }
}
