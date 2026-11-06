import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { Esqueleto, EstadoError } from '../components/EstadoVista'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import Convocatoria from '../components/Convocatoria'
import InstalarApp from '../components/InstalarApp'
import AgregarCalendario from '../components/AgregarCalendario'
import AvisosEquipo from '../components/AvisosEquipo'
import CampoClave from '../components/CampoClave'
import { ROLES, iniciales } from '../config/navegacion'
import { capitalizar, diaCorto, diasHasta, fechaCorta, fechaLarga, fechaRelativa, numeroDia } from '../utils/fechas'
import { nombreConDorsal, tieneDorsal } from '../utils/jugador'
import { perfilDeporte, TEXTO_TIPO } from '../config/deportes'

// Acciones del panel "Mi sesión" según el rol (la primera es la destacada en naranja)
const ACCIONES = {
  administrador:  [{ a: '/usuarios', texto: 'Gestionar usuarios', icono: 'fa-user-gear' }, { a: '/jugadores', texto: 'Registrar deportista' }],
  head_coach:     [{ a: '/head-coach', texto: 'Ver supervisión', icono: 'fa-binoculars' }, { a: '/jugadores', texto: 'Ver deportistas' }],
  entrenador:     [{ a: '/asistencia', texto: 'Tomar asistencia', icono: 'fa-clipboard-check' }, { a: '/entrenamientos', texto: 'Registrar entrenamiento' }],
  personal_salud: [{ a: '/lesiones', texto: 'Registrar lesión', icono: 'fa-kit-medical' }, { a: '/salud', texto: 'Registrar control médico' }],
  jugador:        [{ a: '/salud', texto: 'Ver mis controles', icono: 'fa-stethoscope' }, { a: '/estadisticas', texto: 'Ver mis estadísticas' }],
}

const ESTADOS = {
  disponible:    { texto: 'Disponible',       icono: 'fa-circle-check',         clase: 'ok' },
  restringido:   { texto: 'Con restricciones', icono: 'fa-triangle-exclamation', clase: 'aviso' },
  no_disponible: { texto: 'No disponible',    icono: 'fa-circle-xmark',         clase: 'error' },
}

export default function Dashboard() {
  const { usuario, logout } = useAuth()
  const { selectedSportId, selectedSport } = useDeporte()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const params = selectedSportId && selectedSportId !== 'todos' ? { disciplina_id: selectedSportId } : {}
      const { data } = await api.get('/dashboard/inicio', { params })
      setDatos(data)
    } catch (e) {
      setError(e.message || 'No se pudo cargar el inicio')
    } finally {
      setCargando(false)
    }
  }, [selectedSportId])

  useEffect(() => { cargar() }, [cargar])

  // Mientras carga: la forma de los paneles del inicio, para que nada salte al llegar los datos
  if (cargando && !datos) {
    return (
      <div className="inicio">
        <div className="inicio-columna">
          <div className="panel ini-esqueleto-banner"><Esqueleto tipo="panel" filas={4} etiqueta="Cargando el inicio…" /></div>
          <div className="panel"><Esqueleto tipo="panel" filas={7} etiqueta="" /></div>
        </div>
        <div className="inicio-columna">
          <div className="panel"><Esqueleto tipo="panel" filas={5} etiqueta="" /></div>
        </div>
      </div>
    )
  }

  if (error && !datos) {
    return <div className="panel"><EstadoError titulo="No se pudo cargar el inicio" mensaje={error} onReintentar={cargar} /></div>
  }

  const esJugador = usuario?.rol === 'jugador'
  const deporte = selectedSport?.esTodos ? null : selectedSport?.nombre

  return (
    <div className="inicio">
      <h1 className="sr-only">Inicio</h1>
      <div className="inicio-columna">
        <BannerPartido partido={datos.proximo_partido} resumen={datos.resumen} esJugador={esJugador} rol={usuario?.rol}
          convocatoria={datos.convocatoria} onCambio={cargar} />
        {esJugador
          ? <MiEstado jugador={datos.plantel[0]} revisar={datos.revisar} />
          : <Disponibilidad plantel={datos.plantel} resumen={datos.resumen} deporte={deporte} rol={usuario?.rol} />}
        <Asistencia sesiones={datos.asistencia} esJugador={esJugador} />
        <Reconocimientos lista={datos.reconocimientos || []} />
        <Anotadores lista={datos.anotadores} esJugador={esJugador} />
      </div>
      <div className="inicio-columna">
        <MiSesion usuario={usuario} onSalir={logout} />
        {!esJugador && <ParaRevisar items={datos.revisar} />}
        <AvisosEquipo />
        <EstaSemana items={datos.semana} />
        <Deportes />
      </div>
    </div>
  )
}

