const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Exige um token válido no header Authorization: Bearer <token>.
 * Sem token ou token inválido -> 401 Unauthorized.
 */
function autenticar(req, res, next) {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Não autenticado",
      mensagem: "Envie o header Authorization no formato: Bearer <token>",
    });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id, nome, papel }
    next();
  } catch (err) {
    return res.status(401).json({
      erro: "Token inválido ou expirado",
      mensagem: "Faça login novamente em POST /auth/login",
    });
  }
}

/**
 * Exige que o usuário autenticado tenha um dos papéis permitidos.
 * Autenticado mas sem permissão -> 403 Forbidden (diferente de 401).
 */
function exigirPapel(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: "Não autenticado" });
    }
    if (!papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).json({
        erro: "Acesso negado",
        mensagem: `Esta ação exige o papel: ${papeisPermitidos.join(" ou ")}`,
      });
    }
    next();
  };
}

module.exports = { autenticar, exigirPapel };
