"use strict";

import { cargarDatos } from "./perfiles.js";
import {
  calcularPotenciaBomba,
  seleccionarVariadorAutomatico,
  obtenerUmbrales,
  calcularSupuestos,
  calcularConfiguraciones
} from "./calculadora.js";
import { fmt, crearHtmlOpcion, crearHtmlComparacion } from "./solar.js";

let db;
const $ = id => document.getElementById(id);

function datosBomba() {
  return {
    unidad: $("pumpUnit").value,
    valor: $("pumpValue").value,
    tension: $("motorVoltage").value,
    fases: $("motorPhases").value,
    factorPotencia: $("powerFactor").value,
    rendimiento: $("efficiency").value
  };
}

function potenciaBombaKw() {
  return db ? calcularPotenciaBomba(datosBomba(), db.settings) : 0;
}

function variadorSeleccionado() {
  return db.inverters.find(item => item.id === $("inverterSelect").value);
}

function panelSeleccionado() {
  return db.panels.find(item => item.id === $("panelSelect").value);
}

function variadorAutomatico() {
  const amperios = $("pumpUnit").value === "amp" ? Number($("pumpValue").value) : 0;
  return seleccionarVariadorAutomatico(db.inverters, potenciaBombaKw(), amperios);
}

function obtenerVariador() {
  const item = variadorSeleccionado();
  if (item.id === "auto") return variadorAutomatico();
  if (item.id !== "other") return item;
  return {
    ...item,
    motorKw: Number($("invMotorKw").value),
    maxDcVoltage: Number($("invMaxDc").value),
    maxDcCurrent: Number($("invMaxCurrent").value) || null,
    mpptMin: Number($("invMpptMin").value),
    mpptMax: Number($("invMpptMax").value),
    recommendedPvKw: Number($("invPvKw").value) || null,
    underVoltageProtection: Number($("invUnderVoltage").value),
    wakeVoltage: Number($("invWakeVoltage").value),
    lowBusPoint: Number($("invLowBus").value)
  };
}

function obtenerPanel() {
  const item = panelSeleccionado();
  if (item.id !== "other") return item;
  return {
    ...item,
    wp: Number($("panelWp").value),
    voc: Number($("panelVoc").value),
    vmp: Number($("panelVmp").value),
    isc: Number($("panelIsc").value),
    imp: Number($("panelImp").value),
    tempVoc: Number($("panelTempVoc").value)
  };
}

function obtenerSupuestos() {
  return calcularSupuestos({
    potenciaBombaKw: potenciaBombaKw(),
    rendimientoMotor: $("efficiency").value,
    perfil: db.solarProfiles[$("solarProfile").value],
    mes: $("profileMonth").value,
    settings: db.settings
  });
}

function rellenarSelectores() {
  $("inverterSelect").innerHTML = db.inverters.map(item => `<option value="${item.id}">${item.brand} · ${item.model}</option>`).join("");
  $("panelSelect").innerHTML = db.panels.map(item => `<option value="${item.id}">${item.brand} · ${item.model} · ${item.wp} W</option>`).join("");
  $("solarProfile").innerHTML = Object.entries(db.solarProfiles).map(([id, profile]) => `<option value="${id}">${profile.name}</option>`).join("");
}

function actualizarCamposBomba() {
  const unidad = $("pumpUnit").value;
  $("pumpValueLabel").textContent = unidad === "cv" ? "Potencia de la bomba (CV)" : unidad === "kw" ? "Potencia de la bomba (kW)" : "Corriente nominal (A)";
  $("ampFields").classList.toggle("hidden", unidad !== "amp");
  actualizarVistaVariador();
}

function actualizarVistaVariador() {
  const item = variadorSeleccionado();
  if (!item) return;
  $("customInverterFields").classList.toggle("hidden", item.id !== "other");
  if (item.id === "auto") {
    const recommended = variadorAutomatico();
    $("inverterSelect").options[0].textContent = recommended ? `Automático → ${recommended.model}` : "Automático → fuera de catálogo";
    $("inverterSpecs").innerHTML = recommended ? `<span>Recomendado: <strong>${recommended.model}</strong></span><span>${recommended.outputCurrent} A salida</span><span>FV manual: ${recommended.recommendedPvKw} kW</span>` : "<span>No existe un SI23 suficiente</span>";
  } else {
    $("inverterSpecs").innerHTML = `<span>${item.series}</span><span>${item.motorKw ?? "—"} kW motor</span><span>MPPT ${item.mpptMin}–${item.mpptMax} V</span><span>Máx. ${item.maxDcVoltage} VDC</span>`;
  }
}

function actualizarVistaPanel() {
  const panel = panelSeleccionado();
  $("customPanelFields").classList.toggle("hidden", panel.id !== "other");
  [["panelWp", "wp"], ["panelVoc", "voc"], ["panelVmp", "vmp"], ["panelIsc", "isc"], ["panelImp", "imp"], ["panelTempVoc", "tempVoc"]].forEach(([field, key]) => $(field).value = panel[key]);
  $("panelSpecs").innerHTML = `<span>${panel.wp} Wp</span><span>Voc ${panel.voc} V</span><span>Vmp ${panel.vmp} V</span><span>Isc ${panel.isc} A</span><span>Imp ${panel.imp} A</span>`;
}

