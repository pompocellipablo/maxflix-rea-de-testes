import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — MaxFlix" },
      { name: "description", content: "Acesso seguro ao painel MaxFlix." },
      { property: "og:title", content: "Entrar — MaxFlix" },
      { property: "og:description", content: "Acesso seguro ao painel MaxFlix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMessage("E-mail ou senha incorretos.");
      await navigate({ to: "/", replace: true });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (!data.session) {
      setMessage("Confira seu e-mail e confirme o cadastro para entrar.");
      setMode("entrar");
      return;
    }
    await navigate({ to: "/", replace: true });
  }

  async function enterWithGoogle() {
    setBusy(true);
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (result.error) setMessage("Não foi possível entrar com o Google.");
    else if (!result.redirected) await navigate({ to: "/", replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-frost">
      <section className="w-full max-w-sm rounded-2xl bg-panel/90 p-6 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-cyan/15 font-display font-semibold text-cyan ring-1 ring-cyan/30">M</div>
          <div>
            <h1 className="font-display text-xl font-semibold">Max<span className="text-cyan">Flix</span></h1>
            <p className="text-xs text-mist">Acesso ao painel de clientes</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-background p-1 ring-1 ring-line">
          <button onClick={() => { setMode("entrar"); setMessage(null); }} className={`rounded-lg py-2 text-sm font-medium ${mode === "entrar" ? "bg-cyan/15 text-cyan" : "text-mist"}`}>Entrar</button>
          <button onClick={() => { setMode("criar"); setMessage(null); }} className={`rounded-lg py-2 text-sm font-medium ${mode === "criar" ? "bg-cyan/15 text-cyan" : "text-mist"}`}>Criar acesso</button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs text-mist">E-mail
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl bg-background px-3 py-2.5 text-sm text-frost ring-1 ring-line outline-none focus:ring-cyan/50" />
          </label>
          <label className="block text-xs text-mist">Senha
            <input required minLength={6} type="password" autoComplete={mode === "entrar" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl bg-background px-3 py-2.5 text-sm text-frost ring-1 ring-line outline-none focus:ring-cyan/50" />
          </label>
          {message && <p className="rounded-xl bg-cyan/10 px-3 py-2 text-xs text-cyan ring-1 ring-cyan/30">{message}</p>}
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60">{busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar acesso"}</button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-mist"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
        <button disabled={busy} onClick={enterWithGoogle} className="w-full rounded-xl bg-panel2 px-4 py-2.5 text-sm font-medium text-frost ring-1 ring-line disabled:opacity-60">Entrar com Google</button>
        {mode === "entrar" && <button onClick={() => void navigate({ to: "/esqueci-senha" })} className="mt-4 w-full text-center text-xs text-mist hover:text-cyan">Esqueci minha senha</button>}
      </section>
    </main>
  );
}