## ADDED Requirements

### Requirement: Cláusulas y refutación en enunciados
El bloque de resolución de enunciados SHALL pedir pasar fórmulas a forma clausal y/o refutar un conjunto de cláusulas aplicando resolución hasta la cláusula vacía.

#### Scenario: Conversión a cláusulas
- **WHEN** el usuario escribe un conjunto de cláusulas para una fórmula
- **THEN** es correcto si es equivalente en satisfacibilidad/lógicamente equivalente según el enunciado del ejercicio

#### Scenario: Paso de resolución
- **WHEN** el usuario resuelve dos cláusulas sobre un literal complementario
- **THEN** el sistema valida el resolvente; con varios literales complementarios, el resolvente es inválido

#### Scenario: Refutación completa
- **WHEN** la secuencia de pasos alcanza la cláusula vacía
- **THEN** el intento es correcto

### Requirement: Resolución en predicados
El bloque de predicados SHALL incluir skolemización, forma clausal con variables y resolución con unificación del unificador más general.

#### Scenario: Unificación fallida
- **WHEN** el usuario resuelve literales no unificables
- **THEN** el sistema lo rechaza indicando que no unifican
