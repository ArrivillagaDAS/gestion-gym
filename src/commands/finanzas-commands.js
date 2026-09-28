import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";

import { ClienteService } from "../services/cliente-service.js";
import { ContratoService } from "../services/contrato-service.js";
import { FinanzasService } from "../services/finanzas-service.js";

const clientes = new ClienteService();
const contratos = new ContratoService();
const finanzas = new FinanzasService();

function numero(texto) {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" ? undefined : Number(limpio);
}

function formatearFecha(fecha) {
  if (fecha instanceof Date) {
    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  return String(fecha);
}

function formatearMonto(monto) {
  return `Q ${Number(monto).toFixed(2)}`;
}

async function elegirCliente() {
  const lista = await clientes.listarTodos();

  if (lista.length === 0) {
    console.log(
      chalk.yellow("No hay clientes registrados.")
    );

    return null;
  }

  const { clienteId } =
    await inquirer.prompt([
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
  const clienteId =
    await elegirCliente();

  if (clienteId === null) return;

  const datos =
    await inquirer.prompt([
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
        default:
          dayjs().format("YYYY-MM-DD"),
      },
    ]);

  try {
    const resultado =
      await finanzas.registrar({
        cliente_id: clienteId,
        tipo: "ingreso",
        categoria: datos.categoria,
        descripcion:
          datos.descripcion.trim(),
        monto: numero(datos.monto),
        fecha: datos.fecha.trim(),
      });

    if (!resultado.exito) {
      console.log(
        chalk.red(
          "No se pudo registrar el ingreso:"
        )
      );

      resultado.errores.forEach((error) => {
        console.log(
          chalk.red(` - ${error}`)
        );
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

    console.log(
      chalk.gray(error.message)
    );
  }
}

async function registrarEgreso() {
  const datos =
    await inquirer.prompt([
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
        default:
          dayjs().format("YYYY-MM-DD"),
      },
    ]);

  try {
    const resultado =
      await finanzas.registrar({
        tipo: "egreso",
        categoria: datos.categoria,
        descripcion:
          datos.descripcion.trim(),
        monto: numero(datos.monto),
        fecha: datos.fecha.trim(),
      });

    if (!resultado.exito) {
      console.log(
        chalk.red(
          "No se pudo registrar el egreso:"
        )
      );

      resultado.errores.forEach((error) => {
        console.log(
          chalk.red(` - ${error}`)
        );
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

    console.log(
      chalk.gray(error.message)
    );
  }
}

async function registrarPagoMensualidad() {
  const clienteId =
    await elegirCliente();

  if (clienteId === null) return;

  try {
    const lista =
      await contratos.listarPorCliente(
        clienteId
      );

    const activos = lista.filter(
      (contrato) =>
        contrato.estado === "activo"
    );

    if (activos.length === 0) {
      console.log(
        chalk.yellow(
          "Este cliente no tiene contratos activos."
        )
      );

      return;
    }

    const { contratoId } =
      await inquirer.prompt([
        {
          type: "select",
          name: "contratoId",
          message:
            "Contrato para registrar la mensualidad:",
          choices: activos.map(
            (contrato) => ({
              name:
                `#${contrato.id} | ` +
                `${contrato.plan_nombre ?? "Plan"} | ` +
                `Q ${Number(
                  contrato.precio
                ).toFixed(2)} | ` +
                `vence ${formatearFecha(
                  contrato.fecha_fin
                )}`,
              value: contrato.id,
            })
          ),
        },
      ]);

    const datos =
      await inquirer.prompt([
        {
          type: "input",
          name: "fecha",
          message:
            "Fecha del pago (AAAA-MM-DD):",
          default:
            dayjs().format("YYYY-MM-DD"),
        },
        {
          type: "input",
          name: "descripcion",
          message: "Descripción:",
          default:
            "Pago de mensualidad",
        },
      ]);

    const resultado =
      await finanzas.registrarPagoMensualidad(
        contratoId,
        datos.fecha.trim(),
        datos.descripcion.trim()
      );

    if (!resultado.exito) {
      console.log(
        chalk.red(
          "No se pudo registrar la mensualidad:"
        )
      );

      resultado.errores.forEach((error) => {
        console.log(
          chalk.red(` - ${error}`)
        );
      });

      return;
    }

    console.log(
      chalk.green(
        "Pago de mensualidad registrado correctamente."
      )
    );

    console.log(
      `Contrato #${contratoId} | ` +
      `Monto: ${formatearMonto(
        resultado.movimiento.monto
      )} | ` +
      `Fecha: ${resultado.movimiento.fecha}`
    );
  } catch (error) {
    console.log(
      chalk.red(
        "Ocurrió un error inesperado al registrar la mensualidad."
      )
    );

    console.log(
      chalk.gray(error.message)
    );
  }
}

export async function menuFinanzas() {
  let volver = false;

  while (!volver) {
    const { opcion } =
      await inquirer.prompt([
        {
          type: "select",
          name: "opcion",
          message:
            chalk.cyan("Menú de Finanzas"),
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
              name:
                "Registrar pago de mensualidad",
              value: "mensualidad",
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

    if (opcion === "mensualidad") {
      await registrarPagoMensualidad();
    }

    if (opcion === "volver") {
      volver = true;
    }
  }
}