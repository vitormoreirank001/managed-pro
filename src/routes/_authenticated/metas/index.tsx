import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, fmtInt } from "@/lib/format";
import { toast } from "sonner";
import { Trophy, Medal } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const Route = createFileRoute("/_authenticated/metas/")({
  head: () => ({ meta: [{ title: "Metas — Managed" }] }),
  component: Metas,
});

type Tier = "ouro" | "prata" | "bronze" | null;

function getTier(atual: number, ouro: number, prata: number, bronze: number): Tier {
  if (ouro > 0 && atual >= ouro) return "ouro";
  if (prata > 0 && atual >= prata) return "prata";
  if (bronze > 0 && atual >= bronze) return "bronze";
  return null;
}

const tierConfig = {
  ouro:   { label: "Ouro",   icon: "🥇", color: "text-yellow-600",  bg: "bg-yellow-50  border-yellow-200  dark:bg-yellow-950/20 dark:border-yellow-700" },
  prata:  { label: "Prata",  icon: "🥈", color: "text-slate-500",   bg: "bg-slate-50   border-slate-200   dark:bg-slate-900/40 dark:border-slate-600" },
  bronze: { label: "Bronze", icon: "🥉", color: "text-orange-600",  bg: "bg-orange-50  border-orange-200  dark:bg-orange-950/20 dark:border-orange-700" },
};

