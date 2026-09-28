#!/usr/bin/env python3
"""GIF de alta conversion para la landing de Anti-Inflammatea Loose Tea.

Angulo: respuesta al comentario "¿Pero tienes faja puesta?" ->
"No es faja, es que ya no ando inflamada" -> ritual (1 taza despues de comer)
-> ingredientes -> tarjeta de producto con llamada a la compra.

Uso:       python3 generar_gif.py
Requiere:  Pillow y numpy  (pip install Pillow numpy)
Opcional:  pon la foto real del producto como producto.png en esta carpeta
           y se usa en la tarjeta final en lugar del dibujo de la taza.
Salida:    anti-inflammatea.gif, poster.jpg y, si hay ffmpeg con libvpx,
           anti-inflammatea.webm (mismo video, mucho mas liviano).
"""
import math
import os
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTES = os.path.join(AQUI, "fuentes")
W, H = 480, 854
FPS = 12.5  # 80 ms por cuadro

BLANCO = (255, 255, 255)
NEGRO = (0, 0, 0)
AMARILLO = (255, 214, 10)
CURCUMA = (255, 170, 30)
JENGIBRE = (255, 226, 170)
MENTA = (120, 235, 140)
VERDE = (22, 150, 80)
VERDE_OSCURO = (24, 58, 40)
CREMA = (255, 249, 237)

# ---------------------------------------------------------------- guion ----
# Cada escena: fondo (centro x, centro y, zoom sobre la foto original),
# altura del subtitulo y sus lineas; cada palabra con el segundo en que entra
# y, si es palabra clave, su color. ":nombre" es un emoji de fuentes/emoji.
# Los subtitulos van sobre el top rojo: ni tapan la cara ni la cintura (la prueba).
ESCENAS = [
    dict(ini=0.0, fin=1.6, fondo=(0.50, 0.50, 1.00), y=0.56, burbuja=True, tam=56, lineas=[
        [("¿FAJA?", 0.0, AMARILLO), (":risa", 0.55, None)]]),
    dict(ini=1.6, fin=3.0, fondo=(0.42, 0.62, 1.22), y=0.50, burbuja=True, lineas=[
        [("CERO", 1.6, AMARILLO), ("FAJA,", 1.8, None)],
        [("MIRA", 2.15, None), (":ojos", 2.4, None)]]),
    dict(ini=3.0, fin=4.9, fondo=(0.47, 0.52, 1.06), y=0.59, burbuja=True, lineas=[
        [("ES", 3.0, None), ("QUE", 3.15, None), ("YA", 3.3, None), ("NO", 3.45, None)],
        [("ANDO", 3.65, None), ("INFLAMADA", 3.9, AMARILLO)]]),
    dict(ini=4.9, fin=7.0, fondo=(0.45, 0.45, 1.16), y=0.66, burbuja=False, lineas=[
        [("MI", 4.9, None), ("SECRETO:", 5.05, None)],
        [("1", 5.35, AMARILLO), ("TAZA", 5.5, AMARILLO), ("DESPUÉS", 5.8, None)],
        [("DE", 6.0, None), ("COMER", 6.15, None), (":taza", 6.4, None)]]),
    dict(ini=7.0, fin=8.7, fondo=(0.50, 0.50, 1.00), y=0.61, burbuja=False, lineas=[
        [("CÚRCUMA", 7.0, CURCUMA), ("+", 7.3, None)],
        [("JENGIBRE", 7.45, JENGIBRE), ("+", 7.75, None)],
        [("MENTA", 7.9, MENTA), (":hoja", 8.15, None)]]),
    dict(ini=8.7, fin=10.0, fondo=(0.40, 0.70, 1.40), y=0.36, burbuja=False, lineas=[
        [("ADIÓS", 8.7, AMARILLO), ("PANZA", 8.95, None)],
        [("HINCHADA", 9.2, None), (":brillo", 9.45, None)]]),
]
FINAL_INI, FINAL_FIN = 10.0, 13.6  # tarjeta de producto
DURACION = FINAL_FIN

TAM_SUB = 44
ANCHO_SUB = 430


# ------------------------------------------------------------- utilidades ---
_fuentes = {}