/* ── Banner del próximo partido ─────────────────────────── */
function BannerPartido({ partido, resumen, esJugador, rol, convocatoria, onCambio }) {
  const puedeProgramar = ['administrador', 'entrenador', 'head_coach'].includes(rol)
  const puedeConvocar = ['administrador', 'entrenador'].includes(rol)
  const [abierta, setAbierta] = useState(null)
  // El deportista ve su próxima convocatoria (puede ser de otro partido que no es el más cercano)
  const partidoConv = esJugador && convocatoria
    ? { id: convocatoria.partido_id, rival: convocatoria.rival, fecha: convocatoria.fecha }
    : partido
  return (
    <section className="ini-banner orden-1" aria-labelledby="t-partido">
      <div className="ini-cancha" aria-hidden="true"></div>
      {partido ? (
        <>
          <p className="ini-banner-tipo">
            <span className="chip-deporte claro"><i className={`fa-solid ${perfilDeporte(partido.disciplina_nombre).icono}`} aria-hidden="true"></i> {partido.disciplina_nombre || 'Próximo evento'}</span>
            <span>{TEXTO_TIPO[partido.tipo] || partido.tipo}{partido.equipo_nombre ? ` · ${partido.equipo_nombre}` : ''}</span>
          </p>
          <div className="ini-versus">
            <div className="ini-equipo">
              <span className="ini-escudo"><img src="/brand/monograma-u-blanco-256.png" alt="" /></span>
              <b>Unisimón</b>
            </div>
            <div className="ini-cuenta" aria-hidden="true">
              <span className="ini-cuenta-numero">{Math.max(diasHasta(partido.fecha), 0)}</span>
              <span className="ini-cuenta-texto">{diasHasta(partido.fecha) === 0 ? '¡Hoy!' : diasHasta(partido.fecha) === 1 ? 'día' : 'días'}</span>
            </div>
            <div className="ini-equipo">
              <span className="ini-escudo rival">{partido.rival.slice(0, 2).toUpperCase()}</span>
              <b>{partido.rival}</b>
            </div>
          </div>
          <h2 id="t-partido" className="sr-only">Unisimón vs. {partido.rival}</h2>
          <p className="ini-banner-dato">
            <i className="fa-regular fa-calendar" aria-hidden="true"></i> {capitalizar(fechaRelativa(partido.fecha))}{fechaRelativa(partido.fecha) !== fechaLarga(partido.fecha) ? `, ${fechaLarga(partido.fecha)}` : ''}
            {partido.hora && <> · <i className="fa-regular fa-clock" aria-hidden="true"></i> {partido.hora}</>}
            {partido.lugar && <> · <i className="fa-solid fa-location-dot" aria-hidden="true"></i> {partido.lugar}</>}
          </p>
          <ResumenConvocatoria convocatoria={convocatoria} esJugador={esJugador} />
          <div className="ini-banner-acciones">
            {(convocatoria?.publicada || esJugador ? convocatoria : puedeConvocar) ? (
              <button type="button" className="btn btn-naranja" onClick={() => setAbierta(partidoConv)}>
                <i className="fa-solid fa-clipboard-list" aria-hidden="true"></i>
                {esJugador ? (convocatoria?.confirmacion === 'pendiente' ? 'Responder convocatoria' : 'Ver convocatoria')
                  : convocatoria?.publicada ? 'Ver convocatoria' : convocatoria?.total ? 'Seguir convocatoria' : 'Armar convocatoria'}
              </button>
            ) : <Link className="btn btn-naranja" to="/partidos">Ver partidos</Link>}
            {!esJugador && resumen.total > 0 && (
              <span className="ini-banner-disponibles">
                <i className="fa-solid fa-user-check" aria-hidden="true"></i>
                <span><b>{resumen.disponibles + resumen.restringidos} de {resumen.total}</b> disponibles</span>
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="ini-banner-tipo"><span>Calendario</span></p>
          <h2 id="t-partido">Sin partidos en el horizonte</h2>
          <p className="ini-banner-dato">Cuando se programe el próximo partido o competencia, aparecerá aquí con la cuenta regresiva y la disponibilidad del plantel.</p>
          {puedeProgramar && <div className="ini-banner-acciones"><Link className="btn btn-naranja" to="/partidos"><i className="fa-solid fa-plus" aria-hidden="true"></i> Programar partido</Link></div>}
        </>
      )}
      {abierta && <Convocatoria partido={abierta} onCerrar={() => setAbierta(null)} onCambio={onCambio} />}
    </section>
  )
}

/* ── Convocatoria en el banner (v1.6) ───────────────────── */
function ResumenConvocatoria({ convocatoria: c, esJugador }) {
  if (!c) return null
  if (esJugador) {
    const textos = { pendiente: 'Confirma tu asistencia', confirmado: 'Confirmaste tu asistencia', no_puede: 'Avisaste que no puedes ir' }
    return (
      <p className={`ini-convocado ${c.confirmacion}`}>
        <i className="fa-solid fa-bullhorn" aria-hidden="true"></i>
        <span>Estás convocado como <b>{c.rol}</b>{c.hora_presentacion ? ` · presentación ${c.hora_presentacion}` : ''}. {textos[c.confirmacion]}.</span>
      </p>
    )
  }
  if (!c.publicada) return c.total ? <p className="ini-banner-dato">Convocatoria en borrador ({c.total} deportistas), sin publicar.</p> : null
  return (
    <p className="ini-banner-dato ini-banner-convocatoria">
      <i className="fa-solid fa-clipboard-list" aria-hidden="true"></i>
      Convocatoria: <b>{c.confirmados}</b> confirmaron · <b>{c.pendientes}</b> sin responder · <b>{c.no_pueden}</b> no pueden
    </p>
  )
}

/* ── Disponibilidad del plantel (dorsales) ──────────────── */
function Disponibilidad({ plantel, resumen, deporte, rol }) {
  const { setSelectedSportId } = useDeporte()
  const [visto, setVisto] = useState(null)
  return (
    <section className="panel orden-2" aria-labelledby="t-disp">
      <div className="panel-cabecera">
        <h2 id="t-disp">Disponibilidad del plantel{deporte ? `: ${deporte}` : ''}</h2>
        {resumen.total > 0 && <span className="panel-contador">{resumen.disponibles + resumen.restringidos} de {resumen.total}</span>}
      </div>
      <div className="panel-cuerpo">
        {plantel.length === 0 ? (
          <div className="ini-vacio">
            <i className="fa-solid fa-users" aria-hidden="true"></i>
            <p>
              {deporte
                ? `No hay deportistas${rol === 'entrenador' ? ' tuyos' : ''} en ${deporte}.`
                : rol === 'entrenador' ? 'Todavía no tienes deportistas asignados.' : 'Todavía no hay deportistas registrados.'}
            </p>
            {deporte && <button type="button" className="btn btn-secondary" onClick={() => setSelectedSportId('todos')}><i className="fa-solid fa-xmark" aria-hidden="true"></i> Ver todos los deportes</button>}
            {!deporte && ['administrador', 'entrenador'].includes(rol) && <Link className="btn btn-primary" to="/jugadores">Registrar deportista</Link>}
          </div>
        ) : (
          <>
            <ul className="ini-plantel" aria-label="Estado de cada jugador">
              {plantel.map(j => {
                const e = ESTADOS[j.estado]
                const apellido = j.nombre.split(' ').slice(-1)[0]
                return (
                  <li key={j.id}>
                    <button type="button" className={`ini-dorsal ${j.estado}`} onClick={() => setVisto(j)}
                      title={`${j.nombre}: ${e.texto}${j.motivo ? `. ${j.motivo}` : ''}`}>
                      {j.estado !== 'disponible' && <i className={`fa-solid ${e.icono} ini-dorsal-estado`} aria-hidden="true"></i>}
                      <span className="ini-dorsal-numero">{tieneDorsal(j.dorsal) ? j.dorsal : '–'}</span>
                      <span className="ini-dorsal-nombre">{apellido}</span>
                      <span className="sr-only">{j.nombre}, {e.texto}{j.motivo ? `, ${j.motivo}` : ''}. Ver como lo ve el deportista</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="ini-leyenda">
              <span><i className="fa-solid fa-circle-check l-ok" aria-hidden="true"></i><b>{resumen.disponibles}</b> disponibles</span>
              <span><i className="fa-solid fa-triangle-exclamation l-aviso" aria-hidden="true"></i><b>{resumen.restringidos}</b> con restricciones</span>
              <span><i className="fa-solid fa-circle-xmark l-error" aria-hidden="true"></i><b>{resumen.no_disponibles}</b> no disponibles</span>
            </p>
            <p className="ini-nota-toque">Toca un número para ver el inicio tal como lo ve ese deportista.</p>
          </>
        )}
      </div>
      {visto && <VistaDeportista jugador={visto} onCerrar={() => setVisto(null)} />}
    </section>
  )
}

/* ── Vista de un deportista: su inicio, como lo ve en su cuenta ── */
function VistaDeportista({ jugador, onCerrar }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const cargar = useCallback(async () => {
    setDatos(null); setError('')
    try {
      const { data } = await api.get('/dashboard/inicio', { params: { jugador_id: jugador.id } })
      // Nunca mostrar a otro deportista: la respuesta debe traer exactamente al que se tocó
      if (!data.plantel?.some(j => j.id === jugador.id)) throw new Error('El servidor no devolvió la vista de este deportista.')
      setDatos(data)
    } catch (e) {
      setError(e.message || 'No se pudo cargar la vista del deportista')
    }
  }, [jugador.id])
  useEffect(() => { cargar() }, [cargar])

  return (
    <Modal title={nombreConDorsal(jugador.nombre, jugador.dorsal)} onClose={onCerrar}>
      <div className="vista-deportista">
        <p className="alerta alerta-info"><i className="fa-solid fa-eye" aria-hidden="true"></i>
          <span>Así ve su inicio este deportista cuando entra con su cuenta.</span></p>
        {error ? (
          <EstadoError compacto mensaje={error} onReintentar={cargar} />
        ) : !datos ? (
          <Esqueleto tipo="panel" filas={6} etiqueta="Cargando la vista del deportista…" />
        ) : (
          <>
            <MiEstado jugador={datos.plantel.find(j => j.id === jugador.id)} revisar={datos.revisar.filter(r => r.jugador_id === jugador.id)} />
            <Asistencia sesiones={datos.asistencia} esJugador idTitulo="t-asis-deportista" />
          </>
        )}
      </div>
    </Modal>
  )
}

/* ── Vista del jugador: su propio estado ────────────────── */
function MiEstado({ jugador, revisar }) {
  if (!jugador) {
    return (
      <section className="panel orden-2" aria-labelledby="t-estado">
        <div className="panel-cabecera"><h2 id="t-estado">Mi estado</h2></div>
        <div className="panel-cuerpo">
          <div className="alerta alerta-info"><i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>Tu usuario todavía no está vinculado a una ficha de deportista. Pídele al administrador que lo vincule.</span></div>
        </div>
      </section>
    )
  }
  const e = ESTADOS[jugador.estado]
  const lesion = revisar.find(r => r.tipo === 'lesion')
  return (
    <section className="panel orden-2" aria-labelledby="t-estado">
      <div className="panel-cabecera"><h2 id="t-estado">Mi estado</h2></div>
      <div className="panel-cuerpo ini-mi-estado">
        <div className={`ini-dorsal grande ${jugador.estado}`}>
          <span className="ini-dorsal-numero">{tieneDorsal(jugador.dorsal) ? jugador.dorsal : '–'}</span>
          <span className="ini-dorsal-nombre">{jugador.posicion || 'Sin posición'}</span>
        </div>
        <div>
          <p className="ini-mi-nombre">{jugador.nombre}</p>
          <p className={`badge badge-${e.clase === 'ok' ? 'green' : e.clase === 'aviso' ? 'orange' : 'red'}`}>
            <i className={`fa-solid ${e.icono}`} aria-hidden="true"></i> {e.texto}
          </p>
          {jugador.motivo && <p className="ini-mi-motivo">{jugador.motivo}</p>}
          {lesion?.retorno_estimado && <p className="ini-mi-motivo">Retorno estimado: {fechaCorta(lesion.retorno_estimado)}.</p>}
        </div>
      </div>
    </section>
  )
}

/* ── Asistencia (barras de progreso) ────────────────────── */
function Asistencia({ sesiones, esJugador, idTitulo = 't-asis' }) {
  return (
    <section className="panel orden-5" aria-labelledby={idTitulo}>
      <div className="panel-cabecera"><h2 id={idTitulo}>{esJugador ? 'Mi asistencia' : 'Asistencia a entrenamientos'}</h2></div>
      <div className="panel-cuerpo">
        {sesiones.length === 0 ? (
          <p className="ini-texto-suave">Todavía no hay entrenamientos registrados.</p>
        ) : (
          <>
            <ul className="ini-asistencia">
              {sesiones.map(s => {
                const pct = s.registrados ? Math.round((s.presentes / s.registrados) * 100) : null
                return (
                  <li key={s.id}>
                    <div className="ini-asistencia-fila">
                      <span><b>{s.tipo}</b>, {fechaLarga(s.fecha)}</span>
                      <span>{s.registrados ? (esJugador ? (s.presentes ? 'Asististe' : 'No asististe') : `${s.presentes} de ${s.registrados}`) : 'Sin registro'}</span>
                    </div>
                    {pct !== null && !esJugador && (
                      <div className="ini-pista" role="img" aria-label={`${pct} % de asistencia`}>
                        <div className={pct < 75 ? 'baja' : undefined} style={{ width: `${Math.max(pct, 4)}%` }}>{pct} %</div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {!esJugador && <p className="ini-nota"><span aria-hidden="true"></span>Sesiones con menos del 75 % de asistencia.</p>}
          </>
        )}
      </div>
    </section>
  )
}

/* ── Reconocimientos (v1.7): sobrios, con los datos que ya registra el cuerpo técnico ── */
function Reconocimientos({ lista }) {
  if (!lista.length) return null
  return (
    <section className="panel orden-5" aria-labelledby="t-rcn">
      <div className="panel-cabecera"><h2 id="t-rcn">Reconocimientos</h2></div>
      <div className="panel-cuerpo">
        <ul className="ini-rcn">
          {lista.map(r => (
            <li key={r.tipo}>
              <i className={`fa-solid ${r.icono}`} aria-hidden="true"></i>
              <div>
                <p className="ini-rcn-titulo">{r.titulo}</p>
                <p className="ini-rcn-nombres">
                  {r.jugadores.map(j => nombreConDorsal(j.nombre, j.dorsal)).join(', ')}
                  {r.total > r.jugadores.length && ` y ${r.total - r.jugadores.length} más`}
                </p>
                {r.detalle && <p className="ini-rcn-detalle">{r.detalle}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ── Máximos anotadores ─────────────────────────────────── */
function Anotadores({ lista, esJugador }) {
  if (!lista.length || esJugador) return null
  return (
    <section className="panel orden-7" aria-labelledby="t-anot">
      <div className="panel-cabecera"><h2 id="t-anot">Máximos anotadores</h2></div>
      <div className="table-wrapper" style={{ border: 0, borderRadius: 0 }}>
        <table>
          <thead><tr><th>Jugador</th><th style={{ textAlign: 'right' }}>Anotaciones</th><th style={{ textAlign: 'right' }}>Asistencias</th></tr></thead>
          <tbody>
            {lista.map(j => (
              <tr key={j.id}>
                <td>{nombreConDorsal(j.nombre, j.dorsal)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><b>{j.anotaciones}</b></td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{j.asistencias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ── Mi sesión (como "Sesión del usuario" del portal) ───── */
function MiSesion({ usuario, onSalir }) {
  const [cambiarClave, setCambiarClave] = useState(false)
  const acciones = ACCIONES[usuario?.rol] || []
  return (
    <section className="panel orden-1" aria-labelledby="t-sesion">
      <div className="panel-cabecera"><h2 id="t-sesion">Mi sesión</h2></div>
      <div className="panel-cuerpo">
        <div className="ini-sesion">
          <div className="ini-sesion-foto" aria-hidden="true">{iniciales(usuario?.nombre)}</div>
          <dl>
            <div><dt>Nombre</dt><dd>{usuario?.nombre}</dd></div>
            <div><dt>Rol</dt><dd>{ROLES[usuario?.rol] || usuario?.rol}</dd></div>
            <div><dt>Correo</dt><dd>{usuario?.email}</dd></div>
          </dl>
        </div>
        <div className="ini-botones">
          {acciones.map((ac, i) => (
            <Link key={ac.a} to={ac.a} className={`btn btn-bloque ${i === 0 ? 'btn-naranja' : 'btn-secondary'}`}>
              {ac.icono && <i className={`fa-solid ${ac.icono}`} aria-hidden="true"></i>} {ac.texto}
            </Link>
          ))}
          <InstalarApp />
          <button type="button" className="btn btn-secondary btn-bloque" onClick={() => setCambiarClave(true)}>Cambiar contraseña</button>
          <button type="button" className="btn btn-secondary btn-bloque" onClick={onSalir}>Cerrar sesión</button>
        </div>
      </div>
      {cambiarClave && <CambiarClave onCerrar={() => setCambiarClave(false)} />}
    </section>
  )
}

function CambiarClave({ onCerrar }) {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (c) => (e) => { setForm(f => ({ ...f, [c]: e.target.value })); setError('') }

  const guardar = async (e) => {
    e.preventDefault()
    if (form.nueva.length < 6) return setError('La contraseña nueva debe tener al menos 6 caracteres.')
    if (form.nueva !== form.confirmar) return setError('La confirmación no coincide con la contraseña nueva.')
    setGuardando(true)
    try {
      await api.put('/auth/cambiar-password', { password_actual: form.actual, password_nuevo: form.nueva })
      toast.success('Contraseña cambiada')
      onCerrar()
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onCerrar}>
      <form onSubmit={guardar} style={{ display: 'grid', gap: 14 }}>
        {error && <div className="alerta alerta-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
        <div className="form-group"><label htmlFor="clave-actual">Contraseña actual</label>
          <CampoClave id="clave-actual" autoComplete="current-password" value={form.actual} onChange={cambiar('actual')} required /></div>
        <div className="form-group"><label htmlFor="clave-nueva">Contraseña nueva</label>
          <CampoClave id="clave-nueva" autoComplete="new-password" value={form.nueva} onChange={cambiar('nueva')} required minLength={6} /></div>
        <div className="form-group"><label htmlFor="clave-confirmar">Confirmar contraseña nueva</label>
          <CampoClave id="clave-confirmar" autoComplete="new-password" value={form.confirmar} onChange={cambiar('confirmar')} required /></div>
        <div className="modal-footer" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Para revisar (alertas del portal) ──────────────────── */
function ParaRevisar({ items }) {
  return (
    <section className="panel orden-3" aria-labelledby="t-rev">
      <div className="panel-cabecera"><h2 id="t-rev">Para revisar</h2>{items.length > 0 && <span className="panel-contador">{items.length}</span>}</div>
      <div className="panel-cuerpo">
        {items.length === 0 ? (
          <div className="alerta alerta-ok"><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Todo al día: no hay lesiones activas ni restricciones pendientes.</span></div>
        ) : (
          <ul className="ini-avisos">
            {items.map((it, i) => <Aviso key={i} it={it} />)}
          </ul>
        )}
      </div>
    </section>
  )
}

function Aviso({ it }) {
  const quien = <b>{nombreConDorsal(it.nombre, it.dorsal)}</b>
  if (it.tipo === 'lesion') return (
    <li className="alerta alerta-error"><i className="fa-solid fa-kit-medical" aria-hidden="true"></i>
      <div>{quien} lleva {it.dias} {it.dias === 1 ? 'día' : 'días'} lesionado{it.lesion ? ` (${it.lesion.toLowerCase()})` : ''}.{it.retorno_estimado ? ` Retorno estimado: ${fechaCorta(it.retorno_estimado)}.` : ''}<br />
        <Link to="/lesiones">Ver lesiones</Link></div></li>
  )
  if (it.tipo === 'restriccion') return (
    <li className="alerta alerta-aviso"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <div>{quien} juega con restricción{it.restricciones ? `: ${it.restricciones.charAt(0).toLowerCase()}${it.restricciones.slice(1)}` : ''}.<br />
        <Link to="/salud">Ver controles médicos</Link></div></li>
  )
  if (it.tipo === 'no_apto') return (
    <li className="alerta alerta-error"><i className="fa-solid fa-circle-xmark" aria-hidden="true"></i>
      <div>{quien} está no apto temporalmente según su último control médico.<br /><Link to="/salud">Ver controles médicos</Link></div></li>
  )
  if (it.tipo === 'control_vencido') return (
    <li className="alerta alerta-info"><i className="fa-solid fa-calendar-xmark" aria-hidden="true"></i>
      <div>{quien} tiene un control médico pendiente desde el {fechaCorta(it.fecha)}.<br /><Link to="/salud">Registrar control</Link></div></li>
  )
  if (it.tipo === 'antropometria') return (
    <li className="alerta alerta-info"><i className="fa-solid fa-ruler-combined" aria-hidden="true"></i>
      <div><b>{it.total} {it.total === 1 ? 'jugador no tiene' : 'jugadores no tienen'}</b> evaluación antropométrica este semestre.<br /><Link to="/antropometria">Ir a antropometría</Link></div></li>
  )
  return null
}

/* ── Esta semana ────────────────────────────────────────── */
function EstaSemana({ items }) {
  return (
    <section className="panel orden-4" aria-labelledby="t-semana">
      <div className="panel-cabecera"><h2 id="t-semana">Esta semana</h2></div>
      <div className="panel-cuerpo">
        {items.length === 0 ? (
          <p className="ini-texto-suave">No hay entrenamientos ni partidos en los próximos 7 días.</p>
        ) : (
          <ul className="ini-agenda">
            {items.map(it => (
              <li key={`${it.clase}-${it.id}`} className={it.clase}>
                <div className="ini-agenda-fecha"><small>{diaCorto(it.fecha)}</small><b>{numeroDia(it.fecha)}</b></div>
                <div>
                  <p className="ini-agenda-titulo">{it.titulo} {it.etiqueta && <span className="ini-etiqueta">{it.etiqueta}</span>}</p>
                  <p className="ini-agenda-detalle">{it.detalle || (it.clase === 'partido' ? 'Partido' : 'Entrenamiento')}</p>
                </div>
                <AgregarCalendario compacto evento={{
                  id: `${it.clase}-${it.id}`, titulo: it.titulo, fecha: it.fecha, hora: it.hora, lugar: it.lugar,
                  minutos: it.clase === 'partido' ? 150 : 90,
                  descripcion: it.clase === 'partido' ? 'Partido · Administración Deportiva Unisimón' : 'Entrenamiento · Administración Deportiva Unisimón',
                }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/* ── Deportes y sus categorías (v2.0): el administrador define qué categorías maneja cada deporte ── */
function Deportes() {
  const { disciplinas, selectedSportId, setSelectedSportId, crearDisciplina, eliminarDisciplina, puedeGestionarDeportes } = useDeporte()
  const [nombre, setNombre] = useState('')
  const [aEliminar, setAEliminar] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [abierto, setAbierto] = useState(null)
  const [nuevaCat, setNuevaCat] = useState('')
  const cargarCategorias = useCallback(() => api.get('/disciplinas/categorias').then(r => setCategorias(r.data)).catch(() => {}), [])
  useEffect(() => { if (puedeGestionarDeportes) cargarCategorias() }, [puedeGestionarDeportes, cargarCategorias])
  if (!puedeGestionarDeportes) return null

  const crear = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setOcupado(true)
    try { await crearDisciplina(nombre.trim()); setNombre('') } catch { /* el contexto ya muestra el error */ } finally { setOcupado(false) }
  }
  const eliminar = async () => {
    setOcupado(true)
    try { await eliminarDisciplina(aEliminar.id, aEliminar.nombre); setAEliminar(null) } catch { /* idem */ } finally { setOcupado(false) }
  }
  const agregarCategoria = async (e, disciplinaId) => {
    e.preventDefault()
    if (!nuevaCat.trim()) return
    try {
      await api.post(`/disciplinas/${disciplinaId}/categorias`, { nombre: nuevaCat.trim() })
      setNuevaCat(''); cargarCategorias()
    } catch (err) { toast.error(err.message) }
  }
  const quitarCategoria = async (c) => {
    try { await api.delete(`/disciplinas/categorias/${c.id}`); cargarCategorias() } catch (err) { toast.error(err.message) }
  }

  return (
    <section className="panel orden-8" aria-labelledby="t-dep">
      <div className="panel-cabecera"><h2 id="t-dep">Deportes y categorías</h2><span className="panel-contador">{disciplinas.length}</span></div>
      <div className="panel-cuerpo">
        <ul className="ini-deportes">
          {disciplinas.map(d => {
            const activo = String(selectedSportId) === String(d.id)
            const perfil = perfilDeporte(d.nombre)
            const cats = categorias.filter(c => String(c.disciplina_id) === String(d.id))
            const expandido = abierto === d.id
            return (
              <li key={d.id} className={activo ? 'activo' : undefined} style={{ '--deporte': perfil.color }}>
                <div className="ini-deporte-fila">
                  <button type="button" className="ini-deporte-nombre" onClick={() => setSelectedSportId(activo ? 'todos' : d.id)} aria-pressed={activo}>
                    <span className="ini-deporte-icono"><i className={`fa-solid ${perfil.icono}`} aria-hidden="true"></i></span> {d.nombre}
                    <small>{cats.length ? `${cats.length} ${cats.length === 1 ? 'categoría' : 'categorías'}` : 'Sin categorías'}</small>
                  </button>
                  <button type="button" className="btn-icon" onClick={() => { setAbierto(expandido ? null : d.id); setNuevaCat('') }}
                    aria-expanded={expandido} aria-label={`Categorías de ${d.nombre}`} title="Categorías">
                    <i className={`fa-solid ${expandido ? 'fa-chevron-up' : 'fa-layer-group'}`} aria-hidden="true"></i>
                  </button>
                  <button type="button" className="btn-icon btn-danger" onClick={() => setAEliminar(d)} aria-label={`Eliminar ${d.nombre}`}>
                    <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                  </button>
                </div>
                {expandido && (
                  <div className="ini-categorias">
                    {cats.length === 0 && <p className="ini-texto-suave">¿Qué categorías maneja {d.nombre} en la universidad? Agrégalas aquí (ej. Masculino, Femenino, Sub-20).</p>}
                    <ul>
                      {cats.map(c => (
                        <li key={c.id}>
                          <span>{c.nombre}</span><small>{c.total_equipos} {c.total_equipos === 1 ? 'equipo' : 'equipos'}</small>
                          <button type="button" className="btn-icon btn-danger" onClick={() => quitarCategoria(c)} aria-label={`Quitar la categoría ${c.nombre}`}>
                            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <form className="ini-deporte-form" onSubmit={(e) => agregarCategoria(e, d.id)}>
                      <label className="sr-only" htmlFor={`cat-${d.id}`}>Nueva categoría de {d.nombre}</label>
                      <input id={`cat-${d.id}`} placeholder="Nueva categoría" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} maxLength={60} />
                      <button className="btn btn-secondary" type="submit" disabled={!nuevaCat.trim()}>Agregar</button>
                    </form>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <form className="ini-deporte-form" onSubmit={crear}>
          <label className="sr-only" htmlFor="nuevo-deporte">Nuevo deporte</label>
          <input id="nuevo-deporte" placeholder="Nuevo deporte, por ejemplo Voleibol" value={nombre} onChange={e => setNombre(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={ocupado || !nombre.trim()}>Agregar</button>
        </form>
      </div>
      <ConfirmModal
        isOpen={!!aEliminar}
        title={`Eliminar ${aEliminar?.nombre || ''}`}
        message="Los deportistas y equipos de este deporte quedarán sin deporte asignado, y se borrarán sus categorías. Esta acción no se puede deshacer."
        confirmText="Eliminar deporte"
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
        loading={ocupado}
      />
    </section>
  )
}
