import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarProdutos, buscarPedidoPorIdComprador, buscarAvaliacoesConta } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { OrderResponse, OrderStatusEnum, type ProductResponse } from '../../types'
import { Icon, type IconName } from '../../components/Icon'
import { Empty, PageHead } from '../../components/ui'
import { catLabel, fmtPreco, unidade } from '../../utils/format'

export default function DashboardComprador() {
  const { session } = useAuth()
  const [orders, setOrders] = useState<OrderResponse[]>();
  const [produtos, setProdutos] = useState<ProductResponse[]>([])
  const [totalPedidos, setTotalPedidos]   = useState(0)
  const [evaluation, setEvaluation] = useState<number>(0)
  const [loading, setLoading]             = useState(true)

  useEffect(() => {

    const buyerId = session?.account?.id;

    buyerId &&
    Promise.allSettled([
      // O catálogo só traz produtos disponíveis.
      buscarProdutos().then(setProdutos),
      buscarPedidoPorIdComprador(buyerId).then(p => {
        setOrders(p.content)
        setTotalPedidos(p.totalElements)
      }),
    buscarAvaliacoesConta(buyerId).then((evaluations) => {
        if (evaluations && evaluations.length > 0) {
          const avg = evaluations.reduce((sum, e) => sum + e.stars, 0) / evaluations.length;
          setEvaluation(avg);
        } else {
          setEvaluation(0);
        }
      }),
    ]).finally(() => setLoading(false))

  }, [])

  const stats: { icon: IconName; val: string | number | undefined; lbl: string; accent?: boolean }[] = [
    { icon: 'catalogo', val: loading ? '…' : produtos.length, lbl: 'Disponíveis' },
    { icon: 'pedidos', val: loading ? '…' : totalPedidos, lbl: 'Meus pedidos' },
    { icon: 'mensagens', val: loading ? '…' : orders?.filter(o => OrderStatusEnum.PENDING === o.orderStatus).length, lbl: 'Em negociação' },
    { icon: 'estrela', val: loading ? '…' : evaluation.toFixed(1), lbl: 'Avaliações', accent: true },
  ]

  const recentes = [...produtos].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)

  return (
    <>
      <PageHead
        title="Início"
        sub={`Olá, ${session?.account?.name ?? session?.email}!`}
        actions={<Link to="/comprador/produtos" className="btn btn-primary"><Icon name="busca" size={16} />Buscar produtos</Link>}
      >
        {session?.account?.businessName && <p className="page-sub">{session.account.businessName}</p>}
      </PageHead>

      <div className="stats">
        {stats.map(s => (
          <div key={s.lbl} className="stat">
            <div className="stat-top"><span className="stat-label">{s.lbl}</span><Icon name={s.icon} /></div>
            <div className={`stat-value${s.accent ? ' accent' : ''}`}>{s.val}</div>
          </div>
        ))}
      </div>

      <section className="panel" aria-labelledby="disponiveis">
        <div className="panel-head">
          <h2 id="disponiveis">Produtos disponíveis</h2>
          <Link to="/comprador/produtos">Ver todos →</Link>
        </div>
        {produtos.length === 0 ? (
          <Empty icon="catalogo">
            Use a seção <strong>Catálogo</strong> para buscar e fazer pedidos.
          </Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Categoria</th>
                <th scope="col" className="right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map(p => (
                <tr key={p.id}>
                  <td className="cell-main"><span className="catalog-name">{p.description}</span><span className="catalog-place">{p.vendorCity}/{p.vendorState}</span></td>
                  <td data-label="Categoria">{catLabel(p.category)}</td>
                  <td data-label="Preço" className="right">
                    <span className="num nowrap">{fmtPreco(p.price)}/{unidade(p.scale)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
