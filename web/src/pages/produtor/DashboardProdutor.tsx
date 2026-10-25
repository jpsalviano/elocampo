import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buscarContaPorId,
  buscarPedidoPorIdComprador,
  buscarPedidoPorIdVendedor,
  buscarProdutos,
  buscarProdutosPorVendedor,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  AccountResponse,
  OrderResponse,
  OrderStatusEnum,
  type ProductResponse,
} from '../../types';
import { Icon } from '../../components/Icon';
import { Empty, Loading, PageHead } from '../../components/ui';
import { catLabel, fmtPreco, unidade } from '../../utils/format';

export default function DashboardProdutor() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>();
  const [conta, setConta] = useState<AccountResponse>();
  const [evaluation, setEvaluation] = useState<number>();
  const [produtos, setProdutos] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    var accountId = session?.account?.id;

    accountId &&
      Promise.allSettled([
        buscarContaPorId(accountId).then((a) => {
          setConta(a);
          var evaluation = a?.evaluation?.reduce((sum, a) => sum + a.stars, 0) ?? 0;

          setEvaluation(0);

          if (evaluation != 0 && a.evaluation) {
            var evaluationMean = evaluation / a.evaluation.length;
            setEvaluation(evaluationMean);
          }
        }),

        buscarProdutosPorVendedor(accountId).then((p) => setProdutos(p)),
        buscarPedidoPorIdVendedor(accountId).then((o) => setOrders(o.content)),
      ]).finally(() => setLoading(false));
  }, []);

  const ativos = produtos.filter((p) => p.status === 'AVAILABLE').length;

  return (
    <>
      <PageHead
        title="Início"
        sub={`Olá, ${session?.account?.name ?? session?.email}!`}
        actions={<Link to="/produtor/produtos" className="btn btn-primary">+ Novo produto</Link>}
      >
        {session?.account?.businessName && <p className="page-sub">{session.account.businessName}</p>}
      </PageHead>

      <div className="stats">
        <div className="stat">
          <div className="stat-top"><span className="stat-label">Produtos ativos</span><Icon name="produtos" /></div>
          <div className="stat-value">{ativos}</div>
        </div>
        <div className="stat">
          <div className="stat-top"><span className="stat-label">Total cadastrado</span><Icon name="catalogo" /></div>
          <div className="stat-value">{produtos.length}</div>
        </div>
        <div className="stat">
          <div className="stat-top"><span className="stat-label">Em negociação</span><Icon name="mensagens" /></div>
          <div className="stat-value">
            {orders?.filter((o) => OrderStatusEnum.PENDING === o.orderStatus).length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top"><span className="stat-label">Avaliações</span><Icon name="estrela" /></div>
          <div className="stat-value accent">{evaluation?.toFixed(1)}</div>
        </div>
      </div>

      <section className="panel" aria-labelledby="recentes">
        <div className="panel-head">
          <h2 id="recentes">Produtos recentes</h2>
          <Link to="/produtor/produtos">Ver todos →</Link>
        </div>
        {loading && <Loading />}
        {!loading && produtos.length === 0 && (
          <Empty icon="produtos">
            <p>Nenhum produto ainda.</p>
            <Link to="/produtor/produtos" className="btn btn-primary btn-sm">
              Adicionar primeiro produto
            </Link>
          </Empty>
        )}
        {!loading && produtos.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Descrição</th>
                <th scope="col">Categoria</th>
                <th scope="col" className="center">Status</th>
                <th scope="col" className="right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {produtos.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td className="cell-main">{p.description}</td>
                  <td data-label="Categoria">{catLabel(p.category)}</td>
                  <td data-label="Status" className="center">
                    {p.status === 'AVAILABLE'
                      ? <span className="tag tag-success">Disponível</span>
                      : <span className="tag tag-neutral">Indisponível</span>}
                  </td>
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
  );
}
