const RUTAS_DATOS = {
  configuracion: "data/configuracion.json",
  perfiles: "data/perfiles-solares.json",
  provincias: "data/provincias.json"
};

async function cargarJson(ruta) {
  const respuesta = await fetch(ruta, { cache: "no-store" });
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  return respuesta.json();
}

export async function cargarDatos() {
  const [configuracion, perfiles, provincias] = await Promise.all([
    cargarJson(RUTAS_DATOS.configuracion),
    cargarJson(RUTAS_DATOS.perfiles),
    cargarJson(RUTAS_DATOS.provincias)
  ]);

  return {
    ...configuracion,
    solarProfiles: perfiles.solarProfiles,
    provinces: provincias.provinces
  };
}

export function obtenerPerfilMes(db, perfilId, mes) {
  const profile = db.solarProfiles[perfilId];
  return { profile, month: profile.months.find(item => item.month === Number(mes)) };
}
