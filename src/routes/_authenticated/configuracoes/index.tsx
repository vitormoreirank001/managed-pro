import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useIsMarketing } from "@/lib/role";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Sun, Moon, RefreshCw, Plus, ShieldCheck, ShieldOff, Users, Upload } from "lucide-react";
import { useRef } from "react";
import type { MarginType } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações — Managed" }] }),
  component: Config,
});

type UserEntry = {
  id: string;
  email: string;
  nome: string;
  role: string | null;
  bloqueado: boolean;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  vendedor: "Vendedor",
  marketing: "Marketing",
};

const roleCls: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  gestor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700",
  vendedor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
  marketing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700",
};

function Config() {
  const { user } = useAuth();
  const isMarketing = useIsMarketing();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Profile / settings
  const [loja, setLoja] = useState("");
  const [nome, setNome] = useState("");
  const [mtipo, setMtipo] = useState<MarginType>("valor");
  const [mmin, setMmin] = useState("5000");
  const [mmax, setMmax] = useState("10000");
  const [mPropTipo, setMPropTipo] = useState<MarginType>("percentual");
  const [mPropMin, setMPropMin] = useState("10");
  const [mPropMax, setMPropMax] = useState("20");
  const [mConsTipo, setMConsTipo] = useState<MarginType>("percentual");
  const [mConsMin, setMConsMin] = useState("5");
  const [mConsMax, setMConsMax] = useState("15");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced?: number; errors?: number; message?: string } | null>(null);

  // New user modal
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email: "", nome: "", password: "", role: "vendedor" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome, loja_nome, logo_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setNome(data.nome); setLoja(data.loja_nome); setLogoUrl((data as any).logo_url ?? null); }
    });
    supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setMtipo(data.margem_padrao_tipo);
        setMmin(String(data.margem_padrao_min));
        setMmax(String(data.margem_padrao_max));
        setMPropTipo((data as any).margem_proprio_tipo ?? "percentual");
        setMPropMin(String((data as any).margem_proprio_min ?? 10));
        setMPropMax(String((data as any).margem_proprio_max ?? 20));
        setMConsTipo((data as any).margem_consignado_tipo ?? "percentual");
        setMConsMin(String((data as any).margem_consignado_min ?? 5));
        setMConsMax(String((data as any).margem_consignado_max ?? 15));
      }
    });
  }, [user]);

  // Users list
  const { data: usuarios, isLoading: loadingUsers } = useQuery<UserEntry[]>({
    queryKey: ["admin-users"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data as UserEntry[];
    },
  });

  async function saveProfile() {
    const { error } = await supabase.from("profiles").update({ nome, loja_nome: loja }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  async function syncAutoconf() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-autoconf");
      if (error) throw error;
      setSyncResult(data);
      toast.success(`Sincronização concluída: ${data?.synced ?? 0} veículos sincronizados`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao sincronizar");
      setSyncResult({ message: err?.message ?? "Erro desconhecido" });
    } finally {
      setSyncing(false);
    }
  }

  async function saveSettings() {
    const { error } = await supabase.from("settings").upsert({
      user_id: user!.id,
      margem_padrao_tipo: mtipo,
      margem_padrao_min: Number(mmin),
      margem_padrao_max: Number(mmax),
      margem_proprio_tipo: mPropTipo,
      margem_proprio_min: Number(mPropMin),
      margem_proprio_max: Number(mPropMax),
      margem_consignado_tipo: mConsTipo,
      margem_consignado_min: Number(mConsMin),
      margem_consignado_max: Number(mConsMax),
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  }

  async function criarUsuario() {
    if (!form.email || !form.password) { toast.error("Email e senha obrigatórios"); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", email: form.email, password: form.password, nome: form.nome, role: form.role },
    });
    setSaving(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message); return; }
    toast.success("Usuário criado com sucesso");
    setModal(false);
    setForm({ email: "", nome: "", password: "", role: "vendedor" });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function toggleBan(u: UserEntry) {
    const ban = !u.bloqueado;
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "toggle-ban", userId: u.id, ban },
    });
    if (error || data?.error) { toast.error(data?.error ?? error?.message); return; }
    toast.success(ban ? `${u.email} bloqueado` : `${u.email} desbloqueado`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const path = `logos/${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("vehicle-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploadingLogo(false); return; }
    const { data: pub } = supabase.storage.from("vehicle-images").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({ logo_url: url } as any).eq("id", user!.id);
    setLogoUrl(url);
    toast.success("Logo atualizada");
    setUploadingLogo(false);
    if (logoRef.current) logoRef.current.value = "";
  }

  async function updateRole(u: UserEntry, role: string) {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "update-role", userId: u.id, role: role === "none" ? null : role },
    });
    if (error || data?.error) { toast.error(data?.error ?? error?.message); return; }
    toast.success("Permissão atualizada");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  if (isMarketing) {
    return (
      <>
        <PageHeader title="Configurações" subtitle="Personalize a plataforma" />
        <Card className="p-8 text-center text-muted-foreground">
          Acesso restrito. Contate o administrador para alterar configurações.
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Personalize a plataforma" />
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Perfil */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Identidade da loja</h3>
          <div className="space-y-3">
            <div>
              <Label>Logo da loja</Label>
              <div className="flex items-center gap-3 mt-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-lg">M</div>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                <Button variant="outline" size="sm" disabled={uploadingLogo} onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />{uploadingLogo ? "Enviando..." : "Alterar logo"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Aparece na barra lateral. Recomendado: quadrado, mín. 80×80px.</p>
            </div>
            <div><Label>Seu nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div>
              <Label>Nome da loja</Label>
              <Input value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Ex.: Gustavo Motors" />
              <p className="text-xs text-muted-foreground mt-1">Aparece como "Managed {loja || "..."}"</p>
            </div>
            <Button onClick={saveProfile}>Salvar</Button>
          </div>
        </Card>

        {/* Margem */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Margens padrão</h3>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground uppercase text-xs tracking-wide">Geral</p>
              <Tabs value={mtipo} onValueChange={(v) => setMtipo(v as MarginType)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="valor">R$</TabsTrigger>
                  <TabsTrigger value="percentual">%</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div><Label className="text-xs">Mínima</Label><Input type="number" step="0.01" value={mmin} onChange={(e) => setMmin(e.target.value)} /></div>
                <div><Label className="text-xs">Ideal</Label><Input type="number" step="0.01" value={mmax} onChange={(e) => setMmax(e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground uppercase text-xs tracking-wide">Próprio</p>
              <Tabs value={mPropTipo} onValueChange={(v) => setMPropTipo(v as MarginType)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="valor">R$</TabsTrigger>
                  <TabsTrigger value="percentual">%</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div><Label className="text-xs">Mínima</Label><Input type="number" step="0.01" value={mPropMin} onChange={(e) => setMPropMin(e.target.value)} /></div>
                <div><Label className="text-xs">Ideal</Label><Input type="number" step="0.01" value={mPropMax} onChange={(e) => setMPropMax(e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground uppercase text-xs tracking-wide">Consignado</p>
              <Tabs value={mConsTipo} onValueChange={(v) => setMConsTipo(v as MarginType)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="valor">R$</TabsTrigger>
                  <TabsTrigger value="percentual">%</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div><Label className="text-xs">Mínima</Label><Input type="number" step="0.01" value={mConsMin} onChange={(e) => setMConsMin(e.target.value)} /></div>
                <div><Label className="text-xs">Ideal</Label><Input type="number" step="0.01" value={mConsMax} onChange={(e) => setMConsMax(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <Button onClick={saveSettings} className="mt-5">Salvar margens</Button>
        </Card>

        {/* Autoconf */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-2">Integração Autoconf</h3>
          <p className="text-sm text-muted-foreground mb-4">Sincroniza veículos, preços e fotos do site gustavomotors.com.br automaticamente.</p>
          <div className="flex items-center gap-4">
            <Button onClick={syncAutoconf} disabled={syncing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
            {syncResult && (
              <p className="text-sm text-muted-foreground">
                {syncResult.message
                  ? `Erro: ${syncResult.message}`
                  : `${syncResult.synced ?? 0} sincronizados · ${syncResult.errors ?? 0} erros`}
              </p>
            )}
          </div>
        </Card>

        {/* Aparência */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Aparência</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tema</p>
              <p className="text-sm text-muted-foreground">Atualmente {theme === "light" ? "claro" : "escuro"}</p>
            </div>
            <Button variant="outline" onClick={toggle}>
              {theme === "light" ? <><Moon className="h-4 w-4 mr-2" />Mudar para escuro</> : <><Sun className="h-4 w-4 mr-2" />Mudar para claro</>}
            </Button>
          </div>
        </Card>

        {/* Usuários */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Usuários</h3>
            </div>
            <Button size="sm" onClick={() => setModal(true)}>
              <Plus className="h-4 w-4 mr-2" />Novo usuário
            </Button>
          </div>

          {loadingUsers && <p className="text-sm text-muted-foreground">Carregando usuários...</p>}

          {!loadingUsers && (usuarios?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
          )}

          <div className="divide-y divide-border">
            {(usuarios ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3 flex-wrap">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.nome || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>

                {/* Status badge */}
                {u.bloqueado && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700 whitespace-nowrap">
                    Bloqueado
                  </span>
                )}

                {/* Role selector */}
                <Select
                  value={u.role ?? "none"}
                  onValueChange={(role) => updateRole(u, role)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue>
                      {u.role ? (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${roleCls[u.role] ?? ""}`}>
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sem papel</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem papel</SelectItem>
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Block / unblock */}
                {u.id !== user?.id && (
                  <Button
                    size="sm"
                    variant={u.bloqueado ? "outline" : "outline"}
                    className={u.bloqueado ? "text-success border-success/40 hover:bg-success/10" : "text-destructive border-destructive/40 hover:bg-destructive/10"}
                    onClick={() => toggleBan(u)}
                  >
                    {u.bloqueado
                      ? <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Desbloquear</>
                      : <><ShieldOff className="h-3.5 w-3.5 mr-1.5" />Bloquear</>
                    }
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal: Novo usuário */}
      <Dialog open={modal} onOpenChange={(o) => { if (!saving) setModal(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label>Gmail <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                placeholder="usuario@gmail.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Senha <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Senha de acesso"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <Label>Permissão</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <p><span className="font-medium">Admin</span> — acesso total, incluindo configurações</p>
                <p><span className="font-medium">Gestor</span> — visualiza tudo, edita estoque e financeiro</p>
                <p><span className="font-medium">Vendedor</span> — acessa estoque e registra vendas</p>
                <p><span className="font-medium">Marketing</span> — visualização somente</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={criarUsuario} disabled={saving || !form.email || !form.password}>
              {saving ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
