import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListMatches } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Flame, Clock, Zap, Target, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function MatchCard({ match }: { match: any }) {
  const isFull = match.registeredCount >= match.maxPlayers;
  const isLive = match.status === "live";

  return (
    <Link href={`/matches/${match.id}`} data-testid={`card-match-${match.id}`}>
      <div className="group relative bg-card border border-border hover:border-primary/40 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer h-full">
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Badge className={`text-xs uppercase tracking-wider border ${
              match.type === "solo" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
              match.type === "duo" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
              "bg-red-500/20 text-red-400 border-red-500/30"
            }`}>
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
          <h3 className="font-bold text-foreground text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">{match.title}</h3>
          {match.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{match.description}</p>
          )}
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(match.scheduledAt).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span data-testid={`player-count-${match.id}`} className={`font-semibold ${isFull ? "text-red-400" : "text-foreground"}`}>
                {match.registeredCount}/{match.maxPlayers}
              </span>
            </div>
            <span className="text-primary font-bold">Rs {match.entryFee}</span>
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

export function Matches() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: matches, isLoading } = useListMatches({ type: typeFilter as any, status: statusFilter as any });

  const typeOptions = [
    { value: undefined, label: "All Types", icon: Filter },
    { value: "solo", label: "Solo", icon: Target },
    { value: "duo", label: "Duo", icon: Users },
    { value: "squad", label: "Squad", icon: Flame },
  ];

  const statusOptions = [
    { value: undefined, label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "live", label: "Live" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-2">
          All <span className="text-primary">Tournaments</span>
        </h1>
        <p className="text-muted-foreground">Participate in upcoming matches and win prizes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex gap-2 flex-wrap">
          {typeOptions.map(({ value, label, icon: Icon }) => (
            <Button
              key={String(value)}
              variant={typeFilter === value ? "default" : "outline"}
              size="sm"
              data-testid={`filter-type-${value ?? "all"}`}
              onClick={() => setTypeFilter(value)}
              className={`uppercase tracking-wider text-xs font-bold ${typeFilter === value ? "bg-primary text-white" : "border-border hover:border-primary/40"}`}
            >
              <Icon className="w-3 h-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map(({ value, label }) => (
            <Button
              key={String(value)}
              variant={statusFilter === value ? "default" : "outline"}
              size="sm"
              data-testid={`filter-status-${value ?? "all"}`}
              onClick={() => setStatusFilter(value)}
              className={`uppercase tracking-wider text-xs font-bold ${
                statusFilter === value ? 
                  (value === "live" ? "bg-green-500 text-white" : "bg-primary text-white") : 
                  "border-border hover:border-primary/40"
              }`}
            >
              {value === "live" && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />}
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && matches && matches.length === 0 && (
        <div className="text-center py-20">
          <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Abhi koi match available nahi hai</p>
          <p className="text-muted-foreground text-sm mt-1">Jald hi naye tournaments aayenge</p>
        </div>
      )}

      {!isLoading && matches && matches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
