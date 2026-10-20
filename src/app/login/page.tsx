import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
 const { error } = await searchParams;
 return <main id="main" className="mx-auto max-w-md px-6 py-20"><p className="eyebrow">RETRIVRA / PRIVATE WORKSPACE</p><h1 className="text-4xl font-bold">Welcome back.</h1><p className="my-5">Sign in to explore your document library.</p>
 <form className="card grid gap-4" action={async data => { "use server"; try { await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirectTo: "/dashboard" }); } catch(e) { if (e instanceof AuthError) redirect("/login?error=credentials"); throw e; } }}>
 <label>Email<input name="email" type="email" required autoComplete="username" /></label><label>Password<input name="password" type="password" required maxLength={128} autoComplete="current-password" /></label>{error && <p role="alert">Unable to sign in. Check your credentials.</p>}<button>Sign in</button></form><p className="mt-5 text-sm">Accounts are provisioned by your self-host administrator.</p></main>;
}
