// Puntos calientes de las cartas Rider-Waite: [x, y, símbolo, qué significa]. x e y van de 0 a 1 sobre la imagen.
// Los arcanos mayores tienen 3 símbolos clave; los menores, número (o rango) y elemento del palo.
window.SIMBOLOS = (() => {
  const M = {
    m00: [[0.83, 0.30, "La rosa blanca", "Tu intención es limpia. Avanza con el corazón abierto, sin cálculos."], [0.82, 0.67, "El perro fiel", "Tu instinto te avisa. Escúchalo antes de dar el paso."], [0.35, 0.80, "El borde del precipicio", "El salto da miedo porque es nuevo, no porque sea un error."]],
    m01: [[0.47, 0.20, "El infinito", "Tu energía no se agota: lo que empiezas ahora tiene recorrido largo."], [0.18, 0.10, "La varita alzada", "Como es arriba, es abajo: tu idea ya puede tomar forma."], [0.25, 0.58, "La mesa de los 4 elementos", "Ya tienes todas las herramientas. Falta decidir cuál usar primero."]],
    m02: [[0.09, 0.43, "Los pilares B y J", "Estás entre dos fuerzas: lo que sabes y lo que todavía intuyes."], [0.42, 0.58, "El pergamino oculto", "Hay información que aún no se muestra. No firmes nada a ciegas."], [0.53, 0.83, "La luna a sus pies", "Tus sueños y presentimientos traen respuestas esta semana."]],
    m03: [[0.50, 0.13, "La corona de 12 estrellas", "Un ciclo completo florece: cosecharás lo que sembraste con amor."], [0.22, 0.66, "El escudo de Venus", "El amor propio es tu protección. Cuídate como cuidas a otros."], [0.50, 0.88, "El trigo maduro", "Abundancia material en camino si sostienes la constancia."]],
    m04: [[0.15, 0.32, "El cetro con ankh", "Tienes autoridad sobre tu vida. Úsala para poner límites claros."], [0.80, 0.46, "El orbe", "Lo que controlas es tu mundo inmediato. Ordénalo primero."], [0.62, 0.70, "La armadura", "Bajo la firmeza hay protección. No te endurezcas de más."]],
    m05: [[0.50, 0.17, "La triple corona", "Busca una guía con experiencia: maestro, mentor o tradición."], [0.74, 0.30, "El báculo triple", "Las reglas que eliges seguir hoy te dan estructura y paz."], [0.15, 0.75, "Los dos acólitos", "Una enseñanza se comparte. Alguien aprende de tu ejemplo."]],
    m06: [[0.50, 0.18, "El ángel Rafael", "Hay una bendición sobre esta unión o decisión."], [0.07, 0.45, "El árbol con la serpiente", "Una tentación pone a prueba tus valores. Elige con conciencia."], [0.50, 0.73, "La montaña", "El compromiso verdadero es un camino a la cima, no un instante."]],
    m07: [[0.50, 0.08, "El dosel de estrellas", "El cielo respalda tu avance. Es momento de moverte."], [0.50, 0.57, "El disco alado", "Tu voluntad es el motor. Nadie más conduce por ti."], [0.50, 0.74, "Las esfinges blanca y negra", "Dos impulsos opuestos tiran de ti. Domínalos con foco."]],
    m08: [[0.23, 0.22, "El infinito", "Tu fuerza interior se renueva cuando actúas con calma."], [0.35, 0.52, "Las manos sobre el león", "La suavidad doma lo que la fuerza no puede."], [0.55, 0.38, "La guirnalda de flores", "La paciencia amorosa convierte el miedo en aliado."]],
    m09: [[0.13, 0.24, "La linterna", "Una verdad se ilumina cuando te das tiempo a solas."], [0.40, 0.60, "El bastón", "Tu experiencia es tu apoyo. Confía en lo que ya viviste."], [0.50, 0.89, "La cumbre nevada", "Desde la distancia ves con claridad lo que de cerca confunde."]],
    m10: [[0.50, 0.48, "La rueda TARO", "El ciclo gira a tu favor. Lo que estaba quieto empieza a moverse."], [0.43, 0.12, "La esfinge con la espada", "Mantén el equilibrio mientras todo cambia a tu alrededor."], [0.12, 0.11, "Los cuatro seres con libros", "Hay una lección escrita en este giro. Apréndela y avanzas."]],
    m11: [[0.07, 0.25, "La espada de doble filo", "La verdad corta en ambos sentidos: sé honesta también contigo."], [0.85, 0.59, "La balanza", "Cada acción tiene su consecuencia justa. Se equilibran las cuentas."], [0.50, 0.25, "La mirada al frente", "Decide con la cabeza fría. La claridad es tu mejor aliada."]],
    m12: [[0.45, 0.75, "El halo", "Ver la situación al revés te da una iluminación nueva."], [0.42, 0.36, "Las piernas en cruz", "La pausa no es derrota: es entrega consciente."], [0.50, 0.07, "El árbol vivo", "Este tiempo suspendido está echando raíces."]],
    m13: [[0.60, 0.14, "La rosa blanca del estandarte", "Lo que termina deja espacio para algo más puro."], [0.88, 0.38, "El sol entre las torres", "Detrás de este cierre ya amanece un nuevo comienzo."], [0.65, 0.35, "El caballo blanco", "El cambio avanza sin pedir permiso. Fluye con él."]],
    m14: [[0.50, 0.44, "El agua entre las copas", "Mezcla con medida: ni todo ni nada, la dosis justa."], [0.47, 0.85, "Un pie en el agua", "Equilibra lo que sientes con lo que haces."], [0.12, 0.56, "El camino hacia la luz", "La paciencia te lleva a una meta luminosa."]],
    m15: [[0.50, 0.06, "El pentagrama invertido", "Algo material o un deseo está mandando más de la cuenta."], [0.45, 0.70, "Las cadenas flojas", "Puedes quitártelas: la atadura es más hábito que destino."], [0.13, 0.18, "La mano alzada", "Revisa quién o qué te promete placer a cambio de tu libertad."]],
    m16: [[0.85, 0.10, "El rayo", "Una revelación repentina rompe lo que estaba mal construido."], [0.18, 0.05, "La corona que cae", "El orgullo o una idea fija se desmorona para liberarte."], [0.15, 0.55, "Las figuras en caída", "Soltar duele un instante; aferrarse duele más tiempo."]],
    m17: [[0.48, 0.15, "La gran estrella", "La esperanza vuelve. Tu guía interior brilla otra vez."], [0.33, 0.75, "El agua que vierte", "Sanas al dar y recibir. Deja fluir lo que sientes."], [0.90, 0.30, "El pájaro en el árbol", "Un mensaje del alma llega. Presta atención a las señales."]],
    m18: [[0.50, 0.20, "La luna", "No todo es lo que parece. Espera a que se aclare."], [0.40, 0.58, "El perro y el lobo", "Tu lado domesticado y tu lado salvaje piden ser escuchados."], [0.42, 0.82, "El cangrejo del estanque", "Miedos antiguos suben a la superficie para sanar."]],
    m19: [[0.50, 0.17, "El sol radiante", "Claridad y éxito: lo que estaba oculto ahora brilla."], [0.40, 0.67, "El niño en el caballo", "La alegría sencilla te abre puertas. Vuelve a jugar."], [0.25, 0.46, "Los girasoles", "Gira hacia lo que te da vida y crecerás."]],
    m20: [[0.60, 0.51, "La trompeta", "Un llamado despierta tu propósito. Es hora de responder."], [0.25, 0.45, "El estandarte con la cruz", "Haces las paces con el pasado y renaces."], [0.45, 0.68, "Las figuras que se levantan", "Lo que parecía dormido vuelve con fuerza nueva."]],
    m21: [[0.21, 0.46, "Las dos varitas", "Dominas fuerzas opuestas: completas un ciclo con maestría."], [0.08, 0.55, "La guirnalda de laurel", "Victoria y cierre: celebra antes de empezar lo siguiente."], [0.88, 0.86, "Los cuatro seres", "Cuerpo, mente, emoción y espíritu se alinean por fin."]],
  };
  const PALO = {
    c: ["Copas · Agua", "Emociones, vínculos e intuición: el corazón habla en esta posición."],
    p: ["Pentáculos · Tierra", "Dinero, cuerpo y trabajo: lo concreto pide atención aquí."],
    s: ["Espadas · Aire", "Pensamientos, palabras y decisiones: la mente es la protagonista."],
    w: ["Bastos · Fuego", "Pasión, energía y proyectos: tu impulso marca el rumbo."],
  };
  const NUM = { 2: "Dos: una elección o un equilibrio entre dos fuerzas.", 3: "Tres: algo crece y se expresa hacia afuera.", 4: "Cuatro: estabilidad, bases firmes o quietud.", 5: "Cinco: tensión que obliga a cambiar.", 6: "Seis: armonía recuperada, dar y recibir.", 7: "Siete: prueba interior, reflexión antes de actuar.", 8: "Ocho: movimiento, poder y avance.", 9: "Nueve: casi en la meta, resiste un poco más.", 10: "Diez: un ciclo se completa y pide cerrar." };
  const RANGO = { 11: ["La Sota", "Un mensaje o un aprendizaje nuevo empieza."], 12: ["El Caballero", "Acción y movimiento: alguien o algo llega rápido."], 13: ["La Reina", "Madurez emocional: guía desde la empatía."], 14: ["El Rey", "Dominio y responsabilidad: tú pones las reglas."] };
  const AS = { c: [0.50, 0.25], p: [0.60, 0.22], s: [0.50, 0.40], w: [0.55, 0.50] };
  return function (imagen) {
    const m = /\/cartas\/([mcpsw])(\d\d)\.webp$/.exec(imagen || "");
    if (!m) return [];
    const [, p, nn] = m, n = +nn;
    if (p === "m") return M["m" + nn] || [];
    const palo = PALO[p];
    if (n === 1) return [[AS[p][0], AS[p][1], "El As", "Una semilla pura: el comienzo más fuerte del palo."], [0.50, 0.62, palo[0], palo[1]]];
    if (n > 10) return [[0.50, 0.25, RANGO[n][0], RANGO[n][1]], [0.50, 0.62, palo[0], palo[1]]];
    return [[0.50, 0.055, "El número " + n, NUM[n]], [0.50, 0.45, palo[0], palo[1]]];
  };
})();
