// Tema claro/escuro. Sem escolha salva, a página segue o sistema
// (prefers-color-scheme no index.css); com escolha, data-theme na raiz manda.
export type Tema = 'light' | 'dark'

const CHAVE = 'ec_theme'

export function temaSalvo(): Tema | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function temaDoSistema(): Tema {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function temaAtual(): Tema {
  const t = document.documentElement.dataset.theme
  return t === 'light' || t === 'dark' ? t : temaDoSistema()
}

export function aplicarTema(t: Tema) {
  document.documentElement.dataset.theme = t
}

export function salvarTema(t: Tema) {
  aplicarTema(t)
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    /* armazenamento indisponível: vale só nesta visita */
  }
}

// Chamado uma vez ao abrir a aplicação, antes do primeiro render.
export function iniciarTema() {
  const t = temaSalvo()
  if (t) aplicarTema(t)
}
