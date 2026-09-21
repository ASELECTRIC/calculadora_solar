# AS Electric · Calculadora solar

Calculadora web estática para predimensionar paneles y strings en instalaciones de bombeo solar con variadores VEICHI SI23. No necesita Node.js, base de datos ni proceso de compilación en producción.

## Estructura

```text
as-electric-calculadora-solar/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── calculadora.js
│   ├── solar.js
│   └── perfiles.js
├── data/
│   ├── provincias.json
│   ├── perfiles-solares.json
│   └── configuracion.json
└── README.md
```

## Despliegue en un VPS

1. Descomprime el ZIP.
2. Copia el contenido de la carpeta `as-electric-calculadora-solar` al directorio público de tu servidor, por ejemplo `/var/www/as-electric-calculadora-solar`.
3. Configura Nginx o Apache para servir `index.html`.
4. Accede mediante HTTP o HTTPS.

Ejemplo mínimo de Nginx:

```nginx
server {
    listen 80;
    server_name calculadora.ejemplo.com;
    root /var/www/as-electric-calculadora-solar;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Para probarla localmente:

```bash
cd as-electric-calculadora-solar
python3 -m http.server 8080
```

Abre `http://localhost:8080`. No abras directamente `index.html` con `file://`, porque los módulos JavaScript y los archivos JSON deben cargarse desde un servidor HTTP.

## Archivos de datos

- `data/configuracion.json`: ajustes generales, catálogo de variadores y catálogo de placas.
- `data/perfiles-solares.json`: irradiancia media mensual para las franjas 08:30, 10:00, 11:30, 15:00, 16:30 y 18:00.
- `data/provincias.json`: índice de perfiles y coordenadas para facilitar futuras ampliaciones.

Los JSON simulan una base de datos y permiten ampliar el catálogo sin modificar la lógica principal. Conserva los mismos nombres de propiedades al añadir equipos o perfiles.

## Organización del JavaScript

- `js/app.js`: interfaz, eventos y presentación de resultados.
- `js/calculadora.js`: conversiones, selección del SI23 y dimensionado eléctrico.
- `js/solar.js`: tabla horaria y tarjetas de resultados.
- `js/perfiles.js`: carga y combinación de los archivos JSON.

## Criterio de cálculo

La configuración base dimensiona los strings en paralelo para cubrir la potencia DC estimada a las 15:00. La configuración ampliada añade o quita strings para intentar cubrir esa misma potencia a las 08:30, manteniendo las placas en serie según los límites de tensión. La tabla compara ambas configuraciones en las seis franjas horarias.

Esta aplicación es una herramienta orientativa de predimensionamiento. Antes de ejecutar una instalación deben verificarse las fichas técnicas vigentes, la corriente DC admisible, las protecciones, el cableado, la temperatura, las sombras y las condiciones reales del emplazamiento.
