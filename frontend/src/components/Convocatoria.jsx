// Convocatoria oficial de un partido (v1.6).
// Entrenador y administrador la arman (titulares y suplentes entre sus deportistas, con su estado médico a la vista),
// la publican y siguen las respuestas. El deportista convocado confirma o avisa que no puede hasta el día del partido.
// Todos los demás ven la plantilla publicada. Cada acción queda en el registro (historial).
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Esqueleto, EstadoError, EstadoVacio } from './EstadoVista'
import { nombreConDorsal, tieneDorsal } from '../utils/jugador'
import { fechaLarga } from '../utils/fechas'
import AgregarCalendario from './AgregarCalendario'

const ESTADO = {
  disponible:    { texto: 'Disponible',       clase: 'badge-green' },
  restringido:   { texto: 'Con restricciones', clase: 'badge-orange' },
  no_disponible: { texto: 'No disponible',    clase: 'badge-red' },
}
const RESPUESTA = {
  pendiente:  { texto: 'Sin responder', clase: 'badge-blue',  icono: 'fa-clock' },
  confirmado: { texto: 'Confirmó',      clase: 'badge-green', icono: 'fa-circle-check' },
  no_puede:   { texto: 'No puede',      clase: 'badge-red',   icono: 'fa-circle-xmark' },
}
const ACCIONES = {
  publicada: 'publicó la convocatoria', agregado: 'convocó a', retirado: 'retiró a', cambio_rol: 'cambió el rol de',
  editada: 'cambió la presentación', confirmo: 'confirmó su asistencia', no_puede: 'avisó que no puede ir',
}

export default function Convocatoria({ partido, onCerrar, onCambio }) {
  const { usuario } = useAuth()
  const puedeEditar = ['administrador', 'entrenador'].includes(usuario?.rol)
  const [datos, setDatos] = useState(null)
  const [plantel, setPlantel] = useState([])
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      const pedidos = [api.get(`/convocatorias/partido/${partido.id}`)]
      if (puedeEditar) pedidos.push(api.get('/dashboard/inicio'))
      const [c, inicio] = await Promise.all(pedidos)
      setDatos(c.data)
      if (inicio) setPlantel(inicio.data.plantel)
    } catch (e) {
      setError(e.message)
    }
  }, [partido.id, puedeEditar])
  useEffect(() => { cargar() }, [cargar])

  const titulo = `Convocatoria: Unisimón vs. ${partido.rival}`
  return (
    <Modal title={titulo} onClose={onCerrar}>
      <div className="convocatoria">
        <p className="convocatoria-fecha"><i className="fa-regular fa-calendar" aria-hidden="true"></i> {fechaLarga(partido.fecha?.slice(0, 10))}</p>
        {error ? <EstadoError compacto mensaje={error} onReintentar={cargar} />
          : !datos ? <Esqueleto tipo="panel" filas={6} etiqueta="Cargando la convocatoria…" />
          : puedeEditar ? <Editor partido={partido} datos={datos} plantel={plantel} alGuardar={(d) => { setDatos(d); onCambio?.() }} />
          : <Vista datos={datos} alResponder={(d) => { setDatos(d); onCambio?.() }} partido={partido} />}
      </div>
    </Modal>
  )
}

