import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Workspace from "./workspace";
export default async function Dashboard() {
 const session = await auth(); if (!session?.user?.id) redirect("/login");
 return <main id="main" className="mx-auto max-w-7xl px-5 py-8 sm:px-10"><header className="mb-12 flex flex-wrap items-center justify-between gap-4"><Link className="text-xl font-black tracking-widest" href="/">RETRIVRA<span className="text-teal-700">.</span></Link><div className="flex items-center gap-4"><span className="text-sm">{session.user.email}</span><form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="secondary">Sign out</button></form></div></header><p className="eyebrow">YOUR KNOWLEDGE, CONNECTED</p><h1 className="text-4xl font-bold tracking-tight">Document workspace</h1><p className="mb-10 mt-3 text-slate-600">Collect your sources. Find the context. Ask better questions.</p><Workspace /></main>;
}
