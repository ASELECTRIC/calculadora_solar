export const fmt = (valor, decimales = 1) => new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: decimales,
  minimumFractionDigits: decimales
}).format(valor);

export function crearHtmlOpcion(opcion, titulo, etiqueta) {
  const nota = opcion.kind === "central"
    ? "Cantidad calculada para cubrir la potencia del motor a las 15:00 del mes seleccionado."
    : "Añade o quita strings automáticamente para cubrir la misma potencia a las 08:30, cuando hay menos irradiancia.";
  return `<div class="option-top"><div><span class="eyebrow">${etiqueta}</span><h3>${titulo}</h3></div><div class="panel-total"><strong>${opcion.total}</strong><small>placas</small></div></div><div class="wiring"><b>${opcion.series}</b> en serie <span>×</span> <b>${opcion.strings}</b> string${opcion.strings === 1 ? "" : "s"} en paralelo</div><div class="metrics"><div class="metric"><small>Potencia instalada</small><strong>${fmt(opcion.arrayKw, 2)} kWp</strong></div><div class="metric"><small>Vmp nominal</small><strong>${fmt(opcion.vmpArray, 0)} V</strong></div><div class="metric"><small>Vmp con calor</small><strong>${fmt(opcion.vmpArrayHot, 0)} V</strong></div><div class="metric"><small>Voc con frío</small><strong>${fmt(opcion.vocArrayCold, 0)} V</strong></div><div class="metric"><small>Imp total</small><strong>${fmt(opcion.impArray, 1)} A</strong></div><div class="metric"><small>Isc total</small><strong>${fmt(opcion.iscArray, 1)} A</strong></div></div><p class="option-note">${nota}</p>`;
}

export function crearHtmlComparacion(base, extended, panel, assumptions, nombreMes) {
  const oneKwp = base.series * panel.wp / 1000;
  const estado = (potencia, irradiancia) => irradiancia < 20
    ? '<span class="power-low">Sin irradiancia útil</span>'
    : potencia >= assumptions.needed
      ? '<span class="power-ok">Potencia suficiente para 50 Hz*</span>'
      : '<span class="power-low">El SI23 debe reducir Hz o esperar</span>';
  const body = Object.entries(assumptions.month.values).map(([time, wm2]) => {
    const porString = oneKwp * wm2 / 1000;
    const centralPower = porString * base.strings;
    const extendedPower = porString * extended.strings;
    return `<tr><td><strong>${time}</strong><br>${fmt(wm2, 0)} W/m²</td><td><strong>${base.total} placas · ${base.strings} string${base.strings === 1 ? "" : "s"}</strong><br>${fmt(centralPower, 2)} kW<br>${estado(centralPower, wm2)}</td><td><strong>${extended.total} placas · ${extended.strings} string${extended.strings === 1 ? "" : "s"}</strong><br>${fmt(extendedPower, 2)} kW<br>${estado(extendedPower, wm2)}</td><td>−${fmt((1 - wm2 / 1000) * 100, 0)} % frente a STC</td></tr>`;
  }).join("");
  return `<p class="profile-line"><strong>${assumptions.profile.name} · ${nombreMes}</strong><br>${assumptions.profile.source} · ${assumptions.profile.plane}</p><table class="comparison-table"><thead><tr><th>Hora</th><th>Horas centrales</th><th>Horario ampliado</th><th>Radiación perdida</th></tr></thead><tbody>${body}</tbody></table><p class="comparison-explanation"><strong>730 V en vacío no significa potencia disponible.</strong> La tensión puede existir sin corriente suficiente. La configuración ampliada añade los strings necesarios para las 08:30; las demás franjas muestran el comportamiento estimado con ambas configuraciones. *Media mensual antes de pérdidas reales por suciedad, cableado, sombras y temperatura de célula.</p>`;
}
