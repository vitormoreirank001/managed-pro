import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Car,
  Wallet,
  Receipt,
  PieChart,
  Target,
  Users,
  FileBarChart2,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; section?: string };

const nav: NavItem[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, section: "Geral" },
  { to: "/estoque", label: "Estoque", icon: Car, section: "Geral" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, section: "Financeiro" },
  { to: "/financeiro/despesas", label: "Despesas", icon: Receipt, section: "Financeiro" },
  { to: "/financeiro/dre", label: "DRE", icon: PieChart, section: "Financeiro" },
  { to: "/financeiro/margem", label: "Controle de Margem", icon: Target, section: "Financeiro" },
  { to: "/colaboradores", label: "Colaboradores", icon: Users, section: "Gestão" },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2, section: "Gestão" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, section: "Gestão" },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [lojaNome, setLojaNome] = useState("Minha Loja");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("loja_nome")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => data?.loja_nome && setLojaNome(data.loja_nome));
  }, [user]);

  const sections = Array.from(new Set(nav.map((n) => n.section!)));

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
            M
          </div>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Managed</p>
            <p className="text-sm font-semibold truncate max-w-[140px]">{lojaNome}</p>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
          {sections.map((sec) => (
            <div key={sec}>
              <p className="px-3 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {sec}
              </p>
              <ul className="space-y-1">
                {nav
                  .filter((n) => n.section === sec)
                  .map((n) => {
                    const active = n.to === "/" ? path === "/" : path === n.to || path.startsWith(n.to + "/");
                    const Icon = n.icon;
                    return (
                      <li key={n.to}>
                        <Link
                          to={n.to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{n.label}</span>
                          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-foreground/30 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center px-4 lg:px-8 gap-3 no-print">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-sm text-muted-foreground">Bem-vindo</h2>
            <p className="font-medium truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
