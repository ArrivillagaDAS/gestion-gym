// enrutador minimo: asocia metodo + ruta con un manejador
// las rutas aceptan parametros con dos puntos, por ejemplo /api/clientes/:id
export class Enrutador {
  constructor() {
    this.rutas = [];
  }

  agregar(metodo, patron, manejador) {
    const claves = [];
    const expresion = patron.replace(/:(\w+)/g, (_, clave) => {
      claves.push(clave);
      return "([^/]+)";
    });

    this.rutas.push({ metodo, regex: new RegExp(`^${expresion}/?$`), claves, manejador });
    return this;
  }

  get(patron, manejador) {
    return this.agregar("GET", patron, manejador);
  }

  post(patron, manejador) {
    return this.agregar("POST", patron, manejador);
  }

  put(patron, manejador) {
    return this.agregar("PUT", patron, manejador);
  }

  delete(patron, manejador) {
    return this.agregar("DELETE", patron, manejador);
  }

  // devuelve { manejador, params }, { metodoNoPermitido: true } si la ruta existe con otro metodo, o null
  buscar(metodo, ruta) {
    let existeConOtroMetodo = false;

    for (const definicion of this.rutas) {
      const coincidencia = ruta.match(definicion.regex);
      if (!coincidencia) continue;

      if (definicion.metodo !== metodo) {
        existeConOtroMetodo = true;
        continue;
      }

      const params = {};
      definicion.claves.forEach((clave, i) => {
        params[clave] = decodeURIComponent(coincidencia[i + 1]);
      });
      return { manejador: definicion.manejador, params };
    }

    return existeConOtroMetodo ? { metodoNoPermitido: true } : null;
  }
}
