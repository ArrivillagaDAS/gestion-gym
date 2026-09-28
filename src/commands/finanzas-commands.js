import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";

import { ClienteService } from "../services/cliente-service.js";
import { FinanzasService } from "../services/finanzas-service.js";

const clientes = new ClienteService();
const finanzas = new FinanzasService();

function formatearMonto(monto) {
  return Number(monto).toFixed(2);
}

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

async function elegirCliente() {
  const lista = await clientes.listarTodos();

  if (lista.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados."));
    return null;
  }

  const { clienteId } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: lista.map((cliente) => ({
        name: `${cliente.id} - ${cliente.nombre} ${cliente.apellido}`,
        value: cliente.id,
      })),
    },
  ]);

  return clienteId;
}

async function registrarIngreso() {
  const clienteId = await elegirCliente();

  if (clienteId === null) return;

  const datos = await inquirer.prompt([
    {
      type: "select",
      name: "categoria",
      message: "Tipo de ingreso:",
      choices: [
        {
          name: "Mensualidad",
          value: "mensualidad",
        },
        {
          name: "Sesión individual",
          value: "sesion_individual",
        },
      ],
    },
    {
      type: "input",
      name: "monto",
      message: "Monto:",
    },
    {
      type: "input",
      name: "fecha",
      message: "Fecha (AAAA-MM-DD):",
      default: dayjs().format("YYYY-MM-DD"),
    },
    {
      type: "input",
      name: "descripcion",
      message: "Descripción:",
    },
  ]);

  const resultado = await finanzas.registrar({
    tipo: "ingreso",
    categoria: datos.categoria,
    monto: Number(datos.monto),
    fecha: datos.fecha.trim(),
    descripcion: datos.descripcion.trim(),
    cliente_id: clienteId,
  });

  if (resultado.exito) {
    console.log(
      chalk.green(`Ingreso registrado correctamente (id: ${resultado.id}).`)
    );
  } else {
    console.log(chalk.red("No se pudo registrar el ingreso:"));

    resultado.errores.forEach((error) => {
      console.log(chalk.red(" - " + error));
    });
  }
}

export async function menuFinanzas() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Finanzas"),
        choices: [
          {
            name: "Registrar ingreso",
            value: "ingreso",
          },
          {
            name: "Registrar egreso",
            value: "egreso",
          },
          {
            name: "Registrar pago de mensualidad",
            value: "pago",
          },
          {
            name: "Balance por rango de fechas",
            value: "rango",
          },
          {
            name: "Balance por cliente",
            value: "cliente",
          },
          new inquirer.Separator(),
          {
            name: "Volver",
            value: "volver",
          },
        ],
      },
    ]);

    if (opcion === "ingreso") {
      await registrarIngreso();
    }

    if (opcion === "volver") {
      volver = true;
    }
  }
}