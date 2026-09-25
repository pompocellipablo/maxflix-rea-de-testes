import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nova senha — MaxFlix" },
    { name: "description", content: "Defina uma nova senha para o MaxFlix." },
    { property: "og:title", content: "Nova senha — MaxFlix" },
    { property: "og:description", content: "Defina uma nova senha para o MaxFlix." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recovery = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
    if (!recovery) return setMessage("Abra novamente o link recebido por e-mail.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage("Não foi possível atualizar a senha.");
    await navigate({ to: "/", replace: true });
  }
  return <main className="grid min-h-screen place-items-center bg-background px-4 text-frost"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-panel p-6 ring-1 ring-line"><h1 className="font-display text-xl font-semibold">Criar nova senha</h1><p className="mt-1 text-sm text-mist">Digite uma senha com pelo menos 6 caracteres.</p><input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-5 w-full rounded-xl bg-background px-3 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-cyan/50" />{message && <p className="mt-3 text-xs text-danger">{message}</p>}<button type="submit" className="mt-4 w-full rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-background">Salvar nova senha</button></form></main>;
}