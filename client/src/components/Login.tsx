import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMut = useMutation({
    mutationFn: async (pw: string) => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => onSuccess(),
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMut.mutate(password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock size={22} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">JASSOP GROUP</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your password to continue</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            data-testid="input-password"
            className="h-11"
          />
          {error && (
            <p className="text-sm text-destructive" data-testid="text-login-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={loginMut.isPending || !password}
            data-testid="button-login"
          >
            {loginMut.isPending ? "Signing in…" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
