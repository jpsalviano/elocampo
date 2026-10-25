import { useState } from 'react'
import { Icon } from './Icon'
import { salvarTema, temaAtual, type Tema } from '../utils/theme'

// Alterna entre claro e escuro e guarda a escolha.
export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(() => temaAtual())
  const proximo: Tema = tema === 'dark' ? 'light' : 'dark'
  const rotulo = proximo === 'dark' ? 'Ativar modo escuro' : 'Ativar modo claro'

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={rotulo}
      title={rotulo}
      onClick={() => { salvarTema(proximo); setTema(proximo) }}
    >
      <Icon name={tema === 'dark' ? 'sol' : 'lua'} />
    </button>
  )
}

export function Logo() {
  return <span className="logo">Elo<span className="logo-accent">Campo</span></span>
}
