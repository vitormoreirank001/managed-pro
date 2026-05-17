import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge, statusLabels, type VehicleStatus } from "@/components/app/StatusBadge";
import { Plus, Search, Car } from "lucide-react";
import { fmtBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque/")({
  head: () => ({ meta: [{ title: "Estoque — Managed" }] }),
  component: EstoqueList,
});

function EstoqueList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | VehicleStatus>("todos");
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*, vehicle_images(storage_path)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((v) => {
    if (status !== "todos" && v.status !== status) return false;
    if (q && !`${v.modelo} ${v.marca ?? ""} ${v.placa ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const statuses: ("todos" | VehicleStatus)[] = ["todos", "em_preparacao", "pronto_venda", "com_sinal", "vendido"];

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle={`${filtered.length} veículo(s)`}
        actions={
          <Button asChild>
            <Link to="/estoque/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo veículo
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por modelo, marca ou placa..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s === "todos" ? "Todos" : statusLabels[s]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-12 text-center">
          <Car className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum veículo encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Comece cadastrando seu primeiro veículo.</p>
          <Button asChild className="mt-4"><Link to="/estoque/novo">Cadastrar veículo</Link></Button>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const first = v.vehicle_images?.[0]?.storage_path;
          const url = first
            ? supabase.storage.from("vehicle-images").getPublicUrl(first).data.publicUrl
            : null;
          return (
            <Link to="/estoque/$id" params={{ id: v.id }} key={v.id}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[16/10] bg-muted relative">
                  {url ? (
                    <img src={url} alt={v.modelo} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground">
                      <Car className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={v.status} />
                  </div>
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
  );
}
