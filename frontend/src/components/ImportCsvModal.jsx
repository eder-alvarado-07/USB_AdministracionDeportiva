import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, X } from 'lucide-react'
import Modal from './Modal'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function ImportCsvModal({ isOpen, onClose, onSuccess, disciplinas = [], equipos = [] }) {
  const [file, setFile] = useState(null)
  const [previewData, setPreviewData] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [defaultDeporte, setDefaultDeporte] = useState('')
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const parseCSV = (text) => {
    // Split by new line, handling CRLF and LF
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0)
    if (lines.length < 2) {
      toast.error('El archivo CSV debe tener al menos una fila de encabezados y un registro')
      return
    }

    // Detect separator (; or , or \t)
    const firstLine = lines[0]
    let sep = ','
    if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';'
    else if (firstLine.includes('\t')) sep = '\t'

    const parseLine = (line) => {
      // Basic regex or split that respects quotes
      const result = []
      let curr = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes
        } else if (char === sep && !inQuotes) {
          result.push(curr.trim())
          curr = ''
        } else {
          curr += char
        }
      }
      result.push(curr.trim())
      return result
    }

    const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''))
    setHeaders(parseLine(lines[0]))

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      if (values.length === 0 || values.every(v => v === '')) continue

      const item = {}
      rawHeaders.forEach((h, idx) => {
        const val = values[idx] || ''
        if (h.includes('dorsal') || h.includes('camiseta') || h === 'numero' || h === 'número' || h === '#') {
          item.dorsal = val
        } else if (h.includes('nombre') || h.includes('jugador') || h.includes('atleta') || h.includes('deportista')) {
          item.nombre = val
        } else if (h.includes('edad') || h.includes('anos') || h.includes('años')) {
          item.edad = val
        } else if (h.includes('posicion') || h.includes('puesto')) {
          item.posicion = val
        } else if (h.includes('peso')) {
          item.peso = val
        } else if (h.includes('altura') || h.includes('estatura') || h.includes('talla')) {
          item.altura = val
        } else if (h.includes('deporte') || h.includes('disciplina')) {
          item.deporte = val
        } else if (h.includes('equipo') || h.includes('club')) {
          item.equipo = val
        }
      })

      if (item.nombre) {
        rows.push(item)
      }
    }

    setParsedRows(rows)
    setPreviewData(rows.slice(0, 10))
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv' && f.type !== 'application/vnd.ms-excel') {
      toast.error('Por favor selecciona un archivo con extensión .csv')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (event) => {
      parseCSV(event.target.result)
    }
    reader.readAsText(f, 'UTF-8')
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0]
      setFile(f)
      const reader = new FileReader()
      reader.onload = (event) => {
        parseCSV(event.target.result)
      }
      reader.readAsText(f, 'UTF-8')
    }
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('No hay registros válidos para importar')
      return
    }

    setLoading(true)
    try {
      const deportistas = parsedRows.map(r => ({
        ...r,
        deporte: r.deporte || defaultDeporte || undefined
      }))

      const res = await api.post('/jugadores/bulk', { deportistas })
      toast.success(res.data.message || `Importados ${res.data.total} deportistas`)
      const avisos = res.data.avisos || []
      if (avisos.length) {
        toast(`${avisos.length} ${avisos.length === 1 ? 'deportista se importó' : 'deportistas se importaron'} sin dorsal:\n` +
          avisos.slice(0, 4).map(a => `Fila ${a.fila}: ${a.aviso}`).join('\n') + (avisos.length > 4 ? '\n…' : ''),
          { icon: <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)' }} aria-hidden="true" />, duration: 9000, style: { whiteSpace: 'pre-line', maxWidth: 520 } })
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'dorsal,nombre,edad,posicion,peso,altura,deporte,equipo\n' +
      '9,Juan Pérez,22,Penetrador,78.5,1.80,Rugby,Los Cóndores\n' +
      '10,Carlos Gómez,25,Enlace,74.0,1.75,Rugby,Los Cóndores\n' +
      '7,Mateo Silva,20,Delantero,68.0,1.78,Fútbol,\n' +
      ',Lucas Rossi,24,Ala,82.0,1.84,Baloncesto,\n'
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_deportistas.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Modal
      title="Importar deportistas desde CSV"
      onClose={onClose}
      width="850px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button className="btn btn-ghost" type="button" onClick={downloadTemplate} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Descargar plantilla CSV de ejemplo
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || parsedRows.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Upload size={16} />
              {loading ? 'Importando...' : `Importar ${parsedRows.length} Deportistas`}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Drag & drop box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '30px 20px',
            textAlign: 'center',
            background: dragActive ? 'var(--surface-hover)' : 'var(--bg-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <FileSpreadsheet size={40} color={file ? 'var(--accent2)' : 'var(--accent)'} style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>
            {file ? file.name : 'Arrastra tu archivo CSV aquí o haz clic para seleccionarlo'}
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Columnas recomendadas: <strong>dorsal, nombre, edad, posicion, peso, altura, deporte, equipo</strong>. El dorsal es opcional (0 a 99).
          </p>
        </div>

        {/* Deporte por defecto si el CSV no lo incluye */}
        {disciplinas.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Deporte por defecto (para filas sin columna deporte):</span>
            <select
              value={defaultDeporte}
              onChange={e => setDefaultDeporte(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 13, maxWidth: 220 }}
            >
              <option value="">Seleccionar deporte opcional...</option>
              {disciplinas.map(d => (
                <option key={d.id} value={d.nombre}>{d.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Preview table */}
        {parsedRows.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> {parsedRows.length} deportistas detectados en el archivo
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Mostrando vista previa (primeras {Math.min(parsedRows.length, 10)} filas)
              </span>
            </div>

            <div className="table-wrapper" style={{ maxHeight: 250, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dorsal</th>
                    <th>Nombre</th>
                    <th>Edad</th>
                    <th>Posición</th>
                    <th>Peso (kg)</th>
                    <th>Altura (m)</th>
                    <th>Deporte</th>
                    <th>Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>{row.dorsal ? <span className="dorsal-chip">{row.dorsal}</span> : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                      <td>{row.edad || '—'}</td>
                      <td>{row.posicion ? <span className="badge badge-purple">{row.posicion}</span> : '—'}</td>
                      <td>{row.peso || '—'}</td>
                      <td>{row.altura || '—'}</td>
                      <td>
                        {row.deporte ? (
                          <span className="badge badge-green">{row.deporte}</span>
                        ) : defaultDeporte ? (
                          <span className="badge badge-green">{defaultDeporte} (def.)</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {row.equipo ? <span className="badge badge-blue">{row.equipo}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
