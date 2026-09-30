import inquirer from "inquirer";
import chalk from "chalk";
import { ClienteService } from "../services/cliente-service.js";
import { PlanService } from "../services/plan-service.js";
import { ContratoService } from "../services/contrato-service.js";
import { formatearFecha } from "../utils/fechas.js";

const clientes = new ClienteService();
const planes = new PlanService();
const contratos = new ContratoService();

async function asignarPlan() {
  const listaClientes = await clientes.listarTodos();
  const listaPlanes = await planes.listarTodos();

  if (listaClientes.length === 0 || listaPlanes.length === 0) {
    console.log(chalk.yellow("Se necesita al menos un cliente y un plan registrados."));
    return;
  }

  const { clienteId, planId, condiciones } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
    {
      type: "select",
      name: "planId",
      message: "Plan:",
      choices: listaPlanes.map((p) => ({
        name: `${p.id} - ${p.nombre} (${p.duracion_semanas} semanas, ${Number(p.precio).toFixed(2)})`,
        value: p.id,
      })),
    },
    { type: "input", name: "condiciones", message: "Condiciones adicionales (opcional):" },
  ]);

  const opciones = condiciones.trim() ? { condiciones: condiciones.trim() } : {};

  try {
    const resultado = await contratos.asignarPlan(clienteId, planId, opciones);

    if (resultado.exito) {
      const c = resultado.contrato;
      console.log(chalk.green(`Contrato creado con éxito (id: ${resultado.id}).`));
      console.log(`Vigencia: ${c.fecha_inicio} a ${c.fecha_fin}`);
      console.log(`Precio: ${c.precio.toFixed(2)}`);
    } else {
      console.log(chalk.red("No se pudo asignar el plan:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al asignar el plan."));
    console.log(chalk.gray(error.message));
  }
}

async function consultarContratos() {
  const listaClientes = await clientes.listarTodos();

  if (listaClientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados."));
    return;
  }

  const { clienteId } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  try {
    const lista = await contratos.listarPorCliente(clienteId);

    if (lista.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene contratos."));
      return;
    }

    console.log(chalk.cyan(`\nContratos del cliente (${lista.length}):`));
    lista.forEach((c) => {
      console.log(
        `#${c.id} | ${c.plan_nombre} | ${formatearFecha(c.fecha_inicio)} a ${formatearFecha(c.fecha_fin)} | ` +
          `${Number(c.precio).toFixed(2)} | ${c.estado}`
      );
    });
    console.log("");
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al consultar los contratos."));
    console.log(chalk.gray(error.message));
  }
}

async function renovarContrato() {
  const listaClientes = await clientes.listarTodos();

  if (listaClientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados."));
    return;
  }

  const { clienteId } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  try {
    const lista = await contratos.listarPorCliente(clienteId);
    const activos = lista.filter((c) => c.estado === "activo");

    if (activos.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene contratos activos para renovar."));
      return;
    }

    const { contratoId, confirmar } = await inquirer.prompt([
      {
        type: "select",
        name: "contratoId",
        message: "Contrato a renovar:",
        choices: activos.map((c) => ({
          name: `#${c.id} | ${c.plan_nombre} | vence ${formatearFecha(c.fecha_fin)}`,
          value: c.id,
        })),
      },
      {
        type: "confirm",
        name: "confirmar",
        message: "¿Seguro que quieres renovar este contrato?",
        default: false,
      },
    ]);

    if (!confirmar) {
      console.log(chalk.yellow("Operación cancelada."));
      return;
    }

    const resultado = await contratos.renovar(contratoId);

    if (resultado.exito) {
      const c = resultado.contrato;
      console.log(chalk.green(`Contrato #${contratoId} finalizado y renovado (nuevo id: ${resultado.id}).`));
      console.log(`Nueva vigencia: ${c.fecha_inicio} a ${c.fecha_fin}`);
      console.log(`Precio: ${c.precio.toFixed(2)}`);
    } else {
      console.log(chalk.red("No se pudo renovar el contrato:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al renovar el contrato."));
    console.log(chalk.gray(error.message));
  }
}

async function cancelarContrato() {
  const listaClientes = await clientes.listarTodos();

  if (listaClientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados."));
    return;
  }

  const { clienteId } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  try {
    const lista = await contratos.listarPorCliente(clienteId);
    const activos = lista.filter((c) => c.estado === "activo");

    if (activos.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene contratos activos para cancelar."));
      return;
    }

    const { contratoId } = await inquirer.prompt([
      {
        type: "select",
        name: "contratoId",
        message: "Contrato a cancelar:",
        choices: activos.map((c) => ({
          name: `#${c.id} | ${c.plan_nombre} | vence ${formatearFecha(c.fecha_fin)}`,
          value: c.id,
        })),
      },
    ]);

    const total = await contratos.contarSeguimientos(contratoId);
    console.log(
      chalk.yellow(`Se cancelará el contrato y se borrarán ${total} registro(s) de seguimiento.`)
    );

    const { confirmar } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmar",
        message: "¿Seguro que quieres cancelar este contrato?",
        default: false,
      },
    ]);

    if (!confirmar) {
      console.log(chalk.yellow("Operación cancelada."));
      return;
    }

    const resultado = await contratos.cancelar(contratoId);

    if (resultado.exito) {
      console.log(chalk.green(`Contrato #${contratoId} cancelado.`));
      console.log(`Seguimientos eliminados: ${resultado.seguimientosEliminados}`);
    } else {
      console.log(chalk.red("No se pudo cancelar el contrato:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al cancelar el contrato."));
    console.log(chalk.gray(error.message));
  }
}

async function finalizarContrato() {
  const listaClientes = await clientes.listarTodos();

  if (listaClientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados."));
    return;
  }

  const { clienteId } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  try {
    const lista = await contratos.listarPorCliente(clienteId);
    const activos = lista.filter((c) => c.estado === "activo");

    if (activos.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene contratos activos para finalizar."));
      return;
    }

    const { contratoId, confirmar } = await inquirer.prompt([
      {
        type: "select",
        name: "contratoId",
        message: "Contrato a finalizar:",
        choices: activos.map((c) => ({
          name: `#${c.id} | ${c.plan_nombre} | vence ${formatearFecha(c.fecha_fin)}`,
          value: c.id,
        })),
      },
      {
        type: "confirm",
        name: "confirmar",
        message: "¿Seguro que quieres finalizar este contrato?",
        default: false,
      },
    ]);

    if (!confirmar) {
      console.log(chalk.yellow("Operación cancelada."));
      return;
    }

    const resultado = await contratos.finalizar(contratoId);

    if (resultado.exito) {
      console.log(chalk.green(`Contrato #${contratoId} finalizado. Su seguimiento se conserva.`));
    } else {
      console.log(chalk.red("No se pudo finalizar el contrato:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al finalizar el contrato."));
    console.log(chalk.gray(error.message));
  }
}

export async function menuContratos() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Contratos"),
        choices: [
          { name: "Asignar plan a cliente", value: "asignar" },
          { name: "Consultar contratos de un cliente", value: "consultar" },
          { name: "Renovar contrato", value: "renovar" },
          { name: "Cancelar contrato", value: "cancelar" },
          { name: "Finalizar contrato", value: "finalizar" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "asignar") await asignarPlan();
    if (opcion === "consultar") await consultarContratos();
    if (opcion === "renovar") await renovarContrato();
    if (opcion === "cancelar") await cancelarContrato();
    if (opcion === "finalizar") await finalizarContrato();
    if (opcion === "volver") volver = true;
  }
}