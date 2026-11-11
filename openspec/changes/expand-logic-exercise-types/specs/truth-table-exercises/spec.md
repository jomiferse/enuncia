## ADDED Requirements

### Requirement: Variantes de tabla de verdad
El bloque «Tablas de verdad» SHALL ofrecer ejercicios de: completar la tabla de una fórmula, clasificarla (tautología, contradicción, contingencia), decidir equivalencia de dos fórmulas y decidir la validez de un argumento.

#### Scenario: Completar tabla
- **WHEN** el usuario rellena V/F en las celdas de la columna resultado y comprueba
- **THEN** el sistema indica correcto o señala las filas erróneas

#### Scenario: Clasificar o decidir
- **WHEN** el usuario elige una opción (p. ej. «contingencia», «no equivalentes», «inválido»)
- **THEN** el sistema compara con el resultado calculado por evaluación y, si es incorrecto, muestra una interpretación que lo refuta

#### Scenario: Respuesta incompleta
- **WHEN** el usuario comprueba con celdas sin rellenar
- **THEN** el intento es «inválido» y se indica qué falta

### Requirement: Solución calculada
La solución SHALL calcularse a partir de las fórmulas del ejercicio, no almacenarse a mano, con un máximo de cuatro átomos en las tablas completas.

#### Scenario: Ejercicio con demasiados átomos
- **WHEN** un ejercicio de tabla completa declara más de cuatro átomos
- **THEN** el catálogo lo rechaza al cargar
