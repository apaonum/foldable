#if canImport(UIKit)
  import os

  /// Logged in release builds too, where `assertionFailure` is compiled out.
  let log = Logger(subsystem: "dev.foldable", category: "Bridge")
#endif
