import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";

import { ClienteService } from "../services/cliente-service.js";
import { FinanzasService } from "../services/finanzas-service.js";

const clientes = new ClienteService();
const finanzas = new FinanzasService();

function numero(texto) {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" ? undefined : Number(limpio);
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
      name: "descripcion",
      message: "Descripción:",
    },
    {
      type: "input",
      name: "monto",
      message: "Monto (Q):",
    },
    {
      type: "input",
      name: "fecha",
      message: "Fecha (AAAA-MM-DD):",
      default: dayjs().format("YYYY-MM-DD"),
    },
  ]);

  try {
    const resultado = await finanzas.registrar({
      cliente_id: clienteId,
      tipo: "ingreso",
      categoria: datos.categoria,
      descripcion: datos.descripcion.trim(),
      monto: numero(datos.monto),
      fecha: datos.fecha.trim(),
    });

    if (!resultado.exito) {
      console.log(chalk.red("No se pudo registrar el ingreso:"));

      resultado.errores.forEach((error) => {
        console.log(chalk.red(` - ${error}`));
      });

      return;
    }

    console.log(
      chalk.green(
        `Ingreso registrado correctamente (id: ${resultado.id}).`
      )
    );
  } catch (error) {
    console.log(
      chalk.red(
        "Ocurrió un error inesperado al registrar el ingreso."
      )
    );
    console.log(chalk.gray(error.message));
  }
}

async function registrarEgreso() {
  const datos = await inquirer.prompt([
    {
      type: "select",
      name: "categoria",
      message: "Tipo de egreso:",
      choices: [
        {
          name: "Servicio",
          value: "servicio",
        },
        {
          name: "Suplemento",
          value: "suplemento",
        },
        {
          name: "Gasto operativo",
          value: "gasto_operativo",
        },
      ],
    },
    {
      type: "input",
      name: "descripcion",
      message: "Descripción:",
    },
    {
      type: "input",
      name: "monto",
      message: "Monto (Q):",
    },
    {
      type: "input",
      name: "fecha",
      message: "Fecha (AAAA-MM-DD):",
      default: dayjs().format("YYYY-MM-DD"),
    },
  ]);

  try {
    const resultado = await finanzas.registrar({
      tipo: "egreso",
      categoria: datos.categoria,
      descripcion: datos.descripcion.trim(),
      monto: numero(datos.monto),
      fecha: datos.fecha.trim(),
    });

    if (!resultado.exito) {
      console.log(chalk.red("No se pudo registrar el egreso:"));

      resultado.errores.forEach((error) => {
        console.log(chalk.red(` - ${error}`));
      });

      return;
    }

    console.log(
      chalk.green(
        `Egreso registrado correctamente (id: ${resultado.id}).`
      )
    );
  } catch (error) {
    console.log(
      chalk.red(
        "Ocurrió un error inesperado al registrar el egreso."
      )
    );
    console.log(chalk.gray(error.message));
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

    if (opcion === "egreso") {
      await registrarEgreso();
    }

    if (opcion === "volver") {
      volver = true;
    }
  }
}