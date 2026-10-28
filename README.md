# Feito no Seridó

## Executar localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask --app app run --debug
```

Abra `http://127.0.0.1:5000/`. A página inicial e todas as páginas HTML possuem rotas Flask; os links `data-path` existentes são associados às telas correspondentes.

## Configurar Supabase Auth

1. Crie um projeto no Supabase e copie a URL do projeto e a chave pública `publishable` (ou a chave legada `anon`). Preencha essas variáveis em `.env`:

	```env
	SUPABASE_URL=https://seu-projeto.supabase.co
	SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
	```

2. Execute [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor do projeto. O script cria `profiles`, `products` e `product_reviews`, associa perfis aos usuários e ativa políticas RLS.
3. Em **Authentication > URL Configuration**, configure `http://127.0.0.1:5000` como Site URL e `http://127.0.0.1:5000/cadastrar_login` como URL de redirecionamento permitida. Em produção, troque pelos domínios reais.
4. Para login Google, habilite o provedor Google em **Authentication > Sign In / Providers** e configure as credenciais OAuth exigidas pelo Supabase.

O cadastro usa e-mail e senha; os dados de perfil e o papel `buyer`/`artisan` são gravados pelo trigger do banco. O login por código usa telefone/SMS e depende de habilitar Phone Auth, configurar um provedor SMS e ter o telefone cadastrado e confirmado em Auth no Supabase. O telefone informado no perfil, por si só, não habilita esse método. A chave `service_role` não deve ser usada no navegador nem neste app.

## Estado dos fluxos comerciais

- Carrinho e favoritos são persistidos no navegador e os contadores refletem quantidades/listas reais desse navegador; ainda não são sincronizados entre dispositivos.
- Com Supabase configurado, produtos publicados por contas `artisan` e avaliações de usuários autenticados são gravados nas tabelas com RLS. Sem configuração, cadastros e avaliações ficam locais e mostram aviso.
- Respostas a mensagens e rascunhos também são locais; ainda não há tabela de pedidos/mensagens para compartilhá-los.
- O checkout e a página de confirmação permanecem bloqueados sem uma cobrança aprovada pelo Mercado Pago. Os campos de cartão e a chave Pix demonstrativa foram desativados.
- Frete Correios não mostra tarifas estimadas. Para ativá-lo faltam CEP de origem por vendedor, embalagem final por produto e configuração server-side da API contratada.
- Indicadores de lucro, pedidos, mensagens e repasses das telas do painel continuam dados demonstrativos; o projeto ainda não tem fluxo de pedidos, webhooks de pagamento nem ledger de repasses.