# NeoLevel — Plataforma da Business School

Sistema operacional da **NeoLevel Business School** (Florianópolis/SC, ecossistema Academia FIESC de Negócios):
gestão acadêmica, Neomentoria, Meu Negócio, Experiências Neo, comunidade, comunicação e gestão interna
para Neoleaders, Neomentores, professores, coordenação, direção e secretaria.

> Princípio central: responder **"o Neoleader está evoluindo como empreendedor e líder?"** — não apenas "o aluno estudou?".

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix) · Lucide · TanStack Query · React Router ·
Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · PWA (vite-plugin-pwa)

## Estrutura

```
src/
  app/            providers, router (rotas lazy por módulo)
  components/
    ui/           componentes base shadcn/ui
    brand/        identidade NeoLevel
    layout/       shell, navegação, loaders
  config/         terminologia NeoLevel e constantes
  features/<módulo>/
    api/          acesso a dados (queries/mutations Supabase)
    components/   UI do módulo
    hooks/        hooks React Query do módulo
    types.ts      tipos do domínio
  lib/            cliente Supabase, env, utilitários
  types/          tipos gerados do banco (npm run db:types)
supabase/
  migrations/     esquema SQL versionado + RLS
  functions/      Edge Functions (convites, operações privilegiadas)
  seed.sql        dados iniciais
```

Regras de arquitetura:

- **Autorização no banco**: toda tabela tem RLS; o front só esconde o que o banco já bloqueia.
- **Nenhum dado importante em localStorage** — só a sessão do Supabase.
- A `service_role` key nunca vai para o front; operações privilegiadas usam Edge Functions.

## Rodando localmente

```bash
cp .env.example .env.local   # preencha com URL e anon key do Supabase
npm install
npm run dev
```

## Autenticação

- Acesso privado: cadastro público desligado; contas só via Edge Function `invite-user`
  (exige `users.create`; cargos de gestão exigem `permissions.manage`).
- Convite → e-mail → `/primeiro-acesso` (define senha, ativa a conta) → dashboard do cargo.
- Recuperação: `/esqueci-senha` → e-mail → `/redefinir-senha`.
- `current_user_context()` carrega perfil, cargos, permissões, turma e dashboard em uma chamada.
- `usePermission()` / `<Can>` refletem o RBAC na UI; o banco aplica as mesmas regras via RLS.

## Banco de dados (Supabase)

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npm run db:push    # aplica supabase/migrations
npm run db:types   # regenera src/types/database.ts
```

## Dados de demonstração

```bash
# carregar (troque a senha) — via Management API ou SQL editor do Supabase
sed "s/__DEMO_PASSWORD__/SuaSenhaDemo1/g" supabase/seed/demo.sql
# remover tudo antes de entrar em produção
supabase/seed/demo_remove.sql
```

Turma "NeoLevel Demo 2026.1" com Neoleaders, professor e Neomentora (`@demo.neolevel.local`).
Contas de gestão da demo não têm senha; disciplinas da demo usam códigos `DEMO-*`.

## Roadmap

| Fase | Escopo | Status |
|---|---|---|
| 0 | Base do projeto (stack, design system, PWA, estrutura) | ✅ |
| 1 | Banco de dados, RBAC e RLS ([docs](docs/database.md)) | ✅ |
| 2 | Autenticação, convites (Edge Function), rotas protegidas | ✅ |
| 3 | Experiência do Neoleader (navegação por cargo, dashboard, Neo Progress, Minha Jornada, trilha) | ✅ |
| 4 | Acadêmico (disciplinas, aulas, presença, entregas, turmas com alertas, professores) | ✅ |
| 5 | Neomentoria (sessões, notas privadas, próximos passos, dashboard do Neomentor) e Meu Negócio (KPIs, milestones, Plano de Execução) | ✅ |
| 6 | Bancas/VC (critérios configuráveis, resultado confidencial), Experiências Neo, Comunidade com privacidade, Perfil, Conquistas | ✅ |
| 7 | Chat em tempo real, comunicados com confirmação de leitura, documentos com assinatura, agenda, notificações | ✅ |
| 8 | Dashboards de Coordenação/Direção/Secretaria, Perfil 360º, Admissões (kanban, entrevista, comitê, conversão), Usuários e permissões, Solicitações, Financeiro acadêmico, Relatórios (CSV), Configurações | ✅ |
