import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [
    { title: "Recuperar senha — MaxFlix" },
    { name: "description", content: "Recupere sua senha de acesso ao MaxFlix." },
    { property: "og:title", content: "Recuperar senha — MaxFlix" },
    { property: "og:description", content: "Recupere sua senha de acesso ao MaxFlix." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setMessage(error ? "Não foi possível enviar o e-mail." : "Confira seu e-mail para criar uma nova senha.");
  }
  return <main className="grid min-h-screen place-items-center bg-background px-4 text-frost"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-panel p-6 ring-1 ring-line"><h1 className="font-display text-xl font-semibold">Recuperar senha</h1><p className="mt-1 text-sm text-mist">Enviaremos um link para seu e-mail.</p><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className="mt-5 w-full rounded-xl bg-background px-3 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-cyan/50" />{message && <p className="mt-3 text-xs text-cyan">{message}</p>}<button type="submit" className="mt-4 w-full rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-background">Enviar link</button><a href="/auth" className="mt-4 block text-center text-xs text-mist">Voltar para entrar</a></form></main>;
}