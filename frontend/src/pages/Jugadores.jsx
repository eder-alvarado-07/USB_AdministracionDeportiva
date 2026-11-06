import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Users, Eye, Camera, Activity, Target, Upload, Trophy, Sparkles, Filter, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoSinResultados, EstadoError } from '../components/EstadoVista'
import ImportCsvModal from '../components/ImportCsvModal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { formatImageUrl } from '../utils/image'
import DorsalEditable from '../components/DorsalEditable'
import { nombreConDorsal, ordenarPorDorsal, tieneDorsal } from '../utils/jugador'
import EncabezadoPagina from '../components/EncabezadoPagina'
import { perfilDeporte } from '../config/deportes'
import { edadDesde, hoyISO } from '../utils/fechas'

const EMPTY = { nombre: '', dorsal: '', edad: '', fecha_nacimiento: '', genero: '', posicion: '', peso: '', altura: '', equipo_id: '', disciplina_id: '', entrenador_id: '' }

export default function Jugadores() {
  const { tienePermiso, usuario } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])
  const {
    disciplinas,
    selectedSportId,
    selectedSport,
    setSelectedSportId,
    crearDisciplina,
    puedeGestionarDeportes,
    cargarDisciplinas,
    deporteUnico,
  } = useDeporte()

  const [jugadores, setJugadores]         = useState([])
  const [equipos, setEquipos]             = useState([])
  const [entrenadores, setEntrenadores]   = useState([])
  
  // Nuevo deporte modal
  const [nuevoDeporteNombre, setNuevoDeporteNombre] = useState('')
  const [creandoDeporte, setCreandoDeporte] = useState(false)

  // Búsqueda y filtrado
  const [searchTerm, setSearchTerm]       = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtros, setFiltros] = useState({ edadMin:'', edadMax:'', posicion:'', entrenador:'' })

  // Modales
  const [modal, setModal]                 = useState(false)
  const [modalFicha, setModalFicha]       = useState(false)
  const [modalCsv, setModalCsv]           = useState(false)
  const [modalNuevoDeporte, setModalNuevoDeporte] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [deleteModal, setDeleteModal]     = useState({ isOpen: false, id: null, nombre: '', loading: false })
  
  // Formulario de jugador
  const [form, setForm]                   = useState(EMPTY)
  const [editId, setEditId]               = useState(null)
  const [saving, setSaving]               = useState(false)
  const [modoAsociacion, setModoAsociacion] = useState('disciplina') // default to selected sport
  const fileInputRef = useRef(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [jRes, eRes] = await Promise.all([api.get('/jugadores'), api.get('/equipos')])
      setJugadores(jRes.data)
      setEquipos(eRes.data)
      if (usuario?.rol === 'administrador') { try { const uRes = await api.get('/usuarios'); setEntrenadores(uRes.data.filter(u=>u.rol==='entrenador')) } catch {} }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Deporte activo actualmente
  const currentSport = selectedSport

  // Jugadores filtrados por deporte y por término de búsqueda
  const filteredJugadores = jugadores.filter(j => {
    // Si hay un deporte seleccionado (y no es 'todos')
    if (selectedSportId && selectedSportId !== 'todos') {
      const matchDisciplina = String(j.disciplina_id) === String(selectedSportId)
      if (!matchDisciplina) return false
    }
    // Filtro de texto
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      const matchNombre = j.nombre?.toLowerCase().includes(term)
      const matchPos = j.posicion?.toLowerCase().includes(term)
      const matchEquipo = j.equipo_nombre?.toLowerCase().includes(term)
      const matchDorsal = tieneDorsal(j.dorsal) && String(j.dorsal) === term.replace('#', '')
      if (!(matchNombre || matchPos || matchEquipo || matchDorsal)) return false
    }
    if (filtros.edadMin !== '' && Number(j.edad || 0) < Number(filtros.edadMin)) return false
    if (filtros.edadMax !== '' && Number(j.edad || 0) > Number(filtros.edadMax)) return false
    if (filtros.posicion && !j.posicion?.toLowerCase().includes(filtros.posicion.toLowerCase())) return false
    if (filtros.entrenador && String(j.entrenador_id || '') !== String(filtros.entrenador)) return false
    return true
  }).sort(ordenarPorDorsal)

  // v2.0: posiciones propias de cada deporte (rugby no tiene las mismas que fútbol, natación o voleibol)
  const nombreDeporte = (id) => disciplinas.find(d => String(d.id) === String(id))?.nombre
  const perfilFiltro = perfilDeporte(currentSport?.esTodos ? null : currentSport?.nombre)
  const perfilForm = perfilDeporte(nombreDeporte(form.disciplina_id))
  const posicionesForm = perfilForm.posiciones.includes(form.posicion) || !form.posicion
    ? perfilForm.posiciones : [form.posicion, ...perfilForm.posiciones]
  const equiposForm = equipos.filter(e => !form.disciplina_id || !e.disciplina_id || String(e.disciplina_id) === String(form.disciplina_id))

  // Crear nuevo deporte
  const handleCrearDeporte = async (e) => {
    e?.preventDefault()
    if (!nuevoDeporteNombre.trim()) return toast.error('Ingresa el nombre del deporte')
    setCreandoDeporte(true)
    try {
      await crearDisciplina(nuevoDeporteNombre.trim())
      setNuevoDeporteNombre('')
      setModalNuevoDeporte(false)
    } catch (err) {
      // toast ya manejado en contexto
    } finally {
      setCreandoDeporte(false)
    }
  }

  const openCreate = () => {
    setForm({
      ...EMPTY,
      disciplina_id: selectedSportId !== 'todos' ? selectedSportId : (disciplinas[0]?.id || '')
    })
    setEditId(null)
    setModoAsociacion('disciplina')
    setModal(true)
  }

  const openEdit = (j) => {
    setForm({
      nombre: j.nombre,
      dorsal: tieneDorsal(j.dorsal) ? String(j.dorsal) : '',
      edad: j.edad ?? '',
      fecha_nacimiento: j.fecha_nacimiento ? String(j.fecha_nacimiento).slice(0, 10) : '',
      genero: j.genero ?? '',
      posicion: j.posicion ?? '',
      peso: j.peso ?? '',
      altura: j.altura ?? '',
      equipo_id: j.equipo_id ?? '',
      disciplina_id: j.disciplina_id ?? (selectedSportId !== 'todos' ? selectedSportId : ''),
      entrenador_id: j.entrenador_id ?? '',
    })
    setModoAsociacion(j.disciplina_id ? 'disciplina' : (j.equipo_id ? 'equipo' : 'disciplina'))
    setEditId(j.id)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setModalFicha(false)
    setSelectedPlayer(null)
  }

  const openFicha = async (id) => {
    try {
      const res = await api.get(`/jugadores/${id}`)
      setSelectedPlayer(res.data)
      setModalFicha(true)
    } catch {
      toast.error('Error al cargar la ficha del deportista')
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('foto', file)
    try {
      const res = await api.post(`/jugadores/${selectedPlayer.id}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSelectedPlayer(prev => ({ ...prev, foto_url: res.data.foto_url }))
      toast.success('Foto actualizada con éxito')
      loadData()
    } catch {
      toast.error('Error al subir la foto')
    }
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (String(form.dorsal).trim() !== '' && !/^\d{1,2}$/.test(String(form.dorsal).trim())) {
      return toast.error('El dorsal debe ser un número entre 0 y 99')
    }
    setSaving(true)

    const payload = { ...form }
    if (payload.fecha_nacimiento) delete payload.edad
    if (!payload.fecha_nacimiento) delete payload.fecha_nacimiento
    if (modoAsociacion === 'equipo') {
      if (!payload.equipo_id) payload.equipo_id = null
    } else {
      if (!payload.disciplina_id) payload.disciplina_id = selectedSportId !== 'todos' ? selectedSportId : null
    }

    try {
      if (editId) {
        await api.put(`/jugadores/${editId}`, payload)
        toast.success('Deportista actualizado')
      } else {
        await api.post('/jugadores', payload)
        toast.success('Deportista registrado con éxito')
      }
      closeModal()
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id, nombre) => {
    setDeleteModal({ isOpen: true, id, nombre, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/jugadores/${deleteModal.id}`)
      toast.success(`Deportista ${deleteModal.nombre || ''} eliminado correctamente`)
      setDeleteModal({ isOpen: false, id: null, nombre: '', loading: false })
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <div>
      <EncabezadoPagina
        icono={deporteUnico ? perfilDeporte(deporteUnico.nombre).icono : 'fa-people-group'}
        antetitulo={deporteUnico ? deporteUnico.nombre : currentSport?.esTodos ? 'Todos los deportes' : currentSport?.nombre}
        titulo="Deportistas"
        descripcion={deporteUnico ? `Tu plantel de ${deporteUnico.nombre}: dorsales, posiciones y fichas.` : 'Plantel por deporte: dorsales, posiciones, equipos y fichas.'}
        acciones={puedeEditar && (
          <>
            {puedeGestionarDeportes && (
              <button className="btn btn-secondary" onClick={() => setModalNuevoDeporte(true)} title="Crear un nuevo deporte">
                <i className="fa-solid fa-medal" aria-hidden="true"></i> Nuevo deporte
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setModalCsv(true)} title="Importación masiva desde archivo CSV">
              <i className="fa-solid fa-file-arrow-up" aria-hidden="true"></i> Importar CSV
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              <i className="fa-solid fa-user-plus" aria-hidden="true"></i> Nuevo deportista
            </button>
          </>
        )}
      />

      {/* v2.0: el selector de deporte solo aparece si hay más de un deporte para elegir.
          El entrenador de un solo deporte (por ejemplo, rugby) ya ve únicamente su plantel. */}
      {!deporteUnico && disciplinas.length > 1 && (
        <div className="chips-deporte" role="group" aria-label="Filtrar por deporte">
          <button type="button" className="chip-deporte-filtro" aria-pressed={selectedSportId === 'todos'} onClick={() => setSelectedSportId('todos')}>
            <i className="fa-solid fa-layer-group" aria-hidden="true"></i> Todos <span>{jugadores.length}</span>
          </button>
          {disciplinas.map(d => {
            const perfil = perfilDeporte(d.nombre)
            const count = jugadores.filter(j => String(j.disciplina_id) === String(d.id)).length
            return (
              <button key={d.id} type="button" className="chip-deporte-filtro" style={{ '--deporte': perfil.color }}
                aria-pressed={String(d.id) === String(selectedSportId)} onClick={() => setSelectedSportId(String(d.id))}>
                <i className={`fa-solid ${perfil.icono}`} aria-hidden="true"></i> {d.nombre} <span>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="barra-herramientas">
        <div className="buscador">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Buscar por nombre, dorsal, posición o equipo" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} aria-label="Buscar deportista" />
        </div>
        <button className="btn btn-secondary" onClick={() => setMostrarFiltros(v => !v)} aria-expanded={mostrarFiltros}>
          <i className="fa-solid fa-sliders" aria-hidden="true"></i> Filtros
          {Object.values(filtros).filter(Boolean).length > 0 && <span className="contador">{Object.values(filtros).filter(Boolean).length}</span>}
        </button>
        <span className="barra-total">{!loading && !error && <><b>{filteredJugadores.length}</b> deportistas</>}</span>
      </div>
      {mostrarFiltros && (
        <div className="card panel-filtros">
          <div className="form-grid">
            <div className="form-group"><label htmlFor="f-emin">Edad mínima</label>
              <input id="f-emin" type="number" min="0" value={filtros.edadMin} onChange={e => setFiltros({ ...filtros, edadMin: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="f-emax">Edad máxima</label>
              <input id="f-emax" type="number" min="0" value={filtros.edadMax} onChange={e => setFiltros({ ...filtros, edadMax: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="f-pos">Posición</label>
              {perfilFiltro.posiciones.length ? (
                <select id="f-pos" value={filtros.posicion} onChange={e => setFiltros({ ...filtros, posicion: e.target.value })}>
                  <option value="">Todas</option>
                  {perfilFiltro.posiciones.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <input id="f-pos" value={filtros.posicion} onChange={e => setFiltros({ ...filtros, posicion: e.target.value })} placeholder="Elige un deporte o escribe" />
              )}
            </div>
            {['administrador', 'personal_salud', 'head_coach'].includes(usuario?.rol) && (
              <div className="form-group"><label htmlFor="f-ent">Entrenador</label>
                <select id="f-ent" value={filtros.entrenador} onChange={e => setFiltros({ ...filtros, entrenador: e.target.value })}>
                  <option value="">Todos</option>
                  {[...new Map(jugadores.filter(j => j.entrenador_id).map(j => [j.entrenador_id, { id: j.entrenador_id, nombre: j.entrenador_nombre }])).values()]
                    .map(x => <option key={x.id} value={x.id}>{x.nombre || `Entrenador ${x.id}`}</option>)}
                </select></div>
            )}
          </div>
          <div className="panel-filtros-pie">
            <small>Filtros activos: {Object.values(filtros).filter(Boolean).length}</small>
            <button className="btn btn-ghost btn-sm" onClick={() => setFiltros({ edadMin: '', edadMax: '', posicion: '', entrenador: '' })}>Limpiar filtros</button>
          </div>
        </div>
      )}

      {/* Tabla de Jugadores */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <Esqueleto tipo="tabla" columnas={6} filas={6} />
        ) : error ? (
          <EstadoError mensaje={error} onReintentar={loadData} />
        ) : jugadores.length === 0 ? (
          <EstadoVacio
            icono="fa-people-group"
            titulo="Aún no hay deportistas registrados"
            descripcion={puedeEditar
              ? 'Registra a cada deportista con su dorsal, o importa el plantel completo desde un archivo CSV.'
              : 'Cuando se registren deportistas, aparecerán aquí.'}
            accion={puedeEditar ? { texto: 'Registrar deportista', icono: 'fa-plus', onClick: openCreate } : null}
            accionSecundaria={puedeEditar ? { texto: 'Importar CSV', icono: 'fa-file-arrow-up', onClick: () => setModalCsv(true) } : null}
          />
        ) : filteredJugadores.length === 0 ? (
          <EstadoSinResultados
            descripcion={searchTerm.trim() || Object.values(filtros).some(Boolean)
              ? 'Ningún deportista coincide con la búsqueda o los filtros. Revisa el texto o quita los filtros.'
              : `No hay deportistas registrados en ${currentSport?.nombre || 'este deporte'}.`}
            onLimpiar={() => { setSearchTerm(''); setFiltros({ edadMin: '', edadMax: '', posicion: '', entrenador: '' }); setSelectedSportId('todos') }}
            textoLimpiar="Ver todos los deportistas"
          />
        ) : (
          <div className="table-wrapper">
            <table className="tabla-movil">
              <thead>
                <tr>
                  <th>Dorsal</th>
                  <th>Deportista</th>
                  <th className="col-sec col-ter">Edad</th>
                  <th className="col-sec">Posición</th>
                  <th className="col-sec col-ter">Deporte / Disciplina</th>
                  <th className="col-sec">Equipo</th>
                  <th className="col-sec col-ter">Entrenador</th>
                  <th className="col-sec col-ter">Peso (kg)</th>
                  <th className="col-sec col-ter">Altura (m)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredJugadores.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <DorsalEditable
                        jugador={j}
                        puedeEditar={puedeEditar}
                        onCambio={(dorsal) => setJugadores(lista => lista.map(x => x.id === j.id ? { ...x, dorsal } : x))}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {j.foto_url ? (
                          <img
                            src={formatImageUrl(j.foto_url)}
                            alt={j.nombre}
                            referrerPolicy="no-referrer"
                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'var(--surface-hover)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14
                            }}
                          >
                            <i className="fa-solid fa-user" aria-hidden="true" />
                          </div>
                        )}
                        <span>
                          {j.nombre}
                          <span className="sub-movil">{[j.posicion, j.equipo_nombre].filter(Boolean).join(' · ') || 'Sin posición ni equipo'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="col-sec col-ter">{j.edad ? `${j.edad} años` : '—'}</td>
                    <td className="col-sec">
                      {j.posicion ? (
                        <span className="badge badge-purple">{j.posicion}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="col-sec col-ter">
                      {j.disciplina_nombre ? (
                        <span className="badge badge-green"><i className="fa-solid fa-medal" aria-hidden="true" /> {j.disciplina_nombre}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>General</span>
                      )}
                    </td>
                    <td className="col-sec">
                      {j.equipo_nombre ? (
                        <span className="badge badge-blue"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> {j.equipo_nombre}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="col-sec col-ter">{j.entrenador_nombre || '—'}</td>
                    <td className="col-sec col-ter">{j.peso ? `${j.peso} kg` : '—'}</td>
                    <td className="col-sec col-ter">{j.altura ? `${j.altura} m` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openFicha(j.id)} aria-label={`Ficha de ${j.nombre}`}>
                          <Eye size={13} /> Ficha
                        </button>
                        {puedeEditar && (
                          <>
                            <button className="btn btn-ghost btn-sm acc-sec" onClick={() => openEdit(j)} aria-label={`Editar a ${j.nombre}`} title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm acc-sec" onClick={() => handleDelete(j.id, j.nombre)} aria-label={`Eliminar a ${j.nombre}`} title="Eliminar">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Deporte */}
      {modalNuevoDeporte && (
        <Modal
          title="Crear Nuevo Deporte / Disciplina"
          onClose={() => setModalNuevoDeporte(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
              <button className="btn btn-ghost" onClick={() => setModalNuevoDeporte(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCrearDeporte}
                disabled={creandoDeporte || !nuevoDeporteNombre.trim()}
              >
                {creandoDeporte ? 'Guardando...' : 'Crear Deporte'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Como Director Técnico o Entrenador, puedes agregar nuevas disciplinas deportivas (ej. Rugby, Fútbol Sala, Baloncesto, Atletismo, etc.) para luego organizar y filtrar a tus deportistas.
            </p>
            <div className="form-group">
              <label>Nombre del deporte o disciplina *</label>
              <input
                type="text"
                placeholder="Ej. Rugby, Fútbol Sala, Natación, Balonmano..."
                value={nuevoDeporteNombre}
                onChange={e => setNuevoDeporteNombre(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Importar CSV */}
      <ImportCsvModal
        isOpen={modalCsv}
        onClose={() => setModalCsv(false)}
        onSuccess={loadData}
        disciplinas={disciplinas}
        equipos={equipos}
      />

      {/* Modal Ficha Técnica */}
      {modalFicha && selectedPlayer && (
        <Modal title={`Ficha deportiva: ${nombreConDorsal(selectedPlayer.nombre, selectedPlayer.dorsal)}`} onClose={closeModal} width="800px"
          footer={puedeEditar ? <>
            <button type="button" className="btn btn-danger" onClick={() => { const p = selectedPlayer; closeModal(); handleDelete(p.id, p.nombre) }}>
              <Trash2 size={15} /> Eliminar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { const p = selectedPlayer; closeModal(); openEdit(p) }}>
              <Pencil size={15} /> Editar
            </button>
          </> : null}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1/1',
                  background: 'var(--surface-hover)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}
              >
                {selectedPlayer.foto_url ? (
                  <img
                    src={formatImageUrl(selectedPlayer.foto_url)}
                    alt={selectedPlayer.nombre}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 64
                    }}
                  >
                    <i className="fa-solid fa-user" aria-hidden="true" />
                  </div>
                )}
                {puedeEditar && (
                  <button
                    onClick={() => fileInputRef.current.click()}
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: 'none',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Subir foto del deportista"
                  >
                    <Camera size={20} />
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Datos Generales
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 14 }}><strong>Edad:</strong> {selectedPlayer.edad ? `${selectedPlayer.edad} años` : '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Dorsal:</strong> {tieneDorsal(selectedPlayer.dorsal) ? <span className="dorsal-chip">{selectedPlayer.dorsal}</span> : 'Sin asignar'}</p>
                  <p style={{ fontSize: 14 }}><strong>Posición:</strong> <span className="badge badge-purple">{selectedPlayer.posicion || '—'}</span></p>
                  <p style={{ fontSize: 14 }}><strong>Deporte:</strong> <span className="badge badge-green">{selectedPlayer.disciplina_nombre || 'General'}</span></p>
                  <p style={{ fontSize: 14 }}><strong>Equipo:</strong> {selectedPlayer.equipo_nombre || '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Peso:</strong> {selectedPlayer.peso ? `${selectedPlayer.peso} kg` : '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Altura:</strong> {selectedPlayer.altura ? `${selectedPlayer.altura} m` : '—'}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Activity size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: 16 }}>Resumen Antropométrico</h3>
                </div>
                {selectedPlayer.ultima_antropometria ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Somatotipo</p>
                      <p style={{ fontSize: 16, fontWeight: 700 }}>
                        {selectedPlayer.ultima_antropometria.endomorfia} - {selectedPlayer.ultima_antropometria.mesomorfia} - {selectedPlayer.ultima_antropometria.ectomorfia}
                      </p>
                    </div>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>% Grasa Corporal</p>
                      <p style={{ fontSize: 16, fontWeight: 700 }}>{selectedPlayer.ultima_antropometria.porcentaje_grasa}%</p>
                    </div>
                  </div>
                ) : (
                  <EstadoVacio compacto icono="fa-ruler-combined" titulo="Sin medición antropométrica" descripcion="Se registra en el módulo Antropometría." />
                )}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Target size={18} color="var(--accent2)" />
                  <h3 style={{ fontSize: 16 }}>Evaluación de Rendimiento</h3>
                </div>
                {selectedPlayer.ultima_evaluacion ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent2)' }}>
                        {selectedPlayer.ultima_evaluacion.score_general}
                      </p>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Sprint 30m:</span> {selectedPlayer.ultima_evaluacion.sprint_30m}s</div>
                      <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Salto vertical:</span> {selectedPlayer.ultima_evaluacion.salto_vertical}cm</div>
                    </div>
                  </div>
                ) : (
                  <EstadoVacio compacto icono="fa-bullseye" titulo="Sin evaluación física" descripcion="Se registra en el módulo Evaluaciones." />
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Crear / Editar Jugador */}
      {modal && (
        <Modal
          title={editId ? 'Editar Deportista' : 'Registrar Nuevo Deportista'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Guardar Deportista'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="jug-nombre">Nombre completo *</label>
              <input id="jug-nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Carlos Méndez" autoFocus />
            </div>

            <div className="form-group">
              <label htmlFor="jug-dorsal">Dorsal (número de camiseta)</label>
              <input id="jug-dorsal" name="dorsal" type="text" inputMode="numeric" maxLength={2}
                value={form.dorsal} onChange={e => setForm(f => ({ ...f, dorsal: e.target.value.replace(/\D/g, '') }))}
                placeholder="0 a 99, opcional" />
              <small style={{ color: 'var(--texto-suave)', fontSize: 13 }}>No se puede repetir dentro del mismo equipo. También se cambia con un clic en la tabla.</small>
            </div>

            <div className="form-group">
              <label htmlFor="jug-deporte">Deporte</label>
              <select id="jug-deporte" name="disciplina_id" value={form.disciplina_id} onChange={handleChange} disabled={!!deporteUnico}>
                <option value="">Seleccionar deporte…</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="jug-posicion">{perfilForm.formato === 'tiempo' ? 'Prueba o especialidad' : 'Posición'}</label>
              {posicionesForm.length ? (
                <select id="jug-posicion" name="posicion" value={form.posicion} onChange={handleChange}>
                  <option value="">Sin definir</option>
                  {posicionesForm.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <input id="jug-posicion" name="posicion" value={form.posicion} onChange={handleChange}
                  placeholder={form.disciplina_id ? 'Escribe la posición' : 'Elige primero el deporte'} />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="jug-nac">Fecha de nacimiento</label>
              <input id="jug-nac" name="fecha_nacimiento" type="date" max={hoyISO()} value={form.fecha_nacimiento} onChange={handleChange} />
              <small className="ayuda-campo">
                {form.fecha_nacimiento ? `Edad: ${edadDesde(form.fecha_nacimiento)} años (se actualiza sola)` : form.edad ? `Edad registrada: ${form.edad} años. Con la fecha, se actualiza sola.` : 'La edad se calcula y se actualiza sola.'}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="jug-genero">Género</label>
              <select id="jug-genero" name="genero" value={form.genero} onChange={handleChange}>
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="jug-equipo">Equipo / categoría</label>
              <select id="jug-equipo" name="equipo_id" value={form.equipo_id} onChange={handleChange}>
                <option value="">Sin equipo asignado</option>
                {equiposForm.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}{(e.categoria_nombre || e.categoria) ? ` · ${e.categoria_nombre || e.categoria}` : ''}</option>
                ))}
              </select>
            </div>

            {usuario?.rol === 'administrador' && <div className="form-group"><label htmlFor="jug-entrenador">Entrenador asignado</label><select id="jug-entrenador" name="entrenador_id" value={form.entrenador_id} onChange={handleChange}><option value="">Sin asignar</option>{entrenadores.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>}

            <div className="form-group">
              <label>Peso corporal (kg)</label>
              <input name="peso" type="number" step="0.1" value={form.peso} onChange={handleChange} placeholder="75.5" />
            </div>

            <div className="form-group">
              <label>Estatura (m)</label>
              <input name="altura" type="number" step="0.01" value={form.altura} onChange={handleChange} placeholder="1.80" />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar deportista */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar deportista?"
        message={`¿Estás seguro de que deseas eliminar permanentemente a "${deleteModal.nombre}"? Sus evaluaciones, asistencias y datos asociados también se eliminarán.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </div>
  )
}
