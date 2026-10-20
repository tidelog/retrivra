export default function Home() {
  return <main id="main" className="mx-auto max-w-4xl px-6 py-12 sm:py-20">
    <p className="mb-4 text-sm font-semibold text-sky-800">LOCAL-FIRST DOCUMENT INTELLIGENCE</p>
    <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Your documents, with context.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">Retrivra is a self-hostable document intelligence and semantic retrieval platform under active development.</p>
    <section aria-labelledby="status" className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
      <h2 id="status" className="text-xl font-semibold">Your private knowledge workspace</h2>
      <p className="mt-3 leading-7">Upload documents, discover related passages, and ask questions with traceable evidence.</p>
      <p className="mt-3 leading-7">Built for self-hosting. Documents and local AI processing stay on your infrastructure.</p>
      <a className="mt-5 inline-block font-semibold text-sky-800 underline underline-offset-4" href="/dashboard">Open workspace</a>
    </section>
  </main>;
}
