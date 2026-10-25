import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { iniciarTema, salvarTema, temaAtual, temaSalvo } from './theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => { vi.restoreAllMocks() })

describe('tema', () => {
  it('sem escolha salva, não define data-theme (segue o sistema)', () => {
    iniciarTema()
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(temaSalvo()).toBeNull()
  })

  it('salvarTema aplica na raiz e guarda a escolha', () => {
    salvarTema('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('ec_theme')).toBe('dark')
    expect(temaAtual()).toBe('dark')
  })

  it('iniciarTema aplica a escolha salva', () => {
    localStorage.setItem('ec_theme', 'light')
    iniciarTema()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignora valor inválido salvo', () => {
    localStorage.setItem('ec_theme', 'roxo')
    expect(temaSalvo()).toBeNull()
  })

  it('continua funcionando quando o armazenamento falha', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    expect(() => salvarTema('dark')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(temaSalvo()).toBeNull()
  })
})
