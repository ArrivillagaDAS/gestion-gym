import inquirer from "inquirer";
import chalk from "chalk";
import { clienteService as service } from "../container.js";
import { formatearFecha } from "../utils/fechas.js";

// el usuario escribe solo los numeros (DDMMAAAA) y se le muestran con barras
function mostrarFechaEscrita(valor) {
  const soloNumeros = valor.replace(/\D/g, "").slice(0, 8);
  const partes = [soloNumeros.slice(0, 2), soloNumeros.slice(2, 4), soloNumeros.slice(4, 8)];
  return partes.filter(Boolean).join("/");
}

// convierte DDMMAAAA en AAAA-MM-DD; si esta incompleta se deja igual para que el modelo la rechace
function convertirFechaNacimiento(texto) {
  const numeros = texto.replace(/\D/g, "");
  if (numeros.length !== 8) return texto.trim();
  return `${numeros.slice(4, 8)}-${numeros.slice(2, 4)}-${numeros.slice(0, 2)}`;
}

async function crearCliente() {
  const datos = await inquirer.prompt([
    { type: "input", name: "nombre", message: "Nombre:", validate: (v) => v.trim() !== "" || "El nombre es obligatorio." },
    { type: "input", name: "apellido", message: "Apellido:", validate: (v) => v.trim() !== "" || "El apellido es obligatorio." },
    { type: "input", name: "email", message: "Email (opcional):" },
    { type: "input", name: "telefono", message: "Teléfono (opcional):" },
    {
      type: "input",
      name: "fecha_nacimiento",
      message: "Fecha de nacimiento (solo escribe los números, opcional):",
      transformer: mostrarFechaEscrita,
    },
  ]);

  datos.fecha_nacimiento = convertirFechaNacimiento(datos.fecha_nacimiento);

  if (!datos.email) {
    datos.email = null;
  }

  try {
    const resultado = await service.crear(datos);

    if (resultado.exito) {
      console.log(chalk.green(`Cliente creado con éxito (id: ${resultado.id}).`));
    } else {
      console.log(chalk.red("No se pudo crear el cliente:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const campoMatch = error.sqlMessage.match(/key '.*\.(\w+)'/);
      const campo = campoMatch ? campoMatch[1] : "un campo";
      console.log(chalk.red(`Ya existe un cliente con ese valor en "${campo}". Debe ser único.`));
    } else {
      console.log(chalk.red("Ocurrió un error inesperado al crear el cliente."));
      console.log(chalk.gray(error.message));
    }
  }
}

async function listarClientes() {
  const clientes = await service.listarTodos();

  if (clientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados todavía."));
    return;
  }

  const filas = clientes.map((c) => ({
    ID: c.id,
    Nombre: c.nombre,
    Apellido: c.apellido,
    Email: c.email ?? "(sin correo)",
    Teléfono: c.telefono ?? "(sin dato)",
  }));

  console.table(filas);
}

async function actualizarCliente() {
  const clientes = await service.listarTodos();

  if (clientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados todavía."));
    return;
  }

  const { id } = await inquirer.prompt([
    {
      type: "select",
      name: "id",
      message: "¿Qué cliente deseas actualizar?",
      choices: clientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  const actual = await service.buscarPorId(id);

  const datos = await inquirer.prompt([
    { type: "input", name: "nombre", message: "Nombre:", default: actual.nombre, validate: (v) => v.trim() !== "" || "El nombre es obligatorio." },
    { type: "input", name: "apellido", message: "Apellido:", default: actual.apellido, validate: (v) => v.trim() !== "" || "El apellido es obligatorio." },
    { type: "input", name: "email", message: "Email (opcional):", default: actual.email ?? "" },
    { type: "input", name: "telefono", message: "Teléfono (opcional):", default: actual.telefono ?? "" },
    {
      type: "input",
      name: "fecha_nacimiento",
      message: "Fecha de nacimiento (solo escribe los números, opcional):",
      default: formatearFechaParaEditar(actual.fecha_nacimiento),
      transformer: mostrarFechaEscrita,
    },
  ]);

  datos.fecha_nacimiento = convertirFechaNacimiento(datos.fecha_nacimiento);

  if (!datos.email) {
    datos.email = null;
  }

  try {
    const resultado = await service.actualizar(id, datos);

    if (resultado.exito) {
      console.log(chalk.green("Cliente actualizado con éxito."));
    } else {
      console.log(chalk.red("No se pudo actualizar el cliente:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const campoMatch = error.sqlMessage.match(/key '.*\.(\w+)'/);
      const campo = campoMatch ? campoMatch[1] : "un campo";
      console.log(chalk.red(`Ya existe otro cliente con ese valor en "${campo}". Debe ser único.`));
    } else {
      console.log(chalk.red("Ocurrió un error inesperado al actualizar el cliente."));
      console.log(chalk.gray(error.message));
    }
  }
}

async function eliminarCliente() {
  const clientes = await service.listarTodos();

  if (clientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados todavía."));
    return;
  }

  const { id } = await inquirer.prompt([
    {
      type: "select",
      name: "id",
      message: "¿Qué cliente deseas eliminar?",
      choices: clientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  const cliente = await service.buscarPorId(id);

  const { confirmar } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmar",
      message: chalk.red(`¿Seguro que deseas eliminar a "${cliente.nombre} ${cliente.apellido}"? Esta acción no se puede deshacer.`),
      default: false,
    },
  ]);

  if (!confirmar) {
    console.log(chalk.yellow("Eliminación cancelada."));
    return;
  }

  try {
    const resultado = await service.eliminar(id);

    if (resultado.exito) {
      console.log(chalk.green("Cliente eliminado con éxito."));
    } else {
      console.log(chalk.red("No se pudo eliminar el cliente:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al eliminar el cliente."));
    console.log(chalk.gray(error.message));
  }
}

function formatearFechaParaEditar(fecha) {
  if (!fecha) return "";
  // toISOString pasa a UTC y en algunas zonas horarias mueve la fecha un dia
  const [anio, mes, dia] = formatearFecha(fecha).split("-");
  return `${dia}${mes}${anio}`;
}

export async function menuClientes() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Clientes"),
        choices: [
          { name: "Crear cliente", value: "crear" },
          { name: "Listar clientes", value: "listar" },
          { name: "Actualizar cliente", value: "actualizar" },
          { name: "Eliminar cliente", value: "eliminar" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "crear") await crearCliente();
    if (opcion === "listar") await listarClientes();
    if (opcion === "actualizar") await actualizarCliente();
    if (opcion === "eliminar") await eliminarCliente();
    if (opcion === "volver") volver = true;
  }
}