function TierBadge({ tier }: { tier: Tier }) {
  if (!tier) return <span className="text-xs text-muted-foreground">Abaixo da meta</span>;
  const t = tierConfig[tier];
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full border ${t.bg} ${t.color}`}>
      {t.icon} {t.label}
    </span>
  );
}

function ProgressBar({ atual, max, tier }: { atual: number; max: number; tier: Tier }) {
  const pct = max > 0 ? Math.min(100, (atual / max) * 100) : 0;
  const barColor = tier === "ouro" ? "bg-yellow-500" : tier === "prata" ? "bg-slate-400" : tier === "bronze" ? "bg-orange-500" : "bg-primary";
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Metas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date();
  const [year, setYear] = useState(hoje.getFullYear());
  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const years = [0, 1, 2].map((o) => hoje.getFullYear() - o);

  const { ini, fim } = useMemo(() => {
    const end = new Date(year, month, 0);
    return { ini: `${year}-${String(month).padStart(2,"0")}-01`, fim: end.toISOString().slice(0,10) };
  }, [year, month]);

  const [form, setForm] = useState({
    bronze_vendas: "", prata_vendas: "", ouro_vendas: "",
    bronze_lucro: "", prata_lucro: "", ouro_lucro: "",
  });

  const { data } = useQuery({
    queryKey: ["metas-page", year, month, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [metaRes, veiculos, despesas] = await Promise.all([
        supabase.from("metas").select("*").eq("user_id", user!.id).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("vehicles").select("valor_venda, valor_compra, valor_preparacao").eq("status","vendido").gte("vendido_em", ini).lte("vendido_em", fim),
        supabase.from("expenses").select("valor").gte("data", ini).lte("data", fim),
      ]);
      return { meta: metaRes.data, veiculos: veiculos.data ?? [], despesas: despesas.data ?? [] };
    },
  });

  useEffect(() => {
    if (data?.meta) {
      setForm({
        bronze_vendas: String(data.meta.bronze_vendas),
        prata_vendas:  String(data.meta.prata_vendas),
        ouro_vendas:   String(data.meta.ouro_vendas),
        bronze_lucro:  String(data.meta.bronze_lucro),
        prata_lucro:   String(data.meta.prata_lucro),
        ouro_lucro:    String(data.meta.ouro_lucro),
      });
    } else if (data && !data.meta) {
      setForm({ bronze_vendas:"", prata_vendas:"", ouro_vendas:"", bronze_lucro:"", prata_lucro:"", ouro_lucro:"" });
    }
  }, [data?.meta]);

  const vendas = data?.veiculos.length ?? 0;
  const fat    = (data?.veiculos ?? []).reduce((s,v) => s + Number(v.valor_venda ?? 0), 0);
  const custo  = (data?.veiculos ?? []).reduce((s,v) => s + Number(v.valor_compra) + Number(v.valor_preparacao), 0);
  const desp   = (data?.despesas ?? []).reduce((s,e) => s + Number(e.valor), 0);
  const lucro  = fat - custo - desp;
  const meta   = data?.meta;

  const tierVendas = meta ? getTier(vendas, meta.ouro_vendas, meta.prata_vendas, meta.bronze_vendas) : null;
  const tierLucro  = meta ? getTier(lucro, Number(meta.ouro_lucro), Number(meta.prata_lucro), Number(meta.bronze_lucro)) : null;

  async function salvar() {
    const payload = {
      user_id: user!.id, year, month,
      bronze_vendas: Number(form.bronze_vendas) || 0,
      prata_vendas:  Number(form.prata_vendas)  || 0,
      ouro_vendas:   Number(form.ouro_vendas)   || 0,
      bronze_lucro:  Number(form.bronze_lucro)  || 0,
      prata_lucro:   Number(form.prata_lucro)   || 0,
      ouro_lucro:    Number(form.ouro_lucro)    || 0,
    };
    const { error } = await supabase.from("metas").upsert(payload, { onConflict: "user_id,year,month" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["metas-page"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Metas salvas");
  }

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value })),
  });

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle={`${MESES[month-1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Meta de Vendas (carros)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs mb-1 block">🥉 Bronze</Label><Input type="number" placeholder="ex: 10" {...f("bronze_vendas")} /></div>
            <div><Label className="text-xs mb-1 block">🥈 Prata</Label><Input type="number" placeholder="ex: 16" {...f("prata_vendas")} /></div>
            <div><Label className="text-xs mb-1 block">🥇 Ouro</Label><Input type="number" placeholder="ex: 21" {...f("ouro_vendas")} /></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" /> Meta de Lucro (R$)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs mb-1 block">🥉 Bronze</Label><Input type="number" placeholder="ex: 150000" {...f("bronze_lucro")} /></div>
            <div><Label className="text-xs mb-1 block">🥈 Prata</Label><Input type="number" placeholder="ex: 300000" {...f("prata_lucro")} /></div>
            <div><Label className="text-xs mb-1 block">🥇 Ouro</Label><Input type="number" placeholder="ex: 500000" {...f("ouro_lucro")} /></div>
          </div>
        </Card>
      </div>

      <Button onClick={salvar} className="mb-6">Salvar metas de {MESES[month-1]}</Button>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Vendas — {MESES[month-1]}</h3>
            <TierBadge tier={tierVendas} />
          </div>
          <p className="text-4xl font-bold">{fmtInt(vendas)}<span className="text-base font-normal text-muted-foreground"> carros</span></p>
          {meta ? (
            <div className="mt-4 space-y-2">
              <ProgressBar atual={vendas} max={meta.ouro_vendas} tier={tierVendas} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🥉 {meta.bronze_vendas}</span><span>🥈 {meta.prata_vendas}</span><span>🥇 {meta.ouro_vendas}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {meta.ouro_vendas > vendas ? `Faltam ${meta.ouro_vendas - vendas} carros para o Ouro` : "Meta Ouro atingida! 🎉"}
              </p>
            </div>
          ) : <p className="text-xs text-muted-foreground mt-4">Defina as metas acima para ver o progresso.</p>}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Lucro — {MESES[month-1]}</h3>
            <TierBadge tier={tierLucro} />
          </div>
          <p className={`text-4xl font-bold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(lucro)}</p>
          {meta ? (
            <div className="mt-4 space-y-2">
              <ProgressBar atual={lucro} max={Number(meta.ouro_lucro)} tier={tierLucro} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🥉 {fmtBRL(Number(meta.bronze_lucro))}</span>
                <span>🥈 {fmtBRL(Number(meta.prata_lucro))}</span>
                <span>🥇 {fmtBRL(Number(meta.ouro_lucro))}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {Number(meta.ouro_lucro) > lucro ? `Falta ${fmtBRL(Number(meta.ouro_lucro) - lucro)} para o Ouro` : "Meta Ouro atingida! 🎉"}
              </p>
            </div>
          ) : <p className="text-xs text-muted-foreground mt-4">Defina as metas acima para ver o progresso.</p>}
        </Card>
      </div>
    </>
  );
}
