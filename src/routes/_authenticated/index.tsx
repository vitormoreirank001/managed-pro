import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Wrench, CircleDollarSign, Handshake, TrendingUp, TrendingDown, Trophy, Plus } from "lucide-react";
import { fmtBRL, fmtInt, monthStart, monthEnd } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Painel — Managed" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: vehicles }, { data: expenses }, { data: vehExp }, { data: collabs }] = await Promise.all([
        supabase.from("vehicles").select("*"),
        supabase.from("expenses").select("valor, data").gte("data", monthStart().slice(0, 10)).lte("data", monthEnd().slice(0, 10)),
        supabase.from("vehicle_expenses").select("valor, vehicle_id"),
        supabase.from("collaborators").select("id, nome"),
      ]);
      return { vehicles: vehicles ?? [], expenses: expenses ?? [], vehExp: vehExp ?? [], collabs: collabs ?? [] };
    },
  });

  const v = data?.vehicles ?? [];
  const expSum = (data?.expenses ?? []).reduce((s, e) => s + Number(e.valor), 0);
  const vehExpSum = (data?.vehExp ?? []).reduce((s, e) => s + Number(e.valor), 0);

  const emEstoque = v.filter((x) => x.status === "pronto_venda").length;
  const emPrep = v.filter((x) => x.status === "em_preparacao").length;
  const comSinal = v.filter((x) => x.status === "com_sinal").length;
  const vendidos = v.filter((x) => x.status === "vendido");

  const inicioMes = new Date(monthStart());
  const vendidosMes = vendidos.filter((x) => x.vendido_em && new Date(x.vendido_em) >= inicioMes);
  const faturamento = vendidosMes.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
  const custo = vendidosMes.reduce((s, x) => s + Number(x.valor_compra) + Number(x.valor_preparacao), 0);
  const lucroBruto = faturamento - custo;
  const lucro = lucroBruto - expSum;

  // Top vendedor
  const byVendedor = new Map<string, { count: number; valor: number }>();
  vendidosMes.forEach((x) => {
    if (!x.vendedor_id) return;
    const cur = byVendedor.get(x.vendedor_id) ?? { count: 0, valor: 0 };
    cur.count += 1;
    cur.valor += Number(x.valor_venda ?? 0);
    byVendedor.set(x.vendedor_id, cur);
  });
  const collabName = (id: string) => data?.collabs.find((c) => c.id === id)?.nome ?? "—";
  const topQtd = [...byVendedor.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const topFat = [...byVendedor.entries()].sort((a, b) => b[1].valor - a[1].valor)[0];

  const recentes = [...v].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle="Visão geral da sua operação"
        actions={
          <Button asChild>
            <Link to="/estoque/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo veículo
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Em estoque" value={fmtInt(emEstoque)} icon={Car} tone="primary" />
        <StatCard label="Em preparação" value={fmtInt(emPrep)} icon={Wrench} tone="warning" />
        <StatCard label="Vendidos no mês" value={fmtInt(vendidosMes.length)} icon={CircleDollarSign} tone="success" />
        <StatCard label="Com sinal" value={fmtInt(comSinal)} icon={Handshake} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Faturamento do mês" value={fmtBRL(faturamento)} icon={TrendingUp} tone="success" hint={`${vendidosMes.length} veículos vendidos`} />
        <StatCard label="Lucro estimado" value={fmtBRL(lucro)} icon={TrendingUp} tone="primary" hint="Receita − custo − despesas" />
        <StatCard label="Despesas do mês" value={fmtBRL(expSum + vehExpSum)} icon={TrendingDown} tone="destructive" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Performance dos vendedores</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <div>
                <p className="text-muted-foreground text-xs">Mais vendas (quantidade)</p>
                <p className="font-medium">{topQtd ? collabName(topQtd[0]) : "—"}</p>
              </div>
              <p className="font-semibold">{topQtd ? `${topQtd[1].count} venda(s)` : "—"}</p>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <div>
                <p className="text-muted-foreground text-xs">Maior faturamento</p>
                <p className="font-medium">{topFat ? collabName(topFat[0]) : "—"}</p>
              </div>
              <p className="font-semibold">{topFat ? fmtBRL(topFat[1].valor) : "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Veículos recentes</h3>
            <Link to="/estoque" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {recentes.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum veículo cadastrado ainda.</p>}
            {recentes.map((x) => (
              <Link
                key={x.id}
                to="/estoque/$id"
                params={{ id: x.id }}
                className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded"
              >
                <div>
                  <p className="font-medium text-sm">{x.modelo}</p>
                  <p className="text-xs text-muted-foreground">{x.marca ?? ""} {x.ano ?? ""}</p>
                </div>
                <StatusBadge status={x.status} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
