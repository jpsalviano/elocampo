import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Mensagens, { INTERVALO_MS } from './Mensagens'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('../../services/api', () => ({
  buscarChats: vi.fn(),
  buscarChat: vi.fn(),
  buscarContaPorId: vi.fn(),
  enviarMensagem: vi.fn(),
}))

import { useAuth } from '../../contexts/AuthContext'
import { buscarChats, buscarChat, buscarContaPorId, enviarMensagem } from '../../services/api'
import type { ChatResponse } from '../../types'

const EU = 'comprador-1'
const hoje = new Date()
hoje.setHours(9, 30, 0, 0)
const t = (min: number) => hoje.getTime() + min * 60_000

const chatVendedor: ChatResponse = {
  id: 'chat-1',
  senderAccountId: EU,
  receiverAccountId: 'vendedor-1',
  messages: [
    { id: 'm2', senderAccountId: 'vendedor-1', content: 'Tenho 90 kg.', createdAt: t(2), updatedAt: t(2) },
    { id: 'm1', senderAccountId: EU, content: 'Ainda tem tomate?', createdAt: t(1), updatedAt: t(1) },
  ],
  createdAt: t(0),
  updatedAt: t(2),
}

const chatOutro: ChatResponse = {
  id: 'chat-2',
  senderAccountId: 'vendedor-2',
  receiverAccountId: EU,
  createdAt: t(-600),
  updatedAt: t(-600),
}

const contas: Record<string, any> = {
  'vendedor-1': { id: 'vendedor-1', name: 'Seu Zé', businessName: 'Sítio Boa Vista' },
  'vendedor-2': { id: 'vendedor-2', name: 'Dona Maria' },
}

let visibilidade: DocumentVisibilityState = 'visible'

