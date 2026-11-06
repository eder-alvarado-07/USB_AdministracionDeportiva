import { useEffect, useState, useRef } from 'react'
import {
  Shield, Plus, Pencil, Trash2, Users, Upload, Camera, Search, X, Check,
  Activity, Award, Filter, ExternalLink, ChevronRight, UserPlus, UserMinus
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoSinResultados, EstadoError } from '../components/EstadoVista'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { formatImageUrl } from '../utils/image'
import { etiquetaJugador, nombreConDorsal } from '../utils/jugador'
import EncabezadoPagina from '../components/EncabezadoPagina'
import { perfilDeporte } from '../config/deportes'

const EMPTY_EQUIPO = {
  nombre: '',
  categoria: '',
  categoria_id: '',
  descripcion: '',
  disciplina_id: '',
  logo_url: ''
}

export default function Equipos() {
  const { tienePermiso, usuario } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])
  const esAdmin = usuario?.rol === 'administrador'
  const { disciplinas, selectedSportId, selectedSport, setSelectedSportId, deporteUnico } = useDeporte()
  // v2.0: categorías que maneja cada deporte (las define el administrador)
  const [categorias, setCategorias] = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const cargarCategorias = () => api.get('/disciplinas/categorias').then(r => setCategorias(r.data)).catch(() => {})
  useEffect(() => { cargarCategorias() }, [])
  const categoriasDe = (disciplinaId) => categorias.filter(c => String(c.disciplina_id) === String(disciplinaId))
  const agregarCategoria = async () => {
    const nombre = nuevaCategoria.trim()
    if (!nombre || !form.disciplina_id) return
    try {
      const { data } = await api.post(`/disciplinas/${form.disciplina_id}/categorias`, { nombre })
      await cargarCategorias()
      setForm(f => ({ ...f, categoria_id: String(data.id), categoria: data.nombre }))
      setNuevaCategoria('')
      toast.success(`Categoría "${data.nombre}" agregada`)
    } catch (e) { toast.error(e.message) }
  }

  const [equipos, setEquipos]             = useState([])
  const [todosJugadores, setTodosJugadores] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [searchTerm, setSearchTerm]       = useState('')

  // Modal Crear / Editar
  const [modalForm, setModalForm]         = useState(false)
  const [form, setForm]                   = useState(EMPTY_EQUIPO)
  const [editId, setEditId]               = useState(null)
  const [saving, setSaving]               = useState(false)
  const [selectedFile, setSelectedFile]   = useState(null)
  const [previewUrl, setPreviewUrl]       = useState('')
  const fileInputRef                      = useRef(null)

  // Modal Ver Plantilla / Deportistas del Equipo
  const [modalPlantilla, setModalPlantilla] = useState(false)
  const [equipoDetalle, setEquipoDetalle]   = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [searchJugador, setSearchJugador]   = useState('')
  const [modalAgregarJugador, setModalAgregarJugador] = useState(false)
  const [jugadorParaAsignar, setJugadorParaAsignar]   = useState('')

  // Subida rápida de logo desde la tarjeta
  const cardFileInputRef = useRef(null)
  const [uploadingLogoId, setUploadingLogoId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, equipo: null, loading: false })
  const [unlinkModal, setUnlinkModal] = useState({ isOpen: false, jugador: null, loading: false })

  const cargarEquipos = async () => {
    setLoading(true)
    setError(null)
    try {
      const [eqRes, jugRes] = await Promise.all([
        api.get('/equipos'),
        api.get('/jugadores')
      ])
      setEquipos(eqRes.data)
      setTodosJugadores(jugRes.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  // Filtrar equipos por deporte activo y término de búsqueda
  const equiposFiltrados = equipos.filter(eq => {
    const coincideDeporte = (!selectedSportId || selectedSportId === 'todos')
      ? true
      : String(eq.disciplina_id) === String(selectedSportId)

    const matchText = (eq.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (eq.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (eq.disciplina_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())

    const coincideCategoria = !filtroCategoria || String(eq.categoria_id) === String(filtroCategoria)
    return coincideDeporte && matchText && coincideCategoria
  })

  // Abrir modal de creación
  const openCreate = () => {
    setForm({
      nombre: '',
      categoria: '',
      categoria_id: '',
      descripcion: '',
      disciplina_id: selectedSportId && selectedSportId !== 'todos' ? selectedSportId : (disciplinas[0]?.id || ''),
      logo_url: ''
    })
    setEditId(null)
    setSelectedFile(null)
    setPreviewUrl('')
    setModalForm(true)
  }

  // Abrir modal de edición
  const openEdit = (eq) => {
    setForm({
      nombre: eq.nombre || '',
      categoria: eq.categoria || '',
      categoria_id: eq.categoria_id ? String(eq.categoria_id) : '',
      descripcion: eq.descripcion || '',
      disciplina_id: eq.disciplina_id || '',
      logo_url: eq.logo_url || ''
    })
    setEditId(eq.id)
    setSelectedFile(null)
    setPreviewUrl(eq.logo_url || '')
    setModalForm(true)
  }

  // Manejar selección de imagen en el formulario
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('La imagen no debe superar los 5MB')
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // Guardar Equipo (Crear o Editar)
  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      return toast.error('El nombre del equipo es obligatorio')
    }
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria ? form.categoria.trim() : null,
        categoria_id: form.categoria_id || null,
        descripcion: form.descripcion ? form.descripcion.trim() : null,
        disciplina_id: form.disciplina_id || null,
        logo_url: form.logo_url || null
      }

      let teamId = editId
      if (editId) {
        await api.put(`/equipos/${editId}`, payload)
      } else {
        const res = await api.post('/equipos', payload)
        teamId = res.data.id
      }

      // 2. Si se seleccionó un archivo de imagen, subirlo
      if (selectedFile && teamId) {
        const formData = new FormData()
        formData.append('logo', selectedFile)
        try {
          await api.post(`/equipos/${teamId}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        } catch (imgErr) {
          console.warn('Advertencia al subir escudo:', imgErr)
          toast.error('El equipo se guardó pero ocurrió un detalle con el escudo: ' + (imgErr.response?.data?.error || imgErr.message))
        }
      }

      toast.success(editId ? 'Equipo actualizado exitosamente' : 'Equipo creado exitosamente')
      setModalForm(false)
      setSelectedFile(null)
      cargarEquipos()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Error al guardar el equipo')
    } finally {
      setSaving(false)
    }
  }

  // Subida rápida de logo directamente desde la tarjeta
  const triggerQuickUpload = (id) => {
    setUploadingLogoId(id)
    if (cardFileInputRef.current) {
      cardFileInputRef.current.click()
    }
  }

  const handleQuickFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !uploadingLogoId) return
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('La imagen no debe superar los 5MB')
    }
    const formData = new FormData()
    formData.append('logo', file)
    const tId = toast.loading('Subiendo escudo del equipo...')
    try {
      await api.post(`/equipos/${uploadingLogoId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Escudo actualizado', { id: tId })
      cargarEquipos()
      if (equipoDetalle && equipoDetalle.id === uploadingLogoId) {
        verPlantilla({ id: uploadingLogoId })
      }
    } catch (err) {
      toast.error('Error al subir imagen: ' + err.message, { id: tId })
    } finally {
      setUploadingLogoId(null)
      e.target.value = ''
    }
  }

  // Eliminar equipo
  const handleDelete = (eq) => {
    setDeleteModal({ isOpen: true, equipo: eq, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.equipo) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/equipos/${deleteModal.equipo.id}`)
      toast.success(`Equipo "${deleteModal.equipo.nombre}" eliminado correctamente`)
      if (equipoDetalle && equipoDetalle.id === deleteModal.equipo.id) {
        setModalPlantilla(false)
      }
      setDeleteModal({ isOpen: false, equipo: null, loading: false })
      cargarEquipos()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Error al eliminar el equipo')
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  // Ver plantilla detallada de un equipo
  const verPlantilla = async (eq) => {
    setLoadingDetalle(true)
    setModalPlantilla(true)
    try {
      const res = await api.get(`/equipos/${eq.id}`)
      setEquipoDetalle(res.data)
    } catch (e) {
      toast.error('Error al cargar plantilla: ' + e.message)
    } finally {
      setLoadingDetalle(false)
    }
  }

  // Asignar un deportista al equipo
  const asignarJugadorAlEquipo = async () => {
    if (!jugadorParaAsignar || !equipoDetalle) return
    try {
      const jugador = todosJugadores.find(j => j.id === Number(jugadorParaAsignar))
      if (!jugador) return

      await api.put(`/jugadores/${jugador.id}`, {
        nombre: jugador.nombre,
        edad: jugador.edad,
        posicion: jugador.posicion,
        peso: jugador.peso,
        altura: jugador.altura,
        disciplina_id: equipoDetalle.disciplina_id || jugador.disciplina_id,
        equipo_id: equipoDetalle.id
      })

      toast.success(`${jugador.nombre} asignado a ${equipoDetalle.nombre}`)
      setModalAgregarJugador(false)
      setJugadorParaAsignar('')
      verPlantilla(equipoDetalle)
      cargarEquipos()
    } catch (e) {
      toast.error('Error al asignar deportista: ' + e.message)
    }
  }

  // Desvincular deportista del equipo
  const desvincularJugador = (jugador) => {
    setUnlinkModal({ isOpen: true, jugador, loading: false })
  }

  const handleConfirmUnlink = async () => {
    if (!unlinkModal.jugador) return
    setUnlinkModal(prev => ({ ...prev, loading: true }))
    try {
      const jugador = unlinkModal.jugador
      await api.put(`/jugadores/${jugador.id}`, {
        nombre: jugador.nombre,
        edad: jugador.edad,
        posicion: jugador.posicion,
        peso: jugador.peso,
        altura: jugador.altura,
        disciplina_id: jugador.disciplina_id,
        equipo_id: null
      })
      toast.success('Deportista desvinculado del equipo')
      setUnlinkModal({ isOpen: false, jugador: null, loading: false })
      if (equipoDetalle) verPlantilla(equipoDetalle)
      cargarEquipos()
    } catch (e) {
      toast.error('Error al desvincular deportista: ' + (e.response?.data?.error || e.message))
      setUnlinkModal(prev => ({ ...prev, loading: false }))
    }
  }

  // Jugadores disponibles para asignar (que no estén en este equipo)
  const jugadoresDisponibles = todosJugadores.filter(j => {
    if (!equipoDetalle) return false
    return j.equipo_id !== equipoDetalle.id
  })

  // Deportistas en el detalle filtrados por búsqueda
  const deportistasEnEquipo = (equipoDetalle?.jugadores || []).filter(j => {
    const match = (j.nombre || '').toLowerCase().includes(searchJugador.toLowerCase()) ||
                  (j.posicion || '').toLowerCase().includes(searchJugador.toLowerCase())
    return match
  })

  return (
    <div className="equipos-page">
      {/* Input oculto para subida rápida de archivo */}
      <input
        type="file"
        ref={cardFileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleQuickFileUpload}
      />

      <EncabezadoPagina
        icono="fa-shield-halved"
        antetitulo={deporteUnico ? deporteUnico.nombre : selectedSport?.esTodos === false ? selectedSport.nombre : 'Todos los deportes'}
        titulo="Equipos"
        descripcion="Plantillas por deporte y categoría, con su escudo y sus deportistas inscritos."
        acciones={puedeEditar && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Crear equipo
          </button>
        )}
      />

      {/* v2.0: filtro por deporte desplegable (en el celular es más cómodo que escribir) y por categoría */}
      <div className="barra-herramientas">
        {!deporteUnico && disciplinas.length > 1 && (
          <div className="filtro-select">
            <label htmlFor="eq-deporte"><i className="fa-solid fa-medal" aria-hidden="true"></i> Deporte</label>
            <select id="eq-deporte" value={selectedSportId || 'todos'} onChange={e => { setSelectedSportId(e.target.value); setFiltroCategoria('') }}>
              <option value="todos">Todos los deportes ({equipos.length})</option>
              {disciplinas.map(d => (
                <option key={d.id} value={d.id}>{d.nombre} ({equipos.filter(e => String(e.disciplina_id) === String(d.id)).length})</option>
              ))}
            </select>
          </div>
        )}
        {selectedSportId && selectedSportId !== 'todos' && categoriasDe(selectedSportId).length > 0 && (
          <div className="filtro-select">
            <label htmlFor="eq-cat"><i className="fa-solid fa-layer-group" aria-hidden="true"></i> Categoría</label>
            <select id="eq-cat" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categoriasDe(selectedSportId).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
        <div className="buscador solo-pc">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Buscar equipo o categoría" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} aria-label="Buscar equipo" />
        </div>
        <span className="barra-total">{!loading && !error && <><b>{equiposFiltrados.length}</b> {equiposFiltrados.length === 1 ? 'equipo' : 'equipos'}</>}</span>
      </div>

      {/* Grid de Equipos */}
      {loading ? (
        <Esqueleto tipo="tarjetas" filas={3} />
      ) : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={cargarEquipos} /></div>
      ) : equipos.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-shield-halved"
            titulo="Aún no hay equipos"
            descripcion={puedeEditar
              ? 'Crea el primer equipo con su categoría y su escudo; después podrás asignarle deportistas.'
              : 'Cuando se cree un equipo, aparecerá aquí con su plantilla.'}
            accion={puedeEditar ? { texto: 'Crear equipo', icono: 'fa-plus', onClick: openCreate } : null}
          />
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="card">
          <EstadoSinResultados
            descripcion={searchTerm
              ? `Ningún equipo coincide con "${searchTerm}".`
              : `No hay equipos de ${selectedSport?.nombre || 'este deporte'}.`}
            onLimpiar={() => { setSearchTerm(''); setSelectedSportId('todos') }}
            textoLimpiar="Ver todos los equipos"
          />
        </div>
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {equiposFiltrados.map(eq => (
            <div
              key={eq.id}
              className="card team-card"
              style={{
                '--deporte': perfilDeporte(eq.disciplina_nombre).color,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 20,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}
            >
              <i className={`fa-solid ${perfilDeporte(eq.disciplina_nombre).icono} team-card-fondo`} aria-hidden="true"></i>
              {/* Header de la tarjeta del equipo */}
              <div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Escudo / Logo con soporte para cambio rápido */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(8,135,50,0.08), rgba(0,145,111,0.08))',
                        border: '1.5px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                    >
                      {eq.logo_url ? (
                        <img
                          src={formatImageUrl(eq.logo_url)}
                          alt={eq.nombre}
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div style={{
                          fontSize: 22, fontWeight: 800, color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {eq.nombre.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {puedeEditar && (
                      <button
                        type="button"
                        className="boton-escudo"
                        title="Cambiar imagen / escudo"
                        aria-label={`Cambiar el escudo de ${eq.nombre}`}
                        onClick={() => triggerQuickUpload(eq.id)}
                        style={{
                          position: 'absolute',
                          bottom: -4,
                          right: -4,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                        }}
                      >
                        <Camera size={12} />
                      </button>
                    )}
                  </div>

                  {/* Información del Equipo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: 17,
                      fontWeight: 700,
                      margin: '0 0 4px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {eq.nombre}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                      {eq.categoria && (
                        <span className="badge badge-purple" style={{ fontSize: 11, padding: '2px 8px' }}>
                          {eq.categoria}
                        </span>
                      )}
                      {eq.disciplina_nombre && (
                        <span className="chip-deporte" style={{ '--deporte': perfilDeporte(eq.disciplina_nombre).color }}>
                          <i className={`fa-solid ${perfilDeporte(eq.disciplina_nombre).icono}`} aria-hidden="true"></i> {eq.disciplina_nombre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                {eq.descripcion && (
                  <p style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                    margin: '12px 0 0',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {eq.descripcion}
                  </p>
                )}

                {/* Total de Deportistas */}
                <div style={{
                  marginTop: 14,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="var(--accent)" />
                    Plantilla de Deportistas
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--verde-texto)',
                    background: 'var(--ok-fondo)',
                    padding: '2px 8px',
                    borderRadius: 12
                  }}>
                    {eq.total_jugadores || 0} {eq.total_jugadores === 1 ? 'deportista' : 'deportistas'}
                  </span>
                </div>
              </div>

              {/* Botones de Acción de la tarjeta */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 18,
                paddingTop: 12,
                borderTop: '1px solid var(--border)'
              }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => verPlantilla(eq)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Users size={14} /> Ver Plantilla
                </button>

                {puedeEditar && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(eq)}
                      title="Editar equipo"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(eq)}
                      title="Eliminar equipo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR EQUIPO */}
      {modalForm && (
        <Modal
          title={editId ? 'Editar Equipo' : 'Crear Nuevo Equipo'}
          onClose={() => setModalForm(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalForm(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar Equipo' : 'Crear Equipo'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            {/* Logo / Escudo con preview interactivo */}
            <div className="form-group" style={{ gridColumn: '1 / -1', textAlign: 'center', marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Identificador Visual / Escudo del Equipo</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    background: 'var(--surface-hover)',
                    border: '2px dashed var(--border-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={formatImageUrl(previewUrl)}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Shield size={32} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ textAlign: 'left' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Upload size={14} /> Subir Imagen desde el dispositivo
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    PNG, JPG, WEBP o SVG (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Opcional: URL directa de imagen */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>O ingresar URL de Imagen (opcional)</label>
              <input
                type="url"
                placeholder="https://ejemplo.com/escudo.png"
                value={form.logo_url}
                onChange={e => {
                  setForm({ ...form, logo_url: e.target.value })
                  if (!selectedFile) setPreviewUrl(e.target.value)
                }}
              />
            </div>

            {/* Nombre del Equipo */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre del Equipo *</label>
              <input
                type="text"
                placeholder="Ej: Jaguares RC, Rayos FC, Titanes"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            {/* Deporte */}
            <div className="form-group">
              <label htmlFor="eq-form-deporte">Deporte</label>
              <select id="eq-form-deporte" value={form.disciplina_id} disabled={!!deporteUnico && !esAdmin}
                onChange={e => setForm({ ...form, disciplina_id: e.target.value, categoria_id: '', categoria: '' })}>
                <option value="">Sin deporte específico</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>

            {/* v2.0: categoría del catálogo de ese deporte */}
            <div className="form-group">
              <label htmlFor="eq-form-cat">Categoría</label>
              {form.disciplina_id && categoriasDe(form.disciplina_id).length > 0 ? (
                <select id="eq-form-cat" value={form.categoria_id}
                  onChange={e => setForm({ ...form, categoria_id: e.target.value, categoria: categorias.find(c => String(c.id) === e.target.value)?.nombre || '' })}>
                  <option value="">Sin categoría</option>
                  {categoriasDe(form.disciplina_id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : (
                <input id="eq-form-cat" type="text" placeholder={form.disciplina_id ? 'Este deporte aún no tiene categorías' : 'Elige primero el deporte'}
                  value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} disabled={esAdmin && !!form.disciplina_id} />
              )}
              {esAdmin && form.disciplina_id && (
                <div className="agregar-inline">
                  <input aria-label="Nueva categoría" placeholder="Nueva categoría, ej. Femenino" value={nuevaCategoria}
                    onChange={e => setNuevaCategoria(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarCategoria() } }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={agregarCategoria} disabled={!nuevaCategoria.trim()}>
                    <i className="fa-solid fa-plus" aria-hidden="true"></i> Agregar
                  </button>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción / Observaciones</label>
              <textarea
                rows={3}
                placeholder="Información adicional sobre la división, objetivos o cuerpo técnico..."
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DETALLE DE PLANTILLA Y DEPORTISTAS DEL EQUIPO */}
      {modalPlantilla && (
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {equipoDetalle?.logo_url ? (
                <img
                  src={formatImageUrl(equipoDetalle.logo_url)}
                  alt={equipoDetalle.nombre}
                  referrerPolicy="no-referrer"
                  style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <Shield size={20} color="var(--accent)" />
              )}
              <span>Plantilla: {equipoDetalle?.nombre || 'Cargando...'}</span>
            </div>
          }
          onClose={() => setModalPlantilla(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {deportistasEnEquipo.length} de {equipoDetalle?.jugadores?.length || 0} deportistas listados
              </span>
              <button className="btn btn-ghost" onClick={() => setModalPlantilla(false)}>
                Cerrar
              </button>
            </div>
          }
        >
          {loadingDetalle ? (
            <Esqueleto tipo="panel" filas={6} etiqueta="Cargando la plantilla…" />
          ) : equipoDetalle ? (
            <div>
              {/* Resumen del equipo */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 10,
                background: 'var(--surface-hover)',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 12, overflow: 'hidden',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {equipoDetalle.logo_url ? (
                      <img
                        src={formatImageUrl(equipoDetalle.logo_url)}
                        alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Shield size={24} color="var(--accent)" />
                    )}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {equipoDetalle.nombre}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {equipoDetalle.categoria || 'Sin categoría'} · {equipoDetalle.disciplina_nombre || 'General'}
                    </p>
                  </div>
                </div>

                {puedeEditar && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setModalAgregarJugador(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <UserPlus size={14} /> Vincular Deportista
                  </button>
                )}
              </div>

              {/* Barra de búsqueda de la plantilla */}
              <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
                <div className="search-bar" style={{ flex: 1 }}>
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre o posición en este equipo..."
                    value={searchJugador}
                    onChange={e => setSearchJugador(e.target.value)}
                  />
                  {searchJugador && (
                    <button
                      onClick={() => setSearchJugador('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista / Tabla de deportistas */}
              {deportistasEnEquipo.length === 0 ? (
                searchJugador ? (
                  <EstadoSinResultados compacto
                    descripcion={`Ningún deportista de este equipo coincide con "${searchJugador}".`}
                    onLimpiar={() => setSearchJugador('')} textoLimpiar="Limpiar búsqueda" />
                ) : (
                  <EstadoVacio compacto
                    icono="fa-user-plus"
                    titulo="Este equipo aún no tiene deportistas"
                    descripcion={puedeEditar ? 'Agrega deportistas ya registrados para armar la plantilla.' : 'Cuando se asignen deportistas, aparecerán aquí.'}
                    accion={puedeEditar ? { texto: 'Agregar deportista', icono: 'fa-user-plus', onClick: () => setModalAgregarJugador(true) } : null}
                  />
                )
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Deportista</th>
                        <th>Posición</th>
                        <th>Edad</th>
                        <th>Peso / Altura</th>
                        {puedeEditar && <th style={{ textAlign: 'right' }}>Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {deportistasEnEquipo.map(j => (
                        <tr key={j.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%', overflow: 'hidden',
                                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                {j.foto_url ? (
                                  <img
                                    src={formatImageUrl(j.foto_url)}
                                    alt={j.nombre}
                                    referrerPolicy="no-referrer"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    {j.nombre.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>
                                {etiquetaJugador(j)}
                              </span>
                            </div>
                          </td>
                          <td>
                            {j.posicion ? (
                              <span className="badge badge-purple" style={{ fontSize: 11.5 }}>
                                {j.posicion}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {j.edad ? `${j.edad} años` : '—'}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {j.peso ? `${j.peso} kg` : '—'} {j.altura ? `· ${j.altura} m` : ''}
                          </td>
                          {puedeEditar && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--danger)', fontSize: 12, padding: '4px 8px' }}
                                onClick={() => desvincularJugador(j)}
                                title="Desvincular del equipo"
                              >
                                <UserMinus size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                Quitar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}

      {/* SUB-MODAL VINCULAR DEPORTISTA */}
      {modalAgregarJugador && (
        <Modal
          title={`Vincular Deportista a ${equipoDetalle?.nombre}`}
          onClose={() => setModalAgregarJugador(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalAgregarJugador(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={asignarJugadorAlEquipo}
                disabled={!jugadorParaAsignar}
              >
                Vincular al Equipo
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>Seleccionar Deportista</label>
            <select
              value={jugadorParaAsignar}
              onChange={e => setJugadorParaAsignar(e.target.value)}
            >
              <option value="">Selecciona un deportista de la lista...</option>
              {jugadoresDisponibles.map(j => (
                <option key={j.id} value={j.id}>
                  {etiquetaJugador(j)} {j.posicion ? `(${j.posicion})` : ''} {j.equipo_nombre ? `[Actualmente en: ${j.equipo_nombre}]` : '[Sin equipo]'}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Al vincular el deportista, pasará a formar parte de la plantilla oficial de este equipo.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar equipo */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar equipo?"
        message={`¿Estás seguro de que deseas eliminar el equipo "${deleteModal.equipo?.nombre}"? Los deportistas asignados quedarán sin equipo pero no serán eliminados.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, equipo: null, loading: false })}
      />

      {/* Modal de confirmación para desvincular jugador */}
      <ConfirmModal
        isOpen={unlinkModal.isOpen}
        title="¿Desvincular deportista?"
        message={`¿Estás seguro de desvincular a "${unlinkModal.jugador?.nombre}" de "${equipoDetalle?.nombre}"? El deportista permanecerá registrado en el sistema sin equipo asignado.`}
        confirmText="Sí, Desvincular"
        cancelText="Cancelar"
        confirmVariant="warning"
        loading={unlinkModal.loading}
        onConfirm={handleConfirmUnlink}
        onCancel={() => setUnlinkModal({ isOpen: false, jugador: null, loading: false })}
      />
    </div>
  )
}
