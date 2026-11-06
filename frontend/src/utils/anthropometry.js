/**
 * Utilidades científicas para cálculos antropométricos y de composición corporal
 * Protocolo ISAK (International Society for the Advancement of Kinanthropometry)
 * Somatotipo Heath-Carter & Modelo de 4 Componentes (Matiegka / Yuhasz / Faulkner / Rocha)
 */

export function calculateAnthropometry(data = {}, genero = 'masculino') {
  const peso = Number(data.peso) || 0
  const estatura = Number(data.estatura) || 0 // en metros (ej. 1.80)
  const estaturaCm = estatura > 3 ? estatura : estatura * 100 // asegurar cm

  // Pliegues cutáneos (en mm)
  const pb = Number(data.pliegue_biceps) || 0
  const pt = Number(data.pliegue_triceps) || 0
  const pse = Number(data.pliegue_subescapular) || 0
  const psi = Number(data.pliegue_suprailiaco) || 0
  const psp = Number(data.pliegue_supraespinal) || 0
  const pab = Number(data.pliegue_abdominal) || 0
  const pma = Number(data.pliegue_muslo_anterior) || 0
  const ppm = Number(data.pliegue_pierna_medial) || 0

  // Perímetros musculares (en cm)
  const pbr = Number(data.perimetro_brazo_relajado) || 0
  const pbc = Number(data.perimetro_brazo_contraido) || 0
  const pmm = Number(data.perimetro_muslo_medio) || 0
  const pp = Number(data.perimetro_pierna) || 0

  // Diámetros óseos (en cm)
  const dh = Number(data.diametro_humero) || 0
  const dm = Number(data.diametro_muneca) || 0
  const df = Number(data.diametro_femur) || 0

  // 1. IMC (Índice de Masa Corporal)
  let imc = null
  if (peso > 0 && estatura > 0) {
    const estM = estatura > 3 ? estatura / 100 : estatura
    imc = Number((peso / Math.pow(estM, 2)).toFixed(2))
  }

  // 2. Sumatorias de Pliegues
  const sum3 = pt + pse + psp
  const sum6 = pt + pse + psp + pab + pma + ppm
  const sumAll = pb + pt + pse + psi + psp + pab + pma + ppm

  // 3. Cálculo de % de Grasa Corporal (% Fat)
  let porcentaje_grasa = null
  const isFemale = genero === 'femenino' || genero === 'f' || genero === 'F'

  if (sum6 > 0 && pt > 0 && pse > 0 && pab > 0) {
    // Fórmula de Yuhasz modificada por Carter para atletas (6 pliegues)
    if (isFemale) {
      porcentaje_grasa = (0.1548 * sum6) + 3.580
    } else {
      porcentaje_grasa = (0.1051 * sum6) + 2.585
    }
  } else if ((pt + pse + (psp || psi) + pab) > 0 && pt > 0 && pab > 0) {
    // Fórmula de Faulkner (4 pliegues: Tríceps, Subescapular, Supraespinal/Suprailíaco, Abdominal)
    const sum4 = pt + pse + (psp || psi) + pab
    porcentaje_grasa = 5.783 + (0.153 * sum4)
  } else if (sum3 > 0 && pt > 0 && pse > 0) {
    // Estimación 3 pliegues ISAK
    porcentaje_grasa = (0.153 * sum3) + 5.5
  } else if (pb + pt + pse + psi > 0 && pt > 0) {
    // Durnin & Womersley (4 pliegues)
    const sumDW = pb + pt + pse + psi
    const logSum = Math.log10(sumDW)
    const densidad = isFemale ? (1.1599 - (0.0717 * logSum)) : (1.1620 - (0.0630 * logSum))
    if (densidad > 0) {
      porcentaje_grasa = ((4.95 / densidad) - 4.5) * 100
    }
  }

  if (porcentaje_grasa !== null) {
    porcentaje_grasa = Math.max(3.0, Math.min(55.0, porcentaje_grasa))
    porcentaje_grasa = Number(porcentaje_grasa.toFixed(1))
  }

  // 4. Fraccionamiento de Masa Corporal (Modelo de 4 Componentes de Matiegka)
  let masa_grasa_kg = null
  let masa_mineral_osea = null
  let masa_residual_kg = null
  let masa_muscular_esqueletica = null
  let porcentaje_musculo = null

  if (peso > 0) {
    // Masa Grasa en kg
    if (porcentaje_grasa !== null) {
      masa_grasa_kg = Number(((peso * porcentaje_grasa) / 100).toFixed(2))
    }

    // Masa Ósea en kg (Ecuación de Rocha / Matiegka)
    if (estaturaCm > 0 && dh > 0 && df > 0) {
      const estM = estaturaCm / 100
      const dH_m = dh / 100
      const dF_m = df / 100
      // Rocha: 3.02 * (Estatura^2 * DiamHum * DiamFem * 400)^0.712
      const masaOseaCalc = 3.02 * Math.pow(Math.pow(estM, 2) * dH_m * dF_m * 400, 0.712)
      masa_mineral_osea = Number(masaOseaCalc.toFixed(2))
    } else {
      // Estimación ósea deportiva estándar (aprox. 14.5% del peso)
      masa_mineral_osea = Number((peso * 0.145).toFixed(2))
    }

    // Masa Residual en kg (Wuest / Würch: vísceras, sangre, órganos)
    const factorResidual = isFemale ? 0.209 : 0.240
    masa_residual_kg = Number((peso * factorResidual).toFixed(2))

    // Masa Muscular Esquelética en kg (Por diferencia en modelo 4C)
    if (masa_grasa_kg !== null && masa_mineral_osea !== null && masa_residual_kg !== null) {
      const calcMasaMusc = peso - (masa_grasa_kg + masa_mineral_osea + masa_residual_kg)
      masa_muscular_esqueletica = Number(Math.max(10, calcMasaMusc).toFixed(2))
      porcentaje_musculo = Number(((masa_muscular_esqueletica / peso) * 100).toFixed(1))
    }
  }

  // 5. Somatotipo Heath-Carter
  let endomorfia = 0
  let mesomorfia = 0
  let ectomorfia = 0
  let x_somatocarta = 0
  let y_somatocarta = 0

  if (peso > 0 && estaturaCm > 0) {
    // Endomorfia (Adiposidad)
    if (sum3 > 0) {
      const sum3Corrected = sum3 * (170.18 / estaturaCm)
      const endoCalc = -0.7182 + (0.1451 * sum3Corrected) - (0.00068 * Math.pow(sum3Corrected, 2)) + (0.0000014 * Math.pow(sum3Corrected, 3))
      endomorfia = Math.max(0.1, Number(endoCalc.toFixed(2)))
    }

    // Mesomorfia (Desarrollo osteo-muscular)
    const brazoContraido = pbc > 0 ? pbc : pbr
    const brazoCorr = brazoContraido > 0 ? brazoContraido - (pt / 10) : 0
    const piernaCorr = pp > 0 ? pp - (ppm / 10) : 0
    const dHum = dh > 0 ? dh : 6.8
    const dFem = df > 0 ? df : 9.5

    const mesoCalc = (0.858 * dHum) + (0.601 * dFem) + (0.188 * brazoCorr) + (0.161 * piernaCorr) - (0.131 * estaturaCm) + 4.5
    mesomorfia = Math.max(0.1, Number(mesoCalc.toFixed(2)))

    // Ectomorfia (Linealidad / Longitud relativa)
    const HWR = estaturaCm / Math.pow(peso, 1 / 3)
    let ectoCalc = 0.1
    if (HWR >= 40.75) {
      ectoCalc = (0.732 * HWR) - 28.58
    } else if (HWR > 38.25) {
      ectoCalc = (0.463 * HWR) - 17.63
    }
    ectomorfia = Math.max(0.1, Number(ectoCalc.toFixed(2)))

    // Coordenadas Somatocarta
    x_somatocarta = Number((ectomorfia - endomorfia).toFixed(2))
    y_somatocarta = Number(((2 * mesomorfia) - (endomorfia + ectomorfia)).toFixed(2))
  }

  return {
    imc,
    porcentaje_grasa,
    masa_grasa_kg,
    masa_mineral_osea,
    masa_residual_kg,
    masa_muscular_esqueletica,
    porcentaje_musculo,
    endomorfia,
    mesomorfia,
    ectomorfia,
    x_somatocarta,
    y_somatocarta,
    sumatoria_pliegues: Number(sumAll.toFixed(1))
  }
}
