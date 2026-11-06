import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Pencil, Activity, Ruler, Target, Info, ChevronRight, ChevronDown,
  Save, Calendar, TrendingUp, Award, User, Flame, Dumbbell, BarChart3, Scale, Layers, Zap, Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Legend
} from 'recharts'
import { ANIMACION_GRAFICA } from '../utils/movimiento'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoSinResultados, EstadoError } from '../components/EstadoVista'
import Somatocarta from '../components/Somatocarta'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { formatImageUrl } from '../utils/image'
import { calculateAnthropometry } from '../utils/anthropometry'
import { etiquetaJugador, nombreConDorsal } from '../utils/jugador'
import EncabezadoPagina from '../components/EncabezadoPagina'
import { fechaTabla, hoyISO, numeroDia, mesCorto } from '../utils/fechas'

const EMPTY_ANTRO = {
  jugador_id: '',
  fecha: hoyISO(),
  peso: '', estatura: '', imc: '',
  pliegue_biceps: '', pliegue_triceps: '', pliegue_subescapular: '', pliegue_suprailiaco: '',
  pliegue_supraespinal: '', pliegue_abdominal: '', pliegue_muslo_anterior: '', pliegue_pierna_medial: '',
  perimetro_brazo_relajado: '', perimetro_brazo_contraido: '', perimetro_muslo_medio: '', perimetro_pierna: '',
  diametro_humero: '', diametro_muneca: '', diametro_femur: '',
  porcentaje_grasa: '', masa_muscular_esqueletica: '', masa_mineral_osea: '',
  posicion_rugby: '', categoria: '', grupo: ''
}

