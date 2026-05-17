import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { fmtBRL } from "@/lib/format";
import { computeMargin } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro/margem")({
  head: () => ({ meta: [{ title: "Controle de margem — Managed" }] }),
  component: Margem,
});

function Margem() {
  const { data } = useQuery({
    queryKey: ["margem"],
    queryFn: async () => (await supabase.from("vehicles").select("*").eq("status", "vendido")).data ?? [],
  });

  const groups = { acima: [] as any[], dentro: [] as any[], abaixo: [] as any[] };
  (data ?? []).forEach((v) => {
    const m = computeMargin({
      valor_compra: Number(v.valor_compra),
      valor_preparacao: Number(v.valor_preparacao),
      margem_tipo: v.margem_tipo,
      margem_min: Number(v.margem_min),
      margem_max: Number(v.margem_max),
    });
    const venda = Number(v.valor_venda ?? 0);
    if (venda >= m.valorIdealVenda) groups.acima.push(v);
    else if (venda >= m.valorMinVenda) groups.dentro.push(v);
    else groups.abaixo.push(v);
  });

  return (
    <>
      <PageHeader title="Controle de margem" subtitle="Como os veículos foram vendidos em relação à margem desejada" />
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><p className="text-xs text-muted-foreground uppercase">Acima da margem</p><p className="text-2xl font-semibold text-success mt-2">{groups.acima.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground uppercase">Na margem</p><p className="text-2xl font-semibold text-primary mt-2">{groups.dentro.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground uppercase">Abaixo da margem</p><p className="text-2xl font-semibold text-destructive mt-2">{groups.abaixo.length}</p></Card>
      </div>
      {(["acima","dentro","abaixo"] as const).map((k) => (
        <Card key={k} className="p-6 mb-4">
          <h3 className="font-semibold mb-3 capitalize">{k === "acima" ? "Acima da margem" : k === "dentro" ? "Na margem" : "Abaixo da margem"}</h3>
          {groups[k].length === 0 ? <p className="text-sm text-muted-foreground">Nenhum veículo.</p> :
            <div className="divide-y divide-border">
              {groups[k].map((v) => (
                <Link to="/estoque/$id" params={{ id: v.id }} key={v.id} className="flex justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded">
                  <div><p className="font-medium text-sm">{v.modelo}</p><p className="text-xs text-muted-foreground">{v.marca} {v.ano}</p></div>
                  <div className="text-sm text-right"><p className="font-medium">{fmtBRL(Number(v.valor_venda))}</p><p className="text-xs text-muted-foreground">Custo {fmtBRL(Number(v.valor_compra)+Number(v.valor_preparacao))}</p></div>
                </Link>
              ))}
            </div>
          }
        </Card>
      ))}
    </>
  );
}
