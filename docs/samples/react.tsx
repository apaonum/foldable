'use client';

import { arrangement, displace, SERVER_STATE, useFoldable, view } from '@foldablejs/react';

export function MailShell() {
  const state = useFoldable();
  return (
    <>
      <div className="frame" {...arrangement({ style: 'split' })}>
        <nav {...view('primary')} aria-label="Mailboxes">
          {state === SERVER_STATE ? null : <p>Posture: {state.posture}</p>}
        </nav>
        <article {...view('secondary')}>Message</article>
      </div>
      <div {...displace()}>
        <button type="button">Reply</button>
      </div>
    </>
  );
}
