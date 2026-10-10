# Foldable

Fold-aware layout for web content running on iPhone Duo, primarily inside a native app's WKWebView. Terms follow Apple's iPhone Duo vocabulary.

## Device

**Posture**:
The physical configuration of the device at a moment, such as book, flat, or tent.
_Avoid_: Mode, pose, orientation

**Fold**:
The reserved strip where the device bends, which nothing interactive may occupy; it has zero width when the device is flat.
_Avoid_: Hinge, seam, crease

**Region**:
One of the areas the Fold divides the display into.
_Avoid_: Segment, screen, pane

**Size Class**:
The coarse width category of the available space: compact (outer display) or regular (inner display).
_Avoid_: Breakpoint, form factor

## Layout

**Arrangement**:
A layout of two views whose shape (Split or Overlay) is chosen automatically from the Size Class and the active Regions, mirroring Apple's ArrangementView.
_Avoid_: Dual-pane layout, two-up

**Split**:
An Arrangement that places each view in its own Region on either side of the Fold.
_Avoid_: Side-by-side, dual view

**Overlay**:
An Arrangement that layers one view over the other.
_Avoid_: Stack, modal

**Displacement**:
Moving an interactive element out of the Fold into an adjacent Region.
_Avoid_: Hinge avoidance, offset

**Span**:
Content that flows continuously across the Fold without Displacement, such as articles, feeds, and lists.
_Avoid_: Stretch, full-bleed

## Integration

**Host**:
The native app that embeds the web content in a WKWebView.
_Avoid_: Shell, container app, wrapper

**Bridge**:
The native component in the Host that reports Posture, Fold, Regions, and Size Class to the web content.
_Avoid_: Plugin, native module

**Bridge Contract**:
The agreed shape and delivery of the state the Bridge reports to the web content.
_Avoid_: Protocol, schema
