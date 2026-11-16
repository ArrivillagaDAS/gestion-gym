// estado compartido entre vistas: catalogos y cliente con el que se esta trabajando
import * as api from "./api.js";
import { h, nombreCompleto } from "./ui.js";

let catalogos = null;

export async function obtenerCatalogos() {
  if (!catalogos) catalogos = await api.catalogos();
  return catalogos;
}

// el cliente elegido se recuerda al cambiar de seccion (si el navegador lo permite)
const CLAVE_CLIENTE = "gimnasio:cliente";

export function clienteGuardado() {
  try {
    return sessionStorage.getItem(CLAVE_CLIENTE) || "";
  } catch {
    return "";
  }
}

function guardarCliente(id) {
  try {
    sessionStorage.setItem(CLAVE_CLIENTE, id);
  } catch {
    /* almacenamiento no disponible: solo se pierde la preferencia */
  }
}

// selector de cliente que usan contratos, seguimiento, nutricion y finanzas
export function selectorCliente(clientes, alCambiar, { etiqueta = "Cliente", permitirTodos = false } = {}) {
  const guardado = clienteGuardado();
  const existe = clientes.some((c) => String(c.id) === guardado);

  const select = h(
    "select",
    { id: "selector-cliente", class: "control" },
    h("option", { value: "" }, permitirTodos ? "Todos los clientes" : "Selecciona un cliente…"),
    clientes.map((c) => h("option", { value: c.id, selected: existe && String(c.id) === guardado }, nombreCompleto(c)))
  );

  select.addEventListener("change", () => {
    guardarCliente(select.value);
    alCambiar(select.value);
  });

  const campo = h("div", { class: "campo ancho" }, h("label", { for: "selector-cliente" }, etiqueta), select);
  return { campo, valor: () => select.value, inicial: existe ? guardado : "" };
}
