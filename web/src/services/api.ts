import axios from 'axios'
import type {
  UserResponse,
  AccountResponse,
  AccountInput,
  ProductResponse,
  ProductInput,
  OrderResponse,
  OrderStatusChangeInput,
  OrderInput,
  ChatResponse,
  ChatInput,
  MessageInput,
  MessageResponse,
  Page,
  ORDER_DEFAULT_PAGINATION,
  AccountEvaluation,
  ProductEvaluation,
  ProductEvaluationInput,
  FileEntityType,
  FileUploadResponse,
} from '../types'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1/elocampo' })

const PUBLIC_ROUTES = ['/token', '/user', '/demo']

api.interceptors.request.use(cfg => {
  if (!PUBLIC_ROUTES.includes(cfg.url ?? '')) {
    const token = localStorage.getItem('ec_token')
    if (token) cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('ec_token')
    localStorage.removeItem('ec_session')
    window.location.href = `${import.meta.env.BASE_URL}login`
  }
  return Promise.reject(err)
})

// Demonstração: contas de exemplo e a senha delas, mostradas no login
export type Demo = { enabled: boolean; password?: string; accounts?: { label: string; email: string }[]; resetsAt?: string }

export const buscarDemo = () =>
  api.get<Demo>('/demo').then(r => r.data)

// Autenticação
export const gerarToken = (email: string, password: string) =>
  api.post<{ token: string }>('/token', { email, password }).then(r => r.data)

export const criarUsuario = (data: { email: string; password: string }) =>
  api.post<UserResponse>('/user', data).then(r => r.data)

export const buscarTodosUsuarios = () => 
  api.get('/user/all').then(r => r.data)

// Conta
export const criarConta = (data: AccountInput) =>
  api.post<AccountResponse>('/account', data).then(r => r.data)

export const buscarContaPorUsuario = (userId: string) =>
  api.get<AccountResponse>(`/account/user/${userId}`).then(r => r.data)

export const buscarContaPorId = (id: string) =>
  api.get<AccountResponse>(`/account/${id}`).then(r => r.data)

export const buscarTodasContas = () =>
  api.get<AccountResponse[]>('/account/all').then(r => r.data)

export const atualizarConta = (id: string, data: AccountInput) =>
  api.put<AccountResponse>(`/account/${id}`, data).then(r => r.data)

// Produto
export const buscarProdutos = (params?: { description?: string; category?: string; vendorCity?: string; vendorState?: string }) =>
  api.get<ProductResponse[]>('/product/query', { params }).then(r => r.data)

export const buscarProdutoPorId = (id: string) =>
  api.get<ProductResponse>(`/product/${id}`).then(r => r.data)

export const buscarProdutosPorVendedor = (vendorAccountId: string) =>
  api.get<ProductResponse[]>(`/product/vendor/${vendorAccountId}`).then(r => r.data)

export const criarProduto = (data: ProductInput) =>
  api.post<ProductResponse>('/product', data).then(r => r.data)

export const atualizarProduto = (id: string, data: ProductInput) =>
  api.put<ProductResponse>(`/product/${id}`, data).then(r => r.data)

export const ativarProduto = (id: string) =>
  api.put(`/product/${id}/activate`)

export const desativarProduto = (id: string) =>
  api.put(`/product/${id}/deactivate`)

export const deletarProduto = (id: string) =>
  api.delete(`/product/${id}`)

export const buscarTodosProdutos = () => 
  api.get('/product/all').then(r => r.data)

// Pedido / Venda
export const buscarPedidos = (params?: { page?: number | ORDER_DEFAULT_PAGINATION; size?: number }) =>
  api.get<Page<OrderResponse>>('/order', { params }).then(r => r.data)

export const criarPedido = (data: OrderInput) =>
  api.post<OrderResponse>('/order', data).then(r => r.data)

export const buscarPedidoPorId = (id: string) =>
  api.get<OrderResponse>(`/order/${id}`).then(r => r.data)

export const buscarPedidoPorIdComprador = (id: string, params?: { page?: number | ORDER_DEFAULT_PAGINATION; size?: number }) =>
  api.get<Page<OrderResponse>>(`/order/buyer/${id}`, { params }).then(r => r.data)

export const buscarPedidoPorIdVendedor = (id: string, params?: { page?: number | ORDER_DEFAULT_PAGINATION; size?: number }) =>
  api.get<Page<OrderResponse>>(`/order/seller/${id}`, { params }).then(r => r.data)

export const finalizarPedidoVendedor = (id: string, data: OrderStatusChangeInput) =>
  api.put<OrderResponse>(`/order/${id}/status`, data).then(r => r.data)

export const buscarTodosPedidos = () => 
  api.get('/order/all').then(r => r.data)

// Chat
export const buscarChats = () =>
  api.get<ChatResponse[]>('/chat').then(r => r.data)

export const criarChat = (data: ChatInput) =>
  api.post<ChatResponse>('/chat', data).then(r => r.data)

export const buscarChat = (chatId: string) =>
  api.get<ChatResponse>(`/chat/${chatId}`).then(r => r.data)

export const enviarMensagem = (chatId: string, data: MessageInput) =>
  api.post<MessageResponse>(`/chat/${chatId}/message`, data).then(r => r.data)

// Abre a conversa com a outra conta: a que já existe ou uma nova. A API recusa
// conversa duplicada; se outra aba criou no meio do caminho, busca de novo.
export async function abrirConversa(outroAccountId: string, meuAccountId: string): Promise<ChatResponse> {
  const comOutro = (cs: ChatResponse[]) =>
    cs.find(c => c.senderAccountId === outroAccountId || c.receiverAccountId === outroAccountId)
  const existente = comOutro(await buscarChats())
  if (existente) return existente
  try {
    return await criarChat({ senderAccountId: meuAccountId, receiverAccountId: outroAccountId })
  } catch (err) {
    const criadaAgora = comOutro(await buscarChats())
    if (criadaAgora) return criadaAgora
    throw err
  }
}

// Avaliações

export const buscarAvaliacoesConta = (accountId: string) =>
  api.get<AccountEvaluation[]>(`/account/${accountId}/evaluations`).then(r => r.data)

export const criarAvaliacaoProduto = (productId: string, data: ProductEvaluationInput) =>
  api.post<ProductResponse>(`/product/${productId}/evaluate`, data).then(r => r.data)

export const criarAvaliacaoConta = (accountId: string, data: AccountEvaluation) =>
  api.post<AccountEvaluation>(`/account/${accountId}/evaluate`, data).then(r => r.data)

// Arquivo
export const buscarArquivosPorEntidade = (entityType: FileEntityType, entityId: string) =>
  api.get<FileUploadResponse[]>('/file', { params: { entityType, entityId } }).then(r => r.data)

export const uploadArquivo = (file: File, entityType: FileEntityType, entityId: string) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('entityType', entityType)
  fd.append('entityId', entityId)
  return api.post<FileUploadResponse>('/file/upload', fd).then(r => r.data)
}

export const deletarArquivo = (id: string) =>
  api.delete(`/file/${id}`)

export default api
