import { useState, useEffect, useRef } from 'react'
import CampoClave from '../components/CampoClave'
import { useDeporte, useFiltroDeporte } from '../context/DeporteContext'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import Modal from '../components/Modal'
import EncabezadoPagina from '../components/EncabezadoPagina'
import { Esqueleto, EstadoVacio, EstadoSinResultados, EstadoError } from '../components/EstadoVista'
import { iniciales } from '../config/navegacion'
import { perfilDeporte } from '../config/deportes'
import { edadDesde, hoyISO } from '../utils/fechas'

const ROLES = ['administrador', 'head_coach', 'entrenador', 'personal_salud', 'jugador']
const ROLE_LABELS = {
  administrador: 'Administrador', head_coach: 'Head coach', entrenador: 'Entrenador', personal_salud: 'Personal de salud', jugador: 'Deportista',
}
const ROLE_ICON = {
  administrador: 'fa-user-shield', head_coach: 'fa-binoculars', entrenador: 'fa-clipboard-user', personal_salud: 'fa-user-doctor', jugador: 'fa-person-running',
}
const FICHA_VACIA = { disciplina_id: '', equipo_id: '', posicion: '', fecha_nacimiento: '', genero: '', entrenador_id: '' }
const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'jugador', head_coach_id: '', disciplina_id: '', ficha: FICHA_VACIA }

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [filtroRol, setFiltroRol] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [busqueda, setBusqueda] = useState('')
  const csvRef = useRef()

  const [form, setForm] = useState(FORM_VACIO)
  const { disciplinas } = useDeporte()
  const filtro = useFiltroDeporte()
  const nombreDeporte = (id) => disciplinas.find(d => String(d.id) === String(id))?.nombre
  const [csvResultado, setCsvResultado] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, usuario: null, loading: false })
  const [resetModal, setResetModal] = useState({ isOpen: false, usuario: null, newPassword: '', loading: false })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [{ data }, eq] = await Promise.all([api.get('/usuarios'), api.get('/equipos').catch(() => ({ data: [] }))])
      setUsuarios(data)
      setEquipos(eq.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirCrear = () => {
    setEditando(null)
    setForm({ ...FORM_VACIO, ficha: { ...FICHA_VACIA, disciplina_id: filtro.hay ? String(disciplinas.find(d => filtro.deDisciplina(d.id))?.id || '') : '' } })
    setModalOpen(true)
  }

  const abrirEditar = (u) => {
    setEditando(u)
    setForm({ ...FORM_VACIO, nombre: u.nombre, email: u.email, rol: u.rol, head_coach_id: u.head_coach_id || '', disciplina_id: u.disciplina_id || '' })
    setModalOpen(true)
  }

  const cambiar = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))
  const cambiarFicha = (campo) => (e) => setForm(f => {
    const ficha = { ...f.ficha, [campo]: e.target.value }
    // Al cambiar de deporte se limpian el equipo y la posición, que dependen de él
    if (campo === 'disciplina_id') { ficha.equipo_id = ''; ficha.posicion = ''; ficha.entrenador_id = '' }
    return { ...f, ficha }
  })

  const guardar = async (e) => {
    e.preventDefault()
    const creaDeportista = !editando && form.rol === 'jugador'
    if (creaDeportista && !form.ficha.disciplina_id) return toast.error('Elige el deporte del deportista')
    setGuardando(true)
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, { nombre: form.nombre, email: form.email, rol: form.rol, head_coach_id: form.head_coach_id || null, disciplina_id: form.disciplina_id || null, activo: editando.activo })
        toast.success('Usuario actualizado')
      } else {
        const { ficha, ...resto } = form
        await api.post('/usuarios', creaDeportista ? { ...resto, ficha } : resto)
        toast.success(creaDeportista ? 'Deportista creado y agregado al plantel' : 'Usuario creado')
      }
      setModalOpen(false)
      cargar()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleConfirmReset = async (e) => {
    e?.preventDefault()
    if (!resetModal.newPassword || resetModal.newPassword.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres')
    }
    setResetModal(prev => ({ ...prev, loading: true }))
    try {
      await api.put(`/usuarios/${resetModal.usuario.id}/reset`, { password: resetModal.newPassword })
      toast.success(`Contraseña de ${resetModal.usuario.nombre} restablecida`)
      setResetModal({ isOpen: false, usuario: null, newPassword: '', loading: false })
    } catch (err) {
      toast.error(err.response?.data?.error || err.message)
      setResetModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConfirmDesactivar = async () => {
    if (!deleteModal.usuario) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/usuarios/${deleteModal.usuario.id}`)
      toast.success(`${deleteModal.usuario.nombre} quedó desactivado. Puedes reactivarlo en "Inactivos".`)
      setDeleteModal({ isOpen: false, usuario: null, loading: false })
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || err.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  // v2.0 (DEF-043): un usuario desactivado se puede volver a activar
  const reactivar = async (u) => {
    try {
      await api.patch(`/usuarios/${u.id}/activar`)
      toast.success(`${u.nombre} puede volver a iniciar sesión`)
      setUsuarios(lista => lista.map(x => (x.id === u.id ? { ...x, activo: true } : x)))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const subirCSV = async (e) => {
    e.preventDefault()
    const archivo = csvRef.current?.files[0]
    if (!archivo) return toast.error('Selecciona un archivo CSV')
    const fd = new FormData()
    fd.append('archivo', archivo)
    try {
      const { data } = await api.post('/usuarios/csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCsvResultado(data)
      cargar()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const rolesDisponibles = yo?.rol === 'entrenador' ? ['jugador', 'personal_salud'] : ROLES
  const inactivos = usuarios.filter(u => !u.activo).length

  const usuariosFiltrados = usuarios
    .filter(u => filtroEstado === 'todos' || (filtroEstado === 'activos' ? u.activo : !u.activo))
    .filter(u => filtroRol === 'todos' || u.rol === filtroRol)
    .filter(filtro.deUsuario)
    .filter(u => !busqueda || `${u.nombre} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase()))

  // Ficha del deportista nuevo: equipos, posiciones y entrenadores del deporte elegido
  const perfilFicha = perfilDeporte(nombreDeporte(form.ficha.disciplina_id))
  const equiposFicha = equipos.filter(e => String(e.disciplina_id) === String(form.ficha.disciplina_id))
  const entrenadoresFicha = usuarios.filter(u => u.rol === 'entrenador' && u.activo
    && (!form.ficha.disciplina_id || !u.disciplina_id || String(u.disciplina_id) === String(form.ficha.disciplina_id)))

  return (
    <div>
      <EncabezadoPagina
        icono="fa-user-gear"
        antetitulo="Administración"
        titulo="Usuarios"
        descripcion="Cuentas de acceso por rol. Al crear un deportista se crea también su ficha en el plantel."
        acciones={
          <>
            <button className="btn btn-secondary" onClick={() => setCsvOpen(true)}>
              <i className="fa-solid fa-file-arrow-up" aria-hidden="true"></i> Cargar CSV
            </button>
            <button className="btn btn-primary" onClick={abrirCrear}>
              <i className="fa-solid fa-user-plus" aria-hidden="true"></i> Nuevo usuario
            </button>
          </>
        }
      />

      <div className="barra-herramientas">
        <div className="segmentado" role="group" aria-label="Estado de la cuenta">
          <button type="button" aria-pressed={filtroEstado === 'activos'} onClick={() => setFiltroEstado('activos')}>Activos</button>
          <button type="button" aria-pressed={filtroEstado === 'inactivos'} onClick={() => setFiltroEstado('inactivos')}>
            Inactivos {inactivos > 0 && <span>{inactivos}</span>}
          </button>
          <button type="button" aria-pressed={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')}>Todos</button>
        </div>
        <div className="buscador">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Buscar por nombre o correo" value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar usuario" />
        </div>
      </div>

      <div className="chips-deporte" role="group" aria-label="Filtrar por rol">
        {['todos', ...ROLES].map(r => (
          <button key={r} type="button" className="chip-deporte-filtro" aria-pressed={filtroRol === r} onClick={() => setFiltroRol(r)}>
            {r !== 'todos' && <i className={`fa-solid ${ROLE_ICON[r]}`} aria-hidden="true"></i>}
            {r === 'todos' ? 'Todos los roles' : ROLE_LABELS[r]}
            <span>{usuarios.filter(u => (r === 'todos' || u.rol === r) && (filtroEstado === 'todos' || (filtroEstado === 'activos' ? u.activo : !u.activo))).length}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {cargando ? (
          <Esqueleto tipo="tabla" columnas={6} filas={6} etiqueta="Cargando usuarios…" />
        ) : error ? (
          <EstadoError mensaje={error} onReintentar={cargar} />
        ) : usuarios.length === 0 ? (
          <EstadoVacio icono="fa-user-gear" titulo="Aún no hay usuarios" descripcion="Crea el primer usuario o importa varios desde un archivo CSV." />
        ) : usuariosFiltrados.length === 0 ? (
          <EstadoSinResultados
            descripcion={filtroEstado === 'inactivos' ? 'No hay usuarios desactivados con estos filtros.' : 'Ningún usuario coincide con los filtros.'}
            onLimpiar={() => { setFiltroRol('todos'); setFiltroEstado('todos'); setBusqueda(''); filtro.limpiar() }}
            textoLimpiar="Ver todos"
          />
        ) : (
          <div className="table-wrapper">
            <table className="tabla-movil">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th className="col-sec">Rol</th>
                  <th className="col-sec col-ter">Deporte</th>
                  <th className="col-sec">Estado</th>
                  <th className="col-sec col-ter">Primer ingreso</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => (
                  <tr key={u.id} className={u.activo ? undefined : 'fila-inactiva'}>
                    <td>
                      <div className="celda-persona">
                        <span className={`avatar rol-${u.rol}`} aria-hidden="true">{iniciales(u.nombre)}</span>
                        <span>
                          <b>{u.nombre}</b>
                          <small>{u.email}</small>
                          <span className="sub-movil">{ROLE_LABELS[u.rol]}{u.activo ? '' : ' · Inactivo'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="col-sec"><span className={`pill-rol rol-${u.rol}`}><i className={`fa-solid ${ROLE_ICON[u.rol]}`} aria-hidden="true"></i> {ROLE_LABELS[u.rol]}</span></td>
                    <td className="col-sec col-ter">
                      {(u.disciplinas || []).map(nombreDeporte).filter(Boolean).map(n => (
                        <span key={n} className="chip-deporte"><i className={`fa-solid ${perfilDeporte(n).icono}`} aria-hidden="true"></i> {n}</span>
                      ))}
                      {!(u.disciplinas || []).some(nombreDeporte) && <span className="texto-suave">—</span>}
                    </td>
                    <td className="col-sec">{u.activo
                      ? <span className="badge badge-green"><i className="fa-solid fa-circle" aria-hidden="true" style={{ fontSize: 7 }}></i> Activo</span>
                      : <span className="badge badge-red"><i className="fa-solid fa-ban" aria-hidden="true"></i> Inactivo</span>}</td>
                    <td className="col-sec col-ter">{u.primer_login
                      ? <span className="badge badge-orange"><i className="fa-solid fa-clock" aria-hidden="true" /> Pendiente</span>
                      : <span className="badge badge-green"><i className="fa-solid fa-check" aria-hidden="true" /> Completado</span>}</td>
                    <td>
                      <div className="acciones-fila">
                        {u.activo ? (
                          <>
                            <button className="btn-icon" onClick={() => abrirEditar(u)} title="Editar" aria-label={`Editar a ${u.nombre}`}>
                              <i className="fa-solid fa-pen" aria-hidden="true"></i>
                            </button>
                            <button className="btn-icon" onClick={() => setResetModal({ isOpen: true, usuario: u, newPassword: '', loading: false })} title="Restablecer contraseña" aria-label={`Restablecer la contraseña de ${u.nombre}`}>
                              <i className="fa-solid fa-key" aria-hidden="true"></i>
                            </button>
                            {yo?.rol === 'administrador' && u.id !== yo.id && (
                              <button className="btn-icon btn-danger" onClick={() => setDeleteModal({ isOpen: true, usuario: u, loading: false })} title="Desactivar" aria-label={`Desactivar a ${u.nombre}`}>
                                <i className="fa-solid fa-user-slash" aria-hidden="true"></i>
                              </button>
                            )}
                          </>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => reactivar(u)} aria-label={`Reactivar a ${u.nombre}`}>
                            <i className="fa-solid fa-user-check" aria-hidden="true"></i> Reactivar
                          </button>
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

      {modalOpen && (
        <Modal
          title={editando ? `Editar: ${editando.nombre}` : form.rol === 'jugador' ? 'Nuevo deportista' : 'Nuevo usuario'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" form="form-usuario" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Crear'}
              </button>
            </>
          }
        >
          <form id="form-usuario" onSubmit={guardar} className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="u-rol">Rol</label>
              <div className="selector-rol" role="radiogroup" aria-label="Rol del usuario">
                {rolesDisponibles.map(r => (
                  <button key={r} type="button" role="radio" aria-checked={form.rol === r} className={`rol-${r}`}
                    onClick={() => setForm(f => ({ ...f, rol: r }))} disabled={!!editando && editando.rol === 'jugador' && r !== 'jugador'}>
                    <i className={`fa-solid ${ROLE_ICON[r]}`} aria-hidden="true"></i>{ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="u-nombre">Nombre completo *</label>
              <input id="u-nombre" value={form.nombre} onChange={cambiar('nombre')} required />
            </div>
            <div className="form-group">
              <label htmlFor="u-email">Correo *</label>
              <input id="u-email" type="email" value={form.email} onChange={cambiar('email')} required />
            </div>
            {!editando && (
              <div className="form-group">
                <label htmlFor="u-clave">Contraseña inicial *</label>
                <CampoClave id="u-clave" value={form.password} onChange={cambiar('password')} required minLength={6} autoComplete="new-password" />
                <small className="ayuda-campo">La cambiará en su primer ingreso.</small>
              </div>
            )}
            {['entrenador', 'head_coach'].includes(form.rol) && (
              <div className="form-group">
                <label htmlFor="usuario-deporte">Deporte</label>
                <select id="usuario-deporte" value={form.disciplina_id} onChange={cambiar('disciplina_id')}>
                  <option value="">Según sus deportistas</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
                <small className="ayuda-campo">Solo verá y gestionará este deporte.</small>
              </div>
            )}
            {form.rol === 'entrenador' && (
              <div className="form-group">
                <label htmlFor="u-hc">Head coach asociado</label>
                <select id="u-hc" value={form.head_coach_id} onChange={cambiar('head_coach_id')}>
                  <option value="">Sin asociación</option>
                  {usuarios.filter(u => u.rol === 'head_coach' && (!editando || u.id !== editando.id)).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            )}

            {/* v2.0: ficha deportiva del deportista nuevo (deporte, equipo, posición y fecha de nacimiento) */}
            {!editando && form.rol === 'jugador' && (
              <fieldset className="ficha-nueva" style={{ gridColumn: '1 / -1' }}>
                <legend><i className={`fa-solid ${perfilFicha.icono}`} aria-hidden="true"></i> Ficha deportiva</legend>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="f-deporte">Deporte *</label>
                    <select id="f-deporte" value={form.ficha.disciplina_id} onChange={cambiarFicha('disciplina_id')} required>
                      <option value="">Elige el deporte…</option>
                      {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="f-equipo">Equipo / categoría</label>
                    <select id="f-equipo" value={form.ficha.equipo_id} onChange={cambiarFicha('equipo_id')} disabled={!form.ficha.disciplina_id}>
                      <option value="">{equiposFicha.length ? 'Sin equipo por ahora' : 'Este deporte aún no tiene equipos'}</option>
                      {equiposFicha.map(e => <option key={e.id} value={e.id}>{e.nombre}{(e.categoria_nombre || e.categoria) ? ` · ${e.categoria_nombre || e.categoria}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="f-pos">{perfilFicha.formato === 'tiempo' ? 'Prueba o especialidad' : 'Posición'}</label>
                    <select id="f-pos" value={form.ficha.posicion} onChange={cambiarFicha('posicion')} disabled={!form.ficha.disciplina_id}>
                      <option value="">Sin definir</option>
                      {perfilFicha.posiciones.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="f-nac">Fecha de nacimiento</label>
                    <input id="f-nac" type="date" max={hoyISO()} value={form.ficha.fecha_nacimiento} onChange={cambiarFicha('fecha_nacimiento')} />
                    <small className="ayuda-campo">{form.ficha.fecha_nacimiento ? `${edadDesde(form.ficha.fecha_nacimiento)} años · la edad se actualiza sola` : 'La edad se calcula y se actualiza sola.'}</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="f-genero">Género</label>
                    <select id="f-genero" value={form.ficha.genero} onChange={cambiarFicha('genero')}>
                      <option value="">Sin especificar</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="f-ent">Entrenador</label>
                    <select id="f-ent" value={form.ficha.entrenador_id} onChange={cambiarFicha('entrenador_id')}>
                      <option value="">Sin asignar</option>
                      {entrenadoresFicha.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </fieldset>
            )}
          </form>
        </Modal>
      )}

      {csvOpen && (
        <Modal title="Carga masiva de usuarios (CSV)" onClose={() => { setCsvOpen(false); setCsvResultado(null) }}>
          <p className="texto-suave" style={{ marginBottom: 12 }}>
            El CSV debe tener las columnas <code>nombre, email, password, rol</code>. Roles válidos: {rolesDisponibles.join(', ')}.
          </p>
          {!csvResultado ? (
            <form onSubmit={subirCSV}>
              <div className="form-group">
                <label htmlFor="csv-archivo">Archivo CSV</label>
                <input id="csv-archivo" type="file" accept=".csv" ref={csvRef} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCsvOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-upload" aria-hidden="true"></i> Procesar</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <p className="alerta alerta-ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> <span>Usuarios creados: <strong>{csvResultado.creados}</strong></span></p>
              {csvResultado.errores.length > 0 && (
                <div className="alerta alerta-error"><i className="fa-solid fa-circle-xmark" aria-hidden="true" />
                  <ul style={{ paddingLeft: 16 }}>{csvResultado.errores.map((e, i) => <li key={i}>Fila {e.fila}: {e.error}</li>)}</ul>
                </div>
              )}
              <button className="btn btn-primary" onClick={() => { setCsvOpen(false); setCsvResultado(null) }}>Cerrar</button>
            </div>
          )}
        </Modal>
      )}

      {resetModal.isOpen && (
        <Modal
          title={`Restablecer contraseña: ${resetModal.usuario?.nombre}`}
          onClose={() => setResetModal({ isOpen: false, usuario: null, newPassword: '', loading: false })}
          footer={
            <>
              <button type="button" className="btn btn-secondary" disabled={resetModal.loading}
                onClick={() => setResetModal({ isOpen: false, usuario: null, newPassword: '', loading: false })}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmReset} disabled={resetModal.loading || !resetModal.newPassword}>
                {resetModal.loading ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label htmlFor="reset-clave">Nueva contraseña *</label>
            <CampoClave id="reset-clave" value={resetModal.newPassword} onChange={e => setResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Mínimo 6 caracteres" autoComplete="new-password" autoFocus />
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Desactivar usuario?"
        message={`"${deleteModal.usuario?.nombre}" no podrá iniciar sesión. Podrás reactivarlo cuando quieras desde la pestaña Inactivos.`}
        confirmText="Sí, desactivar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDesactivar}
        onCancel={() => setDeleteModal({ isOpen: false, usuario: null, loading: false })}
      />
    </div>
  )
}
