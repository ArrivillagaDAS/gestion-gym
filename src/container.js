// unico lugar del proyecto donde se hacen los "new" de repositorios y servicios
// cada clase recibe lo que necesita por el constructor (inyeccion de dependencias)
import { pool } from "./config/database.js";
import { enTransaccion } from "./infraestructura/transaccion.js";

import { ClienteRepository } from "./repositories/cliente-repository.js";
import { PlanRepository } from "./repositories/plan-repository.js";
import { ContratoRepository } from "./repositories/contrato-repository.js";
import { SeguimientoRepository } from "./repositories/seguimiento-repository.js";
import { NutricionRepository } from "./repositories/nutricion-repository.js";
import { FinanzasRepository } from "./repositories/finanzas-repository.js";

import { ClienteService } from "./services/cliente-service.js";
import { PlanService } from "./services/plan-service.js";
import { ContratoService } from "./services/contrato-service.js";
import { SeguimientoService } from "./services/seguimiento-service.js";
import { NutricionService } from "./services/nutricion-service.js";
import { FinanzasService } from "./services/finanzas-service.js";

const ejecutarTransaccion = (trabajo) => enTransaccion(pool, trabajo);

const clienteRepository = new ClienteRepository(pool);
const planRepository = new PlanRepository(pool);
const contratoRepository = new ContratoRepository(pool);
const seguimientoRepository = new SeguimientoRepository(pool);
const nutricionRepository = new NutricionRepository(pool);
const finanzasRepository = new FinanzasRepository(pool);

export const clienteService = new ClienteService({
  clientes: clienteRepository,
});

export const planService = new PlanService({
  planes: planRepository,
});

export const contratoService = new ContratoService({
  contratos: contratoRepository,
  planes: planRepository,
  seguimientos: seguimientoRepository,
  ejecutarTransaccion,
});

export const seguimientoService = new SeguimientoService({
  seguimientos: seguimientoRepository,
  contratos: contratoRepository,
  ejecutarTransaccion,
});

export const nutricionService = new NutricionService({
  nutricion: nutricionRepository,
  contratos: contratoRepository,
  ejecutarTransaccion,
});

export const finanzasService = new FinanzasService({
  finanzas: finanzasRepository,
  contratos: contratoRepository,
  clientes: clienteRepository,
  ejecutarTransaccion,
});