# Salão Financeiro V3 Offline 

Esta é a **v3.1 de teste** para validar a migração do sistema antes de reescrever em Android nativo.

## O que esta versão faz
- roda **100% offline**
- usa a **UI dentro de um WebView local**
- salva tudo no aparelho com **localStorage**
- permite:
  - login local
  - cadastro de serviços
  - cadastro de colaboradores
  - atendimentos com comissão automática
  - despesas com comprovante
  - produtos
  - dashboard mensal
  - relatório
  - backup JSON
  - exportação CSV
  - nome do salão customizável

## Limites desta versão
- os dados ficam no navegador embutido do app (**localStorage**)
- comprovantes/fotos são salvos em **base64** no armazenamento do app (bom para teste, não para centenas de imagens)
- esta versão serve para **validar fluxo e UX**, não para ser a arquitetura final
- a versão realmente robusta virá com **Kotlin + Room + telas nativas**

## Estrutura
- `android_offline_app/` → projeto Android Studio
- `app/src/main/assets/www/` → UI local (HTML/CSS/JS)
- `MainActivity.kt` → shell Android com WebView e ponte nativa para salvar CSV/JSON

## Como abrir
1. Abra `android_offline_app` no Android Studio
2. Aguarde o sync do Gradle
3. Se o Android Studio pedir para atualizar versões do AGP/Gradle, aceite o ajuste
4. Rode em um aparelho ou emulador Android

## Login padrão
- usuário: `admin`
- senha: `admin123`

## Como testar o fluxo
1. faça login
2. vá em **Configurações** e troque o nome do salão
3. cadastre 1 serviço e 1 colaborador
4. lance atendimentos
5. lance despesas e produtos
6. veja o Dashboard e Relatório
7. exporte CSV
8. faça backup JSON
9. importe o backup para validar restauração

## Observações
- O botão **Exportar CSV** usa a ponte nativa `AndroidApp.saveTextFile(...)` quando o app estiver no Android.
- Fora do Android (por exemplo, abrindo o HTML no navegador do PC), ele cai para download via navegador.
- O menu foi desenhado para uso em celular, com hambúrguer, overlay e cards no mobile.
