import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api, {
  gerarToken,
  criarUsuario,
  criarConta,
  buscarContaPorUsuario,
  buscarContaPorId,
  atualizarConta,
  buscarProdutos,
  buscarProdutoPorId,
  buscarProdutosPorVendedor,
  criarProduto,
  atualizarProduto,
  ativarProduto,
  desativarProduto,
  deletarProduto,
  buscarTodosProdutos,
  buscarPedidos,
  criarPedido,
  buscarPedidoPorId,
  buscarPedidoPorIdComprador,
  buscarPedidoPorIdVendedor,
  finalizarPedidoVendedor,
  buscarTodosPedidos,
  buscarChats,
  criarChat,
  enviarMensagem,
  buscarChat,
  abrirConversa,
  buscarAvaliacoesConta,
  criarAvaliacaoProduto,
  criarAvaliacaoConta,
  buscarArquivosPorEntidade,
  deletarArquivo,
} from './api'
import { OrderStatusEnum } from '../types'

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(api)
  localStorage.clear()
})

afterEach(() => {
  mock.restore()
  vi.restoreAllMocks()
})

// Autenticação

describe('gerarToken', () => {
  it('deve fazer POST em /token e retornar o token', async () => {
    const responseData = { token: 'jwt-abc' }
    mock.onPost('/token', { email: 'u@test.com', password: 'pass' }).reply(200, responseData)

    const result = await gerarToken('u@test.com', 'pass')
    expect(result).toEqual(responseData)
  })
})

describe('criarUsuario', () => {
  it('deve fazer POST em /user com os dados corretos', async () => {
    const user = { id: 'u1', email: 'u@test.com', isAdmin: false, createdAt: 0, updatedAt: 0 }
    mock.onPost('/user').reply(201, user)

    const result = await criarUsuario({ email: 'u@test.com', password: 'pass123' })
    expect(result).toEqual(user)
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ email: 'u@test.com' })
  })
})

// Conta

describe('buscarContaPorUsuario', () => {
  it('deve fazer GET em /account/user/{userId}', async () => {
    const account = { id: 'acc-1', userId: 'u1', name: 'João' }
    mock.onGet('/account/user/u1').reply(200, account)

    const result = await buscarContaPorUsuario('u1')
    expect(result).toEqual(account)
  })
})

describe('buscarContaPorId', () => {
  it('deve fazer GET em /account/{id}', async () => {
    const account = { id: 'acc-1' }
    mock.onGet('/account/acc-1').reply(200, account)

    const result = await buscarContaPorId('acc-1')
    expect(result).toEqual(account)
  })
})

describe('atualizarConta', () => {
  it('deve fazer PUT em /account/{id}', async () => {
    mock.onPut('/account/acc-1').reply(200, { id: 'acc-1' })

    await atualizarConta('acc-1', { name: 'Novo Nome' } as any)

    expect(mock.history.put).toHaveLength(1)
    expect(mock.history.put[0].url).toBe('/account/acc-1')
  })
})

// Produto

describe('buscarProdutos', () => {
  it('deve fazer GET em /product/query sem parâmetros', async () => {
    mock.onGet('/product/query').reply(200, [])

    const result = await buscarProdutos()
    expect(result).toEqual([])
  })

  it('deve passar description e category como query params', async () => {
    mock.onGet('/product/query').reply(200, [])

    await buscarProdutos({ description: 'arroz', category: 'GRAIN' })

    expect(mock.history.get[0].params).toMatchObject({
      description: 'arroz',
      category: 'GRAIN',
    })
  })

  it('deve passar vendorCity e vendorState como query params', async () => {
    mock.onGet('/product/query').reply(200, [])

    await buscarProdutos({ vendorCity: 'Campinas', vendorState: 'SP' })

    expect(mock.history.get[0].params).toMatchObject({
      vendorCity: 'Campinas',
      vendorState: 'SP',
    })
  })
})

