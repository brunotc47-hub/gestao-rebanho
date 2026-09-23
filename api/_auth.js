// Funções auxiliares de autenticação, compartilhadas pelas rotas de login/sessão/logout.
// Arquivos começando com "_" não viram rotas públicas na Vercel.
import crypto from 'node:crypto';

export const NOME_COOKIE = 'rebanho_sessao';
export const CHAVE_BLOB = 'sessao-ativa.json';

export function sha256Hex(texto) {
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex');
}

export function hmacHex(chaveTexto, mensagem) {
  return crypto.createHmac('sha256', chaveTexto).update(mensagem, 'utf8').digest('hex');
}

export function gerarToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function lerCookie(req, nome) {
  const cabecalho = req.headers.cookie || '';
  const partes = cabecalho.split(';').map((p) => p.trim());
  for (const parte of partes) {
    const idx = parte.indexOf('=');
    if (idx === -1) continue;
    const chave = parte.slice(0, idx);
    if (chave === nome) return decodeURIComponent(parte.slice(idx + 1));
  }
  return null;
}

// Confere se o cookie é válido (assinatura bate) e se o token nele é o mesmo
// que está marcado como "sessão ativa" no momento (ou seja: se ninguém logou
// depois e tomou o lugar dessa sessão).
export async function validarSessao(req) {
  const valorCookie = lerCookie(req, NOME_COOKIE);
  if (!valorCookie) return { autenticado: false };

  const [token, assinatura] = valorCookie.split('.');
  if (!token || !assinatura) return { autenticado: false };

  const assinaturaEsperada = hmacHex(process.env.AUTH_COOKIE_SECRET || '', token);
  if (assinatura !== assinaturaEsperada) return { autenticado: false };

  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: CHAVE_BLOB, token: process.env.BLOB_READ_WRITE_TOKEN, limit: 1 });
    if (!blobs.length) return { autenticado: false };
    const resposta = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!resposta.ok) return { autenticado: false };
    const sessaoAtiva = await resposta.json();
    if (sessaoAtiva.token !== token) return { autenticado: false, motivo: 'sessao_substituida' };
    return { autenticado: true };
  } catch {
    return { autenticado: false };
  }
}
