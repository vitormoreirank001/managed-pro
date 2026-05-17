import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeMargin, fmtBRL, type MarginType } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque/novo")({
  head: () => ({ meta: [{ title: "Novo veículo — Managed" }] }),
  component: NovoVeiculo,
});

function NovoVeiculo() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    modelo: "",
    marca: "",
    ano: "",
    placa: "",
    km: "",
    cor: "",
    valor_compra: "",
    valor_preparacao: "",
    margem_tipo: "valor" as MarginType,
    margem_min: "",
    margem_max: "",
    observacoes: "",
  });

  // Carrega margem padrão
  useEffect(() => {
    supabase
      .from("settings")
      .select("margem_padrao_tipo, margem_padrao_min, margem_padrao_max")
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setForm((f) => ({
            ...f,
            margem_tipo: data.margem_padrao_tipo,
            margem_min: String(data.margem_padrao_min ?? ""),
            margem_max: String(data.margem_padrao_max ?? ""),
          }));
      });
  }, []);

  const m = computeMargin({
    valor_compra: Number(form.valor_compra || 0),
    valor_preparacao: Number(form.valor_preparacao || 0),
    margem_tipo: form.margem_tipo,
    margem_min: Number(form.margem_min || 0),
    margem_max: Number(form.margem_max || 0),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: v, error } = await supabase
        .from("vehicles")
        .insert({
          modelo: form.modelo,
          marca: form.marca || null,
          ano: form.ano ? Number(form.ano) : null,
          placa: form.placa || null,
          km: form.km ? Number(form.km) : null,
          cor: form.cor || null,
          valor_compra: Number(form.valor_compra || 0),
          valor_preparacao: Number(form.valor_preparacao || 0),
          margem_tipo: form.margem_tipo,
          margem_min: Number(form.margem_min || 0),
          margem_max: Number(form.margem_max || 0),
          valor_sugerido: m.valorIdealVenda,
          observacoes: form.observacoes || null,
          status: "em_preparacao",
          created_by: u.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Upload imagens
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = `${v.id}/${Date.now()}-${i}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("vehicle-images").upload(path, f);
        if (upErr) {
          toast.error(`Falha ao enviar imagem ${i + 1}: ${upErr.message}`);
          continue;
        }
        await supabase.from("vehicle_images").insert({ vehicle_id: v.id, storage_path: path, ordem: i });
      }

      toast.success("Veículo cadastrado!");
      navigate({ to: "/estoque/$id", params: { id: v.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  return (
    <>
      <PageHeader title="Novo veículo" subtitle="Cadastre um veículo no estoque" />
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Informações do veículo</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Modelo *"><Input required value={form.modelo} onChange={(e) => set("modelo", e.target.value)} /></Field>
              <Field label="Marca"><Input value={form.marca} onChange={(e) => set("marca", e.target.value)} /></Field>
              <Field label="Ano"><Input type="number" value={form.ano} onChange={(e) => set("ano", e.target.value)} /></Field>
              <Field label="Placa"><Input value={form.placa} onChange={(e) => set("placa", e.target.value.toUpperCase())} /></Field>
              <Field label="Km"><Input type="number" value={form.km} onChange={(e) => set("km", e.target.value)} /></Field>
              <Field label="Cor"><Input value={form.cor} onChange={(e) => set("cor", e.target.value)} /></Field>
            </div>
            <div className="mt-4">
              <Field label="Observações"><Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} /></Field>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Valores</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Valor de compra (R$) *">
                <Input type="number" step="0.01" required value={form.valor_compra} onChange={(e) => set("valor_compra", e.target.value)} />
              </Field>
              <Field label="Valor de preparação (R$)">
                <Input type="number" step="0.01" value={form.valor_preparacao} onChange={(e) => set("valor_preparacao", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-1">Imagens do veículo</h3>
            <p className="text-sm text-muted-foreground mb-4">Adicione fotos para exibir na vitrine interna.</p>
            <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm">Clique para selecionar imagens</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files ?? [])])}
              />
            </label>
            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 h-6 w-6 grid place-items-center bg-foreground/70 text-background rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 sticky top-20">
            <h3 className="font-semibold">Calculadora de margem</h3>
            <p className="text-xs text-muted-foreground mt-1">Define os limites de negociação automaticamente.</p>

            <div className="mt-4">
              <Tabs value={form.margem_tipo} onValueChange={(v) => set("margem_tipo", v as MarginType)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="valor">Valor (R$)</TabsTrigger>
                  <TabsTrigger value="percentual">Percentual (%)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Margem mínima">
                <Input type="number" step="0.01" value={form.margem_min} onChange={(e) => set("margem_min", e.target.value)} />
              </Field>
              <Field label="Margem ideal">
                <Input type="number" step="0.01" value={form.margem_max} onChange={(e) => set("margem_max", e.target.value)} />
              </Field>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <Row label="Custo total" value={fmtBRL(m.base)} />
              <Row label="Lucro mínimo" value={fmtBRL(m.minLucro)} />
              <Row label="Lucro ideal" value={fmtBRL(m.maxLucro)} />
              <hr className="border-border" />
              <Row label="Venda mínima" value={fmtBRL(m.valorMinVenda)} highlight />
              <Row label="Venda ideal" value={fmtBRL(m.valorIdealVenda)} highlight tone="primary" />
            </div>

            <Button type="submit" disabled={saving} className="w-full mt-6">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar veículo
            </Button>
          </Card>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "primary" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? "text-base" : ""} ${tone === "primary" ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
