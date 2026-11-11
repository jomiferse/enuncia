## ADDED Requirements

### Requirement: Ejercicio de resolución por fases
Cada ejercicio de resolución SHALL presentar unas premisas y una conclusión y guiar al usuario por cinco fases: forma normal, conjunto de cláusulas, árbol de resolución, conclusión sobre la validez y estudio de la consistencia de las premisas. Una fase SHALL no estar disponible hasta que las anteriores estén correctas.

#### Scenario: Avance por fases
- **WHEN** el usuario completa correctamente la fase de forma normal
- **THEN** se habilita la fase de conjunto de cláusulas, con el conjunto de partida calculado a partir de sus resultados

#### Scenario: Fase incorrecta
- **WHEN** una fase contiene un paso erróneo
- **THEN** las fases siguientes permanecen bloqueadas y el paso erróneo se señala con su motivo

### Requirement: Forma normal paso a paso
En la fase de forma normal, el usuario SHALL reescribir cada premisa y la negación de la conclusión indicando en cada paso la ley aplicada y la fórmula resultante, y terminar marcando «FNC» (enunciados) o «FNS» (predicados). Un paso SHALL ser correcto solo si el resultado se obtiene aplicando exactamente esa ley una vez sobre alguna subfórmula del paso anterior.

#### Scenario: Paso correcto
- **WHEN** el usuario aplica «A → B = ¬A ∨ B» y escribe la fórmula resultante correcta
- **THEN** el paso se marca como correcto

#### Scenario: Ley mal aplicada
- **WHEN** el resultado escrito no se obtiene del paso anterior con la ley elegida
- **THEN** el paso se marca incorrecto indicando que ese resultado no corresponde a aplicar esa ley

#### Scenario: Marcar forma normal prematuramente
- **WHEN** el usuario marca «FNC» sobre una fórmula que no está en forma normal conjuntiva
- **THEN** el paso se marca incorrecto

#### Scenario: Leyes de predicados
- **WHEN** el ejercicio es de predicados
- **THEN** están disponibles además ¬∀ y ¬∃, renombrar variable ligada, mover cuantificadores universales a la izquierda y skolemización, y la skolemización solo es correcta con símbolos de Skolem nuevos y los argumentos adecuados

### Requirement: Simplificación del conjunto de cláusulas
El usuario SHALL simplificar el conjunto de cláusulas indicando en cada paso la simplificación (subsunción, literal puro, cláusula tautológica o repetida) y el conjunto resultante, y terminar declarando que no se puede simplificar más. Declararlo SHALL ser correcto solo si no queda ninguna simplificación aplicable.

#### Scenario: Subsunción
- **WHEN** el usuario elimina una cláusula subsumida por otra e indica «subsunción»
- **THEN** el paso es correcto

#### Scenario: Simplificación inexistente
- **WHEN** el usuario aplica una simplificación que no procede o declara que no se puede simplificar más habiendo todavía alguna
- **THEN** el paso se marca incorrecto

### Requirement: Árbol de resolución
El usuario SHALL decidir si existe un árbol de resolución para el conjunto de cláusulas. Si existe, SHALL construirlo paso a paso eligiendo una cláusula troncal, una cláusula lateral y un literal complementario; el sistema SHALL calcular el resolvente, que es la troncal del paso siguiente, hasta llegar a la cláusula vacía. En predicados SHALL unificarse con el unificador más general tras renombrar variables.

#### Scenario: Paso de resolución válido
- **WHEN** el usuario elige troncal, lateral y un par de literales complementarios
- **THEN** el sistema muestra el resolvente y el paso es correcto

#### Scenario: Literales no complementarios o no unificables
- **WHEN** los literales elegidos no son complementarios (o en predicados no unifican, o fallan el occurs-check)
- **THEN** el paso es incorrecto y se indica el motivo

#### Scenario: Respuesta «no es posible»
- **WHEN** el conjunto es satisfacible y el usuario responde que no hay árbol
- **THEN** la respuesta es correcta; si el conjunto es refutable, es incorrecta

### Requirement: Conclusión y consistencia
El usuario SHALL concluir si el razonamiento es válido (el conjunto con la negación de la conclusión es refutable) y repetir el análisis solo con las premisas para concluir si son consistentes. La corrección de estas conclusiones en enunciados SHALL calcularse semánticamente y en predicados SHALL proceder de datos revisados del ejercicio.

#### Scenario: Razonamiento válido
- **WHEN** la negación de la conclusión con las premisas es refutable y el usuario indica «válido»
- **THEN** la conclusión es correcta

#### Scenario: Premisas inconsistentes
- **WHEN** las premisas por sí solas son refutables y el usuario indica «inconsistentes»
- **THEN** la conclusión es correcta

### Requirement: Estilo de práctica de Enuncia
El flujo SHALL ofrecer dos pistas y una solución explicada, conservar el borrador de la respuesta y funcionar en móvil y modo oscuro. En simulacros SHALL calificarse al entregar sin feedback previo. Los mensajes SHALL estar en español y no revelar la respuesta correcta antes de ver la solución explicada.

#### Scenario: Respuesta en blanco
- **WHEN** el usuario comprueba o entrega sin haber escrito nada
- **THEN** el intento es inválido y se le indica que complete la primera fase

### Requirement: Catálogo de resolución
Cada bloque de resolución (enunciados y predicados) SHALL contener al menos 20 ejercicios en el nuevo formato con las tres dificultades, dos pistas y explicación, y la carga del catálogo SHALL fallar si un ejercicio tiene premisas o conclusión no válidas, o una solución de referencia que no supere el propio corrector.

#### Scenario: Catálogo inválido
- **WHEN** un ejercicio tiene una premisa que no parsea o una solución de referencia incorrecta
- **THEN** la carga del catálogo falla identificando el ejercicio
