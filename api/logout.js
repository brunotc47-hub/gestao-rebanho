import { NOME_COOKIE } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', `${NOME_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  res.status(200).json({ ok: true });
}
