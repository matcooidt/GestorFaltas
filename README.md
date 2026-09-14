# 📚 Cuaderno de Asistencia DAW

Aplicación web modular y ligera para el control, seguimiento y gestión del registro de faltas de asistencia, diseñada específicamente para ciclos formativos (adaptada al módulo de Desarrollo de Aplicaciones Web).

## 🚀 Características

* **Dashboard Dinámico:** Visualización gráfica del estado de asistencia con gráficos circulares y de barras interactivos (integración mediante `Chart.js`).
* **Control de Umbrales:** Alertas automáticas y avisos por colores según los porcentajes de acumulación de faltas (advertencia y riesgo de pérdida de evaluación continua).
* **Horario Semanal Interactivo:** Cuadrante horario que permite hacer clic directamente sobre cualquier clase para registrar una falta de forma rápida.
* **Gestión por Asignaturas:** Despliegue y filtrado detallado de faltas organizadas módulo a módulo.
* **Persistencia Local:** Almacenamiento seguro de los registros directamente en el navegador del usuario mediante `localStorage`.
* **Modo Oscuro / Claro:** Cambio de tema integrado con persistencia de preferencias.
* **Diseño Responsive:** Interfaz completamente adaptable tanto a dispositivos móviles como a escritorios.

## 🛠️ Tecnologías Utilizadas

* **HTML5** y **CSS3** (Variables CSS, Grid, Flexbox y diseño adaptativo).
* **JavaScript (Vanilla)** para toda la lógica de control, estado y manipulación del DOM.
* **Chart.js** para la representación gráfica de los datos de asistencia.

## 📂 Estructura del Proyecto

El proyecto se encuentra refactorizado y dividido en módulos limpios:

```text
📦 
 ┣ 📜 index.html         # Estructura principal de la interfaz y vistas
 ┣ 📜 styles.css         # Hoja de estilos y soporte para temas (claro/oscuro)
 ┣ 📜 app.js             # Lógica de la aplicación, estado, eventos y gráficos
 ┗ 📜 chart.min.js       # Librería local Chart.js[cite: 1, 2]
