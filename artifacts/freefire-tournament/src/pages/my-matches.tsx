import { useLocation, Link } from "wouter";
import { useGetMyRegistrations } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Users, Flame, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export function MyMatches() {
  const { player } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!player) {
      setLocation("/login");
    }
  }, [player, setLocation]);

  const { data: registrations, isLoading } = useGetMyRegistrations({
    query: { enabled: !!player }
  });

  if (!player) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-1">
          My <span className="text-primary">Matches</span>
        </h1>
        <p className="text-muted-foreground text-sm">Welcome, <span className="text-foreground font-bold">{player.username}</span> — your registered tournaments</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && registrations && registrations.length === 0 && (
        <div className="text-center py-20">
          <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Koi registration nahi mili</p>
          <p className="text-muted-foreground text-sm mt-1">Ab tournament join karo!</p>
          <Link href="/matches">
            <Button className="mt-6 bg-primary hover:bg-primary/90 font-bold uppercase tracking-wider">
              Browse Tournaments
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && registrations && registrations.length > 0 && (
        <div className="space-y-4">
          {registrations.map((reg: any) => {
            const match = reg.match;
            const isLive = match?.status === "live";
            return (
              <Link key={reg.id} href={`/matches/${reg.matchId}`} data-testid={`card-registration-${reg.id}`}>
                <div className="group bg-card border border-border hover:border-primary/40 rounded-xl p-5 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs uppercase tracking-wider border ${
                          match?.type === "solo" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                          match?.type === "duo" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                          "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}>
                          {match?.type}
                        </Badge>
                        {isLive && (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-bold uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{match?.title}</h3>
                      {match?.scheduledAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(match.scheduledAt).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Entry</div>
                        <div className="font-bold text-primary">Rs {match?.entryFee}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Payment</div>
                        {reg.paymentStatus === "confirmed" ? (
                          <div className="flex items-center gap-1 text-green-400 font-bold text-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmed
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Pending
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {reg.paymentStatus === "pending" && (
                    <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      Rs {match?.entryFee} UPI ID: <span className="text-primary font-mono font-bold">7762067909@ibl</span> pe bhejo aur WhatsApp pe confirm karo
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
