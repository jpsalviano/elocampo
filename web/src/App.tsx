import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import Login    from './pages/auth/Login'
import Cadastro from './pages/auth/Cadastro'

import DashboardProdutor from './pages/produtor/DashboardProdutor'
import MeusProdutos      from './pages/produtor/MeusProdutos'
import MinhasVendas      from './pages/produtor/MinhasVendas'
import PerfilProdutor    from './pages/produtor/PerfilProdutor'

import DashboardComprador from './pages/comprador/DashboardComprador'
import BuscarProdutos     from './pages/comprador/BuscarProdutos'
import MeusPedidos        from './pages/comprador/MeusPedidos'
import PerfilEmpresa      from './pages/comprador/PerfilEmpresa'

import AdminDashboard from './pages/admin/AdminDashboard'
import Mensagens from './pages/comum/Mensagens'

import { ProdutorLayout, CompradorLayout } from './components/layout/AppLayout'

// role: 'VENDOR' | 'BUYER' | 'ADMIN'
function Protected({ children, role }: { children: JSX.Element; role?: string }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="loading-screen" role="status">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />
  if (role === 'ADMIN' && !session.isAdmin) return <Navigate to="/" replace />
  if (role === 'VENDOR' && session.account?.role !== 'VENDOR') return <Navigate to="/" replace />
  if (role === 'BUYER'  && session.account?.role !== 'BUYER')  return <Navigate to="/" replace />
  return children
}

function Root() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (session.isAdmin) return <Navigate to="/admin" replace />
  if (session.account?.role === 'VENDOR') return <Navigate to="/produtor/dashboard" replace />
  if (session.account?.role === 'BUYER')  return <Navigate to="/comprador/dashboard" replace />
  return <Navigate to="/cadastro" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Routes>
          <Route path="/"         element={<Root />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* O layout (cabeçalho e abas) fica montado entre uma aba e outra. */}
          <Route element={<Protected role="VENDOR"><ProdutorLayout /></Protected>}>
            <Route path="/produtor/dashboard" element={<DashboardProdutor />} />
            <Route path="/produtor/produtos"  element={<MeusProdutos />} />
            <Route path="/produtor/vendas"    element={<MinhasVendas />} />
            <Route path="/produtor/mensagens"         element={<Mensagens base="/produtor/mensagens" />} />
            <Route path="/produtor/mensagens/:chatId" element={<Mensagens base="/produtor/mensagens" />} />
            <Route path="/produtor/perfil"    element={<PerfilProdutor />} />
          </Route>

          <Route element={<Protected role="BUYER"><CompradorLayout /></Protected>}>
            <Route path="/comprador/dashboard" element={<DashboardComprador />} />
            <Route path="/comprador/produtos"  element={<BuscarProdutos />} />
            <Route path="/comprador/pedidos"   element={<MeusPedidos />} />
            <Route path="/comprador/mensagens"         element={<Mensagens base="/comprador/mensagens" />} />
            <Route path="/comprador/mensagens/:chatId" element={<Mensagens base="/comprador/mensagens" />} />
            <Route path="/comprador/perfil"    element={<PerfilEmpresa />} />
          </Route>

          <Route path="/admin" element={<Protected role="ADMIN"><AdminDashboard /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