def fuente(peso, tam):
    clave = (peso, tam)
    if clave not in _fuentes:
        _fuentes[clave] = ImageFont.truetype(
            os.path.join(FUENTES, "Montserrat-%s.ttf" % peso), tam)
    return _fuentes[clave]


_emojis = {}


def emoji(nombre, tam):
    clave = (nombre, tam)
    if clave not in _emojis:
        ruta = os.path.join(FUENTES, "emoji", nombre + ".png")
        im = Image.open(ruta).convert("RGBA") if os.path.exists(ruta) else None
        if im is not None:
            im.thumbnail((tam, tam), Image.LANCZOS)
        _emojis[clave] = im
    return _emojis[clave]


def suavizar(t):
    """Curva ease-out (0..1)."""
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def rebote(t):
    """Escala tipo 'pop': crece y se asienta (0..1 -> ~1.25..1)."""
    if t >= 1:
        return 1.0
    return 1.0 + 0.25 * (1 - suavizar(t))


# --------------------------------------------------------------- fondo ------
def preparar_base():
    """Foto original sin la burbuja de TikTok, ampliada y con mas nitidez."""
    im = Image.open(os.path.join(AQUI, "fuente.webp")).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    # La burbuja original (x 17-129, y 51-107) se rellena con la pared:
    # interpolacion vertical entre la fila de arriba y la de abajo.
    arriba = a[47:50].mean(axis=0)
    rng = np.random.default_rng(7)
    for x in range(15, 131):
        yb = 107 if x < 60 else 102
        abajo = a[yb:yb + 2, x].mean(axis=0)
        for y in range(50, yb):
            t = (y - 50) / (yb - 50)
            a[y, x] = arriba[x] * (1 - t) + abajo * t + rng.normal(0, 1.2)
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    parche = im.crop((13, 48, 133, 109)).filter(ImageFilter.GaussianBlur(1.2))
    im.paste(parche, (13, 48))
    # Ampliar 4x y dar un poco de punch (color y contraste) para que no se vea lavado.
    im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=3, percent=90, threshold=2))
    im = ImageEnhance.Color(im).enhance(1.12)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    return im


def recorte(base, cx, cy, zoom):
    bw, bh = base.size
    w, h = bw / zoom, bh / zoom
    x0 = min(max(cx * bw - w / 2, 0), bw - w)
    y0 = min(max(cy * bh - h / 2, 0), bh - h)
    return base.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + w, y0 + h))


# -------------------------------------------------------------- textos ------
def texto_con_borde(capa, xy, texto, f, color, borde=5, ancla="mm"):
    """Texto estilo TikTok: relleno, borde negro grueso y sombra suave."""
    sombra = Image.new("RGBA", capa.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).text((xy[0], xy[1] + 3), texto, font=f, fill=(0, 0, 0, 150),
                                stroke_width=borde + 2, stroke_fill=(0, 0, 0, 150), anchor=ancla)
    capa.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(3)))
    ImageDraw.Draw(capa).text(xy, texto, font=f, fill=color + (255,), stroke_width=borde,
                              stroke_fill=NEGRO + (255,), anchor=ancla)


def ancho_palabra(texto, f):
    return f.size * 1.05 if texto.startswith(":") else f.getlength(texto)


def tam_subtitulo(lineas, tam=TAM_SUB):
    """Tamano maximo (hasta tam) con el que todas las lineas caben."""
    while tam > 24:
        f = fuente("Black", tam)
        espacio = f.getlength(" ")
        if all(sum(ancho_palabra(p, f) for p, _, _ in ln) + espacio * (len(ln) - 1) <= ANCHO_SUB
               for ln in lineas):
            break
        tam -= 1
    return tam


