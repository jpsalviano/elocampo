import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Icon, type IconName } from '../Icon'
import { Logo, ThemeToggle } from '../ThemeToggle'

type Aba = { to: string; icon: IconName; label: string }

export const ABAS_PRODUTOR: Aba[] = [
  { to: '/produtor/dashboard', icon: 'inicio', label: 'Início' },
  { to: '/produtor/produtos', icon: 'produtos', label: 'Produtos' },
  { to: '/produtor/vendas', icon: 'vendas', label: 'Vendas' },
  { to: '/produtor/mensagens', icon: 'mensagens', label: 'Mensagens' },
  { to: '/produtor/perfil', icon: 'perfil', label: 'Perfil' },
]

export const ABAS_COMPRADOR: Aba[] = [
  { to: '/comprador/dashboard', icon: 'inicio', label: 'Início' },
  { to: '/comprador/produtos', icon: 'catalogo', label: 'Catálogo' },
  { to: '/comprador/pedidos', icon: 'pedidos', label: 'Pedidos' },
  { to: '/comprador/mensagens', icon: 'mensagens', label: 'Mensagens' },
  { to: '/comprador/perfil', icon: 'perfil', label: 'Perfil' },
]

// Cabeçalho com logo, abas, usuário, tema e Sair. No celular as abas descem
// para uma barra fixa no rodapé (index.css).
export function AppShell({ nav, badge, children }: { nav: ReactNode; badge?: string; children: ReactNode }) {
  const { session, logout } = useAuth()
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-brand">
            <Logo />
            {badge && <span className="badge">{badge}</span>}
          </span>
          {nav}
          <div className="header-end">
            <span className="header-user">{session?.account?.name || session?.email}</span>
            <ThemeToggle />
            <button type="button" className="btn btn-ghost btn-sm btn-sair" onClick={logout}>
              <Icon name="sair" size={16} />
              <span className="btn-sair-label">Sair</span>
            </button>
          </div>
        </div>
      </header>
      <main className="app-main" id="conteudo" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}

function AbasNav({ abas }: { abas: Aba[] }) {
  return (
    <nav className="tabs" aria-label="Seções">
      {abas.map(a => (
        <NavLink key={a.to} to={a.to} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          <Icon name={a.icon} />
          <span className="tab-label">{a.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout({ abas, children }: { abas: Aba[]; children?: ReactNode }) {
  return <AppShell nav={<AbasNav abas={abas} />}>{children ?? <Outlet />}</AppShell>
}

export function ProdutorLayout() { return <AppLayout abas={ABAS_PRODUTOR} /> }
export function CompradorLayout() { return <AppLayout abas={ABAS_COMPRADOR} /> }
