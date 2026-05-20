import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtBRL, computeMargin, type MarginType } from "@/lib/format";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro/margem")({
  head: () => ({ meta: [{ title: "Controle de margem — Managed" }] }),
  component: Margem,
});

const clsBadge: Record<string, string> = {
  acima: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  na: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  abaixo: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
};
const labelBadge: Record<string, string> = { acima: "Acima", na: "Na margem", abaixo: "Abaixo" };

function Margem() {
  const qc = useQueryClient();
  const [tipoTab, setTipoTab] = useState<"todos" | "proprio" | "consignado">("todos");
  const [savingSettings, setSavingSettings] = useState(false);

  const [mPropTipo, setMPropTipo] = useState<MarginType>("percentual");
  const [mPropMin, setMPropMin] = useState("10");
  const [mPropMax, setMPropMax] = useState("20");
  const [mConsTipo, setMConsTipo] = useState<MarginType>("percentual");
  const [mConsMin, setMConsMin] = useState("5");
  const [mConsMax, setMConsMax] = useState("15");

  useEffect(() => {
    supabase
      .from("settings")
      .select("margem_proprio_tipo, margem_proprio_min, margem_proprio_max, margem_consignado_tipo, margem_consignado_min, margem_consignado_max")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setMPropTipo(d.margem_proprio_tipo ?? "percentual");
        setMPropMin(String(d.margem_proprio_min ?? 10));
        setMPropMax(String(d.margem_proprio_max ?? 20));
        setMConsTipo(d.margem_consignado_tipo ?? "percentual");
        setMConsMin(String(d.margem_consignado_min ?? 5));
        setMConsMax(String(d.margem_consignado_max ?? 15));
      });
  }, []);

  async function saveSettings() {
    setSavingSettings(true);
    const { error } = await supabase.from("settings").upsert({
      margem_proprio_tipo: mPropTipo,
      margem_proprio_min: Number(mPropMin),
      margem_proprio_max: Number(mPropMax),
      margem_consignado_tipo: mConsTipo,
      margem_consignado_min: Number(mConsMin),
      margem_consignado_max: Number(mConsMax),
    } as any);
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success("Margens salvas");
    qc.invalidateQueries({ queryKey: ["margem"] });
  }

  const { data } = useQuery({
    queryKey: ["margem"],
    queryFn: async () =>
      (await supabase.from("vehicles").select("*").eq("status", "vendido")).data ?? [],
  });

  const classify = (v: any): "acima" | "na" | "abaixo" => {
    if ((v as any).classificacao_margem) return (v as any).classificacao_margem;
    const isCons = v.tipo_negociacao === "consignado";
    const m = computeMargin({
      valor_compra: Number(v.valor_compra),
      valor_preparacao: Number(v.valor_preparacao),
      margem_tipo: isCons ? mConsTipo : mPropTipo,
      margem_min: isCons ? Number(mConsMin) : Number(mPropMin),
      margem_max: isCons ? Number(mConsMax) : Number(mPropMax),
    });
    const venda = Number(v.valor_venda ?? 0);
    if (venda >= m.valorIdealVenda) return "acima";
    if (venda >= m.valorMinVenda) return "na";
    return "abaixo";
  };

  const allVehicles = data ?? [];
  const filtered = tipoTab === "todos" ? allVehicles : allVehicles.filter((v) => v.tipo_negociacao === tipoTab);

  const groups = { acima: [] as any[], na: [] as any[], abaixo: [] as any[] };
  filtered.forEach((v) => { groups[classify(v)].push(v); });

  return (
    <>
      <PageHeader title="Controle de margem" subtitle="Como os veículos foram vendidos em relação à margem configurada" />

      {/* Margens configuráveis */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Configurar margens por tipo</h3>
          <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {savingSettings ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Próprio</p>
            <Tabs value={mPropTipo} onValueChange={(v) => setMPropTipo(v as MarginType)}>
              <TabsList className="grid grid-cols-2 w-full h-8">
                <TabsTrigger value="valor" className="text-xs">Valor (R$)</TabsTrigger>
                <TabsTrigger value="percentual" className="text-xs">Percentual (%)</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><Label className="text-xs">Mínima</Label><Input type="number" step="0.01" value={mPropMin} onChange={(e) => setMPropMin(e.target.value)} /></div>
              <div><Label className="text-xs">Ideal</Label><Input type="number" step="0.01" value={mPropMax} onChange={(e) => setMPropMax(e.target.value)} /></div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Consignado</p>
            <Tabs value={mConsTipo} onValueChange={(v) => setMConsTipo(v as MarginType)}>
              <TabsList className="grid grid-cols-2 w-full h-8">
                <TabsTrigger value="valor" className="text-xs">Valor (R$)</TabsTrigger>
                <TabsTrigger value="percentual" className="text-xs">Percentual (%)</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><Label className="text-xs">Mínima</Label><Input type="number" step="0.01" value={mConsMin} onChange={(e) => setMConsMin(e.target.value)} /></div>
              <div><Label className="text-xs">Ideal</Label><Input type="number" step="0.01" value={mConsMax} onChange={(e) => setMConsMax(e.target.value)} /></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs por tipo */}
      <Tabs value={tipoTab} onValueChange={(v) => setTipoTab(v as typeof tipoTab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="todos">Todos ({allVehicles.length})</TabsTrigger>
          <TabsTrigger value="proprio">Próprio ({allVehicles.filter(v => v.tipo_negociacao !== "consignado").length})</TabsTrigger>
          <TabsTrigger value="consignado">Consignado ({allVehicles.filter(v => v.tipo_negociacao === "consignado").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><p className="text-xs text-muted-foreground uppercase">Acima da margem</p><p className="text-2xl font-semibold text-success mt-2">{groups.acima.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground uppercase">Na margem</p><p className="text-2xl font-semibold text-primary mt-2">{groups.na.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground uppercase">Abaixo da margem</p><p className="text-2xl font-semibold text-destructive mt-2">{groups.abaixo.length}</p></Card>
      </div>

      {(["acima", "na", "abaixo"] as const).map((k) => (
        <Card key={k} className="p-6 mb-4">
          <h3 className="font-semibold mb-3">{k === "acima" ? "Acima da margem" : k === "na" ? "Na margem" : "Abaixo da margem"}</h3>
          {groups[k].length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum veículo.</p>
          ) : (
            <div className="divide-y divide-border">
              {groups[k].map((v) => (
                <Link to="/estoque/$id" params={{ id: v.id }} key={v.id} className="flex justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{v.modelo}</p>
                      {(v as any).classificacao_margem && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${clsBadge[(v as any).classificacao_margem]}`}>
                          {labelBadge[(v as any).classificacao_margem]} (manual)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{v.marca} {v.ano} · {v.tipo_negociacao === "consignado" ? "Consignado" : "Próprio"}</p>
                  </div>
                  <div className="text-sm text-right">
                    <p className="font-medium">{fmtBRL(Number(v.valor_venda))}</p>
                    <p className="text-xs text-muted-foreground">Custo {fmtBRL(Number(v.valor_compra) + Number(v.valor_preparacao))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
