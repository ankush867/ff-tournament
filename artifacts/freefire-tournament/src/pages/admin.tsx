import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListMatches,
  useCreateMatch,
  useUpdateMatch,
  useDeleteMatch,
  useListAllRegistrations,
  useConfirmRegistration,
  getListMatchesQueryKey,
  getListAllRegistrationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Shield, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Loader2, Users, Key, Trophy } from "lucide-react";

async function setRegistrationRank(regId: number, rank: number | null) {
  const token = localStorage.getItem("ff_token");
  const res = await fetch(`/api/admin/registrations/${regId}/rank`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ rank }),
  });
  if (!res.ok) throw new Error("Failed to set rank");
  return res.json();
}

function CreateMatchDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "solo" as "solo" | "duo" | "squad",
    scheduledAt: "",
    maxPlayers: 18,
    prizePool: "",
    description: "",
    roomId: "",
    roomPassword: "",
  });

  const createMatch = useCreateMatch({
    mutation: {
      onSuccess: () => {
        onSuccess();
        setOpen(false);
        setForm({ title: "", type: "solo", scheduledAt: "", maxPlayers: 18, prizePool: "", description: "", roomId: "", roomPassword: "" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMatch.mutate({
      data: {
        title: form.title,
        type: form.type,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        maxPlayers: form.maxPlayers,
        prizePool: form.prizePool || null,
        description: form.description || null,
        roomId: form.roomId || null,
        roomPassword: form.roomPassword || null,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 font-bold uppercase tracking-wider" data-testid="button-create-match">
          <Plus className="w-4 h-4 mr-2" /> New Match
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold uppercase tracking-wider">Create New Match</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Solo Battle Royale #1" required data-testid="input-match-title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger data-testid="select-match-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo (Rs 10)</SelectItem>
                  <SelectItem value="duo">Duo (Rs 20)</SelectItem>
                  <SelectItem value="squad">Squad (Rs 40)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Players</Label>
              <Input type="number" value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: parseInt(e.target.value) })} min={2} max={100} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Schedule</Label>
            <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} required data-testid="input-match-schedule" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prize Pool (Optional)</Label>
            <Input value={form.prizePool} onChange={e => setForm({ ...form, prizePool: e.target.value })} placeholder="Rs 100 Cash Prize" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Match description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Room ID (Optional)</Label>
              <Input value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} placeholder="FF Room ID" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Room Password (Optional)</Label>
              <Input value={form.roomPassword} onChange={e => setForm({ ...form, roomPassword: e.target.value })} placeholder="Password" />
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold uppercase" disabled={createMatch.isPending} data-testid="button-submit-match">
            {createMatch.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Match"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMatchDialog({ match, onSuccess }: { match: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: match.title ?? "",
    type: match.type ?? "solo",
    scheduledAt: match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "",
    maxPlayers: match.maxPlayers ?? 18,
    prizePool: match.prizePool ?? "",
    description: match.description ?? "",
    roomId: match.roomId ?? "",
    roomPassword: match.roomPassword ?? "",
    status: match.status ?? "upcoming",
  });

  const updateMatch = useUpdateMatch({
    mutation: {
      onSuccess: () => {
        onSuccess();
        setOpen(false);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMatch.mutate({
      id: match.id,
      data: {
        title: form.title,
        type: form.type as any,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        maxPlayers: form.maxPlayers,
        prizePool: form.prizePool || null,
        description: form.description || null,
        roomId: form.roomId || null,
        roomPassword: form.roomPassword || null,
        status: form.status as any,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) setForm({
        title: match.title ?? "",
        type: match.type ?? "solo",
        scheduledAt: match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "",
        maxPlayers: match.maxPlayers ?? 18,
        prizePool: match.prizePool ?? "",
        description: match.description ?? "",
        roomId: match.roomId ?? "",
        roomPassword: match.roomPassword ?? "",
        status: match.status ?? "upcoming",
      });
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/20 h-8 w-8" data-testid={`button-edit-match-${match.id}`}>
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold uppercase tracking-wider">Edit Match</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo (Rs 10)</SelectItem>
                  <SelectItem value="duo">Duo (Rs 20)</SelectItem>
                  <SelectItem value="squad">Squad (Rs 40)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Players</Label>
              <Input type="number" value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: parseInt(e.target.value) })} min={2} max={100} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Schedule</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prize Pool (Optional)</Label>
            <Input value={form.prizePool} onChange={e => setForm({ ...form, prizePool: e.target.value })} placeholder="Rs 100 Cash Prize" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Match description..." />
          </div>

          {/* Room Details - highlighted section */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Key className="w-3.5 h-3.5" /> Room Details (Match hone ke baad fill karo)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Room ID</Label>
                <Input
                  value={form.roomId}
                  onChange={e => setForm({ ...form, roomId: e.target.value })}
                  placeholder="FF Room ID"
                  className="border-primary/40 focus:border-primary"
                  data-testid={`input-room-id-${match.id}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Room Password</Label>
                <Input
                  value={form.roomPassword}
                  onChange={e => setForm({ ...form, roomPassword: e.target.value })}
                  placeholder="Password"
                  className="border-primary/40 focus:border-primary"
                  data-testid={`input-room-password-${match.id}`}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Room ID/Password sirf registered players ko match detail page pe dikhega.</p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold uppercase" disabled={updateMatch.isPending}>
            {updateMatch.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MatchStatusSelect({ matchId, currentStatus, onSuccess }: { matchId: number; currentStatus: string; onSuccess: () => void }) {
  const updateMatch = useUpdateMatch({
    mutation: { onSuccess },
  });

  return (
    <Select
      value={currentStatus}
      onValueChange={(v) => updateMatch.mutate({ id: matchId, data: { status: v as any } })}
    >
      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-status-${matchId}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="upcoming">Upcoming</SelectItem>
        <SelectItem value="live">Live</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function Admin() {
  const { player } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (player !== undefined && !player?.isAdmin) {
      setLocation("/");
    }
  }, [player, setLocation]);

  const { data: matches, isLoading: matchesLoading } = useListMatches({}, {
    query: { enabled: !!player?.isAdmin, queryKey: getListMatchesQueryKey() }
  });
  const { data: registrations, isLoading: regsLoading } = useListAllRegistrations({
    query: { enabled: !!player?.isAdmin, queryKey: getListAllRegistrationsQueryKey() }
  });

  const deleteMatch = useDeleteMatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
      },
    },
  });

  const confirmRegistration = useConfirmRegistration({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAllRegistrationsQueryKey() });
      },
    },
  });

  const refreshMatches = () => queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });

  if (!player?.isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-wider">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Manage tournaments and registrations</p>
        </div>
      </div>

      <Tabs defaultValue="matches">
        <TabsList className="mb-6 bg-card border border-border">
          <TabsTrigger value="matches" className="uppercase tracking-wider text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            Matches
          </TabsTrigger>
          <TabsTrigger value="registrations" className="uppercase tracking-wider text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            Registrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">All Matches ({matches?.length ?? 0})</h2>
            <CreateMatchDialog onSuccess={refreshMatches} />
          </div>

          {matchesLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {matches?.map((match) => (
                <div key={match.id} data-testid={`row-match-${match.id}`} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs uppercase tracking-wider border ${
                        match.type === "solo" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                        match.type === "duo" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}>
                        {match.type}
                      </Badge>
                    </div>
                    <div className="font-bold">{match.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(match.scheduledAt).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" })} &bull; Rs {match.entryFee} &bull;{" "}
                      <span className="flex items-center gap-1 inline-flex">
                        <Users className="w-3 h-3" /> {match.registeredCount}/{match.maxPlayers}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MatchStatusSelect matchId={match.id} currentStatus={match.status} onSuccess={refreshMatches} />
                    <EditMatchDialog match={match} onSuccess={refreshMatches} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/20 h-8 w-8"
                      onClick={() => {
                        if (confirm(`Delete "${match.title}"?`)) {
                          deleteMatch.mutate({ id: match.id });
                        }
                      }}
                      data-testid={`button-delete-match-${match.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="registrations">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">All Registrations ({registrations?.length ?? 0})</h2>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <Trophy className="w-3.5 h-3.5" /> Rank buttons se Top 3 winners assign karo
            </div>
          </div>

          {regsLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {registrations?.map((reg: any) => (
                <div key={reg.id} data-testid={`row-registration-${reg.id}`} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {reg.rank && <span className="text-xl">{["🥇","🥈","🥉"][reg.rank - 1]}</span>}
                        <div className="font-bold">{reg.playerUsername}</div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{reg.playerGameId}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reg.match?.title} &bull; {reg.match?.type?.toUpperCase()} &bull; Rs {reg.match?.entryFee}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(reg.registeredAt).toLocaleString("hi-IN", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={`text-xs border ${reg.paymentStatus === "confirmed" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>
                        {reg.paymentStatus === "confirmed" ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed</>
                        ) : (
                          <><AlertCircle className="w-3 h-3 mr-1" /> Pending</>
                        )}
                      </Badge>
                      {reg.paymentStatus === "pending" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-wider"
                          onClick={() => confirmRegistration.mutate({ id: reg.id })}
                          data-testid={`button-confirm-reg-${reg.id}`}
                          disabled={confirmRegistration.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm Payment
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Rank assignment - only show for confirmed registrations */}
                  {reg.paymentStatus === "confirmed" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-muted-foreground">Rank:</span>
                      {[
                        { rank: 1, label: "🥇 1st", active: "bg-amber-500 text-white border-amber-500" },
                        { rank: 2, label: "🥈 2nd", active: "bg-gray-400 text-white border-gray-400" },
                        { rank: 3, label: "🥉 3rd", active: "bg-orange-700 text-white border-orange-700" },
                      ].map(({ rank, label, active }) => (
                        <button
                          key={rank}
                          data-testid={`button-rank-${rank}-reg-${reg.id}`}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-colors ${
                            reg.rank === rank
                              ? active
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                          onClick={async () => {
                            const newRank = reg.rank === rank ? null : rank;
                            await setRegistrationRank(reg.id, newRank);
                            queryClient.invalidateQueries({ queryKey: getListAllRegistrationsQueryKey() });
                          }}
                        >
                          {label}
                        </button>
                      ))}
                      {reg.rank && (
                        <button
                          className="text-xs px-2 py-1 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={async () => {
                            await setRegistrationRank(reg.id, null);
                            queryClient.invalidateQueries({ queryKey: getListAllRegistrationsQueryKey() });
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
