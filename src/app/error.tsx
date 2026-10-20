 "use client";
export default function ErrorBoundary({ reset }: { reset: () => void }) { return <main id="main" className="p-8"><h1 className="text-2xl font-bold">Unable to load this page</h1><p className="my-4">Please try again.</p><button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={reset}>Try again</button></main>; }
