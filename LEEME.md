# Salvar Clientes

A quién estás perdiendo ahora mismo, por qué, y qué le dices hoy.

Control de Negocio lleva el negocio y Clientes y Cobranza lleva la cartera: las dos miran **lo que
te deben**. Ninguna mira lo contrario — **lo que le debes tú al cliente** — y ahí es donde se pierde
la gente:

- el que pagó un adelanto hace un mes y su pedido sigue sin salir,
- el que recibió un producto distinto al que compró,
- el que rechazó la entrega y nadie volvió a escribirle.

Esos tres no salen en ninguna lista, porque no son un número que falte: son un número que **ya
cobraste**.

---

## Cómo se abre

- `Abrir Salvar Clientes.bat` — o el acceso directo **Salvar Clientes** del escritorio.
- **El caso de hoy** (otro acceso directo) abre derecho en la pantalla del caso.
- El `.bat` acepta un número de sección: `0` En peligro, `1` El caso, `2` Todos los casos,
  `3` Mal envío, `4` Mensajes, `5` Resumen.
- Usa el JRE que trae ControlNegocio al lado; si no está, el Java del sistema.
- Para recompilar después de tocar el código: `compilar.bat`.

---

## Las seis pantallas

### 1. En peligro
La lista, con **un punto que late** al lado de cada cliente:

| punto | qué significa | cuándo |
|---|---|---|
| rojo, rápido | Crítico | hoy |
| ámbar, lento | Alto | esta semana |
| terracota, fijo | Medio | tenerlo a la vista |

El movimiento se guarda para lo que de verdad hay que atender hoy. Una columna de colores fijos se
vuelve papel tapiz a los dos días; un punto que late no se puede ignorar. Y la **velocidad** también
dice el nivel, así que no depende solo de distinguir el rojo del ámbar.

Botón **"Por qué está en peligro"**: enseña las señales una por una con sus puntos. El número se
puede discutir, que es como tiene que ser.

### 2. El caso
Un caso a pantalla completa, no un diálogo. Un mal envío no se mira: se trabaja, y hay que tener
delante a la vez qué compró, qué llegó, la diferencia, las tres salidas con su cifra y todo lo que
ya se le dijo.

- **Qué pasó** — lo que compró / lo que llegó, uno al lado del otro, y la diferencia en grande.
- **Las salidas que le puedes dar** — las mismas tres del mensaje de WhatsApp, con las mismas
  cifras. Pulsar una no manda nada: deja el acuerdo escrito y mueve el caso a "Acordado".
- **El pedido** — los datos reales del archivo compartido.
- **Qué se ha hecho** — la bitácora, que es lo que evita prometerle dos cosas distintas en dos días.

### 3. Todos los casos
Los rescates abiertos arriba y, dentro de esos, los que llevan más días parados. Un caso abierto que
nadie toca hace tres días late en rojo aunque el pedido esté impecable: el que se enfría ahí es el
cliente al que le prometiste algo.

### 4. Mal envío
Solo los de producto equivocado. **"Vale lo que llegó"** es el precio real de lo que recibió, no lo
que pagó: la resta entre las dos columnas es lo único que hay que discutir con él, y es la cifra que
sale en el mensaje sin tener que calcularla a mano.

### 5. Mensajes
El WhatsApp ya escrito, con las cifras de ese cliente puestas. Tres reglas que los textos cumplen
siempre:

