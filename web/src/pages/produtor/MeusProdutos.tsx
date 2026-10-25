import { useEffect, useRef, useState } from 'react';
import {
  buscarProdutosPorVendedor,
  criarProduto,
  deletarProduto,
  ativarProduto,
  desativarProduto,
  buscarArquivosPorEntidade,
  uploadArquivo,
  deletarArquivo,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  type ProductResponse,
  type ProductCategory,
  type ProductScale,
  type FileUploadResponse,
  PRODUCT_CATEGORY,
  PRODUCT_SCALE,
} from '../../types';

import { Icon } from '../../components/Icon';
import { DetailPanel, Empty, Gallery, Loading, Modal, PageHead, Stars } from '../../components/ui';
import { catLabel, escLabel, fmtData, fmtNumero, fmtPreco, unidade } from '../../utils/format';

export default function MeusProdutos() {
  const { session } = useAuth();
  const vendorId = session?.account?.id;

  const [produtos, setProdutos] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<ProductResponse | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    description: '',
    category: '' as ProductCategory,
    scale: '' as ProductScale,
    quantity: 0 as number,
    price: '',
    availabilityDate: '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [produtoCriado, setProdutoCriado] = useState<ProductResponse | null>(null);
  const [imagens, setImagens] = useState<FileUploadResponse[]>([]);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [uploadandoImg, setUploadandoImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    buscarProdutosPorVendedor(vendorId)
      .then(setProdutos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vendorId]);

  useEffect(() => {
    if (!selecionado) {
      setImagens([]);
      setCarouselIdx(0);
      return;
    }
    buscarArquivosPorEntidade('PRODUCT', selecionado.id)
      .then(setImagens)
      .catch(() => {});
  }, [selecionado?.id]);

  async function handleUploadImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = selecionado?.id ?? produtoCriado?.id;
    if (!file || !targetId) return;
    if (imagens.length >= 5) return;
    setUploadandoImg(true);
    try {
      const novo = await uploadArquivo(file, 'PRODUCT', targetId);
      setImagens((prev) => {
        setCarouselIdx(prev.length);
        return [...prev, novo];
      });
    } catch {
      /* user can retry */
    } finally {
      setUploadandoImg(false);
      e.target.value = '';
    }
  }

  async function handleDeletarImagem(imgId: string) {
    await deletarArquivo(imgId);
    setImagens((prev) => {
      const next = prev.filter((i) => i.id !== imgId);
      setCarouselIdx((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  }

  async function handlePublicar() {
    if (
      !form.description ||
      !form.category ||
      !form.scale ||
      !form.price ||
      !form.availabilityDate
    ) {
      setErro('Preencha todos os campos obrigatórios');
      return;
    }
    if (!vendorId) {
      setErro('Conta não encontrada');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      const novo = await criarProduto({
        vendorAccountId: vendorId,
        description: form.description,
        category: form.category,
        scale: form.scale,
        quantity: Number(form.quantity),
        price: Number(form.price),
        availabilityDate: new Date(form.availabilityDate).getTime(),
      });
      setProdutos((p) => [novo, ...p]);
      setProdutoCriado(novo);
      setImagens([]);
      setCarouselIdx(0);
      setForm({
        description: '',
        category: '' as ProductCategory,
        scale: '' as ProductScale,
        quantity: 0 as number,
        price: '',
        availabilityDate: '',
      });
    } catch (err: any) {
      setErro(err.response?.data?.message ?? 'Erro ao publicar produto');
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleStatus(produto: ProductResponse) {
    setToggleLoading(true);
    try {
      if (produto.status === 'AVAILABLE') {
        await desativarProduto(produto.id);
        const atualizado: ProductResponse = { ...produto, status: 'UNAVAILABLE' };
        setProdutos((p) => p.map((x) => (x.id === produto.id ? atualizado : x)));
        setSelecionado(atualizado);
      } else {
        await ativarProduto(produto.id);
        const atualizado: ProductResponse = { ...produto, status: 'AVAILABLE' };
        setProdutos((p) => p.map((x) => (x.id === produto.id ? atualizado : x)));
        setSelecionado(atualizado);
      }
    } catch {
      /* status reverts on next fetch */
    } finally {
      setToggleLoading(false);
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm('Remover este produto?')) return;
    await deletarProduto(id);
    setProdutos((p) => p.filter((x) => x.id !== id));
    if (selecionado?.id === id) setSelecionado(null);
  }

  const fecharForm = () => {
    setMostrarForm(false);
    setProdutoCriado(null);
    setImagens([]);
  };

  const inputArquivo = (
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleUploadImagem} />
  );

  const botaoAdicionarImagem = imagens.length < 5 && (
    <button type="button" className="btn btn-sm" disabled={uploadandoImg} onClick={() => fileInputRef.current?.click()}>
      <Icon name="mais" size={14} />
      {uploadandoImg ? 'Enviando...' : 'Adicionar'}
    </button>
  );

  return (
    <>
      <PageHead
        title="Meus Produtos"
        sub={`${produtos.length} produto(s) cadastrado(s)`}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setMostrarForm((f) => !f);
              setSelecionado(null);
              setProdutoCriado(null);
              setImagens([]);
            }}
          >
            + Adicionar produto
          </button>
        }
      />

      {mostrarForm && (
        <Modal title={produtoCriado ? `Imagens — ${produtoCriado.description}` : 'Novo produto'} onClose={fecharForm}>
          {produtoCriado ? (
            <div className="form-grid">
              <div className="panel-head">
                <span>Adicionar imagens ({imagens.length}/5)</span>
                {botaoAdicionarImagem}
              </div>
              {inputArquivo}
              {imagens.length === 0 ? (
                <p className="muted">Nenhuma imagem adicionada ainda.</p>
              ) : (
                <Gallery imagens={imagens} idx={carouselIdx} setIdx={setCarouselIdx} alt={produtoCriado.description} onRemove={handleDeletarImagem} />
              )}
              <button type="button" className="btn btn-primary" onClick={fecharForm}>
                Concluir
              </button>
            </div>
          ) : (
            <div className="form-grid">
              {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
              <div className="field">
                <label htmlFor="prod-descricao">Descrição</label>
                <input
                  id="prod-descricao"
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Soja em grão, safra 2025"
                />
              </div>
              <fieldset>
                <legend>Categoria</legend>
                <div className="chips">
                  {PRODUCT_CATEGORY.map((c) => (
                    <button
                      type="button"
                      key={c.v}
                      className="chip"
                      aria-pressed={form.category === c.v}
                      onClick={() => setForm((f) => ({ ...f, category: c.v }))}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Escala</legend>
                <div className="chips">
                  {PRODUCT_SCALE.map((s) => (
                    <button
                      type="button"
                      key={s.v}
                      className="chip"
                      aria-pressed={form.scale === s.v}
                      onClick={() => setForm((f) => ({ ...f, scale: s.v }))}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid-3">
                <div className="field">
                  <label htmlFor="prod-quantidade">Quantidade (volume)</label>
                  <input
                    id="prod-quantidade"
                    className="input num"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="field">
                  <label htmlFor="prod-preco">Preço (R$)</label>
                  <input
                    id="prod-preco"
                    className="input num"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="field">
                  <label htmlFor="prod-data">Disponível a partir de</label>
                  <input
                    id="prod-data"
                    className="input"
                    type="date"
                    value={form.availabilityDate}
                    onChange={(e) => setForm((f) => ({ ...f, availabilityDate: e.target.value }))}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary" onClick={handlePublicar} disabled={salvando}>
                {salvando ? 'Publicando...' : 'Publicar produto'}
              </button>
            </div>
          )}
        </Modal>
      )}

      <div className={`split${selecionado ? ' open' : ''}`}>
        <section className="panel" aria-label="Lista de produtos">
          {loading && <Loading />}
          {!loading && produtos.length === 0 && <Empty icon="produtos">Nenhum produto cadastrado ainda.</Empty>}
          {!loading && produtos.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Descrição</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Status</th>
                  <th scope="col">Escala</th>
                  <th scope="col" className="right">Estoque</th>
                  <th scope="col" className="right">Preço</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr
                    key={p.id}
                    className={`clickable${selecionado?.id === p.id ? ' selected' : ''}`}
                    onClick={() => {
                      setSelecionado(p);
                      setMostrarForm(false);
                    }}
                  >
                    <td className="cell-main">
                      <button type="button" className="row-btn" aria-expanded={selecionado?.id === p.id}>{p.description}</button>
                    </td>
                    <td data-label="Categoria">{catLabel(p.category)}</td>
                    <td data-label="Status">
                      <span className={`tag ${p.status === 'AVAILABLE' ? 'tag-success' : 'tag-danger'}`}>
                        {p.status === 'AVAILABLE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td data-label="Escala">{escLabel(p.scale)}</td>
                    <td data-label="Estoque" className="right"><span className="num">{fmtNumero(p.quantity)} {unidade(p.scale)}</span></td>
                    <td data-label="Preço" className="right"><span className="num nowrap">{fmtPreco(p.price)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selecionado && (
          <DetailPanel title="Detalhes" closeLabel="Fechar detalhes" onClose={() => setSelecionado(null)}>
            <div>
              <div className="panel-head">
                <span>Imagens ({imagens.length}/5)</span>
                {botaoAdicionarImagem}
              </div>
              {inputArquivo}
              {imagens.length === 0
                ? <p className="muted pad-y">Nenhuma imagem adicionada.</p>
                : <Gallery imagens={imagens} idx={carouselIdx} setIdx={setCarouselIdx} alt={selecionado.description} onRemove={handleDeletarImagem} />}
            </div>

            <dl className="dl">
              <div><dt>Descrição</dt><dd>{selecionado.description}</dd></div>
              <div><dt>Categoria</dt><dd>{catLabel(selecionado.category)}</dd></div>
              <div><dt>Escala</dt><dd>{escLabel(selecionado.scale)}</dd></div>
              <div><dt>Quantidade (volume)</dt><dd className="num">{fmtNumero(selecionado.quantity)}</dd></div>
              <div><dt>Preço</dt><dd className="num">{fmtPreco(selecionado.price)}</dd></div>
              <div>
                <dt>Avaliação (nota)</dt>
                <dd className="num">
                  {selecionado.evaluations?.length
                    ? (selecionado.evaluations.reduce((s, a) => s + a.stars, 0) / selecionado.evaluations.length).toFixed(1)
                    : '—'}
                </dd>
              </div>
              <div><dt>Disponível a partir de</dt><dd className="num">{fmtData(selecionado.availabilityDate)}</dd></div>
              <div><dt>Cidade / Estado</dt><dd>{`${selecionado.vendorCity} – ${selecionado.vendorState}`}</dd></div>
              <div><dt>Cadastrado em</dt><dd className="num">{fmtData(selecionado.createdAt)}</dd></div>
              <div><dt>Atualizado em</dt><dd className="num">{fmtData(selecionado.updatedAt)}</dd></div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`tag ${selecionado.status === 'AVAILABLE' ? 'tag-success' : 'tag-danger'}`}>
                    {selecionado.status === 'AVAILABLE' ? 'Ativo' : 'Inativo'}
                  </span>
                </dd>
              </div>
            </dl>

            {selecionado.evaluations && selecionado.evaluations.length > 0 && (
              <div className="detail-section">
                <h3>Avaliações ({selecionado.evaluations.length})</h3>
                {selecionado.evaluations.map((ev) => (
                  <div key={ev.id} className="review">
                    <Stars value={ev.stars} />
                    {ev.content && <p>{ev.content}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="btn-row">
              <button
                type="button"
                className={`btn ${selecionado.status === 'AVAILABLE' ? '' : 'btn-primary'}`}
                onClick={() => handleToggleStatus(selecionado)}
                disabled={toggleLoading}
              >
                {toggleLoading ? '...' : selecionado.status === 'AVAILABLE' ? 'Desativar' : 'Ativar'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => handleDeletar(selecionado.id)}>
                <Icon name="lixeira" size={16} />
                Remover
              </button>
            </div>
          </DetailPanel>
        )}
      </div>
    </>
  );
}
