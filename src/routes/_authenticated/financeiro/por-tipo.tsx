import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, fmtInt } from "@/lib/format";
import { TrendingUp, TrendingDown, Car, CircleDollarSign } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/financeiro/por-tipo")({
  head: () => ({ meta: [{ title: "Por Tipo — Managed" }] }),
  component: PorTipo,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
};

function calcStats(vehicles: any[], expenses: any[], ini: string, fim: string) {
  const vendidos = vehicles.filter((x) => x.status === "vendido" && x.vendido_em && x.vendido_em >= ini && x.vendido_em <= fim);
  const faturamento = vendidos.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
  const despVehicle = vendidos.reduce((s, x) => {
    const ve = ((x as any).vehicle_expenses ?? []).reduce((vs: number, e: any) => vs + Number(e.valor), 0);
    return s + Number(x.valor_compra) + Number(x.valor_preparacao) + ve;
  }, 0);
  const despGerais = expenses.reduce((s, x) => s + Number(x.valor), 0);
  const lucro = faturamento - despVehicle - despGerais;
  return { qtd: vendidos.length, faturamento, despesas: despVehicle + despGerais, lucro };
}

function PorTipo() {
  const hoje = new Date();
  const [year, setYear] = useState(hoje.getFullYear());
  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  const { ini, fim } = useMemo(() => {
    const end = new Date(year, month, 0);
    return {
      ini: `${year}-${String(month).padStart(2, "0")}-01`,
      fim: end.toISOString().slice(0, 10),
    };
  }, [year, month]);

  const { data } = useQuery({
    queryKey: ["por-tipo", year, month],
    queryFn: async () => {
      const yearIni = `${year}-01-01`, yearFim = `${year}-12-31`;
      const [{ data: vehicles }, { data: expenses }] = await Promise.all([
        supabase.from("vehicles").select("*, vehicle_expenses(valor)").eq("status", "vendido").gte("vendido_em", yearIni).lte("vendido_em", yearFim),
        supabase.from("expenses").select("valor, data").gte("data", yearIni).lte("data", yearFim),
      ]);
      return { vehicles: vehicles ?? [], expenses: expenses ?? [] };
    },
  });

  const allVehicles = data?.vehicles ?? [];
  const allExpenses = data?.expenses ?? [];

  const propVehicles = allVehicles.filter((v) => v.tipo_negociacao !== "consignado");
  const consVehicles = allVehicles.filter((v) => v.tipo_negociacao === "consignado");

  const propExpenses = allExpenses.filter((e) => e.data >= ini && e.data <= fim);
  const consExpenses = allExpenses.filter((e) => e.data >= ini && e.data <= fim);

  const proprio = calcStats(propVehicles, propExpenses, ini, fim);
  const consignado = calcStats(consVehicles, consExpenses, ini, fim);

  const chartData = MESES_SHORT.map((mes, idx) => {
    const mesIni = `${year}-${String(idx + 1).padStart(2, "0")}-01`;
    const mesEnd = new Date(year, idx + 1, 0);
    const mesFim = mesEnd.toISOString().slice(0, 10);
    const propM = calcStats(propVehicles, [], mesIni, mesFim);
    const consM = calcStats(consVehicles, [], mesIni, mesFim);
    return {
      mes,
      "Fat. Próprio": propM.faturamento,
      "Fat. Consignado": consM.faturamento,
      "Lucro Próprio": propM.lucro,
      "Lucro Consignado": consM.lucro,
    };
  });

  const mesLabel = MESES[month - 1];

  return (
    <>
      <PageHeader
        title="Por Tipo de Negociação"
        subtitle="Comparativo entre veículos próprios e consignados"
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Próprio */}
      <div className="mb-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Próprio — {mesLabel}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Vendidos" value={fmtInt(proprio.qtd)} icon={Car} tone="primary" />
          <StatCard label="Faturamento" value={fmtBRL(proprio.faturamento)} icon={TrendingUp} tone="success" />
          <StatCard label="Lucro estimado" value={fmtBRL(proprio.lucro)} icon={TrendingUp} tone="primary" />
          <StatCard label="Despesas" value={fmtBRL(proprio.despesas)} icon={TrendingDown} tone="destructive" />
        </div>
      </div>

      {/* Consignado */}
      <div className="mt-6 mb-6">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Consignado — {mesLabel}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Vendidos" value={fmtInt(consignado.qtd)} icon={Car} tone="primary" />
          <StatCard label="Faturamento" value={fmtBRL(consignado.faturamento)} icon={TrendingUp} tone="success" />
          <StatCard label="Lucro estimado" value={fmtBRL(consignado.lucro)} icon={TrendingUp} tone="primary" />
          <StatCard label="Despesas" value={fmtBRL(consignado.despesas)} icon={TrendingDown} tone="destructive" />
        </div>
      </div>

      {/* Gráfico comparativo do ano */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-1">Faturamento comparativo — {year}</p>
        <p className="text-xs text-muted-foreground mb-4">Próprio vs Consignado por mês</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Fat. Próprio" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Fat. Consignado" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5 mt-4">
        <p className="text-sm font-semibold mb-1">Lucro comparativo — {year}</p>
        <p className="text-xs text-muted-foreground mb-4">Próprio vs Consignado por mês</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Lucro Próprio" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Lucro Consignado" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
