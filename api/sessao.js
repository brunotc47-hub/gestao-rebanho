import { validarSessao } from './_auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const resultado = await validarSessao(req);
  return new Response(JSON.stringify(resultado), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
