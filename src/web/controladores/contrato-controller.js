// traduce HTTP <-> ContratoService, sin reglas de negocio ni SQL
// las transacciones (asignar, renovar, cancelar) siguen viviendo en el servicio
import { formatearFecha } from "../../utils/fechas.js";
import { enviarJson, enviarResultado, leerJson, idDeRuta } from "../http.js";
import { texto } from "../datos.js";

function aRespuesta(contrato) {
  return {
    ...contrato,
    precio: Number(contrato.precio),
    fecha_inicio: formatearFecha(contrato.fecha_inicio),
    fecha_fin: formatearFecha(contrato.fecha_fin),
  };
}

// el modelo trae su lista de errores vacia: no hace falta mandarla al navegador
function sinErrores(resultado) {
  if (!resultado.exito || !resultado.contrato) return resultado;
  const { errores, ...contrato } = resultado.contrato;
  return { ...resultado, contrato };
}

export function crearContratoController({ contratoService }) {
  return {
    async listarPorCliente({ res, params }) {
      const contratos = await contratoService.listarPorCliente(idDeRuta(params.id, "id del cliente"));
      enviarJson(res, 200, contratos.map(aRespuesta));
    },

    async asignar({ req, res }) {
      const cuerpo = await leerJson(req);
      const clienteId = idDeRuta(cuerpo.cliente_id, "cliente");
      const planId = idDeRuta(cuerpo.plan_id, "plan");

      // igual que en la consola: las condiciones solo se mandan si se escribieron
      const condiciones = texto(cuerpo.condiciones);
      const opciones = condiciones ? { condiciones } : {};

      const resultado = await contratoService.asignarPlan(clienteId, planId, opciones);
      enviarResultado(res, sinErrores(resultado), 201);
    },

    // sirve para avisar cuantos avances se borraran antes de cancelar
    async contarSeguimientos({ res, params }) {
      const total = await contratoService.contarSeguimientos(idDeRuta(params.id));
      enviarJson(res, 200, { total });
    },

    async renovar({ res, params }) {
      const resultado = await contratoService.renovar(idDeRuta(params.id));
      enviarResultado(res, sinErrores(resultado), 201);
    },

    async cancelar({ res, params }) {
      enviarResultado(res, await contratoService.cancelar(idDeRuta(params.id)));
    },

    async finalizar({ res, params }) {
      enviarResultado(res, await contratoService.finalizar(idDeRuta(params.id)));
    },
  };
}
