export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Insets = Readonly<{ top: number; right: number; bottom: number; left: number }>;

export type Posture = 'book' | 'tabletop' | 'none';
export type SizeClass = 'compact' | 'regular';
export type Source = 'bridge' | 'web' | 'fallback';

/** Bridge Contract v1 snapshot, as pushed by the native Bridge. */
export type BridgeState = Readonly<{
  fold: Rect | null;
  sizeClass: SizeClass;
  safeArea: Insets;
  layoutMargins: Insets;
}>;

export type State = Readonly<{
  posture: Posture;
  fold: Rect | null;
  regions: readonly Rect[];
  sizeClass: SizeClass;
  safeArea: Insets;
  layoutMargins: Insets;
  source: Source;
}>;
