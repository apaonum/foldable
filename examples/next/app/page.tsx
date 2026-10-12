import { Demo } from './demo';

// A server component: the hook lives in the client component it renders.
export default function Page() {
  return (
    <main>
      <h1>foldable × Next.js</h1>
      <Demo />
    </main>
  );
}