1. **Ninguna frase con un hueco que rellenar.** El plazo se elige en el desplegable ("lo cumplo hoy
   mismo / mañana / en 24 horas") y el texto sale completo. Un mensaje con corchetes se manda con
   corchetes.
2. **Ninguna promesa que la app no pueda sostener.** No inventa guías ni fechas de llegada que
   dependen de la agencia. Promete solo lo que depende de ti: cuándo despachas, cuándo devuelves.
3. **Siempre una salida para el cliente**, y en los graves una es que le devuelvas su plata. El que
   no la ve ofrecida la pide igual, pero ya enojado y contándoselo a otros.

Sin emoji: un "¡Hola! 😊" encima de un reclamo por producto equivocado suena a que no te lo estás
tomando en serio.

### 6. Resumen
Cuánta plata está en juego, cuántos se salvaron y de qué se está perdiendo gente.

---

## Qué toca de tus archivos y qué no

Lee de la **misma carpeta** del negocio que usan las otras dos apps
(`ControlNegocio\data\clientes\pideseguroperu-a9a0764e\`).

| archivo | qué hace esta app |
|---|---|
| `clientes_tienda.csv` | **lee** siempre. Solo escribe en dos casos, los dos a mano y avisando: actualizar el estado del envío, y **añadir** una línea de reclamo a las notas del pedido (nunca sustituye las que ya hay: ahí están las claves de recojo). |
| `rescates_clientes.csv` | **suyo**. Aquí viven los casos. Es un archivo nuevo en esa carpeta; Control de Negocio ni se entera, porque solo abre los nombres que conoce. |
| `fotos_rescates\<caso>\` | **suyo**. Las fotos de lo que llegó. |
| `actividad_reciente.csv` | deja anotado lo que hizo, en el mismo feed que lee la app grande. |

**No toca el dinero.** No cambia `montoPagado`, ni `montoTotal`, ni `ventaConfirmada`, ni siquiera
cuando un rescate acaba en devolución del abono: esa plata la lleva Control de Negocio y moverla
desde aquí le descuadraría la ganancia del día. El caso guarda cuánto se devolvió; el ajuste
contable se hace donde corresponde.

**Por qué los casos no son dos columnas más en `clientes_tienda.csv`:** ese archivo es un contrato.
Control de Negocio lo lee partiendo por comas y contando posiciones. Meterle una columna haría que
la app grande leyera los pedidos **con las columnas corridas** — y no fallaría con un error, que
sería lo cómodo: enseñaría el teléfono en la columna del monto y seguiría como si nada.

---

## El motor de riesgo

Ninguna columna del archivo dice "este cliente se está yendo". Lo que hay son hechos sueltos que por
separado parecen normales. El motor los junta y les pone peso:

| señal | peso |
|---|---|
| Caso abierto de producto equivocado | 60 |
| Nunca llegó | 55 |
| Pagó **todo** y no ha salido | 45 + 1 por día (tope 30) |
| Rechazó la entrega | 50 (+10 si ya había pagado) |
| Dio **adelanto** y no ha salido | 30 + 1 por día (tope 30) |
| El envío lleva 7+ días sin moverse | 20 + días (tope 25) |
| El caso lleva días sin moverse | hasta 20 |
| Entregado y todavía debe | 12 |
| Sin número para escribirle | 8 |
| Ya te había comprado antes | 10 |

Cortes: **70 o más es crítico, 45 es alto, 20 es medio.**

Por qué puntos y no una regla sola: "sin enviar hace más de 7 días" marca igual al que no ha pagado
nada que al que ya te dio S/ 20 de su bolsillo, y no son el mismo problema. El primero es una venta
que todavía no es tuya; el segundo es plata ajena en tu cuenta sin nada a cambio.

**Lo que el motor NO hace:** adivinar que llegó un producto equivocado. Eso no está en ningún dato —
el pedido dice qué se compró, no qué se entregó. El motor marca al cliente por lo que sí puede ver, y
el *qué llegó de verdad* lo aporta el caso que abres a mano.

---

## Lo que ya está dentro

El caso real de **Cesar Cruz Rojas** (2026-10-01):

- Compró 3 linternas tácticas · le entregaron **3 Linterna Power Style de S/ 49** (S/ 147 en total).
- Pagó S/ 20 de adelanto el 30 de agosto y el pedido **seguía sin salir** 32 días después.
- Sale **crítico, 100 de 100** — el primero de la lista.

**Ojo con una cifra:** el caso quedó registrado con S/ 209 cobrados porque esa es la cifra que se
manejó al hablar de él, pero `clientes_tienda.csv` dice **S/ 199**. La app te lo avisa en la pantalla
del caso con un botón para cuadrarlo de un clic. Mientras no se cuadre, la diferencia que calcula es
S/ 62; con los S/ 199 del archivo serían **S/ 52**. Antes de devolverle nada, decide cuál es la
buena.

---

## Lo que no resuelve

- **Dos apps editando el mismo pedido en el mismo minuto.** Gana quien guarde último, como en
  cualquier archivo compartido. Todo lo demás sí está cubierto: cada escritura relee el disco, aplica
  el cambio por id y guarda con `ArchivoSeguro` (escribe a un temporal y lo pone en su sitio de un
  solo movimiento), así que nunca se pierde lo que las otras apps escribieron mientras esta estaba
  abierta.
- **No manda WhatsApp solo.** Abre el chat con el mensaje escrito; el botón de enviar lo pulsas tú.
  A propósito: un mensaje de disculpa que se manda sin que nadie lo lea es la forma más rápida de
  empeorar un reclamo.
