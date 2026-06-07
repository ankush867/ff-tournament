import { useState } from "react";
import { useLocation } from "wouter";
import { useLoginPlayer } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Loader2 } from "lucide-react";
import { Link } from "wouter";

export function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLoginPlayer({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.player);
        setLocation("/");
      },
      onError: (err: any) => {
        setError(err?.data?.error ?? "Login failed. Check your credentials.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email aur password dono required hain.");
      return;
    }
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Flame className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-extrabold uppercase tracking-wider">Login</h1>
          <p className="text-muted-foreground mt-2 text-sm">Apne account mein login karo</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="aapka@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
                className="bg-background border-border focus:border-primary"
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
                className="bg-background border-border focus:border-primary"
                disabled={loginMutation.isPending}
              />
            </div>

            {error && (
              <div data-testid="text-login-error" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="button-submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in...</>
              ) : "Login"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Account nahi hai?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">
              Register karo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
