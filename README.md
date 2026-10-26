# API do Curso — Interação com APIs

API REST em Node.js + Express + SQLite, criada para uso em sala de aula. Expõe produtos, usuários, pedidos e autenticação por token — além de endpoints propositalmente instáveis, lentos e protegidos, usados nos laboratórios de tratamento de falhas e segurança.

## Instalação

```bash
npm install
cp .env.example .env
```

Abra o `.env` e, se quiser, troque o valor de `JWT_SECRET` por qualquer texto (isso não afeta o funcionamento em sala de aula, só é boa prática nunca versionar segredos reais).

## Rodando

```bash
npm run dev     # com reinício automático (nodemon)
npm start       # sem reinício automático
```

O servidor sobe em `http://localhost:3000`.

## Resetando os dados entre turmas/aulas

```bash
npm run seed:reset
```

Apaga o banco SQLite (`data/curso.sqlite`) e recria do zero com os dados de exemplo. Rode isso antes de cada aula que dependa de um estado previsível (ex: antes de qualquer demonstração de CRUD).

## Credenciais de teste

| Papel | Email | Senha |
|---|---|---|
| admin | admin@curso.dev | admin123 |
| cliente | aluno@curso.dev | aluno123 |

O papel `admin` é exigido para `POST`, `PUT`, `PATCH` e `DELETE` em `/produtos`. O papel `cliente` só consegue ler (`GET`).

## Endpoints

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | não | Recebe `{ email, senha }`, retorna `{ token, usuario }` |

### Produtos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/produtos` | não | Lista com paginação e filtro. Query params: `pagina`, `limite`, `categoria`, `busca` |
| GET | `/produtos/:id` | não | Detalhe de um produto. 404 se não existir |
| GET | `/produtos/instavel` | não | ~30% das chamadas retornam 500 de propósito |
| GET | `/produtos/lento` | não | Responde com atraso de 3 a 6 segundos |
| GET | `/produtos/limitado` | não | Limitado a 5 requisições / 30s por IP — depois disso, 429 |
| POST | `/produtos` | admin | Cria produto. Exige `nome`, `preco`, `categoria` |
| PUT | `/produtos/:id` | admin | Substitui o recurso inteiro. Exige todos os campos |
| PATCH | `/produtos/:id` | admin | Atualiza só os campos enviados |
| DELETE | `/produtos/:id` | admin | Remove o produto. Retorna 204 |

### Usuários e pedidos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/usuarios` | não | Cadastra usuário novo (sempre papel `cliente`). 409 se email já existe |
| GET | `/usuarios/:id/pedidos` | sim | Retorna os pedidos do usuário. Só o próprio usuário ou um admin pode ver — outros casos retornam 403 |

## Estrutura do projeto

```
api-curso/
├── src/
│   ├── server.js
│   ├── db/
│   │   ├── database.js   (criação de tabelas + seed)
│   │   └── reset.js       (reset do banco)
│   ├── middleware/
│   │   └── auth.js        (autenticação JWT + verificação de papel)
│   └── routes/
│       ├── auth.js
│       ├── produtos.js
│       └── usuarios.js
├── data/                   (banco SQLite gerado em tempo de execução)
├── .env.example
└── package.json
```
