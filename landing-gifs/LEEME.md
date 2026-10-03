# GIFs para la landing

Dos piezas en formato 4:5 (el que mejor se ve en celular), en bucle y con
textos de venta:

| Archivo | Producto | Duración | Peso |
|---|---|---|---|
| `hairline-polvo-canas.gif` | HairLine Shading Powder (cubre canas y entradas) | 7,5 s | 3,1 MB |
| `batana-oil.gif` | Batana Oil | 6,5 s | 3,2 MB |

Cada uno tiene también su versión **MP4** y **WebM** (720×900, 0,8–1,4 MB)
y una imagen `-poster.jpg`.

**Guion del GIF del polvo:** ¿Canas o entradas? → cúbrelas al instante →
antes/después → resultado natural → resiste al agua → producto + "Pídelo aquí ↓".

**Guion del GIF del aceite:** ¿Cabello débil? → prueba esto → aceite de batana
100% puro → más cuerpo y brillo → producto + "Pídelo aquí ↓".

## Cuál usar

- **Recomendado: el MP4/WebM.** Se ve más nítido, pesa 2 a 4 veces menos y
  la página carga más rápido. Una página más rápida suele convertir mejor y
  bajar el CPA.
- **El GIF** sirve donde no se puede pegar código, por ejemplo como imagen del
  producto en Shopify o dentro de la descripción.

## Cómo ponerlo en Shopify

1. **Contenido → Archivos → Subir archivos**: sube el `.mp4`, el `.webm` y el
   `-poster.jpg` del producto. Copia el enlace de cada uno.
2. En tu landing agrega una sección **HTML personalizado** (o un bloque
   *Liquid personalizado*) y pega esto, cambiando los enlaces:

```html
<video autoplay muted loop playsinline preload="metadata"
       poster="URL_DEL_POSTER.jpg"
       style="width:100%;max-width:480px;aspect-ratio:4/5;display:block;margin:0 auto;border-radius:12px">
  <source src="URL_DEL_VIDEO.webm" type="video/webm">
  <source src="URL_DEL_VIDEO.mp4" type="video/mp4">
</video>
```

`muted` y `playsinline` son necesarios para que se reproduzca solo en iPhone.

## Dónde ponerlo

- **Justo arriba o debajo del botón de comprar**, en el primer pantallazo. El
  texto "Pídelo aquí ↓" apunta hacia abajo, así que el botón debe quedar
  debajo del GIF.
- Si tu tienda vende los dos productos, usa cada GIF en la landing de su
  producto.
