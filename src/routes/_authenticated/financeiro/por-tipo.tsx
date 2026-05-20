import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtBRL, fmtInt } from "@/lib/format";
import { TrendingUp, TrendingDown, Car } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/financeiro/por-tipo")({
  head: () => ({ meta: [{ title: "Por Tipo — Managed" }] }),
  component: PorTipo,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmtK = (v: number) => Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;

function calcStats(vehicles: any[], ini: string, fim: string) {
  const vendidos = vehicles.filter((x) => x.vendido_em && x.vendido_em >= ini && x.vendido_em <= fim);
  const faturamento = vendidos.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
  const despVehicle = vendidos.reduce((s, x) => {
    const ve = ((x as any).vehicle_expenses ?? []).reduce((vs: number, e: any) => vs + Number(e.valor), 0);
    return s + Number(x.valor_compra) + Number(x.valor_preparacao) + ve;
  }, 0);
  const lucro = faturamento - despVehicle;
  return { qtd: vendidos.length, faturamento, despesas: despVehicle, lucro };
}

function PorTipo() {
  const hoje = new Date();
  const [year, setYear] = useState(hoje.getFullYear());
  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const [tab, setTab] = useState<"comparativo" | "consignado">("comparativo");
  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  const { ini, fim } = useMemo(() => {
    const end = new Date(year, month, 0);
    return {
      ini: `${year}-${String(month).padStart(2, "0")}-01`,
      fim: end.toISOString().slice(0, 10),
    };
  }, [year, month]);

  const { data } = useQuery({
    queryKey: ["por-tipo", year],
    queryFn: async () => {
      const yearIni = `${year}-01-01`, yearFim = `${year}-12-31`;
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("*, vehicle_expenses(valor)")
        .eq("status", "vendido")
        .gte("vendido_em", yearIni)
        .lte("vendido_em", yearFim);
      return { vehicles: vehicles ?? [] };
    },
  });

  const allVehicles = data?.vehicles ?? [];
  const propVehicles = allVehicles.filter((v) => v.tipo_negociacao !== "consignado");
  const consVehicles = allVehicles.filter((v) => v.tipo_negociacao === "consignado");

  const proprio    = calcStats(propVehicles, ini, fim);
  const consignado = calcStats(consVehicles, ini, fim);
  const mesLabel   = MESES[month - 1];

  // Gráfico comparativo por mês
  const chartComparativo = MESES_SHORT.map((mes, idx) => {
    const mIni = `${year}-${String(idx + 1).padStart(2, "0")}-01`;
    const mFim = new Date(year, idx + 1, 0).toISOString().slice(0, 10);
    const p = calcStats(propVehicles, mIni, mFim);
    const c = calcStats(consVehicles, mIni, mFim);
    return { mes, "Fat. Próprio": p.faturamento, "Fat. Consignado": c.faturamento, "Lucro Próprio": p.lucro, "Lucro Consignado": c.lucro };
  });

  // Gráfico consignados: faturamento, lucro e qtd por mês
  const chartConsig = MESES_SHORT.map((mes, idx) => {
    const mIni = `${year}-${String(idx + 1).padStart(2, "0")}-01`;
    const mFim = new Date(year, idx + 1, 0).toISOString().slice(0, 10);
    const c = calcStats(consVehicles, mIni, mFim);
    return { mes, Faturamento: c.faturamento, Lucro: c.lucro, Despesas: c.despesas, Qtd: c.qtd };
  });

  return (
    <>
      <PageHeader
        title="Por Tipo de Negociação"
        subtitle="Análise por próprio e consignado"
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
          <TabsTrigger value="consignado">Apenas Consignados</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "comparativo" && (
        <>
          {/* Cards Próprio */}
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Próprio — {mesLabel}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Vendidos" value={fmtInt(proprio.qtd)} icon={Car} tone="primary" />
              <StatCard label="Faturamento" value={fmtBRL(proprio.faturamento)} icon={TrendingUp} tone="success" />
              <StatCard label="Lucro estimado" value={fmtBRL(proprio.lucro)} icon={TrendingUp} tone="primary" />
              <StatCard label="Despesas" value={fmtBRL(proprio.despesas)} icon={TrendingDown} tone="destructive" />
            </div>
          </div>

          {/* Cards Consignado */}
          <div className="mt-6 mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Consignado — {mesLabel}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Vendidos" value={fmtInt(consignado.qtd)} icon={Car} tone="primary" />
              <StatCard label="Faturamento" value={fmtBRL(consignado.faturamento)} icon={TrendingUp} tone="success" />
              <StatCard label="Lucro estimado" value={fmtBRL(consignado.lucro)} icon={TrendingUp} tone="primary" />
              <StatCard label="Despesas" value={fmtBRL(consignado.despesas)} icon={TrendingDown} tone="destructive" />
            </div>
          </div>

          {/* Gráficos comparativos */}
          <Card className="p-5 mb-4">
            <p className="text-sm font-semibold mb-1">Faturamento comparativo — {year}</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartComparativo} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Fat. Próprio" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="Fat. Consignado" fill="#8b5cf6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold mb-1">Lucro comparativo — {year}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartComparativo} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Lucro Próprio" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="Lucro Consignado" fill="#f59e0b" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {tab === "consignado" && (
        <>
          {/* Cards resumo do mês */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Consignados — {mesLabel} {year}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Vendidos no mês" value={fmtInt(consignado.qtd)} icon={Car} tone="primary" />
              <StatCard label="Faturamento" value={fmtBRL(consignado.faturamento)} icon={TrendingUp} tone="success" />
              <StatCard label="Lucro estimado" value={fmtBRL(consignado.lucro)} icon={TrendingUp} tone="primary" />
              <StatCard label="Despesas" value={fmtBRL(consignado.despesas)} icon={TrendingDown} tone="destructive" />
            </div>
          </div>

          {/* Qtd vendidos por mês */}
          <Card className="p-5 mb-4">
            <p className="text-sm font-semibold mb-1">Quantidade de consignados vendidos — {year}</p>
            <p className="text-xs text-muted-foreground mb-3">Veículos consignados por mês</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartConsig} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip formatter={(v: number) => [`${v} veículos`, "Vendidos"]} />
                <Bar dataKey="Qtd" fill="#8b5cf6" radius={[3,3,0,0]} name="Vendidos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Faturamento consignados */}
          <Card className="p-5 mb-4">
            <p className="text-sm font-semibold mb-1">Faturamento — Consignados {year}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartConsig} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="Faturamento" fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Lucro e Despesas consignados */}
          <Card className="p-5">
            <p className="text-sm font-semibold mb-1">Lucro × Despesas — Consignados {year}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartConsig} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Lucro" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </>
  );
}
