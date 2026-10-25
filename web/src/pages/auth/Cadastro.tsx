import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { criarUsuario, criarConta, gerarToken, buscarContaPorUsuario } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { AccountRole, AuthSession } from '../../types'
import { AuthFrame, Apresentacao, SeletorPerfil, CheckTermos } from './AuthParts'

function decodeJwt(token: string): { sub: string; email: string; isAdmin: boolean } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export default function Cadastro() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useAuth()

  const [etapa, setEtapa]   = useState<1 | 2>(1)
  const [userId, setUserId] = useState('')
  const [role, setRole]     = useState<AccountRole>('VENDOR')
  const [creds, setCreds]   = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [termos, setTermos] = useState(false)

  useEffect(() => {
    const s = location.state as { fromLogin?: boolean; userId?: string; role?: AccountRole; nome?: string; email?: string; senha?: string } | null
    if (s?.fromLogin && s.userId) {
      setUserId(s.userId)
      if (s.role) setRole(s.role)
      if (s.nome || s.email || s.senha)
        setCreds(c => ({ ...c, nome: s.nome ?? c.nome, email: s.email ?? c.email, senha: s.senha ?? c.senha }))
      setEtapa(2)
    }
  }, [])

  const [perfil, setPerfil] = useState({
    cpf: '', cnpj: '', businessName: '', birthday: '',
    ddi: '55', ddd: '', telefone: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  })

  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  function updCreds(k: string, v: string)  { setCreds(f => ({ ...f, [k]: v })) }
  function updPerfil(k: string, v: string) { setPerfil(f => ({ ...f, [k]: v })) }

  async function handleEtapa1(e: FormEvent) {
    e.preventDefault()
    if (!termos)                         { setErro('Aceite os termos para continuar'); return }
    if (creds.senha !== creds.confirmar) { setErro('As senhas não coincidem'); return }
    if (creds.senha.length < 8)          { setErro('A senha deve ter ao menos 8 caracteres'); return }
    setErro(''); setLoading(true)
    try {
      const user = await criarUsuario({ email: creds.email, password: creds.senha })
      setUserId(user.id)
      setEtapa(2)
    } catch (err: any) {
      setErro(err.response?.data?.message ?? 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  async function handleEtapa2(e: FormEvent) {
    e.preventDefault()
    setErro(''); setLoading(true)
    try {
      const { token } = await gerarToken(creds.email, creds.senha)
      const payload = decodeJwt(token)
      if (!payload) throw new Error('Token inválido')

      // A conta é criada já como o novo usuário: a API pega o dono pelo token.
      localStorage.setItem('ec_token', token)
      await criarConta({
        name: creds.nome,
        businessName: perfil.businessName || undefined,
        cpf:          perfil.cpf          || undefined,
        cnpj:         perfil.cnpj         || undefined,
        birthdayDate: new Date(perfil.birthday).getTime(),
        phone: {
          countryCode: parseInt(perfil.ddi, 10),
          stateCode:   parseInt(perfil.ddd, 10),
          number:      perfil.telefone,
        },
        address: {
          postalCode: perfil.cep,
          street:     perfil.rua,
          number:     perfil.numero,
          complement: perfil.complemento,
          district:   perfil.bairro,
          city:       perfil.cidade,
          state:      perfil.estado,
        },
        role,
      })

      const account = await buscarContaPorUsuario(payload.sub)

      const session: AuthSession = {
        token,
        userId:  payload.sub,
        email:   payload.email,
        isAdmin: payload.isAdmin,
        account,
      }
      setSession(session)
      navigate(role === 'VENDOR' ? '/produtor/dashboard' : '/comprador/dashboard')
    } catch (err: any) {
      setErro(err.response?.data?.message ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const f = (id: string, label: string, input: JSX.Element) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {input}
    </div>
  )

  return (
    <AuthFrame>
      {/* ESQUERDA — identidade */}
      <section className="auth-col" aria-label="Sobre o EloCampo">
        <Apresentacao />

        <p className="muted">
          {etapa === 1 ? 'Etapa 1 de 2 — preencha seus dados de acesso.' : 'Etapa 2 de 2 — informe seu perfil e endereço.'}
        </p>

        <button type="button" className="btn btn-block" onClick={() => navigate('/login')}>
          Já tenho uma conta — Entrar
        </button>
      </section>

      {/* DIREITA — formulário */}
      <section className="auth-col" aria-labelledby="cadastro-titulo">
        <div>
          <h1 id="cadastro-titulo">{etapa === 1 ? 'Criar conta gratuita' : 'Complete seu perfil'}</h1>
          <p className="muted">
            {etapa === 1 ? 'Passo 1 de 2 — dados de acesso' : 'Passo 2 de 2 — informações pessoais e endereço'}
          </p>
        </div>

        {erro && <div className="alert alert-danger" role="alert">{erro}</div>}

        {/* ETAPA 1 */}
        {etapa === 1 && (
          <form onSubmit={handleEtapa1} className="form-grid">
            <SeletorPerfil role={role} onChange={setRole} name="cad-perfil" />

            {f('cad-nome', 'Nome completo',
              <input id="cad-nome" className="input" value={creds.nome} onChange={e => updCreds('nome', e.target.value)} required placeholder="João da Silva" autoComplete="name" />)}
            {f('cad-email', 'E-mail',
              <input id="cad-email" className="input" type="email" value={creds.email} onChange={e => updCreds('email', e.target.value)} required autoComplete="email" placeholder="joao@fazenda.com.br" />)}
            <div className="grid-2">
              {f('cad-senha', 'Senha',
                <input id="cad-senha" className="input" type="password" value={creds.senha} onChange={e => updCreds('senha', e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Mín. 8 caracteres" />)}
              {f('cad-confirmar', 'Confirmar senha',
                <input id="cad-confirmar" className="input" type="password" value={creds.confirmar} onChange={e => updCreds('confirmar', e.target.value)} required autoComplete="new-password" placeholder="••••••••" />)}
            </div>

            <CheckTermos id="cad-termos" checked={termos} onChange={setTermos} />

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Criando usuário…' : 'Continuar para etapa 2 →'}
            </button>
          </form>
        )}

        {/* ETAPA 2 */}
        {etapa === 2 && (
          <form onSubmit={handleEtapa2} className="form-grid">
            <div className="grid-2">
              {f('cad-cpf', 'CPF',
                <input id="cad-cpf" className="input" inputMode="numeric" value={perfil.cpf} onChange={e => updPerfil('cpf', e.target.value)} placeholder="000.000.000-00" />)}
              {f('cad-cnpj', 'CNPJ',
                <input id="cad-cnpj" className="input" inputMode="numeric" value={perfil.cnpj} onChange={e => updPerfil('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />)}
            </div>

            {role === 'BUYER' && f('cad-razao', 'Razão social',
              <input id="cad-razao" className="input" value={perfil.businessName} onChange={e => updPerfil('businessName', e.target.value)} placeholder="Empresa Ltda." />)}

            {f('cad-nascimento', 'Data de nascimento',
              <input id="cad-nascimento" className="input" type="date" value={perfil.birthday} onChange={e => updPerfil('birthday', e.target.value)} required />)}

            <fieldset>
              <legend>Telefone</legend>
              <div className="grid-phone">
                <input className="input" aria-label="DDI" inputMode="numeric" value={perfil.ddi} onChange={e => updPerfil('ddi', e.target.value)} placeholder="+55" required title="DDI" />
                <input className="input" aria-label="DDD" inputMode="numeric" value={perfil.ddd} onChange={e => updPerfil('ddd', e.target.value)} placeholder="DDD" required title="DDD" />
                <input className="input" aria-label="Número" inputMode="tel" value={perfil.telefone} onChange={e => updPerfil('telefone', e.target.value)} placeholder="99999-9999" required title="Número" />
              </div>
            </fieldset>

            <div className="form-sep">Endereço</div>

            <div className="grid-cep">
              {f('cad-cep', 'CEP',
                <input id="cad-cep" className="input" inputMode="numeric" value={perfil.cep} onChange={e => updPerfil('cep', e.target.value)} placeholder="00000-000" required autoComplete="postal-code" />)}
              {f('cad-rua', 'Rua / Logradouro',
                <input id="cad-rua" className="input" value={perfil.rua} onChange={e => updPerfil('rua', e.target.value)} placeholder="Rua das Flores" required />)}
            </div>

            <div className="grid-num">
              {f('cad-numero', 'Número',
                <input id="cad-numero" className="input" value={perfil.numero} onChange={e => updPerfil('numero', e.target.value)} placeholder="123" required />)}
              {f('cad-complemento', 'Complemento',
                <input id="cad-complemento" className="input" value={perfil.complemento} onChange={e => updPerfil('complemento', e.target.value)} placeholder="Apto 2B (opcional)" />)}
            </div>

            <div className="grid-2">
              {f('cad-bairro', 'Bairro',
                <input id="cad-bairro" className="input" value={perfil.bairro} onChange={e => updPerfil('bairro', e.target.value)} placeholder="Centro" required />)}
              {f('cad-cidade', 'Cidade',
                <input id="cad-cidade" className="input" value={perfil.cidade} onChange={e => updPerfil('cidade', e.target.value)} placeholder="São Paulo" required />)}
            </div>

            {f('cad-uf', 'Estado (UF)',
              <input id="cad-uf" className="input input-uf" value={perfil.estado} onChange={e => updPerfil('estado', e.target.value)} placeholder="SP" maxLength={2} required />)}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Criando conta…' : 'Criar minha conta'}
            </button>
          </form>
        )}
      </section>
    </AuthFrame>
  )
}
