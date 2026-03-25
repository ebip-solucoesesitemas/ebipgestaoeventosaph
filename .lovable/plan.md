# Plano: Banner Global de Avisos — Apenas Super-Admin

## Alteração no plano original

A tela de gerenciamento de avisos (`/admin/system-notices`) será restrita **exclusivamente ao super-admin** (perfis com `hidden = true`). Nenhum outro cargo (admin, gestor, operacional, equipe) poderá ver ou acessar essa funcionalidade.

## 1. Tabela `system_notices`

```sql
CREATE TABLE public.system_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  status text NOT NULL DEFAULT 'active',
  finished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler (para exibir o banner)
CREATE POLICY "Anyone can view notices" ON public.system_notices
  FOR SELECT TO authenticated USING (true);

-- Apenas super-admin pode gerenciar
CREATE POLICY "Super admins can manage notices" ON public.system_notices
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notices;
```

## 2. Componente `SystemBanner.tsx`

- Busca o aviso mais recente, assina realtime
- Ativo → faixa colorida com mensagem
- Finalizado há < 20 min → faixa verde "Sistema funcionando normalmente - EBIP S&S Soluções e Sistemas"
- Sem aviso / finalizado há > 20 min → nada
- `position: fixed`, `top: 0`, `z-50`, `w-full`

## 3. Tela `SystemNotices.tsx`

- Textarea para mensagem, select de cor, botões ativar/finalizar
- Lista de avisos existentes

## 4. Restrições de acesso

- **RLS**: Apenas `is_super_admin()` pode INSERT/UPDATE/DELETE
- **Rota**: Envolver com verificação `isSuperAdmin` no `App.tsx` — redirecionar se não for super-admin
- **Sidebar**: O link "Avisos do Sistema" só aparece quando `profile?.hidden === true`

## 5. Integração

- `App.tsx`: Renderizar `<SystemBanner />` dentro do AuthProvider, fora do Routes. Adicionar rota `/admin/system-notices`
- `AppSidebar.tsx`: Link visível apenas para `profile?.hidden === true`

## Arquivos


| Arquivo                             | Alteração                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Migration SQL                       | Criar tabela + RLS (super-admin only) + realtime                                                           |
| `src/components/SystemBanner.tsx`   | Novo componente global                                                                                     |
| `src/pages/admin/SystemNotices.tsx` | Nova tela de gestão                                                                                        |
| `src/App.tsx`                       | Banner global + rota                                                                                       |
| `src/components/AppSidebar.tsx`     | Link apenas para super-admin Preciso que tome cuidado para não quebrar o sistema em outras funcionalidades |
