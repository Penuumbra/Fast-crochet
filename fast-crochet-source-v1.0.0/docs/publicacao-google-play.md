# Publicacao no Google Play

## Estado atual deste projeto

O shell Android atual foi preparado para distribuicao por `APK fora da loja`, carregando a versao web hospedada e usando checkout externo.

## O que impede publicar este fluxo no Play do jeito atual

O aplicativo vende acesso digital recorrente dentro da experiencia do app. Para esse caso, a publicacao no Google Play exige integracao com `Google Play Billing`.

Isso significa que o checkout externo com `Stripe` dentro do app Android nao deve ser tratado como fluxo final para Play neste MVP.

## O que precisa mudar para Play

1. Substituir a assinatura do shell Android por `Google Play Billing`.
2. Criar o produto de assinatura no `Play Console`.
3. Validar tokens de compra no backend.
4. Processar eventos de ciclo de vida da assinatura.
5. Gerar `AAB` assinado com a chave definitiva.

## Requisitos de conta

- conta de desenvolvedor no Google Play Console
- pagamento da taxa unica de registro
- perfil de pagamentos vinculado
- verificacoes de identidade

## Metadados e arquivos necessarios

- nome do app
- descricao curta
- descricao completa
- icone de alta resolucao
- screenshots de celular
- e-mail de suporte
- URL da politica de privacidade
- classificacao de conteudo
- paises e distribuicao
- `AAB` assinado

## Requisito tecnico de billing

Para a versao Play, a arquitetura correta fica assim:

1. Android app usa `Play Billing Library`
2. Play retorna `purchase token`
3. Backend valida a compra
4. Backend atualiza entitlement do usuario
5. Backend acompanha renovacoes, cancelamentos e expiracoes

## Recomendacao pratica

- `agora`: publicar gratuitamente por `GitHub Releases`
- `depois`: abrir um branch especifico `play-store` e migrar a assinatura Android para `Google Play Billing`

