# 🏥 Axios PWA App - Sistema de Orquestación Clínica

Una aplicación web progresiva (PWA) de nivel profesional para la gestión avanzada y orquestación del flujo de pacientes en clínicas. Construida sobre Node.js con Express y SQLite, Axios PWA App agiliza el monitoreo de pacientes, la asignación de módulos y el enrutamiento priorizado por triaje.

## 🌟 Características Principales

* **Dashboard de Staff en Tiempo Real:** Panel principal e interactivo para el personal médico, permitiendo monitorizar y controlar el flujo activo de pacientes en la clínica física de manera ágil.
* **Auto-Despachador Robótico (Robotic Auto-Dispatcher):** Un algoritmo inteligente ejecutándose en segundo plano (cada 10 segundos) que evalúa y analiza continuamente la cola clínica para identificar los tiempos de espera y dirigir automáticamente a los pacientes hacia sus módulos cuando haya disponibilidad.
* **Priorización Inteligente por Triaje:** El sistema etiqueta y ordena automáticamente a los pacientes en base a urgencia y tipo de ingreso: 🔴 **Rojo** (Urgente), 🟡 **Amarillo** (Espera Regular) y 🟢 **Verde** (Con Cita).
* **Base de Datos Local (SQLite):** Implementación orientada a funcionamiento veloz en red local (LAN) bajo servidor SQLite (`pacientes.sqlite`), asegurando autonomía si se pierde conexión de internet al reemplazar al anterior sistema en la nube (MongoDB).
* **Progressive Web App (PWA):** Integra un *Service Worker* (`service-worker.js`) y `manifest` permitiendo funcionar adaptativamente en dispositivos como Tablets o Pantallas en Kioscos del personal de la clínica.
* **Registro Interactivo Completo:** Inserción y actualización directa ("Upsert") para agregar información de condiciones, alergias, área referida, edad, y más.

## 🗄️ Arquitectura y Tecnologías

* **Backend / Servidor:** Node.js, Express.js.
* **Base de Datos:** SQLite (mediante la librería `sqlite3`).
* **Frontend:** PWA Vanilla, JavaScript estándar (ES6), HTML5 semántico, e interfaz customizada con Vanilla CSS puro.
* **Conectividad:** Desplegada específicamente para la IP Ethernet de la red local (`172.20.28.28`) por puerto `3001`, posibilitando un enrutamiento en toda la clínica.

## 🚀 Guía de Despliegue y Uso

### 1. Requisitos Previos:
Asegúrate de contar con Node.js debidamente instalado en el computador servidor principal.

### 2. Instalación:
Abre tu consola o terminal (Powershell/CMD), dirígete a la carpeta raíz del proyecto y ejecuta el siguiente comando para montar las dependencias como `express`, `cors` y `sqlite3`:
```bash
npm install
```

### 3. Iniciar el Orquestador (Servidor Principal):
Levanta el servidor con el entorno SQLite ejecutando el comando:
```bash
npm start
```
*(Este comando corresponde a `node server_sql.js`, configurado dentro de `package.json`)*.

### 4. Acceder a la Aplicación (Personal de Clínica):
Desde cualquier dispositivo, tablet o PC médico conectado en la misma red Wi-Fi o Ethernet en la clínica, abre el navegador general con esta ruta:
```text
http://172.20.28.28:3001
```

## ⚙️ Especialidades y Mapeo Inteligente

El orquestador inteligente divide dinámicamente el orden del llamado dependiendo de los promedios de tiempo para cada área (por ejemplo, Rayos X tiene una duración evaluada muy distinta a Lentes). Estas son las divisiones:
* **Laboratorio Clínico** (Estándar y Profilaxis COVID-19)
* **Imagenología** (Resonancia Magnética, Tomografía, Ultrasonido, Densitometría Ósea)
* **Cardiología** (Electrocardiograma)
* **Optometría** (Lentes)
* **Ginecología / Mastología** (Papanicolaou, Mastografía)
* **Patología** (Biopsias)
* **Nutrición**

## 📡 Resumen de la API (Endpoints)

