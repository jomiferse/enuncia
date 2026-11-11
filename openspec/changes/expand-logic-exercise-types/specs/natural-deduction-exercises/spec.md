## ADDED Requirements

### Requirement: Demostración paso a paso
Los bloques de deducción natural (enunciados y predicados) SHALL permitir al usuario escribir una demostración como lista numerada de líneas, cada una con fórmula, regla y líneas citadas, y comprobar que demuestra la conclusión desde las premisas dadas.

#### Scenario: Demostración correcta
- **WHEN** cada línea es premisa o aplicación válida de una regla permitida y la última línea es la conclusión sin hipótesis abiertas
- **THEN** el intento es correcto, aunque difiera de la demostración del autor

#### Scenario: Paso inválido
- **WHEN** una línea cita una regla mal aplicada, líneas inexistentes o posteriores, o una hipótesis cerrada
- **THEN** el intento es incorrecto y el mensaje indica la primera línea errónea y el motivo

### Requirement: Reglas
Enunciados SHALL soportar introducción y eliminación de ∧, ∨, →, ↔, ¬ y reducción al absurdo con subdemostraciones. Predicados SHALL añadir introducción y eliminación de ∀ y ∃ con las restricciones de variable libre/eigenvariable.

#### Scenario: Restricción de cuantificadores
- **WHEN** se aplica ∀I sobre una variable libre en una premisa o hipótesis abierta
- **THEN** la línea se rechaza explicando la restricción
