import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useGetMatch, useRegisterForMatch, getGetMatchQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Clock, Flame, Copy, CheckCircle2, Loader2, ArrowLeft, MessageCircle, QrCode, Upload, ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";

async function uploadScreenshot(registrationId: number, base64: string) {
  const token = localStorage.getItem("ff_token");
  const res = await fetch(`/api/registrations/${registrationId}/screenshot`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ screenshot: base64 }),
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { player } = useAuth();
  const queryClient = useQueryClient();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotDone, setScreenshotDone] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) }
  });

  const registerMutation = useRegisterForMatch({
    mutation: {
      onSuccess: (data: any) => {
        setRegistrationSuccess(true);
        setRegistrationId(data.id);
        queryClient.invalidateQueries({ queryKey: getGetMatchQueryKey(matchId) });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: (err: any) => {
        setError(err?.data?.error ?? "Registration failed. Try again.");
      },
    },
  });

  const handleRegister = () => {
    if (!player) { setLocation("/login"); return; }
    setError("");
    registerMutation.mutate({ id: matchId, data: {} });
  };

  const copyUpi = () => {
    navigator.clipboard.writeText("7762067909@ibl");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !registrationId) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("File too large! Max 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setScreenshotPreview(base64);
      setScreenshotUploading(true);
      try {
        await uploadScreenshot(registrationId, base64);
        setScreenshotDone(true);
      } catch {
        alert("Screenshot upload failed. Please try WhatsApp.");
      } finally {
        setScreenshotUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const myRegistration = player && (match as any)?.registrations?.find((r: any) => r.playerId === player.id);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Match not found.</p>
        <Link href="/matches"><Button variant="link" className="text-primary mt-4">Back to matches</Button></Link>
      </div>
    );
  }

  const isFull = match.registeredCount >= match.maxPlayers;
  const isLive = match.status === "live";
  const isUpcoming = match.status === "upcoming";
  const isPlayerRegistered = !!myRegistration;
  const currentRegId = registrationId || myRegistration?.id;

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/matches">
        <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4 mr-1" /> All Matches
        </Button>
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <Badge className={`uppercase tracking-wider text-xs border ${
                match.type === "solo" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                match.type === "duo" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                "bg-red-500/20 text-red-400 border-red-500/30"
              }`}>
                {match.type}
              </Badge>
              {isLive ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{match.status}</span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-wide mb-3">{match.title}</h1>
            {match.description && <p className="text-muted-foreground mb-4">{match.description}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entry Fee</div>
                <div className="text-xl font-bold text-primary">Rs {match.entryFee}</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Players</div>
                <div className={`text-xl font-bold ${isFull ? "text-red-400" : "text-foreground"}`}>
                  {match.registeredCount}/{match.maxPlayers}
                </div>
              </div>
              {match.prizePool && (
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</div>
                  <div className="text-base font-bold text-amber-400">{match.prizePool}</div>
                </div>
              )}
              <div className="bg-background rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Schedule</div>
                <div className="text-sm font-bold">{new Date(match.scheduledAt).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
              </div>
            </div>

            {isLive && match.roomId && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-xs text-green-400 uppercase tracking-wider font-bold mb-2">Room Details (Confirmed Players Only)</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Room ID:</span>
                  <span className="font-bold text-foreground">{match.roomId}</span>
                </div>
                {match.roomPassword && (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="text-muted-foreground">Password:</span>
                    <span className="font-bold text-foreground">{match.roomPassword}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top 3 Winners */}
          {match.status === "completed" && (match as any).registrations?.some((r: any) => r.rank) && (
            <div className="bg-card border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="font-extrabold uppercase tracking-wider text-amber-400">Winners</h2>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((rank) => {
                  const winner = (match as any).registrations?.find((r: any) => r.rank === rank);
                  if (!winner) return null;
                  const medals = ["🥇", "🥈", "🥉"];
                  const colors = [
                    "bg-amber-500/20 border-amber-500/40 text-amber-300",
                    "bg-gray-400/20 border-gray-400/40 text-gray-300",
                    "bg-orange-700/20 border-orange-700/40 text-orange-400",
                  ];
                  return (
                    <div key={rank} className={`flex items-center gap-4 rounded-xl p-4 border ${colors[rank - 1]}`}>
                      <span className="text-3xl">{medals[rank - 1]}</span>
                      <div className="flex-1">
                        <div className="font-bold text-base text-foreground">{winner.playerUsername}</div>
                        <div className="text-xs text-muted-foreground font-mono">{winner.playerGameId}</div>
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {rank === 1 ? "1st Place" : rank === 2 ? "2nd Place" : "3rd Place"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player List */}
          {(match as any).registrations && (match as any).registrations.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-4">
                Registered Players ({(match as any).registrations.length})
              </h2>
              <div className="space-y-2">
                {(match as any).registrations.map((reg: any, i: number) => (
                  <div key={reg.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      {reg.rank ? (
                        <span className="text-lg">{["🥇", "🥈", "🥉"][reg.rank - 1]}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                      )}
                      <div>
                        <div className="font-semibold text-sm">{reg.playerUsername}</div>
                        <div className="text-xs text-muted-foreground font-mono">{reg.playerGameId}</div>
                      </div>
                    </div>
                    <Badge className={`text-xs ${reg.paymentStatus === "confirmed" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"} border`}>
                      {reg.paymentStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Registration Panel */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
            <h2 className="font-bold uppercase tracking-wider text-sm mb-4">Register for Match</h2>

            {isPlayerRegistered || registrationSuccess ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-bold text-green-400">Registered!</p>
                <p className="text-xs text-muted-foreground mt-2">UPI se payment karo aur niche screenshot upload karo.</p>
              </div>
            ) : (
              <>
                {!isUpcoming ? (
                  <p className="text-muted-foreground text-sm text-center">Registrations band hain.</p>
                ) : isFull ? (
                  <p className="text-red-400 text-sm text-center font-bold">Match Full! Koi slot nahi bacha.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Entry Fee</span>
                      <span className="font-bold text-primary text-xl">Rs {match.entryFee}</span>
                    </div>
                    {error && (
                      <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">
                        {error}
                      </div>
                    )}
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 font-bold uppercase tracking-wider"
                      onClick={handleRegister}
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
                      ) : !player ? "Login to Register" : "Register Now"}
                    </Button>
                  </>
                )}
              </>
            )}

            {/* Payment Info */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3">
                <QrCode className="w-3.5 h-3.5" /> UPI Payment
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center bg-white rounded-xl p-4 mb-3">
                <QRCodeSVG
                  value={`upi://pay?pa=7762067909@ibl&pn=FF+Tourney&am=${match.entryFee}&cu=INR&tn=${encodeURIComponent(match.title + " Entry")}`}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="M"
                  includeMargin={false}
                />
                <p className="text-[10px] text-gray-500 mt-2 text-center font-medium">
                  PhonePe • Google Pay • Navi • Paytm se scan karo
                </p>
                <p className="text-[11px] font-bold text-orange-600 mt-1">Rs {match.entryFee} auto-fill ho jayega</p>
              </div>

              {/* UPI ID */}
              <div className="bg-background rounded-lg p-3 mb-3">
                <div className="text-xs text-muted-foreground mb-1">Ya manually UPI ID daalo</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-primary font-mono">7762067909@ibl</span>
                  <button onClick={copyUpi} className="text-muted-foreground hover:text-primary transition-colors">
                    {copiedUpi ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Screenshot Upload - only after registration */}
              {(isPlayerRegistered || registrationSuccess) && currentRegId && (
                <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    <Upload className="w-3.5 h-3.5" /> Payment Screenshot Upload Karo
                  </div>

                  {screenshotDone ? (
                    <div className="flex items-center gap-2 text-xs text-green-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Screenshot uploaded! Admin verify karega.
                    </div>
                  ) : (
                    <>
                      {screenshotPreview && (
                        <img src={screenshotPreview} alt="Screenshot preview" className="w-full rounded-lg mb-2 max-h-32 object-contain bg-black/20" />
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-xs font-bold uppercase"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={screenshotUploading}
                      >
                        {screenshotUploading ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</>
                        ) : (
                          <><ImageIcon className="w-3 h-3 mr-1" /> Screenshot Choose Karo</>
                        )}
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Max 3MB. JPG/PNG.</p>
                    </>
                  )}
                </div>
              )}

              <a
                href="https://wa.me/917762067909"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-green-400 hover:underline mt-3"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Ya WhatsApp pe screenshot bhejo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
