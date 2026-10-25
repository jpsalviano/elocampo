import { useEffect, useState } from 'react';
import {
  buscarPedidoPorIdVendedor,
  finalizarPedidoVendedor,
} from '../../services/api';
import {
  type OrderResponse,
  type OrderStatusChangeInput,
  OrderStatusEnum,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ConversarButton } from '../../components/ConversarButton';
import { DetailPanel, Empty, Loading, PageHead, StatusPedido } from '../../components/ui';
import { fmtData, fmtNumero, fmtPreco } from '../../utils/format';

export default function MinhasVendas() {
  const { session } = useAuth();
  const [pedidos, setPedidos] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<OrderResponse | null>(null);

  useEffect(() => {
    const sellerId = session?.account?.id;
    sellerId &&
      buscarPedidoPorIdVendedor(sellerId)
        .then((p) => setPedidos(p.content))
        .catch(() => {})
        .finally(() => setLoading(false));
  }, [selecionado?.orderStatus]);

  // TODO: atualizar a listagem após a troca de status
  async function mudarSituacao(status: OrderStatusEnum, note: string) {
    const orderId = selecionado?.id;
    if (!orderId) return;
    const data: OrderStatusChangeInput = { status, note };
    await finalizarPedidoVendedor(orderId, data);
    setSelecionado((prev) => (prev ? { ...prev, orderStatus: status } : null));
  }

  const finalizarVenda = () => mudarSituacao(OrderStatusEnum.COMPLETED, 'Venda finalizada pelo produtor.');
  const cancelarVenda = () => mudarSituacao(OrderStatusEnum.CANCELLED, 'Venda cancelada pelo produtor.');

  return (
    <>
      <PageHead title="Minhas Vendas" sub={`${pedidos.length} pedido(s)`} />
      <div className={`split${selecionado ? ' open' : ''}`}>
        <section className="panel" aria-label="Lista de vendas">
          {loading && <Loading />}
          {!loading && pedidos.length === 0 && <Empty icon="vendas">Nenhuma venda ainda.</Empty>}
          {!loading && pedidos.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Pedido</th>
                  <th scope="col">Data</th>
                  <th scope="col" className="right">Valor</th>
                  <th scope="col" className="center">Status</th>
                  <th scope="col" className="right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((o) => (
                  <tr key={o.id} className={selecionado?.id === o.id ? 'selected' : undefined}>
                    <td className="cell-main"><span className="mono" title={o.id}>{o.id.substring(0, 12)}…</span></td>
                    <td data-label="Data"><span className="num">{fmtData(o.createdAt)}</span></td>
                    <td data-label="Valor" className="right"><span className="num nowrap">{fmtPreco(o.price)}</span></td>
                    <td data-label="Status" className="center"><StatusPedido status={o.orderStatus} /></td>
                    <td className="cell-actions right">
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-expanded={selecionado?.id === o.id}
                        onClick={() => setSelecionado(selecionado?.id === o.id ? null : o)}
                      >
                        {selecionado?.id === o.id ? 'Fechar' : 'Detalhes'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selecionado && (
          <DetailPanel title={<>Pedido — <span className="num">{fmtPreco(selecionado.price)}</span></>} onClose={() => setSelecionado(null)}>
            <div>
              <StatusPedido status={selecionado.orderStatus} />
              <p className="muted">{selecionado.products.length} item(s) no pedido</p>
            </div>
            <ul className="items" aria-label="Itens do pedido">
              {selecionado.products.map((item, i) => (
                <li key={i}>
                  <span>{item.description}</span>
                  <span className="num nowrap">{fmtNumero(item.quantity)} × {fmtPreco(item.price)}</span>
                </li>
              ))}
            </ul>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={finalizarVenda}>
                Finalizar venda
              </button>
              <button type="button" className="btn btn-danger" onClick={cancelarVenda}>
                Cancelar
              </button>
            </div>
            <div className="detail-section">
              <h3>Comprador</h3>
              <ConversarButton outroAccountId={selecionado.buyerAccountId} base="/produtor/mensagens" />
            </div>
          </DetailPanel>
        )}
      </div>
    </>
  );
}
