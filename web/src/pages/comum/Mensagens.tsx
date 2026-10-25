import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buscarChat, buscarChats, buscarContaPorId, enviarMensagem } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { ChatResponse, MessageResponse } from '../../types'
import { Icon } from '../../components/Icon'
import { Empty, Loading, PageHead } from '../../components/ui'
import { fmtQuando } from '../../utils/format'

// Intervalo de atualização da conversa aberta, só com a tela visível.
export const INTERVALO_MS = 5000

const ordenar = (ms: MessageResponse[] = []) =>
  [...ms].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))

const ultima = (c: ChatResponse) => {
  const ms = c.messages ?? []
  return ms.length ? ordenar(ms)[ms.length - 1] : undefined
}

const atividade = (c: ChatResponse) => ultima(c)?.createdAt ?? c.updatedAt

// Conversas entre produtor e comprador. No computador, lista e conversa lado a
// lado; no celular, telas separadas (/mensagens e /mensagens/:chatId).
export default function Mensagens({ base }: { base: string }) {
  const { session } = useAuth()
  const meuId = session?.account?.id
  const { chatId } = useParams()

  const [chats, setChats] = useState<ChatResponse[] | null>(null)
  const [erroLista, setErroLista] = useState('')
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const pedidos = useRef(new Set<string>())

  const [aberta, setAberta] = useState<ChatResponse | null>(null)
  const [erroConversa, setErroConversa] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const caixa = useRef<HTMLDivElement>(null)

  const outro = (c: ChatResponse) => (c.senderAccountId === meuId ? c.receiverAccountId : c.senderAccountId)
  const nomeDe = (id: string) => nomes[id] ?? 'Carregando…'

  useEffect(() => {
    buscarChats()
      .then(setChats)
      .catch(() => { setChats([]); setErroLista('Não foi possível carregar as conversas.') })
  }, [])

  // Nome da outra parte de cada conversa, buscado uma vez por conta.
  useEffect(() => {
    for (const c of chats ?? []) {
      const id = outro(c)
      if (pedidos.current.has(id)) continue
      pedidos.current.add(id)
      buscarContaPorId(id)
        .then(a => setNomes(n => ({ ...n, [id]: a.businessName || a.name })))
        .catch(() => setNomes(n => ({ ...n, [id]: 'Conta indisponível' })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats])

  // Conversa aberta: carrega e atualiza a cada 5 s enquanto a aba está visível.
  useEffect(() => {
    setAberta(null)
    setErroConversa('')
    setErroEnvio('')
    if (!chatId) return
    let viva = true
    let timer: ReturnType<typeof setInterval> | undefined

    const carregar = () =>
      buscarChat(chatId)
        .then(c => {
          if (!viva) return
          // Não volta atrás se uma mensagem recém-enviada ainda não veio na leitura.
          setAberta(prev => (prev?.id === c.id && (prev.messages?.length ?? 0) > (c.messages?.length ?? 0) ? prev : c))
          setChats(cs => (cs?.some(x => x.id === c.id) ? cs.map(x => (x.id === c.id ? c : x)) : [c, ...(cs ?? [])]))
        })
        .catch(() => { if (viva) setErroConversa('Não foi possível abrir esta conversa.') })

    const iniciar = () => { if (timer === undefined) timer = setInterval(carregar, INTERVALO_MS) }
    const parar = () => { if (timer !== undefined) { clearInterval(timer); timer = undefined } }
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') { carregar(); iniciar() } else parar()
    }

    carregar()
    if (document.visibilityState === 'visible') iniciar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      viva = false
      parar()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [chatId])

  const conversa = (aberta?.id === chatId ? aberta : chats?.find(c => c.id === chatId)) ?? null
  const mensagens = ordenar(conversa?.messages)

  // Mantém a última mensagem à vista.
  useLayoutEffect(() => {
    const el = caixa.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensagens.length, chatId])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const conteudo = texto.trim()
    if (!conteudo || !chatId || !conversa) return
    setEnviando(true)
    setErroEnvio('')
    try {
      const m = await enviarMensagem(chatId, { content: conteudo })
      setTexto('')
      const junta = (c: ChatResponse): ChatResponse => ({
        ...c,
        messages: [...(c.messages ?? []).filter(x => x.id !== m.id), m],
        updatedAt: m.createdAt ?? c.updatedAt,
      })
      setAberta(junta(conversa))
      setChats(cs => cs?.map(c => (c.id === chatId ? junta(c) : c)) ?? cs)
    } catch (err: any) {
      setErroEnvio(err?.response?.data?.message ?? 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  const lista = [...(chats ?? [])].sort((a, b) => atividade(b) - atividade(a))

  return (
    <>
      <PageHead title="Mensagens" sub={chats ? `${chats.length} conversa(s)` : 'Carregando...'} />

      <div className={`chat${chatId ? ' has-open' : ''}`}>
        <section className="chat-list" aria-labelledby="conversas-titulo">
          <h2 id="conversas-titulo" className="chat-list-head">Conversas</h2>
          {chats === null && <Loading />}
          {erroLista && <div className="alert alert-danger" role="alert">{erroLista}</div>}
          {chats !== null && !erroLista && chats.length === 0 && (
            <Empty icon="mensagens">
              Nenhuma conversa ainda. Use o botão Conversar em um pedido para falar com a outra parte.
            </Empty>
          )}
          {lista.length > 0 && (
            <ul>
              {lista.map(c => {
                const u = ultima(c)
                return (
                  <li key={c.id}>
                    <Link to={`${base}/${c.id}`} className="chat-item" aria-current={c.id === chatId ? 'page' : undefined}>
                      <span className="chat-item-name">{nomeDe(outro(c))}</span>
                      <time className="chat-item-time" dateTime={new Date(atividade(c)).toISOString()}>{fmtQuando(atividade(c))}</time>
                      <span className="chat-item-last">
                        {u ? `${u.senderAccountId === meuId ? 'Você: ' : ''}${u.content}` : 'Sem mensagens ainda'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="chat-conv" aria-labelledby="conversa-titulo">
          {!chatId && <div className="chat-empty">Escolha uma conversa para ler e responder.</div>}
          {chatId && (
            <>
              <div className="chat-conv-head">
                <Link to={base} className="icon-btn chat-back" aria-label="Voltar para as conversas">
                  <Icon name="voltar" />
                </Link>
                <h2 id="conversa-titulo">{conversa ? nomeDe(outro(conversa)) : 'Conversa'}</h2>
              </div>
              {erroConversa && !conversa && <div className="chat-empty" role="alert">{erroConversa}</div>}
              {!erroConversa && !conversa && <Loading />}
              {conversa && (
                <>
                  <div className="chat-messages" ref={caixa} role="log" aria-live="polite" aria-label="Mensagens da conversa">
                    {mensagens.length === 0 && <p className="chat-empty">Nenhuma mensagem ainda. Escreva a primeira.</p>}
                    {mensagens.map(m => {
                      const minha = m.senderAccountId === meuId
                      return (
                        <div key={m.id} className={`bubble-row ${minha ? 'mine' : 'theirs'}`}>
                          <div className="bubble">
                            <span className="visually-hidden">{minha ? 'Você' : nomeDe(outro(conversa))}: </span>
                            {m.content}
                            <time className="bubble-time" dateTime={new Date(m.createdAt).toISOString()}>{fmtQuando(m.createdAt)}</time>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {erroEnvio && <div className="alert alert-danger" role="alert">{erroEnvio}</div>}
                  <form className="chat-form" onSubmit={enviar}>
                    <label htmlFor="mensagem" className="visually-hidden">Mensagem</label>
                    <input
                      id="mensagem"
                      className="input"
                      value={texto}
                      onChange={e => setTexto(e.target.value)}
                      placeholder="Digite uma mensagem..."
                      maxLength={280}
                      autoComplete="off"
                    />
                    <button type="submit" className="btn btn-primary" disabled={enviando || !texto.trim()}>
                      <Icon name="enviar" size={16} />
                      Enviar
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
