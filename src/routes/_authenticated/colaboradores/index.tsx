import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/colaboradores/")({
  head: () => ({ meta: [{ title: "Colaboradores — Managed" }] }),
  component: Colaboradores,
});

function Colaboradores() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => (await supabase.from("collaborators").select("*").order("nome")).data ?? [],
  });
  const [f, setF] = useState({ nome: "", email: "", funcao: "Vendedor", salario: "", comissao_pct: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("collaborators").insert({
      nome: f.nome, email: f.email || null, funcao: f.funcao || null,
      salario: Number(f.salario || 0), comissao_pct: Number(f.comissao_pct || 0),
    });
    if (error) return toast.error(error.message);
    setF({ nome: "", email: "", funcao: "Vendedor", salario: "", comissao_pct: "" });
    qc.invalidateQueries({ queryKey: ["collaborators"] });
    toast.success("Colaborador adicionado");
  }

  return (
    <>
      <PageHeader title="Colaboradores" subtitle={`${(data ?? []).length} cadastrado(s)`} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="divide-y divide-border">
            {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum colaborador.</p>}
            {(data ?? []).map((c) => (
              <div key={c.id} className="flex justify-between items-center py-3">
                <div>
                  <p className="font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.funcao} · {c.email ?? "—"}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{fmtBRL(Number(c.salario))} <span className="text-muted-foreground">/ mês</span></p>
                  <p className="text-xs text-muted-foreground">Comissão {Number(c.comissao_pct)}%</p>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("collaborators").delete().eq("id", c.id); qc.invalidateQueries({ queryKey: ["collaborators"] }); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Novo colaborador</h3>
          <form onSubmit={add} className="space-y-3">
            <div><Label>Nome *</Label><Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Função</Label><Input value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })} /></div>
            <div><Label>Salário</Label><Input type="number" step="0.01" value={f.salario} onChange={(e) => setF({ ...f, salario: e.target.value })} /></div>
            <div><Label>Comissão (%)</Label><Input type="number" step="0.01" value={f.comissao_pct} onChange={(e) => setF({ ...f, comissao_pct: e.target.value })} /></div>
            <Button type="submit" className="w-full">Cadastrar</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