/* ── Editor del entrenador ─────────────────────────────── */
function Editor({ partido, datos, plantel, alGuardar }) {
  const conv = datos.convocatoria
  const [seleccion, setSeleccion] = useState(() => new Map((conv?.convocados || []).map(c => [c.jugador_id, c.rol])))
  const [hora, setHora] = useState(conv?.hora_presentacion || '')
  const [lugar, setLugar] = useState(conv?.lugar || '')
  const [notas, setNotas] = useState(conv?.notas || '')
  const [guardando, setGuardando] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)
  const [filtro, setFiltro] = useState('todos')

  const respuestas = useMemo(() => new Map((conv?.convocados || []).map(c => [c.jugador_id, c])), [conv])
  const titulares = [...seleccion.values()].filter(r => r === 'titular').length
  const suplentes = [...seleccion.values()].filter(r => r === 'suplente').length

  const elegir = (id, rol) => setSeleccion(prev => {
    const m = new Map(prev)
    if (rol) m.set(id, rol); else m.delete(id)
    return m
  })

  const guardar = async (publicar) => {
    setGuardando(true)
    try {
      const { data } = await api.put(`/convocatorias/partido/${partido.id}`, {
        hora_presentacion: hora, lugar, notas, publicar,
        convocados: [...seleccion.entries()].map(([jugador_id, rol]) => ({ jugador_id, rol })),
      })
      toast.success(publicar && !conv?.publicada ? 'Convocatoria publicada: los convocados recibieron el aviso'
        : conv?.publicada ? 'Cambios guardados y avisados a los afectados' : 'Borrador guardado')
      alGuardar(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      {conv?.publicada ? (
        // v2.0: las cifras son botones que filtran la lista (confirmados, sin responder, no pueden)
        <div className="convocatoria-resumen" role="group" aria-label="Filtrar por respuesta de los convocados">
          <FiltroRespuesta valor="todos" actual={filtro} onElegir={setFiltro} clase="badge-neutro" icono="fa-users" texto={`${seleccion.size} convocados`} />
          <FiltroRespuesta valor="confirmado" actual={filtro} onElegir={setFiltro} clase="badge-green" icono="fa-circle-check" texto={`${conv.resumen.confirmados} confirmaron`} />
          <FiltroRespuesta valor="pendiente" actual={filtro} onElegir={setFiltro} clase="badge-blue" icono="fa-clock" texto={`${conv.resumen.pendientes} sin responder`} />
          <FiltroRespuesta valor="no_puede" actual={filtro} onElegir={setFiltro} clase="badge-red" icono="fa-circle-xmark" texto={`${conv.resumen.no_pueden} no pueden`} />
        </div>
      ) : (
        <p className="alerta alerta-info"><i className="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>{conv ? 'Borrador sin publicar: solo lo ve el cuerpo técnico.' : 'Elige a los convocados y publícalos: cada uno recibirá un aviso para confirmar.'}</span></p>
      )}

      <div className="convocatoria-campos">
        <div className="form-group"><label htmlFor="conv-hora">Hora de presentación</label>
          <input id="conv-hora" type="time" value={hora} onChange={e => setHora(e.target.value)} /></div>
        <div className="form-group"><label htmlFor="conv-lugar">Lugar</label>
          <input id="conv-lugar" value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Ej. Cancha principal" /></div>
        <div className="form-group convocatoria-notas"><label htmlFor="conv-notas">Indicaciones</label>
          <textarea id="conv-notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. Traer uniforme blanco" /></div>
      </div>

      <div className="convocatoria-cuenta"><b>{titulares}</b> titulares · <b>{suplentes}</b> suplentes
        {filtro !== 'todos' && <button type="button" className="enlace-boton" onClick={() => setFiltro('todos')}>Ver todo el plantel</button>}</div>
      {plantel.length === 0 ? (
        <EstadoVacio compacto icono="fa-people-group" titulo="No tienes deportistas para convocar" descripcion="Registra deportistas en el módulo Deportistas." />
      ) : (
        <ul className="convocatoria-lista">
          {plantel.filter(j => filtro === 'todos' || (seleccion.has(j.id) && respuestas.get(j.id)?.confirmacion === filtro)).map(j => {
            const rol = seleccion.get(j.id) || ''
            const e = ESTADO[j.estado] || ESTADO.disponible
            const resp = respuestas.get(j.id)
            return (
              <li key={j.id} className={rol ? 'elegido' : ''}>
                <span className="dorsal-chip">{tieneDorsal(j.dorsal) ? j.dorsal : '–'}</span>
                <div className="convocatoria-jugador">
                  <span className="convocatoria-nombre">{j.nombre}</span>
                  <span className="convocatoria-detalle">
                    <span className={`badge ${e.clase}`}>{e.texto}</span>
                    {j.motivo && <span>{j.motivo}</span>}
                    {conv?.publicada && resp && <span className={`badge ${RESPUESTA[resp.confirmacion].clase}`}><i className={`fa-solid ${RESPUESTA[resp.confirmacion].icono}`} aria-hidden="true"></i> {RESPUESTA[resp.confirmacion].texto}{resp.motivo ? `: ${resp.motivo}` : ''}</span>}
                  </span>
                </div>
                <div className="segmento" role="group" aria-label={`Convocar a ${j.nombre}`}>
                  {[['', 'No va'], ['titular', 'Titular'], ['suplente', 'Suplente']].map(([valor, texto]) => (
                    <button key={valor || 'no'} type="button" aria-pressed={rol === valor} onClick={() => elegir(j.id, valor)}>{texto}</button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="convocatoria-pie">
        {conv?.publicada && <CompartirWhatsApp partido={partido} conv={conv} />}
        {!conv?.publicada && <button type="button" className="btn btn-secondary" disabled={guardando} onClick={() => guardar(false)}>Guardar borrador</button>}
        <button type="button" className="btn btn-primary" disabled={guardando || seleccion.size === 0} onClick={() => guardar(true)}>
          <i className="fa-solid fa-bullhorn" aria-hidden="true"></i> {guardando ? 'Guardando…' : conv?.publicada ? 'Guardar cambios' : 'Publicar convocatoria'}
        </button>
      </div>

      {conv && (
        <div className="convocatoria-historial">
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={verHistorial} onClick={() => setVerHistorial(v => !v)}>
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> {verHistorial ? 'Ocultar registro' : 'Ver registro de cambios'}
          </button>
          {verHistorial && <Historial partidoId={partido.id} />}
        </div>
      )}
    </>
  )
}

function FiltroRespuesta({ valor, actual, onElegir, clase, icono, texto }) {
  return (
    <button type="button" className={`badge filtro-badge ${clase}`} aria-pressed={actual === valor}
      onClick={() => onElegir(actual === valor && valor !== 'todos' ? 'todos' : valor)}>
      <i className={`fa-solid ${icono}`} aria-hidden="true"></i> {texto}
    </button>
  )
}

function Historial({ partidoId }) {
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')
  const cargar = useCallback(() => {
    setError('')
    api.get(`/convocatorias/partido/${partidoId}/historial`).then(r => setFilas(r.data)).catch(e => setError(e.message))
  }, [partidoId])
  useEffect(() => { cargar() }, [cargar])
  if (error) return <EstadoError compacto mensaje={error} onReintentar={cargar} />
  if (!filas) return <Esqueleto tipo="panel" filas={3} etiqueta="Cargando el registro…" />
  return (
    <ol className="convocatoria-registro">
      {filas.map((h, i) => (
        <li key={i}>
          <time>{new Date(h.creado_en).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>
          <span><b>{h.usuario}</b> {ACCIONES[h.accion] || h.accion}{h.jugador ? ` ${nombreConDorsal(h.jugador, h.dorsal)}` : ''}{h.detalle ? ` (${h.detalle})` : ''}</span>
        </li>
      ))}
    </ol>
  )
}

function CompartirWhatsApp({ partido, conv }) {
  const lista = (rol) => conv.convocados.filter(c => c.rol === rol).map(c => nombreConDorsal(c.nombre, c.dorsal)).join(', ') || '—'
  const texto = [
    `Convocatoria: Unisimón vs. ${partido.rival}`,
    fechaLarga(partido.fecha?.slice(0, 10)) + (conv.hora_presentacion ? `. Presentación: ${conv.hora_presentacion}` : '') + (conv.lugar ? ` en ${conv.lugar}` : ''),
    `Titulares: ${lista('titular')}`,
    `Suplentes: ${lista('suplente')}`,
    conv.notas ? `Indicaciones: ${conv.notas}` : '',
    `Confirma tu asistencia en la app: ${window.location.origin}/partidos?convocatoria=${partido.id}`,
  ].filter(Boolean).join('\n')
  return (
    <a className="btn btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
      <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Compartir por WhatsApp
    </a>
  )
}

/* ── Vista para el deportista y los demás roles ─────────── */
function Vista({ datos, alResponder, partido }) {
  const conv = datos.convocatoria
  const [motivo, setMotivo] = useState('')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [filtro, setFiltro] = useState('todos')

  if (!conv) {
    return <EstadoVacio compacto icono="fa-clipboard-list" titulo="La convocatoria aún no se ha publicado" descripcion="Cuando el entrenador la publique, la verás aquí y, si estás convocado, recibirás un aviso." />
  }

  const responder = async (respuesta) => {
    setEnviando(true)
    try {
      const { data } = await api.post(`/convocatorias/partido/${partido.id}/respuesta`, { respuesta, motivo: respuesta === 'no_puede' ? motivo : null })
      toast.success(respuesta === 'confirmado' ? 'Asistencia confirmada' : 'Le avisamos a tu entrenador que no puedes ir')
      setPidiendoMotivo(false)
      alResponder(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const grupo = (rol, titulo) => {
    const lista = conv.convocados.filter(c => c.rol === rol && (filtro === 'todos' || c.confirmacion === filtro))
    return (
      <div className="convocatoria-grupo">
        <h3>{titulo} <span>({lista.length})</span></h3>
        <ul>{lista.map(c => (
          <li key={c.jugador_id}>
            <span className="dorsal-chip">{tieneDorsal(c.dorsal) ? c.dorsal : '–'}</span>
            <span>{c.nombre}{c.posicion ? <small> · {c.posicion}</small> : null}</span>
            {c.confirmacion && <span className={`badge ${RESPUESTA[c.confirmacion].clase}`}>{RESPUESTA[c.confirmacion].texto}</span>}
          </li>
        ))}</ul>
      </div>
    )
  }

  return (
    <>
      {conv.mia && (
        <div className={`convocatoria-mia ${conv.mia.confirmacion}`}>
          <p className="convocatoria-mia-titulo"><i className="fa-solid fa-bullhorn" aria-hidden="true"></i> Estás convocado como <b>{conv.mia.rol}</b></p>
          <p className="convocatoria-mia-estado">Tu respuesta: <span className={`badge ${RESPUESTA[conv.mia.confirmacion].clase}`}>{RESPUESTA[conv.mia.confirmacion].texto}</span></p>
          {conv.se_puede_responder ? (
            pidiendoMotivo ? (
              <div className="convocatoria-motivo">
                <div className="form-group"><label htmlFor="conv-motivo">¿Por qué no puedes ir? (opcional)</label>
                  <input id="conv-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Examen parcial" /></div>
                <div className="convocatoria-pie">
                  <button type="button" className="btn btn-secondary" onClick={() => setPidiendoMotivo(false)}>Volver</button>
                  <button type="button" className="btn btn-danger" disabled={enviando} onClick={() => responder('no_puede')}>Avisar que no puedo</button>
                </div>
              </div>
            ) : (
              <div className="convocatoria-pie">
                <button type="button" className="btn btn-secondary" disabled={enviando} onClick={() => setPidiendoMotivo(true)}>
                  <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i> No puedo</button>
                <button type="button" className="btn btn-primary" disabled={enviando || conv.mia.confirmacion === 'confirmado'} onClick={() => responder('confirmado')}>
                  <i className="fa-solid fa-circle-check" aria-hidden="true"></i> {conv.mia.confirmacion === 'confirmado' ? 'Confirmado' : 'Confirmo'}</button>
              </div>
            )
          ) : <p className="convocatoria-detalle">El partido ya pasó; ya no se puede responder.</p>}
        </div>
      )}
      {conv.mia && (
        <AgregarCalendario evento={{
          id: `partido-${partido.id}`, titulo: `Unisimón vs. ${partido.rival}`, fecha: partido.fecha?.slice(0, 10),
          hora: conv.hora_presentacion || partido.hora || null, lugar: conv.lugar || partido.lugar || null, minutos: 150,
          descripcion: `Convocado como ${conv.mia.rol}.${conv.notas ? ` ${conv.notas}` : ''}`,
        }} />
      )}
      {(conv.hora_presentacion || conv.lugar || conv.notas) && (
        <div className="convocatoria-logistica">
          {conv.hora_presentacion && <p><i className="fa-regular fa-clock" aria-hidden="true"></i> Presentación: <b>{conv.hora_presentacion}</b></p>}
          {conv.lugar && <p><i className="fa-solid fa-location-dot" aria-hidden="true"></i> {conv.lugar}</p>}
          {conv.notas && <p><i className="fa-solid fa-clipboard" aria-hidden="true"></i> {conv.notas}</p>}
        </div>
      )}
      {conv.convocados.some(c => c.confirmacion) && (
        <div className="convocatoria-resumen" role="group" aria-label="Filtrar por respuesta">
          {[['todos', 'badge-neutro', 'fa-users', 'Todos'], ['confirmado', 'badge-green', 'fa-circle-check', 'Confirmados'],
            ['pendiente', 'badge-blue', 'fa-clock', 'Sin responder'], ['no_puede', 'badge-red', 'fa-circle-xmark', 'No pueden']].map(([v, c, i, t]) => (
            <FiltroRespuesta key={v} valor={v} actual={filtro} onElegir={setFiltro} clase={c} icono={i}
              texto={`${t} (${v === 'todos' ? conv.convocados.length : conv.convocados.filter(x => x.confirmacion === v).length})`} />
          ))}
        </div>
      )}
      {grupo('titular', 'Titulares')}
      {grupo('suplente', 'Suplentes')}
    </>
  )
}
