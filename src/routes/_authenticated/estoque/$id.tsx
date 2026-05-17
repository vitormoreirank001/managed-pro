import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, statusLabels, type VehicleStatus } from "@/components/app/StatusBadge";
import { fmtBRL, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Car, Upload } from "lucide-react";
import { useRef } from "react";

const categorias = ["preparacao", "marketing", "gasolina", "operacional", "comissao", "outras"] as const;
const catLabel: Record<(typeof categorias)[number], string> = {
  preparacao: "Preparação",
  marketing: "Marketing",
  gasolina: "Gasolina",
  operacional: "Operacional",
  comissao: "Comissão",
  outras: "Outras",
};

export const Route = createFileRoute("/_authenticated/estoque/$id")({
  head: () => ({ meta: [{ title: "Veículo — Managed" }] }),
  component: VeiculoDetalhe,
});

function VeiculoDetalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const [v, imgs, desp, vendedores] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
        supabase.from("vehicle_images").select("*").eq("vehicle_id", id).order("ordem"),
        supabase.from("vehicle_expenses").select("*").eq("vehicle_id", id).order("data", { ascending: false }),
        supabase.from("collaborators").select("id, nome").eq("ativo", true),
      ]);
      return { v: v.data, imgs: imgs.data ?? [], desp: desp.data ?? [], vendedores: vendedores.data ?? [] };
    },
  });

  const v = data?.v;
  const desp = data?.desp ?? [];
  const totalDesp = desp.reduce((s, d) => s + Number(d.valor), 0);
  const venda = Number(v?.valor_venda ?? 0);
  const custo = Number(v?.valor_compra ?? 0) + Number(v?.valor_preparacao ?? 0);
  const lucro = venda > 0 ? venda - custo - totalDesp : 0;

  const [novaDesp, setNovaDesp] = useState({ categoria: "outras" as (typeof categorias)[number], descricao: "", valor: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("vehicle-images").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    await supabase.from("vehicle_images").insert({ vehicle_id: id, storage_path: path, ordem: data?.imgs.length ?? 0 });
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    toast.success("Imagem adicionada");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removeImage(img: { id: string; storage_path: string }) {
    await supabase.storage.from("vehicle-images").remove([img.storage_path]);
    await supabase.from("vehicle_images").delete().eq("id", img.id);
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    toast.success("Imagem removida");
  }

  async function addDesp(e: React.FormEvent) {
    e.preventDefault();
    if (!novaDesp.valor) return;
    const { error } = await supabase.from("vehicle_expenses").insert({
      vehicle_id: id,
      categoria: novaDesp.categoria,
      descricao: novaDesp.descricao || null,
      valor: Number(novaDesp.valor),
    });
    if (error) return toast.error(error.message);
    setNovaDesp({ categoria: "outras", descricao: "", valor: "" });
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    toast.success("Despesa adicionada");
  }

  async function removeDesp(despId: string) {
    await supabase.from("vehicle_expenses").delete().eq("id", despId);
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
  }

  async function updateStatus(s: VehicleStatus) {
    await supabase.from("vehicles").update({ status: s, ...(s === "vendido" ? { vendido_em: new Date().toISOString().slice(0, 10) } : {}) }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
  }

  async function updateVenda(field: string, value: string | null) {
    await supabase.from("vehicles").update({ [field]: value ? Number(value) : null } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
  }

  async function setVendedor(vid: string) {
    await supabase.from("vehicles").update({ vendedor_id: vid || null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
  }

  async function excluir() {
    if (!confirm("Excluir este veículo?")) return;
    await supabase.from("vehicles").delete().eq("id", id);
    toast.success("Veículo excluído");
    navigate({ to: "/estoque" });
  }

  if (!v) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const url = (p: string) => supabase.storage.from("vehicle-images").getPublicUrl(p).data.publicUrl;

  return (
    <>
      <PageHeader
        title={v.modelo}
        subtitle={`${v.marca ?? ""} ${v.ano ?? ""} ${v.placa ? `· ${v.placa}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline"><Link to="/estoque"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link></Button>
            <Button variant="outline" onClick={excluir}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-2 overflow-hidden">
            {data?.imgs.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {data.imgs.map((i) => (
                  <div key={i.id} className="relative group">
                    <img src={url(i.storage_path)} alt="" className="aspect-square object-cover rounded-lg w-full" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[16/9] grid place-items-center text-muted-foreground"><Car className="h-12 w-12" /></div>
            )}
            <div className="mt-2 p-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
              <Button variant="outline" size="sm" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando..." : "Adicionar foto"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Despesas do veículo</h3>
              <span className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{fmtBRL(totalDesp)}</span></span>
            </div>
            <form onSubmit={addDesp} className="mt-4 grid grid-cols-1 md:grid-cols-[160px_1fr_140px_auto] gap-2">
              <Select value={novaDesp.categoria} onValueChange={(v) => setNovaDesp((p) => ({ ...p, categoria: v as (typeof categorias)[number] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c} value={c}>{catLabel[c]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Descrição" value={novaDesp.descricao} onChange={(e) => setNovaDesp((p) => ({ ...p, descricao: e.target.value }))} />
              <Input type="number" step="0.01" placeholder="Valor" value={novaDesp.valor} onChange={(e) => setNovaDesp((p) => ({ ...p, valor: e.target.value }))} />
              <Button type="submit"><Plus className="h-4 w-4" /></Button>
            </form>
            <div className="mt-4 divide-y divide-border">
              {desp.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma despesa registrada.</p>}
              {desp.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{catLabel[d.categoria as (typeof categorias)[number]]}</p>
                    <p className="text-xs text-muted-foreground">{d.descricao ?? "—"} · {fmtDate(d.data)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{fmtBRL(Number(d.valor))}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeDesp(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Status</h3>
              <StatusBadge status={v.status} />
            </div>
            <Select value={v.status} onValueChange={(s) => updateStatus(s as VehicleStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(statusLabels) as VehicleStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Vendedor</Label>
                <Select value={v.vendedor_id ?? ""} onValueChange={setVendedor}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {data?.vendedores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor de venda</Label>
                <Input type="number" step="0.01" defaultValue={v.valor_venda ?? ""} onBlur={(e) => updateVenda("valor_venda", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Sinal recebido</Label>
                <Input type="number" step="0.01" defaultValue={v.sinal_valor ?? ""} onBlur={(e) => updateVenda("sinal_valor", e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-3 text-sm">
            <h3 className="font-semibold">Resumo financeiro</h3>
            <Row label="Compra" value={fmtBRL(Number(v.valor_compra))} />
            <Row label="Preparação" value={fmtBRL(Number(v.valor_preparacao))} />
            <Row label="Despesas extras" value={fmtBRL(totalDesp)} />
            <Row label="Valor sugerido" value={fmtBRL(Number(v.valor_sugerido ?? 0))} />
            <Row label="Venda" value={fmtBRL(venda)} highlight />
            <hr className="border-border" />
            <Row label="Lucro real" value={fmtBRL(lucro)} highlight tone={lucro >= 0 ? "success" : "destructive"} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "success" | "destructive" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? "text-base" : ""} ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
