import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoError, EstadoSinResultados } from '../components/EstadoVista'
import EncabezadoPagina from '../components/EncabezadoPagina'
import api from '../services/api'
import CamposAgenda, { AGENDA_VACIA, agendaDe, equipoInicial, useEquiposAsignables } from '../components/CamposAgenda'
import { useAuth } from '../context/AuthContext'
import { useFiltroDeporte } from '../context/DeporteContext'
import { perfilDeporte } from '../config/deportes'
import { diaCorto, diasHasta, fechaLarga, hoyISO, mesCorto, numeroDia } from '../utils/fechas'

const EMPTY = { fecha: '', tipo: '', descripcion: '', ...AGENDA_VACIA }
const TIPOS = ['Resistencia', 'Fuerza', 'Táctica', 'Velocidad', 'Técnica', 'Físico General', 'Recuperación']
const ICONO_TIPO = {
  Resistencia: 'fa-heart-pulse', Fuerza: 'fa-dumbbell', Táctica: 'fa-chess-board', Velocidad: 'fa-bolt',
  Técnica: 'fa-bullseye', 'Físico General': 'fa-person-running', Recuperación: 'fa-spa',
}
const iconoTipo = (tipo = '') => ICONO_TIPO[Object.keys(ICONO_TIPO).find(k => tipo.startsWith(k))] || 'fa-stopwatch'

