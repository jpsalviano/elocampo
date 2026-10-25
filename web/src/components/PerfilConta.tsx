import { useState, useEffect, useRef, type FormEvent } from 'react'
import { buscarContaPorUsuario, atualizarConta, buscarArquivosPorEntidade, uploadArquivo, deletarArquivo } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { AccountResponse, FileUploadResponse } from '../types'
import { Icon } from './Icon'
import { PageHead } from './ui'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// Perfil do produtor e da empresa compradora: mesmos dados, rótulos diferentes.
export function PerfilConta({ titulo, tituloDados, rotuloNome }: { titulo: string; tituloDados: string; rotuloNome: string }) {
  const { session, setSession } = useAuth()
  const [conta, setConta]       = useState<AccountResponse | null>(null)
  const [form, setForm]         = useState({
    name: '', businessName: '', cpf: '', cnpj: '',
    ddi: '55', ddd: '', telefone: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  })
  const [senhas, setSenhas]     = useState({ atual:'', nova:'', confirmar:'' })
  const [sucDados, setSucDados] = useState(false)
  const [sucSenha, setSucSenha] = useState(false)
  const [erroDados, setErroDados] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [loading, setLoading]   = useState(false)
  const [fotoPerfil, setFotoPerfil] = useState<FileUploadResponse | null>(null)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session?.userId) return
    buscarContaPorUsuario(session.userId).then(c => {
      setConta(c)
      buscarArquivosPorEntidade('PROFILE', c.id).then(imgs => setFotoPerfil(imgs[0] ?? null)).catch(() => {})
      setForm({
        name:         c.name ?? '',
        businessName: c.businessName ?? '',
        cpf:          c.cpf ?? '',
        cnpj:         c.cnpj ?? '',
        ddi:          String(c.phone?.countryCode ?? '55'),
        ddd:          String(c.phone?.stateCode ?? ''),
        telefone:     c.phone?.number ?? '',
        cep:          c.address?.postalCode ?? '',
        rua:          c.address?.street ?? '',
        numero:       c.address?.number ?? '',
        complemento:  c.address?.complement ?? '',
        bairro:       c.address?.district ?? '',
        cidade:       c.address?.city ?? '',
        estado:       c.address?.state ?? '',
      })
    }).catch(() => {})
  }, [session?.userId])

  async function handleDados(e: FormEvent) {
    e.preventDefault()
    if (!conta || !session?.userId) return
    setErroDados(''); setSucDados(false); setLoading(true)
    try {
      const atualizada = await atualizarConta(conta.id, {
        name:          form.name,
        businessName:  form.businessName || undefined,
        cpf:           form.cpf || undefined,
        cnpj:          form.cnpj || undefined,
        birthdayDate:  conta.birthdayDate,
        phone:         { countryCode: parseInt(form.ddi, 10), stateCode: parseInt(form.ddd, 10), number: form.telefone },
        address:       { postalCode:form.cep, street:form.rua, number:form.numero, complement:form.complemento, district:form.bairro, city:form.cidade, state:form.estado },
        role:          conta.role,
      })
      setConta(atualizada)
      if (session) setSession({ ...session, account: atualizada })
      setSucDados(true)
    } catch (err: any) {
      setErroDados(err.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !conta) return
    setUploadandoFoto(true)
    try {
      if (fotoPerfil) await deletarArquivo(fotoPerfil.id)
      const nova = await uploadArquivo(file, 'PROFILE', conta.id)
      setFotoPerfil(nova)
    } catch { /* user can retry */ }
    finally { setUploadandoFoto(false); e.target.value = '' }
  }

  async function handleDeletarFoto() {
    if (!fotoPerfil) return
    await deletarArquivo(fotoPerfil.id)
    setFotoPerfil(null)
  }

  async function handleSenha(e: FormEvent) {
    e.preventDefault()
    setErroSenha(''); setSucSenha(false)
    if (senhas.nova !== senhas.confirmar) { setErroSenha('As senhas não coincidem'); return }
    if (senhas.nova.length < 8) { setErroSenha('Nova senha deve ter ao menos 8 caracteres'); return }
    setSucSenha(true)
    setSenhas({ atual:'', nova:'', confirmar:'' })
  }

  const campo = (id: string, label: string, el: JSX.Element) => (
    <div className="field"><label htmlFor={id}>{label}</label>{el}</div>
  )
  const nome = session?.account?.name ?? session?.email

  return (
    <>
      <PageHead title={titulo} sub={nome}>
        {session?.account?.businessName && <p className="page-sub">{session.account.businessName}</p>}
      </PageHead>

      <section className="panel" aria-labelledby="perfil-foto">
        <div className="panel-head"><h2 id="perfil-foto">Foto</h2></div>
        <div className="panel-body avatar-wrap">
          <div className="avatar">
            {fotoPerfil
              ? <img src={fotoPerfil.secureUrl} alt={`Foto de ${nome}`} />
              : <span aria-hidden="true">{(nome ?? '?')[0].toUpperCase()}</span>}
          </div>
          <div className="avatar-actions">
            <button type="button" className="btn btn-sm" onClick={() => fotoRef.current?.click()} disabled={uploadandoFoto}>
              <Icon name="camera" size={16} />
              {uploadandoFoto ? 'Enviando…' : 'Alterar foto'}
            </button>
            {fotoPerfil && (
              <button type="button" className="btn btn-sm btn-danger" onClick={handleDeletarFoto}>
                <Icon name="lixeira" size={16} />
                Remover foto
              </button>
            )}
            <input ref={fotoRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleUploadFoto} />
          </div>
        </div>
      </section>

      <form onSubmit={handleDados} className="panel" aria-labelledby="perfil-dados">
        <div className="panel-head"><h2 id="perfil-dados">{tituloDados}</h2></div>
        <div className="panel-body form-grid">
          {sucDados && <div className="alert alert-success" role="status"><Icon name="check" size={16} />Dados salvos!</div>}
          {erroDados && <div className="alert alert-danger" role="alert">{erroDados}</div>}

          <div className="grid-2">
            {campo('pf-nome', rotuloNome, <input id="pf-nome" className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required autoComplete="name" />)}
            {campo('pf-razao', 'Razão social', <input id="pf-razao" className="input" value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))} />)}
          </div>
          <div className="grid-2">
            {campo('pf-cpf', 'CPF', <input id="pf-cpf" className="input" inputMode="numeric" value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} />)}
            {campo('pf-cnpj', 'CNPJ', <input id="pf-cnpj" className="input" inputMode="numeric" value={form.cnpj} onChange={e=>setForm(f=>({...f,cnpj:e.target.value}))} />)}
          </div>

          <fieldset>
            <legend>Telefone</legend>
            <div className="grid-phone">
              <input className="input" aria-label="DDI" inputMode="numeric" value={form.ddi} onChange={e=>setForm(f=>({...f,ddi:e.target.value}))} placeholder="+55" title="DDI" />
              <input className="input" aria-label="DDD" inputMode="numeric" value={form.ddd} onChange={e=>setForm(f=>({...f,ddd:e.target.value}))} placeholder="DDD" title="DDD" />
              <input className="input" aria-label="Número" inputMode="tel" value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="99999-9999" />
            </div>
          </fieldset>

          <div className="form-sep">Endereço</div>

          <div className="grid-cep">
            {campo('pf-cep', 'CEP', <input id="pf-cep" className="input" inputMode="numeric" value={form.cep} onChange={e=>setForm(f=>({...f,cep:e.target.value}))} autoComplete="postal-code" />)}
            {campo('pf-rua', 'Rua', <input id="pf-rua" className="input" value={form.rua} onChange={e=>setForm(f=>({...f,rua:e.target.value}))} />)}
          </div>
          <div className="grid-num">
            {campo('pf-numero', 'Número', <input id="pf-numero" className="input" value={form.numero} onChange={e=>setForm(f=>({...f,numero:e.target.value}))} />)}
            {campo('pf-complemento', 'Complemento', <input id="pf-complemento" className="input" value={form.complemento} onChange={e=>setForm(f=>({...f,complemento:e.target.value}))} />)}
          </div>
          <div className="grid-2">
            {campo('pf-bairro', 'Bairro', <input id="pf-bairro" className="input" value={form.bairro} onChange={e=>setForm(f=>({...f,bairro:e.target.value}))} />)}
            {campo('pf-cidade', 'Cidade', <input id="pf-cidade" className="input" value={form.cidade} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))} />)}
          </div>
          {campo('pf-uf', 'Estado (UF)',
            <select id="pf-uf" className="select input-uf" value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}>
              <option value="">UF</option>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>)}

          <div><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Salvando...':'Salvar alterações'}</button></div>
        </div>
      </form>

      <form onSubmit={handleSenha} className="panel" aria-labelledby="perfil-senha">
        <div className="panel-head"><h2 id="perfil-senha">Trocar senha</h2></div>
        <div className="panel-body form-grid">
          {sucSenha && <div className="alert alert-success" role="status"><Icon name="check" size={16} />Senha atualizada!</div>}
          {erroSenha && <div className="alert alert-danger" role="alert">{erroSenha}</div>}
          <div className="grid-3">
            {campo('pf-senha-atual', 'Senha atual', <input id="pf-senha-atual" className="input" type="password" value={senhas.atual} onChange={e=>setSenhas(s=>({...s,atual:e.target.value}))} autoComplete="current-password" />)}
            {campo('pf-senha-nova', 'Nova senha', <input id="pf-senha-nova" className="input" type="password" value={senhas.nova} onChange={e=>setSenhas(s=>({...s,nova:e.target.value}))} autoComplete="new-password" />)}
            {campo('pf-senha-confirmar', 'Confirmar nova senha', <input id="pf-senha-confirmar" className="input" type="password" value={senhas.confirmar} onChange={e=>setSenhas(s=>({...s,confirmar:e.target.value}))} autoComplete="new-password" />)}
          </div>
          <div><button type="submit" className="btn btn-primary">Atualizar senha</button></div>
        </div>
      </form>
    </>
  )
}
