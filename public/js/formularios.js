// arma formularios a partir de una lista de campos y muestra los errores que devuelve el servidor
// los campos: { nombre, etiqueta, tipo, opciones, requerido, ayuda, completo, ...atributos del input }
import { h, boton, abrirDialogo } from "./ui.js";

let contador = 0;

function control(campo, valor) {
  const id = `campo-${campo.nombre}-${++contador}`;
  const { nombre, etiqueta, tipo = "text", opciones, requerido, ayuda, completo, ...extra } = campo;
  const comunes = { id, name: nombre, class: "control", required: requerido, ...extra };

  let entrada;
  if (tipo === "select") {
    entrada = h(
      "select",
      comunes,
      campo.vacio !== false && h("option", { value: "" }, campo.textoVacio || "Selecciona…"),
      (opciones || []).map((o) => h("option", { value: o.valor, selected: String(o.valor) === String(valor ?? "") }, o.texto))
    );
  } else if (tipo === "textarea") {
    entrada = h("textarea", comunes, valor ?? "");
  } else {
    entrada = h("input", { ...comunes, type: tipo, value: valor ?? "" });
  }

  return h(
    "div",
    { class: `campo ${completo ? "completo" : ""}`.trim() },
    h("label", { for: id }, etiqueta, requerido && h("span", { "aria-hidden": "true" }, " *")),
    entrada,
    ayuda && h("span", { class: "ayuda" }, ayuda)
  );
}

// alEnviar recibe los datos como texto; el servidor se encarga de convertirlos y validarlos
export function formulario({ campos, valores = {}, textoEnviar = "Guardar", columnas = 2, alEnviar, alCancelar }) {
  const errores = h("ul", { class: "errores", role: "alert", hidden: true });
  const enviar = h("button", { type: "submit", class: "boton acento" }, textoEnviar);

  const form = h(
    "form",
    { class: "formulario", novalidate: true },
    errores,
    h("div", { class: `campos ${columnas === 2 ? "dos" : ""}`.trim() }, campos.map((c) => control(c, valores[c.nombre]))),
    h("div", { class: "dialogo-pie" }, alCancelar && boton("Cancelar", { clase: "secundario", onclick: alCancelar }), enviar)
  );

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(form));

    errores.hidden = true;
    enviar.disabled = true;
    try {
      await alEnviar(datos);
    } catch (error) {
      errores.replaceChildren(...(error.errores || [error.message]).map((e) => h("li", {}, e)));
      errores.hidden = false;
      errores.scrollIntoView({ block: "nearest" });
    } finally {
      enviar.disabled = false;
    }
  });

  return form;
}

// formulario dentro de un dialogo: se cierra solo cuando el servidor acepta los datos
export function abrirFormulario(titulo, opciones) {
  return abrirDialogo(titulo, (cerrar) =>
    formulario({
      ...opciones,
      alCancelar: cerrar,
      alEnviar: async (datos) => {
        await opciones.alEnviar(datos);
        cerrar();
      },
    })
  );
}
