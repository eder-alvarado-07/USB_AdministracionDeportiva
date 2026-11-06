import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Esqueleto, EstadoVacio, EstadoSinResultados, EstadoError } from '../components/EstadoVista'
import EncabezadoPagina from '../components/EncabezadoPagina'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useFiltroDeporte } from '../context/DeporteContext'
import { formatImageUrl } from '../utils/image'
import { ordenarPorDorsal, tieneDorsal } from '../utils/jugador'
import { fechaConDia, hoyISO } from '../utils/fechas'

// v2.0 (DEF-041): la asistencia es true/false (BOOLEAN en la base). Antes se enviaba 1/0 y se comparaba con
// `=== 1`, así que el registro guardado siempre se veía como "Ausente". Ahora el cambio se ve al instante
// (actualización optimista) y se revierte si el servidor no lo guarda.
const presente = (reg) => reg?.asistencia === true

export default function Asistencia() {
  const { usuario, tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])
  const esJugador = usuario?.rol === 'jugador'
  const filtro = useFiltroDeporte()
  const [params, setParams] = useSearchParams()
  const [entrenamientos, setEntrenamientos] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingAsist, setLoadingAsist] = useState(false)
  const [error, setError] = useState(null)
  const [errorAsist, setErrorAsist] = useState(null)
  const [saving, setSaving] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const fetchBase = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eRes, jRes] = await Promise.all([api.get('/entrenamientos'), api.get('/jugadores')])
      setEntrenamientos(eRes.data)
      setJugadores(jRes.data)
      // El entrenamiento que llega desde Entrenamientos (?entrenamiento=ID), o el más reciente que ya empezó
      const pedido = params.get('entrenamiento')
      const hoy = hoyISO()
      const inicial = eRes.data.find(e => String(e.id) === pedido)
        || eRes.data.find(e => e.fecha <= hoy) || eRes.data[0]
      if (inicial) setSelectedId(String(inicial.id))
      if (pedido) { params.delete('entrenamiento'); setParams(params, { replace: true }) }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBase() }, [fetchBase])

  const loadAsistencia = useCallback(async (id) => {
    if (!id) return
    setLoadingAsist(true)
    setErrorAsist(null)
    try {
      const res = await api.get(`/asistencia?entrenamiento_id=${id}`)
      setAsistencia(res.data)
    } catch (e) {
      setErrorAsist(e.message)
    } finally {
      setLoadingAsist(false)
    }
  }, [])

  useEffect(() => { loadAsistencia(selectedId) }, [selectedId, loadAsistencia])

  const entrenamiento = entrenamientos.find(e => String(e.id) === selectedId)
  const entrenamientosVisibles = entrenamientos.filter(filtro.deActividad)

  // Plantel del entrenamiento: los deportistas de su equipo (o todos los del alcance si es general)
  const plantel = useMemo(() => jugadores
    .filter(j => !entrenamiento?.equipo_id || String(j.equipo_id) === String(entrenamiento.equipo_id))
    .filter(j => entrenamiento?.equipo_id || filtro.deDisciplina(j.disciplina_id))
    .sort(ordenarPorDorsal), [jugadores, entrenamiento, filtro])
  const plantelVisible = plantel.filter(j => !busqueda || j.nombre.toLowerCase().includes(busqueda.toLowerCase()) || String(j.dorsal) === busqueda)

  const getRegistro = (jugadorId) => asistencia.find(a => Number(a.jugador_id) === Number(jugadorId))

  const handleToggle = async (jugador) => {
    if (!puedeEditar || saving) return
    const registro = getRegistro(jugador.id)
    const nuevo = !presente(registro)
    const previo = asistencia
    setSaving(jugador.id)
    // Optimista: se ve marcado de inmediato
    setAsistencia(prev => registro
      ? prev.map(a => (a.id === registro.id ? { ...a, asistencia: nuevo } : a))
      : [...prev, { id: `tmp-${jugador.id}`, jugador_id: jugador.id, asistencia: nuevo }])
    try {
      const { data } = await api.post('/asistencia', { jugador_id: jugador.id, entrenamiento_id: Number(selectedId), asistencia: nuevo })
      setAsistencia(prev => prev.map(a => (Number(a.jugador_id) === Number(jugador.id) ? { ...a, ...data } : a)))
    } catch (e) {
      setAsistencia(previo)
      toast.error(e.message || 'No se pudo guardar la asistencia')
    } finally {
      setSaving(null)
    }
  }

  const marcarTodos = async (valor) => {
    if (!plantel.length) return
    setSaving('all')
    try {
      const { data } = await api.put('/asistencia/lote', {
        entrenamiento_id: Number(selectedId), jugadores: plantel.map(j => j.id), asistencia: valor,
      })
      await loadAsistencia(selectedId)
      toast.success(`${data.actualizados} ${valor ? 'marcados presentes' : 'marcados ausentes'}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(null)
    }
  }

  const presentes = plantel.filter(j => presente(getRegistro(j.id))).length
  const sinMarcar = plantel.filter(j => !getRegistro(j.id)).length
  const ausentes = plantel.length - presentes
  const pct = plantel.length ? Math.round((presentes / plantel.length) * 100) : 0

  return (
    <div>
      <EncabezadoPagina
        icono="fa-clipboard-check"
        antetitulo={entrenamiento?.equipo_nombre || (filtro.hay ? filtro.nombre : 'Control de presencia')}
        titulo={esJugador ? 'Mi asistencia' : 'Asistencia'}
        descripcion={puedeEditar ? 'Toca a cada deportista para marcarlo presente. Se guarda al instante.' : 'Registro de presencia en las sesiones de entrenamiento.'}
      />

      {loading ? <div className="card"><Esqueleto tipo="tarjetas" filas={6} /></div> : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={fetchBase} /></div>
      ) : entrenamientos.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-clipboard-check"
            titulo="Aún no hay entrenamientos para tomar asistencia"
            descripcion="La asistencia se toma sobre una sesión de entrenamiento. Crea la primera en Entrenamientos y vuelve aquí."
            accion={puedeEditar ? { texto: 'Ir a Entrenamientos', icono: 'fa-stopwatch', a: '/entrenamientos' } : null}
          />
        </div>
      ) : (
        <>
          <div className="card barra-sesion">
            <label htmlFor="select-entrenamiento" className="barra-sesion-etiqueta"><i className="fa-solid fa-stopwatch" aria-hidden="true"></i> Sesión</label>
            <select id="select-entrenamiento" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              {entrenamientosVisibles.map(e => (
                <option key={e.id} value={e.id}>
                  {fechaConDia(e.fecha)} — {e.tipo}{e.equipo_nombre ? ` · ${e.equipo_nombre}` : ''}{e.hora ? ` · ${e.hora}` : ''}
                </option>
              ))}
            </select>
            {puedeEditar && plantel.length > 0 && (
              <div className="barra-sesion-acciones">
                <button className="btn btn-primary btn-sm" onClick={() => marcarTodos(true)} disabled={saving === 'all'}>
                  <i className="fa-solid fa-check-double" aria-hidden="true"></i> Todos presentes
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => marcarTodos(false)} disabled={saving === 'all'}>
                  <i className="fa-solid fa-xmark" aria-hidden="true"></i> Todos ausentes
                </button>
              </div>
            )}
          </div>

          {!loadingAsist && !errorAsist && plantel.length > 0 && (
            <div className="tablero-asistencia">
              <div className="marcadores">
                <div className="marcador ok"><span>Presentes</span><b>{presentes}</b></div>
                <div className="marcador error"><span>Ausentes</span><b>{ausentes}</b></div>
                {puedeEditar && <div className="marcador"><span>Sin marcar</span><b>{sinMarcar}</b></div>}
                <div className="marcador"><span>Plantel</span><b>{plantel.length}</b></div>
              </div>
              <div className="anillo" style={{ '--pct': pct }} role="img" aria-label={`${pct} % de asistencia`}>
                <b>{pct}<small>%</small></b><span>asistencia</span>
              </div>
            </div>
          )}

          {loadingAsist ? <div className="card"><Esqueleto tipo="tarjetas" filas={6} /></div> : errorAsist ? (
            <div className="card"><EstadoError mensaje={errorAsist} onReintentar={() => loadAsistencia(selectedId)} /></div>
          ) : jugadores.length === 0 ? (
            <div className="card">
              <EstadoVacio icono="fa-people-group" titulo="Aún no hay deportistas en el plantel"
                descripcion="Registra deportistas en el módulo Deportistas para poder marcar su asistencia."
                accion={puedeEditar ? { texto: 'Ir a Deportistas', icono: 'fa-people-group', a: '/jugadores' } : null} />
            </div>
          ) : plantel.length === 0 ? (
            <div className="card">
              <EstadoSinResultados descripcion={entrenamiento?.equipo_id ? `No hay deportistas en ${entrenamiento.equipo_nombre}.` : `No hay deportistas de ${filtro.nombre}.`}
                onLimpiar={filtro.limpiar} textoLimpiar="Ver todos los deportes" />
            </div>
          ) : (
            <section className="card" aria-labelledby="t-plantel">
              <div className="card-title" id="t-plantel">
                <i className="fa-solid fa-people-group" aria-hidden="true"></i> Plantel convocado a la sesión
                {plantel.length > 8 && (
                  <input className="buscador-mini" type="search" placeholder="Buscar nombre o dorsal" value={busqueda}
                    onChange={e => setBusqueda(e.target.value)} aria-label="Buscar deportista" />
                )}
              </div>
              <ul className="plantel-asistencia">
                {plantelVisible.map(j => {
                  const reg = getRegistro(j.id)
                  const esta = presente(reg)
                  const estado = !reg ? 'sin-marcar' : esta ? 'presente' : 'ausente'
                  return (
                    <li key={j.id}>
                      <button type="button" id={`toggle-asist-${j.id}`} className={`ficha-asistencia ${estado}`}
                        onClick={() => handleToggle(j)} disabled={!puedeEditar || saving === 'all'} aria-pressed={esta}
                        aria-label={`${j.nombre}: ${esta ? 'presente' : reg ? 'ausente' : 'sin marcar'}${puedeEditar ? `. Tocar para marcar ${esta ? 'ausente' : 'presente'}` : ''}`}>
                        <span className="ficha-foto">
                          {j.foto_url
                            ? <img src={formatImageUrl(j.foto_url)} alt="" referrerPolicy="no-referrer" />
                            : <span className="ficha-dorsal">{tieneDorsal(j.dorsal) ? j.dorsal : '–'}</span>}
                          <i className={`fa-solid ${esta ? 'fa-check' : reg ? 'fa-xmark' : 'fa-minus'} ficha-check`} aria-hidden="true"></i>
                        </span>
                        <span className="ficha-nombre">{tieneDorsal(j.dorsal) && j.foto_url ? `#${j.dorsal} ` : ''}{j.nombre}</span>
                        <span className="ficha-pos">{j.posicion || 'Sin posición'}</span>
                        <span className="ficha-estado">{saving === j.id ? 'Guardando…' : esta ? 'Presente' : reg ? 'Ausente' : 'Sin marcar'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