La app cuenta de un set de REST APIs expuestas en Express para conectar el frontend del kiosco o dashboard:
* `GET /api/pacientes` - Retorna un arreglo con toda la estructura en cola y activos.
* `POST /api/pacientes` - Crea o recicla (*Upsert*) un registro tomando el Folio como identificador primario. Automáticamente recalcula el triaje.
* `PUT /api/pacientes/folio/:folio` - Endpoint usado por los botones de staff. Actualiza el estado (Status) del paciente (ej: De "espera" a "ocupado") cuidando que los módulos o salas de estudio no se encimen.
* `DELETE /api/pacientes/folio/:folio` - Remueve y retira exitosamente el folio del ecosistema de la base de datos local.

## 📖 Manual de Usuario (Staff Médico)

El flujo de trabajo dentro de la aplicación para el personal clínico consta de operaciones altamente simplificadas:

### 1. Panel de Control (Dashboard)
Al ingresar a la plataforma, se visualizarán todas las tarjetas de pacientes activos organizados en carriles (Línea de Espera, En Módulo, Finalizados):
- **Cola de Espera:** Todos los pacientes listados aquí están ordenados automáticamente con el distintivo de su color de triaje y orden de llegada.
- **Auto-Llamado Automático:** ¡El sistema opera por sí mismo! Si un área (como Ultrasonido) está vacía, jalará al próximo paciente idóneo en espera. Tú sólo supervisas.

### 2. Registrar o Ingresar un Paciente (Upsert)
1. Haz clic en el botón de **"Nuevo Paciente"** o ubica el campo de registro en el formulario lateral (según la vista activa).
2. Proporciona su **Folio** (Este debe ser único e irrepetible para cada día/sesión).
3. Rellena los datos básicos (Nombre, Alergias, Tipo de Sangre).
4. Selecciona el switch de **Con Cita** (Verde) o **Urgente** (Rojo) basándote en la llegada de tu paciente. Si no marcas ninguna será **Amarillo** por defecto.
5. Selecciona la especialidad o **Estudio Requerido** (Múltiples opciones permitidas).
6. Guarda los cambios. El paciente aparecerá automáticamente insertado en la Línea de Espera y será gestionado por el dispensador.

### 3. Interacción Directa en Tarjetas
Dentro de la tarjeta visible del paciente, cuentas con opciones adicionales de atajo:
- **Llamar Forzado a Módulo:** Si detectaste a un paciente en verde pero tiene pase directo, puedes saltarte el despachador automático ingresándolo manualmente a un módulo libre mediante el selector de estado en su tarjeta.
- **Liberar / Finalizar Visita:** Una vez que su paso por todos los módulos requeridos se complete, haz click en el botón "Terminar Turno" o de liberación para retirar la tarjeta de *Ocupado*, dando paso automatizado al siguiente paciente.

---

## 📱 Configuración PWA en Kioscos o Dispositivos Móviles

Dado que Axios es una Progressive Web App (PWA), puedes instalarla a pantalla completa sin los componentes del navegador (barra de búsqueda, ventanas), lo que da un aspecto de aplicación nativa.

### En Tabletas iPad (Safari) o Kioscos Locales:
1. Asegúrate de estar conectado a la misma red de red local y abre el navegador apuntando a `http://172.20.28.28:3001`.
2. Toca el ícono de **Compartir**.
3. Desliza hacia abajo y selecciona **"Agregar a Inicio"** (*Add to Home Screen*).
4. Listo, la aplicación operará a pantalla completa y utilizará el Service Worker (`service-worker.js`) para una experiencia y velocidad maximizada en el entorno local.

---

## 🔧 Archivos de Migración y Mantenimiento

En la raíz se mantuvieron varios archivos generados a lo largo del desarrollo (`fix_db.js`, `safe_ui_removal.js`, `renderer_fix.js`, etc.) resultantes del refactor profundo desde la versión base original (MongoDB) hasta la actual independiente manejada localmente en redes cerradas. Pueden usarse para parches rápidos en caso de emergencia.
