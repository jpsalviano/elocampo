import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MinhasVendas from './MinhasVendas'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  buscarPedidoPorIdVendedor: vi.fn(),
  finalizarPedidoVendedor: vi.fn(),
  abrirConversa: vi.fn(),
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

import { useAuth } from '../../contexts/AuthContext'
import { buscarPedidoPorIdVendedor, finalizarPedidoVendedor, abrirConversa } from '../../services/api'

const mockAccount = {
  id: 'vendor-1',
  userId: 'user-1',
  name: 'Maria Produtora',
  birthdayDate: 0,
  address: { postalCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' },
  phone: { countryCode: 55, stateCode: 11, number: '' },
  role: 'VENDOR' as const,
  createdAt: 0,
  updatedAt: 0,
}

const mockSession = {
  token: 'tok',
  userId: 'user-1',
  email: 'maria@fazenda.com',
  isAdmin: false,
  account: mockAccount,
}

const mockVenda = {
  id: 'order-abc123456789',
  buyerAccountId: 'buyer-1',
  sellerAccountId: 'vendor-1',
  orderStatus: 'PENDING' as const,
  products: [{ productId: 'prod-1', description: 'Milho', quantity: 100, price: 3 }],
  price: 300,
  createdAt: 0,
  updatedAt: 0,
}

function renderPage() {
  return render(<MemoryRouter><MinhasVendas /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({ session: mockSession, setSession: vi.fn() } as any)
})

describe('MinhasVendas — renderização', () => {
  it('deve exibir o título "Minhas Vendas"', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 })
    renderPage()
    expect(screen.getByText('Minhas Vendas')).toBeInTheDocument()
  })
})

describe('MinhasVendas — estados de listagem', () => {
  it('deve exibir "Carregando..." enquanto busca', () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('deve exibir estado vazio quando não há vendas', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Nenhuma venda ainda.')).toBeInTheDocument()
    })
  })

  it('deve exibir vendas na tabela após carregamento', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('order-abc123…')).toBeInTheDocument()
    })
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('deve exibir o contador de pedidos no subtítulo', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('1 pedido(s)')).toBeInTheDocument()
    })
  })
})

describe('MinhasVendas — painel de detalhes', () => {
  it('deve abrir o painel ao clicar em "Detalhes"', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    const itens = screen.getByRole('list', { name: 'Itens do pedido' })
    expect(within(itens).getByText('Milho')).toBeInTheDocument()
    expect(within(itens).getByRole('listitem')).toHaveTextContent('100 × R$ 3,00')
    expect(screen.getByRole('button', { name: 'Conversar' })).toBeInTheDocument()
    expect(screen.getByText('Finalizar venda')).toBeInTheDocument()
  })

  it('deve fechar o painel ao clicar em "Fechar"', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Fechar'))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Conversar' })).not.toBeInTheDocument()
    })
  })

  it('deve chamar finalizarPedidoVendedor ao clicar em "Finalizar venda"', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    vi.mocked(finalizarPedidoVendedor).mockResolvedValueOnce(undefined as any)
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Finalizar venda'))
    await waitFor(() => {
      expect(finalizarPedidoVendedor).toHaveBeenCalledWith('order-abc123456789', expect.objectContaining({ status: 'COMPLETED' }))
    })
  })
})

describe('MinhasVendas — conversar com o comprador', () => {
  it('não tem mais o chat simulado', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    expect(screen.queryByText('Podemos fechar o pedido?')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Digite uma mensagem...')).not.toBeInTheDocument()
  })

  it('abre ou cria a conversa com o comprador e vai para ela', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    vi.mocked(abrirConversa).mockResolvedValue({ id: 'chat-9', senderAccountId: 'vendor-1', receiverAccountId: 'buyer-1', createdAt: 0, updatedAt: 0 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    fireEvent.click(screen.getByRole('button', { name: 'Conversar' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/produtor/mensagens/chat-9'))
    expect(abrirConversa).toHaveBeenCalledWith('buyer-1', 'vendor-1')
  })

  it('mostra o erro quando não dá para abrir a conversa', async () => {
    vi.mocked(buscarPedidoPorIdVendedor).mockResolvedValue({ content: [mockVenda], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    vi.mocked(abrirConversa).mockRejectedValue({ response: { data: { message: 'account not found' } } })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    fireEvent.click(screen.getByRole('button', { name: 'Conversar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('account not found')
    expect(navigate).not.toHaveBeenCalled()
  })
})
