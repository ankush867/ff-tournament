import { useState } from "react";
import { useLocation } from "wouter";
import { useRegisterPlayer } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Loader2 } from "lucide-react";
import { Link } from "wouter";

export function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", gameId: "" });
  const [error, setError] = useState("");

  const registerMutation = useRegisterPlayer({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.player);
        setLocation("/");
      },
      onError: (err: any) => {
        setError(err?.data?.error ?? "Registration failed. Try again.");
      },
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.email || !form.password || !form.gameId) {
      setError("Sab fields fill karo.");
      return;
    }
    registerMutation.mutate({ data: form });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Flame className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-extrabold uppercase tracking-wider">Register</h1>
          <p className="text-muted-foreground mt-2 text-sm">Tournament mein participate karo</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Username</Label>
              <Input
                name="username"
                placeholder="YourName123"
                value={form.username}
                onChange={handleChange}
                data-testid="input-username"
                className="bg-background border-border focus:border-primary"
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Email</Label>
              <Input
                name="email"
                type="email"
                placeholder="aapka@email.com"
                value={form.email}
                onChange={handleChange}
                data-testid="input-email"
                className="bg-background border-border focus:border-primary"
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Password</Label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                data-testid="input-password"
                className="bg-background border-border focus:border-primary"
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Free Fire Game ID</Label>
              <Input
                name="gameId"
                placeholder="Your FF ID (e.g. 123456789)"
                value={form.gameId}
                onChange={handleChange}
                data-testid="input-game-id"
                className="bg-background border-border focus:border-primary"
                disabled={registerMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">Free Fire mein apna player ID dalo</p>
            </div>

            {error && (
              <div data-testid="text-register-error" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="button-submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
              ) : "Register Now"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pehle se account hai?{" "}
            <Link href="/login" className="text-primary hover:underline font-bold">
              Login karo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
