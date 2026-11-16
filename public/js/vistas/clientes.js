// vista de clientes: buscar, crear, editar y eliminar
import * as api from "../api.js";
import { h, boton, tabla, vacio, formatoFecha, nombreCompleto, avisar, avisarError, confirmar } from "../ui.js";
import { abrirFormulario } from "../formularios.js";

const CAMPOS = [
  { nombre: "nombre", etiqueta: "Nombre", requerido: true, maxlength: 100, autocomplete: "given-name" },
  { nombre: "apellido", etiqueta: "Apellido", requerido: true, maxlength: 100, autocomplete: "family-name" },
  { nombre: "email", etiqueta: "Email", tipo: "email", maxlength: 150, autocomplete: "email" },
  { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel", maxlength: 20, autocomplete: "tel" },
  { nombre: "fecha_nacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", completo: true },
];

export async function render(contenedor) {
  let clientes = await api.clientes.listar();
  const lista = h("div");
  const buscador = h("input", {
    type: "search",
    class: "control",
    id: "buscar-cliente",
    placeholder: "Nombre, apellido, email o teléfono",
    oninput: pintar,
  });

  async function recargar() {
    clientes = await api.clientes.listar();
    pintar();
  }

  function abrirEdicion(cliente) {
    const editando = Boolean(cliente);
    abrirFormulario(editando ? "Editar cliente" : "Nuevo cliente", {
      campos: CAMPOS,
      valores: cliente || {},
      textoEnviar: editando ? "Guardar cambios" : "Crear cliente",
      alEnviar: async (datos) => {
        if (editando) await api.clientes.actualizar(cliente.id, datos);
        else await api.clientes.crear(datos);
        avisar(editando ? "Cliente actualizado." : "Cliente creado.");
        await recargar();
      },
    });
  }

  async function eliminar(cliente) {
    const seguro = await confirmar({
      titulo: "Eliminar cliente",
      mensaje: `¿Seguro que deseas eliminar a ${nombreCompleto(cliente)}? Esta acción no se puede deshacer.`,
      textoBoton: "Eliminar",
      peligro: true,
    });
    if (!seguro) return;

    try {
      await api.clientes.eliminar(cliente.id);
      avisar("Cliente eliminado.");
      await recargar();
    } catch (error) {
      avisarError(error);
    }
  }

  function pintar() {
    resumen.textContent = `${clientes.length} ${clientes.length === 1 ? "cliente registrado" : "clientes registrados"}. Busca, edita o registra nuevos miembros del gimnasio.`;
    const termino = buscador.value.trim().toLowerCase();
    const filtrados = clientes.filter((c) =>
      [c.nombre, c.apellido, c.email, c.telefono].some((v) => v && v.toLowerCase().includes(termino))
    );

    if (clientes.length === 0) {
      lista.replaceChildren(
        vacio("Todavía no hay clientes", "Registra el primero para empezar a asignarle planes.", boton("Nuevo cliente", { clase: "acento", iconoNombre: "mas", onclick: () => abrirEdicion() }))
      );
      return;
    }
    if (filtrados.length === 0) {
      lista.replaceChildren(vacio("Sin resultados", `Ningún cliente coincide con “${buscador.value.trim()}”.`));
      return;
    }

    lista.replaceChildren(
      tabla(
        [
          { titulo: "Cliente", valor: (c) => h("strong", {}, nombreCompleto(c)) },
          { titulo: "Email", valor: (c) => c.email || "—" },
          { titulo: "Teléfono", valor: (c) => c.telefono || "—" },
          { titulo: "Nacimiento", valor: (c) => formatoFecha(c.fecha_nacimiento) },
          { titulo: "Registro", valor: (c) => formatoFecha(c.fecha_registro) },
          {
            titulo: "Acciones",
            clase: "acciones",
            valor: (c) => [
              boton("Editar", { clase: "secundario chico", iconoNombre: "editar", onclick: () => abrirEdicion(c) }),
              boton("Eliminar", { clase: "secundario chico", iconoNombre: "borrar", "aria-label": `Eliminar a ${nombreCompleto(c)}`, onclick: () => eliminar(c) }),
            ],
          },
        ],
        filtrados
      )
    );
  }

  const resumen = h("p");
  contenedor.append(
    h(
      "div",
      { class: "cabecera" },
      resumen,
      h("div", { class: "acciones" }, boton("Nuevo cliente", { clase: "acento", iconoNombre: "mas", onclick: () => abrirEdicion() }))
    ),
    h("div", { class: "barra-filtros" }, h("div", { class: "campo ancho" }, h("label", { for: "buscar-cliente" }, "Buscar"), buscador)),
    lista
  );
  pintar();
}
