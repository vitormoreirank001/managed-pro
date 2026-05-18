import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL } from "@/lib/format";
import { Printer } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const Route = createFileRoute("/_authenticated/relatorios/")({
  head: () => ({ meta: [{ title: "Relatórios — Managed" }] }),
  component: Relatorios,
});

function Relatorios() {
  const hoje = new Date();
  const [year, setYear] = useState(hoje.getFullYear());
  const [month, setMonth] = useState(hoje.getMonth() + 1); // 1–12

  const { ini, fim } = useMemo(() => {
    const end = new Date(year, month, 0);
    return {
      ini: `${year}-${String(month).padStart(2, "0")}-01`,
      fim: end.toISOString().slice(0, 10),
    };
  }, [year, month]);

  const periodoLabel = `${MESES[month - 1]} ${year}`;

  const { data } = useQuery({
    queryKey: ["relatorios", year, month],
    queryFn: async () => {
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

  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={periodoLabel}
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
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="h-4 w-4 mr-2" />Imprimir / PDF
            </Button>
          </div>
        }
      />

      <Card className="p-8">
        <h2 className="text-2xl font-semibold">Relatório — {periodoLabel}</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-6 text-sm">
          <div>
            <p className="text-muted-foreground">Carros em estoque</p>
            <p className="text-2xl font-semibold">{estoque}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vendidos no período</p>
            <p className="text-2xl font-semibold">{(data?.vendidos ?? []).length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Faturamento</p>
            <p className="text-2xl font-semibold text-success">{fmtBRL(fat)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lucro líquido</p>
            <p className={`text-2xl font-semibold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(lucro)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Custo dos veículos</p>
            <p className="text-xl">{fmtBRL(cust)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Despesas operacionais</p>
            <p className="text-xl">{fmtBRL(desp)}</p>
          </div>
          {maisVendido && (
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Modelo mais vendido no período</p>
              <p className="text-xl font-semibold">
                {maisVendido[0]}{" "}
                <span className="text-base font-normal text-muted-foreground">({maisVendido[1]}x)</span>
              </p>
            </div>
          )}
          {(data?.vendidos ?? []).length === 0 && (
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-sm">Nenhum veículo vendido em {periodoLabel}.</p>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
