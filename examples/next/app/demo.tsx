'use client';

import { arrangement, displace, SERVER_STATE, useFoldable, view } from '@foldablejs/react';
import { useState } from 'react';

export function Demo({ overlayEdge }: { overlayEdge: 'leading' | 'trailing' | undefined }) {
  const state = useFoldable();
  const [overlayState, setOverlayState] = useState<'collapsed' | 'expanded'>('collapsed');

  return (
    <>
      <section aria-labelledby="state">
        <h2 id="state">State</h2>
        {state === SERVER_STATE ? (
          <p>Not known yet (server render).</p>
        ) : (
          <dl>
            <dt>Posture</dt>
            <dd>{state.posture}</dd>
            <dt>Size Class</dt>
            <dd>{state.sizeClass}</dd>
            <dt>Regions</dt>
            <dd>{state.regions.length}</dd>
            <dt>Source</dt>
            <dd>{state.source}</dd>
          </dl>
        )}
      </section>

      <section aria-labelledby="split">
        <h2 id="split">Split</h2>
        <div {...arrangement({ style: 'split' })}>
          <div {...view('primary')}>Primary: one Region when the Fold is active.</div>
          <div {...view('secondary')}>Secondary: the other Region.</div>
        </div>
      </section>

      <section aria-labelledby="overlay">
        <h2 id="overlay">Overlay</h2>
        {/* Overlay DOM order is secondary then primary, so reading order matches stacking. */}
        <div
          {...arrangement({
            style: 'overlay',
            overlayState,
            ...(overlayEdge && { overlayEdge: { inline: overlayEdge } }),
          })}
        >
          <div {...view('secondary')}>Secondary: underneath when flat.</div>
          <div {...view('primary')}>
            Primary: on top when flat, its own Region when the Fold is active.
            <button
              type="button"
              aria-expanded={overlayState === 'expanded'}
              onClick={() => {
                setOverlayState((s) => (s === 'expanded' ? 'collapsed' : 'expanded'));
              }}
            >
              {overlayState === 'expanded' ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="displace">
        <h2 id="displace">Displace</h2>
        <p>
          The button below sits in the trailing (book) or bottom (tabletop) Region, off the Fold.
        </p>
      </section>
      <div {...displace()}>
        <button type="button">Displaced action</button>
      </div>
    </>
  );
}
