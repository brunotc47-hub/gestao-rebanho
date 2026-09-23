import { NOME_COOKIE, CHAVE_BLOB, sha256Hex, hmacHex, gerarToken } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'Método não permitido' });
    return;
  }

  const corpo = req.body || {};
  const usuario = (corpo.usuario || '').trim().toLowerCase();
  const senha = corpo.senha || '';

  const usuarioEsperado = (process.env.AUTH_USUARIO || '').trim().toLowerCase();
  const pepper = process.env.AUTH_PEPPER || '';
  const hashEsperado = process.env.AUTH_SENHA_HASH || '';
  const cookieSecret = process.env.AUTH_COOKIE_SECRET || '';

  if (!usuario || !senha || !usuarioEsperado || !hashEsperado || !pepper || !cookieSecret) {
    res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos.' });
    return;
  }

  const hashCalculado = sha256Hex(`${pepper}:${senha}`);

  if (usuario !== usuarioEsperado || hashCalculado !== hashEsperado) {
    res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos.' });
    return;
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
  } catch (erro) {
    res.status(500).json({ ok: false, erro: 'Não foi possível iniciar a sessão. Tente novamente.' });
    return;
  }

  const assinatura = hmacHex(cookieSecret, token);
  const valorCookie = `${token}.${assinatura}`;

  res.setHeader(
    'Set-Cookie',
    `${NOME_COOKIE}=${encodeURIComponent(valorCookie)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
  res.status(200).json({ ok: true });
}
