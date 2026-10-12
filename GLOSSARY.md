# Foldable

Fold-aware layout for web content running on iPhone Duo, primarily inside a native app's WKWebView. Terms follow Apple's iPhone Duo vocabulary.

## Device

**Posture**:
How the Fold divides the available space at a moment: book (the Fold runs top to bottom, giving side-by-side Regions), tabletop (the Fold runs side to side, giving stacked Regions), or none (no active Fold). It follows the Fold, not the hinge: a flat or closed device has no Posture.
_Avoid_: Mode, pose, orientation, hinge state

**Fold**:
The reserved strip where the device bends, which nothing interactive may occupy; it is inactive (absent) when the device is flat.
_Avoid_: Hinge, seam, crease

**Region**:
One of the areas the Fold divides the display into.
_Avoid_: Segment, screen, pane

**Size Class**:
The coarse width category of the available space, compact or regular. It follows the space, not the display: the inner display can be compact in Split View.
_Avoid_: Breakpoint, form factor

## Layout

**Arrangement**:
A layout of two views, primary and secondary, in a style the author picks (Split or Overlay), whose frames adapt to Size Class, aspect ratio, and whether the Fold is active; mirrors Apple's ArrangementView.
_Avoid_: Dual-pane layout, two-up

**Split**:
An Arrangement that places the primary and secondary views next to each other along the longer axis, one per Region when the Fold is active.
_Avoid_: Side-by-side, dual view

**Overlay**:
An Arrangement that layers the primary view over the secondary, separating them into Regions when the Fold is active.
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
The native component in the Host that reports the Fold and Size Class to the web content; the web content derives Posture and Regions from them.
_Avoid_: Plugin, native module

**Bridge Contract**:
The agreed shape and delivery of the state the Bridge reports to the web content.
_Avoid_: Protocol, schema
