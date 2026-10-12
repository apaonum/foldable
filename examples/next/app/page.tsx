import { Demo } from './demo';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A server component: the hook lives in the client component it renders.
// `?dir=rtl` and `?edge=leading|trailing` drive the RTL and overlay-edge manual checks.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { dir, edge } = await searchParams;
  return (
    <main dir={dir === 'rtl' ? 'rtl' : undefined}>
      <h1>foldable × Next.js</h1>
      <Demo overlayEdge={edge === 'leading' || edge === 'trailing' ? edge : undefined} />
    </main>
  );
}