export default function Antropometria() {
  const { tienePermiso, usuario } = useAuth()
  const { selectedSportId, selectedSport, setSelectedSportId } = useDeporte()
  // v2.0: el deportista solo ve su propio panel; no hay selector ni datos de sus compañeros
  const esJugador = usuario?.rol === 'jugador'
  const puedeEditar = tienePermiso(['administrador', 'entrenador', 'personal_salud'])

  const [jugadores, setJugadores] = useState([])
  const [selectedJugador, setSelectedJugador] = useState('')
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cargandoJugadores, setCargandoJugadores] = useState(true)
  const [errorJugadores, setErrorJugadores] = useState(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_ANTRO)
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'historial'
  const [expandedSections, setExpandedSections] = useState({
    basicas: true, pliegues: true, perimetros: false, diametros: false, composicion: true, clasificacion: false
  })
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [filterPos, setFilterPos] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showAvg, setShowAvg] = useState(true)

  const cargarJugadores = () => {
    setCargandoJugadores(true)
    setErrorJugadores(null)
    api.get('/jugadores')
      .then(r => setJugadores(r.data))
      .catch(e => setErrorJugadores(e.message))
      .finally(() => setCargandoJugadores(false))
  }

  useEffect(() => { cargarJugadores() }, [])

  // Filtrar jugadores por deporte activo si aplica
  const jugadoresDisponibles = jugadores.filter(j => {
    if (esJugador) return String(j.id) === String(usuario?.jugador_id)
    if (selectedSportId && selectedSportId !== 'todos') {
      return String(j.disciplina_id) === String(selectedSportId)
    }
    return true
  })

  // Sincronizar jugador seleccionado cuando cambia la lista disponible
  useEffect(() => {
    if (jugadoresDisponibles.length > 0) {
      if (!selectedJugador || !jugadoresDisponibles.some(j => String(j.id) === String(selectedJugador))) {
        setSelectedJugador(String(jugadoresDisponibles[0].id))
      }
    } else {
      setSelectedJugador('')
    }
  }, [selectedSportId, jugadores])

  useEffect(() => {
    if (selectedJugador) {
      loadRegistros(selectedJugador)
    } else {
      setRegistros([])
    }
  }, [selectedJugador])

  const loadRegistros = async (id) => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get(`/antropometria/jugador/${id}`)
      setRegistros(r.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const jugadorActivo = jugadores.find(j => String(j.id) === String(selectedJugador)) || null

  // Registro más reciente y registro inicial
  const ultimoRegistro = registros.length > 0 ? registros[0] : null
  const primerRegistro = registros.length > 1 ? registros[registros.length - 1] : null

  // Métricas calculadas para el dashboard individual
  const pesoActual = ultimoRegistro?.peso || jugadorActivo?.peso || null
  const estaturaActual = ultimoRegistro?.estatura || jugadorActivo?.altura || null
  const imcActual = ultimoRegistro?.imc || (pesoActual && estaturaActual ? (pesoActual / Math.pow(estaturaActual, 2)).toFixed(1) : null)
  const grasaActual = ultimoRegistro?.porcentaje_grasa || null
  const musculoActual = ultimoRegistro?.masa_muscular_esqueletica || null
  const sumPlieguesActual = ultimoRegistro?.sumatoria_pliegues || null

  // Clasificación del Somatotipo predominante
  const getSomatotypeClassification = (reg) => {
    if (!reg || reg.endomorfia === undefined) return 'Sin clasificar'
    const { endomorfia: endo, mesomorfia: meso, ectomorfia: ecto } = reg
    if (meso >= endo && meso >= ecto) {
      if (endo > ecto) return 'Meso-Endomorfo (Potencia & Masa)'
      if (ecto > endo) return 'Meso-Ectomorfo (Potencia & Agilidad)'
      return 'Mesomorfo Balanceado (Muscular y Atlético)'
    }
    if (endo >= meso && endo >= ecto) {
      if (meso > ecto) return 'Endo-Mesomorfo'
      return 'Endomorfo Predominante'
    }
    if (ecto >= meso && ecto >= endo) {
      if (meso > endo) return 'Ecto-Mesomorfo'
      return 'Ectomorfo Predominante (Longilíneo)'
    }
    return 'Somatotipo Central / Balanceado'
  }

  // Datos para gráfico de evolución temporal (invertir para orden cronológico)
  const evolutionData = [...registros].reverse().map(r => ({
    fecha: `${numeroDia(r.fecha)} ${mesCorto(r.fecha)}`,
    peso: Number(r.peso) || 0,
    grasa: Number(r.porcentaje_grasa) || 0,
    musculo: Number(r.masa_muscular_esqueletica) || 0,
    imc: Number(r.imc) || 0,
    sumPliegues: Number(r.sumatoria_pliegues) || 0,
    endo: Number(r.endomorfia) || 0,
    meso: Number(r.mesomorfia) || 0,
    ecto: Number(r.ectomorfia) || 0,
  }))

  // Datos para gráfico de radar de pliegues cutáneos (último registro)
  const plieguesRadarData = ultimoRegistro ? [
    { pliegue: 'Bíceps', valor: Number(ultimoRegistro.pliegue_biceps) || 0, max: 20 },
    { pliegue: 'Tríceps', valor: Number(ultimoRegistro.pliegue_triceps) || 0, max: 25 },
    { pliegue: 'Subescap.', valor: Number(ultimoRegistro.pliegue_subescapular) || 0, max: 25 },
    { pliegue: 'Suprailíaco', valor: Number(ultimoRegistro.pliegue_suprailiaco) || 0, max: 30 },
    { pliegue: 'Supraesp.', valor: Number(ultimoRegistro.pliegue_supraespinal) || 0, max: 25 },
    { pliegue: 'Abdominal', valor: Number(ultimoRegistro.pliegue_abdominal) || 0, max: 35 },
    { pliegue: 'Muslo Ant.', valor: Number(ultimoRegistro.pliegue_muslo_anterior) || 0, max: 30 },
    { pliegue: 'Pierna Med.', valor: Number(ultimoRegistro.pliegue_pierna_medial) || 0, max: 20 },
  ] : []

  // Datos para gráfico de barras de perímetros musculares
  const perimetrosData = ultimoRegistro ? [
    { nombre: 'Brazo Relajado', cm: Number(ultimoRegistro.perimetro_brazo_relajado) || 0 },
    { nombre: 'Brazo Contraído', cm: Number(ultimoRegistro.perimetro_brazo_contraido) || 0 },
    { nombre: 'Muslo Medio', cm: Number(ultimoRegistro.perimetro_muslo_medio) || 0 },
    { nombre: 'Pierna', cm: Number(ultimoRegistro.perimetro_pierna) || 0 },
  ] : []

  // Datos para Somatocarta
  const somatocartaData = registros
    .filter(r => !filterPos || r.posicion_rugby === filterPos)
    .filter(r => !filterCat || r.categoria === filterCat)
    .map(r => ({
      x: Number(r.x_somatocarta),
      y: Number(r.y_somatocarta),
      nombre: fechaTabla(r.fecha),
      posicion: r.posicion_rugby || jugadorActivo?.posicion || 'Deportista',
      somatotipo: `${r.endomorfia} - ${r.mesomorfia} - ${r.ectomorfia}`
    }))

  const groupAverage = (showAvg && somatocartaData.length > 0) ? {
    x: Number((somatocartaData.reduce((a, b) => a + b.x, 0) / somatocartaData.length).toFixed(2)),
    y: Number((somatocartaData.reduce((a, b) => a + b.y, 0) / somatocartaData.length).toFixed(2)),
    nombre: 'Promedio Evaluaciones',
    posicion: 'General',
    somatotipo: 'Cálculo Promedio'
  } : null

  const toggleSection = (s) => setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }))

  const liveCalculation = calculateAnthropometry(form, jugadorActivo?.genero)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => {
      const updated = { ...f, [name]: value }
      const calc = calculateAnthropometry(updated, jugadorActivo?.genero)

      if (calc.imc !== null) updated.imc = calc.imc

      if (autoCalculate) {
        if (calc.porcentaje_grasa !== null && name !== 'porcentaje_grasa') {
          updated.porcentaje_grasa = calc.porcentaje_grasa
        }
        if (calc.masa_muscular_esqueletica !== null && name !== 'masa_muscular_esqueletica') {
          updated.masa_muscular_esqueletica = calc.masa_muscular_esqueletica
        }
        if (calc.masa_mineral_osea !== null && name !== 'masa_mineral_osea') {
          updated.masa_mineral_osea = calc.masa_mineral_osea
        }
      }
      return updated
    })
  }

  const handleRecalculateNow = () => {
    const calc = calculateAnthropometry(form, jugadorActivo?.genero)
    setForm(f => ({
      ...f,
      imc: calc.imc ?? f.imc,
      porcentaje_grasa: calc.porcentaje_grasa ?? f.porcentaje_grasa,
      masa_muscular_esqueletica: calc.masa_muscular_esqueletica ?? f.masa_muscular_esqueletica,
      masa_mineral_osea: calc.masa_mineral_osea ?? f.masa_mineral_osea
    }))
    toast.success('Métricas de composición corporal recalculadas automáticamente')
  }

  const handleSubmit = async () => {
    if (!selectedJugador) return toast.error('Selecciona un jugador')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/antropometria/${editId}`, { ...form, jugador_id: selectedJugador })
        toast.success('Registro actualizado exitosamente')
      } else {
        await api.post('/antropometria', { ...form, jugador_id: selectedJugador })
        toast.success('Evaluación antropométrica guardada con cálculos automáticos')
      }
      setModal(false)
      setEditId(null)
      loadRegistros(selectedJugador)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (reg) => {
    const formattedDate = reg.fecha ? String(reg.fecha).slice(0, 10) : ''
    setForm({
      ...reg,
      fecha: formattedDate,
      peso: reg.peso ?? '',
      estatura: reg.estatura ?? '',
      imc: reg.imc ?? '',
      pliegue_biceps: reg.pliegue_biceps ?? '',
      pliegue_triceps: reg.pliegue_triceps ?? '',
      pliegue_subescapular: reg.pliegue_subescapular ?? '',
      pliegue_suprailiaco: reg.pliegue_suprailiaco ?? '',
      pliegue_supraespinal: reg.pliegue_supraespinal ?? '',
      pliegue_abdominal: reg.pliegue_abdominal ?? '',
      pliegue_muslo_anterior: reg.pliegue_muslo_anterior ?? '',
      pliegue_pierna_medial: reg.pliegue_pierna_medial ?? '',
      perimetro_brazo_relajado: reg.perimetro_brazo_relajado ?? '',
      perimetro_brazo_contraido: reg.perimetro_brazo_contraido ?? '',
      perimetro_muslo_medio: reg.perimetro_muslo_medio ?? '',
      perimetro_pierna: reg.perimetro_pierna ?? '',
      diametro_humero: reg.diametro_humero ?? '',
      diametro_muneca: reg.diametro_muneca ?? '',
      diametro_femur: reg.diametro_femur ?? '',
      porcentaje_grasa: reg.porcentaje_grasa ?? '',
      masa_muscular_esqueletica: reg.masa_muscular_esqueletica ?? '',
      masa_mineral_osea: reg.masa_mineral_osea ?? '',
      posicion_rugby: reg.posicion_rugby ?? '',
      categoria: reg.categoria ?? '',
      grupo: reg.grupo ?? ''
    })
    setEditId(reg.id)
    setModal(true)
  }

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/antropometria/${deleteModal.id}`)
      toast.success('Registro antropométrico eliminado')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      loadRegistros(selectedJugador)
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  const SectionHeader = ({ id, icon: Icon, title, expanded }) => (
    <div
      onClick={() => toggleSection(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: 'var(--surface-hover)',
        borderRadius: 8,
        cursor: 'pointer',
        marginBottom: 8
      }}
    >
      <Icon size={18} color="var(--accent)" />
      <span style={{ flex: 1, fontWeight: 600 }}>{title}</span>
      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
    </div>
  )

  return (
    <div>
      <EncabezadoPagina
        icono="fa-ruler-combined"
        antetitulo={esJugador ? 'Mi cuerpo, mi rendimiento' : 'Composición corporal'}
        titulo={esJugador ? 'Mi antropometría' : 'Antropometría'}
        descripcion={esJugador
          ? 'Tus medidas, tu somatotipo y cómo has evolucionado. Solo tú y tu cuerpo técnico ven esta información.'
          : 'Composición corporal, somatotipo y evolución física individual.'}
      />

      {/* Barra superior de Selección de Jugador y Acciones */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {jugadorActivo?.foto_url ? (
                <img
                  src={formatImageUrl(jugadorActivo.foto_url)}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : <i className="fa-solid fa-user" aria-hidden="true" />}
            </div>
            <div style={{ flex: 1 }}>
              {esJugador ? (
                <div className="identidad-deportista">
                  <span className="encabezado-ante">Mi ficha</span>
                  <b>{jugadorActivo ? etiquetaJugador(jugadorActivo) : 'Tu usuario no está vinculado a una ficha'}</b>
                  {jugadorActivo && <small>{[jugadorActivo.disciplina_nombre, jugadorActivo.posicion, jugadorActivo.equipo_nombre].filter(Boolean).join(' · ')}</small>}
                </div>
              ) : (<>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
                Deportista Seleccionado
              </span>
              <select
                aria-label="Deportista seleccionado"
                value={selectedJugador}
                onChange={e => setSelectedJugador(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '7px 12px',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-hover)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Seleccionar Deportista...</option>
                {jugadoresDisponibles.map(j => (
                  <option key={j.id} value={j.id}>
                    {etiquetaJugador(j)} {j.disciplina_nombre ? `(${j.disciplina_nombre})` : ''} - {j.posicion || 'Sin posición'}
                  </option>
                ))}
              </select>
              {selectedSportId && selectedSportId !== 'todos' && !esJugador && (
                <div style={{ fontSize: 11, color: 'var(--accent2)', marginTop: 4, fontWeight: 600 }}>
                  Filtrando por deporte: {selectedSport?.nombre} ({jugadoresDisponibles.length} deportistas)
                </div>
              )}
              </>)}
            </div>
          </div>

          {/* Selector de Pestañas y Botón Nuevo Registro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
              <button
                type="button"
                className="segmento-boton"
                aria-pressed={activeTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: activeTab === 'dashboard' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <BarChart3 size={14} /> Dashboard Analítico
              </button>
              <button
                type="button"
                className="segmento-boton"
                aria-pressed={activeTab === 'historial'}
                onClick={() => setActiveTab('historial')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: activeTab === 'historial' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'historial' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Calendar size={14} /> Historial ({registros.length})
              </button>
            </div>

            {puedeEditar && selectedJugador && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const imc = (pesoActual && estaturaActual)
                    ? (Number(pesoActual) / Math.pow(Number(estaturaActual), 2)).toFixed(2)
                    : ''
                  setForm({
                    ...EMPTY_ANTRO,
                    jugador_id: selectedJugador,
                    peso: pesoActual || '',
                    estatura: estaturaActual || '',
                    imc: imc,
                    posicion_rugby: jugadorActivo?.posicion || ''
                  })
                  setEditId(null)
                  setModal(true)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} /> Nueva Evaluación
              </button>
            )}
          </div>
        </div>
      </div>

      {cargandoJugadores || loading ? (
        <Esqueleto tipo="tarjetas" filas={3} etiqueta="Cargando el perfil antropométrico…" />
      ) : errorJugadores ? (
        <div className="card"><EstadoError mensaje={errorJugadores} onReintentar={cargarJugadores} /></div>
      ) : jugadores.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-people-group"
            titulo="Aún no hay deportistas registrados"
            descripcion="El perfil antropométrico se lleva por deportista. Registra el plantel en el módulo Deportistas."
            accion={{ texto: 'Ir a Deportistas', icono: 'fa-people-group', a: '/jugadores' }}
          />
        </div>
      ) : jugadoresDisponibles.length === 0 ? (
        <div className="card">
          <EstadoSinResultados
            descripcion={`No hay deportistas de ${selectedSport?.nombre || 'este deporte'}.`}
            onLimpiar={() => setSelectedSportId('todos')}
            textoLimpiar="Ver todos los deportes"
          />
        </div>
      ) : !selectedJugador ? (
        <div className="card">
          <EstadoVacio icono="fa-user" titulo="Selecciona un deportista" descripcion="Elige un deportista en el selector de arriba para ver su perfil antropométrico." />
        </div>
      ) : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={() => loadRegistros(selectedJugador)} /></div>
      ) : registros.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-ruler-combined"
            titulo={`Sin registros antropométricos para ${jugadorActivo?.nombre || 'este deportista'}`}
            descripcion={esJugador ? "Cuando tu cuerpo técnico registre tu primera evaluación, aquí verás tus medidas y tu somatocarta." : "Realiza la primera evaluación física y antropométrica para habilitar el dashboard individual y la somatocarta."}
            accion={puedeEditar ? {
              texto: 'Crear primera evaluación', icono: 'fa-plus',
              onClick: () => {
                setForm({
                  ...EMPTY_ANTRO,
                  jugador_id: selectedJugador,
                  peso: jugadorActivo?.peso || '',
                  estatura: jugadorActivo?.altura || '',
                  posicion_rugby: jugadorActivo?.posicion || ''
                })
                setModal(true)
              },
            } : null}
          />
        </div>
      ) : activeTab === 'dashboard' ? (
        /* DASHBOARD PRINCIPAL MEJORADO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Fila 1: Tarjetas de KPIs y Somatotipo Actual */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* KPI 1: Somatotipo */}
            <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, var(--surface), var(--surface-hover))', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Somatotipo Actual</span>
                <Award size={18} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-light)' }}>
                {ultimoRegistro?.endomorfia ?? '—'} - {ultimoRegistro?.mesomorfia ?? '—'} - {ultimoRegistro?.ectomorfia ?? '—'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--accent2)', marginTop: 4, fontWeight: 600 }}>
                {getSomatotypeClassification(ultimoRegistro)}
              </p>
            </div>

            {/* KPI 2: Grasa Corporal */}
            <div className="card" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>% Grasa Corporal</span>
                <Flame size={18} color="var(--warning)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {grasaActual ? `${grasaActual}%` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Sumatoria Pliegues: <strong style={{ color: 'var(--text-primary)' }}>{sumPlieguesActual ? `${sumPlieguesActual} mm` : '—'}</strong>
              </div>
            </div>

            {/* KPI 3: Masa Muscular */}
            <div className="card" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Masa Muscular</span>
                <Dumbbell size={18} color="var(--accent2)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent2-light)' }}>
                {musculoActual ? `${musculoActual} kg` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {pesoActual && musculoActual ? `${((musculoActual / pesoActual) * 100).toFixed(1)}% del peso total` : 'Estimado masa esquelética'}
              </div>
            </div>

            {/* KPI 4: Peso & IMC */}
            <div className="card" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peso & Estatura</span>
                <Scale size={18} color="var(--text-secondary)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {pesoActual ? `${pesoActual} kg` : '—'}{' '}
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-muted)' }}>/ {estaturaActual ? `${estaturaActual} m` : '—'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                IMC: <strong style={{ color: 'var(--accent-light)' }}>{imcActual ?? '—'}</strong> ({Number(imcActual) < 25 ? 'Normal' : 'Sobrepeso/Masa'})
              </div>
            </div>
          </div>

          {/* Fila 2: Somatocarta Interactiva + Radar de Pliegues Cutáneos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 20 }}>
            {/* Somatocarta */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={20} color="var(--accent)" />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Somatocarta (Heath-Carter)</span>
                </div>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} /> {esJugador ? 'Mi promedio' : 'Promedio de sus evaluaciones'}
                </label>
              </div>
              <Somatocarta data={somatocartaData} average={groupAverage} />
            </div>

            {/* Radar de Pliegues Cutáneos (Perfil ISAK) */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={20} color="var(--accent2)" />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Mapa de Pliegues Cutáneos (mm)</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Evaluación {ultimoRegistro ? fechaTabla(ultimoRegistro.fecha) : ''}
                </span>
              </div>

              {plieguesRadarData.length > 0 ? (
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={plieguesRadarData}>
                      <PolarGrid stroke="#DDDDDD" />
                      <PolarAngleAxis dataKey="pliegue" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis stroke="#CCCCCC" />
                      <Radar {...ANIMACION_GRAFICA} name="Espesor (mm)" dataKey="valor" stroke="var(--accent2)" fill="var(--accent2)" fillOpacity={0.4} />
                      <Tooltip
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}
                        formatter={(value) => [`${value} mm`, 'Espesor']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EstadoVacio compacto icono="fa-ruler" titulo="Sin datos de pliegues" descripcion="Se completan al registrar una medición con esos datos." />
              )}
            </div>
          </div>

          {/* Fila 3: Gráfico de Evolución Temporal de Composición Corporal */}
          <div className="card" style={{ padding: 20 }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={20} color="var(--accent-light)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Evolución Temporal de Composición Corporal</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {evolutionData.length} evaluaciones registradas
              </span>
            </div>

            {evolutionData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMusculo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B93C7" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#0B93C7" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorGrasa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="fecha" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}
                    />
                    <Legend />
                    <Area {...ANIMACION_GRAFICA} type="monotone" dataKey="peso" name="Peso Total (kg)" stroke="var(--accent)" fillOpacity={1} fill="url(#colorPeso)" />
                    <Area {...ANIMACION_GRAFICA} type="monotone" dataKey="musculo" name="Masa Muscular (kg)" stroke="#0B93C7" fillOpacity={1} fill="url(#colorMusculo)" />
                    <Area {...ANIMACION_GRAFICA} type="monotone" dataKey="grasa" name="% Grasa Corporal" stroke="var(--danger)" fillOpacity={1} fill="url(#colorGrasa)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EstadoVacio compacto icono="fa-chart-line" titulo="Sin datos evolutivos" descripcion="La evolución aparece desde la segunda medición." />
            )}
          </div>

          {/* Fila 4: Perímetros Musculares y Comparativa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
            {/* Perímetros */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Ruler size={20} color="var(--accent)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Perímetros Musculares (cm)</span>
              </div>
              {perimetrosData.length > 0 ? (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perimetrosData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis type="number" stroke="var(--text-muted)" />
                      <YAxis type="category" dataKey="nombre" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Bar {...ANIMACION_GRAFICA} dataKey="cm" fill="var(--accent)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EstadoVacio compacto icono="fa-ruler-horizontal" titulo="Sin perímetros cargados" descripcion="Se completan al registrar una medición con esos datos." />
              )}
            </div>

            {/* Ficha Rápida del Atleta */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Layers size={20} color="var(--accent2)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Perfil y Diagnóstico Físico</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Posición / Rol:</span>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 0', color: 'var(--accent-light)' }}>
                    {ultimoRegistro?.posicion_rugby || jugadorActivo?.posicion || 'Deportista General'}
                  </p>
                </div>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Diagnóstico Morfológico:</span>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0', color: 'var(--text-primary)' }}>
                    {getSomatotypeClassification(ultimoRegistro)}
                  </p>
                </div>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sumatoria de 6 / 8 Pliegues:</span>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0', color: 'var(--accent2)' }}>
                    {sumPlieguesActual ? `${sumPlieguesActual} mm (Nivel competitivo)` : 'No calculado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB HISTORIAL DE EVALUACIONES */
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Somatotipo (Endo-Meso-Ecto)</th>
                  <th>Peso (kg)</th>
                  <th>Estatura (m)</th>
                  <th>IMC</th>
                  <th>% Grasa</th>
                  <th>Masa Muscular (kg)</th>
                  <th>Sum. Pliegues (mm)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id}>
                    <td>{fechaTabla(r.fecha)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>
                      {r.endomorfia} - {r.mesomorfia} - {r.ectomorfia}
                    </td>
                    <td>{r.peso ? `${r.peso} kg` : '—'}</td>
                    <td>{r.estatura ? `${r.estatura} m` : '—'}</td>
                    <td>{r.imc ?? '—'}</td>
                    <td>{r.porcentaje_grasa ? `${r.porcentaje_grasa}%` : '—'}</td>
                    <td>{r.masa_muscular_esqueletica ? `${r.masa_muscular_esqueletica} kg` : '—'}</td>
                    <td>{r.sumatoria_pliegues ? `${r.sumatoria_pliegues} mm` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {puedeEditar && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
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
        </div>
      )}

      {/* Modal Crear / Editar Registro Antropométrico */}
      {modal && (
        <Modal
          title={editId ? 'Editar Evaluación Antropométrica' : 'Nueva Evaluación Antropométrica'}
          onClose={() => { setModal(false); setEditId(null) }}
          width="850px"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setEditId(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                <Save size={16} /> {saving ? 'Guardando...' : editId ? 'Actualizar Evaluación' : 'Guardar Evaluación'}
              </button>
            </>
          }
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Fecha de la toma de medidas *</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} />
            </div>

            {/* Tarjeta de Resumen en Tiempo Real de Composición Corporal */}
            <div style={{
              background: 'var(--ok-fondo)',
              border: '1px solid var(--ok-borde)',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    Cálculo Automático en Tiempo Real (ISAK & Somatotipo)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoCalculate}
                      onChange={(e) => setAutoCalculate(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Auto-completar campos
                  </label>
                  <button
                    type="button"
                    onClick={handleRecalculateNow}
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Zap size={12} /> Recalcular
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>% Grasa</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)' }}>
                    {liveCalculation.porcentaje_grasa ? `${liveCalculation.porcentaje_grasa}%` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {liveCalculation.masa_grasa_kg ? `${liveCalculation.masa_grasa_kg} kg` : 'Fórmula ISAK'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Masa Muscular</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent2-light)' }}>
                    {liveCalculation.masa_muscular_esqueletica ? `${liveCalculation.masa_muscular_esqueletica} kg` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {liveCalculation.porcentaje_musculo ? `${liveCalculation.porcentaje_musculo}% peso` : 'Modelo Matiegka'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Masa Ósea</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {liveCalculation.masa_mineral_osea ? `${liveCalculation.masa_mineral_osea} kg` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fórmula Rocha</div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Somatotipo</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-light)' }}>
                    {liveCalculation.somatotipo_str !== '0.0 - 0.0 - 0.0' ? liveCalculation.somatotipo_str : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {liveCalculation.clasificacion_somatotipo}
                  </div>
                </div>
              </div>
            </div>

            {/* A. Medidas Básicas */}
            <SectionHeader id="basicas" icon={Ruler} title="Medidas Básicas" expanded={expandedSections.basicas} />
            {expandedSections.basicas && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Estatura (m)</label><input type="number" step="0.01" name="estatura" value={form.estatura} onChange={handleChange} placeholder="1.80" /></div>
                <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.1" name="peso" value={form.peso} onChange={handleChange} placeholder="78.5" /></div>
                <div className="form-group"><label>IMC Calculado</label><input type="number" name="imc" value={form.imc} readOnly style={{ background: 'var(--surface-hover)' }} /></div>
              </div>
            )}

            {/* B. Pliegues Cutáneos */}
            <SectionHeader id="pliegues" icon={Activity} title="Pliegues Cutáneos (mm) - Protocolo ISAK" expanded={expandedSections.pliegues} />
            {expandedSections.pliegues && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Bíceps</label><input type="number" step="0.1" name="pliegue_biceps" value={form.pliegue_biceps} onChange={handleChange} /></div>
                <div className="form-group"><label>Tríceps</label><input type="number" step="0.1" name="pliegue_triceps" value={form.pliegue_triceps} onChange={handleChange} /></div>
                <div className="form-group"><label>Subescapular</label><input type="number" step="0.1" name="pliegue_subescapular" value={form.pliegue_subescapular} onChange={handleChange} /></div>
                <div className="form-group"><label>Suprailíaco</label><input type="number" step="0.1" name="pliegue_suprailiaco" value={form.pliegue_suprailiaco} onChange={handleChange} /></div>
                <div className="form-group"><label>Supraespinal</label><input type="number" step="0.1" name="pliegue_supraespinal" value={form.pliegue_supraespinal} onChange={handleChange} /></div>
                <div className="form-group"><label>Abdominal</label><input type="number" step="0.1" name="pliegue_abdominal" value={form.pliegue_abdominal} onChange={handleChange} /></div>
                <div className="form-group"><label>Muslo Anterior</label><input type="number" step="0.1" name="pliegue_muslo_anterior" value={form.pliegue_muslo_anterior} onChange={handleChange} /></div>
                <div className="form-group"><label>Pierna Medial</label><input type="number" step="0.1" name="pliegue_pierna_medial" value={form.pliegue_pierna_medial} onChange={handleChange} /></div>
              </div>
            )}

            {/* C. Perímetros */}
            <SectionHeader id="perimetros" icon={Target} title="Perímetros Musculares (cm)" expanded={expandedSections.perimetros} />
            {expandedSections.perimetros && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Brazo Relajado</label><input type="number" step="0.1" name="perimetro_brazo_relajado" value={form.perimetro_brazo_relajado} onChange={handleChange} /></div>
                <div className="form-group"><label>Brazo Contraído</label><input type="number" step="0.1" name="perimetro_brazo_contraido" value={form.perimetro_brazo_contraido} onChange={handleChange} /></div>
                <div className="form-group"><label>Muslo Medio</label><input type="number" step="0.1" name="perimetro_muslo_medio" value={form.perimetro_muslo_medio} onChange={handleChange} /></div>
                <div className="form-group"><label>Pierna</label><input type="number" step="0.1" name="perimetro_pierna" value={form.perimetro_pierna} onChange={handleChange} /></div>
              </div>
            )}

            {/* D. Diámetros */}
            <SectionHeader id="diametros" icon={Info} title="Diámetros Óseos (cm)" expanded={expandedSections.diametros} />
            {expandedSections.diametros && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Húmero</label><input type="number" step="0.1" name="diametro_humero" value={form.diametro_humero} onChange={handleChange} /></div>
                <div className="form-group"><label>Muñeca</label><input type="number" step="0.1" name="diametro_muneca" value={form.diametro_muneca} onChange={handleChange} /></div>
                <div className="form-group"><label>Fémur</label><input type="number" step="0.1" name="diametro_femur" value={form.diametro_femur} onChange={handleChange} /></div>
              </div>
            )}

            {/* E. Composición Corporal (Cálculo Automático & Ajustes Manuales) */}
            <SectionHeader id="composicion" icon={Layers} title="Composición Corporal (Automática / Personalizada)" expanded={expandedSections.composicion} />
            {expandedSections.composicion && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>% Grasa Corporal</span>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Auto / Manual</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="porcentaje_grasa"
                    value={form.porcentaje_grasa}
                    onChange={handleChange}
                    placeholder="Ej. 12.5"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Masa Muscular Esquelética (kg)</span>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Auto / Manual</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="masa_muscular_esqueletica"
                    value={form.masa_muscular_esqueletica}
                    onChange={handleChange}
                    placeholder="Ej. 36.4"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Masa Mineral Ósea (kg)</span>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Auto / Manual</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="masa_mineral_osea"
                    value={form.masa_mineral_osea}
                    onChange={handleChange}
                    placeholder="Ej. 11.2"
                  />
                </div>
              </div>
            )}

            {/* F. Clasificación & Categoría */}
            <SectionHeader id="clasificacion" icon={Info} title="Clasificación y Posición Deportiva" expanded={expandedSections.clasificacion} />
            {expandedSections.clasificacion && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Posición Específica</label>
                  <input
                    type="text"
                    name="posicion_rugby"
                    value={form.posicion_rugby}
                    onChange={handleChange}
                    placeholder="Ej. Enlace, Delantero, Ala, Penetrador..."
                  />
                </div>
                <div className="form-group">
                  <label>Grupo / Línea</label>
                  <input
                    type="text"
                    name="grupo"
                    value={form.grupo}
                    onChange={handleChange}
                    placeholder="Ej. Delanteros, Tres cuartos, Ofensiva..."
                  />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    placeholder="Ej: M19, Primera División, Sub-20..."
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar evaluación */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar registro antropométrico?"
        message="¿Estás seguro de que deseas eliminar esta evaluación física y antropométrica? Esta acción no se puede deshacer."
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