function vincularEventos() {
  $("pumpUnit").addEventListener("change", actualizarCamposBomba);
  ["pumpValue", "motorVoltage", "motorPhases", "powerFactor", "efficiency"].forEach(id => $(id).addEventListener("input", actualizarVistaVariador));
  $("inverterSelect").addEventListener("change", actualizarVistaVariador);
  $("panelSelect").addEventListener("change", actualizarVistaPanel);
  $("calculatorForm").addEventListener("submit", calcular);
}

function calcular(event) {
  event.preventDefault();
  const pump = potenciaBombaKw();
  const inverter = obtenerVariador();
  const panel = obtenerPanel();
  if (!pump || !panel.wp || !panel.voc || !panel.vmp || !inverter) return;
  const assumptions = obtenerSupuestos();
  const { central, extended } = calcularConfiguraciones({
    inverter,
    panel,
    minTemperature: Number($("minTemp").value),
    assumptions,
    settings: db.settings
  });
  const alerts = [];
  if (inverter.motorKw && pump > inverter.motorKw) alerts.push(["danger", `La bomba (${fmt(pump)} kW) supera el variador (${fmt(inverter.motorKw)} kW).`]);
  if (inverter.recommendedPvKw && central.arrayKw < inverter.recommendedPvKw) alerts.push(["warning", `La configuración central queda por debajo de los ${fmt(inverter.recommendedPvKw, 1)} kW FV recomendados en la tabla SI23.`]);
  if (!central.validVoltage) alerts.push(["danger", "La longitud del string no cumple la tensión mínima y el límite máximo. Cambia de placa o revisa temperaturas."]);
  if (central.vocArrayCold > central.safeDc) alerts.push(["warning", `Voc con frío por encima del margen preventivo de ${fmt(central.safeDc, 0)} V, aunque inferior al límite de ${fmt(inverter.maxDcVoltage, 0)} V.`]);
  if (!inverter.maxDcCurrent) alerts.push(["warning", `Confirma que el SI23 admite al menos ${fmt(extended.iscArray, 1)} A de Isc con ${extended.strings} strings.`]);
  if (!extended.currentOk) alerts.push(["danger", `${extended.strings} strings superan los ${fmt(inverter.maxDcCurrent, 1)} A DC configurados.`]);

  $("pumpKwResult").textContent = `${fmt(pump, 2)} kW`;
  $("selectionSummary").innerHTML = `<div><small>Variador ${variadorSeleccionado().id === "auto" ? "seleccionado automáticamente" : "seleccionado"}</small><strong>${inverter.model}</strong></div><span>${inverter.motorKw ? `${fmt(inverter.motorKw, 2)} kW` : "Potencia manual"}${inverter.outputCurrent ? ` · ${fmt(inverter.outputCurrent, 1)} A` : ""}</span>`;
  $("globalAlerts").innerHTML = alerts.map(([type, message]) => `<div class="alert ${type}">${message}</div>`).join("");
  $("centralResult").innerHTML = crearHtmlOpcion(central, `${central.strings} string${central.strings === 1 ? "" : "s"} · Horas centrales`, "CONFIGURACIÓN BASE");
  $("extendedResult").innerHTML = crearHtmlOpcion(extended, `${extended.strings} string${extended.strings === 1 ? "" : "s"} · Horario ampliado`, "CONFIGURACIÓN AMPLIADA");
  $("requiredDcPower").textContent = `Bomba: ${fmt(extended.requiredDcKw, 2)} kW DC necesarios`;
  $("solarComparison").innerHTML = crearHtmlComparacion(central, extended, panel, assumptions, $("profileMonth").selectedOptions[0].text);
  const thresholds = obtenerUmbrales(inverter, db.settings);
  $("methodology").innerHTML = `<p><strong>Variador:</strong> ${inverter.brand} ${inverter.model}. Subtensión ${thresholds.under} V, rearranque ${thresholds.wake} V, referencia bus bajo ${thresholds.low} V y límite ${inverter.maxDcVoltage} VDC.</p><p><strong>Strings:</strong> las placas en serie se calculan por tensión. La cantidad de strings en paralelo aumenta o disminuye según la potencia del motor y la irradiancia de cada horario.</p><p><strong>Potencia:</strong> ${fmt(pump, 2)} kW mecánicos requieren aproximadamente ${fmt(assumptions.needed, 2)} kW DC, usando ${fmt(assumptions.motor * 100, 0)} % para motor y ${fmt(assumptions.inverter * 100, 0)} % para variador.</p><p><strong>Perfil horario:</strong> ${assumptions.profile.source}, ${assumptions.profile.plane}. La potencia FV se escala desde los Wp con la irradiancia media oficial del mes.</p><p>${db.meta.notice}</p>`;
  $("emptyResult").classList.add("hidden");
  $("results").classList.remove("hidden");
  $("analysisPanel").classList.remove("hidden");
}

async function iniciar() {
  try {
    db = await cargarDatos();
    rellenarSelectores();
    vincularEventos();
    actualizarCamposBomba();
    actualizarVistaPanel();
    actualizarVistaVariador();
    $("minTemp").value = db.settings.defaultMinTemperature;
    $("dataStatus").textContent = `${db.panels.length - 1} placas · ${db.inverters.length - 2} SI23`;
    $("dataStatus").classList.add("ready");
    $("catalogVersion").textContent = `Catálogo v${db.meta.version} · ${db.meta.updated}`;
  } catch (error) {
    console.error(error);
    $("dataStatus").textContent = "Error al cargar los archivos JSON";
    document.querySelector(".calculate").disabled = true;
  }
}

iniciar();
