const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "..", "data", "curso.sqlite");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function criarTabelas() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL DEFAULT 'cliente' CHECK (papel IN ('cliente', 'admin')),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      categoria TEXT NOT NULL,
      estoque INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      quantidade INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function jaTemDados() {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM produtos").get();
  return total > 0;
}

function seed() {
  if (jaTemDados()) return;

  const inserirUsuario = db.prepare(
    "INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)"
  );
  inserirUsuario.run("Administradora do Curso", "admin@curso.dev", bcrypt.hashSync("admin123", 10), "admin");
  inserirUsuario.run("Aluno Exemplo", "aluno@curso.dev", bcrypt.hashSync("aluno123", 10), "cliente");

  const inserirProduto = db.prepare(
    "INSERT INTO produtos (nome, preco, categoria, estoque) VALUES (?, ?, ?, ?)"
  );
  const produtos = [
    ["Teclado mecânico", 250.0, "eletronicos", 15],
    ["Mouse sem fio", 89.9, "eletronicos", 30],
    ["Monitor 24 polegadas", 899.0, "eletronicos", 8],
    ["Fone de ouvido bluetooth", 199.9, "eletronicos", 20],
    ["Camiseta estampada", 59.9, "roupas", 50],
    ["Jaqueta jeans", 189.9, "roupas", 12],
    ["Tênis casual", 249.9, "roupas", 18],
    ["Livro: Clean Code", 79.9, "livros", 25],
    ["Livro: Eloquent JavaScript", 69.9, "livros", 10],
    ["Livro: Design Patterns", 94.9, "livros", 7],
  ];
  const inseridos = produtos.map((p) => inserirProduto.run(...p));

  const inserirPedido = db.prepare(
    "INSERT INTO pedidos (usuario_id, produto_id, quantidade) VALUES (?, ?, ?)"
  );
  inserirPedido.run(2, inseridos[0].lastInsertRowid, 1);
  inserirPedido.run(2, inseridos[3].lastInsertRowid, 2);

  console.log("Banco de dados inicializado com dados de exemplo.");
}

criarTabelas();
seed();

module.exports = db;
