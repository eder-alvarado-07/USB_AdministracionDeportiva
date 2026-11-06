import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { GRUPOS, MENU_INFERIOR, ROLES, iniciales, modulosDelRol } from '../config/navegacion'
import { intencion } from '../config/paginas'
import { perfilDeporte } from '../config/deportes'
import Avisos from './Avisos'

// Estructura v2.0 "Cancha": menú lateral verde noche con las líneas de una cancha (computador),
// barra superior con el deporte activo, y menú inferior + hoja "Más" en el celular.

const claseActiva = ({ isActive }) => (isActive ? 'activo' : undefined)

function SelectorDeporte({ id, oscuro = false }) {
  const { disciplinas, selectedSportId, setSelectedSportId, veTodosLosDeportes, deporteUnico, selectedSport } = useDeporte()
  if (!veTodosLosDeportes && disciplinas.length === 0) return null
  // Un solo deporte: se muestra como insignia fija, sin selector
  if (deporteUnico) {
    const perfil = perfilDeporte(deporteUnico.nombre)
    return (
      <span className={`deporte-activo fijo ${oscuro ? 'oscuro' : ''}`} style={{ '--deporte': perfil.color }}>
        <span className="deporte-activo-icono"><i className={`fa-solid ${perfil.icono}`} aria-hidden="true"></i></span>
        <span><small>Tu deporte</small><b>{deporteUnico.nombre}</b></span>
      </span>
    )
  }
  const perfil = perfilDeporte(selectedSport?.esTodos ? null : selectedSport?.nombre)
  return (
    <label className={`deporte-activo ${oscuro ? 'oscuro' : ''}`} htmlFor={id} style={{ '--deporte': perfil.color }}>
      <span className="deporte-activo-icono"><i className={`fa-solid ${selectedSport?.esTodos ? 'fa-layer-group' : perfil.icono}`} aria-hidden="true"></i></span>
      <span>
        <small>Deporte</small>
        <select id={id} value={selectedSportId || 'todos'} onChange={e => setSelectedSportId(e.target.value)}>
          <option value="todos">{veTodosLosDeportes ? 'Todos los deportes' : 'Todos mis deportes'}</option>
          {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </span>
      <i className="fa-solid fa-chevron-down deporte-activo-flecha" aria-hidden="true"></i>
    </label>
  )
}

function MenuLateral() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const modulos = modulosDelRol(usuario?.rol)
  const salir = () => { logout(); navigate('/login', { replace: true }) }
  return (
    <aside className="lateral" aria-label="Menú principal">
      <div className="lateral-cancha" aria-hidden="true"></div>
      <div className="lateral-marca">
        <img src="/brand/logo-horizontal-blanco.png" alt="Universidad Simón Bolívar" />
        <span>Administración Deportiva</span>
      </div>
      <SelectorDeporte id="deporte-lateral" oscuro />
      <nav className="lateral-nav">
        {GRUPOS.map(g => {
          const items = g.rutas.map(r => modulos.find(m => m.ruta === r)).filter(Boolean)
          if (!items.length) return null
          return (
            <div key={g.titulo} className="lateral-grupo">
              <p>{g.titulo}</p>
              <ul>
                {items.map(m => (
                  <li key={m.ruta}>
                    <NavLink to={m.ruta} end={m.ruta === '/'} className={claseActiva} {...intencion(m.ruta)}>
                      <i className={m.icono} aria-hidden="true"></i><span>{m.etiqueta}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
      <div className="lateral-usuario">
        <span className={`avatar rol-${usuario?.rol}`} aria-hidden="true">{iniciales(usuario?.nombre)}</span>
        <span className="lateral-usuario-texto"><b>{usuario?.nombre}</b><small>{ROLES[usuario?.rol] || usuario?.rol}</small></span>
        <button type="button" className="lateral-salir" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión">
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        </button>
      </div>
    </aside>
  )
}

function BarraSuperior() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const modulo = modulosDelRol(usuario?.rol).find(m => (m.ruta === '/' ? pathname === '/' : pathname.startsWith(m.ruta)))
  const nombre = (usuario?.nombre || '').split(' ')[0]
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  return (
    <header className="superior">
      {/* Celular: marca sobre fondo de cancha */}
      <div className="superior-marca">
        <img src="/brand/monograma-u-blanco-256.png" alt="" />
        <span className="superior-marca-texto">
          <span><b>Deportes</b> Unisimón</span>
          {/* v1.9 (observación del tester): en celular el nombre y el rol se ven arriba */}
          <small className="cabecera-sesion-movil">{nombre} · {ROLES[usuario?.rol] || usuario?.rol}</small>
        </span>
      </div>
      <div className="superior-contexto">
        <i className={modulo?.icono || 'fa-solid fa-house'} aria-hidden="true"></i>
        <span>{pathname === '/' ? `${saludo}, ${nombre}` : modulo?.etiqueta}</span>
      </div>
      <div className="superior-acciones">
        <Avisos />
        <span className={`avatar rol-${usuario?.rol} superior-avatar`} aria-hidden="true">{iniciales(usuario?.nombre)}</span>
      </div>
    </header>
  )
}

function MenuInferior() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [hojaAbierta, setHojaAbierta] = useState(false)

  const modulos = modulosDelRol(usuario?.rol)
  const fijas = (MENU_INFERIOR[usuario?.rol] || ['/']).map(r => modulos.find(m => m.ruta === r)).filter(Boolean)
  const resto = modulos.filter(m => !fijas.includes(m))
  const enResto = resto.some(m => (m.ruta === '/' ? pathname === '/' : pathname.startsWith(m.ruta)))

  useEffect(() => { setHojaAbierta(false) }, [pathname])
  useEffect(() => {
    if (!hojaAbierta) return
    const cerrar = (e) => { if (e.key === 'Escape') setHojaAbierta(false) }
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [hojaAbierta])

  return (
    <>
      <nav className="menu-inferior" aria-label="Menú principal">
        {fijas.map(m => (
          <NavLink key={m.ruta} to={m.ruta} end={m.ruta === '/'} className={claseActiva} {...intencion(m.ruta)}>
            <i className={m.icono} aria-hidden="true"></i>{m.corto}
          </NavLink>
        ))}
        <button type="button" className={enResto || hojaAbierta ? 'activo' : undefined}
          aria-expanded={hojaAbierta} aria-controls="hoja-mas" onClick={() => setHojaAbierta(v => !v)}>
          <i className="fa-solid fa-grip" aria-hidden="true"></i>Más
        </button>
      </nav>

      {hojaAbierta && (
        <>
          <div className="hoja-fondo" onClick={() => setHojaAbierta(false)} aria-hidden="true"></div>
          <div className="hoja" id="hoja-mas" role="dialog" aria-modal="true" aria-label="Más opciones">
            <div className="hoja-agarre" aria-hidden="true"></div>
            <div className="hoja-usuario">
              <span className={`avatar rol-${usuario?.rol}`} aria-hidden="true">{iniciales(usuario?.nombre)}</span>
              <span><b>{usuario?.nombre}</b><small>{ROLES[usuario?.rol] || usuario?.rol}</small></span>
            </div>
            <SelectorDeporte id="deporte-movil" />
            {resto.length > 0 && (
              <>
                <h2>Módulos</h2>
                <ul className="hoja-lista">
                  {resto.map(m => (
                    <li key={m.ruta}>
                      <NavLink to={m.ruta} end={m.ruta === '/'} className={claseActiva} {...intencion(m.ruta)}>
                        <i className={m.icono} aria-hidden="true"></i>{m.etiqueta}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button className="btn btn-secondary btn-bloque" type="button" style={{ marginTop: 16 }} onClick={() => { logout(); navigate('/login') }}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </>
  )
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="pie-in">
        <img className="pie-logo" src="/brand/logo-apilado-blanco.png" alt="Universidad Simón Bolívar, Barranquilla y Cúcuta, Colombia. Vigilada MinEducación" />
        <p>Administración Deportiva · Sede Cúcuta. Plantel, entrenamientos, salud y rendimiento. Uso interno.</p>
        <ul>
          <li><a href="https://www.unisimon.edu.co" target="_blank" rel="noreferrer">Unisimón</a></li>
          <li><a href="https://cucuta.unisimon.edu.co/estudiante/" target="_blank" rel="noreferrer">Portal Estudiante</a></li>
        </ul>
      </div>
      <div className="pie-final">© Universidad Simón Bolívar {new Date().getFullYear()}</div>
    </footer>
  )
}

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <MenuLateral />
      <div className="app-principal">
        <BarraSuperior />
        <main className="main-content">{children}</main>
        <Pie />
      </div>
      <MenuInferior />
    </div>
  )
}