describe('buscarProdutoPorId', () => {
  it('deve fazer GET em /product/{id}', async () => {
    const product = { id: 'p1', description: 'Arroz' }
    mock.onGet('/product/p1').reply(200, product)

    const result = await buscarProdutoPorId('p1')
    expect(result).toEqual(product)
  })
})

describe('buscarProdutosPorVendedor', () => {
  it('deve fazer GET em /product/vendor/{vendorAccountId}', async () => {
    mock.onGet('/product/vendor/vendor-1').reply(200, [])

    const result = await buscarProdutosPorVendedor('vendor-1')
    expect(result).toEqual([])
  })
})

describe('criarProduto', () => {
  it('deve fazer POST em /product com os dados corretos', async () => {
    const input = { description: 'Feijão', vendorAccountId: 'v1', category: 'GRAIN', scale: 'KG', quantity: 100, price: 5, availabilityDate: 0 }
    const created = { id: 'p1', ...input }
    mock.onPost('/product').reply(201, created)

    const result = await criarProduto(input as any)
    expect(result).toEqual(created)
  })
})

describe('atualizarProduto', () => {
  it('deve fazer PUT em /product/{id}', async () => {
    mock.onPut('/product/p1').reply(200, { id: 'p1' })

    await atualizarProduto('p1', { description: 'Atualizado' } as any)

    expect(mock.history.put[0].url).toBe('/product/p1')
  })
})

describe('ativarProduto', () => {
  it('deve fazer PUT em /product/{id}/activate', async () => {
    mock.onPut('/product/p1/activate').reply(200)

    await ativarProduto('p1')

    expect(mock.history.put[0].url).toBe('/product/p1/activate')
  })
})

describe('desativarProduto', () => {
  it('deve fazer PUT em /product/{id}/deactivate', async () => {
    mock.onPut('/product/p1/deactivate').reply(200)

    await desativarProduto('p1')

    expect(mock.history.put[0].url).toBe('/product/p1/deactivate')
  })
})

describe('deletarProduto', () => {
  it('deve fazer DELETE em /product/{id}', async () => {
    mock.onDelete('/product/p1').reply(204)

    await deletarProduto('p1')

    expect(mock.history.delete[0].url).toBe('/product/p1')
  })
})

// Pedido

describe('buscarPedidos', () => {
  it('deve fazer GET em /order', async () => {
    mock.onGet('/order').reply(200, { content: [], totalElements: 0 })

    const result = await buscarPedidos()
    expect(result.content).toEqual([])
  })
})

describe('criarPedido', () => {
  it('deve fazer POST em /order', async () => {
    const order = { id: 'ord-1', buyerAccountId: 'b1', sellerAccountId: 's1', products: [] }
    mock.onPost('/order').reply(201, order)

    const result = await criarPedido({ buyerAccountId: 'b1', sellerAccountId: 's1', productsIds: [] })
    expect(result).toEqual(order)
  })
})

describe('buscarPedidoPorId', () => {
  it('deve fazer GET em /order/{id}', async () => {
    mock.onGet('/order/ord-1').reply(200, { id: 'ord-1' })

    const result = await buscarPedidoPorId('ord-1')
    expect(result).toEqual({ id: 'ord-1' })
  })
})

describe('buscarPedidoPorIdComprador', () => {
  it('deve fazer GET em /order/buyer/{id}', async () => {
    mock.onGet('/order/buyer/buyer-1').reply(200, { content: [], totalElements: 0 })

    const result = await buscarPedidoPorIdComprador('buyer-1')
    expect(result.content).toEqual([])
  })

  it('deve passar parâmetros de paginação', async () => {
    mock.onGet('/order/buyer/buyer-1').reply(200, { content: [] })

    await buscarPedidoPorIdComprador('buyer-1', { page: 0, size: 10 })

    expect(mock.history.get[0].params).toMatchObject({ page: 0, size: 10 })
  })
})

