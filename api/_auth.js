// Funções auxiliares de autenticação, compartilhadas pelas rotas de login/sessão/logout.
// Arquivos começando com "_" não viram rotas públicas na Vercel.

export const NOME_COOKIE = 'rebanho_sessao';
export const CHAVE_BLOB = 'sessao-ativa.json';

export async function sha256Hex(texto) {
  const dados = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacHex(chaveTexto, mensagem) {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(chaveTexto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(mensagem));
  return Array.from(new Uint8Array(assinatura)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function gerarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function lerCookie(req, nome) {
  const cabecalho = req.headers.get('cookie') || '';
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

  const assinaturaEsperada = await hmacHex(process.env.AUTH_COOKIE_SECRET || '', token);
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
