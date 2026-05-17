import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtBRL, monthStart, monthEnd } from "@/lib/format";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios/")({
  head: () => ({ meta: [{ title: "Relatórios — Managed" }] }),
  component: Relatorios,
});

function Relatorios() {
  const { data } = useQuery({
    queryKey: ["relatorios"],
    queryFn: async () => {
      const ini = monthStart().slice(0, 10), fim = monthEnd().slice(0, 10);
      const [v, vendidos, exp] = await Promise.all([
        supabase.from("vehicles").select("*"),
        supabase.from("vehicles").select("*").eq("status", "vendido").gte("vendido_em", ini).lte("vendido_em", fim),
        supabase.from("expenses").select("valor").gte("data", ini).lte("data", fim),
      ]);
      return { v: v.data ?? [], vendidos: vendidos.data ?? [], exp: exp.data ?? [] };
    },
  });

  const fat = (data?.vendidos ?? []).reduce((s, v) => s + Number(v.valor_venda ?? 0), 0);
  const cust = (data?.vendidos ?? []).reduce((s, v) => s + Number(v.valor_compra) + Number(v.valor_preparacao), 0);
  const desp = (data?.exp ?? []).reduce((s, e) => s + Number(e.valor), 0);
  const lucro = fat - cust - desp;
  const estoque = (data?.v ?? []).filter((x) => x.status !== "vendido").length;

  const modelCount: Record<string, number> = {};
  (data?.vendidos ?? []).forEach((v) => {
    const key = [v.marca, v.modelo].filter(Boolean).join(" ");
    if (key) modelCount[key] = (modelCount[key] ?? 0) + 1;
  });
  const maisVendido = Object.entries(modelCount).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Performance mensal" actions={
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir / PDF</Button>
      } />
      <Card className="p-8">
        <h2 className="text-2xl font-semibold">Relatório mensal</h2>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
        <div className="grid md:grid-cols-2 gap-6 mt-6 text-sm">
          <div><p className="text-muted-foreground">Carros em estoque</p><p className="text-2xl font-semibold">{estoque}</p></div>
          <div><p className="text-muted-foreground">Vendidos no mês</p><p className="text-2xl font-semibold">{(data?.vendidos ?? []).length}</p></div>
          <div><p className="text-muted-foreground">Faturamento</p><p className="text-2xl font-semibold text-success">{fmtBRL(fat)}</p></div>
          <div><p className="text-muted-foreground">Lucro líquido</p><p className={`text-2xl font-semibold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(lucro)}</p></div>
          <div><p className="text-muted-foreground">Custos diretos</p><p className="text-xl">{fmtBRL(cust)}</p></div>
          <div><p className="text-muted-foreground">Despesas operacionais</p><p className="text-xl">{fmtBRL(desp)}</p></div>
          {maisVendido && (
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Modelo mais vendido no mês</p>
              <p className="text-xl font-semibold">{maisVendido[0]} <span className="text-base font-normal text-muted-foreground">({maisVendido[1]}x)</span></p>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
