import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const cats = ["preparacao", "marketing", "gasolina", "operacional", "comissao", "outras"] as const;
const lab: Record<(typeof cats)[number], string> = {
  preparacao: "Preparação", marketing: "Marketing", gasolina: "Gasolina",
  operacional: "Operacional", comissao: "Comissão", outras: "Outras",
};

export const Route = createFileRoute("/_authenticated/financeiro/despesas")({
  head: () => ({ meta: [{ title: "Despesas — Managed" }] }),
  component: Despesas,
});

function Despesas() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*").order("data", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState({ categoria: "marketing" as (typeof cats)[number], descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.valor) return;
    const { error } = await supabase.from("expenses").insert({
      categoria: f.categoria, descricao: f.descricao || null, valor: Number(f.valor), data: f.data,
    });
    if (error) return toast.error(error.message);
    setF({ ...f, descricao: "", valor: "" });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    toast.success("Despesa registrada");
  }

  const total = (data ?? []).reduce((s, e) => s + Number(e.valor), 0);

  return (
    <>
      <PageHeader title="Despesas" subtitle={`Total: ${fmtBRL(total)}`} />
      <Card className="p-6 mb-6">
        <form onSubmit={add} className="grid md:grid-cols-[160px_1fr_140px_140px_auto] gap-2">
          <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v as (typeof cats)[number] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{lab[c]}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Valor" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
          <Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>
      <Card className="p-6">
        <div className="divide-y divide-border">
          {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma despesa registrada.</p>}
          {(data ?? []).map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{lab[d.categoria as (typeof cats)[number]]}</p>
                <p className="text-xs text-muted-foreground">{d.descricao ?? "—"} · {fmtDate(d.data)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{fmtBRL(Number(d.valor))}</span>
                <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("expenses").delete().eq("id", d.id); qc.invalidateQueries({ queryKey: ["expenses"] }); }}>
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
