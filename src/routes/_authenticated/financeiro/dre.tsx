import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/format";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/financeiro/dre")({
  head: () => ({ meta: [{ title: "DRE — Managed" }] }),
  component: DRE,
});

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type TipoTab = "geral" | "proprio" | "consignado";

function buildRows(vehicles: any[], expenses: any[], year: number, tipoFilter?: "proprio" | "consignado") {
  const vFiltered = tipoFilter
    ? vehicles.filter((x) =>
        tipoFilter === "consignado"
          ? x.tipo_negociacao === "consignado"
          : x.tipo_negociacao !== "consignado"
      )
    : vehicles;

  return meses.map((_, idx) => {
    const vMes = vFiltered.filter((x) => x.vendido_em && new Date(x.vendido_em).getMonth() === idx);
    const eMes = expenses.filter((x) => new Date(x.data).getMonth() === idx);
    const rec = vMes.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
    const compra = vMes.reduce((s, x) => s + Number(x.valor_compra), 0);
    const custo = vMes.reduce((s, x) => {
      const vehExp = ((x as any).vehicle_expenses ?? []).reduce((vs: number, ve: any) => vs + Number(ve.valor), 0);
      return s + Number(x.valor_preparacao) + vehExp;
    }, 0);
    const desp = eMes.reduce((s, x) => s + Number(x.valor), 0);
    const bruto = rec - compra;
    const liq = bruto - custo - desp;
    const mesNum = String(idx + 1).padStart(2, "0");
    const dateFrom = `${year}-${mesNum}-01`;
    const lastDay = new Date(year, idx + 1, 0).getDate();
    const dateTo = `${year}-${mesNum}-${String(lastDay).padStart(2, "0")}`;
    return { mes: meses[idx], rec, compra, custo, desp, bruto, liq, dateFrom, dateTo };
  });
}

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
};

function DRE() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [tipoTab, setTipoTab] = useState<TipoTab>("geral");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["dre", year],
    staleTime: 0,
    queryFn: async () => {
      const ini = `${year}-01-01`, fim = `${year}-12-31`;
      const [v, e] = await Promise.all([
        supabase
          .from("vehicles")
          .select("valor_venda, valor_compra, valor_preparacao, vendido_em, tipo_negociacao, vehicle_expenses(valor)")
          .eq("status", "vendido")
          .gte("vendido_em", ini)
          .lte("vendido_em", fim),
        supabase.from("expenses").select("valor, data").gte("data", ini).lte("data", fim),
      ]);
      return { v: v.data ?? [], e: e.data ?? [] };
    },
  });

  const tipoFilter = tipoTab === "geral" ? undefined : tipoTab;
  const rows = buildRows(data?.v ?? [], data?.e ?? [], year, tipoFilter);
  const tot = rows.reduce(
    (a, r) => ({ rec: a.rec + r.rec, compra: a.compra + r.compra, custo: a.custo + r.custo, desp: a.desp + r.desp, bruto: a.bruto + r.bruto, liq: a.liq + r.liq }),
    { rec: 0, compra: 0, custo: 0, desp: 0, bruto: 0, liq: 0 }
  );

  const chartData = rows.map((r) => ({
    mes: r.mes,
    Faturamento: r.rec,
    Lucro: r.liq,
  }));

  return (
    <>
      <PageHeader
        title="DRE"
        subtitle="Demonstrativo de Resultados por mês"
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); qc.invalidateQueries({ queryKey: ["dre"] }); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2].map((o) => { const y = new Date().getFullYear() - o; return <SelectItem key={y} value={String(y)}>{y}</SelectItem>; })}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      <Tabs value={tipoTab} onValueChange={(v) => setTipoTab(v as TipoTab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="proprio">Próprio</TabsTrigger>
          <TabsTrigger value="consignado">Consignado</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Gráficos */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Faturamento × Lucro por mês</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Faturamento" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Lucro" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Resumo do ano</p>
          <div className="space-y-3 mt-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Faturamento total</span><span className="font-semibold">{fmtBRL(tot.rec)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Custo de compra</span><span>{fmtBRL(tot.compra)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Custo do veículo</span><span>{fmtBRL(tot.custo)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Despesas gerais</span><span>{fmtBRL(tot.desp)}</span></div>
            <hr className="border-border" />
            <div className="flex justify-between"><span className="font-medium">Lucro bruto</span><span className="font-semibold">{fmtBRL(tot.bruto)}</span></div>
            <div className="flex justify-between"><span className="font-medium">Lucro líquido</span><span className={`font-semibold ${tot.liq >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(tot.liq)}</span></div>
          </div>
        </Card>
      </div>

      {/* Tabela mensal */}
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left p-3 font-medium">Mês</th>
              <th className="text-right p-3 font-medium">Valor de venda</th>
              <th className="text-right p-3 font-medium">Valor de compra</th>
              <th className="text-right p-3 font-medium">Custo do veículo</th>
              <th className="text-right p-3 font-medium">Lucro bruto</th>
              <th className="text-right p-3 font-medium">Lucro líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr
                key={r.mes}
                className="hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => navigate({ to: "/estoque", search: { status: "vendido", dateFrom: r.dateFrom, dateTo: r.dateTo } })}
              >
                <td className="p-3 font-medium text-primary">{r.mes}</td>
                <td className="p-3 text-right">{fmtBRL(r.rec)}</td>
                <td className="p-3 text-right text-muted-foreground">{fmtBRL(r.compra)}</td>
                <td className="p-3 text-right text-muted-foreground">{fmtBRL(r.custo)}</td>
                <td className="p-3 text-right">{fmtBRL(r.bruto)}</td>
                <td className={`p-3 text-right font-medium ${r.liq >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(r.liq)}</td>
              </tr>
            ))}
            <tr className="bg-muted font-semibold">
              <td className="p-3">Total</td>
              <td className="p-3 text-right">{fmtBRL(tot.rec)}</td>
              <td className="p-3 text-right">{fmtBRL(tot.compra)}</td>
              <td className="p-3 text-right">{fmtBRL(tot.custo)}</td>
              <td className="p-3 text-right">{fmtBRL(tot.bruto)}</td>
              <td className={`p-3 text-right ${tot.liq >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(tot.liq)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
