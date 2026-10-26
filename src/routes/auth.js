const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /auth/login
// Body: { "email": "...", "senha": "..." }
router.post("/login", (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({
      erro: "Campos obrigatórios ausentes",
      mensagem: "Informe email e senha no corpo da requisição.",
    });
  }

  const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);

  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({
      erro: "Credenciais inválidas",
      mensagem: "Email ou senha incorretos.",
    });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.status(200).json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  });
});

module.exports = router;
