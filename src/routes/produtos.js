const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../db/database");
const { autenticar, exigirPapel } = require("../middleware/auth");

const router = express.Router();

// ------------------------------------------------------------------
// GET /produtos  — listagem com filtro, busca e paginação
// Query params: categoria, busca, pagina (default 1), limite (default 10)
// ------------------------------------------------------------------
router.get("/", (req, res) => {
  const { categoria, busca } = req.query;
  const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
  const limite = Math.min(Math.max(parseInt(req.query.limite) || 10, 1), 50);
  const offset = (pagina - 1) * limite;

  const condicoes = [];
  const parametros = [];

  if (categoria) {
    condicoes.push("categoria = ?");
    parametros.push(categoria);
  }
  if (busca) {
    condicoes.push("nome LIKE ?");
    parametros.push(`%${busca}%`);
  }

  const whereSql = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

  const totalItens = db
    .prepare(`SELECT COUNT(*) AS total FROM produtos ${whereSql}`)
    .get(...parametros).total;

  const dados = db
    .prepare(`SELECT * FROM produtos ${whereSql} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...parametros, limite, offset);

  res.status(200).json({
    dados,
    paginacao: {
      pagina,
      limite,
      totalItens,
      totalPaginas: Math.ceil(totalItens / limite) || 1,
    },
  });
});

// ------------------------------------------------------------------
// GET /produtos/instavel — ~30% das chamadas retornam 500 de propósito.
// Uso pedagógico: praticar tratamento de erro de servidor.
// ------------------------------------------------------------------
router.get("/instavel", (req, res) => {
  const falhou = Math.random() < 0.3;
  if (falhou) {
    return res.status(500).json({
      erro: "Falha interna simulada",
      mensagem: "Este endpoint falha propositalmente ~30% das vezes para fins didáticos.",
    });
  }
  const produto = db.prepare("SELECT * FROM produtos ORDER BY RANDOM() LIMIT 1").get();
  res.status(200).json(produto);
});

// ------------------------------------------------------------------
// GET /produtos/lento — responde com atraso de 3 a 6 segundos.
// Uso pedagógico: praticar loading state, timeout e AbortController.
// Cancela o processamento se o cliente desconectar antes da resposta.
// ------------------------------------------------------------------
router.get("/lento", (req, res) => {
  const atrasoMs = 3000 + Math.floor(Math.random() * 3000);

  const timer = setTimeout(() => {
    const produtos = db.prepare("SELECT * FROM produtos ORDER BY RANDOM() LIMIT 5").all();
    res.status(200).json({ atrasoMs, dados: produtos });
  }, atrasoMs);

  req.on("close", () => {
    clearTimeout(timer);
  });
});

// ------------------------------------------------------------------
// GET /produtos/limitado — limitado a 5 requisições por 30s por IP.
// Uso pedagógico: praticar tratamento de 429 Too Many Requests.
// ------------------------------------------------------------------
const limitador = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: "Muitas requisições",
    mensagem: "Limite de 5 requisições a cada 30 segundos. Aguarde e tente novamente.",
  },
});
router.get("/limitado", limitador, (req, res) => {
  res.status(200).json({ mensagem: "Requisição aceita dentro do limite." });
});

// ------------------------------------------------------------------
// GET /produtos/:id
// ------------------------------------------------------------------
router.get("/:id", (req, res) => {
  const produto = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  if (!produto) {
    return res.status(404).json({
      erro: "Produto não encontrado",
      mensagem: `Não existe produto com id ${req.params.id}.`,
    });
  }
  res.status(200).json(produto);
});

// ------------------------------------------------------------------
// POST /produtos — requer autenticação + papel admin
// ------------------------------------------------------------------
router.post("/", autenticar, exigirPapel("admin"), (req, res) => {
  const { nome, preco, categoria, estoque } = req.body || {};

  if (!nome || preco === undefined || !categoria) {
    return res.status(400).json({
      erro: "Campos obrigatórios ausentes",
      mensagem: "Informe ao menos: nome, preco e categoria.",
    });
  }

  const resultado = db
    .prepare("INSERT INTO produtos (nome, preco, categoria, estoque) VALUES (?, ?, ?, ?)")
    .run(nome, preco, categoria, estoque ?? 0);

  const criado = db.prepare("SELECT * FROM produtos WHERE id = ?").get(resultado.lastInsertRowid);
  res.status(201).json(criado);
});

// ------------------------------------------------------------------
// PUT /produtos/:id — substitui o recurso inteiro. Requer admin.
// ------------------------------------------------------------------
router.put("/:id", autenticar, exigirPapel("admin"), (req, res) => {
  const existente = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  if (!existente) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  const { nome, preco, categoria, estoque } = req.body || {};
  if (!nome || preco === undefined || !categoria || estoque === undefined) {
    return res.status(400).json({
      erro: "Campos obrigatórios ausentes",
      mensagem: "PUT exige o recurso completo: nome, preco, categoria e estoque.",
    });
  }

  db.prepare("UPDATE produtos SET nome = ?, preco = ?, categoria = ?, estoque = ? WHERE id = ?").run(
    nome, preco, categoria, estoque, req.params.id
  );

  const atualizado = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  res.status(200).json(atualizado);
});

// ------------------------------------------------------------------
// PATCH /produtos/:id — atualiza só os campos enviados. Requer admin.
// ------------------------------------------------------------------
router.patch("/:id", autenticar, exigirPapel("admin"), (req, res) => {
  const existente = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  if (!existente) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  const campos = ["nome", "preco", "categoria", "estoque"];
  const atualizacoes = {};
  campos.forEach((campo) => {
    if (req.body && req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo];
  });

  if (Object.keys(atualizacoes).length === 0) {
    return res.status(400).json({
      erro: "Nenhum campo para atualizar",
      mensagem: "Envie ao menos um dos campos: nome, preco, categoria, estoque.",
    });
  }

  const merged = { ...existente, ...atualizacoes };
  db.prepare("UPDATE produtos SET nome = ?, preco = ?, categoria = ?, estoque = ? WHERE id = ?").run(
    merged.nome, merged.preco, merged.categoria, merged.estoque, req.params.id
  );

  const atualizado = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  res.status(200).json(atualizado);
});

// ------------------------------------------------------------------
// DELETE /produtos/:id — requer admin.
// ------------------------------------------------------------------
router.delete("/:id", autenticar, exigirPapel("admin"), (req, res) => {
  const existente = db.prepare("SELECT * FROM produtos WHERE id = ?").get(req.params.id);
  if (!existente) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }
  db.prepare("DELETE FROM produtos WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

module.exports = router;
