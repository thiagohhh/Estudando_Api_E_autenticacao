const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db/database");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

// ------------------------------------------------------------------
// POST /usuarios — cadastro de novo usuário (papel sempre "cliente")
// ------------------------------------------------------------------
router.post("/", (req, res) => {
  const { nome, email, senha } = req.body || {};

  if (!nome || !email || !senha) {
    return res.status(400).json({
      erro: "Campos obrigatórios ausentes",
      mensagem: "Informe nome, email e senha.",
    });
  }

  const existente = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email);
  if (existente) {
    return res.status(409).json({
      erro: "Email já cadastrado",
      mensagem: "Já existe um usuário com este email.",
    });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  const resultado = db
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, 'cliente')")
    .run(nome, email, senhaHash);

  res.status(201).json({ id: resultado.lastInsertRowid, nome, email, papel: "cliente" });
});

// ------------------------------------------------------------------
// GET /usuarios/:id/pedidos — requer autenticação.
// O próprio usuário pode ver os seus; admin pode ver os de qualquer um.
// Tentar ver pedido de outro usuário sem ser admin -> 403 Forbidden.
// ------------------------------------------------------------------
router.get("/:id/pedidos", autenticar, (req, res) => {
  const idSolicitado = Number(req.params.id);

  const podeVer = req.usuario.papel === "admin" || req.usuario.id === idSolicitado;
  if (!podeVer) {
    return res.status(403).json({
      erro: "Acesso negado",
      mensagem: "Você só pode ver os próprios pedidos.",
    });
  }

  const usuario = db.prepare("SELECT id FROM usuarios WHERE id = ?").get(idSolicitado);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const pedidos = db
    .prepare(
      `SELECT pedidos.id, pedidos.quantidade, pedidos.criado_em,
              produtos.id AS produto_id, produtos.nome AS produto_nome, produtos.preco AS produto_preco
       FROM pedidos
       JOIN produtos ON produtos.id = pedidos.produto_id
       WHERE pedidos.usuario_id = ?
       ORDER BY pedidos.id`
    )
    .all(idSolicitado);

  res.status(200).json({ usuarioId: idSolicitado, pedidos });
});

module.exports = router;
