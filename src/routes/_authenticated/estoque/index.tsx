import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, statusLabels, type VehicleStatus } from "@/components/app/StatusBadge";
import { Plus, Search, Car, X, LayoutGrid, Kanban, ArrowRight, ArrowLeft, Archive } from "lucide-react";
import { fmtBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estoque/")({
  head: () => ({ meta: [{ title: "Estoque — Managed" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    status: (s.status as VehicleStatus | "todos") ?? "todos",
    dateFrom: (s.dateFrom as string) ?? "",
    dateTo: (s.dateTo as string) ?? "",
  }),
  component: EstoqueList,
});

const PIPELINE: { key: VehicleStatus; label: string; color: string; bg: string }[] = [
  { key: "em_preparacao", label: "Em Preparação", color: "text-warning-foreground", bg: "bg-warning/10 border-warning/30" },
  { key: "pronto_venda",  label: "Pátio",          color: "text-primary",            bg: "bg-primary/5 border-primary/20" },
  { key: "com_sinal",     label: "Sinal na Conta",  color: "text-purple-600",         bg: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800" },
  { key: "vendido",       label: "Vendido",          color: "text-success",            bg: "bg-success/5 border-success/20" },
];

type Vehicle = {
  id: string; modelo: string; marca: string | null; ano: number | null; placa: string | null;
  status: string; valor_venda: number | null; valor_sugerido: number | null;
  valor_compra: number; valor_preparacao: number; vendido_em: string | null;
  vendedor_id: string | null; created_at: string;
  vehicle_images?: { storage_path: string }[];
};

function imgUrl(v: Vehicle) {
  const p = v.vehicle_images?.[0]?.storage_path;
  if (!p) return null;
  return p.startsWith("http") ? p : supabase.storage.from("vehicle-images").getPublicUrl(p).data.publicUrl;
}

function EstoqueList() {
  const qc = useQueryClient();
  const { status: searchStatus, dateFrom: searchDateFrom, dateTo: searchDateTo } = Route.useSearch();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | VehicleStatus>(searchStatus ?? "todos");
  const [dateFrom, setDateFrom] = useState(searchDateFrom ?? "");
  const [dateTo, setDateTo] = useState(searchDateTo ?? "");
  const [view, setView] = useState<"grid" | "kanban" | "arquivados">("kanban");

  // Modal state for moving to "vendido"
  const [vendaModal, setVendaModal] = useState<{ vehicle: Vehicle } | null>(null);
  const [vendaForm, setVendaForm] = useState({ valor_venda: "", data: new Date().toISOString().slice(0, 10), vendedor_id: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const [{ data: vehs, error }, { data: collabs }] = await Promise.all([
        supabase.from("vehicles").select("*, vehicle_images(storage_path)").order("created_at", { ascending: false }),
        supabase.from("collaborators").select("id, nome").eq("ativo", true),
      ]);
      if (error) throw error;
      return { vehs: (vehs ?? []) as Vehicle[], collabs: collabs ?? [] };
    },
  });

  const vehicles = data?.vehs ?? [];
  const collabs = data?.collabs ?? [];

  const arquivados = vehicles.filter((v) => v.status === "arquivado");
  const ativos = vehicles.filter((v) => v.status !== "arquivado");

  const hasDateFilter = dateFrom || dateTo;
  const filtered = ativos.filter((v) => {
    if (status !== "todos" && v.status !== status) return false;
    if (q && !`${v.modelo} ${v.marca ?? ""} ${v.placa ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (hasDateFilter) {
      const refDate = v.vendido_em ? new Date(v.vendido_em) : new Date(v.created_at);
      if (dateFrom && refDate < new Date(dateFrom)) return false;
      if (dateTo && refDate > new Date(dateTo + "T23:59:59")) return false;
    }
    return true;
  });

  const filteredArq = arquivados.filter((v) =>
    !q || `${v.modelo} ${v.marca ?? ""} ${v.placa ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  async function moveStatus(vehicle: Vehicle, newStatus: VehicleStatus) {
    if (newStatus === "vendido") {
      setVendaForm({ valor_venda: String(vehicle.valor_venda ?? vehicle.valor_sugerido ?? ""), data: new Date().toISOString().slice(0, 10), vendedor_id: vehicle.vendedor_id ?? "" });
      setVendaModal({ vehicle });
      return;
    }
    await supabase.from("vehicles").update({ status: newStatus }).eq("id", vehicle.id);
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    toast.success(`Movido para ${statusLabels[newStatus]}`);
  }

  async function confirmarVenda() {
    if (!vendaModal) return;
    if (!vendaForm.valor_venda) { toast.error("Informe o valor de venda"); return; }
    const { error } = await supabase.from("vehicles").update({
      status: "vendido",
      valor_venda: Number(vendaForm.valor_venda),
      vendido_em: vendaForm.data,
      vendedor_id: vendaForm.vendedor_id || null,
    }).eq("id", vendaModal.vehicle.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    toast.success("Veículo marcado como vendido");
    setVendaModal(null);
  }

  const statuses: ("todos" | VehicleStatus)[] = ["todos", "em_preparacao", "pronto_venda", "com_sinal", "vendido"];

  async function desarquivar(vehicle: Vehicle) {
    await supabase.from("vehicles").update({ status: "pronto_venda" }).eq("id", vehicle.id);
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    toast.success("Veículo movido para Pronto para venda");
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle={view === "arquivados" ? `${filteredArq.length} arquivado(s)` : `${filtered.length} veículo(s)`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>
              <Kanban className="h-4 w-4 mr-1" /> Pipeline
            </Button>
            <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>
              <LayoutGrid className="h-4 w-4 mr-1" /> Grade
            </Button>
            <Button size="sm" variant={view === "arquivados" ? "default" : "outline"} onClick={() => setView("arquivados")}>
              <Archive className="h-4 w-4 mr-1" /> Arquivados
              {arquivados.length > 0 && <span className="ml-1 bg-muted-foreground/20 rounded-full px-1.5 text-xs">{arquivados.length}</span>}
            </Button>
            <Button asChild>
              <Link to="/estoque/novo"><Plus className="h-4 w-4 mr-2" />Novo veículo</Link>
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por modelo, marca ou placa..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Período:</span>
          <Input type="date" className="w-36 h-9 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" className="w-36 h-9 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {hasDateFilter && (
            <Button size="sm" variant="ghost" onClick={clearDates} className="h-9 px-2"><X className="h-4 w-4" /></Button>
          )}
        </div>
      </div>

      {/* Status filter (only in grid mode) */}
      {view === "grid" && view !== "arquivados" && (
        <div className="flex gap-2 flex-wrap mb-4">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
              {s === "todos" ? "Todos" : statusLabels[s]}
            </Button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {/* KANBAN VIEW */}
      {!isLoading && view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE.map((col, colIdx) => {
            const cards = filtered.filter((v) => v.status === col.key);
            const prev = PIPELINE[colIdx - 1];
            const next = PIPELINE[colIdx + 1];
            return (
              <div key={col.key} className="flex-shrink-0 w-72">
                <div className={`rounded-xl border p-3 h-full ${col.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                    <span className="text-xs bg-background rounded-full px-2 py-0.5 font-medium border">{cards.length}</span>
                  </div>
                  <div className="space-y-3">
                    {cards.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Nenhum veículo</p>
                    )}
                    {cards.map((v) => {
                      const url = imgUrl(v);
                      return (
                        <div key={v.id} className="bg-background rounded-lg border shadow-sm overflow-hidden">
                          {url ? (
                            <img src={url} alt={v.modelo} className="w-full h-24 object-cover" />
                          ) : (
                            <div className="w-full h-24 bg-muted grid place-items-center text-muted-foreground">
                              <Car className="h-8 w-8" />
                            </div>
                          )}
                          <div className="p-3">
                            <Link to="/estoque/$id" params={{ id: v.id }} className="font-semibold text-sm hover:underline line-clamp-1">{v.modelo}</Link>
                            <p className="text-xs text-muted-foreground">{v.marca ?? ""} {v.ano ?? ""}{v.placa ? ` · ${v.placa}` : ""}</p>
                            <p className="text-sm font-medium mt-1">{fmtBRL(Number(v.valor_venda ?? v.valor_sugerido ?? 0))}</p>
                            <div className="flex gap-1 mt-2">
                              {prev && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-1" onClick={() => moveStatus(v, prev.key)}>
                                  <ArrowLeft className="h-3 w-3 mr-1" />{prev.label.split(" ")[0]}
                                </Button>
                              )}
                              {next && (
                                <Button size="sm" variant={next.key === "vendido" ? "default" : "outline"} className="h-7 px-2 text-xs flex-1" onClick={() => moveStatus(v, next.key)}>
                                  {next.label.split(" ")[0]}<ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GRID VIEW */}
      {!isLoading && view === "grid" && (
        <>
          {filtered.length === 0 && (
            <Card className="p-12 text-center">
              <Car className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">Nenhum veículo encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Comece cadastrando seu primeiro veículo.</p>
              <Button asChild className="mt-4"><Link to="/estoque/novo">Cadastrar veículo</Link></Button>
            </Card>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => {
              const url = imgUrl(v);
              return (
                <Link to="/estoque/$id" params={{ id: v.id }} key={v.id}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-[16/10] bg-muted relative">
                      {url ? (
                        <img src={url} alt={v.modelo} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-muted-foreground"><Car className="h-10 w-10" /></div>
                      )}
                      <div className="absolute top-3 right-3"><StatusBadge status={v.status as VehicleStatus} /></div>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold truncate">{v.modelo}</p>
                      <p className="text-xs text-muted-foreground">{v.marca ?? ""} {v.ano ?? ""} {v.placa ? `· ${v.placa}` : ""}</p>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-muted-foreground">Venda</span>
                        <span className="font-medium">{fmtBRL(Number(v.valor_venda ?? v.valor_sugerido ?? 0))}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ARQUIVADOS VIEW */}
      {!isLoading && view === "arquivados" && (
        <>
          {filteredArq.length === 0 && (
            <Card className="p-12 text-center">
              <Archive className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">Nenhum veículo arquivado</p>
            </Card>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArq.map((v) => {
              const url = imgUrl(v);
              return (
                <Card key={v.id} className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                  <div className="aspect-[16/10] bg-muted relative">
                    {url ? (
                      <img src={url} alt={v.modelo} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-muted-foreground"><Car className="h-10 w-10" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <Link to="/estoque/$id" params={{ id: v.id }} className="font-semibold hover:underline truncate block">{v.modelo}</Link>
                    <p className="text-xs text-muted-foreground">{v.marca ?? ""} {v.ano ?? ""} {v.placa ? `· ${v.placa}` : ""}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{fmtBRL(Number(v.valor_venda ?? v.valor_sugerido ?? 0))}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => desarquivar(v)}>
                        <ArrowRight className="h-3 w-3 mr-1" /> Restaurar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Modal: Confirmar venda */}
      <Dialog open={!!vendaModal} onOpenChange={(open) => !open && setVendaModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar venda — {vendaModal?.vehicle.modelo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Valor de venda <span className="text-destructive">*</span></Label>
              <Input
                type="number" step="0.01" placeholder="R$ 0,00"
                value={vendaForm.valor_venda}
                onChange={(e) => setVendaForm((f) => ({ ...f, valor_venda: e.target.value }))}
              />
            </div>
            <div>
              <Label>Data da venda <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={vendaForm.data}
                onChange={(e) => setVendaForm((f) => ({ ...f, data: e.target.value }))}
              />
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={vendaForm.vendedor_id} onValueChange={(v) => setVendaForm((f) => ({ ...f, vendedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar vendedor" /></SelectTrigger>
                <SelectContent>
                  {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {vendaModal && (
              <div className="text-xs text-muted-foreground bg-muted rounded p-3 space-y-1">
                <p>Valor de compra: <span className="font-medium">{fmtBRL(Number(vendaModal.vehicle.valor_compra))}</span></p>
                <p>Custo de preparação: <span className="font-medium">{fmtBRL(Number(vendaModal.vehicle.valor_preparacao))}</span></p>
                {vendaForm.valor_venda && (
                  <p className="text-success font-medium">
                    Lucro estimado: {fmtBRL(Number(vendaForm.valor_venda) - Number(vendaModal.vehicle.valor_compra) - Number(vendaModal.vehicle.valor_preparacao))}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendaModal(null)}>Cancelar</Button>
            <Button onClick={confirmarVenda} disabled={!vendaForm.valor_venda}>Confirmar venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
