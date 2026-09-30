# Enuncia

**Piensa con claridad.**

Web local en español para preparar formalización de lógica de enunciados. Incluye 40 ejercicios originales (12 básicos, 16 medios y 12 avanzados), práctica con dos pistas, soluciones explicadas, corrección por equivalencia y simulacros de diez ejercicios.

## Abrir la web

Haz doble clic en **Iniciar.command**. Se abrirá `http://127.0.0.1:5173/`. Mantén la ventana de Terminal abierta; Control+C detiene el servidor. Si ya está funcionando, el lanzador abre la web existente. El puerto está fijado: si otra aplicación lo ocupa, Vite muestra un error en lugar de cambiar la dirección y separar tu progreso.

También puedes clonar el proyecto y usar Terminal:

```sh
git clone https://github.com/jomiferse/enuncia.git
cd enuncia
# En macOS con Homebrew, si tu Node predeterminado es antiguo:
export PATH="/opt/homebrew/bin:$PATH"
npm ci
npm run dev
```

Requiere Node.js 22.12 o posterior (también compatible con Node 24/26). Al clonar el repositorio, instala las dependencias con `npm ci`. La primera instalación necesita Internet; la práctica no necesita conexión. No utiliza fuentes externas, cuentas, IA ni servicios remotos. `npm run build` genera la versión estática en `dist`; `npm run preview` sirve esa versión en la misma dirección y puerto.

## Practicar

En **Practicar**, filtra por nivel, busca por tema o repasa errores. Los átomos son sensibles a mayúsculas: usa exactamente las letras del enunciado. Se aceptan `¬ ∧ ∨ → ↔` y `~ ! & | -> <->`. La disyunción es inclusiva, salvo cuando el enunciado dice expresamente que las opciones son excluyentes.

El corrector comprueba equivalencia mediante tablas de verdad, no igualdad de texto. Presenta un contraejemplo cuando una fórmula difiere de la solución. Precedencia: negación, conjunción, disyunción y relaciones. Usa paréntesis al encadenar condicionales y bicondicionales: `P → (Q → R)` o `(P → Q) → R`. Un error de sintaxis se registra como intento, pero puede corregirse libremente.

Los ejercicios completados son los que has acertado alguna vez. Un error posterior los devuelve a **Repasar errores**. Los aciertos iniciales sin ayuda cuentan solo si el primer intento fue correcto sin consultar pistas ni solución. Consultar la solución registra la ayuda; los borradores y las pistas se conservan al cambiar de ejercicio o recargar.

## Simulacros y progreso

El simulacro equilibrado incluye 3 básicos, 4 medios y 3 avanzados, sin repetidos. También puedes elegir un único nivel. No hay límite de tiempo, pistas, interpretación ni corrección mientras respondes. Puedes cambiar de sección o recargar y retomarlo. Al entregar, cada ejercicio vale un punto; las respuestas en blanco o con sintaxis inválida no suman. Se muestran todas las soluciones en la revisión.

El historial, los borradores y el simulacro activo se guardan en `localStorage`, bajo `practica-logica.progress.v1`. Usa siempre la dirección `http://127.0.0.1:5173/` y el mismo navegador/perfil. Otro origen (por ejemplo localhost) tiene un almacenamiento independiente. Para trasladar los datos usa **Mi progreso → Exportar / Importar**. La importación valida el formato y fusiona por identificador sin duplicar intentos. Conserva los ejercicios desconocidos para futuras ampliaciones; el simulacro activo actual tiene prioridad sobre el importado. Las copias contienen tus respuestas y resultados y se guardan solo donde tú elijas.

## Añadir ejercicios

Edita `src/content/formalizacion.json` o añade otro JSON de ejercicios dentro de `src/content/`. Todos esos archivos se cargan automáticamente, salvo `blocks.json`. Cada archivo debe ser una lista. Ejemplo:

```json
[{
  "id": "enu-for-041",
  "blockId": "enunciados-formalizacion",
  "type": "formalization",
  "difficulty": "media",
  "title": "Una nueva condición",
  "statement": "Para que abra la biblioteca, es necesario que llegue el personal.",
  "atoms": {"P": "Abre la biblioteca", "Q": "Llega el personal"},
  "solution": "P → Q",
  "tags": ["condición necesaria"],
  "hints": ["Identifica qué requisito se exige.", "Llegar el personal es necesario para abrir."],
  "explanation": "Abrir P requiere Q, por eso P → Q."
}]
```

Cada ejercicio admite hasta ocho átomos. Usa un ID nuevo y estable; no renombres IDs ni cambies su significado si ya tienen historial. Mantén exactamente dos pistas y una explicación. La web valida IDs, bloques, tipos, dificultades, átomos y soluciones al cargar. Revisa también el significado lingüístico de cada ejercicio.

## Añadir bloques o tipos

Los bloques se declaran en `src/content/blocks.json`. Puedes añadir un bloque de formalización y ejercicios con su `blockId`: aparecerá en el filtro del banco. Para un tipo distinto, registra su nombre y validación en `src/catalog.ts`, añade su editor y corrector al registro `typeRegistry` de `src/App.tsx` y adapta el contenido de `Statement` y `Solution` si tiene otra estructura. El esquema de ejercicios e historial vive en `src/types.ts`; introduce una migración de progreso si cambias la versión. El inicio enumera los bloques registrados y el banco permite filtrarlos. La navegación y el almacenamiento se reutilizan. Las pruebas nuevas deben cubrir la corrección específica de ese tipo. Los nuevos bloques o tipos no se generan automáticamente.

Puedes pedir: «Añade 15 ejercicios de condiciones necesarias» o «Añade un bloque de tablas de verdad». Conserva siempre el historial y los IDs anteriores.

## Verificación

```sh
npm test
npm run build
```

Las pruebas cubren tablas de conectivas, alias, precedencia, cadenas ambiguas, equivalencias, contraejemplos, distribución del banco, selección de simulacros, historial y exportación/importación. Incluyen la estructura de referencia `(V → D) → (S → L)` observada en una solución de ALURA.

Los textos y explicaciones son originales y están inspirados en el estilo y niveles de ALURA. Este proyecto es independiente de la UOC y no envía respuestas ni modifica pruebas de ALURA.