function renderEm(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/comprador/mensagens" element={<Mensagens base="/comprador/mensagens" />} />
        <Route path="/comprador/mensagens/:chatId" element={<Mensagens base="/comprador/mensagens" />} />
        <Route path="/comprador/pedidos" element={<p>outra tela</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function mudarVisibilidade(v: DocumentVisibilityState) {
  visibilidade = v
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

beforeEach(() => {
  vi.clearAllMocks()
  visibilidade = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilidade })
  vi.mocked(useAuth).mockReturnValue({ session: { token: 't', userId: 'u', email: 'c@x.com', isAdmin: false, account: { id: EU } } } as any)
  vi.mocked(buscarChats).mockResolvedValue([chatOutro, chatVendedor])
  vi.mocked(buscarChat).mockImplementation(async (id: string) => (id === 'chat-1' ? chatVendedor : chatOutro))
  vi.mocked(buscarContaPorId).mockImplementation(async (id: string) => contas[id])
})

afterEach(() => { vi.useRealTimers() })

describe('Mensagens — lista de conversas', () => {
  it('mostra o nome da outra parte, a última mensagem e o horário, da mais recente para a mais antiga', async () => {
    renderEm('/comprador/mensagens')
    const lista = await screen.findByRole('list')
    await waitFor(() => expect(within(lista).getByText('Sítio Boa Vista')).toBeInTheDocument())
    const itens = within(lista).getAllByRole('link')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Sítio Boa Vista')
    expect(itens[0]).toHaveTextContent('Tenho 90 kg.')
    expect(itens[0]).toHaveTextContent('09:32')
    expect(itens[0]).toHaveAttribute('href', '/comprador/mensagens/chat-1')
    expect(itens[1]).toHaveTextContent('Dona Maria')
    expect(itens[1]).toHaveTextContent('Sem mensagens ainda')
    expect(buscarContaPorId).toHaveBeenCalledTimes(2)
  })

  it('mostra o estado vazio quando não há conversas', async () => {
    vi.mocked(buscarChats).mockResolvedValue([])
    renderEm('/comprador/mensagens')
    expect(await screen.findByText(/Nenhuma conversa ainda/)).toBeInTheDocument()
  })

  it('sem conversa aberta, não busca conversa nem marca a tela como aberta', async () => {
    const { container } = renderEm('/comprador/mensagens')
    await screen.findByText('Sítio Boa Vista')
    expect(buscarChat).not.toHaveBeenCalled()
    expect(container.querySelector('.chat')).not.toHaveClass('has-open')
    expect(screen.getByText('Escolha uma conversa para ler e responder.')).toBeInTheDocument()
  })

  it('abre a conversa ao escolher na lista', async () => {
    renderEm('/comprador/mensagens')
    fireEvent.click(await screen.findByRole('link', { name: /Sítio Boa Vista/ }))
    expect(await screen.findByRole('heading', { name: 'Sítio Boa Vista' })).toBeInTheDocument()
    expect(buscarChat).toHaveBeenCalledWith('chat-1')
  })
})

describe('Mensagens — conversa aberta', () => {
  it('alinha os balões pelo remetente e mostra as mensagens em ordem', async () => {
    renderEm('/comprador/mensagens/chat-1')
    const log = await screen.findByRole('log')
    const linhas = log.querySelectorAll('.bubble-row')
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toHaveClass('mine')
    expect(linhas[0]).toHaveTextContent('Ainda tem tomate?')
    expect(linhas[1]).toHaveClass('theirs')
    expect(linhas[1]).toHaveTextContent('Tenho 90 kg.')
  })

  it('no celular a conversa é outra tela: marca a aberta e tem o botão de voltar', async () => {
    const { container } = renderEm('/comprador/mensagens/chat-1')
    await screen.findByRole('log')
    expect(container.querySelector('.chat')).toHaveClass('has-open')
    expect(screen.getByRole('link', { name: 'Voltar para as conversas' })).toHaveAttribute('href', '/comprador/mensagens')
  })

  it('envia a mensagem, mostra na conversa e limpa o campo', async () => {
    vi.mocked(enviarMensagem).mockResolvedValue({ id: 'm3', senderAccountId: EU, content: 'Fechado!', createdAt: t(3), updatedAt: t(3) })
    renderEm('/comprador/mensagens/chat-1')
    const campo = await screen.findByLabelText('Mensagem')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    fireEvent.change(campo, { target: { value: '  Fechado!  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(enviarMensagem).toHaveBeenCalledWith('chat-1', { content: 'Fechado!' }))
    const log = screen.getByRole('log')
    await waitFor(() => expect(log.querySelectorAll('.bubble-row')).toHaveLength(3))
    expect(log.querySelectorAll('.bubble-row')[2]).toHaveClass('mine')
    expect(log.querySelectorAll('.bubble-row')[2]).toHaveTextContent('Fechado!')
    expect(campo).toHaveValue('')
    // A lista também passa a mostrar a última mensagem.
    expect(screen.getByRole('link', { name: /Sítio Boa Vista/ })).toHaveTextContent('Você: Fechado!')
  })

  it('mostra o erro quando o envio falha e mantém o texto', async () => {
    vi.mocked(enviarMensagem).mockRejectedValue({ response: { data: { message: 'this chat reached 500 messages' } } })
    renderEm('/comprador/mensagens/chat-1')
    const campo = await screen.findByLabelText('Mensagem')
    fireEvent.change(campo, { target: { value: 'Mais uma' } })
    fireEvent.submit(campo.closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('this chat reached 500 messages')
    expect(campo).toHaveValue('Mais uma')
  })

  it('mostra erro quando a conversa não pode ser aberta', async () => {
    vi.mocked(buscarChats).mockResolvedValue([])
    vi.mocked(buscarChat).mockRejectedValue({ response: { status: 403 } })
    renderEm('/comprador/mensagens/chat-x')
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir esta conversa.')
  })
})

describe('Mensagens — atualização a cada 5 s', () => {
  it('atualiza a conversa aberta só enquanto a tela está visível e para ao sair', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { unmount } = renderEm('/comprador/mensagens/chat-1')
    await screen.findByRole('log')
    expect(buscarChat).toHaveBeenCalledTimes(1)

    // Chega uma mensagem nova da outra parte.
    vi.mocked(buscarChat).mockResolvedValue({
      ...chatVendedor,
      messages: [...chatVendedor.messages!, { id: 'm9', senderAccountId: 'vendedor-1', content: 'Entrego sexta.', createdAt: t(5), updatedAt: t(5) }],
    })
    act(() => { vi.advanceTimersByTime(INTERVALO_MS) })
    expect(buscarChat).toHaveBeenCalledTimes(2)
    expect(await within(screen.getByRole('log')).findByText('Entrego sexta.')).toBeInTheDocument()

    // Oculta: nada de requisições.
    mudarVisibilidade('hidden')
    act(() => { vi.advanceTimersByTime(INTERVALO_MS * 3) })
    expect(buscarChat).toHaveBeenCalledTimes(2)

    // Visível de novo: atualiza na hora e volta ao intervalo.
    mudarVisibilidade('visible')
    expect(buscarChat).toHaveBeenCalledTimes(3)
    act(() => { vi.advanceTimersByTime(INTERVALO_MS) })
    expect(buscarChat).toHaveBeenCalledTimes(4)

    // Saiu da tela: o intervalo para.
    unmount()
    act(() => { vi.advanceTimersByTime(INTERVALO_MS * 3) })
    expect(buscarChat).toHaveBeenCalledTimes(4)
  })

  it('não atualiza a lista sozinha quando nenhuma conversa está aberta', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    renderEm('/comprador/mensagens')
    await screen.findByText('Sítio Boa Vista')
    act(() => { vi.advanceTimersByTime(INTERVALO_MS * 2) })
    expect(buscarChat).not.toHaveBeenCalled()
    expect(buscarChats).toHaveBeenCalledTimes(1)
  })
})