def dibujar_subtitulo(capa, escena, t):
    lineas = escena["lineas"]
    tam_base = tam_subtitulo(lineas, escena.get("tam", TAM_SUB))
    f = fuente("Black", tam_base)
    espacio = f.getlength(" ")
    alto_linea = tam_base * 1.2
    y0 = escena["y"] * H - (len(lineas) - 1) * alto_linea / 2
    for n, linea in enumerate(lineas):
        anchos = [ancho_palabra(p, f) for p, _, _ in linea]
        x = (W - sum(anchos) - espacio * (len(linea) - 1)) / 2
        cy = y0 + n * alto_linea
        for (texto, entra, color), a in zip(linea, anchos):
            cx = x + a / 2
            x += a + espacio
            if t < entra:
                continue
            # La primera palabra del GIF ya esta en el cuadro 0 (sirve de portada).
            esc = 1.0 if entra == 0 else rebote((t - entra) / 0.18)
            tam = int(round(tam_base * esc))
            if texto.startswith(":"):
                im = emoji(texto[1:], int(tam * 1.05))
                if im is not None:
                    pos = (int(cx - im.width / 2), int(cy - im.height / 2))
                    sombra = Image.new("RGBA", capa.size, (0, 0, 0, 0))
                    negro = Image.new("RGBA", im.size, (0, 0, 0, 255))
                    negro.putalpha(im.getchannel("A").point(lambda v: v * 0.6))
                    sombra.alpha_composite(negro, (pos[0], pos[1] + 3))
                    capa.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(3)))
                    capa.alpha_composite(im, pos)
            else:
                texto_con_borde(capa, (cx, cy), texto, fuente("Black", tam), color or BLANCO)


