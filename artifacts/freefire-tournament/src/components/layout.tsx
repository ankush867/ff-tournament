import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Flame, Shield, User, Menu, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";

export function Layout({ children }: { children: React.ReactNode }) {
  const { player, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const navLinks = [
    { href: "/matches", label: "Tournaments" },
    ...(player ? [{ href: "/my-matches", label: "My Matches" }] : []),
    ...(player?.isAdmin ? [{ href: "/admin", label: "Admin Panel" }] : []),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground overflow-x-hidden font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Flame className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xl tracking-wider uppercase italic bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              FF Tourney
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {player ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-foreground">{player.username}</span>
                  {player.isAdmin && <Shield className="w-4 h-4 text-primary" />}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-border hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 transition-colors">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="font-bold tracking-wider uppercase">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider uppercase">Register</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-foreground p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors block"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px w-full bg-border" />
            {player ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-foreground">{player.username}</span>
                  {player.isAdmin && <Shield className="w-4 h-4 text-primary" />}
                </div>
                <Button variant="outline" size="sm" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full justify-start">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start font-bold tracking-wider uppercase">Login</Button>
                </Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider uppercase">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col relative">
        {/* Background glow effect */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        {children}
      </main>

      <footer className="border-t border-border/40 bg-card/50 py-8 mt-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-bold uppercase tracking-wider text-muted-foreground">FF Tourney &copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">
            Not affiliated with Garena. This is a community platform.
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/917762067909" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-110 z-50"
      >
        <SiWhatsapp className="w-7 h-7" />
      </a>
    </div>
  );
}
