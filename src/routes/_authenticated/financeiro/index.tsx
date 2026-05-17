import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { fmtBRL, monthStart, monthEnd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro/")({
  head: () => ({ meta: [{ title: "Financeiro — Managed" }] }),
  component: Financeiro,
});

function Financeiro() {
  const { data } = useQuery({
    queryKey: ["financeiro"],
    queryFn: async () => {
      const ini = monthStart().slice(0, 10);
      const fim = monthEnd().slice(0, 10);
      const [vend, exp, estoque] = await Promise.all([
        supabase.from("vehicles").select("*").eq("status", "vendido").gte("vendido_em", ini).lte("vendido_em", fim),
        supabase.from("expenses").select("*").gte("data", ini).lte("data", fim),
        supabase.from("vehicles").select("valor_sugerido, valor_compra, valor_preparacao").eq("status", "pronto_venda"),
      ]);
      return { vend: vend.data ?? [], exp: exp.data ?? [], estoque: estoque.data ?? [] };
    },
  });

  const fat = (data?.vend ?? []).reduce((s, v) => s + Number(v.valor_venda ?? 0), 0);
  const custo = (data?.vend ?? []).reduce((s, v) => s + Number(v.valor_compra) + Number(v.valor_preparacao), 0);
  const desp = (data?.exp ?? []).reduce((s, e) => s + Number(e.valor), 0);
  const lucro = fat - custo - desp;
  const projetado = (data?.estoque ?? []).reduce((s, v) => s + Number(v.valor_sugerido ?? 0), 0);
  const lucroProj = (data?.estoque ?? []).reduce((s, v) => s + Number(v.valor_sugerido ?? 0) - Number(v.valor_compra) - Number(v.valor_preparacao), 0);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Performance do mês atual" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Faturamento" value={fmtBRL(fat)} icon={TrendingUp} tone="success" />
        <StatCard label="Faturamento projetado" value={fmtBRL(fat + projetado)} icon={Target} tone="primary" hint="Inclui estoque pronto" />
        <StatCard label="Lucro do mês" value={fmtBRL(lucro)} icon={Wallet} tone={lucro >= 0 ? "success" : "destructive"} />
        <StatCard label="Despesas" value={fmtBRL(desp)} icon={TrendingDown} tone="destructive" />
      </div>
      <Card className="p-6 mt-6">
        <h3 className="font-semibold">Lucro projetado (estoque pronto)</h3>
        <p className="text-3xl font-semibold mt-2 text-primary">{fmtBRL(lucroProj)}</p>
        <p className="text-sm text-muted-foreground mt-1">Considera o valor sugerido de venda menos custos.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/financeiro/despesas">Gerenciar despesas</Link></Button>
          <Button asChild variant="outline"><Link to="/financeiro/dre">Ver DRE</Link></Button>
          <Button asChild variant="outline"><Link to="/financeiro/margem">Controle de margem</Link></Button>
        </div>
      </Card>
    </>
  );
}
