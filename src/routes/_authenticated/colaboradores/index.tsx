import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
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
  const { data: payments } = useQuery({
    queryKey: ["collaborator_payments"],
    queryFn: async () => (await supabase.from("collaborator_payments").select("*").order("data", { ascending: false })).data ?? [],
  });

  const [f, setF] = useState({ nome: "", email: "", funcao: "Vendedor", salario: "", comissao_pct: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pf, setPf] = useState({ tipo: "salario", valor: "", descricao: "" });

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

  async function addPayment(collaboratorId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!pf.valor) return;
    const { error } = await supabase.from("collaborator_payments").insert({
      collaborator_id: collaboratorId,
      tipo: pf.tipo,
      valor: Number(pf.valor),
      descricao: pf.descricao || null,
    });
    if (error) return toast.error(error.message);
    setPf({ tipo: "salario", valor: "", descricao: "" });
    qc.invalidateQueries({ queryKey: ["collaborator_payments"] });
    toast.success("Pagamento registrado");
  }

  async function removePayment(id: string) {
    await supabase.from("collaborator_payments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["collaborator_payments"] });
  }

  const tipoLabel: Record<string, string> = { salario: "Salário", comissao: "Comissão", bonus: "Bônus", adiantamento: "Adiantamento", outro: "Outro" };

  return (
    <>
      <PageHeader title="Colaboradores" subtitle={`${(data ?? []).length} cadastrado(s)`} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="divide-y divide-border">
            {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum colaborador.</p>}
            {(data ?? []).map((c) => {
              const colPayments = (payments ?? []).filter((p) => p.collaborator_id === c.id);
              const totalPago = colPayments.reduce((s, p) => s + Number(p.valor), 0);
              const isOpen = expanded === c.id;
              return (
                <div key={c.id}>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <p className="font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.funcao} · {c.email ?? "—"}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{fmtBRL(Number(c.salario))} <span className="text-muted-foreground">/ mês</span></p>
                      <p className="text-xs text-muted-foreground">Comissão {Number(c.comissao_pct)}%</p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button size="icon" variant="ghost" onClick={() => setExpanded(isOpen ? null : c.id)}>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("collaborators").delete().eq("id", c.id); qc.invalidateQueries({ queryKey: ["collaborators"] }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="pb-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total pago</span>
                        <span className="font-semibold">{fmtBRL(totalPago)}</span>
                      </div>

                      <form onSubmit={(e) => addPayment(c.id, e)} className="grid grid-cols-[120px_1fr_140px_auto] gap-2">
                        <Select value={pf.tipo} onValueChange={(v) => setPf((p) => ({ ...p, tipo: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(tipoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Descrição" value={pf.descricao} onChange={(e) => setPf((p) => ({ ...p, descricao: e.target.value }))} />
                        <Input type="number" step="0.01" placeholder="Valor" value={pf.valor} onChange={(e) => setPf((p) => ({ ...p, valor: e.target.value }))} />
                        <Button type="submit" size="icon"><Plus className="h-4 w-4" /></Button>
                      </form>

                      {colPayments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum pagamento registrado.</p>
                      ) : (
                        <div className="divide-y divide-border rounded-lg border">
                          {colPayments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                              <div>
                                <span className="font-medium">{tipoLabel[p.tipo] ?? p.tipo}</span>
                                {p.descricao && <span className="text-muted-foreground"> · {p.descricao}</span>}
                                <span className="text-xs text-muted-foreground block">{fmtDate(p.data)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{fmtBRL(Number(p.valor))}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removePayment(p.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
