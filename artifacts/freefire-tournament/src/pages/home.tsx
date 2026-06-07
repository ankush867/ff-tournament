import { Link } from "wouter";
import { useGetStats, useListMatches } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Users, Trophy, Zap, Clock, ChevronRight, Target } from "lucide-react";

function MatchCard({ match }: { match: any }) {
  const isFull = match.registeredCount >= match.maxPlayers;
  const isLive = match.status === "live";

  const typeColors: Record<string, string> = {
    solo: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    duo: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    squad: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <Link href={`/matches/${match.id}`} data-testid={`card-match-${match.id}`}>
      <div className="group relative bg-card border border-border hover:border-primary/40 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Badge className={`text-xs uppercase tracking-wider border ${typeColors[match.type]}`}>
              {match.type}
            </Badge>
            {isLive ? (
              <span className="flex items-center gap-1 text-xs text-green-400 font-bold uppercase">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{match.status}</span>
            )}
          </div>
          <h3 className="font-bold text-foreground text-base mb-1 group-hover:text-primary transition-colors">{match.title}</h3>
          {match.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{match.description}</p>
          )}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span data-testid={`player-count-${match.id}`} className={isFull ? "text-red-400 font-bold" : "text-foreground font-medium"}>
                {match.registeredCount}/{match.maxPlayers}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-primary">Rs {match.entryFee}</span>
            </div>
          </div>
          {match.prizePool && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
              <Trophy className="w-3 h-3" />
              <span>{match.prizePool}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const { data: stats } = useGetStats();
  const { data: liveMatches } = useListMatches({ type: undefined, status: "live" });
  const { data: upcomingMatches } = useListMatches({ type: undefined, status: "upcoming" });

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,85,0,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="w-8 h-8 text-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Free Fire Tournament Platform</span>
            <Flame className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight uppercase italic mb-4">
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Enter The Arena
            </span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Compete in Solo, Duo, and Squad tournaments. Register, pay entry fee, and battle for glory.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/matches">
              <Button size="lg" data-testid="button-view-tournaments" className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider px-8">
                <Zap className="w-4 h-4 mr-2" />
                View Tournaments
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" data-testid="button-register-now" className="border-primary/40 text-primary hover:bg-primary/10 font-bold uppercase tracking-wider px-8">
                Register Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="py-10 border-y border-border bg-card/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div data-testid="stat-total-matches">
                <div className="text-3xl font-extrabold text-primary">{stats.totalMatches}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Matches</div>
              </div>
              <div data-testid="stat-live-matches">
                <div className="text-3xl font-extrabold text-green-400">{stats.liveMatches}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Live Now</div>
              </div>
              <div data-testid="stat-total-players">
                <div className="text-3xl font-extrabold text-secondary">{stats.totalPlayers}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Players</div>
              </div>
              <div data-testid="stat-total-registrations">
                <div className="text-3xl font-extrabold text-amber-400">{stats.totalRegistrations}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Registrations</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tournament Types */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-2xl font-extrabold uppercase tracking-wider text-center mb-10">
          Tournament <span className="text-primary">Types</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { type: "solo", fee: 10, icon: Target, desc: "1 vs 17 — Pure individual skill. Only the best survives.", color: "orange" },
            { type: "duo", fee: 20, icon: Users, desc: "2-player teams competing against other duos.", color: "amber" },
            { type: "squad", fee: 40, icon: Flame, desc: "4-player squad battles for the ultimate team prize.", color: "red" },
          ].map(({ type, fee, icon: Icon, desc, color }) => (
            <Link key={type} href={`/matches?type=${type}`} data-testid={`card-type-${type}`}>
              <div className={`group relative p-6 bg-card border border-${color}-500/20 hover:border-${color}-500/50 rounded-lg transition-all cursor-pointer hover:shadow-lg hover:shadow-${color}-500/10`}>
                <Icon className={`w-8 h-8 text-${color}-500 mb-3`} />
                <h3 className="font-extrabold text-xl uppercase tracking-wider mb-2">{type}</h3>
                <p className="text-muted-foreground text-sm mb-4">{desc}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-${color}-400 font-bold text-lg`}>Rs {fee} Entry</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live Matches */}
      {liveMatches && liveMatches.length > 0 && (
        <section className="py-10 border-t border-border bg-card/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-xl font-extrabold uppercase tracking-wider">Live Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <section className="py-10 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-extrabold uppercase tracking-wider">Upcoming Tournaments</h2>
              </div>
              <Link href="/matches">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.slice(0, 6).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* UPI Payment Info */}
      <section className="py-16 border-t border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold uppercase tracking-wider mb-4">
              How to <span className="text-primary">Pay</span>
            </h2>
            <p className="text-muted-foreground mb-8">Pay your entry fee via UPI and your slot gets confirmed by admin.</p>
            <div className="bg-card border border-border rounded-xl p-8 inline-block">
              <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">UPI ID</div>
              <div className="text-2xl font-bold text-primary mb-4 font-mono">7762067909@ibl</div>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="text-orange-400 font-bold">Solo</div>
                  <div className="text-white font-bold text-lg">Rs 10</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="text-amber-400 font-bold">Duo</div>
                  <div className="text-white font-bold text-lg">Rs 20</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="text-red-400 font-bold">Squad</div>
                  <div className="text-white font-bold text-lg">Rs 40</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">After payment, WhatsApp screenshot to 7762067909 for confirmation</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
