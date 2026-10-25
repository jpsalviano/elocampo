import { PRODUCT_CATEGORY, PRODUCT_SCALE, type ProductCategory, type ProductScale } from '../types'

export const fmtPreco = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export const fmtData = (ts: number) => new Date(ts).toLocaleDateString('pt-BR')

export const fmtNumero = (v: number) => Number(v).toLocaleString('pt-BR')

export const catLabel = (v: ProductCategory) => PRODUCT_CATEGORY.find(c => c.v === v)?.label ?? v

export const escLabel = (v: ProductScale) => PRODUCT_SCALE.find(s => s.v === v)?.label ?? v

// Unidade curta para "preço/unidade" e estoque.
export const unidade = (v: ProductScale) => ({ KG: 'kg', UNIT: 'un', LITER: 'L' } as Record<string, string>)[v] ?? v

// Hora se for hoje; senão, a data curta.
export function fmtQuando(ts: number, agora = Date.now()) {
  const d = new Date(ts)
  const hoje = new Date(agora)
  if (d.toDateString() === hoje.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
