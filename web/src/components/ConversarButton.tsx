import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { abrirConversa } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Icon } from './Icon'

// Abre (ou cria) a conversa com a outra parte do pedido e vai para ela.
export function ConversarButton({ outroAccountId, base }: { outroAccountId: string; base: string }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState('')

  async function abrir() {
    const meuId = session?.account?.id
    if (!meuId) { setErro('Conta não encontrada'); return }
    setAbrindo(true)
    setErro('')
    try {
      const chat = await abrirConversa(outroAccountId, meuId)
      navigate(`${base}/${chat.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível abrir a conversa.')
      setAbrindo(false)
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={abrir} disabled={abrindo}>
        <Icon name="mensagens" size={16} />
        {abrindo ? 'Abrindo…' : 'Conversar'}
      </button>
      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
    </>
  )
}
