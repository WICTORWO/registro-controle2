# Controle de Descontos — Carreteiro

App web para controle de cautelas de carreteiro, integrado ao Supabase.

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (já configurada)
- Conta no [Vercel](https://vercel.com) (para deploy)
- Conta no [GitHub](https://github.com) (para conectar ao Vercel)

---

## 1. Configurar o banco no Supabase

Acesse o **SQL Editor** no painel do Supabase e rode:

```sql
create table registros (
  id bigint generated always as identity primary key,
  data date not null,
  cliente text,
  quantidade int default 1,
  status text,
  cautela text,
  motorista text,
  observacoes text,
  foto_url text,
  created_at timestamptz default now()
);
```

---

## 2. Criar o bucket de fotos

No Supabase, vá em **Storage → New bucket**:
- Nome: `fotos-cautelas`
- Marcar como **Public** ✓

Depois vá em **Storage → Policies** e adicione uma política de INSERT pública:
```sql
-- Policy name: allow public insert
-- Target roles: anon
-- Operation: INSERT
-- Check: true
```

---

## 3. Rodar localmente

```bash
npm install
npm start
```

---

## 4. Deploy no Vercel

1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project**
3. Importe o repositório
4. Configure:
   - **Framework**: Create React App
   - **Build command**: `npm run build`
   - **Output directory**: `build`
5. Clique em **Deploy** ✓

---

## Funcionalidades

- Cadastrar, editar e excluir registros
- Filtrar por mês, motorista, cliente ou status
- Upload de foto da cautela
- Cards de resumo (total, extraviadas, conferidas)
- Acesso simultâneo por múltiplos usuários
