// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "Foldable",
  platforms: [.iOS(.v17)],
  products: [.library(name: "Foldable", targets: ["Foldable"])],
  targets: [
    .target(name: "Foldable", resources: [.copy("Resources/bootstrap.js")]),
    .testTarget(name: "FoldableTests", dependencies: ["Foldable"]),
  ]
)
