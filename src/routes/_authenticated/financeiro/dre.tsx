import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { fmtBRL } from "@/lib/format";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/financeiro/dre")({
  head: () => ({ meta: [{ title: "DRE — Managed" }] }),
  component: DRE,
});

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function DRE() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data } = useQuery({
    queryKey: ["dre", year],
    queryFn: async () => {
      const ini = `${year}-01-01`, fim = `${year}-12-31`;
      const [v, e] = await Promise.all([
        supabase.from("vehicles").select("valor_venda, valor_compra, valor_preparacao, vendido_em").eq("status", "vendido").gte("vendido_em", ini).lte("vendido_em", fim),
        supabase.from("expenses").select("valor, data").gte("data", ini).lte("data", fim),
      ]);
      return { v: v.data ?? [], e: e.data ?? [] };
    },
  });

  const rows = meses.map((_, idx) => {
    const vMes = (data?.v ?? []).filter((x) => x.vendido_em && new Date(x.vendido_em).getMonth() === idx);
    const eMes = (data?.e ?? []).filter((x) => new Date(x.data).getMonth() === idx);
    const rec = vMes.reduce((s, x) => s + Number(x.valor_venda ?? 0), 0);
    const cust = vMes.reduce((s, x) => s + Number(x.valor_compra) + Number(x.valor_preparacao), 0);
    const desp = eMes.reduce((s, x) => s + Number(x.valor), 0);
    return { mes: meses[idx], rec, cust, desp, bruto: rec - cust, liq: rec - cust - desp };
  });

  const tot = rows.reduce((a, r) => ({ rec: a.rec + r.rec, cust: a.cust + r.cust, desp: a.desp + r.desp, bruto: a.bruto + r.bruto, liq: a.liq + r.liq }), { rec: 0, cust: 0, desp: 0, bruto: 0, liq: 0 });

  return (
    <>
      <PageHeader
        title="DRE"
        subtitle="Demonstrativo de Resultados por mês"
        actions={
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((o) => { const y = new Date().getFullYear() - o; return <SelectItem key={y} value={String(y)}>{y}</SelectItem>; })}
            </SelectContent>
          </Select>
        }
      />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left p-3 font-medium">Mês</th>
              <th className="text-right p-3 font-medium">Receita</th>
              <th className="text-right p-3 font-medium">Custo veículos</th>
              <th className="text-right p-3 font-medium">Despesas</th>
              <th className="text-right p-3 font-medium">Lucro bruto</th>
              <th className="text-right p-3 font-medium">Lucro líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.mes}>
                <td className="p-3 font-medium">{r.mes}</td>
                <td className="p-3 text-right">{fmtBRL(r.rec)}</td>
                <td className="p-3 text-right text-muted-foreground">{fmtBRL(r.cust)}</td>
                <td className="p-3 text-right text-muted-foreground">{fmtBRL(r.desp)}</td>
                <td className="p-3 text-right">{fmtBRL(r.bruto)}</td>
                <td className={`p-3 text-right font-medium ${r.liq >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(r.liq)}</td>
              </tr>
            ))}
            <tr className="bg-muted font-semibold">
              <td className="p-3">Total</td>
              <td className="p-3 text-right">{fmtBRL(tot.rec)}</td>
              <td className="p-3 text-right">{fmtBRL(tot.cust)}</td>
              <td className="p-3 text-right">{fmtBRL(tot.desp)}</td>
              <td className="p-3 text-right">{fmtBRL(tot.bruto)}</td>
              <td className={`p-3 text-right ${tot.liq >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(tot.liq)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
