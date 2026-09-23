import { NOME_COOKIE } from './_auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const resposta = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  resposta.headers.append('Set-Cookie', `${NOME_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return resposta;
}
