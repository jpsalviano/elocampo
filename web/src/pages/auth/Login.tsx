import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { gerarToken, buscarContaPorUsuario, criarUsuario, buscarDemo, type Demo } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthSession, AccountRole } from '../../types'
import { AuthFrame, Apresentacao, SeletorPerfil, CheckTermos } from './AuthParts'

function decodeJwt(token: string): { sub: string; email: string; isAdmin: boolean } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export default function Login() {
  const navigate = useNavigate()
  const { setSession } = useAuth()

  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [erroLogin, setErroLogin] = useState('')
  const [loadingLogin, setLoadingLogin] = useState(false)

  // Cadastro rápido (etapa 1)
  const [role, setRole]     = useState<AccountRole>('VENDOR')
  const [reg, setReg]       = useState({ nome:'', email:'', senha:'', confirmar:'' })
  const [termos, setTermos] = useState(false)
  const [erroReg, setErroReg]     = useState('')
  const [loadingReg, setLoadingReg] = useState(false)

  // Demonstração: contas de exemplo
  const [demo, setDemo] = useState<Demo | null>(null)
  useEffect(() => { buscarDemo().then(setDemo).catch(() => setDemo(null)) }, [])

  // Handlers
  
  async function handleLogin(e: FormEvent) {
   
    e.preventDefault()
    setErroLogin(''); setLoadingLogin(true)
    try {
      const { token } = await gerarToken(email, senha)
      const payload = decodeJwt(token)
      if (!payload) throw new Error('Token inválido recebido do servidor')
      localStorage.setItem('ec_token', token)
      let account
      // Admin não tem conta de produtor ou comprador.
      if (!payload.isAdmin) { try { account = await buscarContaPorUsuario(payload.sub) } catch { /* sem conta */ } }
      const session: AuthSession = { token, userId: payload.sub, email: payload.email, isAdmin: payload.isAdmin, account }
      setSession(session)
      if (payload.isAdmin)              navigate('/admin')
      else if (account?.role === 'VENDOR') navigate('/produtor/dashboard')
      else if (account?.role === 'BUYER')  navigate('/comprador/dashboard')
      else                              navigate('/cadastro')
    } catch (err: any) {
      localStorage.removeItem('ec_token')
      setErroLogin(err.response?.data?.message ?? err.message ?? 'Usuário ou senha incorretos')
    } finally { setLoadingLogin(false) }
  }

  async function handleCadastro(e: FormEvent) {
    e.preventDefault()
    if (!termos)                         { setErroReg('Aceite os termos para continuar'); return }
    if (reg.senha !== reg.confirmar)     { setErroReg('As senhas não coincidem'); return }
    if (reg.senha.length < 8)            { setErroReg('A senha deve ter ao menos 8 caracteres'); return }
    setErroReg(''); setLoadingReg(true)
    try {
      const user = await criarUsuario({ email: reg.email, password: reg.senha })
      navigate('/cadastro', { state: { fromLogin: true, userId: user.id, role, nome: reg.nome, email: reg.email, senha: reg.senha } })
    } catch (err: any) {
      setErroReg(err.response?.data?.message ?? 'Erro ao criar usuário')
    } finally { setLoadingReg(false) }
  }

  return (
    <AuthFrame>
      {/* ESQUERDA — identidade + login */}
      <section className="auth-col" aria-labelledby="login-titulo">
        <Apresentacao />

        <h1 id="login-titulo">Entrar na sua conta</h1>

        {erroLogin && <div className="alert alert-danger" role="alert">{erroLogin}</div>}

        <form onSubmit={handleLogin} className="form-grid">
          <div className="field">
            <label htmlFor="login-email">E-mail</label>
            <input id="login-email" className="input" type="email" placeholder="joao@fazenda.com.br" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="login-senha">Senha</label>
            <input id="login-senha" className="input" type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} required autoComplete="current-password" />
          </div>
          <label className="check" htmlFor="login-lembrar">
            <input id="login-lembrar" type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)} />
            <span>Lembrar de mim</span>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loadingLogin}>
            {loadingLogin ? 'Entrando…' : 'Entrar na plataforma'}
          </button>
        </form>

        {demo?.enabled && demo.accounts && (
          <section className="demo" aria-labelledby="demo-titulo">
            <h2 id="demo-titulo" className="demo-head">Demonstração</h2>
            <div className="demo-body">
              <p>
                Entre com uma conta de exemplo (senha <code>{demo.password}</code>) ou crie a sua.
                Tudo volta ao estado inicial todo dia às 4h; o envio de e-mails está desligado.
              </p>
              <div className="btn-row">
                {demo.accounts.map(a => (
                  <button key={a.email} type="button" className="btn btn-sm" onClick={() => { setEmail(a.email); setSenha(demo.password ?? '') }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>

      {/* DIREITA — cadastro rápido (etapa 1) */}
      <section className="auth-col" aria-labelledby="cadastro-titulo">
        <div>
          <h2 id="cadastro-titulo">Criar conta gratuita</h2>
          <p className="muted">Conecte-se ao mercado agrícola brasileiro em minutos</p>
        </div>

        <SeletorPerfil role={role} onChange={setRole} name="login-perfil" />

        {erroReg && <div className="alert alert-danger" role="alert">{erroReg}</div>}

        <form onSubmit={handleCadastro} className="form-grid">
          <div className="field">
            <label htmlFor="reg-nome">Nome completo</label>
            <input id="reg-nome" className="input" placeholder="João da Silva" value={reg.nome} onChange={e=>setReg(r=>({...r,nome:e.target.value}))} required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="reg-email">E-mail</label>
            <input id="reg-email" className="input" type="email" placeholder="joao@fazenda.com.br" value={reg.email} onChange={e=>setReg(r=>({...r,email:e.target.value}))} required autoComplete="email" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="reg-senha">Senha</label>
              <input id="reg-senha" className="input" type="password" placeholder="Mín. 8 caracteres" value={reg.senha} onChange={e=>setReg(r=>({...r,senha:e.target.value}))} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="reg-confirmar">Confirmar senha</label>
              <input id="reg-confirmar" className="input" type="password" placeholder="••••••••" value={reg.confirmar} onChange={e=>setReg(r=>({...r,confirmar:e.target.value}))} required autoComplete="new-password" />
            </div>
          </div>

          <CheckTermos id="reg-termos" checked={termos} onChange={setTermos} />

          <button type="submit" className="btn btn-primary btn-block" disabled={loadingReg}>
            {loadingReg ? 'Criando usuário…' : 'Continuar para etapa 2 →'}
          </button>
        </form>

        <p className="auth-note">Etapa 1 de 2 — na próxima etapa você concluirá seu cadastro</p>
      </section>
    </AuthFrame>
  )
}
