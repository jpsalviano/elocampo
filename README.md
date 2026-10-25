# EloCampo

<div align="center">

<img src="docs/img/icon.png" width="220" alt="Logo EloCampo" />

Marketplace agrícola brasileiro

</div>

O **EloCampo** é uma plataforma que liga produtores rurais (agricultura familiar e hortas urbanas e comunitárias) a quem quer comprar e consumir a produção, sem atravessadores.

`Graduação em Análise e Desenvolvimento de Sistemas`
`Pontifícia Universidade Católica de Minas Gerais (PUC Minas)`
`Projeto: Desenvolvimento de uma Aplicação Distribuída (2026/1)`

## Acesso

- **Web:** [jpsalviano.com.br/elocampo](https://jpsalviano.com.br/elocampo/)

É uma demonstração: a tela de login mostra contas de exemplo (produtor, comprador e admin) com a senha, o cadastro é aberto, e tudo volta ao estado inicial todo dia às 4h (horário de Brasília). O envio de e-mails está desligado, e com ele a recuperação de senha. Por enquanto só a web está publicada; o código do aplicativo está em `mobile/`.

## Como funciona

1. O **produtor** cadastra os produtos (com fotos, preço, quantidade e data de disponibilidade).
2. O **comprador** busca por descrição, categoria e região e faz o pedido.
3. O produtor aceita, conclui ou cancela o pedido; enquanto está pendente, o comprador também pode cancelar.
4. Concluído o pedido, os dois lados avaliam: o comprador avalia o produto, e cada um avalia a conta do outro.
5. O **admin** acompanha usuários, contas, produtos e pedidos em relatórios e gráficos.

## Estrutura

| Pasta | O quê | Stack |
|---|---|---|
| `api/` | API REST, em `/api/v1/elocampo` | Java 25, Spring Boot 4 (Web, Security, Data MongoDB, Validation), JWT, Gradle |
| `web/` | Aplicação web, em `/elocampo/` | React 18, TypeScript, Vite, React Router, Recharts |
| `mobile/` | Aplicativo (não publicado por enquanto) | React Native, Expo |
| `docs/` | Documentação acadêmica | |

### Arquitetura

Na entrega da disciplina, o backend eram oito microsserviços Spring Boot (autenticação, contas, produtos, pedidos, arquivos, chat, e-mail e um gateway), com Kafka e Redis previstos. Para publicar num servidor pequeno, eles viraram **uma API modular**: um pacote por domínio (`auth`, `account`, `product`, `order`, `file`, `chat`), cada um com controller, service, repositório e DTOs, e os domínios conversam só pelos services uns dos outros, como antes conversavam por HTTP. As responsabilidades continuam em contêineres separados:

```
navegador ─▶ nginx do site ─┬─ /elocampo/*         ─▶ elocampo-web   (nginx com o build do React)
                            └─ /api/v1/elocampo/*  ─▶ elocampo-api   (Spring Boot) ─▶ elocampo-mongo (MongoDB)
                                                                     └─▶ volume com as imagens enviadas
```

O CI (`.github/workflows/ci.yml`) roda os testes da API contra um MongoDB de verdade e os testes da web, e publica `ghcr.io/jpsalviano/elocampo-api:<commit>` e `ghcr.io/jpsalviano/elocampo-web:<commit>`.

### Segurança

- **Login:** senhas com bcrypt e token JWT (HS256) de 12 horas. A cada requisição o usuário é lido do banco, então desativar uma conta corta o acesso na hora. No máximo 10 tentativas erradas de login por endereço a cada 15 minutos.
- **Admin:** o cadastro público não cria admin; as rotas de administração exigem admin.
- **Posse:** só o dono (ou um admin) altera a própria conta, os próprios produtos e as fotos deles. Pedidos são vistos só pelo comprador, pelo vendedor e por admins.
- **Dados pessoais:** os de outra pessoa aparecem só como perfil público (nome, cidade, estado e avaliações), sem CPF, CNPJ, telefone, endereço ou nascimento.
- **Pedidos:** a descrição, o preço e o vendedor vêm do banco, nunca do navegador, e a quantidade não passa do estoque.
- **Avaliações:** só depois de um pedido concluído, uma por produto.
- **Imagens:** o tipo é conferido pelos primeiros bytes (só JPEG e PNG), até 2 MB e 5 por item. São servidas com `nosniff` e CSP com sandbox.
- **Busca:** o texto buscado é comparado literalmente, nunca roda como expressão regular.
- **Erros:** saem como `{status, message}`, sem stack trace.
- **Web:** servida com Content-Security-Policy.

Os testes de integração em `api/src/test/java/com/elocampo/it` cobrem cada uma dessas regras.

## Execução local

Com Docker, Java 25 e Node 22:

```bash
# Banco
docker run -d --name elocampo-mongo -p 27017:27017 mongo:8.0

# API em http://localhost:8080/api/v1/elocampo
cd api
ELOCAMPO_JWT_SECRET=uma-chave-com-pelo-menos-32-bytes!! \
ELOCAMPO_FILES_ROOT=/tmp/elocampo-files \
ELOCAMPO_DEMO_PASSWORD=demo1234 \
./gradlew bootRun

# Testes da API (usam o MongoDB acima, num banco à parte)
./gradlew test

# Web em http://localhost:5173/elocampo/ (encaminha /api/v1/elocampo para a API)
cd web && npm ci && npm run dev
npx vitest run
```

Configuração da API (variáveis de ambiente):

| Variável | Para quê |
|---|---|
| `ELOCAMPO_MONGODB_URI` | Banco (padrão `mongodb://127.0.0.1:27017/elocampo`) |
| `ELOCAMPO_JWT_SECRET` | Chave de assinatura dos tokens, com pelo menos 32 bytes (obrigatória) |
| `ELOCAMPO_FILES_ROOT` | Pasta das imagens enviadas (padrão `/data/files` na imagem) |
| `ELOCAMPO_DEMO_PASSWORD` | Liga a demonstração com essa senha |

## Integrantes

* Bruno Figueiredo
* Diovane Marcelino Azevedo
* Felipe Miguel Nery Lunkes
* João Paulo Fernandes Salviano
* Levi Alves
* Lucas Hermógenes do Nascimento

Orientador: Leonardo Vilela Cardoso

## Documentação

1. [Documentação de contexto](docs/01-Documentação%20de%20Contexto.md)
2. [Especificação do projeto](docs/02-Especificação%20do%20Projeto.md)
3. [Metodologia](docs/03-Metodologia.md)
4. [Projeto de interface](docs/04-Projeto%20de%20Interface.md)
5. [Arquitetura da solução](docs/05-Arquitetura%20da%20Solução.md)
6. [Template padrão da aplicação](docs/06-Template%20Padrão%20da%20Aplicação.md)
7. [Programação de funcionalidades](docs/07-Programação%20de%20Funcionalidades.md)
8. [Registro de testes unitários](docs/08-Registro%20de%20Testes%20Unitários.md)
9. [Registro de testes de integração](docs/09-Registro%20de%20Testes%20de%20Integração.md)
10. [Registro de testes de sistema](docs/10-Registro%20de%20Testes%20de%20Sistema.md)
11. [Registro de contribuição](docs/11-Registro%20de%20Contribuição.md)
12. [Apresentação do projeto](docs/12-Apresentação%20do%20Projeto.md)
13. [Referências](docs/13-Referências.md)

A documentação descreve o projeto como entregue na disciplina, com a arquitetura de microsserviços.

## Vídeos

- [Apresentação do projeto (pitch)](https://github.com/user-attachments/assets/f34429f7-6844-4dc6-a31d-4dbf75a378f1)
- [Etapa 1](https://github.com/user-attachments/assets/12f3167b-eb4a-4c62-9c34-af95003bce42)
- [Etapa 2](https://github.com/user-attachments/assets/5b078691-a781-4cf7-a4b8-b8c47527b393)
- [Etapa 3](https://github.com/user-attachments/assets/c27a9da1-3d15-411b-ba61-5ce4c2acc051)
- [Etapa 4](https://github.com/user-attachments/assets/250fdc3e-8d87-46df-a0c2-834df65c9da4)

## Licença

[LICENSE](LICENSE)
