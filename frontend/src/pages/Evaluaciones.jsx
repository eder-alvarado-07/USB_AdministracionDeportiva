import { useEffect, useState } from 'react'
import { Plus, Trash2, Target, Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts'
import { ANIMACION_GRAFICA } from '../utils/movimiento'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoSinResultados, EstadoError } from '../components/EstadoVista'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { etiquetaJugador, nombreConDorsal } from '../utils/jugador'
import { fechaTabla, hoyISO } from '../utils/fechas'

const EMPTY = {
  jugador_id: '',
  fecha: hoyISO(),
  sprint_30m: '',
  salto_vertical: '',
  resistencia_yoyo: '',
  peso: '',
  estatura: '',
  porcentaje_grasa: '',
  masa_muscular: '',
  imc: ''
}

export default function Evaluaciones() {
  const { tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador', 'personal_salud'])
  const { selectedSportId, selectedSport, setSelectedSportId } = useDeporte()

  const [evals, setEvals] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [eRes, jRes] = await Promise.all([api.get('/evaluaciones'), api.get('/jugadores')])
      setEvals(eRes.data)
      setJugadores(jRes.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Filtrar evaluaciones y jugadores por el deporte activo
  const jugadoresFiltrados = jugadores.filter(j => {
    if (selectedSportId && selectedSportId !== 'todos') {
      return String(j.disciplina_id) === String(selectedSportId)
    }
    return true
  })

  const evalsFiltradas = evals.filter(ev => {
    if (selectedSportId && selectedSportId !== 'todos') {
      const j = jugadores.find(jug => jug.id === ev.jugador_id)
      return j ? String(j.disciplina_id) === String(selectedSportId) : true
    }
    return true
  })

  const handleJugadorChange = async (id) => {
    if (!id) return setForm(EMPTY);
    try {
      const res = await api.get(`/jugadores/${id}`);
      const j = res.data;
      const antro = j.ultima_antropometria;
      setForm(prev => ({
        ...prev,
        jugador_id: id,
        peso: antro?.peso || j.peso || '',
        estatura: antro?.estatura || j.altura || '',
        porcentaje_grasa: antro?.porcentaje_grasa || '',
        masa_muscular: antro?.masa_muscular_esqueletica || '',
        imc: antro?.imc || ((j.peso && j.altura) ? (j.peso / (j.altura * j.altura)).toFixed(2) : '')
      }));
    } catch (e) { toast.error('Error al cargar datos del jugador') }
  }

  const handleSubmit = async () => {
    if (!form.jugador_id) return toast.error('Selecciona un jugador')
    setSaving(true)
    try {
      await api.post('/evaluaciones', form)
      toast.success('Evaluación registrada')
      setModal(false); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/evaluaciones/${deleteModal.id}`)
      toast.success('Evaluación eliminada')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Evaluaciones de Rendimiento</h2>
        <p>
          Análisis físico y composición corporal (Radar Chart)
          {selectedSportId && selectedSportId !== 'todos' ? ` — Deporte: ${selectedSport?.nombre}` : ''}
        </p>
      </div>

      <div className="page-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{!loading && !error && `${evalsFiltradas.length} evaluaciones registradas`}</span>
        {puedeEditar && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}>
            <Plus size={16} /> Nueva Evaluación
          </button>
        )}
      </div>

      {loading ? <Esqueleto tipo="tarjetas" filas={2} /> : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={load} /></div>
      ) : evals.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-bullseye"
            titulo="Aún no hay evaluaciones físicas"
            descripcion={puedeEditar
              ? 'Registra la primera evaluación (sprint, salto, resistencia y composición corporal) para ver el radar de rendimiento de cada deportista.'
              : 'Cuando se registre una evaluación física, aparecerá aquí con su radar de rendimiento.'}
            accion={puedeEditar ? { texto: 'Nueva evaluación', icono: 'fa-plus', onClick: () => { setForm(EMPTY); setModal(true) } } : null}
          />
        </div>
      ) : evalsFiltradas.length === 0 ? (
        <div className="card">
          <EstadoSinResultados
            descripcion={`No hay evaluaciones de deportistas de ${selectedSport?.nombre || 'este deporte'}.`}
            onLimpiar={() => setSelectedSportId('todos')}
            textoLimpiar="Ver todos los deportes"
          />
        </div>
      ) : (
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(450px, 100%), 1fr))' }}>
        {evalsFiltradas.map(ev => (
          <div key={ev.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{nombreConDorsal(ev.jugador_nombre, ev.jugador_dorsal)}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fechaTabla(ev.fecha)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent2)' }}>{ev.score_general}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Score Global</div>
              </div>
            </div>

            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'Velocidad', A: ev.score_velocidad, full: 100 },
                  { subject: 'Potencia', A: ev.score_potencia, full: 100 },
                  { subject: 'Resistencia', A: ev.score_resistencia, full: 100 },
                  { subject: 'Grasa', A: ev.score_grasa, full: 100 },
                  { subject: 'Músculo', A: ev.score_musculo, full: 100 },
                ]}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar {...ANIMACION_GRAFICA} name={ev.jugador_nombre} dataKey="A" stroke="var(--accent2)" fill="var(--accent2)" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="badge badge-purple" style={{ textAlign: 'center', padding: 8 }}>
                {ev.score_velocidad < 50 && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                Velocidad: {ev.sprint_30m}s
              </div>
              <div className="badge badge-green" style={{ textAlign: 'center', padding: 8 }}>
                {ev.score_resistencia < 50 && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                Yo-Yo: {ev.resistencia_yoyo}m
              </div>
            </div>

            {puedeEditar && (
              <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => handleDelete(ev.id)}>
                <Trash2 size={13} /> Eliminar
              </button>
            )}
          </div>
        ))}
      </div>
      )}

      {modal && (
        <Modal title="Nueva Evaluación" onClose={() => setModal(false)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </>
        }>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Jugador *</label>
              <select value={form.jugador_id} onChange={e => handleJugadorChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {jugadoresFiltrados.map(j => <option key={j.id} value={j.id}>{etiquetaJugador(j)} {j.disciplina_nombre ? `(${j.disciplina_nombre})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} /></div>
            
            <div style={{ gridColumn: '1 / -1', marginTop: 10, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>COMPOSICIÓN CORPORAL (Auto-cargado)</div>
            <div className="form-group"><label>Peso (kg)</label><input type="number" value={form.peso} readOnly style={{background: 'var(--surface-hover)'}} /></div>
            <div className="form-group"><label>Estatura (m)</label><input type="number" value={form.estatura} readOnly style={{background: 'var(--surface-hover)'}} /></div>
            <div className="form-group"><label>% Grasa</label><input type="number" value={form.porcentaje_grasa} readOnly style={{background: 'var(--surface-hover)'}} /></div>
            <div className="form-group"><label>Masa Muscular (kg)</label><input type="number" value={form.masa_muscular} readOnly style={{background: 'var(--surface-hover)'}} /></div>

            <div style={{ gridColumn: '1 / -1', marginTop: 10, fontSize: 12, color: 'var(--accent2)', fontWeight: 600 }}>RENDIMIENTO FÍSICO</div>
            <div className="form-group"><label>Sprint 30m (s)</label><input type="number" step="0.01" value={form.sprint_30m} onChange={e => setForm({...form, sprint_30m: e.target.value})} /></div>
            <div className="form-group"><label>Salto Vertical (cm)</label><input type="number" value={form.salto_vertical} onChange={e => setForm({...form, salto_vertical: e.target.value})} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Resistencia (Yo-Yo metros)</label><input type="number" value={form.resistencia_yoyo} onChange={e => setForm({...form, resistencia_yoyo: e.target.value})} /></div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar evaluación */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar evaluación?"
        message="¿Estás seguro de que deseas eliminar esta evaluación física? Esta acción es irreversible."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
