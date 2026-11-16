// traduce HTTP <-> SeguimientoService, sin reglas de negocio ni SQL
import { enviarJson, enviarResultado, leerJson, idDeRuta } from "../http.js";
import { texto, numero } from "../datos.js";

function sinErrores(resultado) {
  if (!resultado.exito || !resultado.seguimiento) return resultado;
  const { errores, ...seguimiento } = resultado.seguimiento;
  return { ...resultado, seguimiento };
}

export function crearSeguimientoController({ seguimientoService }) {
  return {
    async registrar({ req, res }) {
      const cuerpo = await leerJson(req);
      const resultado = await seguimientoService.registrar({
        contrato_id: numero(cuerpo.contrato_id),
        fecha: texto(cuerpo.fecha),
        peso: numero(cuerpo.peso),
        grasa_corporal: numero(cuerpo.grasa_corporal),
        medidas: texto(cuerpo.medidas),
        foto: texto(cuerpo.foto),
        comentarios: texto(cuerpo.comentarios),
      });
      enviarResultado(res, sinErrores(resultado), 201);
    },

    // el servicio ya calcula la variacion de peso respecto al registro anterior
    async progresoPorCliente({ res, params }) {
      const progreso = await seguimientoService.progresoPorCliente(idDeRuta(params.id, "id del cliente"));
      enviarJson(res, 200, progreso);
    },

    async eliminar({ res, params }) {
      enviarResultado(res, await seguimientoService.eliminar(idDeRuta(params.id)));
    },
  };
}
