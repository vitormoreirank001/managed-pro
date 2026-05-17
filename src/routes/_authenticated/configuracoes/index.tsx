import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Sun, Moon } from "lucide-react";
import type { MarginType } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações — Managed" }] }),
  component: Config,
});

function Config() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [loja, setLoja] = useState("");
  const [nome, setNome] = useState("");
  const [mtipo, setMtipo] = useState<MarginType>("valor");
  const [mmin, setMmin] = useState("5000");
  const [mmax, setMmax] = useState("10000");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome, loja_nome").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setNome(data.nome); setLoja(data.loja_nome); }
    });
    supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setMtipo(data.margem_padrao_tipo); setMmin(String(data.margem_padrao_min)); setMmax(String(data.margem_padrao_max)); }
    });
  }, [user]);

  async function saveProfile() {
    const { error } = await supabase.from("profiles").update({ nome, loja_nome: loja }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado — recarregue para ver o nome da loja");
  }

  async function saveSettings() {
    const { error } = await supabase.from("settings").upsert({
      user_id: user!.id,
      margem_padrao_tipo: mtipo,
      margem_padrao_min: Number(mmin),
      margem_padrao_max: Number(mmax),
    });
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Personalize a plataforma" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Identidade da loja</h3>
          <div className="space-y-3">
            <div><Label>Seu nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div>
              <Label>Nome da loja</Label>
              <Input value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Ex.: Gustavo Motors" />
              <p className="text-xs text-muted-foreground mt-1">Aparece como "Managed {loja || "..."}"</p>
            </div>
            <Button onClick={saveProfile}>Salvar</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Margem padrão</h3>
          <Tabs value={mtipo} onValueChange={(v) => setMtipo(v as MarginType)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="valor">Valor (R$)</TabsTrigger>
              <TabsTrigger value="percentual">Percentual (%)</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><Label>Margem mínima</Label><Input type="number" step="0.01" value={mmin} onChange={(e) => setMmin(e.target.value)} /></div>
            <div><Label>Margem ideal</Label><Input type="number" step="0.01" value={mmax} onChange={(e) => setMmax(e.target.value)} /></div>
          </div>
          <Button onClick={saveSettings} className="mt-4">Salvar margem padrão</Button>
        </Card>

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
      </div>
    </>
  );
}
