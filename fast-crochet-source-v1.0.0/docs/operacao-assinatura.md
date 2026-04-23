# Operacao da Assinatura

## Regra comercial

- Plano unico: `Plano Essencial`
- Valor: `R$ 3,69 por mes`
- Trial anonimo: `7 dias`
- Cadastro: `nao obrigatorio` durante o trial
- Apos o trial: bloqueio total ate `login/cadastro + assinatura`

## Como o backend decide acesso

- `anonymous_trial`: gera sem conta
- `authenticated_trial`: gera com conta enquanto o trial ainda estiver ativo
- `auth_required`: trial expirou e o usuario ainda nao entrou
- `subscription_required`: usuario entrou, mas nao assinou
- `authenticated_subscriber`: assinatura ativa

## Stripe

Quando usar `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`, o servidor:

1. cria uma `Checkout Session`
2. redireciona o usuario para o checkout hospedado
3. escuta o webhook
4. ativa a assinatura no backend

## Como configurar o preco no Stripe

- Produto: `Plano Essencial`
- Preco recorrente: `R$ 3,69`
- Periodicidade: `mensal`
- Trial no Stripe: `nao configurar`

Motivo:

- o app ja fornece `7 dias gratis` antes de exigir cadastro e pagamento
- adicionar trial no Stripe duplicaria o beneficio

## Variaveis necessarias

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

## Modo sem codigo

Se voce nao quiser montar checkout customizado agora:

- defina `PAYMENT_LINK_URL`
- o app redireciona para o link de pagamento

## Modo demonstracao

Para testes locais:

- defina `ALLOW_DEMO_SUBSCRIPTION=1`
- a interface habilita a ativacao manual da assinatura
