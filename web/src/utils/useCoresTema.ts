import { useEffect, useState } from 'react'

// Lê tokens de cor do tema atual (para bibliotecas que pedem a cor pronta,
// como o Recharts) e relê quando o tema muda. Sem valor calculado (testes),
// devolve var(--token), que o navegador ainda resolve.
function ler<T extends string>(tokens: readonly T[]): Record<T, string> {
  const estilo = getComputedStyle(document.documentElement)
  return Object.fromEntries(tokens.map(t => [t, estilo.getPropertyValue(`--${t}`).trim() || `var(--${t})`])) as Record<T, string>
}

export function useCoresTema<T extends string>(tokens: readonly T[]): Record<T, string> {
  const [cores, setCores] = useState(() => ler(tokens))
  const chave = tokens.join(',')
  useEffect(() => {
    const atualizar = () => setCores(ler(tokens))
    const obs = new MutationObserver(atualizar)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener?.('change', atualizar)
    return () => { obs.disconnect(); mq?.removeEventListener?.('change', atualizar) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
  return cores
}
