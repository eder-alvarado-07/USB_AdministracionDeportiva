import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ANIMACION_GRAFICA } from '../utils/movimiento'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoError } from '../components/EstadoVista'
import EncabezadoPagina from '../components/EncabezadoPagina'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { perfilDeporte as perfilVisual } from '../config/deportes'
import { etiquetaJugador, nombreConDorsal, tieneDorsal } from '../utils/jugador'
import { fechaTabla } from '../utils/fechas'

// Estadísticas por deporte (v2.1): al entrar se ven todos los deportes; cada uno tiene sus propias métricas
// (goles y tarjetas en fútbol, tries y tackles en rugby, rebotes en baloncesto…), definidas en el servidor
// (backend/config/metricas_deportes.js) y servidas por GET /api/estadisticas/metricas.

const valorDerivada = (d, metricas) => Object.entries(d.pesos).reduce((a, [k, peso]) => a + (Number(metricas?.[k]) || 0) * peso, 0)

export default function EstadisticasJugador() {
  const { usuario, tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])
  const esJugador = usuario?.rol === 'jugador'
  const { selectedSportId } = useDeporte()

  const [deportes, setDeportes] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [elegido, setElegido] = useState(null)
  const [stats, setStats] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [partidos, setPartidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orden, setOrden] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ jugador_id: '', partido_id: '', metricas: {} })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, sRes, jRes, pRes] = await Promise.all([
        api.get('/estadisticas/metricas'), api.get('/estadisticas'), api.get('/jugadores'), api.get('/partidos'),
      ])
      setDeportes(mRes.data.deportes)
      setCatalogo(mRes.data.catalogo)
      setStats(sRes.data); setJugadores(jRes.data); setPartidos(pRes.data)
      // Deporte inicial: el de la cabecera, o el primero con registros, o el primero con deportistas
      setElegido(prev => {
        const lista = mRes.data.deportes
        if (prev && lista.some(d => d.id === prev)) return prev
        const cabecera = lista.find(d => String(d.id) === String(selectedSportId))
        return (cabecera || lista.find(d => d.total_registros > 0) || lista.find(d => d.total_jugadores > 0) || lista[0])?.id ?? null
      })
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const deporte = deportes.find(d => d.id === elegido)
  const perfil = deporte?.perfil
  const visual = perfilVisual(deporte?.nombre)
  const columnas = useMemo(() => perfil ? [...(perfil.derivadas || []), ...perfil.metricas] : [], [perfil])
  const ordenActual = orden && columnas.some(c => c.clave === orden) ? orden : (perfil?.derivadas?.[0]?.clave || perfil?.principal)

  const registros = stats.filter(s => s.disciplina_id === elegido)
  const jugadoresDeporte = jugadores.filter(j => j.disciplina_id === elegido)
  const partidosDeporte = partidos.filter(p => !p.disciplina_id || p.disciplina_id === elegido)

  const valor = (col, metricas) => (col.pesos ? valorDerivada(col, metricas) : Number(metricas?.[col.clave]) || 0)

  // Totales del equipo y tabla de líderes por deportista
  const totales = useMemo(() => Object.fromEntries(columnas.map(c => [c.clave, registros.reduce((a, r) => a + valor(c, r.metricas), 0)])), [columnas, registros])
  const lideres = useMemo(() => {
    const porJugador = new Map()
    for (const r of registros) {
      const fila = porJugador.get(r.jugador_id) || { id: r.jugador_id, nombre: r.jugador_nombre, dorsal: r.jugador_dorsal, posicion: r.jugador_posicion, pj: 0, metricas: {} }
      fila.pj += 1
      for (const c of perfil?.metricas || []) fila.metricas[c.clave] = (fila.metricas[c.clave] || 0) + (Number(r.metricas?.[c.clave]) || 0)
      porJugador.set(r.jugador_id, fila)
    }
    const col = columnas.find(c => c.clave === ordenActual)
    return [...porJugador.values()].sort((a, b) => (col ? valor(col, b.metricas) - valor(col, a.metricas) : 0) || b.pj - a.pj)
  }, [registros, perfil, columnas, ordenActual]) // eslint-disable-line react-hooks/exhaustive-deps
  const colOrden = columnas.find(c => c.clave === ordenActual)
  const grafica = lideres.slice(0, 10).map(l => ({ nombre: l.nombre.split(' ')[0], valor: colOrden ? valor(colOrden, l.metricas) : 0 })).filter(d => d.valor > 0)

  const metricasVacias = () => Object.fromEntries((perfil?.metricas || []).map(c => [c.clave, '']))
  const openCreate = () => {
    setForm({ jugador_id: jugadoresDeporte.length === 1 ? String(jugadoresDeporte[0].id) : '', partido_id: '', metricas: metricasVacias() })
    setEditId(null); setModal(true)
  }
  const openEdit = (s) => {
    setForm({ jugador_id: String(s.jugador_id), partido_id: s.partido_id ? String(s.partido_id) : '', metricas: { ...metricasVacias(), ...s.metricas } })
    setEditId(s.id); setModal(true)
  }
  const cambiarMetrica = (clave) => (e) => setForm(f => ({ ...f, metricas: { ...f.metricas, [clave]: e.target.value.replace(/\D/g, '') } }))

  const handleSubmit = async (ev) => {
    ev?.preventDefault()
    if (!form.jugador_id) return toast.error('Elige el deportista')
    setSaving(true)
    try {
      const cuerpo = { jugador_id: Number(form.jugador_id), partido_id: form.partido_id || null, metricas: form.metricas }
      if (editId) await api.put(`/estadisticas/${editId}`, cuerpo)
      else await api.post('/estadisticas', cuerpo)
      toast.success(editId ? 'Estadística actualizada' : 'Estadística registrada')
      setModal(false); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleConfirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/estadisticas/${deleteModal.id}`)
      toast.success('Estadística eliminada')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      load()
    } catch (e) {
      toast.error(e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <div>
      <EncabezadoPagina
        icono="fa-chart-column"
        antetitulo={deporte ? deporte.nombre : 'Rendimiento'}
        titulo={esJugador ? 'Mis estadísticas' : 'Estadísticas por deporte'}
        descripcion="Cada deporte se mide con sus propias métricas. Elige un deporte para ver sus totales, sus líderes y cada registro."
        acciones={puedeEditar && deporte && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Registrar estadística
          </button>
        )}
      />

      {loading ? <Esqueleto tipo="tarjetas" filas={4} /> : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={load} /></div>
      ) : deportes.length === 0 ? (
        <div className="card"><EstadoVacio icono="fa-medal" titulo="No hay deportes disponibles"
          descripcion={esJugador ? 'Tu ficha todavía no tiene un deporte asignado.' : 'El administrador puede crear los deportes desde el inicio.'} /></div>
      ) : (
        <>
          {/* Todos los deportes a la vista, sin botones extra: un toque para elegir */}
          <div className="rejilla-deportes" role="radiogroup" aria-label="Deporte">
            {deportes.map(d => {
              const v = perfilVisual(d.nombre)
              return (
                <button key={d.id} type="button" role="radio" aria-checked={d.id === elegido} className="tarjeta-deporte"
                  style={{ '--deporte': v.color }} onClick={() => { setElegido(d.id); setOrden(null) }}>
                  <span className="tarjeta-deporte-icono"><i className={`fa-solid ${v.icono}`} aria-hidden="true"></i></span>
                  <span className="tarjeta-deporte-texto">
                    <b>{d.nombre}</b>
                    <small>{d.total_jugadores} {d.total_jugadores === 1 ? 'deportista' : 'deportistas'} · {d.total_registros} {d.total_registros === 1 ? 'registro' : 'registros'}</small>
                    <span className="tarjeta-deporte-metricas">{[...(d.perfil.derivadas || []), ...d.perfil.metricas].slice(0, 5).map(x => x.corto).join(' · ')}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {deporte && (
            <section aria-labelledby="t-deporte" style={{ '--deporte': visual.color }}>
              <h2 className="titulo-seccion" id="t-deporte"><i className={`fa-solid ${visual.icono}`} aria-hidden="true" style={{ color: visual.color }}></i> {deporte.nombre}</h2>

              <div className="marcadores">
                <div className="marcador"><span>Partidos jugados</span><b>{registros.length}</b></div>
                {columnas.filter(c => c.clave !== 'minutos').slice(0, 7).map(c => (
                  <div key={c.clave} className={`marcador ${c.pesos ? 'oro' : ''}`} title={c.etiqueta}><span>{c.etiqueta}</span><b>{totales[c.clave]}</b></div>
                ))}
              </div>

              {registros.length === 0 ? (
                <div className="card">
                  <EstadoVacio icono="fa-chart-column" titulo={`Aún no hay estadísticas de ${deporte.nombre}`}
                    descripcion={`En ${deporte.nombre} se registra: ${perfil.metricas.map(x => x.etiqueta.toLowerCase()).join(', ')}.`}
                    accion={puedeEditar && jugadoresDeporte.length ? { texto: 'Registrar estadística', icono: 'fa-plus', onClick: openCreate } : null} />
                </div>
              ) : (
                <div className="grid-dos">
                  <div className="card" style={{ padding: 0 }}>
                    <div className="card-title" style={{ padding: '16px 18px 0' }}><i className="fa-solid fa-ranking-star" aria-hidden="true"></i> {esJugador ? 'Mis totales' : 'Líderes'}
                      <small className="texto-suave solo-ancho" style={{ fontFamily: 'var(--font)', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>Toca una columna para ordenar</small>
                      {/* En celular y tableta se ve una métrica a la vez: se elige aquí */}
                      <label className="ordenar-por solo-angosto">
                        <span>Ordenar por</span>
                        <select value={ordenActual} onChange={e => setOrden(e.target.value)}>
                          {columnas.map(c => <option key={c.clave} value={c.clave}>{c.etiqueta}</option>)}
                        </select>
                      </label></div>
                    <div className="table-wrapper">
                      <table className="tabla-stats">
                        <thead>
                          <tr>
                            <th>Deportista</th>
                            <th title="Partidos jugados">PJ</th>
                            {columnas.map(c => (
                              <th key={c.clave} title={c.etiqueta} aria-sort={c.clave === ordenActual ? 'descending' : 'none'} className={c.clave === ordenActual ? undefined : 'col-ancha'}>
                                <button type="button" className={c.clave === ordenActual ? 'activo' : ''} onClick={() => setOrden(c.clave)}>{c.corto}</button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lideres.map((l, i) => (
                            <tr key={l.id}>
                              <td><div className="celda-persona">
                                <span className={`avatar dorsal ${i < 3 ? `podio-${i + 1}` : ''}`}>{tieneDorsal(l.dorsal) ? l.dorsal : '–'}</span>
                                <span><b>{l.nombre}</b><small>{l.posicion || 'Sin posición'}</small></span>
                              </div></td>
                              <td>{l.pj}</td>
                              {columnas.map(c => <td key={c.clave} className={c.clave === ordenActual ? 'col-activa' : 'col-ancha'}>{valor(c, l.metricas)}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {grafica.length > 0 && (
                    <div className="card">
                      <div className="card-title"><i className="fa-solid fa-chart-column" aria-hidden="true"></i> {colOrden?.etiqueta}</div>
                      <ResponsiveContainer width="100%" height={Math.max(220, grafica.length * 34)}>
                        <BarChart data={grafica} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="nombre" width={84} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v) => [v, colOrden?.etiqueta]} />
                          <Bar {...ANIMACION_GRAFICA} dataKey="valor" radius={[0, 6, 6, 0]}>
                            {grafica.map((_, i) => <Cell key={i} fill={i === 0 ? visual.color : 'var(--cancha-700)'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {registros.length > 0 && (
                <div className="card" style={{ padding: 0, marginTop: 18 }}>
                  <div className="card-title" style={{ padding: '16px 18px 0' }}><i className="fa-solid fa-list" aria-hidden="true"></i> Registros por partido <span className="contador">{registros.length}</span></div>
                  <div className="table-wrapper">
                    <table className="tabla-stats tabla-movil">
                      <thead>
                        <tr>
                          <th>Deportista</th><th className="col-sec">Partido</th>
                          {perfil.metricas.map(c => <th key={c.clave} title={c.etiqueta} className={c.clave === perfil.principal ? undefined : 'col-ancha'}>{c.corto}</th>)}
                          {puedeEditar && <th aria-label="Acciones"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {registros.map(s => (
                          <tr key={s.id}>
                            <td><b>{nombreConDorsal(s.jugador_nombre, s.jugador_dorsal)}</b>
                              <span className="sub-movil">{s.rival ? `vs ${s.rival}` : 'Sin partido'}</span>
                              <span className="resumen-metricas">{perfil.metricas.filter(c => c.clave !== perfil.principal).map(c => `${c.corto} ${Number(s.metricas?.[c.clave]) || 0}`).join(' · ')}</span></td>
                            <td className="col-sec">{s.rival ? <>{s.rival}<small className="sub-agenda">{fechaTabla(s.partido_fecha)}</small></> : <span className="texto-suave">Sin partido</span>}</td>
                            {perfil.metricas.map(c => <td key={c.clave} className={c.clave === perfil.principal ? undefined : 'col-ancha'}>{Number(s.metricas?.[c.clave]) || 0}</td>)}
                            {puedeEditar && (
                              <td><div className="acciones-fila">
                                <button className="btn-icon" onClick={() => openEdit(s)} aria-label={`Editar la estadística de ${s.jugador_nombre}`}><i className="fa-solid fa-pen" aria-hidden="true"></i></button>
                                <button className="btn-icon btn-danger" onClick={() => setDeleteModal({ isOpen: true, id: s.id, loading: false })} aria-label={`Eliminar la estadística de ${s.jugador_nombre}`}><i className="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                              </div></td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {!esJugador && (
            <details className="card catalogo-metricas">
              <summary><i className="fa-solid fa-book-open" aria-hidden="true"></i> Qué se mide en cada deporte</summary>
              <div className="catalogo-rejilla">
                {catalogo.map(c => {
                  const v = perfilVisual(c.nombre)
                  return (
                    <div key={c.clave} className="catalogo-item" style={{ '--deporte': v.color }}>
                      <b><i className={`fa-solid ${v.icono}`} aria-hidden="true"></i> {c.nombre}</b>
                      <p>{[...c.derivadas, ...c.metricas].map(x => x.etiqueta).join(' · ')}</p>
                    </div>
                  )
                })}
              </div>
            </details>
          )}
        </>
      )}

      {modal && perfil && (
        <Modal
          title={`${editId ? 'Editar' : 'Registrar'} estadística · ${deporte.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando…' : editId ? 'Actualizar' : 'Registrar'}</button>
            </>
          }
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="st-jugador">Deportista *</label>
              <select id="st-jugador" value={form.jugador_id} onChange={e => setForm(f => ({ ...f, jugador_id: e.target.value }))}>
                <option value="">Seleccionar…</option>
                {jugadoresDeporte.map(j => <option key={j.id} value={j.id}>{etiquetaJugador(j)}{j.posicion ? ` · ${j.posicion}` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="st-partido">Partido o competencia</label>
              <select id="st-partido" value={form.partido_id} onChange={e => setForm(f => ({ ...f, partido_id: e.target.value }))}>
                <option value="">Sin partido</option>
                {partidosDeporte.map(p => <option key={p.id} value={p.id}>{fechaTabla(p.fecha)} – {p.rival}</option>)}
              </select>
            </div>
            <fieldset className="resultado-campos" style={{ gridColumn: '1 / -1' }}>
              <legend><i className={`fa-solid ${visual.icono}`} aria-hidden="true"></i> Métricas de {deporte.nombre}</legend>
              <div className="rejilla-metricas">
                {perfil.metricas.map(c => (
                  <label key={c.clave} className="campo-metrica">
                    <span>{c.etiqueta}</span>
                    <input type="text" inputMode="numeric" value={form.metricas[c.clave] ?? ''} onChange={cambiarMetrica(c.clave)} placeholder="0" maxLength={4} />
                    <small>{c.corto} · máx. {c.max}</small>
                  </label>
                ))}
              </div>
              {perfil.derivadas?.map(d => (
                <p key={d.clave} className="ayuda-campo" style={{ marginTop: 10 }}>
                  {d.etiqueta}: <b>{valorDerivada(d, form.metricas)}</b> (se calcula solo)
                </p>
              ))}
            </fieldset>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar estadística?"
        message="Se eliminará este registro del deportista. Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
