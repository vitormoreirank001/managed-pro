import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { fmtBRL } from "@/lib/format";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const Route = createFileRoute("/_authenticated/financeiro/")({
  head: () => ({ meta: [{ title: "Financeiro — Managed" }] }),
  component: Financeiro,
});

function Financeiro() {
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

  const periodoLabel = `${MESES[month - 1]} ${year}`;
  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  const { data } = useQuery({
    queryKey: ["financeiro", year, month],
    queryFn: async () => {
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

  const cardCls = "cursor-pointer hover:shadow-md transition-shadow";
  const mesNum = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const dateFrom = `${year}-${mesNum}-01`;
  const dateTo = `${year}-${mesNum}-${String(lastDay).padStart(2, "0")}`;

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle={`Performance — ${periodoLabel}`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/estoque" search={{ status: "vendido", dateFrom, dateTo }} className="block">
          <StatCard label={`Faturamento — ${MESES[month - 1]}`} value={fmtBRL(fat)} icon={TrendingUp} tone="success" hint={`${(data?.vend ?? []).length} veículos vendidos`} className={cardCls} />
        </Link>
        <Link to="/estoque" search={{ status: "pronto_venda" }} className="block">
          <StatCard label="Faturamento projetado" value={fmtBRL(fat + projetado)} icon={Target} tone="primary" hint="Realizado + estoque pronto" className={cardCls} />
        </Link>
        <Link to="/financeiro/dre" className="block">
          <StatCard label={`Lucro — ${MESES[month - 1]}`} value={fmtBRL(lucro)} icon={Wallet} tone={lucro >= 0 ? "success" : "destructive"} className={cardCls} />
        </Link>
        <Link to="/financeiro/despesas" className="block">
          <StatCard label="Despesas do mês" value={fmtBRL(desp)} icon={TrendingDown} tone="destructive" className={cardCls} />
        </Link>
      </div>
      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-4">Lucro projetado (estoque pronto para venda)</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Faturamento projetado</p>
            <p className="text-3xl font-semibold mt-1 text-primary">{fmtBRL(fat + projetado)}</p>
            <p className="text-sm text-muted-foreground mt-1">Vendas realizadas + estoque pronto</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Lucro projetado</p>
            <p className={`text-3xl font-semibold mt-1 ${lucroProj >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(lucro + lucroProj)}</p>
            <p className="text-sm text-muted-foreground mt-1">Lucro atual + margem do estoque</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/financeiro/despesas">Gerenciar despesas</Link></Button>
          <Button asChild variant="outline"><Link to="/financeiro/dre">Ver DRE</Link></Button>
          <Button asChild variant="outline"><Link to="/financeiro/margem">Controle de margem</Link></Button>
        </div>
      </Card>
    </>
  );
}