export default function Entrenamientos() {
  const { usuario, tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])

  const [entrenamientos, setEntrenamientos] = useState([])
  const filtro = useFiltroDeporte()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [verPasados, setVerPasados] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })
  const equipos = useEquiposAsignables(puedeEditar)

  const load = () => {
    setLoading(true)
    setError(null)
    api.get('/entrenamientos')
      .then(r => setEntrenamientos(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ ...EMPTY, fecha: hoyISO(), equipo_id: equipoInicial(equipos, usuario?.rol) })
    setEditId(null); setModal(true)
  }
  const openEdit = (e) => { setForm({ fecha: e.fecha?.slice(0, 10), tipo: e.tipo, descripcion: e.descripcion || '', ...agendaDe(e) }); setEditId(e.id); setModal(true) }
  const closeModal = () => setModal(false)
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (ev) => {
    ev?.preventDefault()
    if (!form.fecha || !form.tipo) return toast.error('Fecha y tipo son obligatorios')
    if (usuario?.rol !== 'administrador' && !form.equipo_id) return toast.error('Elige el equipo del entrenamiento')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/entrenamientos/${editId}`, form)
        toast.success('Entrenamiento actualizado')
      } else {
        await api.post('/entrenamientos', form)
        toast.success('Entrenamiento registrado')
      }
      closeModal(); load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/entrenamientos/${deleteModal.id}`)
      toast.success('Entrenamiento eliminado')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  // Filtro por el deporte de la cabecera: las actividades sin equipo son generales y se ven en todos
  const visibles = entrenamientos.filter(filtro.deActividad)
  const { proximos, pasados } = useMemo(() => {
    const hoy = hoyISO()
    return {
      proximos: visibles.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || '')),
      pasados: visibles.filter(e => e.fecha < hoy),
    }
  }, [visibles])

  const Sesion = ({ e }) => {
    const dias = diasHasta(e.fecha)
    const perfil = perfilDeporte(e.disciplina_nombre)
    return (
      <li className="sesion">
        <div className={`fecha-bloque ${dias === 0 ? 'hoy' : ''}`}>
          <small>{diaCorto(e.fecha)}</small>
          <b>{numeroDia(e.fecha)}</b>
          <small>{mesCorto(e.fecha)}</small>
        </div>
        <div className="sesion-cuerpo">
          <p className="sesion-titulo"><i className={`fa-solid ${iconoTipo(e.tipo)}`} aria-hidden="true"></i> {e.tipo}
            {dias === 0 && <span className="etiqueta-viva">Hoy</span>}
            {dias === 1 && <span className="etiqueta-suave">Mañana</span>}
          </p>
          <p className="sesion-meta">
            <span><i className={`fa-solid ${e.equipo_id ? perfil.icono : 'fa-users'}`} aria-hidden="true"></i> {e.equipo_nombre || 'General'}</span>
            {e.hora && <span><i className="fa-regular fa-clock" aria-hidden="true"></i> {e.hora}</span>}
            {e.lugar && <span><i className="fa-solid fa-location-dot" aria-hidden="true"></i> {e.lugar}</span>}
          </p>
          {e.descripcion && <p className="sesion-desc">{e.descripcion}</p>}
        </div>
        <div className="sesion-acciones">
          {puedeEditar && dias <= 0 && (
            <Link className="btn btn-secondary btn-sm" to={`/asistencia?entrenamiento=${e.id}`}>
              <i className="fa-solid fa-clipboard-check" aria-hidden="true"></i> <span className="texto-pc">Asistencia</span>
            </Link>
          )}
          {puedeEditar && (
            <>
              <button className="btn-icon" onClick={() => openEdit(e)} aria-label={`Editar ${e.tipo} del ${fechaLarga(e.fecha)}`} title="Editar">
                <i className="fa-solid fa-pen" aria-hidden="true"></i>
              </button>
              <button className="btn-icon btn-danger" onClick={() => setDeleteModal({ isOpen: true, id: e.id, loading: false })}
                aria-label={`Eliminar ${e.tipo} del ${fechaLarga(e.fecha)}`} title="Eliminar">
                <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
              </button>
            </>
          )}
        </div>
      </li>
    )
  }

  return (
    <div>
      <EncabezadoPagina
        icono="fa-stopwatch"
        antetitulo={filtro.hay ? filtro.nombre : 'Plan de trabajo'}
        titulo="Entrenamientos"
        descripcion="Sesiones programadas por equipo, con hora y lugar."
        acciones={puedeEditar && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Nuevo entrenamiento
          </button>
        )}
      />

      {!loading && !error && entrenamientos.length > 0 && (
        <div className="marcadores">
          <div className="marcador"><span>Próximas</span><b>{proximos.length}</b></div>
          <div className="marcador"><span>Esta semana</span><b>{proximos.filter(e => diasHasta(e.fecha) <= 7).length}</b></div>
          <div className="marcador"><span>Realizadas</span><b>{pasados.length}</b></div>
        </div>
      )}

      {loading ? <div className="card"><Esqueleto tipo="tabla" columnas={3} /></div> : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={load} /></div>
      ) : entrenamientos.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-stopwatch"
            titulo="Aún no hay entrenamientos registrados"
            descripcion={puedeEditar
              ? 'Crea la primera sesión para poder tomar asistencia y ver la agenda de la semana en el inicio.'
              : 'Cuando un entrenador programe una sesión, aparecerá aquí.'}
            accion={puedeEditar ? { texto: 'Nuevo entrenamiento', icono: 'fa-plus', onClick: openCreate } : null}
          />
        </div>
      ) : visibles.length === 0 ? (
        <div className="card"><EstadoSinResultados descripcion={`No hay entrenamientos de ${filtro.nombre}.`} onLimpiar={filtro.limpiar} textoLimpiar="Ver todos los deportes" /></div>
      ) : (
        <div className="grid-dos">
          <section className="card" aria-labelledby="t-prox">
            <h2 className="card-title" id="t-prox"><i className="fa-solid fa-calendar-day" aria-hidden="true"></i> Próximas sesiones</h2>
            {proximos.length === 0
              ? <p className="texto-suave">No hay sesiones programadas desde hoy.</p>
              : <ul className="lista-sesiones">{proximos.map(e => <Sesion key={e.id} e={e} />)}</ul>}
          </section>
          <section className="card" aria-labelledby="t-pas">
            <h2 className="card-title" id="t-pas"><i className="fa-solid fa-flag-checkered" aria-hidden="true"></i> Realizadas
              <span className="contador">{pasados.length}</span></h2>
            {pasados.length === 0
              ? <p className="texto-suave">Todavía no hay sesiones realizadas.</p>
              : (
                <>
                  <ul className="lista-sesiones">{(verPasados ? pasados : pasados.slice(0, 6)).map(e => <Sesion key={e.id} e={e} />)}</ul>
                  {pasados.length > 6 && (
                    <button className="btn btn-ghost btn-bloque" style={{ marginTop: 12 }} onClick={() => setVerPasados(v => !v)}>
                      {verPasados ? 'Ver menos' : `Ver las ${pasados.length} sesiones`}
                    </button>
                  )}
                </>
              )}
          </section>
        </div>
      )}

      {modal && (
        <Modal
          title={editId ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}
              </button>
            </>
          }
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="ent-fecha">Fecha *</label>
              <input id="ent-fecha" name="fecha" type="date" value={form.fecha} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="ent-tipo">Tipo *</label>
              <select id="ent-tipo" name="tipo" value={form.tipo} onChange={handleChange}>
                <option value="">Seleccionar…</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <CamposAgenda form={form} onChange={handleChange} equipos={equipos} />
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="ent-desc">Descripción</label>
              <textarea id="ent-desc" name="descripcion" rows="3" value={form.descripcion} onChange={handleChange}
                placeholder="Describe el contenido del entrenamiento…" style={{ resize: 'vertical' }} />
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar sesión de entrenamiento?"
        message="Se eliminará el entrenamiento y sus registros de asistencia. Esta acción no se puede deshacer."
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
