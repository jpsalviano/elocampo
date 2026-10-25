import { useEffect, useState } from 'react';
import {
  buscarProdutos,
  criarPedido,
  buscarArquivosPorEntidade,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  type ProductResponse,
  type ProductCategory,
  type FileUploadResponse,
  PRODUCT_CATEGORY,
} from '../../types';
import { Icon } from '../../components/Icon';
import { DetailPanel, Empty, Gallery, Loading, PageHead } from '../../components/ui';
import { catLabel, escLabel, fmtNumero, fmtPreco, unidade } from '../../utils/format';

export default function BuscarProdutos() {
  const { session } = useAuth();
  const [resultado, setResultado] = useState<ProductResponse[] | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const totalPages = resultado ? Math.ceil(resultado.length / PAGE_SIZE) : 0;
  const paginaAtual = resultado
    ? resultado.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : [];
  const [loading, setLoading] = useState(false);
  const [detalhe, setDetalhe] = useState<ProductResponse | null>(null);
  const [qtd, setQtd] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<ProductCategory | ''>('');
  const [imagens, setImagens] = useState<FileUploadResponse[]>([]);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    if (!detalhe) {
      setImagens([]);
      setCarouselIdx(0);
      return;
    }
    buscarArquivosPorEntidade('PRODUCT', detalhe.id)
      .then(setImagens)
      .catch(() => {});
  }, [detalhe?.id]);

  function fetchProdutos(description?: string, category?: ProductCategory | '') {
    setLoading(true);
    buscarProdutos({
      ...(description ? { description } : {}),
      ...(category ? { category } : {}),
    })
      .then(setResultado)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    fetchProdutos(busca, categoriaAtiva);
  }

  function handleCategoria(cat: ProductCategory | '') {
    setCategoriaAtiva(cat);
    setPage(0);
    fetchProdutos(busca, cat);
  }

  async function handleFazerPedido() {
    if (!detalhe || !qtd) {
      setErro('Informe a quantidade');
      return;
    }
    if (!session?.account?.id) {
      setErro('Conta não encontrada');
      return;
    }
    setErro('');
    setEnviando(true);
    setSucesso(false);
    try {
      await criarPedido({
        buyerAccountId: session.account.id,
        sellerAccountId: detalhe.vendorAccountId,
        productsIds: [
          {
            productId: detalhe.id,
            description: detalhe.description,
            quantity: Number(qtd),
            price: detalhe.price,
          },
        ],
      });
      setSucesso(true);
      setQtd('');
    } catch (err: any) {
      setErro(err.response?.data?.message ?? 'Erro ao criar pedido');
    } finally {
      setEnviando(false);
    }
  }

  const abrir = (p: ProductResponse) => {
    setDetalhe(detalhe?.id === p.id ? null : p);
    setSucesso(false);
    setErro('');
    setQtd('');
  };

  const total = detalhe && Number(qtd) > 0 ? Number(qtd) * detalhe.price : null;

  return (
    <>
      <PageHead title="Produtos disponíveis" sub={resultado ? `${resultado.length} produto(s)` : 'Buscando...'} />

      <div className="searchbar">
        <div className="chips" role="group" aria-label="Categoria">
          <button type="button" className="chip" aria-pressed={categoriaAtiva === ''} onClick={() => handleCategoria('')}>
            Todas
          </button>
          {PRODUCT_CATEGORY.map((c) => (
            <button
              key={c.v}
              type="button"
              className="chip"
              aria-pressed={categoriaAtiva === c.v}
              onClick={() => handleCategoria(c.v)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleBuscar} role="search">
          <label htmlFor="busca" className="visually-hidden">Buscar produto</label>
          <input
            id="busca"
            className="input"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
          />
          <button type="submit" className="btn btn-primary">
            <Icon name="busca" size={16} />
            Buscar
          </button>
        </form>
      </div>

      <div className={`split${detalhe ? ' open' : ''}`}>
        <section aria-label="Resultados">
          {loading && <div className="panel"><Loading>Buscando...</Loading></div>}
          {!loading && paginaAtual.length === 0 && (
            <div className="panel"><Empty icon="busca">Nenhum produto encontrado.</Empty></div>
          )}
          {!loading && paginaAtual.length > 0 && (
            <div className="catalog">
              <div className="catalog-head" aria-hidden="true">
                <span />
                <span>Produto</span>
                <span className="catalog-cat">Categoria</span>
                <span className="catalog-stock">Estoque</span>
                <span className="catalog-price">Preço</span>
              </div>
              <ul>
                {paginaAtual.map((p: ProductResponse) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="catalog-row"
                      aria-current={detalhe?.id === p.id}
                      aria-label={`${p.description}, ${p.vendorCity}/${p.vendorState}, ${fmtNumero(p.quantity)} ${unidade(p.scale)} em estoque, ${fmtPreco(p.price)} por ${unidade(p.scale)}`}
                      onClick={() => abrir(p)}
                    >
                      <Miniatura produtoId={p.id} />
                      <span>
                        <span className="catalog-name">{p.description}</span>
                        <span className="catalog-place">{p.vendorCity}/{p.vendorState}</span>
                      </span>
                      <span className="catalog-cat">{catLabel(p.category)}</span>
                      <span className="catalog-stock num">{fmtNumero(p.quantity)} {unidade(p.scale)}</span>
                      <span className="catalog-price">
                        <span className="num nowrap">{fmtPreco(p.price)}</span>
                        <span className="unit">/{unidade(p.scale)}</span>
                        <span className="catalog-stock-m num">{fmtNumero(p.quantity)} {unidade(p.scale)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <nav className="pagination" aria-label="Páginas">
                  <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <Icon name="voltar" size={14} />
                    Anterior
                  </button>
                  <span className="num muted">
                    Pág. {page + 1} / {totalPages}
                  </span>
                  <button type="button" className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    Próxima
                    <Icon name="avancar" size={14} />
                  </button>
                </nav>
              )}
            </div>
          )}
        </section>

        {detalhe && (
          <DetailPanel title={detalhe.description} onClose={() => setDetalhe(null)}>
            <p className="muted">{detalhe.vendorCity}, {detalhe.vendorState}</p>

            <Gallery imagens={imagens} idx={carouselIdx} setIdx={setCarouselIdx} alt={detalhe.description} />

            <dl className="dl">
              <div><dt>Categoria</dt><dd>{catLabel(detalhe.category)}</dd></div>
              <div><dt>Escala</dt><dd>{escLabel(detalhe.scale)}</dd></div>
              <div><dt>Quantidade disponível</dt><dd className="num">{fmtNumero(detalhe.quantity)} {unidade(detalhe.scale)}</dd></div>
              <div><dt>Preço unitário</dt><dd className="num">{fmtPreco(detalhe.price)}/{unidade(detalhe.scale)}</dd></div>
              <div><dt>Status</dt><dd>Disponível</dd></div>
            </dl>

            {sucesso ? (
              <div className="detail-section">
                <div className="alert alert-success" role="status">
                  <Icon name="check" size={16} />
                  Pedido criado com sucesso!
                </div>
                <button type="button" className="btn btn-block" onClick={() => setSucesso(false)}>
                  Fazer outro pedido
                </button>
              </div>
            ) : (
              <form
                className="detail-section form-grid"
                onSubmit={(e) => { e.preventDefault(); handleFazerPedido(); }}
              >
                <h3>Fazer pedido</h3>
                {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
                <div className="field">
                  <label htmlFor="pedido-qtd">Quantidade ({unidade(detalhe.scale)})</label>
                  <input
                    id="pedido-qtd"
                    className="input num"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={detalhe.quantity}
                    value={qtd}
                    onChange={(e) => setQtd(e.target.value)}
                    placeholder="Ex: 100"
                  />
                </div>
                {total !== null && (
                  <p className="muted">Total estimado: <span className="num">{fmtPreco(total)}</span></p>
                )}
                <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
                  {enviando ? 'Criando pedido...' : 'Fazer pedido'}
                </button>
              </form>
            )}
          </DetailPanel>
        )}
      </div>
    </>
  );
}

// Miniatura da primeira foto do produto; guarda o resultado para não buscar de novo.
const fotos = new Map<string, Promise<string | null>>();

function Miniatura({ produtoId }: { produtoId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!fotos.has(produtoId))
      fotos.set(produtoId, buscarArquivosPorEntidade('PRODUCT', produtoId).then((a) => a?.[0]?.secureUrl ?? null).catch(() => null));
    fotos.get(produtoId)!.then((u) => { if (vivo) setUrl(u); });
    return () => { vivo = false; };
  }, [produtoId]);
  return (
    <span className="thumb">
      {url ? <img src={url} alt="" loading="lazy" /> : <Icon name="imagem" size={22} />}
    </span>
  );
}
