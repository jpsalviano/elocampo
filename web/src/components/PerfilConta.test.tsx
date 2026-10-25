import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PerfilProdutor from '../pages/produtor/PerfilProdutor'
import PerfilEmpresa from '../pages/comprador/PerfilEmpresa'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('../services/api', () => ({
  buscarContaPorUsuario: vi.fn(),
  atualizarConta: vi.fn(),
  buscarArquivosPorEntidade: vi.fn(),
  uploadArquivo: vi.fn(),
  deletarArquivo: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import { buscarContaPorUsuario, atualizarConta, buscarArquivosPorEntidade } from '../services/api'

const conta = {
  id: 'acc-1', userId: 'user-1', name: 'Maria Produtora', businessName: '', cpf: '12345678900', birthdayDate: 0,
  address: { postalCode: '39400-000', street: 'Rua A', number: '1', complement: '', district: 'Centro', city: 'Montes Claros', state: 'MG' },
  phone: { countryCode: 55, stateCode: 38, number: '99999-0000' },
  role: 'VENDOR' as const, createdAt: 0, updatedAt: 0,
}

const setSession = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({ session: { token: 't', userId: 'user-1', email: 'maria@x.com', isAdmin: false, account: conta }, setSession } as any)
  vi.mocked(buscarContaPorUsuario).mockResolvedValue(conta)
  vi.mocked(buscarArquivosPorEntidade).mockResolvedValue([])
})

describe('Perfil', () => {
  it('produtor: carrega os dados nos campos rotulados', async () => {
    render(<PerfilProdutor />)
    expect(screen.getByRole('heading', { name: 'Meu Perfil' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria Produtora'))
    expect(screen.getByLabelText('Cidade')).toHaveValue('Montes Claros')
    expect(screen.getByLabelText('Estado (UF)')).toHaveValue('MG')
  })

  it('empresa: usa os rótulos da empresa', async () => {
    render(<PerfilEmpresa />)
    expect(screen.getByRole('heading', { name: 'Perfil da Empresa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dados da empresa' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Nome / Responsável')).toHaveValue('Maria Produtora'))
  })

  it('salva os dados e avisa', async () => {
    vi.mocked(atualizarConta).mockResolvedValue({ ...conta, name: 'Maria S.' })
    render(<PerfilProdutor />)
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria Produtora'))
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria S.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(screen.getByText('Dados salvos!')).toBeInTheDocument())
    expect(atualizarConta).toHaveBeenCalledWith('acc-1', expect.objectContaining({ name: 'Maria S.', role: 'VENDOR' }))
    expect(setSession).toHaveBeenCalled()
  })

  it('valida a confirmação da nova senha', async () => {
    render(<PerfilProdutor />)
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-nova-1' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'outra-senha' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))
    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
  })
})
