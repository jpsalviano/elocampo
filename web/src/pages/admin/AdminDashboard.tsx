import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts'
import api, { buscarTodasContas, buscarTodosPedidos, buscarTodosProdutos, buscarTodosUsuarios } from '../../services/api'
import type { AccountResponse } from '../../types'
import { PRODUCT_CATEGORY, ORDER_STATUS_LABEL, ACCOUNT_ROLE_LABEL } from '../../types'
import { AppShell } from '../../components/layout/AppLayout'
import { Icon, type IconName } from '../../components/Icon'
import { Empty, Loading, PageHead, StatusPedido } from '../../components/ui'
import { catLabel, escLabel, fmtPreco } from '../../utils/format'
import { useCoresTema } from '../../utils/useCoresTema'

const TOKENS = ['primary', 'muted', 'border', 'text', 'bg', 'head'] as const

// No celular o eixo X pula rótulos para não encavalar.
function useTelaEstreita() {
  const consulta = '(max-width: 720px)'
  const [estreito, setEstreito] = useState(() => window.matchMedia?.(consulta).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(consulta)
    const mudar = () => setEstreito(mq?.matches ?? false)
    mq?.addEventListener?.('change', mudar)
    return () => mq?.removeEventListener?.('change', mudar)
  }, [])
  return estreito
}

type Aba = 'resumo' | 'usuarios' | 'produtos' | 'pedidos'
type Grafico = 'contas' | 'produtos' | 'pedidos'

type Granularity = 'day' | 'week' | 'month' | 'year'

function getGranularity(start: string, end: string): Granularity {
  const days = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  if (days <= 31)  return 'day'
  if (days <= 90)  return 'week'
  if (days <= 365) return 'month'
  return 'year'
}

function getBucketKey(date: Date, g: Granularity): string {
  if (g === 'year')  return String(date.getFullYear())
  if (g === 'month') return date.toISOString().slice(0, 7)
  if (g === 'day')   return date.toISOString().slice(0, 10)
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d.toISOString().slice(0, 10)
}