def dibujar_burbuja(capa):
    """Sticker de 'respuesta a comentario' como el de TikTok, pero nitido."""
    x, y, w, h = 20, 92, 318, 88
    sombra = Image.new("RGBA", capa.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle((x, y + 4, x + w, y + h + 4), 16, fill=(0, 0, 0, 90))
    capa.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(capa)
    d.rounded_rectangle((x, y, x + w, y + h), 16, fill=BLANCO + (255,))
    d.polygon([(x + 14, y + h - 2), (x + 34, y + h - 2), (x + 12, y + h + 14)], fill=BLANCO + (255,))
    # avatar
    ax, ay, r = x + 32, y + 56, 17
    d.ellipse((ax - r, ay - r, ax + r, ay + r), fill=(233, 84, 84, 255))
    d.ellipse((ax - 6, ay - 11, ax + 6, ay + 1), fill=(255, 225, 225, 255))
    d.pieslice((ax - 12, ay + 2, ax + 12, ay + 26), 180, 360, fill=(255, 225, 225, 255))
    d.text((x + 16, y + 14), "Respondiendo a un comentario", font=fuente("SemiBold", 14),
           fill=(128, 128, 128, 255))
    d.text((x + 58, y + 56), "¿Pero tienes faja puesta?", font=fuente("ExtraBold", 19),
           fill=(22, 22, 22, 255), anchor="lm")


# --------------------------------------------------------- tarjeta final ----
def dibujar_taza(ancho, alto):
    """Ilustracion de una taza de te dorado con cucuma, jengibre y menta."""
    s = 2  # sobremuestreo para bordes suaves
    im = Image.new("RGBA", (ancho * s, alto * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = ancho * s // 2

    def P(x, y):
        return (cx + x * s, y * s)

    # halo
    d.ellipse((*P(-105, 8), *P(105, 218)), fill=(253, 231, 184, 255))
    # vapor
    for dx in (-34, 0, 34):
        pts = [P(dx + 9 * math.sin(k / 3.0 + dx), 70 - k * 3.2) for k in range(0, 17)]
        d.line(pts, fill=(222, 196, 150, 255), width=5 * s, joint="curve")
    # platito
    d.ellipse((*P(-120, 168), *P(120, 206)), fill=(236, 222, 196, 255))
    d.ellipse((*P(-116, 164), *P(116, 200)), fill=(255, 255, 255, 255))
    # asa
    d.ellipse((*P(58, 96), *P(118, 156)), outline=(226, 210, 180, 255), width=16 * s)
    d.ellipse((*P(62, 100), *P(114, 152)), outline=(255, 255, 255, 255), width=9 * s)
    # cuerpo de la taza
    cuerpo = [P(-86 + 30 * (k / 20) ** 2, 88 + 92 * (k / 20)) for k in range(21)]
    cuerpo += [P(86 - 30 * (k / 20) ** 2, 88 + 92 * (k / 20)) for k in range(20, -1, -1)]
    d.polygon(cuerpo, fill=(226, 210, 180, 255))
    cuerpo2 = [(x, y - 2 * s) for x, y in cuerpo]
    d.polygon([(x + (s * 3 if x < cx else -s * 3), y) for x, y in cuerpo2], fill=(255, 255, 255, 255))
    d.ellipse((*P(-40, 172), *P(40, 186)), fill=(238, 226, 204, 255))
    # borde y te
    d.ellipse((*P(-88, 76), *P(88, 102)), fill=(226, 210, 180, 255))
    d.ellipse((*P(-82, 79), *P(82, 99)), fill=(232, 160, 22, 255))
    d.ellipse((*P(-50, 82), *P(22, 92)), fill=(247, 196, 80, 255))
    # rodajas de curcuma
    for x, y, r in ((-150, 176, 22), (-120, 196, 17)):
        d.ellipse((*P(x - r, y - r), *P(x + r, y + r)), fill=(214, 110, 10, 255))
        d.ellipse((*P(x - r + 5, y - r + 5), *P(x + r - 5, y + r - 5)), fill=(250, 150, 20, 255))
        d.ellipse((*P(x - r / 3, y - r / 3), *P(x + r / 3, y + r / 3)), fill=(255, 190, 70, 255))
    # jengibre
    for x, y, rx, ry in ((132, 186, 30, 16), (158, 172, 18, 12), (112, 172, 14, 10)):
        d.ellipse((*P(x - rx, y - ry), *P(x + rx, y + ry)), fill=(222, 186, 128, 255))
    d.ellipse((*P(118, 180), *P(146, 192)), fill=(236, 206, 150, 255))
    # hojas de menta
    for x, y, ang, L in ((142, 124, -35, 34), (156, 146, 15, 26), (-150, 140, 205, 30)):
        a = math.radians(ang)
        ux, uy = math.cos(a), math.sin(a)
        hoja = []
        for k in range(0, 21):
            t = k / 20
            w = math.sin(math.pi * t) * L * 0.42
            hoja.append((x + ux * L * t - uy * w, y + uy * L * t + ux * w))
        for k in range(20, -1, -1):
            t = k / 20
            w = math.sin(math.pi * t) * L * 0.42
            hoja.append((x + ux * L * t + uy * w, y + uy * L * t - ux * w))
        d.polygon([P(px, py) for px, py in hoja], fill=(52, 160, 80, 255))
        d.line([P(x, y), P(x + ux * L * 0.9, y + uy * L * 0.9)], fill=(150, 220, 150, 255), width=2 * s)
    return im.resize((ancho, alto), Image.LANCZOS)


def imagen_producto(ancho, alto):
    ruta = os.path.join(AQUI, "producto.png")
    if os.path.exists(ruta):
        im = Image.open(ruta).convert("RGBA")
        im.thumbnail((ancho, alto), Image.LANCZOS)
        lienzo = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
        lienzo.alpha_composite(im, ((ancho - im.width) // 2, (alto - im.height) // 2))
        return lienzo
    return dibujar_taza(ancho, alto)


def centrar(d, y, texto, f, color):
    d.text((W / 2, y), texto, font=f, fill=color + (255,), anchor="mm")


def tarjeta_estatica():
    """Tarjeta de producto (sin el boton, que late aparte)."""
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x0, y0, x1, y1 = 30, 150, W - 30, 742
    sombra = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle((x0, y0 + 8, x1, y1 + 8), 30, fill=(0, 0, 0, 120))
    capa.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(capa)
    d.rounded_rectangle((x0, y0, x1, y1), 30, fill=CREMA + (255,))
    capa.alpha_composite(imagen_producto(380, 220), ((W - 380) // 2, y0 + 12))
    y = y0 + 262
    titulo = fuente("Black", 40)
    while titulo.getlength("Anti-Inflammatea") > (x1 - x0) - 36:
        titulo = fuente("Black", titulo.size - 1)
    centrar(d, y, "Anti-Inflammatea", titulo, VERDE_OSCURO)
    centrar(d, y + 34, "LOOSE TEA  ·  TÉ DE HOJAS SUELTAS", fuente("ExtraBold", 13), (150, 120, 60))
    for n, linea in enumerate(("Cúrcuma, jengibre y menta para", "apoyar tu digestión y calmar",
                               "la hinchazón después de comer")):
        centrar(d, y + 72 + n * 25, linea, fuente("SemiBold", 18), (60, 70, 62))
    # sellos
    sellos = ("Orgánico", "Sin cafeína", "40-50 tazas")
    f = fuente("ExtraBold", 14)
    anchos = [f.getlength(s) + 44 for s in sellos]
    sep = 8
    x = (W - sum(anchos) - sep * (len(sellos) - 1)) / 2
    ys = y + 162
    for s_, a in zip(sellos, anchos):
        d.rounded_rectangle((x, ys, x + a, ys + 34), 17, fill=(232, 244, 234, 255),
                            outline=(170, 212, 180, 255), width=2)
        cx, cy = x + 17, ys + 17
        d.ellipse((cx - 9, cy - 9, cx + 9, cy + 9), fill=VERDE + (255,))
        d.line([(cx - 4, cy), (cx - 1, cy + 4), (cx + 5, cy - 4)], fill=BLANCO + (255,), width=3)
        d.text((x + 32, cy), s_, font=f, fill=VERDE_OSCURO + (255,), anchor="lm")
        x += a + sep
    return capa


def dibujar_boton(capa, t):
    """Boton 'PIDELO HOY' que late y flecha que rebota hacia el boton real de la landing."""
    fase = (t * 1.25) % 1.0  # un latido cada 0.8 s
    esc = 1.0 + 0.06 * math.sin(math.pi * min(fase / 0.5, 1.0))
    bw, bh = 330 * esc, 66 * esc
    cx, cy = W / 2, 672
    sombra = Image.new("RGBA", capa.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle((cx - bw / 2, cy - bh / 2 + 6, cx + bw / 2, cy + bh / 2 + 6),
                                             bh / 2, fill=(10, 90, 45, 140))
    capa.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(capa)
    d.rounded_rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), bh / 2, fill=VERDE + (255,))
    d.text((cx, cy + 1), "PÍDELO HOY", font=fuente("Black", int(round(28 * esc))),
           fill=BLANCO + (255,), anchor="mm")
    # flecha hacia abajo
    dy = 7 * math.sin(2 * math.pi * fase)
    for k in range(2):
        yy = 770 + k * 16 + dy
        d.line([(cx - 18, yy), (cx, yy + 14), (cx + 18, yy)], fill=AMARILLO + (255,), width=7, joint="curve")


def capa_final(t, tarjeta):
    """Tarjeta final completa en el segundo t (desde FINAL_INI)."""
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    entra = suavizar(t / 0.4)
    titular = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    texto_con_borde(titular, (W / 2, 62), "NO ES FAJA,", fuente("Black", 40), BLANCO)
    texto_con_borde(titular, (W / 2, 110), "ES MI TÉ", fuente("Black", 46), AMARILLO)
    capa.alpha_composite(titular)
    desplazada = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    desplazada.alpha_composite(tarjeta, (0, int((1 - entra) * 260)))
    if entra >= 1:
        dibujar_boton(desplazada, t)
    capa.alpha_composite(desplazada)
    if entra >= 1:
        ImageDraw.Draw(capa).text((W / 2, 832), "Testimonio personal · Los resultados pueden variar",
                                  font=fuente("SemiBold", 12), fill=(255, 255, 255, 200), anchor="mm")
    return capa


# ------------------------------------------------------------- render -------
def escena_en(t):
    for e in ESCENAS:
        if e["ini"] <= t < e["fin"]:
            return e
    return None


def construir():
    base = preparar_base()
    fondo_final = recorte(base, 0.5, 0.5, 1.0).filter(ImageFilter.GaussianBlur(9))
    fondo_final = Image.alpha_composite(fondo_final.convert("RGBA"),
                                        Image.new("RGBA", (W, H), (18, 12, 6, 125))).convert("RGB")
    tarjeta = tarjeta_estatica()
    burbuja = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dibujar_burbuja(burbuja)

    fondos = {}
    cuadros = []  # (clave del fondo, capa RGBA)
    n = int(round(DURACION * FPS))
    for i in range(n):
        t = i / FPS
        e = escena_en(t)
        capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if e is None:
            clave = "final"
            fondos.setdefault(clave, fondo_final)
            capa = capa_final(t - FINAL_INI, tarjeta)
        else:
            cx, cy, z = e["fondo"]
            # Cortes secos con cambio de zoom (jump cut): cada corte es un cuadro
            # completo en el GIF, asi que no se anima el zoom para no inflar el peso.
            clave = (cx, cy, z)
            if clave not in fondos:
                fondos[clave] = recorte(base, cx, cy, z)
            if e["burbuja"]:
                capa.alpha_composite(burbuja)
            dibujar_subtitulo(capa, e, t)
        cuadros.append((clave, capa))
    return fondos, cuadros


def paleta_global(fondos, cuadros):
    """256 colores: 192 para la foto y 64 para textos, tarjeta y boton."""
    muestras = [im.resize((W // 2, H // 2)) for im in fondos.values()]
    foto = Image.new("RGB", (W // 2 * len(muestras), H // 2))
    for i, im in enumerate(muestras):
        foto.paste(im, (i * (W // 2), 0))
    pal_foto = foto.quantize(192, method=Image.Quantize.MEDIANCUT).getpalette()[:192 * 3]

    pix = []
    for clave, capa in cuadros[::6]:
        comp = Image.alpha_composite(fondos[clave].convert("RGBA"), capa)
        pix.append(np.asarray(comp)[..., :3][np.asarray(capa)[..., 3] > 0][::7])
    pix = np.concatenate(pix)
    lado = int(math.ceil(math.sqrt(len(pix))))
    relleno = np.full((lado * lado, 3), 255, np.uint8)
    relleno[:len(pix)] = pix
    ui = Image.fromarray(relleno.reshape(lado, lado, 3))
    pal_ui = ui.quantize(64, method=Image.Quantize.MEDIANCUT).getpalette()[:64 * 3]

    pal = Image.new("P", (1, 1))
    pal.putpalette(pal_foto + pal_ui)
    return pal


def cuantizar(fondos, cuadros, pal):
    """Una sola paleta y sin tramado: lo que no cambia entre cuadros queda
    identico, y el GIF solo guarda lo que se mueve (subtitulos, boton)."""
    salida = []
    for clave, capa in cuadros:
        comp = Image.alpha_composite(fondos[clave].convert("RGBA"), capa).convert("RGB")
        salida.append((comp.quantize(palette=pal, dither=Image.Dither.NONE), comp))
    return salida


def exportar_webm(rgb, ruta):
    """Mismo video en WebM (VP8): pesa una fraccion del GIF."""
    ffmpeg = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if not ffmpeg:
        return False
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS),
           "-c:v", "mjpeg", "-i", "pipe:0", "-c:v", "libvpx", "-b:v", "900k", "-crf", "10",
           "-auto-alt-ref", "0", "-an", ruta]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for im in rgb:
            im.save(proc.stdin, "JPEG", quality=95)
        proc.stdin.close()
    except BrokenPipeError:
        pass
    return proc.wait() == 0


def main():
    fondos, cuadros = construir()
    pal = paleta_global(fondos, cuadros)
    frames = cuantizar(fondos, cuadros, pal)
    gif = [f for f, _ in frames]
    rgb = [c for _, c in frames]
    ms = int(round(1000 / FPS))
    ruta_gif = os.path.join(AQUI, "anti-inflammatea.gif")
    gif[0].save(ruta_gif, save_all=True, append_images=gif[1:], duration=ms, loop=0,
                optimize=False, disposal=1)
    rgb[0].save(os.path.join(AQUI, "poster.jpg"), quality=88)
    print("GIF: %s (%.0f KB, %d cuadros, %.1f s)" % (
        ruta_gif, os.path.getsize(ruta_gif) / 1024, len(gif), DURACION))
    ruta_webm = os.path.join(AQUI, "anti-inflammatea.webm")
    if exportar_webm(rgb, ruta_webm):
        print("WebM: %s (%.0f KB)" % (ruta_webm, os.path.getsize(ruta_webm) / 1024))


if __name__ == "__main__":
    main()
