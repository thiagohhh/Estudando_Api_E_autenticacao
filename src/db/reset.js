// Apaga o arquivo do banco e recria do zero com os dados de exemplo.
// Uso: npm run seed:reset

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "..", "data", "curso.sqlite");

["", "-wal", "-shm"].forEach((suffix) => {
  const file = DB_PATH + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removido: ${file}`);
  }
});

// Reimportar o módulo do banco recria as tabelas e popula os dados novamente
require("./database");

console.log("Banco de dados resetado com sucesso.");
