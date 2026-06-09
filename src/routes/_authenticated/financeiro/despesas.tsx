import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CATS_PADRAO = ["preparacao", "marketing", "gasolina", "manutencao", "operacional", "comissao", "outras"] as const;
const LAB_PADRAO: Record<string, string> = {
  preparacao: "Preparação", marketing: "Marketing", gasolina: "Gasolina",
  manutencao: "Manutenção", operacional: "Operacional", comissao: "Comissão", outras: "Outras",
};

function labelCategoria(cat: string) {
  return LAB_PADRAO[cat] ?? cat;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CAT_LABEL: Record<string, string> = {
  comissao_venda: "Comissão", comissao: "Comissão",
  manutencao: "Manutenção", doc_compra: "Doc Compra",
  outras: "Outras", imposto: "Imposto", frete: "Frete",
};
const VE_COLORS = ["#f97316","#3b82f6","#22c55e","#ef4444","#a855f7","#6b7280"];
const fmtK = (v: number) => `R$${(v / 1000).toFixed(0)}k`;

export const Route = createFileRoute("/_authenticated/financeiro/despesas")({
  head: () => ({ meta: [{ title: "Despesas — Managed" }] }),
  component: Despesas,
});

function Despesas() {
  const qc = useQueryClient();
  const hoje = new Date();
  const [year, setYear] = useState(hoje.getFullYear());
  const [month, setMonth] = useState(hoje.getMonth() + 1); // 1–12, 0 = todos do ano

  const { ini, fim } = useMemo(() => {
    if (month === 0) return { ini: `${year}-01-01`, fim: `${year}-12-31` };
    const end = new Date(year, month, 0);
    return { ini: `${year}-${String(month).padStart(2,"0")}-01`, fim: end.toISOString().slice(0,10) };
  }, [year, month]);

  const periodoLabel = month === 0 ? `${year}` : `${MESES[month - 1]} ${year}`;

  const { data } = useQuery({
    queryKey: ["expenses", year, month],
    queryFn: async () =>
      (await supabase.from("expenses").select("*").gte("data", ini).lte("data", fim).order("data", { ascending: false })).data ?? [],
  });

  const { data: veRaw } = useQuery({
    queryKey: ["ve-despesas", year, month],
    queryFn: async () => {
      const { data: vehs } = await supabase.from("vehicles").select("id").eq("status", "vendido").gte("vendido_em", ini).lte("vendido_em", fim);
      if (!vehs?.length) return [];
      const { data: exps } = await supabase.from("vehicle_expenses").select("categoria, valor").in("vehicle_id", vehs.map(v => v.id));
      return exps ?? [];
    },
  });

  const veChartData = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of veRaw ?? []) {
      const label = CAT_LABEL[e.categoria] ?? e.categoria;
      acc[label] = (acc[label] ?? 0) + Number(e.valor);
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [veRaw]);

  const veTotalExp = veChartData.reduce((s, e) => s + e.value, 0);

  const [f, setF] = useState({
    categoria: "marketing",
    categoriaCustom: "",
    descricao: "",
    valor: "",
    data: hoje.toISOString().slice(0, 10),
  });

  const [adding, setAdding] = useState(false);

  const categoriaFinal = f.categoria === "__custom__" ? f.categoriaCustom.trim() : f.categoria;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.valor) { toast.error("Informe o valor da despesa"); return; }
    if (Number(f.valor) <= 0) { toast.error("O valor deve ser maior que zero"); return; }
    if (f.categoria === "__custom__" && !f.categoriaCustom.trim()) { toast.error("Informe o nome da categoria"); return; }
    setAdding(true);
    const { error } = await supabase.from("expenses").insert({
      categoria: categoriaFinal, descricao: f.descricao || null, valor: Number(f.valor), data: f.data,
    } as any);
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setF({ ...f, descricao: "", valor: "" });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    toast.success("Despesa registrada");
  }

  const total = (data ?? []).reduce((s, e) => s + Number(e.valor), 0);

  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  return (
    <>
      <PageHeader
        title="Despesas"
        subtitle={`${periodoLabel} — Total: ${fmtBRL(total)}`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos os meses</SelectItem>
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

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Despesas por veículo — {periodoLabel}</p>
          <span className="text-sm font-semibold">{fmtBRL(veTotalExp)}</span>
        </div>
        {veChartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma despesa de veículo em {periodoLabel}.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(140, veChartData.length * 44)}>
            <BarChart data={veChartData} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [fmtBRL(v), "Total"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {veChartData.map((_, i) => <Cell key={i} fill={VE_COLORS[i % VE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6 mb-6">
        <p className="text-sm font-medium mb-3">Nova despesa</p>
        <form onSubmit={add} className="grid md:grid-cols-[180px_1fr_140px_140px_auto] gap-2">
          <div className="flex flex-col gap-1">
            <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v, categoriaCustom: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATS_PADRAO.map((c) => <SelectItem key={c} value={c}>{LAB_PADRAO[c]}</SelectItem>)}
                <SelectItem value="__custom__">+ Nova categoria...</SelectItem>
              </SelectContent>
            </Select>
            {f.categoria === "__custom__" && (
              <Input
                placeholder="Nome da categoria"
                value={f.categoriaCustom}
                onChange={(e) => setF({ ...f, categoriaCustom: e.target.value })}
                autoFocus
              />
            )}
          </div>
          <Input placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Valor" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
          <Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
          <Button type="submit" disabled={adding}>{adding ? "Salvando..." : "Adicionar"}</Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="divide-y divide-border">
          {(data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Nenhuma despesa em {periodoLabel}.</p>
          )}
          {(data ?? []).map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{labelCategoria(d.categoria)}</p>
                <p className="text-xs text-muted-foreground">{d.descricao ?? "—"} · {fmtDate(d.data)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{fmtBRL(Number(d.valor))}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.from("expenses").delete().eq("id", d.id);
                    qc.invalidateQueries({ queryKey: ["expenses"] });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
