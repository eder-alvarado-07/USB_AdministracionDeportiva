import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Label, Cell, CartesianGrid
} from 'recharts';
import { ANIMACION_GRAFICA } from '../utils/movimiento'

const Somatocarta = ({ data, average = null }) => {
  // data: array de { x, y, nombre, posicion, somatotipo }
  
  const getPosColor = (pos) => {
    const colors = {
      'Enlace': '#218D45',
      'Transportador': '#0B93C7',
      'Penetrador': '#C9302C',
      'Ala': '#D9890B',
      'Forward': '#6A3F9E',
      'Back': '#00916F'
    };
    return colors[pos] || '#555555';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const isAvg = p.isAverage;
      return (
        <div className="card" style={{ 
          padding: '10px 14px', 
          background: 'var(--surface)', 
          border: `2px solid ${isAvg ? 'var(--warning)' : 'var(--border-hover)'}`,
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-md)'
        }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: isAvg ? 'var(--warning)' : 'var(--text-primary)' }}>
            {isAvg ? 'Promedio del grupo' : p.nombre}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Posición: <span style={{ color: 'var(--text-primary)' }}>{p.posicion}</span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--accent)' }}>
            Somatotipo: <span style={{ fontWeight: 600 }}>{p.somatotipo}</span>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
            Coordenadas: ({p.x}, {p.y})
          </p>
        </div>
      );
    }
    return null;
  };

  // Combinar datos con el promedio si existe
  const chartData = [...data];
  if (average) {
    chartData.push({ ...average, isAverage: true });
  }

  return (
    <div className="somatocarta-wrapper" style={{ width: '100%', height: 450, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border)', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          
          <XAxis 
            type="number" 
            dataKey="x" 
            domain={[-8, 8]} 
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
            tickLine={{ stroke: 'var(--text-muted)' }}
          >
            <Label value="ENDOMORFO (-)" offset={-20} position="insideLeft" fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
            <Label value="ECTOMORFO (+)" offset={-20} position="insideRight" fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
          </XAxis>
          
          <YAxis 
            type="number" 
            dataKey="y" 
            domain={[-8, 8]} 
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
            tickLine={{ stroke: 'var(--text-muted)' }}
          >
            <Label value="MESOMORFO (+)" angle={-90} position="insideTopLeft" offset={20} fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
          </YAxis>
          
          <ZAxis type="number" range={[100, 300]} />
          
          {/* Ejes centrales */}
          <ReferenceLine x={0} stroke="var(--text-muted)" strokeWidth={1.5} opacity={0.5} />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1.5} opacity={0.5} />
          
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          
          <Scatter {...ANIMACION_GRAFICA} data={chartData}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isAverage ? 'var(--warning)' : getPosColor(entry.posicion)}
                stroke={entry.isAverage ? '#fff' : 'none'}
                strokeWidth={entry.isAverage ? 2 : 0}
                r={entry.isAverage ? 8 : 5}
                style={{ filter: entry.isAverage ? 'drop-shadow(0 0 8px var(--warning))' : 'none' }}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Etiquetas de Zonas (Posicionamiento absoluto para mayor claridad) */}
      <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em' }}>MESOMORFÍA</div>
      <div style={{ position: 'absolute', bottom: 15, left: 40, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>ENDOMORFÍA</div>
      <div style={{ position: 'absolute', bottom: 15, right: 40, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>ECTOMORFÍA</div>
    </div>
  );
};

export default Somatocarta;
