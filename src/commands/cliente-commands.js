import inquirer from "inquirer";
import chalk from "chalk";
import { ClienteService } from "../services/cliente-service.js";

const service = new ClienteService();

async function crearCliente() {
  const datos = await inquirer.prompt([
    { type: "input", name: "nombre", message: "Nombre:" },
    { type: "input", name: "apellido", message: "Apellido:" },
    { type: "input", name: "email", message: "Email (opcional):" },
    { type: "input", name: "telefono", message: "Teléfono (opcional):" },
    {
      type: "input",
      name: "fecha_nacimiento",
      message: "Fecha de nacimiento (solo escribe los números, opcional):",
      transformer: (valor) => {
        const soloNumeros = valor.replace(/\D/g, "").slice(0, 8);
        const partes = [soloNumeros.slice(0, 2), soloNumeros.slice(2, 4), soloNumeros.slice(4, 8)];
        return partes.filter(Boolean).join("/");
      },
    },
  ]);

  if (datos.fecha_nacimiento) {
    const texto = datos.fecha_nacimiento.replace(/\D/g, "");
    const dia = texto.slice(0, 2);
    const mes = texto.slice(2, 4);
    const anio = texto.slice(4, 8);
    datos.fecha_nacimiento = `${anio}-${mes}-${dia}`;
  }

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
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "crear") await crearCliente();
    if (opcion === "volver") volver = true;


  }
}