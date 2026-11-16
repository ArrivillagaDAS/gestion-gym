// une las rutas de la API con sus controladores
// los servicios salen de container.js, igual que en los comandos de consola
import { pool } from "../config/database.js";
import {
  clienteService,
  planService,
  contratoService,
  seguimientoService,
  nutricionService,
  finanzasService,
} from "../container.js";
import { Enrutador } from "./enrutador.js";
import { enviarJson } from "./http.js";
import { crearCatalogoController } from "./controladores/catalogo-controller.js";
import { crearClienteController } from "./controladores/cliente-controller.js";
import { crearPlanController } from "./controladores/plan-controller.js";
import { crearContratoController } from "./controladores/contrato-controller.js";
import { crearSeguimientoController } from "./controladores/seguimiento-controller.js";
import { crearNutricionController } from "./controladores/nutricion-controller.js";
import { crearFinanzasController } from "./controladores/finanzas-controller.js";

export function crearRutas() {
  const rutas = new Enrutador();

  const catalogo = crearCatalogoController();
  const clientes = crearClienteController({ clienteService });
  const planes = crearPlanController({ planService });
  const contratos = crearContratoController({ contratoService });
  const seguimientos = crearSeguimientoController({ seguimientoService });
  const nutricion = crearNutricionController({ nutricionService });
  const finanzas = crearFinanzasController({ finanzasService });

  // permite saber desde el navegador si el servidor y la base de datos responden
  rutas.get("/api/salud", async ({ res }) => {
    await pool.query("SELECT 1");
    enviarJson(res, 200, { exito: true, baseDeDatos: "conectada" });
  });

  rutas
    .get("/api/clientes", clientes.listar)
    .post("/api/clientes", clientes.crear)
    .get("/api/clientes/:id", clientes.obtener)
    .put("/api/clientes/:id", clientes.actualizar)
    .delete("/api/clientes/:id", clientes.eliminar);

  rutas
    .get("/api/planes", planes.listar)
    .post("/api/planes", planes.crear)
    .get("/api/planes/:id", planes.obtener);

  rutas
    .get("/api/clientes/:id/contratos", contratos.listarPorCliente)
    .post("/api/contratos", contratos.asignar)
    .get("/api/contratos/:id/seguimientos/total", contratos.contarSeguimientos)
    .post("/api/contratos/:id/renovar", contratos.renovar)
    .post("/api/contratos/:id/cancelar", contratos.cancelar)
    .post("/api/contratos/:id/finalizar", contratos.finalizar);

  rutas
    .get("/api/clientes/:id/progreso", seguimientos.progresoPorCliente)
    .post("/api/seguimientos", seguimientos.registrar)
    .delete("/api/seguimientos/:id", seguimientos.eliminar);

  rutas
    .get("/api/clientes/:id/planes-alimentacion", nutricion.listarPlanesPorCliente)
    .get("/api/clientes/:id/reporte-nutricional", nutricion.reporteSemanal)
    .post("/api/planes-alimentacion", nutricion.crearPlan)
    .post("/api/alimentos", nutricion.registrarAlimento);

  rutas
    .get("/api/movimientos", finanzas.listar)
    .post("/api/movimientos", finanzas.registrar)
    .post("/api/contratos/:id/pagos", finanzas.pagarMensualidad)
    .get("/api/balance", finanzas.balance)
    .get("/api/clientes/:id/balance", finanzas.balancePorCliente);

  rutas.get("/api/catalogos", catalogo.obtener);

  return rutas;
}
