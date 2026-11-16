// traduce HTTP <-> FinanzasService, sin reglas de negocio ni SQL
import { enviarResultado, leerJson, idDeRuta } from "../http.js";
import { texto, numero } from "../datos.js";

function sinErrores(resultado) {
  if (!resultado.exito || !resultado.movimiento || !Array.isArray(resultado.movimiento.errores)) return resultado;
  const { errores, ...movimiento } = resultado.movimiento;
  return { ...resultado, movimiento };
}

// DECIMAL llega como texto desde mysql2: los montos se mandan como numero
function conMontosNumericos(resultado) {
  if (!resultado.exito || !resultado.movimientos) return resultado;
  return {
    ...resultado,
    movimientos: resultado.movimientos.map((m) => ({ ...m, monto: Number(m.monto) })),
  };
}

function rango(query) {
  return { desde: texto(query.get("desde")), hasta: texto(query.get("hasta")) };
}

export function crearFinanzasController({ finanzasService }) {
  return {
    async registrar({ req, res }) {
      const cuerpo = await leerJson(req);
      const resultado = await finanzasService.registrar({
        tipo: texto(cuerpo.tipo),
        categoria: texto(cuerpo.categoria),
        monto: numero(cuerpo.monto),
        fecha: texto(cuerpo.fecha),
        descripcion: texto(cuerpo.descripcion),
        cliente_id: numero(cuerpo.cliente_id),
      });
      enviarResultado(res, sinErrores(resultado), 201);
    },

    // el monto sale del precio del contrato, dentro de una transaccion del servicio
    async pagarMensualidad({ req, res, params }) {
      const cuerpo = await leerJson(req);
      const resultado = await finanzasService.registrarPagoMensualidad(
        idDeRuta(params.id),
        texto(cuerpo.fecha),
        texto(cuerpo.descripcion)
      );
      if (resultado.exito && resultado.contrato) {
        resultado.contrato = { ...resultado.contrato, precio: Number(resultado.contrato.precio) };
      }
      enviarResultado(res, resultado, 201);
    },

    // /api/movimientos?desde=AAAA-MM-DD&hasta=AAAA-MM-DD[&cliente_id=N]
    async listar({ res, query }) {
      const { desde, hasta } = rango(query);
      const cliente = texto(query.get("cliente_id"));
      const clienteId = cliente === undefined ? null : idDeRuta(cliente, "cliente");

      const resultado = await finanzasService.listarPorRango(desde, hasta, clienteId);
      enviarResultado(res, conMontosNumericos(resultado));
    },

    async balance({ res, query }) {
      const { desde, hasta } = rango(query);
      enviarResultado(res, await finanzasService.balancePorRango(desde, hasta));
    },

    async balancePorCliente({ res, params, query }) {
      const { desde, hasta } = rango(query);
      const clienteId = idDeRuta(params.id, "id del cliente");
      enviarResultado(res, await finanzasService.balancePorCliente(clienteId, desde, hasta));
    },
  };
}
