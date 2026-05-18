import { cn } from "@/lib/utils";

const map = {
  em_preparacao: { label: "Em preparação", cls: "bg-warning/20 text-warning-foreground" },
  pronto_venda: { label: "Pronto para venda", cls: "bg-primary-soft text-primary" },
  vendido: { label: "Vendido", cls: "bg-success/20 text-success" },
  com_sinal: { label: "Com sinal", cls: "bg-accent text-accent-foreground" },
  arquivado: { label: "Arquivado", cls: "bg-muted text-muted-foreground" },
} as const;

export type VehicleStatus = keyof typeof map;

export function StatusBadge({ status }: { status: VehicleStatus }) {
  const v = map[status] ?? map.em_preparacao;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", v.cls)}>
      {v.label}
    </span>
  );
}

export const statusLabels = Object.fromEntries(
  Object.entries(map).map(([k, v]) => [k, v.label]),
) as Record<VehicleStatus, string>;
