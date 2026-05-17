# Plano — Managed (MVP)

Plataforma de gestão para lojas de veículos, substituindo Autoconf/Revenda Mais/planilhas. Foco em estoque, financeiro, DRE, margem e colaboradores.

## Stack e Backend

- TanStack Start + Tailwind v4 (já configurado).
- **Lovable Cloud** (Postgres + Auth + Storage) para dados, login e upload de imagens dos veículos.
- shadcn/ui + Recharts para gráficos.

## Identidade Visual

Inspirada em Conta Azul / Asaas: clean, moderna, profissional.
- **Tema claro**: fundo branco, primário azul (`oklch(~0.55 0.18 250)`), acentos azul-claro, bordas suaves.
- **Tema escuro**: fundo quase-preto, texto branco, mesmo azul como acento.
- Toggle claro/escuro persistente.
- Tipografia: Inter (UI) + DM Sans (display) — limpa e corporativa.
- Layout com **sidebar** colapsável + topbar (busca, tema, usuário).

## Estrutura de Rotas

```
/login                          Auth (email/senha)
/                               Dashboard
/estoque                        Lista de veículos
/estoque/novo                   Cadastro de veículo (com calculadora de margem)
/estoque/$id                    Detalhe + despesas do veículo
/financeiro                     Painel financeiro
/financeiro/despesas            Cadastro/listagem de despesas
/financeiro/dre                 DRE mensal + comparativo
/financeiro/margem              Controle de margem por veículo
/colaboradores                  Lista + cadastro
/colaboradores/$id              Detalhe + histórico de pagamentos
/relatorios                     Relatórios exportáveis (PDF/print)
/configuracoes                  Usuários, permissões, tema, nome da loja
```

## Modelo de Dados (Lovable Cloud)

- `profiles` (id→auth.users, nome, loja_nome) — nome da loja personaliza "Managed [Nome]".
- `user_roles` (user_id, role: `admin`|`gestor`|`vendedor`|`marketing`) — tabela separada + função `has_role` SECURITY DEFINER.
- `vehicles` (id, modelo, valor_compra, valor_venda, valor_preparacao, status, margem_min, margem_max, vendedor_id, vendido_em, created_at).
- `vehicle_images` (vehicle_id, storage_path) — bucket público `vehicle-images`.
- `vehicle_expenses` (vehicle_id, categoria, descricao, valor, data).
- `expenses` (categoria: `preparacao`|`marketing`|`gasolina`|`operacional`|`outras`, descricao, valor, data).
- `collaborators` (nome, email, funcao, salario, comissao_pct).
- `collaborator_payments` (collaborator_id, valor, tipo, data).
- `settings` (user_id/loja, margem_padrao_tipo: `valor`|`percentual`, margem_padrao_valor, tema).

RLS habilitada em todas; políticas via `has_role`.

## Funcionalidades-Chave

### Dashboard
KPIs em cards (em estoque / em preparação / vendidos / com sinal), faturamento e lucro do mês, despesas, gráfico de vendas por mês, top vendedor (faturamento e quantidade).

### Estoque
- Grid/lista com filtros por status e busca.
- Cadastro com upload múltiplo de fotos (Storage).
- Detalhe: galeria, dados, lista de despesas do veículo, lucro real calculado em tempo real (`venda − compra − preparação − comissão − despesas`).
- Badges de status coloridos.

### Calculadora de Margem (no cadastro)
Configurável em **valor** ou **percentual**:
- `valor_min_venda = compra + preparacao + margem_min`
- `valor_ideal = compra + preparacao + margem_max`
- Exibe ao vendedor o limite mínimo negociável.

### Financeiro
- Painel: faturamento real e projetado, lucro real e projetado, despesas, gráficos.
- Despesas: CRUD com categoria, filtro por mês.

### DRE
- Tabela mensal Jan–Dez: Receita, Custo veículos, Despesas operacionais, Lucro bruto, Lucro líquido.
- Comparativo entre dois períodos lado a lado.

### Controle de Margem
- Lista de vendidos agrupados: **acima**, **na**, **abaixo** da margem. Cards-resumo + tabela.

### Colaboradores
- CRUD, histórico de pagamentos (salário + comissões), total pago no mês.

### Relatórios
- Página imprimível (`window.print()` + CSS print) com seleção de período e seções: estoque, lucro, top veículo, performance.
- Exportação CSV para listagens.

### Configurações
- Nome da loja (afeta título "Managed X" no header/sidebar).
- Gestão de usuários e roles (apenas admin).
- Toggle tema claro/escuro.

## Fases de Entrega

1. **Fase 1 (esta entrega)**: Cloud + Auth + design system + sidebar/topbar + Dashboard + Estoque (CRUD + upload + calculadora de margem) + Financeiro básico (KPIs + despesas) + Configurações (tema + nome da loja). Seeds de exemplo.
2. **Fase 2**: DRE completo + Controle de margem + Colaboradores + pagamentos.
3. **Fase 3**: Relatórios exportáveis + permissões granulares + visão marketing.

Confirme se posso iniciar pela Fase 1 (ou ajuste o escopo) e me diga o **nome da loja** para personalizar "Managed [Nome]" desde já (posso deixar editável nas configurações se preferir).
