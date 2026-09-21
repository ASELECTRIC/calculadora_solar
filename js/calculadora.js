export function calcularPotenciaBomba(datos, settings) {
  const valor = Number(datos.valor);
  if (datos.unidad === "cv") return valor * settings.cvToKw;
  if (datos.unidad === "kw") return valor;
  const factorFases = datos.fases === "3" ? Math.sqrt(3) : 1;
  return factorFases * Number(datos.tension) * valor * Number(datos.factorPotencia) * Number(datos.rendimiento) / 100 / 1000;
}

export function seleccionarVariadorAutomatico(inverters, potenciaKw, amperios = 0) {
  const modelos = inverters
    .filter(item => item.motorKw && item.series !== "Manual")
    .sort((a, b) => a.motorKw - b.motorKw);
  return modelos.find(item => item.motorKw >= potenciaKw && (!amperios || item.outputCurrent >= amperios)) || modelos.at(-1);
}

export function obtenerUmbrales(inverter, settings) {
  return {
    under: inverter.underVoltageProtection ?? settings.si23UnderVoltageProtection,
    wake: inverter.wakeVoltage ?? settings.si23WakeVoltage,
    low: inverter.lowBusPoint ?? settings.si23LowBusPoint
  };
}

export function calcularSupuestos({ potenciaBombaKw, rendimientoMotor, perfil, mes, settings }) {
  const motor = Number(rendimientoMotor || settings.defaultMotorEfficiency) / 100;
  const inverter = settings.defaultInverterEfficiency / 100;
  return {
    motor,
    inverter,
    needed: potenciaBombaKw / (motor * inverter),
    profile: perfil,
    month: perfil.months.find(item => item.month === Number(mes))
  };
}

export function calcularConfiguraciones({ inverter, panel, minTemperature, assumptions, settings }) {
  const voc = panel.voc * (1 + Math.abs(panel.tempVoc) / 100 * (25 - minTemperature));
  const vmpHot = panel.vmp * (1 + (panel.tempVmp ?? -0.35) / 100 * (settings.defaultHotCellTemperature - 25));
  const thresholds = obtenerUmbrales(inverter, settings);
  const minSeries = Math.ceil(thresholds.wake / vmpHot);
  const maxSeries = Math.floor(inverter.maxDcVoltage / voc);
  const target = Math.round(settings.si23CentralTargetVmp / panel.vmp);
  const series = Math.max(1, Math.min(Math.max(target, minSeries), maxSeries));
  const oneStringKwp = series * panel.wp / 1000;
  const centralPerString = oneStringKwp * assumptions.month.values["15:00"] / 1000;
  const morningPerString = oneStringKwp * assumptions.month.values["08:30"] / 1000;
  const centralStrings = Math.max(1, Math.ceil(assumptions.needed / centralPerString));
  const extendedStrings = Math.max(centralStrings, Math.ceil(assumptions.needed / morningPerString));
  const base = {
    series,
    requiredDcKw: assumptions.needed,
    vocArrayCold: series * voc,
    vmpArray: series * panel.vmp,
    vmpArrayHot: series * vmpHot,
    minS: minSeries,
    maxS: maxSeries,
    safeDc: inverter.maxDcVoltage * settings.designVoltageMargin,
    thresholds
  };
  const make = (kind, strings) => ({
    ...base,
    kind,
    strings,
    total: series * strings,
    arrayKw: series * strings * panel.wp / 1000,
    impArray: strings * panel.imp,
    iscArray: strings * panel.isc,
    validVoltage: maxSeries >= minSeries && series * voc < inverter.maxDcVoltage && series * vmpHot >= thresholds.wake,
    currentOk: !inverter.maxDcCurrent || strings * panel.isc <= inverter.maxDcCurrent
  });
  return { central: make("central", centralStrings), extended: make("extended", extendedStrings) };
}
