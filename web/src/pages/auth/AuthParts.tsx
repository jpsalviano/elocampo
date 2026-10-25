import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Logo, ThemeToggle } from '../../components/ThemeToggle'
import type { AccountRole } from '../../types'

const FEATURES = [
  'Publique produtos e receba pedidos de compradores verificados',
  'Negocie diretamente com chat integrado entre produtor e comprador',
  'Gerencie seu catálogo e acompanhe o status de cada venda',
  'Contratos e pagamentos com segurança e rastreabilidade',
  'Sistema de avaliações para construir reputação na plataforma',
]

// Moldura das telas de entrada: barra com logo e tema, duas colunas no
// computador e uma só no celular.
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <header className="auth-top">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="auth-grid">{children}</main>
    </div>
  )
}

export function Apresentacao() {
  return (
    <>
      <div>
        <div className="logo logo-lg" aria-hidden="true">Elo<span className="logo-accent">Campo</span></div>
        <p className="auth-tagline">Marketplace agrícola brasileiro</p>
      </div>
      <ul className="features">
        {FEATURES.map(text => (
          <li key={text}><Icon name="check" size={16} />{text}</li>
        ))}
      </ul>
    </>
  )
}

const PERFIS: { v: AccountRole; label: string; sub: string }[] = [
  { v: 'VENDOR', label: 'Produtor rural', sub: 'Vendo minha produção' },
  { v: 'BUYER', label: 'Empresa compradora', sub: 'Busco e adquiro produtos' },
]

export function SeletorPerfil({ role, onChange, name }: { role: AccountRole; onChange: (r: AccountRole) => void; name: string }) {
  return (
    <fieldset>
      <legend>Você é</legend>
      <div className="choice-group">
        {PERFIS.map(opt => (
          <label key={opt.v} className="choice">
            <input type="radio" name={name} value={opt.v} checked={role === opt.v} onChange={() => onChange(opt.v)} />
            <span>
              <span className="choice-title">{opt.label}</span>
              <span className="choice-sub">{opt.sub}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function CheckTermos({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>Li e concordo com os Termos de Uso e a Política de Privacidade</span>
    </label>
  )
}
