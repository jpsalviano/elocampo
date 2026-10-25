import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

vi.mock('../../services/api', () => ({
  gerarToken: vi.fn(),
  buscarContaPorUsuario: vi.fn(),
  criarUsuario: vi.fn(),
  buscarDemo: vi.fn(() => Promise.resolve({
    enabled: true,
    password: 'senha-demo',
    accounts: [{ label: 'Produtor', email: 'produtor@elocampo.demo' }, { label: 'Comprador', email: 'comprador@elocampo.demo' }],
  })),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ setSession: vi.fn() })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => vi.fn() }
})

import { gerarToken, criarUsuario } from '../../services/api'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

// Marca o checkbox de termos do formulário de cadastro
function clickTerms() {
  fireEvent.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
}

// Submete o formulário de cadastro sem acionar validação HTML5
function submitRegisterForm() {
  fireEvent.submit(screen.getByText('Continuar para etapa 2 →').closest('form')!)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Login — renderização', () => {
  it('deve exibir o título de login', () => {
    renderLogin()
    expect(screen.getByText('Entrar na sua conta')).toBeInTheDocument()
  })

  it('deve exibir os campos de email e senha do login', () => {
    renderLogin()
    // Há dois inputs com esse placeholder (login + cadastro)
    expect(screen.getAllByPlaceholderText('joao@fazenda.com.br')[0]).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('••••••••')[0]).toBeInTheDocument()
  })

  it('deve exibir o botão de submit do login', () => {
    renderLogin()
    expect(screen.getByText('Entrar na plataforma')).toBeInTheDocument()
  })

  it('deve exibir a seção de cadastro rápido', () => {
    renderLogin()
    expect(screen.getByText('Criar conta gratuita')).toBeInTheDocument()
  })

  it('deve exibir as opções de perfil VENDOR e BUYER', () => {
    renderLogin()
    expect(screen.getByText('Produtor rural')).toBeInTheDocument()
    expect(screen.getByText('Empresa compradora')).toBeInTheDocument()
  })

  it('deve ligar os rótulos aos campos do login', () => {
    renderLogin()
    expect(screen.getAllByLabelText('E-mail')[0]).toHaveAttribute('type', 'email')
    expect(screen.getAllByLabelText('Senha')[0]).toHaveAttribute('autocomplete', 'current-password')
  })

  it('deve usar checkboxes e opções de perfil reais', () => {
    renderLogin()
    const lembrar = screen.getByRole('checkbox', { name: 'Lembrar de mim' })
    expect(lembrar).not.toBeChecked()
    fireEvent.click(lembrar)
    expect(lembrar).toBeChecked()
    expect(screen.getByRole('radio', { name: /Produtor rural/ })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /Empresa compradora/ }))
    expect(screen.getByRole('radio', { name: /Empresa compradora/ })).toBeChecked()
  })

  it('deve ter o botão de alternar tema', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /Ativar modo (escuro|claro)/ })).toBeInTheDocument()
  })

  it('deve exibir as features do marketplace', () => {
    renderLogin()
    expect(screen.getByText('Marketplace agrícola brasileiro')).toBeInTheDocument()
  })
})

describe('Login — demonstração', () => {
  it('deve mostrar as contas de exemplo e a senha', async () => {
    renderLogin()
    expect(await screen.findByText('Demonstração')).toBeInTheDocument()
    expect(screen.getByText('senha-demo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Produtor' })).toBeInTheDocument()
  })

  it('deve preencher e-mail e senha ao escolher uma conta', async () => {
    renderLogin()
    await userEvent.click(await screen.findByRole('button', { name: 'Comprador' }))
    expect(screen.getByDisplayValue('comprador@elocampo.demo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('senha-demo')).toBeInTheDocument()
  })

  it('não deve ter recuperação de senha (e-mail desligado)', () => {
    renderLogin()
    expect(screen.queryByText('Esqueci a senha')).not.toBeInTheDocument()
  })
})

describe('Login — handleLogin', () => {
  it('deve chamar gerarToken com email e senha informados', async () => {
    vi.mocked(gerarToken).mockRejectedValueOnce(new Error('fail'))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getAllByPlaceholderText('joao@fazenda.com.br')[0], 'joao@fazenda.com')
    await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'minhasenha')
    await user.click(screen.getByText('Entrar na plataforma'))

    await waitFor(() => {
      expect(gerarToken).toHaveBeenCalledWith('joao@fazenda.com', 'minhasenha')
    })
  })

  it('deve exibir mensagem de erro quando gerarToken falhar', async () => {
    vi.mocked(gerarToken).mockRejectedValueOnce({
      response: { data: { message: 'Usuário ou senha incorretos' } },
    })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getAllByPlaceholderText('joao@fazenda.com.br')[0], 'u@test.com')
    await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'senhaerrada')
    await user.click(screen.getByText('Entrar na plataforma'))

    await waitFor(() => {
      expect(screen.getByText('Usuário ou senha incorretos')).toBeInTheDocument()
    })
  })
})

// Cadastro rápido — validações client-side
// Usa fireEvent.submit() para contornar a validação HTML5 (required/minLength)
// e testar exclusivamente a lógica de validação do handleCadastro.

describe('Login — cadastro rápido (validação)', () => {
  it('deve exibir erro se os termos não forem aceitos', async () => {
    renderLogin()

    // Submete sem aceitar os termos
    submitRegisterForm()

    await waitFor(() => {
      expect(screen.getByText('Aceite os termos para continuar')).toBeInTheDocument()
    })
    expect(criarUsuario).not.toHaveBeenCalled()
  })

  it('deve exibir erro se as senhas não coincidirem', async () => {
    renderLogin()

    clickTerms()
    fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), { target: { value: 'senha1111' } })
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'senha2222' } })

    submitRegisterForm()

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
    })
    expect(criarUsuario).not.toHaveBeenCalled()
  })

  it('deve exibir erro se a senha tiver menos de 8 caracteres', async () => {
    renderLogin()

    clickTerms()
    fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), { target: { value: 'abc' } })
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'abc' } })

    submitRegisterForm()

    await waitFor(() => {
      expect(screen.getByText('A senha deve ter ao menos 8 caracteres')).toBeInTheDocument()
    })
    expect(criarUsuario).not.toHaveBeenCalled()
  })

  it('deve chamar criarUsuario quando o formulário for válido', async () => {
    vi.mocked(criarUsuario).mockResolvedValueOnce({
      id: 'u1', email: 'maria@test.com', isAdmin: true, createdAt: 0, updatedAt: 0,
    })
    renderLogin()

    clickTerms()
    fireEvent.change(screen.getAllByPlaceholderText('joao@fazenda.com.br')[1], { target: { value: 'maria@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), { target: { value: 'senhaForte1' } })
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'senhaForte1' } })

    submitRegisterForm()

    await waitFor(() => {
      expect(criarUsuario).toHaveBeenCalledWith({
        email: 'maria@test.com',
        password: 'senhaForte1',
      })
    })
  })

  it('deve exibir erro de API quando criarUsuario falhar', async () => {
    vi.mocked(criarUsuario).mockRejectedValueOnce({
      response: { data: { message: 'E-mail já cadastrado' } },
    })
    renderLogin()

    clickTerms()
    fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), { target: { value: 'senhaForte1' } })
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'senhaForte1' } })

    submitRegisterForm()

    await waitFor(() => {
      expect(screen.getByText('E-mail já cadastrado')).toBeInTheDocument()
    })
  })
})
