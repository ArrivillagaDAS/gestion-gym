// unico lugar del front que habla con el servidor
// cada funcion corresponde a una ruta de src/web/rutas.js

export class ErrorApi extends Error {
  constructor(errores, estado) {
    super(errores.join(" "));
    this.errores = errores;
    this.estado = estado;
  }
}

async function peticion(metodo, ruta, datos) {
  const opciones = { method: metodo, headers: {} };
  if (datos !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(datos);
  }

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch {
    throw new ErrorApi(["No se pudo conectar con el servidor. Revisa que esté encendido."], 0);
  }

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || cuerpo.exito === false) {
    throw new ErrorApi(cuerpo.errores || [`El servidor respondió con un error (${respuesta.status}).`], respuesta.status);
  }
  return cuerpo;
}

const get = (ruta) => peticion("GET", ruta);
const post = (ruta, datos = {}) => peticion("POST", ruta, datos);
const put = (ruta, datos) => peticion("PUT", ruta, datos);
const borrar = (ruta) => peticion("DELETE", ruta);

const consulta = (parametros) => {
  const limpios = Object.entries(parametros).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return limpios.length ? `?${new URLSearchParams(limpios)}` : "";
};

export const salud = () => get("/salud");
export const catalogos = () => get("/catalogos");

export const clientes = {
  listar: () => get("/clientes"),
  obtener: (id) => get(`/clientes/${id}`),
  crear: (datos) => post("/clientes", datos),
  actualizar: (id, datos) => put(`/clientes/${id}`, datos),
  eliminar: (id) => borrar(`/clientes/${id}`),
};

export const planes = {
  listar: () => get("/planes"),
  crear: (datos) => post("/planes", datos),
};

export const contratos = {
  listarPorCliente: (clienteId) => get(`/clientes/${clienteId}/contratos`),
  asignar: (datos) => post("/contratos", datos),
  contarSeguimientos: (id) => get(`/contratos/${id}/seguimientos/total`),
  renovar: (id) => post(`/contratos/${id}/renovar`),
  cancelar: (id) => post(`/contratos/${id}/cancelar`),
  finalizar: (id) => post(`/contratos/${id}/finalizar`),
};

export const seguimientos = {
  progreso: (clienteId) => get(`/clientes/${clienteId}/progreso`),
  registrar: (datos) => post("/seguimientos", datos),
  eliminar: (id) => borrar(`/seguimientos/${id}`),
};

export const nutricion = {
  planes: (clienteId) => get(`/clientes/${clienteId}/planes-alimentacion`),
  crearPlan: (datos) => post("/planes-alimentacion", datos),
  registrarAlimento: (datos) => post("/alimentos", datos),
  reporte: (clienteId, inicio) => get(`/clientes/${clienteId}/reporte-nutricional${consulta({ inicio })}`),
};

export const finanzas = {
  movimientos: (desde, hasta, clienteId) => get(`/movimientos${consulta({ desde, hasta, cliente_id: clienteId })}`),
  registrar: (datos) => post("/movimientos", datos),
  pagarMensualidad: (contratoId, datos) => post(`/contratos/${contratoId}/pagos`, datos),
  balance: (desde, hasta) => get(`/balance${consulta({ desde, hasta })}`),
  balanceCliente: (clienteId, desde, hasta) => get(`/clientes/${clienteId}/balance${consulta({ desde, hasta })}`),
};
