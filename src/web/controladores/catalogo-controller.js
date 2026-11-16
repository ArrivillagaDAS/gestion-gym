// listas fijas que el front muestra como opciones
// salen de los modelos para que la web y las validaciones nunca se contradigan
import { NIVELES } from "../../models/plan.js";
import { COMIDAS } from "../../models/alimento-dia.js";
import {
  TIPOS_MOVIMIENTO,
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
} from "../../models/movimiento-financiero.js";
import { enviarJson } from "../http.js";

export function crearCatalogoController() {
  return {
    async obtener({ res }) {
      enviarJson(res, 200, {
        niveles: NIVELES,
        comidas: COMIDAS,
        tiposMovimiento: TIPOS_MOVIMIENTO,
        categoriasIngreso: CATEGORIAS_INGRESO,
        categoriasEgreso: CATEGORIAS_EGRESO,
      });
    },
  };
}
