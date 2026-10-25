import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProdutorLayout, CompradorLayout, AppShell } from './AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthSession, AccountResponse } from '../../types'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockLogout = vi.fn()

const SESSION_WITH_ACCOUNT: AuthSession = {
  token: 'tok',
  userId: 'u1',
  email: 'joao@fazenda.com.br',
  isAdmin: false,
  account: { id: 'acc-1', name: 'João Silva' } as AccountResponse,
}

function setupAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    session: SESSION_WITH_ACCOUNT,
    setSession: vi.fn(),
    logout: mockLogout,
    loading: false,
    ...overrides,
  })
}

function renderEm(path: string, layout: JSX.Element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={layout}>
          <Route path="*" element={<p>conteúdo da página</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const renderProdutor = (path = '/produtor/dashboard') => renderEm(path, <ProdutorLayout />)
const renderComprador = (path = '/comprador/dashboard') => renderEm(path, <CompradorLayout />)

beforeEach(() => {
  mockLogout.mockClear()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  setupAuth()
})

describe('Layout do produtor', () => {
  it('deve exibir a logo EloCampo', () => {
    renderProdutor()
    expect(screen.getByText('Elo')).toBeInTheDocument()
    expect(screen.getByText('Campo')).toBeInTheDocument()
  })

  it('deve renderizar a página dentro do layout', () => {
    renderProdutor()
    expect(screen.getByRole('main')).toHaveTextContent('conteúdo da página')
  })

  it('deve renderizar as 5 abas do produtor com as rotas corretas', () => {
    renderProdutor()
    const nav = screen.getByRole('navigation', { name: 'Seções' })
    const links = within(nav).getAllByRole('link')
    expect(links.map(l => l.textContent)).toEqual(['Início', 'Produtos', 'Vendas', 'Mensagens', 'Perfil'])
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      '/produtor/dashboard', '/produtor/produtos', '/produtor/vendas', '/produtor/mensagens', '/produtor/perfil',
    ])
  })

  it('deve marcar a aba ativa', () => {
    renderProdutor('/produtor/vendas')
    expect(screen.getByRole('link', { name: 'Vendas' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Vendas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveClass('active')
  })

  it('deve exibir o nome da conta quando disponível', () => {
    renderProdutor()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('deve exibir o email quando a conta não tem name', () => {
    setupAuth({
      session: { token: 'tok', userId: 'u1', email: 'joao@fazenda.com.br', isAdmin: false },
    })
    renderProdutor()
    expect(screen.getByText('joao@fazenda.com.br')).toBeInTheDocument()
  })

  it('deve chamar logout ao clicar em Sair', () => {
    renderProdutor()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('não deve usar emojis como ícones', () => {
    const { container } = renderProdutor()
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
    container.querySelectorAll('svg').forEach(svg => expect(svg).toHaveAttribute('aria-hidden', 'true'))
  })
})

describe('Layout do comprador', () => {
  it('deve renderizar as 5 abas do comprador com as rotas corretas', () => {
    renderComprador()
    const links = within(screen.getByRole('navigation', { name: 'Seções' })).getAllByRole('link')
    expect(links.map(l => l.textContent)).toEqual(['Início', 'Catálogo', 'Pedidos', 'Mensagens', 'Perfil'])
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      '/comprador/dashboard', '/comprador/produtos', '/comprador/pedidos', '/comprador/mensagens', '/comprador/perfil',
    ])
  })

  it('deve chamar logout ao clicar em Sair', () => {
    renderComprador()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(mockLogout).toHaveBeenCalledOnce()
  })
})

describe('AppShell — tema', () => {
  it('deve alternar o tema e salvar a escolha', () => {
    render(<MemoryRouter><AppShell nav={null}>x</AppShell></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('ec_theme')).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo claro' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('ec_theme')).toBe('light')
  })

  it('deve exibir o selo quando informado', () => {
    render(<MemoryRouter><AppShell nav={null} badge="ADMIN">x</AppShell></MemoryRouter>)
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })
})
