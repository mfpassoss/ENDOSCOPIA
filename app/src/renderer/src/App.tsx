import { useEffect, useState } from 'react'
import { ToastProvider } from './toast'
import { ExamesPage } from './pages/ExamesPage'
import { PacientesPage } from './pages/PacientesPage'
import { ExamePage } from './pages/ExamePage'
import { ModelosPage } from './pages/ModelosPage'
import { ConfigPage } from './pages/ConfigPage'

export type Route =
  | { name: 'exames' }
  | { name: 'pacientes' }
  | { name: 'exame'; id: number; tab?: 'dados' | 'imagens' | 'laudo' }
  | { name: 'modelos' }
  | { name: 'config' }

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'exames' })
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.api.app.version().then(setVersion)
  }, [])

  const nav = (r: Route): void => setRoute(r)
  const is = (n: Route['name']): boolean => route.name === n || (n === 'exames' && route.name === 'exame')

  return (
    <ToastProvider>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            EndoLaudo
            <small>Endoscopia digestiva</small>
          </div>
          <nav className="nav">
            <button className={is('exames') ? 'active' : ''} onClick={() => nav({ name: 'exames' })}>
              Exames
            </button>
            <button className={is('pacientes') ? 'active' : ''} onClick={() => nav({ name: 'pacientes' })}>
              Pacientes
            </button>
            <button className={is('modelos') ? 'active' : ''} onClick={() => nav({ name: 'modelos' })}>
              Modelos de laudo
            </button>
            <button className={is('config') ? 'active' : ''} onClick={() => nav({ name: 'config' })}>
              Configurações
            </button>
          </nav>
          <div className="foot">v{version}</div>
        </aside>
        <main className="main">
          {route.name === 'exames' && <ExamesPage nav={nav} />}
          {route.name === 'pacientes' && <PacientesPage nav={nav} />}
          {route.name === 'exame' && <ExamePage key={route.id} id={route.id} initialTab={route.tab} nav={nav} />}
          {route.name === 'modelos' && <ModelosPage />}
          {route.name === 'config' && <ConfigPage />}
        </main>
      </div>
    </ToastProvider>
  )
}
