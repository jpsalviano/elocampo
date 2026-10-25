import { useEffect, useState } from 'react';
import {
  buscarPedidoPorIdComprador,
  criarAvaliacaoProduto,
  buscarProdutoPorId,
} from '../../services/api';
import type { OrderResponse, ProductEvaluation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ConversarButton } from '../../components/ConversarButton';
import { Icon } from '../../components/Icon';
import { DetailPanel, Empty, Loading, PageHead, Stars, StatusPedido } from '../../components/ui';
import { fmtData, fmtNumero, fmtPreco } from '../../utils/format';

export default function MeusPedidos() {
  const { session } = useAuth();
  const [pedidos, setPedidos] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSel] = useState<OrderResponse | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, ProductEvaluation[]>>({});
  const [avaliandoProduto, setAvaliandoProduto] = useState<string | null>(null);
  const [estrelasAvaliacao, setEstrelasAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  useEffect(() => {
    const buyerId = session?.account?.id;

    buyerId &&
      buscarPedidoPorIdComprador(buyerId)
        .then((p) => setPedidos(p.content))
        .catch(() => {})
        .finally(() => setLoading(false));
  }, []);

  async function selecionarPedido(pedido: OrderResponse | null) {
    setSel(pedido);
    setAvaliandoProduto(null);
    setEstrelasAvaliacao(5);
    setComentarioAvaliacao('');

    if (pedido && pedido.orderStatus === 'COMPLETED') {
      const resultados = await Promise.all(
        pedido.products.map((item) =>
          buscarProdutoPorId(item.productId).catch(() => null),
        ),
      );
      const novasAvaliacoes: Record<string, ProductEvaluation[]> = {};
      pedido.products.forEach((item, index) => {
        novasAvaliacoes[item.productId] = resultados[index]?.evaluations ?? [];
      });
      setAvaliacoes(novasAvaliacoes);
    }
  }

  async function enviarAvaliacao(produtoId: string) {
    if (!selecionado) return;

    const buyerId = session?.account?.id;

    if (!buyerId) {
      return;
    }

    setEnviandoAvaliacao(true);
    try {
      let evaluation: ProductEvaluation = {
        stars: estrelasAvaliacao,
        content: comentarioAvaliacao.trim() || undefined,
        reviewerAccountId: buyerId,
      };

      await criarAvaliacaoProduto(produtoId, evaluation);

      const produto = await buscarProdutoPorId(produtoId);
      setAvaliacoes((prev) => ({ ...prev, [produtoId]: produto.evaluations ?? [] }));

      setAvaliandoProduto(null);
      setComentarioAvaliacao('');
      setEstrelasAvaliacao(5);
    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err);
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  return (
    <>
      <PageHead title="Meus Pedidos" sub={`${pedidos.length} pedido(s)`} />
      <div className={`split${selecionado ? ' open' : ''}`}>
        <section className="panel" aria-label="Lista de pedidos">
          {loading && <Loading />}
          {!loading && pedidos.length === 0 && <Empty icon="pedidos">Nenhum pedido ainda.</Empty>}
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
                {pedidos.map((p) => (
                  <tr key={p.id} className={selecionado?.id === p.id ? 'selected' : undefined}>
                    <td className="cell-main"><span className="mono" title={p.id}>{p.id.substring(0, 12)}…</span></td>
                    <td data-label="Data"><span className="num">{fmtData(p.createdAt)}</span></td>
                    <td data-label="Valor" className="right"><span className="num nowrap">{fmtPreco(p.price)}</span></td>
                    <td data-label="Status" className="center"><StatusPedido status={p.orderStatus} /></td>
                    <td className="cell-actions right">
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-expanded={selecionado?.id === p.id}
                        onClick={() => selecionarPedido(selecionado?.id === p.id ? null : p)}
                      >
                        {selecionado?.id === p.id ? 'Fechar' : 'Detalhes'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selecionado && (
          <DetailPanel title={<>Pedido — <span className="num">{fmtPreco(selecionado.price)}</span></>} onClose={() => selecionarPedido(null)}>
            <div>
              <StatusPedido status={selecionado.orderStatus} />
              <p className="muted">{selecionado.products.length} item(s)</p>
            </div>
            <ul className="items" aria-label="Itens do pedido">
              {selecionado.products.map((item, i) => (
                <li key={i}>
                  <span>{item.description}</span>
                  <span className="num nowrap">{fmtNumero(item.quantity)} × {fmtPreco(item.price)}</span>
                </li>
              ))}
            </ul>

            <div className="detail-section">
              <h3>Produtor</h3>
              <ConversarButton outroAccountId={selecionado.sellerAccountId} base="/comprador/mensagens" />
            </div>

            {selecionado?.orderStatus === 'COMPLETED' && (
              <div className="detail-section">
                <h3>Avaliações</h3>

                {selecionado.products.map((item) => {
                  const produtoAvaliacoes = avaliacoes[item.productId] || [];
                  const mediaAvaliacoes =
                    produtoAvaliacoes.length > 0
                      ? produtoAvaliacoes.reduce((sum, a) => sum + a.stars, 0) / produtoAvaliacoes.length
                      : 0;

                  return (
                    <div key={item.productId} className="form-grid mb">
                      <strong>{item.description}</strong>

                      {produtoAvaliacoes.length > 0 && (
                        <div>
                          <p className="muted">
                            Média: <Stars value={mediaAvaliacoes} />{' '}
                            <span className="num">{mediaAvaliacoes.toFixed(1)}</span> ({produtoAvaliacoes.length}{' '}
                            avaliação{produtoAvaliacoes.length !== 1 ? 'ões' : ''})
                          </p>
                          {produtoAvaliacoes.slice(0, 3).map((avaliacao) => (
                            <div key={avaliacao.id} className="review">
                              <Stars value={avaliacao.stars} />
                              {avaliacao.content && <p>{avaliacao.content}</p>}
                            </div>
                          ))}
                          {produtoAvaliacoes.length > 3 && (
                            <p className="muted">
                              +{produtoAvaliacoes.length - 3} avaliação
                              {produtoAvaliacoes.length - 3 !== 1 ? 'ões' : ''}...
                            </p>
                          )}
                        </div>
                      )}

                      {avaliandoProduto === item.productId ? (
                        <div className="panel">
                          <div className="panel-head">Sua avaliação</div>
                          <div className="panel-body form-grid">
                            <fieldset>
                              <legend>Nota</legend>
                              <div>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    className={`star-btn${star <= estrelasAvaliacao ? ' on' : ''}`}
                                    aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                                    aria-pressed={star === estrelasAvaliacao}
                                    onClick={() => setEstrelasAvaliacao(star)}
                                  >
                                    <Icon name="estrela" size={22} fill={star <= estrelasAvaliacao} />
                                  </button>
                                ))}
                              </div>
                            </fieldset>

                            <div className="field">
                              <label htmlFor={`comentario-${item.productId}`}>Comentário</label>
                              <textarea
                                id={`comentario-${item.productId}`}
                                className="textarea"
                                placeholder="Comentário opcional..."
                                value={comentarioAvaliacao}
                                onChange={(e) => setComentarioAvaliacao(e.target.value)}
                                maxLength={300}
                              />
                            </div>

                            <div className="btn-row">
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => enviarAvaliacao(item.productId)}
                                disabled={enviandoAvaliacao}
                              >
                                {enviandoAvaliacao ? 'Enviando...' : 'Enviar'}
                              </button>
                              <button type="button" className="btn" onClick={() => setAvaliandoProduto(null)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="btn btn-block" onClick={() => setAvaliandoProduto(item.productId)}>
                          {produtoAvaliacoes.length > 0 ? 'Avaliar novamente' : 'Avaliar produto'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </DetailPanel>
        )}
      </div>
    </>
  );
}