describe('buscarPedidoPorIdVendedor', () => {
  it('deve fazer GET em /order/seller/{id}', async () => {
    mock.onGet('/order/seller/seller-1').reply(200, { content: [] })

    await buscarPedidoPorIdVendedor('seller-1')

    expect(mock.history.get[0].url).toBe('/order/seller/seller-1')
  })
})

describe('finalizarPedidoVendedor', () => {
  it('deve fazer PUT em /order/{id}/status', async () => {
    mock.onPut('/order/ord-1/status').reply(200, { id: 'ord-1' })

    await finalizarPedidoVendedor('ord-1', { status: OrderStatusEnum.COMPLETED })

    expect(mock.history.put[0].url).toBe('/order/ord-1/status')
    expect(JSON.parse(mock.history.put[0].data)).toMatchObject({ status: 'COMPLETED' })
  })
})

// Chat

describe('buscarChats', () => {
  it('deve fazer GET em /chat', async () => {
    mock.onGet('/chat').reply(200, [])

    const result = await buscarChats()
    expect(result).toEqual([])
  })
})

describe('buscarChat', () => {
  it('deve fazer GET em /chat/{id}', async () => {
    mock.onGet('/chat/chat-1').reply(200, { id: 'chat-1', messages: [] })
    const result = await buscarChat('chat-1')
    expect(result.id).toBe('chat-1')
  })
})

describe('abrirConversa', () => {
  it('deve reaproveitar a conversa que já existe com a outra conta', async () => {
    mock.onGet('/chat').reply(200, [
      { id: 'c-outra', senderAccountId: 'eu', receiverAccountId: 'terceiro' },
      { id: 'c-certa', senderAccountId: 'vendedor', receiverAccountId: 'eu' },
    ])
    const chat = await abrirConversa('vendedor', 'eu')
    expect(chat.id).toBe('c-certa')
    expect(mock.history.post).toHaveLength(0)
  })

  it('deve criar a conversa quando não existe', async () => {
    mock.onGet('/chat').reply(200, [])
    mock.onPost('/chat').reply(201, { id: 'nova', senderAccountId: 'eu', receiverAccountId: 'vendedor' })
    const chat = await abrirConversa('vendedor', 'eu')
    expect(chat.id).toBe('nova')
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ senderAccountId: 'eu', receiverAccountId: 'vendedor' })
  })

  it('deve buscar de novo se a criação falhar por duplicidade', async () => {
    mock.onGet('/chat').replyOnce(200, []).onGet('/chat').replyOnce(200, [{ id: 'criada', senderAccountId: 'vendedor', receiverAccountId: 'eu' }])
    mock.onPost('/chat').reply(400, { message: 'duplicated chat for sender and receiver accounts' })
    const chat = await abrirConversa('vendedor', 'eu')
    expect(chat.id).toBe('criada')
  })

  it('deve repassar o erro quando não há conversa nem dá para criar', async () => {
    mock.onGet('/chat').reply(200, [])
    mock.onPost('/chat').reply(404, { message: 'account not found' })
    await expect(abrirConversa('sumiu', 'eu')).rejects.toBeTruthy()
  })
})

describe('criarChat', () => {
  it('deve fazer POST em /chat', async () => {
    const chat = { id: 'chat-1', senderAccountId: 'a1', receiverAccountId: 'a2' }
    mock.onPost('/chat').reply(201, chat)

    const result = await criarChat({ senderAccountId: 'a1', receiverAccountId: 'a2' })
    expect(result).toEqual(chat)
  })
})

describe('enviarMensagem', () => {
  it('deve fazer POST em /chat/{chatId}/message', async () => {
    mock.onPost('/chat/chat-1/message').reply(201, { id: 'msg-1' })

    await enviarMensagem('chat-1', { content: 'Olá!' })

    expect(mock.history.post[0].url).toBe('/chat/chat-1/message')
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ content: 'Olá!' })
  })
})

// Avaliações

