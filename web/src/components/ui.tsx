import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { ORDER_STATUS_LABEL, type FileUploadResponse, type OrderStatus } from '../types'

export function PageHead({ title, sub, children, actions }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Empty({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="empty">
      {icon && <Icon name={icon} size={28} />}
      <div>{children}</div>
    </div>
  )
}

export function Loading({ children = 'Carregando...' }: { children?: ReactNode }) {
  return <div className="empty" role="status">{children}</div>
}

const STATUS_CLS: Record<OrderStatus, string> = {
  PENDING: 'tag-warning',
  ACCEPTED: 'tag-neutral',
  COMPLETED: 'tag-success',
  CANCELLED: 'tag-danger',
}

export function StatusPedido({ status }: { status: OrderStatus }) {
  return <span className={`tag ${STATUS_CLS[status] ?? 'tag-neutral'}`}>{ORDER_STATUS_LABEL[status] ?? status}</span>
}

// Painel de detalhe: ao lado da lista no computador, em tela cheia no celular.
// Esc fecha; o foco vai para o título ao abrir.
export function DetailPanel({ title, onClose, closeLabel = 'Fechar', children }: { title: ReactNode; onClose: () => void; closeLabel?: string; children: ReactNode }) {
  const id = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  return (
    <aside
      className="detail"
      aria-labelledby={id}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
    >
      <div className="detail-head">
        <h2 id={id} ref={titulo} tabIndex={-1}>{title}</h2>
        <button type="button" className="icon-btn" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <Icon name="fechar" />
        </button>
      </div>
      <div className="detail-body">{children}</div>
    </aside>
  )
}

// Diálogo modal: centralizado no computador, tela cheia no celular.
export function Modal({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const id = useId()
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    caixa.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.modal-close)')?.focus()
    return () => { antes?.focus?.() }
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        ref={caixa}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      >
        <div className="modal-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="icon-btn modal-close" aria-label="Fechar" title="Fechar" onClick={onClose}>
            <Icon name="fechar" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Stars({ value }: { value: number }) {
  const n = Math.round(value)
  return (
    <span className="stars" role="img" aria-label={`${value.toFixed(1).replace('.', ',')} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= n ? '' : 'off'}><Icon name="estrela" size={14} fill={i <= n} /></span>
      ))}
    </span>
  )
}

// Foto grande com setas e miniaturas; remover é opcional (dono do produto).
export function Gallery({ imagens, idx, setIdx, alt, onRemove }: {
  imagens: FileUploadResponse[]
  idx: number
  setIdx: (f: (i: number) => number) => void
  alt: string
  onRemove?: (id: string) => void
}) {
  const atual = imagens[Math.min(idx, imagens.length - 1)]
  return (
    <div>
      <div className="gallery-main">
        {atual
          ? <img src={atual.secureUrl} alt={`${alt} — imagem ${idx + 1} de ${imagens.length}`} />
          : <div className="placeholder"><Icon name="imagem" size={40} /><span className="visually-hidden">Sem imagem</span></div>}
        {imagens.length > 1 && (
          <>
            <button type="button" className="gallery-nav prev" aria-label="Imagem anterior" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>
              <Icon name="voltar" />
            </button>
            <button type="button" className="gallery-nav next" aria-label="Próxima imagem" disabled={idx >= imagens.length - 1} onClick={() => setIdx(i => Math.min(imagens.length - 1, i + 1))}>
              <Icon name="avancar" />
            </button>
          </>
        )}
      </div>
      {(imagens.length > 1 || (onRemove && imagens.length > 0)) && (
        <div className="gallery-thumbs">
          {imagens.map((img, i) => (
            <div key={img.id} className="gallery-thumb">
              <button type="button" aria-label={`Ver imagem ${i + 1}`} aria-current={i === idx} onClick={() => setIdx(() => i)}>
                <img src={img.secureUrl} alt="" />
              </button>
              {onRemove && (
                <button type="button" className="thumb-remove" aria-label={`Remover imagem ${i + 1}`} onClick={() => onRemove(img.id)}>
                  <Icon name="fechar" size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
