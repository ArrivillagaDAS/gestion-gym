import inquirer from "inquirer";
import chalk from "chalk";

import { menuClientes } from "./cliente-commands.js";
import { menuPlanes } from "./plan-commands.js";
import { menuContratos } from "./contrato-commands.js";
import { menuSeguimiento } from "./seguimiento-commands.js";
import { menuNutricion } from "./nutricion-commands.js";
import { menuFinanzas } from "./finanzas-commands.js";

// un error no controlado dentro de un submenu (por ejemplo, la base de datos caida)
// no debe cerrar toda la aplicacion: se muestra y se vuelve al menu principal
async function abrirSubmenu(submenu) {
  try {
    await submenu();
  } catch (error) {
    // Ctrl+C se deja pasar para que index.js cierre la aplicacion
    if (error.name === "ExitPromptError") throw error;

    console.log(chalk.red("Ocurrió un error inesperado."));
    console.log(chalk.gray(error.message));
  }
}

export async function mostrarMenu() {
  let salir = false;

  while (!salir) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Gestión de Gimnasio — Menú principal"),
        loop: false,
        choices: [
          {
            name: "Clientes",
            value: "clientes",
          },
          {
            name: "Planes",
            value: "planes",
          },
          {
            name: "Contratos",
            value: "contratos",
          },
          {
            name: "Seguimiento físico",
            value: "seguimiento",
          },
          {
            name: "Nutrición",
            value: "nutricion",
          },
          {
            name: "Finanzas",
            value: "finanzas",
          },
          new inquirer.Separator(),
          {
            name: "Salir",
            value: "salir",
          },
        ],
      },
    ]);

    switch (opcion) {
      case "clientes":
        await abrirSubmenu(menuClientes);
        break;

      case "planes":
        await abrirSubmenu(menuPlanes);
        break;

      case "contratos":
        await abrirSubmenu(menuContratos);
        break;

      case "seguimiento":
        await abrirSubmenu(menuSeguimiento);
        break;

      case "nutricion":
        await abrirSubmenu(menuNutricion);
        break;

      case "finanzas":
        await abrirSubmenu(menuFinanzas);
        break;

      case "salir":
        salir = true;
        console.log(chalk.green("¡Hasta luego!"));
        break;
    }
  }
}