function groupByPeriod(
  items: any[],
  getTs: (item: any) => number,
  filterFn: (item: any) => boolean,
  start: string,
  end: string,
  g: Granularity
): { date: string; count: number }[] {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T23:59:59')
  const counts: Record<string, number> = {}
  if (g === 'day') {
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1))
      counts[getBucketKey(new Date(d), g)] = 0
  } else if (g === 'week') {
    const mon = new Date(s)
    const dow = mon.getDay()
    mon.setDate(mon.getDate() + (dow === 0 ? -6 : 1 - dow))
    for (let d = new Date(mon); d <= e; d.setDate(d.getDate() + 7))
      counts[getBucketKey(new Date(d), g)] = 0
  } else if (g === 'month') {
    const cur = new Date(s.getFullYear(), s.getMonth(), 1)
    const last = new Date(e.getFullYear(), e.getMonth(), 1)
    for (; cur <= last; cur.setMonth(cur.getMonth() + 1))
      counts[getBucketKey(new Date(cur), g)] = 0
  } else {
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++)
      counts[String(y)] = 0
  }
  items.forEach(item => {
    if (!filterFn(item)) return
    const ts = getTs(item)
    if (!ts) return
    const dt = new Date(ts)
    if (dt < s || dt > e) return
    const key = getBucketKey(dt, g)
    if (key in counts) counts[key]++
  })
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export default function AdminDashboard() {
  const cores = useCoresTema(TOKENS)
  const estreito = useTelaEstreita()
  const [aba, setAba]             = useState<Aba>('resumo')
  const [usuarios, setUsuarios]   = useState<any[]>([])
  const [produtos, setProdutos]   = useState<any[]>([])
  const [pedidos, setPedidos]     = useState<any[]>([])
  const [contas, setContas]       = useState<AccountResponse[]>([])
  const [loading, setLoading]     = useState(false)

  const [grafico, setGrafico]     = useState<Grafico>('contas')
  const [relStart, setRelStart]   = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
  const [relEnd,   setRelEnd]     = useState(() => new Date().toISOString().slice(0, 10))
  const [roleFilter,   setRoleFilter]   = useState<string[]>([])
  const [catFilter,    setCatFilter]    = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const roleInit   = useRef(false)
  const catInit    = useRef(false)
  const statusInit = useRef(false)

  useEffect(() => {
    Promise.allSettled([
      buscarTodosUsuarios().then((a) => setUsuarios(a)),
      buscarTodosPedidos().then((o) => setPedidos(o)),
      buscarTodosProdutos().then((p) => setProdutos(p)),
      buscarTodasContas().then((a) => setContas(a)),
    ]).finally(() => setLoading(false))
  }, [])

  function mudarAba(a: Aba) { setAba(a) }

  async function handleDesativarUsuario(id: string) {
    if (!confirm('Desativar este usuário?')) return
    await api.put(`/v1/user/${id}/deactivate`)
    setUsuarios(u => u.map((x: any) => x.id === id ? { ...x, ativo: false } : x))
  }

  async function handleAtivarUsuario(id: string) {
    await api.put(`/v1/user/${id}/activate`)
    setUsuarios(u => u.map((x: any) => x.id === id ? { ...x, ativo: true } : x))
  }

  async function handleDeletarProduto(id: string) {
    if (!confirm('Remover este produto permanentemente?')) return
    await api.delete(`/v1/product/${id}`)
    setProdutos(p => p.filter((x: any) => x.id !== id))
  }

  const roleOptions   = useMemo(() => [...new Set(contas.map(c => c.role))],                [contas])
  const catOptions    = useMemo(() => [...new Set(produtos.map((p: any) => p.category))],   [produtos])
  const statusOptions = useMemo(() => [...new Set(pedidos.map((p: any) => p.orderStatus))], [pedidos])

  useEffect(() => { if (roleOptions.length   > 0 && !roleInit.current)   { roleInit.current   = true; setRoleFilter(roleOptions)   } }, [roleOptions])
  useEffect(() => { if (catOptions.length    > 0 && !catInit.current)    { catInit.current    = true; setCatFilter(catOptions)     } }, [catOptions])
  useEffect(() => { if (statusOptions.length > 0 && !statusInit.current) { statusInit.current = true; setStatusFilter(statusOptions) } }, [statusOptions])

  const granularity = getGranularity(relStart, relEnd)

  const contaChartData = useMemo(() =>
    groupByPeriod(contas, (c: AccountResponse) => c.createdAt,
      (c: AccountResponse) => roleFilter.includes(c.role),
      relStart, relEnd, granularity),
    [contas, roleFilter, relStart, relEnd, granularity])

  const produtoChartData = useMemo(() =>
    groupByPeriod(produtos, (p: any) => p.createdAt,
      (p: any) => catFilter.includes(p.category),
      relStart, relEnd, granularity),
    [produtos, catFilter, relStart, relEnd, granularity])

  const pedidoChartData = useMemo(() =>
    groupByPeriod(pedidos, (p: any) => p.createdAt,
      (p: any) => statusFilter.includes(p.orderStatus),
      relStart, relEnd, granularity),
    [pedidos, statusFilter, relStart, relEnd, granularity])

  const roleLabeledOptions   = useMemo(() => roleOptions.map(v => ({ value: v, label: ACCOUNT_ROLE_LABEL[v as keyof typeof ACCOUNT_ROLE_LABEL] ?? v })),   [roleOptions])
  const catLabeledOptions    = useMemo(() => catOptions.map(v => ({ value: v, label: PRODUCT_CATEGORY.find(c => c.v === v)?.label ?? v })),                [catOptions])
  const statusLabeledOptions = useMemo(() => statusOptions.map(v => ({ value: v, label: ORDER_STATUS_LABEL[v as keyof typeof ORDER_STATUS_LABEL] ?? v })), [statusOptions])

  const activeLabeledOptions = grafico === 'contas' ? roleLabeledOptions : grafico === 'produtos' ? catLabeledOptions : statusLabeledOptions
  const activeFilter         = grafico === 'contas' ? roleFilter         : grafico === 'produtos' ? catFilter        : statusFilter
  const activeChartData      = grafico === 'contas' ? contaChartData     : grafico === 'produtos' ? produtoChartData : pedidoChartData

  function toggleActiveFilter(opt: string) {
    const toggle = (f: string[]) => f.includes(opt) ? f.filter(x => x !== opt) : [...f, opt]
    if (grafico === 'contas') setRoleFilter(toggle)
    else if (grafico === 'produtos') setCatFilter(toggle)
    else setStatusFilter(toggle)
  }

  function selectAllActiveFilter() {
    if (grafico === 'contas') setRoleFilter([...roleOptions])
    else if (grafico === 'produtos') setCatFilter([...catOptions])
    else setStatusFilter([...statusOptions])
  }

  const ABAS: [Aba, IconName, string, string][] = [
    ['resumo', 'resumo', '', 'Resumo'],
    ['usuarios', 'usuarios', 'Gerenciar ', 'Usuários'],
    ['produtos', 'produtos', 'Gerenciar ', 'Produtos'],
    ['pedidos', 'pedidos', 'Gerenciar ', 'Pedidos'],
  ]

  const nav = (
    <nav className="tabs" aria-label="Seções">
      {ABAS.map(([id, icon, prefixo, label]) => (
        <button key={id} type="button" className="tab" aria-pressed={aba === id} onClick={() => mudarAba(id)}>
          <Icon name={icon} />
          <span className="tab-label">
            {prefixo && <><span className="tab-label-long">{prefixo.trim()}</span>{' '}</>}
            {label}
          </span>
        </button>
      ))}
    </nav>
  )

  return (
    <AppShell nav={nav} badge="ADMIN">
      {aba === 'resumo' && (
        <>
          <PageHead title="Painel Administrativo" />
          <div className="stats stats-3">
            {[
              { icon: 'usuarios' as const, label: 'Usuários', val: usuarios.length },
              { icon: 'produtos' as const, label: 'Produtos', val: produtos.length },
              { icon: 'pedidos' as const, label: 'Pedidos', val: pedidos.length },
            ].map(st => (
              <div key={st.label} className="stat">
                <div className="stat-top"><span className="stat-label">{st.label}</span><Icon name={st.icon} /></div>
                <div className="stat-value">{st.val}</div>
              </div>
            ))}
          </div>

          <h2 className="section-title">Relatórios</h2>

          <div className="chips mb" role="group" aria-label="Relatório">
            {([['contas', 'Registros de Usuários'], ['produtos', 'Registros de Produtos'], ['pedidos', 'Registros de Pedidos']] as [Grafico, string][]).map(([id, label]) => (
              <button key={id} type="button" className="chip" aria-pressed={grafico === id} onClick={() => setGrafico(id)}>
                {label}
              </button>
            ))}
          </div>

          <div className="filters">
            <div className="field">
              <label htmlFor="rel-inicio">Período: de</label>
              <input id="rel-inicio" className="input" type="date" value={relStart} onChange={e => setRelStart(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="rel-fim">até</label>
              <input id="rel-fim" className="input" type="date" value={relEnd} onChange={e => setRelEnd(e.target.value)} />
            </div>
            <span className="tag tag-warning filters-tag">
              {granularity === 'day' ? 'por dia' : granularity === 'week' ? 'por semana' : granularity === 'month' ? 'por mês' : 'por ano'}
            </span>
          </div>

          {activeLabeledOptions.length > 0 && (
            <fieldset className="filters">
              <legend className="visually-hidden">Filtrar</legend>
              {activeLabeledOptions.map(({ value, label }) => (
                <label key={value} className="chip">
                  <input type="checkbox" checked={activeFilter.includes(value)} onChange={() => toggleActiveFilter(value)} />
                  {label}
                </label>
              ))}
              {activeFilter.length < activeLabeledOptions.length && (
                <button type="button" className="btn-link" onClick={selectAllActiveFilter}>Todos</button>
              )}
            </fieldset>
          )}

          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={activeChartData} margin={{ top: 22, right: 12, left: 0, bottom: 52 }}>
                <CartesianGrid vertical={false} stroke={cores.border} />
                <XAxis dataKey="date" tick={{ fill: cores.muted, fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke={cores.border} angle={-45} textAnchor="end" interval={estreito ? 'preserveStartEnd' : 0} minTickGap={2} />
                <YAxis allowDecimals={false} tick={{ fill: cores.muted, fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke={cores.border} width={32} />
                <Tooltip
                  cursor={{ fill: cores.head }}
                  contentStyle={{ background: cores.bg, border: `1px solid ${cores.border}`, borderRadius: 0, color: cores.text, fontSize: 12 }}
                  labelStyle={{ color: cores.text }}
                  itemStyle={{ color: cores.text }}
                  formatter={(v) => [v as number, 'Registros']}
                />
                <Bar dataKey="count" fill={cores.primary} isAnimationActive={false}>
                  <LabelList dataKey="count" position="top" style={{ fill: cores.text, fontSize: 11, fontWeight: 600, fontFamily: 'IBM Plex Mono' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {aba === 'usuarios' && (
        <>
          <PageHead title="Usuários cadastrados" />
          {loading && <Loading />}
          {!loading && (
            <section className="panel" aria-label="Usuários">
              {usuarios.length > 0 && (
                <table className="table">
                  <thead><tr>{['E-mail', 'Perfil', 'Criado em', 'Ações'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
                  <tbody>
                    {usuarios.map((u: any) => (
                      <tr key={u.id}>
                        <td className="cell-main break">{u.email}</td>
                        <td data-label="Perfil"><span className={`tag ${u.isAdmin ? 'tag-warning' : 'tag-neutral'}`}>{u.isAdmin ? 'Admin' : 'Usuário'}</span></td>
                        <td data-label="Criado em"><span className="num">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</span></td>
                        <td className="cell-actions">
                          <div className="btn-row">
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDesativarUsuario(u.id)}>Desativar</button>
                            <button type="button" className="btn btn-sm" onClick={() => handleAtivarUsuario(u.id)}>Ativar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {usuarios.length === 0 && <Empty icon="usuarios">Nenhum usuário encontrado.</Empty>}
            </section>
          )}
        </>
      )}

      {aba === 'produtos' && (
        <>
          <PageHead title="Todos os produtos" />
          {loading && <Loading />}
          {!loading && (
            <section className="panel" aria-label="Produtos">
              {produtos.length > 0 && (
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Descrição</th><th scope="col">Categoria</th><th scope="col">Escala</th>
                      <th scope="col" className="right">Preço</th><th scope="col" className="right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p: any) => (
                      <tr key={p.id}>
                        <td className="cell-main">{p.description}</td>
                        <td data-label="Categoria">{catLabel(p.category)}</td>
                        <td data-label="Escala">{escLabel(p.scale)}</td>
                        <td data-label="Preço" className="right"><span className="num nowrap">{fmtPreco(p.price)}</span></td>
                        <td className="cell-actions right">
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDeletarProduto(p.id)}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {produtos.length === 0 && <Empty icon="produtos">Nenhum produto encontrado.</Empty>}
            </section>
          )}
        </>
      )}

      {aba === 'pedidos' && (
        <>
          <PageHead title="Todos os pedidos" />
          {loading && <Loading />}
          {!loading && (
            <section className="panel" aria-label="Pedidos">
              {pedidos.length > 0 && (
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th><th scope="col">Status</th>
                      <th scope="col" className="right">Valor</th><th scope="col" className="right">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((p: any) => (
                      <tr key={p.id}>
                        <td className="cell-main"><span className="mono" title={String(p.id)}>{String(p.id).substring(0, 12)}…</span></td>
                        <td data-label="Status"><StatusPedido status={p.orderStatus} /></td>
                        <td data-label="Valor" className="right"><span className="num nowrap">{fmtPreco(p.price)}</span></td>
                        <td data-label="Criado em" className="right"><span className="num">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {pedidos.length === 0 && <Empty icon="pedidos">Nenhum pedido encontrado.</Empty>}
            </section>
          )}
        </>
      )}
    </AppShell>
  )
}
