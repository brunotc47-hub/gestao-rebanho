import { NOME_COOKIE, CHAVE_BLOB, sha256Hex, hmacHex, gerarToken } from './_auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, erro: 'Método não permitido' }), { status: 405 });
  }

  let corpo;
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'Requisição inválida' }), { status: 400 });
  }

  const usuario = (corpo.usuario || '').trim().toLowerCase();
  const senha = corpo.senha || '';

  const usuarioEsperado = (process.env.AUTH_USUARIO || '').trim().toLowerCase();
  const pepper = process.env.AUTH_PEPPER || '';
  const hashEsperado = process.env.AUTH_SENHA_HASH || '';
  const cookieSecret = process.env.AUTH_COOKIE_SECRET || '';

  if (!usuario || !senha || !usuarioEsperado || !hashEsperado || !pepper || !cookieSecret) {
    return new Response(JSON.stringify({ ok: false, erro: 'Usuário ou senha incorretos.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const hashCalculado = await sha256Hex(`${pepper}:${senha}`);

  if (usuario !== usuarioEsperado || hashCalculado !== hashEsperado) {
    return new Response(JSON.stringify({ ok: false, erro: 'Usuário ou senha incorretos.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = gerarToken();

  try {
    const { put } = await import('@vercel/blob');
    await put(CHAVE_BLOB, JSON.stringify({ token, criadoEm: new Date().toISOString() }), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 0,
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'Não foi possível iniciar a sessão. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const assinatura = await hmacHex(cookieSecret, token);
  const valorCookie = `${token}.${assinatura}`;

  const resposta = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  resposta.headers.append(
    'Set-Cookie',
    `${NOME_COOKIE}=${encodeURIComponent(valorCookie)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
  return resposta;
}