describe('buscarAvaliacoesConta', () => {
  it('deve fazer GET em /account/{accountId}/evaluations', async () => {
    mock.onGet('/account/acc-1/evaluations').reply(200, [])

    const result = await buscarAvaliacoesConta('acc-1')
    expect(result).toEqual([])
  })
})

describe('criarAvaliacaoProduto', () => {
  it('deve fazer POST em /product/{productId}/evaluate', async () => {
    mock.onPost('/product/p1/evaluate').reply(201, { id: 'p1' })

    await criarAvaliacaoProduto('p1', { stars: 5, reviewerAccountId: 'acc-1' })

    expect(mock.history.post[0].url).toBe('/product/p1/evaluate')
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ stars: 5 })
  })
})

describe('criarAvaliacaoConta', () => {
  it('deve fazer POST em /account/{accountId}/evaluate', async () => {
    const evaluation = { id: 'eval-1', stars: 4, content: 'Bom!', reviewerAccountId: 'acc-2', productId: 'p1' }
    mock.onPost('/account/acc-1/evaluate').reply(201, evaluation)

    const result = await criarAvaliacaoConta('acc-1', evaluation)
    expect(result).toEqual(evaluation)
  })
})

// Arquivos

describe('buscarArquivosPorEntidade', () => {
  it('deve passar entityType e entityId como query params', async () => {
    mock.onGet('/file').reply(200, [])

    await buscarArquivosPorEntidade('PRODUCT', 'p1')

    expect(mock.history.get[0].params).toMatchObject({ entityType: 'PRODUCT', entityId: 'p1' })
  })

  it('deve funcionar com entityType PROFILE', async () => {
    mock.onGet('/file').reply(200, [])

    await buscarArquivosPorEntidade('PROFILE', 'acc-1')

    expect(mock.history.get[0].params).toMatchObject({ entityType: 'PROFILE', entityId: 'acc-1' })
  })
})

describe('deletarArquivo', () => {
  it('deve fazer DELETE em /file/{id}', async () => {
    mock.onDelete('/file/file-1').reply(204)

    await deletarArquivo('file-1')

    expect(mock.history.delete[0].url).toBe('/file/file-1')
  })
})

// Interceptores

describe('interceptor de request - token', () => {
  it('deve adicionar o header Authorization em rotas protegidas', async () => {
    localStorage.setItem('ec_token', 'meu-token')
    mock.onGet('/account/acc-1').reply(200, {})

    await buscarContaPorId('acc-1')

    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer meu-token')
  })

  it('não deve adicionar Authorization na rota /token', async () => {
    localStorage.setItem('ec_token', 'meu-token')
    mock.onPost('/token').reply(200, { token: 'novo' })

    await gerarToken('u@test.com', 'pass')

    expect(mock.history.post[0].headers?.Authorization).toBeUndefined()
  })

  it('não deve adicionar Authorization na rota /user', async () => {
    localStorage.setItem('ec_token', 'meu-token')
    mock.onPost('/user').reply(201, { id: 'u1' })

    await criarUsuario({ email: 'u@test.com', password: 'pass', isAdmin: false })

    expect(mock.history.post[0].headers?.Authorization).toBeUndefined()
  })

  it('não deve adicionar Authorization se não houver token no localStorage', async () => {
    mock.onGet('/account/acc-1').reply(200, {})

    await buscarContaPorId('acc-1')

    expect(mock.history.get[0].headers?.Authorization).toBeUndefined()
  })
})

describe('interceptor de response - erro 401', () => {
  it('deve limpar o localStorage e redirecionar ao receber 401', async () => {
    localStorage.setItem('ec_token', 'token')
    localStorage.setItem('ec_session', '{"email":"u@test.com"}')

    delete (window as any).location
    window.location = { href: '' } as Location

    mock.onGet('/account/acc-1').reply(401)

    await expect(buscarContaPorId('acc-1')).rejects.toBeTruthy()

    expect(localStorage.getItem('ec_token')).toBeNull()
    expect(localStorage.getItem('ec_session')).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})
