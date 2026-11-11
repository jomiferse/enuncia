## ADDED Requirements

### Requirement: Lenguaje de predicados
El sistema SHALL reconocer fórmulas con predicados `P(x, a)`, variables, constantes, `∀`, `∃` (alias `forall`, `exists`) y las conectivas existentes, con límites de longitud y profundidad, y mostrarlas en forma normalizada.

#### Scenario: Fórmula bien formada
- **WHEN** el usuario escribe `∀x (P(x) → ∃y R(x, y))`
- **THEN** se acepta y se muestra normalizada

#### Scenario: Aridad o símbolo erróneo
- **WHEN** un predicado se usa con aridad distinta a la declarada o con símbolo no declarado
- **THEN** se rechaza con un mensaje en español

### Requirement: Fórmulas a enunciados
El bloque «Fórmulas a enunciados» SHALL mostrar una fórmula con su diccionario de predicados y pedir su lectura correcta en lenguaje natural, eligiendo entre varios enunciados candidatos (uno correcto), con explicación del alcance de los cuantificadores.

#### Scenario: Respuesta correcta
- **WHEN** el usuario elige el enunciado correcto
- **THEN** el intento es correcto y se muestra la explicación

#### Scenario: Respuesta incorrecta
- **WHEN** elige un distractor
- **THEN** el intento es incorrecto y se explica por qué ese enunciado no equivale a la fórmula
