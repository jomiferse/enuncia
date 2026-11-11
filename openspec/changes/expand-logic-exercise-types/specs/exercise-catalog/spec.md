## ADDED Requirements

### Requirement: Ejercicios por tipo
El sistema SHALL admitir varios tipos de ejercicio (`formalization`, `truth-table`, `natural-deduction`, `resolution`, `formula-to-statement`), cada uno con su propio formato de datos, editor de respuesta y corrector.

#### Scenario: Tipo registrado
- **WHEN** un ejercicio tiene un tipo registrado y pertenece a un bloque del mismo tipo
- **THEN** se puede practicar y comprobar con el editor y corrector de ese tipo

#### Scenario: Catálogo inválido
- **WHEN** un ejercicio tiene tipo no registrado, bloque inexistente, tipo distinto al de su bloque, contenido incompleto o datos propios del tipo inválidos
- **THEN** la carga del catálogo falla con un error identificando el ejercicio

### Requirement: Bloques con ejercicios
Cada bloque declarado SHALL contener al menos 20 ejercicios con las tres dificultades, dos pistas y una explicación.

#### Scenario: Bloque navegable
- **WHEN** el usuario abre cualquier bloque del curso
- **THEN** ve su lista de ejercicios paginada, filtrable por dificultad y búsqueda

### Requirement: Práctica, simulacro y progreso para todos los tipos
Intentos, pistas, solución explicada, simulacros y estadísticas SHALL funcionar igual para todos los tipos. Un simulacro MAY mezclar tipos.

#### Scenario: Progreso existente
- **WHEN** el usuario tiene progreso guardado de formalización
- **THEN** se conserva sin migración y sigue siendo válido

#### Scenario: Respuesta de tipo nuevo guardada
- **WHEN** el usuario comprueba una respuesta de cualquier tipo
- **THEN** se registra como intento y puede exportarse e importarse en la copia de seguridad

### Requirement: Textos en español
Todos los textos de interfaz y mensajes de corrección nuevos SHALL estar en español en el fichero de traducciones.

#### Scenario: Mensaje de corrección
- **WHEN** el corrector de cualquier tipo devuelve un resultado
- **THEN** el mensaje mostrado está en español
