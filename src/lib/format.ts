export const fmtBRL = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtInt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR");

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export const monthStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), 1).toISOString();

export const monthEnd = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

export type MarginType = "valor" | "percentual";

export function computeMargin(opts: {
  valor_compra: number;
  valor_preparacao: number;
  margem_tipo: MarginType;
  margem_min: number;
  margem_max: number;
}) {
  const base = (opts.valor_compra || 0) + (opts.valor_preparacao || 0);
  const minLucro =
    opts.margem_tipo === "valor"
      ? opts.margem_min
      : (base * (opts.margem_min || 0)) / 100;
  const maxLucro =
    opts.margem_tipo === "valor"
      ? opts.margem_max
      : (base * (opts.margem_max || 0)) / 100;
  return {
    base,
    minLucro,
    maxLucro,
    valorMinVenda: base + minLucro,
    valorIdealVenda: base + maxLucro,
  };
}
