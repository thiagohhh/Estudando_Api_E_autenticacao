require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const produtosRoutes = require("./routes/produtos");
const usuariosRoutes = require("./routes/usuarios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    mensagem: "API do curso — Interação com APIs",
    documentacao: "Veja o README.md do projeto para a lista completa de endpoints.",
  });
});

app.use("/auth", authRoutes);
app.use("/produtos", produtosRoutes);
app.use("/usuarios", usuariosRoutes);

// 404 para qualquer rota não mapeada
app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada",
    mensagem: `Não existe ${req.method} ${req.originalUrl} nesta API.`,
  });
});

// Handler de erro genérico (rede de segurança)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno inesperado" });
});

app.listen(PORT, () => {
  console.log(`API do curso rodando em http://localhost:${PORT}`);
});
