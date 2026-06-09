import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Wrench, CircleDollarSign, Handshake, TrendingUp, TrendingDown, Trophy, Plus, BarChart2, Timer } from "lucide-react";
import { fmtBRL, fmtInt } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell,
} from "recharts";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const VE_CAT_LABEL: Record<string, string> = {
  comissao_venda: "Comissão", comissao: "Comissão",
  manutencao: "Manutenção", doc_compra: "Doc Compra",
  outras: "Outras", imposto: "Imposto", frete: "Frete",
};
const VE_COLORS = ["#f97316","#3b82f6","#22c55e","#ef4444","#a855f7","#6b7280"];

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Painel — Managed" }] }),
  component: Dashboard,
});

function CardLink({ to, search, children }: { to: string; search?: Record<string, string>; children: React.ReactNode }) {
  const href = search ? `${to}?${new URLSearchParams(search).toString()}` : to;
  return <Link to={href as any} className="block">{children}</Link>;
}

type Tier = "ouro" | "prata" | "bronze" | null;
function getTier(v: number, o: number, p: number, b: number): Tier {
  if (o > 0 && v >= o) return "ouro";
  if (p > 0 && v >= p) return "prata";
  if (b > 0 && v >= b) return "bronze";
  return null;
}
const tierCfg = {
  ouro:   { icon: "🥇", label: "Ouro",   cls: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-700" },
  prata:  { icon: "🥈", label: "Prata",  cls: "text-slate-500  bg-slate-50  border-slate-200  dark:bg-slate-900/40  dark:border-slate-600" },
  bronze: { icon: "🥉", label: "Bronze", cls: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-700" },
};

const fmtK = (v: number) => Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;

function avgCiclo(vehicles: any[]) {
  const dias = vehicles
    .filter((x) => x.status === "vendido" && x.vendido_em)
    .map((x) => {
      const entrada = (x as any).data_entrada ?? x.created_at?.slice(0, 10);
      if (!entrada) return null;
      return Math.round((new Date(x.vendido_em).getTime() - new Date(entrada).getTime()) / 86400000);
    })
    .filter((d): d is number => d !== null && d >= 0);
  if (!dias.length) return null;
  return Math.round(dias.reduce((s, d) => s + d, 0) / dias.length);
}

function Dashboard() {
  const { user } = useAuth();
  const hoje = new Date();
  const [year, setYear] = useState(hoje.getFullYear());
  const [month, setMonth] = useState(hoje.getMonth() + 1);

  const { ini, fim } = useMemo(() => {
    const end = new Date(year, month, 0);
    return {
      ini: `${year}-${String(month).padStart(2, "0")}-01`,
      fim: end.toISOString().slice(0, 10),
    };
  }, [year, month]);

  const yearIni = `${year}-01-01`;
  const yearFim = `${year}-12-31`;

  const mesLabel = MESES[month - 1];
  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  const { data } = useQuery({
    queryKey: ["dashboard", year, month, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: vehicles }, { data: expenses }, { data: collabs }, { data: meta }] = await Promise.all([
        supabase.from("vehicles").select("*"),
        supabase.from("expenses").select("valor, data").gte("data", yearIni).lte("data", yearFim),
        supabase.from("collaborators").select("id, nome"),
        supabase.from("metas").select("*").eq("user_id", user!.id).eq("year", year).eq("month", month).maybeSingle(),
      ]);
      return { vehicles: vehicles ?? [], expenses: expenses ?? [], collabs: collabs ?? [], meta: meta ?? null };
    },
  });

  const { data: veExp } = useQuery({
    queryKey: ["ve-chart", year, month],
    enabled: !!user,
    queryFn: async () => {
      const end = new Date(year, month, 0);
      const i = `${year}-${String(month).padStart(2, "0")}-01`;
      const f = end.toISOString().slice(0, 10);
      const { data: vehs } = await supabase.from("vehicles").select("id").eq("status", "vendido").gte("vendido_em", i).lte("vendido_em", f);
      if (!vehs?.length) return [];
      const { data: exps } = await supabase.from("vehicle_expenses").select("categoria, valor").in("vehicle_id", vehs.map(v => v.id));
      return exps ?? [];
    },
  });

  const veChartData = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of veExp ?? []) {
      const label = VE_CAT_LABEL[e.categoria] ?? e.categoria;
      acc[label] = (acc[label] ?? 0) + Number(e.valor);
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [veExp]);

  const veTotalMes = veChartData.reduce((s, e) => s + e.value, 0);

  const v = data?.vehicles ?? [];
  const allExpenses = data?.expenses ?? [];

  const emEstoque = v.filter((x) => x.status === "pronto_venda").length;
  const emPrep = v.filter((x) => x.status === "em_preparacao").length;
  const comSinal = v.filter((x) => x.status === "com_sinal").length;

  const vendidosMes = v.filter((x) => x.status === "vendido" && x.vendido_em && x.vendido_em >= ini && x.vendido_em <= fim);
  const faturamento = vendidosMes.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
  const custo = vendidosMes.reduce((s, x) => s + Number(x.valor_compra) + Number(x.valor_preparacao), 0);
  const lucro = faturamento - custo;

  const mesNum = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const dateFrom = `${year}-${mesNum}-01`;
  const dateTo   = `${year}-${mesNum}-${String(lastDay).padStart(2, "0")}`;

  // Ciclo de vendas (histórico completo, todos os anos)
  const todosVendidos = v.filter((x) => x.status === "vendido");
  const cicloGeral     = avgCiclo(todosVendidos);
  const cicloProprio   = avgCiclo(todosVendidos.filter((x) => x.tipo_negociacao !== "consignado"));
  const cicloConsig    = avgCiclo(todosVendidos.filter((x) => x.tipo_negociacao === "consignado"));

  // Gráfico: Jan → mês atual (se ano atual) ou todos 12 meses (ano passado)
  const maxMonthIdx = year === hoje.getFullYear() ? hoje.getMonth() : 11;
  const chartData = MESES_SHORT.slice(0, maxMonthIdx + 1).map((mes, idx) => {
    const mIni = `${year}-${String(idx + 1).padStart(2, "0")}-01`;
    const mFim = new Date(year, idx + 1, 0).toISOString().slice(0, 10);
    const vMes = v.filter((x) => x.status === "vendido" && x.vendido_em && x.vendido_em >= mIni && x.vendido_em <= mFim);
    const fat  = vMes.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
    const cst  = vMes.reduce((s, x) => s + Number(x.valor_compra) + Number(x.valor_preparacao), 0);
    const desp = allExpenses.filter((e) => e.data >= mIni && e.data <= mFim).reduce((s, e) => s + Number(e.valor), 0);
    return { mes, Faturamento: fat, "Lucro bruto": fat - cst, Despesas: desp };
  });

  const byVendedor = new Map<string, { count: number; valor: number }>();
  vendidosMes.forEach((x) => {
    if (!x.vendedor_id) return;
    const cur = byVendedor.get(x.vendedor_id) ?? { count: 0, valor: 0 };
    cur.count += 1; cur.valor += Number(x.valor_venda ?? 0);
    byVendedor.set(x.vendedor_id, cur);
  });
  const collabName = (id: string) => data?.collabs.find((c) => c.id === id)?.nome ?? "—";
  const topQtd = [...byVendedor.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const topFat = [...byVendedor.entries()].sort((a, b) => b[1].valor - a[1].valor)[0];

  const recentes = [...v].filter((x) => x.status !== "arquivado").sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5);

  function topN(items: any[], keyFn: (x: any) => string, n: number) {
    const map = new Map<string, number>();
    items.forEach((x) => { const k = keyFn(x); if (k) map.set(k, (map.get(k) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  }
  const topModelos = topN(vendidosMes, (x) => x.modelo, 3);
  const topMarcas  = topN(vendidosMes, (x) => x.marca ?? "", 3);
  const topVersoes = topN(vendidosMes, (x) => (x as any).versao ?? "", 3);

  const meta = data?.meta;
  const tierVendas = meta ? getTier(vendidosMes.length, meta.ouro_vendas, meta.prata_vendas, meta.bronze_vendas) : null;
  const tierLucro  = meta ? getTier(lucro, Number(meta.ouro_lucro), Number(meta.prata_lucro), Number(meta.bronze_lucro)) : null;

  const cardCls = "cursor-pointer hover:shadow-md transition-shadow";

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle={`${mesLabel} ${year}`}
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
            <Button asChild>
              <Link to="/estoque/novo"><Plus className="h-4 w-4 mr-2" />Novo veículo</Link>
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardLink to="/estoque" search={{ status: "pronto_venda" }}>
          <StatCard label="Em estoque" value={fmtInt(emEstoque)} icon={Car} tone="primary" className={cardCls} />
        </CardLink>
        <CardLink to="/estoque" search={{ status: "em_preparacao" }}>
          <StatCard label="Em preparação" value={fmtInt(emPrep)} icon={Wrench} tone="warning" className={cardCls} />
        </CardLink>
        <CardLink to="/estoque" search={{ status: "vendido", dateFrom, dateTo }}>
          <StatCard label={`Vendidos — ${mesLabel}`} value={fmtInt(vendidosMes.length)} icon={CircleDollarSign} tone="success" className={cardCls} />
        </CardLink>
        <CardLink to="/estoque" search={{ status: "com_sinal" }}>
          <StatCard label="Com sinal" value={fmtInt(comSinal)} icon={Handshake} className={cardCls} />
        </CardLink>
      </div>

      {/* Financial cards */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardLink to="/financeiro">
          <StatCard label={`Faturamento — ${mesLabel}`} value={fmtBRL(faturamento)} icon={TrendingUp} tone="success" hint={`${vendidosMes.length} veículos vendidos`} className={cardCls} />
        </CardLink>
        <CardLink to="/financeiro">
          <StatCard label="Lucro estimado" value={fmtBRL(lucro)} icon={TrendingUp} tone="primary" hint="Faturamento − custo de aquisição" className={cardCls} />
        </CardLink>
        <CardLink to="/financeiro/despesas">
          <StatCard label={`Despesas veículos — ${mesLabel}`} value={fmtBRL(veTotalMes)} icon={TrendingDown} tone="destructive" hint="Comissão, manutenção, documentação..." className={cardCls} />
        </CardLink>
      </div>

      {/* Gráficos do ano */}
      <div className="mt-6">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <BarChart2 className="h-4 w-4 text-primary" /> Evolução do ano — {year}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Faturamento</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={44} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="Faturamento" fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Lucro</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={44} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Line type="monotone" dataKey="Lucro bruto" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Despesas por veículo — {mesLabel}</p>
            {veChartData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">Sem despesas de veículos</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={veChartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [fmtBRL(v), "Total"]} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {veChartData.map((_, i) => <Cell key={i} fill={VE_COLORS[i % VE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* Ciclo de vendas */}
      <div className="mt-6">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-primary" /> Ciclo de vendas (média histórica)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Geral</p>
            <p className="text-3xl font-bold mt-2">{cicloGeral !== null ? cicloGeral : "—"}<span className="text-base font-normal text-muted-foreground"> dias</span></p>
            <p className="text-xs text-muted-foreground mt-1">Média da entrada até a venda</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Próprio</p>
            <p className="text-3xl font-bold mt-2 text-primary">{cicloProprio !== null ? cicloProprio : "—"}<span className="text-base font-normal text-muted-foreground"> dias</span></p>
            <p className="text-xs text-muted-foreground mt-1">Veículos próprios</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Consignado</p>
            <p className="text-3xl font-bold mt-2 text-purple-500">{cicloConsig !== null ? cicloConsig : "—"}<span className="text-base font-normal text-muted-foreground"> dias</span></p>
            <p className="text-xs text-muted-foreground mt-1">Veículos consignados</p>
          </Card>
        </div>
      </div>

      {/* Metas do mês */}
      {meta ? (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Metas — {mesLabel}</h3>
            <Link to="/metas" className="text-xs text-primary hover:underline">Configurar metas</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Meta de Vendas</p>
                {tierVendas ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierCfg[tierVendas].cls}`}>
                    {tierCfg[tierVendas].icon} {tierCfg[tierVendas].label}
                  </span>
                ) : <span className="text-xs text-muted-foreground">Abaixo da meta</span>}
              </div>
              <p className="text-3xl font-bold">{fmtInt(vendidosMes.length)}<span className="text-base font-normal text-muted-foreground"> / {meta.ouro_vendas} carros</span></p>
              <div className="mt-3 w-full bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${tierVendas === "ouro" ? "bg-yellow-500" : tierVendas === "prata" ? "bg-slate-400" : tierVendas === "bronze" ? "bg-orange-500" : "bg-primary"}`}
                  style={{ width: `${meta.ouro_vendas > 0 ? Math.min(100, (vendidosMes.length / meta.ouro_vendas) * 100) : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>🥉 {meta.bronze_vendas}</span><span>🥈 {meta.prata_vendas}</span><span>🥇 {meta.ouro_vendas}</span>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Meta de Lucro</p>
                {tierLucro ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierCfg[tierLucro].cls}`}>
                    {tierCfg[tierLucro].icon} {tierCfg[tierLucro].label}
                  </span>
                ) : <span className="text-xs text-muted-foreground">Abaixo da meta</span>}
              </div>
              <p className={`text-3xl font-bold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(lucro)}</p>
              <p className="text-xs text-muted-foreground">meta ouro: {fmtBRL(Number(meta.ouro_lucro))}</p>
              <div className="mt-3 w-full bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${tierLucro === "ouro" ? "bg-yellow-500" : tierLucro === "prata" ? "bg-slate-400" : tierLucro === "bronze" ? "bg-orange-500" : "bg-primary"}`}
                  style={{ width: `${Number(meta.ouro_lucro) > 0 ? Math.min(100, (lucro / Number(meta.ouro_lucro)) * 100) : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>🥉 {fmtBRL(Number(meta.bronze_lucro))}</span><span>🥈 {fmtBRL(Number(meta.prata_lucro))}</span><span>🥇 {fmtBRL(Number(meta.ouro_lucro))}</span>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <Link to="/metas" className="text-sm text-primary hover:underline flex items-center gap-1">
            <Trophy className="h-4 w-4" /> Configurar metas para {mesLabel}
          </Link>
        </div>
      )}

      {/* Mais Vendidos */}
      {vendidosMes.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><BarChart2 className="h-4 w-4 text-primary" /> Mais vendidos — {mesLabel}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Modelos</p>
              {topModelos.length === 0 ? <p className="text-sm text-muted-foreground">—</p> :
                <ol className="space-y-2">
                  {topModelos.map(([nome, qtd], i) => (
                    <li key={nome} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>
                        <span className="font-medium truncate max-w-[140px]">{nome}</span>
                      </span>
                      <span className="text-muted-foreground">{qtd} vnd</span>
                    </li>
                  ))}
                </ol>}
            </Card>
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Marcas</p>
              {topMarcas.length === 0 ? <p className="text-sm text-muted-foreground">—</p> :
                <ol className="space-y-2">
                  {topMarcas.map(([nome, qtd], i) => (
                    <li key={nome} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>
                        <span className="font-medium">{nome}</span>
                      </span>
                      <span className="text-muted-foreground">{qtd} vnd</span>
                    </li>
                  ))}
                </ol>}
            </Card>
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Versões</p>
              {topVersoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma versão cadastrada</p> :
                <ol className="space-y-2">
                  {topVersoes.map(([nome, qtd], i) => (
                    <li key={nome} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>
                        <span className="font-medium truncate max-w-[140px]">{nome}</span>
                      </span>
                      <span className="text-muted-foreground">{qtd} vnd</span>
                    </li>
                  ))}
                </ol>}
            </Card>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Performance — {mesLabel}</h3>
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
              <Link key={x.id} to="/estoque/$id" params={{ id: x.id }}
                className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded">
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
