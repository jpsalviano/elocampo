import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MeusPedidos from './MeusPedidos'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  buscarPedidoPorIdComprador: vi.fn(),
  criarAvaliacaoProduto: vi.fn(),
  buscarProdutoPorId: vi.fn(),
  abrirConversa: vi.fn(),
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

import { useAuth } from '../../contexts/AuthContext'
import { buscarPedidoPorIdComprador, criarAvaliacaoProduto, buscarProdutoPorId, abrirConversa } from '../../services/api'

const mockAccount = {
  id: 'buyer-1',
  userId: 'user-1',
  name: 'João Comprador',
  birthdayDate: 0,
  address: { postalCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' },
  phone: { countryCode: 55, stateCode: 11, number: '' },
  role: 'BUYER' as const,
  createdAt: 0,
  updatedAt: 0,
}

const mockSession = {
  token: 'tok',
  userId: 'user-1',
  email: 'joao@empresa.com',
  isAdmin: false,
  account: mockAccount,
}

const mockPedidoPendente = {
  id: 'order-abc123456789',
  buyerAccountId: 'buyer-1',
  sellerAccountId: 'seller-1',
  orderStatus: 'PENDING' as const,
  products: [{ productId: 'prod-1', description: 'Soja em grão', quantity: 50, price: 5 }],
  price: 250,
  createdAt: 0,
  updatedAt: 0,
}

const mockPedidoConcluido = {
  ...mockPedidoPendente,
  id: 'order-xyz987654321',
  orderStatus: 'COMPLETED' as const,
}

function renderPage() {
  return render(<MemoryRouter><MeusPedidos /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({ session: mockSession, setSession: vi.fn() } as any)
})

describe('MeusPedidos — renderização', () => {
  it('deve exibir o título "Meus Pedidos"', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 })
    renderPage()
    expect(screen.getByText('Meus Pedidos')).toBeInTheDocument()
  })
})

describe('MeusPedidos — estados de listagem', () => {
  it('deve exibir "Carregando..." enquanto busca', () => {
    vi.mocked(buscarPedidoPorIdComprador).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('deve exibir estado vazio quando não há pedidos', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Nenhum pedido ainda.')).toBeInTheDocument()
    })
  })

  it('deve exibir pedidos na tabela', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoPendente], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('order-abc123…')).toBeInTheDocument()
    })
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('deve exibir o contador de pedidos no subtítulo', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoPendente], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('1 pedido(s)')).toBeInTheDocument()
    })
  })
})

describe('MeusPedidos — painel de detalhes', () => {
  it('deve abrir o painel de detalhes ao clicar em "Detalhes"', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoPendente], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    const itens = screen.getByRole('list', { name: 'Itens do pedido' })
    expect(within(itens).getByText('Soja em grão')).toBeInTheDocument()
    expect(within(itens).getByRole('listitem')).toHaveTextContent('50 × R$ 5,00')
    expect(screen.getByRole('button', { name: 'Conversar' })).toBeInTheDocument()
  })

  it('deve fechar o painel ao clicar em "Fechar"', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoPendente], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Fechar'))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Conversar' })).not.toBeInTheDocument()
    })
  })
})

describe('MeusPedidos — conversar com o produtor', () => {
  it('não tem mais o chat simulado', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoPendente], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    expect(screen.queryByText('Enviarei na sexta-feira!')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Digite uma mensagem...')).not.toBeInTheDocument()
  })

  it('abre ou cria a conversa com o produtor e vai para ela', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoPendente], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    vi.mocked(abrirConversa).mockResolvedValue({ id: 'chat-7', senderAccountId: 'buyer-1', receiverAccountId: 'seller-1', createdAt: 0, updatedAt: 0 })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    fireEvent.click(screen.getByRole('button', { name: 'Conversar' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/comprador/mensagens/chat-7'))
    expect(abrirConversa).toHaveBeenCalledWith('seller-1', 'buyer-1')
  })
})

describe('MeusPedidos — avaliações', () => {
  it('deve exibir a seção de avaliações para pedidos concluídos', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoConcluido], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    vi.mocked(buscarProdutoPorId).mockResolvedValue({
      id: 'prod-1', description: 'Soja', evaluations: [], vendorAccountId: '', category: 'GRAIN', scale: 'KG', quantity: 0, price: 0, status: 'AVAILABLE', vendorCity: '', vendorState: '', availabilityDate: 0, imageUrls: [], createdAt: 0, updatedAt: 0,
    })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    await waitFor(() => {
      expect(screen.getByText('Avaliações')).toBeInTheDocument()
    })
    expect(screen.getByText('Avaliar produto')).toBeInTheDocument()
  })

  it('deve abrir o formulário de avaliação ao clicar em "Avaliar produto"', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoConcluido], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    vi.mocked(buscarProdutoPorId).mockResolvedValue({
      id: 'prod-1', description: 'Soja', evaluations: [], vendorAccountId: '', category: 'GRAIN', scale: 'KG', quantity: 0, price: 0, status: 'AVAILABLE', vendorCity: '', vendorState: '', availabilityDate: 0, imageUrls: [], createdAt: 0, updatedAt: 0,
    })
    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    await waitFor(() => screen.getByText('Avaliar produto'))
    fireEvent.click(screen.getByText('Avaliar produto'))
    expect(screen.getByText('Sua avaliação')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Comentário opcional...')).toBeInTheDocument()
  })

  it('deve enviar avaliação e atualizar a lista', async () => {
    vi.mocked(buscarPedidoPorIdComprador).mockResolvedValue({ content: [mockPedidoConcluido], totalElements: 1, totalPages: 1, number: 0, size: 10 })
    const produtoComAvaliacao = {
      id: 'prod-1', description: 'Soja', evaluations: [{ id: 'ev1', stars: 5, content: 'Ótimo', reviewerAccountId: 'buyer-1' }], vendorAccountId: '', category: 'GRAIN' as const, scale: 'KG' as const, quantity: 0, price: 0, status: 'AVAILABLE' as const, vendorCity: '', vendorState: '', availabilityDate: 0, imageUrls: [], createdAt: 0, updatedAt: 0,
    }
    vi.mocked(buscarProdutoPorId).mockResolvedValue({ ...produtoComAvaliacao, evaluations: [] })
    vi.mocked(criarAvaliacaoProduto).mockResolvedValueOnce(undefined as any)
    vi.mocked(buscarProdutoPorId).mockResolvedValueOnce({ ...produtoComAvaliacao, evaluations: [] })
    vi.mocked(buscarProdutoPorId).mockResolvedValueOnce(produtoComAvaliacao)

    renderPage()
    await waitFor(() => screen.getByText('Detalhes'))
    fireEvent.click(screen.getByText('Detalhes'))
    await waitFor(() => screen.getByText('Avaliar produto'))
    fireEvent.click(screen.getByText('Avaliar produto'))
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    expect(screen.getByRole('button', { name: '4 estrelas' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Comentário'), { target: { value: 'Muito bom' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(criarAvaliacaoProduto).toHaveBeenCalledWith('prod-1', { stars: 4, content: 'Muito bom', reviewerAccountId: 'buyer-1' })
    })
  })
})
