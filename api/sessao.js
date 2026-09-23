import { validarSessao } from './_auth.js';

export default async function handler(req, res) {
  const resultado = await validarSessao(req);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(resultado);
}
