import { useState, useEffect, useMemo, useRef, useCallback } from "react";
// recharts only used for bar charts; radar replaced with custom SVG (no key collisions)
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ArrowLeft, Eye, EyeOff, LogOut, Send, ChevronRight, Lock, CheckCircle, AlertTriangle, Volume2, VolumeX, Zap, Clock, Loader2 } from "lucide-react";
import { supabase, getProfile, upsertProfile, updateXP } from "../lib/supabase";
import type { Profile } from "../lib/supabase";

// ─── GenCase type ─────────────────────────────────────────────────────────────
interface GenCase {
  id:string; title:string; objective:string; scenario:string;
  questions:string[]; evaluation:string; tips:string;
  worldId:string; worldName:string; worldEmoji:string;
  difficulty:string; targetId:string; targetName:string;
  xp:number; duration:string; createdAt:string;
}

// ─── AI Case Generator Engine ─────────────────────────────────────────────────
const CASE_BANK: Record<string, Record<string, Omit<GenCase,"id"|"worldId"|"worldName"|"worldEmoji"|"difficulty"|"targetId"|"targetName"|"createdAt">[]>> = {
  com: {
    Básico:[
      { title:"El mensaje que no llegó",objective:"Desarrollar claridad y precisión al comunicar ideas por escrito.",scenario:"Daniela le pide a su compañero que traiga el proyecto grupal mañana. Él lo entiende diferente y el proyecto llega incompleto. En esta simulación el estudiante debe redactar el mensaje original de Daniela de forma clara y sin ambigüedad para que no haya malentendidos.",questions:["¿Qué información faltó en el mensaje original?","¿Cómo cambia el significado según el canal de comunicación?","¿Cuándo es mejor hablar en persona en lugar de escribir?","¿Qué palabras concretas evitan interpretaciones erróneas?"],evaluation:"El estudiante redacta dos versiones del mensaje (ambigua vs clara) y explica con 3 criterios cuál es más efectiva.",tips:"Pídele al estudiante que lea ambos mensajes en voz alta antes de elegir.",xp:80,duration:"10 min" },
    ],
    Intermedio:[
      { title:"El malentendido digital",objective:"Resolver un conflicto causado por comunicación digital sin contexto emocional.",scenario:"Valentina recibe este mensaje de su compañero de proyecto: 'Así no va a funcionar'. Sin tono, sin contexto. Se siente atacada. Antes de responder, debe analizar múltiples interpretaciones del mensaje y elegir la respuesta más asertiva.",questions:["¿Cuántas interpretaciones posibles tiene el mensaje original?","¿Qué información adicional necesitarías antes de responder?","¿Cómo redactarías el mensaje del compañero para que no fuera ambiguo?","¿Cuál es la diferencia entre reaccionar y responder?"],evaluation:"El estudiante escribe 3 posibles respuestas con diferente tono y justifica cuál usaría y por qué.",tips:"Invítalo a leer el mensaje como si viniera de alguien que lo aprecia vs alguien que lo critica.",xp:140,duration:"12 min" },
      { title:"Presentación sin preparación",objective:"Practicar la comunicación oral efectiva bajo presión de tiempo.",scenario:"Marcos tiene 5 minutos antes de presentar y su compañero le avisa que la mitad del material se perdió. Solo tiene sus notas incompletas y debe hablar durante 8 minutos ante el grupo. El estudiante debe decidir cómo estructurar el tiempo con lo que tiene.",questions:["¿Cuál es la información más importante a priorizar?","¿Cómo puedes usar preguntas al público para ganar tiempo y contenido?","¿Qué técnicas de apertura generan atención sin necesitar mucho material?","¿Cómo terminas de forma contundente aunque el contenido sea incompleto?"],evaluation:"El estudiante diseña el esquema de 8 minutos con los 3 puntos más importantes y una apertura y cierre creativos.",tips:"Cronometra cada sección con el estudiante en tiempo real para que sienta la presión.",xp:155,duration:"14 min" },
    ],
    Avanzado:[
      { title:"La audiencia hostil",objective:"Mantener la comunicación asertiva ante un público crítico y desafiante.",scenario:"Sofía presenta su propuesta de proyecto ante un comité que ya decidió rechazarla antes de escucharla. En la primera pregunta, un miembro la interrumpe y dice que su idea 'no tiene sentido en el mundo real'. El estudiante debe manejar la hostilidad sin perder la compostura ni el hilo argumentativo.",questions:["¿Cómo respondes a una crítica antes de que termines de hablar?","¿Qué diferencia hay entre defender tu idea y imponer tu idea?","¿Cuándo vale la pena cambiar de postura durante una presentación?","¿Cómo recuperas la atención del grupo después de una interrupción?"],evaluation:"El estudiante desarrolla 4 respuestas asertivas ante las 4 objeciones más comunes y las jerarquiza por efectividad.",tips:"Haz roleplay: tú actúas como el comité hostil y el estudiante practica las respuestas en tiempo real.",xp:260,duration:"18 min" },
    ],
  },
  fin: {
    Básico:[
      { title:"El dinero del recreo",objective:"Tomar decisiones básicas de presupuesto y distinguir necesidades de deseos.",scenario:"Carlos recibe 50 pesos para el recreo durante 5 días. El lunes gasta todo en dulces. El martes no tiene para almorzar. El estudiante debe ayudar a Carlos a diseñar un presupuesto semanal que cubra lo necesario y aún deje algo para lo que disfruta.",questions:["¿Cuál es la diferencia entre una necesidad y un capricho?","¿Cómo distribuirías los 50 pesos en los 5 días?","¿Qué pasaría si Carlos ahorra 5 pesos cada día durante un mes?","¿Conoces alguna técnica sencilla para no gastar más de lo que tienes?"],evaluation:"El estudiante crea una tabla de presupuesto semanal de 50 pesos con columnas de necesidades, deseos y ahorro.",tips:"Usa billetes de papel para que el ejercicio sea visual y concreto.",xp:90,duration:"8 min" },
    ],
    Intermedio:[
      { title:"El emprendimiento del kiosco",objective:"Aplicar conceptos de costos, ganancias e inversión en un caso real.",scenario:"Valentina quiere poner un kiosco de limonadas en el recreo. Tiene 200 pesos de inversión inicial. Calcula que cada limonada cuesta 12 pesos producirla y puede venderla a 20. Pero su compañera le ofrece hacerle publicidad a cambio del 10% de las ganancias. El estudiante debe decidir si acepta.",questions:["¿Cuántas limonadas necesita vender para recuperar la inversión?","¿Cuánto ganaría al día con y sin el acuerdo de publicidad?","¿Qué otros costos no visibles podría tener el negocio?","¿Cuándo conviene crecer rápido vs crecer sin deudas?"],evaluation:"El estudiante desarrolla un análisis de punto de equilibrio y proyección de ganancia a 2 semanas con y sin el acuerdo.",tips:"Añade una variable sorpresa: un día llueve y no puede vender. ¿Cómo afecta esto su plan?",xp:190,duration:"15 min" },
    ],
    Avanzado:[
      { title:"La crisis del presupuesto familiar",objective:"Analizar una situación financiera compleja y proponer soluciones con criterio.",scenario:"La familia de Andrés enfrenta una reducción del 30% en sus ingresos por 3 meses. Deben mantener: renta, alimentación, colegio y servicios. El estudiante recibe una tabla de gastos reales y debe proponer un plan de ajuste sin eliminar lo esencial, priorizando con criterio y negociando opciones.",questions:["¿Qué gastos son fijos y cuáles variables en esta tabla?","¿Cuáles cortarías primero y cuáles serían los últimos?","¿Qué opciones existen para reducir costos sin eliminar calidad de vida?","¿Cómo afecta esta crisis el bienestar emocional de la familia?"],evaluation:"El estudiante entrega un presupuesto ajustado con justificación de cada decisión y una estrategia de recuperación a 3 meses.",tips:"Conecta este caso con la situación económica real del país para darle contexto.",xp:275,duration:"20 min" },
    ],
  },
  tea: {
    Básico:[
      { title:"El trabajo de todos vs el trabajo de uno",objective:"Identificar y practicar la distribución equitativa de roles en un equipo.",scenario:"En un proyecto grupal de 4 personas, siempre es Valentina quien hace todo porque 'es más rápido hacerlo sola'. El grupo entregó bien pero Valentina está agotada y resentida. El estudiante debe rediseñar cómo funciona este equipo.",questions:["¿Qué les faltó acordar al principio del proyecto?","¿Qué tiene que hacer Valentina diferente la próxima vez?","¿Cómo establecerías roles claros para un equipo de 4?","¿Cuándo es válido hacer el trabajo de otro y cuándo no?"],evaluation:"El estudiante diseña un acta de equipo con roles, responsabilidades y criterio de calidad para el trabajo de cada miembro.",tips:"Pregúntale si alguna vez fue Valentina en un proyecto grupal.",xp:100,duration:"9 min" },
    ],
    Intermedio:[
      { title:"Dos líderes, un equipo",objective:"Gestionar el conflicto de liderazgo dentro de un equipo de trabajo.",scenario:"Lucas y Sofía ambos creen ser los líderes naturales del equipo. Proponen estrategias opuestas para el mismo proyecto. El equipo está paralizado porque nadie sabe a quién seguir. Quedan 2 días para la entrega.",questions:["¿Qué estrategia usarías para desbloquear al equipo?","¿Cómo decides entre dos propuestas igualmente válidas?","¿Qué diferencia hay entre tener razón y lograr que el equipo avance?","¿Cómo evitas que este conflicto afecte la relación después del proyecto?"],evaluation:"El estudiante propone un proceso de toma de decisión para el equipo (votación, criterios, mediación) y lo aplica al conflicto real.",tips:"Este caso es ideal para discutir en grupo después de la simulación individual.",xp:175,duration:"13 min" },
    ],
    Avanzado:[
      { title:"La entrega imposible",objective:"Liderar un equipo bajo presión extrema de tiempo con recursos limitados.",scenario:"El cliente cambió los requerimientos del proyecto 24 horas antes de la entrega. El equipo tiene 3 integrantes y uno está enfermo. El estudiante debe re-planificar, reasignar tareas y comunicar al cliente la nueva situación sin perder la relación.",questions:["¿Cuál es lo primero que haces en las próximas 2 horas?","¿Cómo priorizas qué se entrega y qué queda pendiente?","¿Cómo comunicas al cliente el cambio sin dañar la confianza?","¿Qué aprendes de esta situación para el próximo proyecto?"],evaluation:"El estudiante entrega un plan de acción de 24 horas con tareas, responsables y el borrador del mensaje al cliente.",tips:"Pon un cronómetro en la sesión para simular la presión real de tiempo.",xp:270,duration:"20 min" },
    ],
  },
  pen: {
    Básico:[
      { title:"¿Esto es verdad?",objective:"Desarrollar habilidades básicas de verificación de información.",scenario:"Carolina recibe por WhatsApp un video viral que dice que cierta fruta cura el cáncer. Sus padres ya la compraron. El estudiante debe guiar a Carolina para verificar si la información es confiable antes de compartirla.",questions:["¿Qué fuentes consultarías para verificar esta información?","¿Qué señales te indican que una fuente es confiable?","¿Por qué la gente comparte información sin verificarla?","¿Cómo le explicarías a un adulto que algo es falso sin ofenderlo?"],evaluation:"El estudiante crea un checklist de 5 preguntas para verificar cualquier información antes de creerla o compartirla.",tips:"Trae un ejemplo de noticia falsa real para que el proceso sea concreto.",xp:95,duration:"8 min" },
    ],
    Intermedio:[
      { title:"El debate de los dos lados",objective:"Construir argumentos para posiciones contrarias a la propia para comprender la complejidad.",scenario:"Mateo está convencido de que los teléfonos deberían prohibirse en las escuelas. El estudiante debe construir el argumento más fuerte posible A FAVOR del uso del teléfono en clase (aunque no esté de acuerdo) usando solo evidencia real.",questions:["¿Qué datos encontraste que no esperabas?","¿Cambió algo tu opinión después de hacer este ejercicio?","¿Cuál es la diferencia entre un hecho y una opinión?","¿Por qué es importante entender el argumento opuesto?"],evaluation:"El estudiante presenta 3 argumentos fundamentados a favor del uso del teléfono con fuentes reales citadas.",tips:"Haz que el estudiante defienda primero su posición original y luego la contraria. Luego compara.",xp:180,duration:"14 min" },
    ],
    Avanzado:[
      { title:"El dilema del whistleblower",objective:"Analizar dilemas éticos complejos donde los valores entran en conflicto.",scenario:"Isabela descubre que su mejor amiga está copiando en todos los exámenes. Si lo reporta, pierde la amistad y quizás se gana enemigos. Si no lo hace, es cómplice de algo que considera injusto. No hay respuesta correcta simple.",questions:["¿Qué valores están en conflicto en esta situación?","¿Qué harías y qué argumentos sostienen tu decisión?","¿Cambia tu respuesta si sabes que tu amiga lo necesita para no reprobar?","¿Qué consecuencias tiene cada opción a corto y largo plazo?"],evaluation:"El estudiante escribe un análisis ético de 3 párrafos: los valores en conflicto, su decisión justificada y las consecuencias previstas.",tips:"No hay respuesta correcta. Evalúa la calidad del razonamiento, no la decisión en sí.",xp:270,duration:"18 min" },
    ],
  },
  lid: {
    Básico:[
      { title:"El grupo sin dirección",objective:"Identificar las características básicas de un liderazgo efectivo.",scenario:"El equipo de Andrés tiene 5 personas, todos opinan al mismo tiempo y nadie escucha. Llevan 30 minutos y aún no empiezan. El estudiante debe identificar qué falta y proponer cómo tomará el liderazgo en la próxima reunión.",questions:["¿Qué está pasando en este equipo?","¿Qué haría un buen líder en los primeros 3 minutos?","¿Cuál es la diferencia entre mandar y liderar?","¿Qué harías tú si fueras el nuevo líder?"],evaluation:"El estudiante escribe el guión de los primeros 3 minutos de la reunión como nuevo líder.",tips:"Haz roleplay: tú juegas el rol del equipo desordenado y el estudiante practica el inicio.",xp:100,duration:"10 min" },
    ],
    Intermedio:[
      { title:"La decisión impopular",objective:"Tomar y comunicar decisiones difíciles que afectan al equipo.",scenario:"Camila es lidereza del grupo y debe asignar la tarea más difícil a su mejor amigo porque es el más competente. Sabe que él se molestará. Si no lo hace, el proyecto fallará. Debe comunicar la decisión de forma que preserve la relación y el compromiso.",questions:["¿Cómo justificas la decisión sin que parezca un castigo?","¿Cuándo es correcto hacer algo que sabes que va a molestar a alguien?","¿Cómo manejas la reacción negativa inicial?","¿Qué aprende el equipo cuando ven que el líder toma decisiones difíciles con integridad?"],evaluation:"El estudiante redacta el diálogo completo con su amigo: la comunicación de la decisión y el manejo de la reacción.",tips:"Evalúa el tono, no solo el contenido: ¿suena a imposición o a confianza?",xp:185,duration:"15 min" },
    ],
    Avanzado:[
      { title:"El líder que falló",objective:"Gestionar el fracaso como líder con responsabilidad y visión de recuperación.",scenario:"Sebastián lideró el proyecto más importante del año y falló. El equipo está desanimado, el cliente está molesto y la dirección del colegio quiere explicaciones. Él tiene 24 horas para revertir la percepción y presentar un plan de recuperación.",questions:["¿Cuál es lo primero que debe hacer un líder cuando falla?","¿Cómo asumir la responsabilidad sin destruir la confianza del equipo?","¿Qué diferencia hay entre una disculpa y un plan de acción?","¿Cómo conviertes un fracaso en un aprendizaje que te posiciona mejor?"],evaluation:"El estudiante produce: una disculpa auténtica, un diagnóstico de qué falló y un plan de recuperación de 5 días.",tips:"Pídele que lo presente como si fuera en tiempo real frente al cliente y al equipo.",xp:295,duration:"22 min" },
    ],
  },
  emo: {
    Básico:[
      { title:"La emoción en el semáforo",objective:"Identificar y nombrar emociones propias en situaciones cotidianas.",scenario:"Marcos se pone furioso porque le cambiaron el puesto en el salón sin avisarle. Golpea la silla y grita. El estudiante debe ayudar a Marcos a identificar qué emoción siente exactamente, de dónde viene y qué podría hacer diferente.",questions:["¿Qué emoción siente Marcos exactamente? ¿Es furia, miedo, sorpresa?","¿Dónde en el cuerpo siente esa emoción?","¿Qué provocó la reacción exagerada: el puesto o algo más?","¿Qué habría pasado si Marcos hiciera una pausa de 10 segundos?"],evaluation:"El estudiante crea un mapa emocional: situación → emoción real → reacción → alternativa efectiva.",tips:"Usa el ejercicio del semáforo: rojo (parar), amarillo (pensar), verde (actuar).",xp:110,duration:"9 min" },
    ],
    Intermedio:[
      { title:"El mensaje detrás del enojo",objective:"Desarrollar empatía identificando la emoción subyacente en comportamientos difíciles.",scenario:"Ana siempre llega tarde, interrumpe a los demás y parece no importarle nada. Sus compañeros están hartos. El estudiante debe investigar qué hay detrás de ese comportamiento antes de juzgarlo y proponer cómo acercarse a Ana de forma empática.",questions:["¿Qué podría estar pasando en la vida de Ana que no ves desde afuera?","¿Cuál es la diferencia entre empatía y excusar el comportamiento?","¿Cómo le hablarías a Ana para que se sintiera entendida, no atacada?","¿Qué necesitas de Ana para que el grupo funcione mejor?"],evaluation:"El estudiante escribe el diálogo de una conversación empática con Ana donde ambos expresan sus necesidades.",tips:"Pregunta si el estudiante ha sido Ana alguna vez. La reflexión personal hace el aprendizaje más profundo.",xp:185,duration:"14 min" },
    ],
    Avanzado:[
      { title:"La ruptura del equipo por tensión emocional",objective:"Gestionar conflictos interpersonales que amenazan el funcionamiento de un grupo.",scenario:"El equipo lleva 3 semanas trabajando bajo presión. Hoy estalló: dos miembros dejaron de hablarse, uno amenazó con irse y la tensión es insostenible. El estudiante debe actuar como mediador y restaurar las condiciones mínimas de colaboración.",questions:["¿Cuál es el error más común al mediar entre dos personas en conflicto?","¿Cómo creas un espacio donde ambas partes se sientan seguras?","¿Qué acuerdo mínimo necesitas lograr para que el equipo pueda continuar?","¿Cuándo un conflicto interpersonal es señal de un problema más profundo del equipo?"],evaluation:"El estudiante diseña un protocolo de mediación de 3 pasos y lo aplica al caso, justificando cada decisión.",tips:"Haz roleplay de mediación con tres estudiantes: mediador + dos partes en conflicto.",xp:285,duration:"22 min" },
    ],
  },
  dig: {
    Básico:[
      { title:"Mi identidad en internet",objective:"Reconocer qué información personal es segura compartir en línea.",scenario:"Valentina crea su primer perfil en una red social y quiere llenarlo todo: nombre completo, colegio, dirección, foto, número de teléfono. El estudiante debe ayudarla a decidir qué compartir de forma segura.",questions:["¿Qué información NUNCA deberías poner en un perfil público?","¿Por qué alguien que no conoces querría saber dónde estudias?","¿Cómo configurarías la privacidad de este perfil?","¿Qué información es útil para conectar vs cuál te hace vulnerable?"],evaluation:"El estudiante crea un perfil ejemplo con la información segura y justifica qué excluyó y por qué.",tips:"Muéstrale un perfil real de red social con configuración pública para que vea cuánta información hay.",xp:90,duration:"8 min" },
    ],
    Intermedio:[
      { title:"El ciberacoso silencioso",objective:"Identificar, documentar y responder efectivamente ante el ciberacoso.",scenario:"Camila nota que un grupo de WhatsApp excluye sistemáticamente a su compañera Ana, la ignoran en los mensajes, le envían memes burlándose de ella y cuando Ana se queja la llaman 'exagerada'. Camila quiere hacer algo pero no sabe cómo.",questions:["¿Por qué el acoso digital es más difícil de detectar que el físico?","¿Qué puede hacer Camila sin convertirse en objetivo también?","¿Cuándo y cómo se involucran los adultos?","¿Qué le dirías a Ana para que no se sienta sola?"],evaluation:"El estudiante diseña un plan de acción para Camila con 3 pasos concretos y predice las consecuencias de cada uno.",tips:"Este tema requiere crear un espacio de confianza antes de la sesión. Pregunta si ha visto esto en su entorno.",xp:175,duration:"14 min" },
    ],
    Avanzado:[
      { title:"La huella digital que no puedes borrar",objective:"Comprender las consecuencias a largo plazo de la identidad digital.",scenario:"Sebastián publicó hace 2 años un video burlándose de un maestro. Ahora está aplicando a una beca universitaria y el comité encontró el video. Le piden que explique. El estudiante debe ayudarlo a gestionar esta situación y reflexionar sobre la permanencia digital.",questions:["¿Qué haría Sebastián si tuviera la máquina del tiempo?","¿Cómo te preparas hoy para que tu huella digital de mañana sea un activo?","¿Qué diferencia hay entre privacidad y anonimato en internet?","¿Cuáles son tus 3 principales 'huellas digitales' actuales?"],evaluation:"El estudiante escribe una declaración personal (como la que escribiría Sebastián) y un plan de curación de su propia identidad digital.",tips:"Busca junto al estudiante su propio nombre en Google como ejercicio de apertura.",xp:270,duration:"18 min" },
    ],
  },
  tie: {
    Básico:[
      { title:"El domingo por la noche",objective:"Aprender a planificar la semana con anticipación para reducir el estrés.",scenario:"Es domingo 8 PM. Carlos tiene 3 entregas esta semana, un examen el jueves y entrenamiento el martes y jueves. No sabe por dónde empezar y está viendo Netflix. El estudiante debe ayudarlo a crear un plan semanal realista.",questions:["¿Qué pasa si Carlos sigue viendo Netflix 2 horas más?","¿Cuál entrega tiene que empezar hoy mismo?","¿Cómo distribuirías las tareas en los días disponibles?","¿Cuánto tiempo necesita reservar para descanso sin culpa?"],evaluation:"El estudiante crea el horario semanal de Carlos con bloques de estudio, descanso y actividades comprometidas.",tips:"Usa papel y lápiz para el horario físico: la escritura manual mejora la planificación.",xp:85,duration:"8 min" },
    ],
    Intermedio:[
      { title:"La trampa de la urgencia",objective:"Distinguir entre tareas urgentes e importantes para tomar mejores decisiones.",scenario:"Valentina tiene 4 tareas pendientes: responder mensajes de amigos (urgente), estudiar para el examen de mañana (importante), hacer el proyecto que entrega en 2 semanas (importante), y organizarse el cuarto que su mamá le pidió (urgente para su mamá). Solo tiene 3 horas.",questions:["¿Cuál es la diferencia entre urgente e importante?","¿En qué orden harías estas 4 tareas y por qué?","¿Cómo negocias con tu mamá sobre el cuarto sin crear conflicto?","¿Qué tarea de las 4 podrías eliminar o delegar?"],evaluation:"El estudiante aplica la Matriz de Eisenhower a las 4 tareas y justifica el orden de ejecución.",tips:"Lleva la matriz de Eisenhower impresa para que sea una herramienta que el estudiante se lleve.",xp:170,duration:"13 min" },
    ],
    Avanzado:[
      { title:"La semana imposible",objective:"Diseñar sistemas de productividad personal ante sobrecarga real.",scenario:"Isabela tiene simultáneamente: proyecto grupal que lidera, examen parcial en 3 asignaturas, compromiso familiar inevitable el viernes, entrenamiento lunes y miércoles, y acaba de aceptar otra responsabilidad sin darse cuenta de que no le cabe. Tiene 5 horas libres en toda la semana.",questions:["¿Cuál es el primer error que cometió Isabela antes de llegar a este punto?","¿Qué aprende un sistema de productividad que una lista de tareas no enseña?","¿Cuándo y cómo decir 'no' es la mejor decisión de productividad?","¿Qué compromisos eliminarías y cómo se lo comunicarías a los involucrados?"],evaluation:"El estudiante diseña el sistema de gestión semanal de Isabela y redacta el mensaje para declinar el compromiso extra.",tips:"Conecta esto con la vida real del estudiante: ¿Cuándo fue su propia 'semana imposible'?",xp:195,duration:"17 min" },
    ],
  },
  pro: {
    Básico:[
      { title:"¿Por qué se rompe siempre lo mismo?",objective:"Aplicar pensamiento causal básico para identificar la raíz de un problema.",scenario:"En el salón, cada semana se rompe el sacapuntas. Ya van tres en un mes. El director quiere comprar el cuarto. El estudiante debe investigar por qué se rompen antes de simplemente reemplazarlos.",questions:["¿Cuál es la diferencia entre el síntoma y la causa del problema?","¿Qué preguntas harías para descubrir por qué se rompen?","¿Cuál sería la solución que evita que el problema vuelva a ocurrir?","¿Cómo sabes que encontraste la causa real?"],evaluation:"El estudiante crea un diagrama de los 5 porqués para el problema del sacapuntas y propone la solución a la causa raíz.",tips:"El ejercicio de los '5 porqués' es una herramienta que el estudiante puede aplicar en cualquier área de su vida.",xp:100,duration:"9 min" },
    ],
    Intermedio:[
      { title:"El proyecto que todos odian",objective:"Diagnosticar y resolver problemas sistémicos en grupos de trabajo.",scenario:"El equipo entregó el proyecto a tiempo pero todos están agotados y molesto. El docente pregunta: '¿Saldrían con el mismo equipo otra vez?' Solo 2 de 5 dicen que sí. El estudiante debe diagnosticar qué falló sistémicamente y proponer mejoras.",questions:["¿Qué es más importante: entregar a tiempo o que el equipo esté bien?","¿Qué 3 cosas harías diferente desde el principio del próximo proyecto?","¿Cómo mides si un proceso fue exitoso más allá del resultado final?","¿Qué herramientas o acuerdos previos hubieran evitado el agotamiento?"],evaluation:"El estudiante diseña un 'manual de equipo' de una página con los acuerdos mínimos para el próximo proyecto.",tips:"Haz que el estudiante reflexione sobre un proyecto real suyo usando las mismas preguntas.",xp:185,duration:"14 min" },
    ],
    Avanzado:[
      { title:"La solución que creó un nuevo problema",objective:"Analizar efectos secundarios e implicaciones sistémicas de las soluciones.",scenario:"La escuela instaló cámaras para reducir el bullying. El bullying bajó un 40% en los pasillos, pero subió un 80% por redes sociales. El director dice que las cámaras funcionaron. El estudiante debe argumentar por qué es una solución incompleta y proponer un enfoque sistémico.",questions:["¿Por qué una solución que funciona en un área puede fallar en el sistema completo?","¿Cómo evaluarías si una intervención realmente resuelve el problema?","¿Qué otros efectos secundarios podría tener la solución actual?","¿Cuál sería un enfoque que ataque la causa del bullying, no solo sus manifestaciones?"],evaluation:"El estudiante entrega un análisis sistémico con efectos primarios y secundarios, y una propuesta de solución integral con 3 componentes.",tips:"Este caso conecta perfectamente con pensamiento de sistemas. Puedes introducir diagramas de retroalimentación.",xp:290,duration:"22 min" },
    ],
  },
};

function generateAICase(worldId:string, diff:"Básico"|"Intermedio"|"Avanzado", targetId:string, context:string):GenCase {
  const world = WORLDS.find(w=>w.id===worldId) ?? WORLDS[0];
  const bank  = CASE_BANK[worldId]?.[diff] ?? CASE_BANK.com.Intermedio;
  const base  = bank[Math.floor(Math.random()*bank.length)];
  const targetName = targetId==="all" ? "Todo el grupo (3°A · 3°B)" : TEACHER_DATA.find(s=>s.name.split(" ")[0].toLowerCase()===targetId)?.name ?? targetId;

  // If teacher provided context, personalise the scenario
  const scenario = context.trim()
    ? `${base.scenario}\n\nContexto adicional del docente: ${context.trim()}`
    : base.scenario;

  return {
    ...base,
    id:`case-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    scenario,
    worldId, worldName:world.name, worldEmoji:world.emoji,
    difficulty:diff, targetId, targetName,
    createdAt: new Date().toLocaleDateString("es-CO",{ day:"2-digit",month:"short",year:"numeric" }),
  };
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 18) {
  const [chars, setChars]   = useState("");
  const [done,  setDone]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const skip = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current); setChars(text); setDone(true); }, [text]);

  useEffect(() => {
    setChars(""); setDone(false);
    if (!text) return;
    let i = 0;
    timerRef.current = setInterval(() => {
      i++; setChars(text.slice(0, i));
      if (i >= text.length) { if(timerRef.current) clearInterval(timerRef.current); setDone(true); }
    }, speed);
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [text, speed]);

  return { chars, done, skip };
}

// ─── Paleta ───────────────────────────────────────────────────────────────────
const P = {
  bg:      "#070D1A",
  s1:      "#0E1828",   // surface 1 - cards
  s2:      "#152035",   // surface 2 - elevated
  s3:      "#1B2C45",   // surface 3 - hover
  border:  "rgba(85,120,175,0.16)",
  bHover:  "rgba(139,92,246,0.45)",
  text:    "#F0F6FF",
  muted:   "#6E8AAB",
  // Brand colors
  v1: "#5B21B6", v2: "#7C3AED", v3: "#8B5CF6", v4: "#A78BFA",  // violet
  c1: "#0369A1", c2: "#0284C7", c3: "#0EA5E9", c4: "#38BDF8",  // cyan/blue
  g1: "#047857", g2: "#059669", g3: "#10B981", g4: "#34D399",  // green
  a1: "#B45309", a2: "#D97706", a3: "#F59E0B", a4: "#FCD34D",  // amber
  r1: "#991B1B", r2: "#DC2626", r3: "#EF4444", r4: "#FCA5A5",  // red
  p1: "#9D174D", p2: "#BE185D", p3: "#EC4899", p4: "#F9A8D4",  // pink
};

const g = (a: string, b: string, deg = "135deg") => `linear-gradient(${deg},${a},${b})`;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type AuthStep = "splash"|"role"|"login-s"|"login-t"|"reg-role"|"reg-s"|"reg-t";
type AppScreen = "home"|"map"|"skill"|"sim"|"results"|"dash"|"avatar"|"teacher";

interface User {
  id:string; name:string; last:string; email:string; grade:string;
  hairColor:string; hairStyle:string; skinTone:string; shirtColor:string; pet:string;
  level:number; xp:number; coins:number; streak:number; role:"student"|"teacher";
  subject?:string; group?:string;
}

// ─── Datos semilla ────────────────────────────────────────────────────────────
const SEED_USERS: User[] = [
  { id:"s1", name:"Alejandro", last:"Torres",  email:"alejandro@demo.com",  grade:"3°A", hairColor:"#2C1810", hairStyle:"A", skinTone:"#FDBCB4", shirtColor:"#6D28D9", pet:"🐶", level:7,  xp:2450, coins:340, streak:5,  role:"student" },
  { id:"s2", name:"Valentina", last:"Ruiz",    email:"valentina@demo.com",  grade:"3°A", hairColor:"#1A1A2E", hairStyle:"B", skinTone:"#D08B5B", shirtColor:"#DC2626", pet:"🐱", level:9,  xp:4200, coins:620, streak:12, role:"student" },
  { id:"s3", name:"Mateo",     last:"González",email:"mateo@demo.com",      grade:"3°B", hairColor:"#8B4513", hairStyle:"C", skinTone:"#AE8B6A", shirtColor:"#059669", pet:"🐸", level:5,  xp:1800, coins:210, streak:2,  role:"student" },
  { id:"s4", name:"Isabela",   last:"Moreno",  email:"isabela@demo.com",    grade:"3°A", hairColor:"#1A1A2E", hairStyle:"D", skinTone:"#614335", shirtColor:"#0284C7", pet:"🦄", level:11, xp:5900, coins:880, streak:21, role:"student" },
  { id:"s5", name:"Sebastián", last:"Vargas",  email:"sebastian@demo.com",  grade:"3°B", hairColor:"#FFD700", hairStyle:"A", skinTone:"#EDB98A", shirtColor:"#D97706", pet:"🦊", level:4,  xp:1200, coins:130, streak:1,  role:"student" },
  { id:"s6", name:"Camila",    last:"Jiménez", email:"camila@demo.com",     grade:"3°B", hairColor:"#DC143C", hairStyle:"B", skinTone:"#FDBCB4", shirtColor:"#BE185D", pet:"🐼", level:8,  xp:3600, coins:490, streak:9,  role:"student" },
  { id:"t1", name:"Ana",       last:"García",  email:"docente@demo.com",    grade:"",    hairColor:"#1A1A2E", hairStyle:"B", skinTone:"#EDB98A", shirtColor:"#0284C7", pet:"",   level:1,  xp:0,    coins:0,   streak:0,  role:"teacher", subject:"Ciencias Sociales", group:"3°A · 3°B" },
];

const HAIR_COLORS  = ["#2C1810","#8B4513","#FFD700","#DC143C","#1A1A2E","#4169E1","#6A0DAD","#F5F5F5"];
const HAIR_STYLES  = ["A","B","C","D"];
const SKIN_TONES   = ["#FDBCB4","#EDB98A","#D08B5B","#AE8B6A","#614335","#3D1A00"];
const SHIRT_COLORS = ["#6D28D9","#DC2626","#059669","#0284C7","#D97706","#BE185D","#374151","#0E7490"];
const PETS = ["🐶","🐱","🐸","🦊","🐼","🦄","🐉","🦋","🐧","🦁","✨","⛔"];

const GRADES = ["1°A","1°B","2°A","2°B","3°A","3°B","4°A","4°B","5°A","5°B"];

const WORLDS = [
  { id:"com", emoji:"🗣️", name:"Comunicación",           from:P.v2, to:P.v1, locked:false, missions:8, completed:3 },
  { id:"fin", emoji:"💰", name:"Ed. Financiera",          from:P.a2, to:P.a1, locked:false, missions:6, completed:1 },
  { id:"tea", emoji:"🤝", name:"Trabajo en Equipo",       from:P.g2, to:P.g1, locked:false, missions:7, completed:5 },
  { id:"emo", emoji:"❤️", name:"Int. Emocional",          from:P.p2, to:P.p1, locked:true,  missions:9, completed:0 },
  { id:"lid", emoji:"👑", name:"Liderazgo",               from:P.a3, to:P.a1, locked:true,  missions:6, completed:0 },
  { id:"pen", emoji:"💡", name:"Pensamiento Crítico",     from:P.c2, to:P.c1, locked:false, missions:5, completed:2 },
  { id:"cre", emoji:"🎨", name:"Creatividad",             from:P.p3, to:P.p1, locked:true,  missions:7, completed:0 },
  { id:"inn", emoji:"🚀", name:"Innovación",              from:"#4F46E5", to:"#312E81", locked:true, missions:5, completed:0 },
  { id:"dig", emoji:"💻", name:"Comp. Digitales",         from:P.c3, to:P.c1, locked:false, missions:8, completed:4 },
  { id:"emp", emoji:"🌱", name:"Emprendimiento",          from:P.g3, to:P.g1, locked:true,  missions:10, completed:0 },
  { id:"tie", emoji:"📚", name:"Gestión del Tiempo",      from:"#EA580C", to:"#7C2D12", locked:false, missions:6, completed:1 },
  { id:"pro", emoji:"🧠", name:"Resolución de Problemas", from:"#9333EA", to:"#581C87", locked:true, missions:8, completed:0 },
];

// ─── Image pool ───────────────────────────────────────────────────────────────
const I = {
  class : "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=360&fit=crop&auto=format",
  pres  : "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=360&fit=crop&auto=format",
  write : "https://images.unsplash.com/photo-1587440871875-191322ee64b0?w=600&h=360&fit=crop&auto=format",
  office: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=360&fit=crop&auto=format",
  team  : "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&h=360&fit=crop&auto=format",
  coins : "https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&h=360&fit=crop&auto=format",
  money : "https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=600&h=360&fit=crop&auto=format",
  brain : "https://images.unsplash.com/photo-1586936893354-362ad6ae47ba?w=600&h=360&fit=crop&auto=format",
  group : "https://images.unsplash.com/photo-1568992688065-536aad8a12f6?w=600&h=360&fit=crop&auto=format",
  study : "https://images.unsplash.com/photo-1581726690015-c9861fa5057f?w=600&h=360&fit=crop&auto=format",
  note  : "https://images.unsplash.com/photo-1576595580361-90a855b84b20?w=600&h=360&fit=crop&auto=format",
  sticky: "https://images.unsplash.com/photo-1623652554515-91c833e3080e?w=600&h=360&fit=crop&auto=format",
  debate: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&h=360&fit=crop&auto=format",
  hand  : "https://images.unsplash.com/photo-1581726707445-75cbe4efc586?w=600&h=360&fit=crop&auto=format",
};

// ─── Missions per world ───────────────────────────────────────────────────────
type MissionDiff = "Básico" | "Intermedio" | "Avanzado";
interface MissionItem { id:string; emoji:string; title:string; desc:string; dur:string; diff:MissionDiff; xp:number; img:string; }

const WORLD_MISSIONS: Record<string, MissionItem[]> = {
  com: [
    { id:"com-1", emoji:"🎤", title:"Presentación frente al salón",   desc:"Explica una idea ante tus compañeros y convéncelos con claridad y seguridad.",     dur:"8 min",  diff:"Intermedio", xp:150, img:I.class  },
    { id:"com-2", emoji:"🎙️", title:"Mi primer podcast",               desc:"Graba un episodio sobre un tema que te apasiona y compártelo con el grupo.",       dur:"10 min", diff:"Básico",     xp:90,  img:I.write  },
    { id:"com-3", emoji:"⚡",  title:"Debate de actualidad",            desc:"Defiende tu posición con argumentos sólidos en un debate acalorado.",              dur:"12 min", diff:"Avanzado",   xp:250, img:I.pres   },
    { id:"com-4", emoji:"🤝", title:"Negociación efectiva",            desc:"Llega a un acuerdo con alguien que tiene una postura completamente diferente.",     dur:"9 min",  diff:"Intermedio", xp:180, img:I.office },
  ],
  fin: [
    { id:"fin-1", emoji:"💳", title:"Mi presupuesto mensual",          desc:"Planifica tus gastos e ingresos para el mes con metas reales y concretas.",         dur:"7 min",  diff:"Básico",     xp:100, img:I.coins  },
    { id:"fin-2", emoji:"📈", title:"Inversión inteligente",           desc:"Simula una inversión en bolsa y aprende a gestionar el riesgo financiero.",          dur:"12 min", diff:"Avanzado",   xp:280, img:I.money  },
    { id:"fin-3", emoji:"🏦", title:"Plan de ahorro con metas",        desc:"Define objetivos de ahorro reales y diseña estrategias para alcanzarlos.",           dur:"6 min",  diff:"Básico",     xp:85,  img:I.note   },
    { id:"fin-4", emoji:"🛒", title:"Mi primer emprendimiento",        desc:"Idea, planifica y presenta tu primer modelo de negocio ante un jurado.",             dur:"14 min", diff:"Intermedio", xp:210, img:I.group  },
  ],
  tea: [
    { id:"tea-1", emoji:"👥", title:"Proyecto colaborativo",           desc:"Trabaja con tu equipo para entregar un proyecto desafiante en tiempo récord.",       dur:"10 min", diff:"Intermedio", xp:160, img:I.team   },
    { id:"tea-2", emoji:"🚨", title:"Crisis en el equipo",             desc:"Un miembro abandona el grupo a mitad del proyecto. ¿Cómo reorganizas a todos?",     dur:"8 min",  diff:"Avanzado",   xp:260, img:I.group  },
    { id:"tea-3", emoji:"📋", title:"Distribución de roles",           desc:"Asigna el rol ideal a cada miembro del equipo según sus fortalezas únicas.",         dur:"5 min",  diff:"Básico",     xp:90,  img:I.sticky },
    { id:"tea-4", emoji:"🏆", title:"Competencia interescolar",        desc:"Lidera a tu equipo para ganar la competencia regional más reñida del año.",          dur:"12 min", diff:"Intermedio", xp:200, img:I.pres   },
  ],
  emo: [
    { id:"emo-1", emoji:"🧘", title:"Gestión del estrés",              desc:"Aplica técnicas probadas para manejar momentos de alta presión emocional.",          dur:"7 min",  diff:"Básico",     xp:110, img:I.study  },
    { id:"emo-2", emoji:"💔", title:"Resolución de conflictos",        desc:"Transforma un conflicto real en una oportunidad de crecimiento personal.",           dur:"10 min", diff:"Intermedio", xp:175, img:I.office },
    { id:"emo-3", emoji:"🫂", title:"Empatía en acción",               desc:"Comprende y valida los sentimientos de alguien que está pasando un momento difícil.", dur:"8 min",  diff:"Intermedio", xp:190, img:I.team   },
    { id:"emo-4", emoji:"😤", title:"Control emocional extremo",       desc:"Mantén la calma en una situación de máxima presión grupal sin perder el hilo.",      dur:"10 min", diff:"Avanzado",   xp:270, img:I.class  },
  ],
  lid: [
    { id:"lid-1", emoji:"🎯", title:"Decisión bajo presión",           desc:"El equipo te espera. Tienes 60 segundos para tomar la mejor decisión posible.",      dur:"8 min",  diff:"Intermedio", xp:185, img:I.office },
    { id:"lid-2", emoji:"🗺️", title:"Visión estratégica",              desc:"Diseña el plan a largo plazo para alcanzar una meta ambiciosa con tu equipo.",       dur:"12 min", diff:"Avanzado",   xp:295, img:I.brain  },
    { id:"lid-3", emoji:"📢", title:"Motivar al equipo",               desc:"Tu equipo está desanimado justo antes del momento más importante. Inspíralos.",       dur:"7 min",  diff:"Intermedio", xp:200, img:I.team   },
    { id:"lid-4", emoji:"🔥", title:"Liderazgo en crisis",             desc:"Un proyecto falla y tú eres el responsable. ¿Cómo asumes la situación?",             dur:"14 min", diff:"Avanzado",   xp:310, img:I.pres   },
  ],
  pen: [
    { id:"pen-1", emoji:"🔍", title:"Análisis de noticias falsas",     desc:"Identifica qué es verdad y qué es desinformación en 5 titulares de actualidad.",     dur:"7 min",  diff:"Básico",     xp:95,  img:I.note   },
    { id:"pen-2", emoji:"⚖️", title:"Dilema ético",                    desc:"Toma una decisión difícil cuando no existe una respuesta correcta ni fácil.",         dur:"9 min",  diff:"Intermedio", xp:175, img:I.debate },
    { id:"pen-3", emoji:"🧩", title:"Resolución de paradojas",         desc:"Encuentra la lógica oculta en situaciones aparentemente imposibles de resolver.",     dur:"11 min", diff:"Avanzado",   xp:265, img:I.brain  },
    { id:"pen-4", emoji:"📊", title:"Datos vs opinión",                desc:"Aprende a separar hechos de juicios en un debate cargado de emociones.",              dur:"8 min",  diff:"Intermedio", xp:190, img:I.pres   },
  ],
  cre: [
    { id:"cre-1", emoji:"✏️", title:"Diseña tu idea en 5 minutos",     desc:"Convierte un problema cotidiano en un producto o servicio innovador.",               dur:"5 min",  diff:"Básico",     xp:100, img:I.sticky },
    { id:"cre-2", emoji:"🎭", title:"Teatro improvisado",              desc:"Crea una escena dramática en tiempo real sin guión y sin ensayos previos.",           dur:"8 min",  diff:"Intermedio", xp:180, img:I.class  },
    { id:"cre-3", emoji:"🎵", title:"Escribe una canción",             desc:"Expresa una emoción compleja a través de letra, ritmo y melodía propios.",            dur:"12 min", diff:"Intermedio", xp:195, img:I.write  },
    { id:"cre-4", emoji:"🖼️", title:"Pitch creativo",                  desc:"Presenta tu idea en 90 segundos de la manera más memorable e impactante posible.",   dur:"10 min", diff:"Avanzado",   xp:275, img:I.pres   },
  ],
  inn: [
    { id:"inn-1", emoji:"💡", title:"Hackathon escolar",               desc:"Crea una solución tecnológica a un problema real de tu comunidad en tiempo récord.",  dur:"14 min", diff:"Avanzado",   xp:290, img:I.brain  },
    { id:"inn-2", emoji:"🤖", title:"Diseña una app útil",             desc:"Prototipa una aplicación que resuelva una necesidad que nadie ha atendido aún.",      dur:"12 min", diff:"Avanzado",   xp:285, img:I.office },
    { id:"inn-3", emoji:"🌱", title:"Startup en 5 minutos",            desc:"Crea el modelo mínimo de tu empresa en tiempo récord ante inversores reales.",        dur:"5 min",  diff:"Intermedio", xp:200, img:I.sticky },
    { id:"inn-4", emoji:"🔧", title:"Solución inesperada",             desc:"Resuelve un problema cotidiano de la forma más creativa e ingeniosa posible.",        dur:"7 min",  diff:"Básico",     xp:105, img:I.group  },
  ],
  dig: [
    { id:"dig-1", emoji:"🔐", title:"Seguridad en internet",           desc:"Identifica amenazas digitales reales y aprende a proteger tu información.",           dur:"7 min",  diff:"Básico",     xp:90,  img:I.study  },
    { id:"dig-2", emoji:"📱", title:"Tu huella digital",               desc:"Descubre qué información tuya está disponible en internet y cómo gestionarla.",       dur:"9 min",  diff:"Intermedio", xp:170, img:I.note   },
    { id:"dig-3", emoji:"💻", title:"Crea una página web",             desc:"Diseña y publica tu primer sitio web con un propósito real y concreto.",              dur:"15 min", diff:"Avanzado",   xp:275, img:I.office },
    { id:"dig-4", emoji:"📧", title:"Comunicación digital pro",        desc:"Escribe un correo electrónico profesional que abra puertas en el mundo laboral.",     dur:"6 min",  diff:"Básico",     xp:95,  img:I.write  },
  ],
  emp: [
    { id:"emp-1", emoji:"🛒", title:"Mi primer negocio",               desc:"Define tu producto, cliente ideal y precio de venta con una propuesta de valor.",      dur:"8 min",  diff:"Básico",     xp:105, img:I.coins  },
    { id:"emp-2", emoji:"📊", title:"Plan de negocios express",        desc:"Crea el esqueleto completo de tu empresa en una sola hoja estratégica.",              dur:"12 min", diff:"Intermedio", xp:200, img:I.office },
    { id:"emp-3", emoji:"🎯", title:"Conoce a tu cliente ideal",       desc:"Entrevista a tu cliente potencial y descubre sus necesidades más profundas.",          dur:"9 min",  diff:"Básico",     xp:110, img:I.team   },
    { id:"emp-4", emoji:"🚀", title:"Pitch de inversión",              desc:"Convence a un panel de inversores reales de apostar por tu idea en 3 minutos.",       dur:"14 min", diff:"Avanzado",   xp:305, img:I.pres   },
  ],
  tie: [
    { id:"tie-1", emoji:"⏰", title:"Las prioridades del día",         desc:"Organiza tus tareas usando la matriz de Eisenhower para máxima efectividad.",         dur:"5 min",  diff:"Básico",     xp:85,  img:I.note   },
    { id:"tie-2", emoji:"📅", title:"Planificación semanal",           desc:"Diseña tu semana perfecta equilibrando estudio, descanso y actividades.",             dur:"8 min",  diff:"Básico",     xp:95,  img:I.study  },
    { id:"tie-3", emoji:"⚡",  title:"Productividad máxima",            desc:"Aplica técnicas Pomodoro y Deep Work para rendir al máximo en menos tiempo.",         dur:"10 min", diff:"Intermedio", xp:175, img:I.write  },
    { id:"tie-4", emoji:"🎯", title:"Hábitos de alto rendimiento",     desc:"Diseña una rutina mañanera de élite que transforme tu vida académica.",               dur:"9 min",  diff:"Intermedio", xp:185, img:I.office },
  ],
  pro: [
    { id:"pro-1", emoji:"🔍", title:"El caso del salón",               desc:"Un objeto desapareció. Usa lógica deductiva para encontrar al responsable.",          dur:"7 min",  diff:"Básico",     xp:100, img:I.class  },
    { id:"pro-2", emoji:"🧩", title:"Puzzle grupal de lógica",         desc:"Resuelve un acertijo complejo colaborando estratégicamente con tu equipo.",           dur:"10 min", diff:"Intermedio", xp:190, img:I.brain  },
    { id:"pro-3", emoji:"🌊", title:"Crisis y plan de acción",         desc:"Tu comunidad enfrenta una emergencia. Lidera la respuesta inmediata.",                dur:"12 min", diff:"Avanzado",   xp:275, img:I.group  },
    { id:"pro-4", emoji:"💡", title:"Innovar para resolver",           desc:"Diseña una solución original para un problema que parece no tener salida.",           dur:"11 min", diff:"Avanzado",   xp:290, img:I.sticky },
  ],
};

// Fallback missions (used as type reference)
const MISSIONS = WORLD_MISSIONS.com;

// ─── Simulation contexts per world ────────────────────────────────────────────
const SIM_STARTS: Record<string, { location:string; mood:string; narration:string; speaker:string; dialogue:string; guide:string }> = {
  com: { location:"Salón de Ciencias Sociales · Lunes 9:00 AM",  mood:"nervous",
    narration:"La profesora García llama tu nombre. Caminas al frente mientras 28 pares de ojos se clavan en ti. El marcador tiembla en tu mano.",
    speaker:"Prof. García", dialogue:'"Tu turno de presentar sobre el cambio climático. ¡5 minutos. Adelante!"',
    guide:'"Este es tu momento. La primera decisión define todo. ¿Qué haces primero?"' },
  fin: { location:"Feria escolar de negocios · Viernes 10:00 AM", mood:"nervous",
    narration:"El jurado de la feria te mira expectante. Tienes tu plan de negocios en mano y solo una oportunidad de causar una gran primera impresión.",
    speaker:"Jurado", dialogue:'"Tienes 3 minutos para convencernos. ¿Por qué debemos invertir en tu idea?"',
    guide:'"El dinero y la confianza se ganan con claridad. ¿Cuál es tu primer movimiento?"' },
  tea: { location:"Sala de proyectos · Martes 2:00 PM",          mood:"nervous",
    narration:"Tu equipo está en silencio. Acaban de enterarse de que el líder no vendrá. Todos te miran a ti esperando que alguien tome el control de la situación.",
    speaker:"Sofía (compañera)", dialogue:'"Alguien tiene que organizar esto. El proyecto se entrega mañana y no hemos avanzado nada."',
    guide:'"Un equipo sin dirección es un barco sin timón. ¿Cómo asumes el liderazgo ahora mismo?"' },
  pen: { location:"Debate escolar · Jueves 11:00 AM",            mood:"nervous",
    narration:"El moderador te da la palabra. Tu rival acaba de presentar un argumento que suena convincente pero que tú sabes que tiene fallas lógicas importantes.",
    speaker:"Moderador", dialogue:'"Tiene la palabra para refutar. Tiene 2 minutos. Empiece cuando quiera."',
    guide:'"La razón siempre supera al volumen. ¿Cómo construyes tu argumento?"' },
  dig: { location:"Laboratorio de computación · Lunes 3:00 PM",  mood:"nervous",
    narration:"El instructor te anuncia que detectaron actividad sospechosa en tu cuenta escolar. Todo el grupo espera para ver cómo reaccionas ante una crisis digital real.",
    speaker:"Instructor", dialogue:'"Alguien intentó acceder a tu cuenta. Necesitamos que expliques qué harías para protegerla desde ahora."',
    guide:'"En el mundo digital, la seguridad empieza por ti. ¿Cuál es tu primera acción?"' },
  tie: { location:"Tu cuarto de estudio · Domingo por la noche", mood:"nervous",
    narration:"Son las 9 PM del domingo. Tienes tres entregas para mañana, dos parciales esta semana y apenas has comenzado. El pánico empieza a aparecer.",
    speaker:"Tu conciencia", dialogue:'"Tiene que salir todo esta semana. El tiempo se agota y no puedes procrastinar más."',
    guide:'"La organización es el superpoder de los que logran más. ¿Por dónde empiezas?"' },
  lid: { location:"Reunión de emergencia · Miércoles 4:00 PM",   mood:"nervous",
    narration:"Tu equipo acaba de fallar en la primera entrega del proyecto más importante del semestre. Todos están desanimados y mirándote para que digas qué sigue.",
    speaker:"Director del proyecto", dialogue:'"Esto no puede volver a pasar. ¿Qué va a hacer el equipo diferente de ahora en adelante?"',
    guide:'"Los grandes líderes surgen en los momentos difíciles. ¿Qué tipo de líder serás hoy?"' },
  emo: { location:"Pasillo del colegio · Recreo",                mood:"nervous",
    narration:"Tu mejor amigo te grita frente a todos después de un malentendido. Sientes la rabia subir. Todos en el pasillo están mirando qué harás.",
    speaker:"Tu amigo (enojado)", dialogue:'"¡No puedo creer que hayas hecho eso! Pensé que eras diferente."',
    guide:'"La inteligencia emocional se mide en los momentos más difíciles. ¿Cómo respondes?"' },
  cre: { location:"Clase de diseño · Miércoles 10:00 AM",        mood:"nervous",
    narration:"La profesora te pide que presentes tu proyecto creativo ante la clase. Llevabas semanas trabajando en él pero sientes que no es suficientemente bueno.",
    speaker:"Prof. Ramírez", dialogue:'"Vamos a escucharte. Muéstranos lo que creaste y el proceso que seguiste para llegar ahí."',
    guide:'"La creatividad no es perfección, es valentía. ¿Cómo presentas tu trabajo?"' },
  inn: { location:"Hackathon escolar · Sábado 9:00 AM",          mood:"nervous",
    narration:"Quedan 30 minutos para el pitch final del hackathon. Tu equipo tiene una idea increíble pero el prototipo no está listo. Debes decidir ya qué presentar.",
    speaker:"Organizador", dialogue:'"En 30 minutos presenten su solución. El panel espera ver innovación real y ejecutable."',
    guide:'"La innovación no espera la perfección. ¿Cómo adaptas tu estrategia ahora mismo?"' },
  emp: { location:"Concurso de emprendimiento · Jueves 3:00 PM", mood:"nervous",
    narration:"Es tu turno de hacer el pitch. Hay cinco jueces frente a ti, uno de ellos es un empresario conocido. Tu negocio es pequeño pero tu idea es poderosa.",
    speaker:"Juez principal", dialogue:'"Convénceme en 3 minutos. ¿Por qué invertiría en ti y no en los otros 20 participantes?"',
    guide:'"El emprendimiento es confianza convertida en acción. ¿Cuál es tu argumento más poderoso?"' },
  pro: { location:"Sala de casos · Viernes 2:00 PM",             mood:"nervous",
    narration:"Tu grupo recibió un caso real: una empresa local está perdiendo clientes y no sabe por qué. Tienes 15 minutos para analizar, diagnosticar y proponer una solución.",
    speaker:"Facilitador", dialogue:'"El cliente necesita respuestas hoy. ¿Qué diagnóstico da tu equipo y cuál es la solución propuesta?"',
    guide:'"Los problemas complejos se resuelven con método. ¿Cómo estructuras tu análisis?"' },
};

const SIM_CHOICES = [
  { id:"breathe", emoji:"😌", text:"Respirar profundamente y comenzar con calma total",   next:"breathe_2" },
  { id:"improv",  emoji:"😎", text:"Arrancar con energía y capturar la atención al momento", next:"improv_2"  },
  { id:"wait",    emoji:"🤔", text:"Pedir un momento para organizar tus ideas en silencio",  next:"wait_2"    },
  { id:"team",    emoji:"🤝", text:"Invitar a alguien de confianza a acompañarte",           next:"team_2"    },
];

const SIM: Record<string, any> = {
  start: {
    bg:"🏫", location:"Salón de Ciencias Sociales · Lunes 9:00 AM", mood:"nervous",
    narration:"La profesora García llama tu nombre. Caminas al frente mientras 28 pares de ojos se clavan en ti. El marcador tiembla en tu mano. El silencio es total.",
    speaker:"Prof. García", dialogue:'"Tu turno de presentar sobre el cambio climático. ¡5 minutos. Adelante!"',
    guide:'"Este es tu momento. La primera decisión define todo. ¿Qué haces primero?"',
    choices: SIM_CHOICES,
  },
  breathe_2: {
    location:"Frente al salón · Minuto 1", mood:"confident",
    narration:"Inhalas lento, exhalas. La calma llega. Miras al grupo y comienzas: 'El cambio climático no es el problema de mañana…'",
    speaker:"Lucas (compañero)", dialogue:'"¡Esto sí está bueno! ¡Sigue!"',
    guide:'"¡Los tienes! Alguien te interrumpe. ¿Cómo lo manejas?"',
    choices:[
      { id:"c1", emoji:"🧘", text:"Agradecer el comentario y continuar con más energía", next:"end_breathe" },
      { id:"c2", emoji:"➡️", text:"Ignorarlo con gracia y mantener el hilo",              next:"end_breathe" },
    ],
  },
  improv_2: {
    location:"Frente al salón · Minuto 1", mood:"confident",
    narration:"'¿A cuántos grados llegó ayer?' — Cinco manos se levantan. La profesora arquea una ceja sorprendida.",
    speaker:"Prof. García", dialogue:'"Interesante técnica… Continúa, llega al tema central."',
    guide:'"La audiencia está activa. Conecta esa energía con datos concretos."',
    choices:[
      { id:"c1", emoji:"📊", text:"Citar tres datos del IPCC con seguridad y precisión", next:"end_improv" },
      { id:"c2", emoji:"📖", text:"Contar una historia personal sobre el calor en tu barrio", next:"end_improv" },
    ],
  },
  wait_2: {
    location:"Frente al salón · 30 segundos de silencio", mood:"confident",
    narration:"Silencio total. Organizas mentalmente 3 puntos clave. Cuando abres los ojos, tu voz sale clara y estructurada.",
    speaker:"Daniela (compañera)", dialogue:'"Eso fue una clase de cómo pensar antes de hablar."',
    guide:'"La espera valió la pena. ¿Cómo cierras para que quede en la memoria?"',
    choices:[
      { id:"c1", emoji:"❓", text:"Cerrar con una pregunta que el grupo reflexione en casa", next:"end_wait" },
      { id:"c2", emoji:"📝", text:"Dibujar un resumen visual en la pizarra mientras concluyes", next:"end_wait" },
    ],
  },
  team_2: {
    location:"Frente al salón · Presentación en dúo", mood:"happy",
    narration:"Sofía acepta. Se pone a tu lado. Dividen el tema: tú en causas, ella en soluciones. El salón está más atento que nunca.",
    speaker:"Prof. García", dialogue:'"La colaboración espontánea fue brillante. Bien hecho a los dos."',
    guide:'"Equipo bajo presión: habilidad rarísima. ¿Cómo reconoces a Sofía?"',
    choices:[
      { id:"c1", emoji:"📢", text:"Reconocerla públicamente con aplauso del grupo", next:"end_team" },
      { id:"c2", emoji:"🤝", text:"Agradecerle en privado con un gesto sincero",  next:"end_team" },
    ],
  },
  end_breathe:{ final:true, path:"breathe" },
  end_improv: { final:true, path:"improv"  },
  end_wait:   { final:true, path:"wait"    },
  end_team:   { final:true, path:"team"    },
};

// ─── Per-world scene_2 variants ────────────────────────────────────────────────
// Helper shortcuts
function s2(loc:string, mood:string, narr:string, spkr:string, dial:string, guide:string, c1t:string, c2t:string, end:string) {
  return { location:loc, mood, narration:narr, speaker:spkr, dialogue:dial, guide,
    choices:[{ id:"c1", emoji:"💡", text:c1t, next:`end_${end}` },{ id:"c2", emoji:"🎯", text:c2t, next:`end_${end}` }] };
}
const ENDS = { end_breathe:{ final:true,path:"breathe" },end_improv:{ final:true,path:"improv" },end_wait:{ final:true,path:"wait" },end_team:{ final:true,path:"team" } };

const WORLD_SIMS: Record<string, Record<string,any>> = {
  com: { // Comunicación — ya definido en SIM base, solo lo incluimos para coherencia
    breathe_2: s2("Frente al salón · Minuto 1","confident",
      "Inhalas lento, exhalas. La calma llega. Comienzas: 'La comunicación es la habilidad que cambia vidas…'. El salón empieza a asentir.",
      "Lucas (compañero)",'"¡Esto sí está bueno! Oye, ¡continúa!"',
      '"¡Los tienes! Alguien te interrumpe con entusiasmo. ¿Cómo sigues el hilo?"',
      "Agradecer el apoyo y seguir con más energía","Reconocer el comentario y retomar el control","breathe"),
    improv_2: s2("Frente al salón · Primera reacción","confident",
      "'¿Cuántas personas conocen a alguien que no sabe escuchar de verdad?' — Ocho manos se levantan. La profesora sonríe sorprendida.",
      "Prof. García",'"Técnica inusual pero efectiva. Ahora lleva eso al tema."',
      '"La audiencia está contigo. ¿Cómo conectas la dinámica con el contenido real?"',
      "Usar las respuestas como gancho hacia el tema principal","Proponer una actividad grupal rápida y luego desarrollar el tema","improv"),
    wait_2: s2("Frente al salón · Después del silencio","confident",
      "30 segundos de silencio total. Luego tu voz sale clara: '3 ideas, 3 minutos, 3 cambios que pueden hacer hoy'. El salón escucha diferente.",
      "Daniela (compañera)",'"Eso fue la presentación más estructurada que he visto este año."',
      '"La estructura te dio autoridad. ¿Cómo cierras para que quede grabado?"',
      "Terminar con una pregunta que cada quien responda en casa","Escribir las 3 ideas en la pizarra como síntesis visual","wait"),
    team_2: s2("Frente al salón · Presentación en dúo","happy",
      "Sofía acepta y toman posiciones. Tú hablas de habilidades blandas, ella de casos reales. El salón está completamente enganchado.",
      "Prof. García",'"La complementariedad entre los dos fue natural y poderosa."',
      '"¿Cómo reconoces el aporte de tu compañera ante el grupo?"',
      "Hacer que el grupo aplauda a Sofía por su contribución","Mencionar públicamente lo que aprendiste trabajando con ella","team"),
    ...ENDS,
  },
  fin: { // Educación Financiera — Feria escolar de negocios
    breathe_2: s2("Stand de la feria · Presentando el modelo","confident",
      "Presentas con datos precisos: '87% de jóvenes en tu ciudad no tiene cuenta de ahorro'. El jurado toma notas. Un número concreto vale más que mil palabras.",
      "Jueza Martínez",'"Interesante. ¿Cómo escalarías esto sin financiamiento externo?"',
      '"Pregunta trampa clásica. El jurado quiere ver si piensas en sostenibilidad."',
      "Explicar el modelo de autofinanciamiento con ganancias reinvertidas","Mostrar que ya tienes 3 clientes piloto como prueba de concepto","breathe"),
    improv_2: s2("Stand de la feria · La historia personal","confident",
      "'Mi abuela perdió todos sus ahorros por no conocer el interés compuesto.' Silencio total. El jurado está emocionado. La historia creó conexión real.",
      "Juez principal",'"Muy poderoso. Ahora convénceme con números, no con emociones."',
      '"La emoción abrió la puerta. Ahora los datos cierran el trato."',
      "Presentar proyecciones financieras a 1, 3 y 5 años","Mostrar el caso de éxito de un cliente ya probado","improv"),
    wait_2: s2("Stand de la feria · Pausa estratégica","confident",
      "Tomaste 20 segundos para reorganizar. El jurado valora la serenidad. Comienzas: 'Déjenme mostrarles tres razones por las que esto funciona.'",
      "Jueza Martínez",'"La mayoría de emprendedores hablan por hablar. Tú piensas primero."',
      '"Tienes su atención. ¿Con qué argumento final cierras la presentación?"',
      "Demostrar el ROI con una simulación en tiempo real","Pedir a un jurado que calcule el beneficio con sus propios datos","wait"),
    team_2: s2("Stand de la feria · Pitch compartido","happy",
      "Tu socio explica el modelo financiero mientras tú manejas la narrativa. La división de roles funciona perfectamente. El jurado lo nota.",
      "Juez principal",'"Ver cómo se complementan dice mucho de su madurez como equipo."',
      '"La confianza entre socios es un activo más valioso que el producto mismo."',
      "Mostrar cómo sus roles se definieron por las fortalezas de cada uno","Hablar de los procesos que tienen para tomar decisiones juntos","team"),
    ...ENDS,
  },
  tea: { // Trabajo en Equipo — Crisis del proyecto
    breathe_2: s2("Sala de proyectos · Después de hablar","confident",
      "Tu voz calmada frena el pánico. 'Primero mapa del estado actual, luego asignamos.' El equipo se organiza. Marcos empieza a proteger. La tensión baja.",
      "Sofía (compañera)",'"No creí que pudiéramos salir de esto hoy. Gracias por no perder la cabeza."',
      '"El equipo está contigo. Pero Marcos sigue resistiendo. ¿Cómo lo integras?"',
      "Darle a Marcos la tarea en la que es el mejor para que vea su valor","Hablar con él en privado sobre lo que le está bloqueando","breathe"),
    improv_2: s2("Sala de proyectos · Nueva propuesta","confident",
      "Propones reducir el alcance a lo esencial y entregar perfecto. El equipo duda al principio pero en 5 minutos todos están de acuerdo y trabajando.",
      "Marcos (compañero)",'"Es arriesgado pero es lo único viable. Vamos."',
      '"El plan está en marcha. Surge un problema técnico. ¿Qué priorizas ahora?"',
      "Resolver el problema técnico tú mismo para no frenar al equipo","Pedir al más técnico del equipo que lo resuelva mientras todos siguen","improv"),
    wait_2: s2("Sala de proyectos · Lo que nadie dijo","confident",
      "Al escuchar a todos, descubriste que Valentina ya había terminado el módulo más difícil hace días. La solución ya existía, nadie la había compartido.",
      "Valentina (compañera)",'"Pensé que no era necesario decirlo. ¿Lo podemos usar como base?"',
      '"El problema era comunicación, no capacidad. ¿Cómo reorganizas desde aquí?"',
      "Usar el avance de Valentina como base y redistribuir el trabajo","Crear un canal de actualizaciones para que esto no vuelva a pasar","wait"),
    team_2: s2("Sala de proyectos · Roles en marcha","happy",
      "Cada quien tiene su responsabilidad. El proyecto avanza a buen ritmo. Pero dos horas después surge una nueva crisis: el cliente cambió los requerimientos.",
      "Lucas (compañero)",'"Oye, acaban de cambiar todo. ¿Qué hacemos? ¿Empezamos de nuevo?"',
      '"Adaptabilidad es el superpoder de los buenos equipos. ¿Cuál es tu respuesta?"',
      "Analizar qué del trabajo hecho sigue siendo válido y adaptarlo","Hacer una reunión de emergencia para redefinir prioridades con el cambio","team"),
    ...ENDS,
  },
  pen: { // Pensamiento Crítico — Debate
    breathe_2: s2("Escenario del debate · Tu turno de refutar","confident",
      "Tomas aire y comienzas con calma: 'El argumento tiene tres fallas estructurales. Permítame desarrollarlas.' El público se inclina hacia adelante.",
      "Moderador",'"Muy bien. Tiene 90 segundos para desarrollar la primera falla."',
      '"Precisión y brevedad: esa es la clave del debate. ¿Cuál falla atacas primero?"',
      "Atacar la premisa falsa en la que se basa todo el argumento","Mostrar con datos que la conclusión no se sigue de las premisas","breathe"),
    improv_2: s2("Escenario del debate · Ataque directo","confident",
      "'Su afirmación asume que correlación es causalidad. Eso es el error lógico más común.' El público reacciona. Tu rival se pone nervioso visiblemente.",
      "Tu rival",'"Eso es una simplificación. Mi argumento es más complejo que eso."',
      '"Le diste el golpe. Ahora tienes que sostener la presión. ¿Qué sigues?"',
      "Pedir que explique la complejidad y usar esa explicación en tu contra","Presentar tres ejemplos donde esa correlación fue usada para engañar","improv"),
    wait_2: s2("Escenario del debate · La pausa que cambia todo","confident",
      "Pides 15 segundos. El salón se pregunta qué harás. Luego dices: 'Tengo cuatro preguntas para el argumento contrario'. Es más poderoso que cualquier respuesta directa.",
      "Jurado del debate",'"Forma de debate socrático. Muy maduro para su nivel."',
      '"Las preguntas son más poderosas que las afirmaciones. ¿Cuál haces primero?"',
      "Preguntar por la fuente del dato principal del argumento rival","Preguntar qué pasaría si la premisa principal fuera falsa","wait"),
    team_2: s2("Escenario del debate · Apoyo del equipo","happy",
      "Tu compañero Andrea toma la palabra y presenta tres estudios que refuerzan tu posición. El equipo funciona como una unidad. El rival no esperaba eso.",
      "Moderador",'"El trabajo en equipo argumentativo es una habilidad poco común."',
      '"Ahora el turno final es tuyo. ¿Cómo cierras el debate con contundencia?"',
      "Sintetizar todos los argumentos del equipo en una conclusión poderosa","Hacer una pregunta retórica final que deje al público reflexionando","team"),
    ...ENDS,
  },
  dig: { // Competencias Digitales — Crisis de seguridad
    breathe_2: s2("Laboratorio · Análisis de la situación","confident",
      "Con calma, revisas el log de accesos. Detectas que el intento vino de una red pública y que tu contraseña fue comprometida por un link de phishing hace 3 días.",
      "Instructor",'"Bien. Encontraste la causa raíz. ¿Cuál es el siguiente paso inmediato?"',
      '"Diagnóstico correcto. Ahora la respuesta técnica. ¿Qué priorizas primero?"',
      "Cambiar contraseña y activar autenticación en dos factores de inmediato","Avisar al instructor para reportar el incidente oficialmente al sistema","breathe"),
    improv_2: s2("Laboratorio · Acción rápida","confident",
      "Cambias la contraseña en 30 segundos, cierras todas las sesiones activas y activas 2FA. El instructor observa. El equipo te mira como referencia.",
      "Compañero Andrés",'"¿Cómo sabías exactamente qué hacer sin pensarlo tanto?"',
      '"La rapidez fue buena pero ¿cubriste todo? ¿Qué podrías haber olvidado?"',
      "Revisar si hay otras cuentas vinculadas que también puedan estar comprometidas","Hacer un reporte de incidente para dejar evidencia documentada","improv"),
    wait_2: s2("Laboratorio · Consulta estratégica","confident",
      "Antes de actuar, consultas con el instructor. Juntos identifican que el ataque fue coordinado y que otros tres estudiantes también están afectados.",
      "Instructor",'"Muy bien. Al consultar primero evitaste un error que hubiera borrado la evidencia."',
      '"El problema es mayor. ¿Cómo coordinas la respuesta grupal ahora?"',
      "Organizar a los tres afectados para hacer el proceso juntos de forma coordinada","Documentar el método de ataque para enseñarle al resto del grupo cómo protegerse","wait"),
    team_2: s2("Laboratorio · Resolución colaborativa","happy",
      "Tú y Camila dividen el trabajo: ella analiza los logs, tú aseguras las cuentas. En 12 minutos tienen el problema resuelto y documentado.",
      "Instructor",'"Trabajo coordinado, roles claros, comunicación fluida. Así se hace en equipos reales."',
      '"El equipo funcionó. ¿Qué lección comparten con el resto de la clase?"',
      "Presentar un checklist de seguridad que todos puedan usar desde hoy","Hacer una mini-demostración de cómo detectar phishing en tiempo real","team"),
    ...ENDS,
  },
  lid: { // Liderazgo — Crisis del proyecto
    breathe_2: s2("Sala de reuniones · Después del discurso","confident",
      "Tu mensaje fue honesto y claro: 'Fallamos, pero sabemos por qué y ya tenemos el plan para salir.' El equipo respira. La tensión baja notablemente en la sala.",
      "Director del proyecto",'"Bien. ¿Y ese plan cuándo está listo para ver?"',
      '"Te creen. Ahora necesitas demostrar que el plan es real. ¿Qué presentas?"',
      "Presentar un plan detallado con responsables y fechas para los próximos 5 días","Proponer una revisión diaria rápida de 10 minutos hasta la entrega final","breathe"),
    improv_2: s2("Sala de reuniones · La propuesta radical","confident",
      "Propones descartar lo que no funciona y rediseñar el núcleo en 48 horas. Arriesgado. El equipo duda. Pero es la única salida real que ven.",
      "Sofía (equipo)",'"¿Estás seguro? Si fallamos esto, ya no hay vuelta atrás."',
      '"El liderazgo a veces requiere apuestas grandes. ¿Cómo ganas la confianza del equipo?"',
      "Explicar el riesgo con total transparencia y dejar que el equipo decida juntos","Comprometerte a ser el primero en trabajar las próximas 48 horas sin parar","improv"),
    wait_2: s2("Sala de reuniones · El diagnóstico grupal","confident",
      "Escuchaste a todos durante 20 minutos. El patrón es claro: nadie sabía quién tomaba las decisiones finales. El problema era liderazgo difuso, no capacidad.",
      "Marcos (equipo)",'"Siempre pensé que alguien más estaba a cargo de eso."',
      '"El diagnóstico es claro. Ahora toca redefinir el modelo de toma de decisiones."',
      "Proponer un sistema RACI claro: quién decide, quién ejecuta, quién aprueba","Asumir tú el rol de decisor final para este proyecto y comunicarlo formalmente","wait"),
    team_2: s2("Sala de reuniones · El poder del equipo","happy",
      "La sesión grupal produjo tres ideas que ninguno habría tenido solo. El equipo está energizado. Ahora quieren ejecutar, no solo planear.",
      "Director del proyecto",'"Nunca vi tanto compromiso después de un fracaso. ¿Qué hiciste diferente?"',
      '"El equipo es tu mayor recurso. ¿Cómo mantienes ese nivel de compromiso?"',
      "Crear rituales de reconocimiento: celebrar pequeñas victorias del día a día","Dar autonomía real a cada miembro sobre su área, con rendición de cuentas clara","team"),
    ...ENDS,
  },
  emo: { // Inteligencia Emocional — Conflicto en el pasillo
    breathe_2: s2("Pasillo del colegio · Tu respuesta calmada","confident",
      "Respiras y dices tranquilamente: 'Entiendo que estás molesto. Hablemos cuando ambos estemos calmados.' Tu amigo se detiene. La rabia baja unos grados.",
      "Tu amigo (más calmado)",'"No esperaba esa respuesta. Pensé que me ibas a gritar."',
      '"El espejo emocional funciona. ¿Cómo abres el espacio para el diálogo real?"',
      "Proponer sentarse en un lugar tranquilo para hablar sin público","Validar su sentimiento antes de dar tu propia versión de los hechos","breathe"),
    improv_2: s2("Pasillo del colegio · Honestidad directa","confident",
      "Dices: 'Me duele que me hagas eso en público. Y también entiendo que algo te lastimó. ¿Qué fue lo que realmente pasó?' Tu amigo para en seco.",
      "Tu amigo (confundido)",'"Yo… en realidad no sé si fue lo que me contaron."',
      '"Abriste el canal. El conflicto era basado en información incompleta. ¿Qué propones?"',
      "Pedir que cuente exactamente qué le dijeron para aclarar desde ahí","Decirle que te importa más la amistad que tener razón en este momento","improv"),
    wait_2: s2("Pasillo del colegio · El espacio que sana","confident",
      "Te alejas 2 minutos. Respiras. Cuando regresas, tu amigo también está más calmado. El espacio fue el antídoto. Ahora pueden hablar de verdad.",
      "Tu amigo",'"Sé que me fui de las manos. Lo siento."',
      '"El espacio permitió que ambos se regularan. ¿Cómo usas este momento?"',
      "Abrazar el disculpe y proponer hablar del tema con calma hoy mismo","Decirle que aprecias la disculpa y que tú también quieres entender qué pasó","wait"),
    team_2: s2("Pasillo del colegio · La mediación amiga","happy",
      "Carolina, amiga de ambos, se acerca y ofrece mediar. Los tres se sientan. La conversación fluye mejor con un tercero neutral que escucha a los dos.",
      "Carolina",'"A veces los conflictos más difíciles son entre las personas que más se quieren."',
      '"La mediación funcionó. ¿Cómo cierras este momento para que quede sanado?"',
      "Establecer un acuerdo claro sobre cómo hablar directamente en el futuro","Agradecer a Carolina y proponerle a tu amigo salir juntos para reconectar","team"),
    ...ENDS,
  },
  cre: { // Creatividad — Presentación de proyecto
    breathe_2: s2("Clase de diseño · Contando el proceso","confident",
      "Empiezas con el proceso, no el resultado: 'Fallé 7 veces antes de llegar aquí. Y eso es exactamente de lo que quiero hablar.' La clase te escucha diferente.",
      "Prof. Ramírez",'"Interesante apertura. El proceso creativo suele ser más valioso que el resultado."',
      '"El proceso los enganchó. ¿Cómo presentas el resultado final con el mismo impacto?"',
      "Mostrar el resultado y compararlo visualmente con los intentos fallidos","Invitar a la clase a identificar qué mejoró entre los intentos y el final","cre"),
    improv_2: s2("Clase de diseño · El resultado primero","confident",
      "Muestras el resultado sin contexto y preguntas: '¿Qué ven?' Diez interpretaciones diferentes. Todas válidas. Luego explicas tu intención real.",
      "Compañero Juan",'"No esperaba ese significado. Ahora que lo explicas cambia todo."',
      '"Lo que no se entiende sin contexto necesita puente. ¿Cómo construyes ese puente?"',
      "Explicar el concepto central que guía toda la pieza","Usar una analogía o metáfora que haga el concepto accesible a todos","improv"),
    wait_2: s2("Clase de diseño · La pregunta que cambia todo","confident",
      "Preguntas: '¿Qué esperaban ver hoy?' Las respuestas te dan contexto. Entonces presentas tu trabajo dentro del marco de lo que el grupo necesita ver.",
      "Prof. Ramírez",'"Adaptar la presentación a la audiencia en tiempo real. Eso es comunicación creativa avanzada."',
      '"El grupo ya está involucrado. ¿Cómo los mantienes activos durante la presentación?"',
      "Hacer que cada quien diga una palabra que describe lo que ve al final","Proponer que voten por el elemento que más les impacta y por qué","wait"),
    team_2: s2("Clase de diseño · Presentación compartida","happy",
      "Tu compañera presenta la parte técnica mientras tú manejas la narrativa visual. La presentación tiene más dimensiones. El resultado es más rico que si lo hicieran solos.",
      "Prof. Ramírez",'"Lo colaborativo elevó el trabajo a un nivel que ninguno hubiera alcanzado solo."',
      '"La colaboración multiplicó el impacto. ¿Cómo integran el feedback del grupo?"',
      "Pedir a la clase 3 elementos que mejorarían y comprometerse a iterar","Agradecer el feedback colectivo y mencionar cuál incorporarán de inmediato","team"),
    ...ENDS,
  },
  inn: { // Innovación — Hackathon
    breathe_2: s2("Sala del hackathon · El pitch con lo que hay","confident",
      "Presentas el concepto sin demo: 'Tenemos la visión clara y los primeros pasos. Lo que ven hoy es la base de algo escalable.' El panel escucha con interés.",
      "Panel evaluador",'"La claridad conceptual es más valiosa que un prototipo incompleto. ¿Cuál es su plan de implementación en 30 días?"',
      '"La visión los convenció. Ahora necesitan ver que es ejecutable. ¿Qué muestras?"',
      "Presentar el roadmap de 30 días con hitos concretos y métricas de éxito","Mostrar una pantalla de diseño que comunique la experiencia de usuario final","breathe"),
    improv_2: s2("Sala del hackathon · El pivote radical","confident",
      "Propones un nuevo ángulo más simple: en lugar de la app completa, solo la función más valiosa como producto mínimo viable. El equipo lo adopta en 5 minutos.",
      "Tu compañera Ana",'"Eso es más enfocado. Y lo podemos mostrar hoy mismo funcionando."',
      '"El pivote fue inteligente. ¿Cómo lo presentas al panel sin que parezca una improvisación?"',
      "Enmarcarlo como una decisión estratégica de enfoque, no como una reducción","Mostrar que el MVP resuelve el 80% del problema con el 20% del esfuerzo","improv"),
    wait_2: s2("Sala del hackathon · Los 10 minutos clave","confident",
      "En 10 minutos concentrados el equipo termina el prototipo mínimo. Rudo pero funcional. Suficiente para demostrar el concepto de forma real.",
      "Juez técnico",'"Un prototipo que funciona dice mil veces más que 30 slides perfectos."',
      '"Lo que mostraron es real. ¿Cómo explican el potencial más allá del demo?"',
      "Proyectar cómo escala la solución una vez que se valide el prototipo","Mostrar el tamaño del mercado que esta solución podría impactar","wait"),
    team_2: s2("Sala del hackathon · División perfecta","happy",
      "Mientras uno termina el código, el otro construye un pitch impactante. Sincronización perfecta. Entran al stage con 2 minutos de sobra y confianza total.",
      "Facilitador del hackathon",'"La mejor presentación no siempre es la más pulida. A veces es la más coordinada."',
      '"El equipo ganó tiempo y confianza. ¿Cómo cierran el pitch para ganar?"',
      "Terminar con la historia de un usuario real que necesita exactamente su solución","Hacer que el demo hable por sí solo con una demostración en vivo final","team"),
    ...ENDS,
  },
  emp: { // Emprendimiento — Pitch de inversión
    breathe_2: s2("Sala del concurso · El problema primero","confident",
      "Empiezas: '1 de cada 3 jóvenes en esta ciudad no sabe cómo manejar su dinero. Eso cuesta.' Silencio total. El juez asiente. El problema está claro.",
      "Juez empresario",'"Bien definido. Ahora convénceme de que ustedes son los indicados para resolverlo."',
      '"El problema los enganchó. Ahora el equipo y la solución deben ser irresistibles."',
      "Mostrar por qué tu equipo tiene experiencia única para resolver este problema","Presentar la prueba de concepto: clientes reales que ya están usando la solución","breathe"),
    improv_2: s2("Sala del concurso · El dato que impacta","confident",
      "'3.200 millones de pesos se pierden en la informalidad en tu ciudad cada año.' El jurado intercambia miradas. Acabas de capturar su atención con una cifra imposible de ignorar.",
      "Jueza de negocios",'"Ese número es impresionante. ¿De dónde viene y cómo les afecta a ustedes?"',
      '"El dato abrió la puerta. Ahora tienes que conectarlo con tu solución de forma directa."',
      "Mostrar cómo tu modelo captura una fracción de ese mercado insatisfecho","Explicar el problema específico que ustedes resuelven dentro de ese gran mercado","improv"),
    wait_2: s2("Sala del concurso · La apertura serena","confident",
      "Agradeces, respiras y estructuras: 'Quiero compartirles tres hechos, un problema y una solución.' El jurado ya sabe que esto será diferente a los 20 pitches anteriores.",
      "Juez empresario",'"Aprecio la estructura. Muchos jóvenes improvisan. Tú preparaste algo."',
      '"La preparación ya habla de ti. ¿Qué tres hechos usas para construir tu caso?"',
      "Presentar datos de mercado + un problema concreto + tu solución única","Combinar estadística + historia personal + propuesta de valor clara","wait"),
    team_2: s2("Sala del concurso · El pitch compartido","happy",
      "Tu cofundador toma la parte financiera mientras tú manejas la visión y el producto. El jurado ve cómo se complementan. Eso vale más que cualquier número.",
      "Juez empresario",'"La complementariedad entre founders es lo que más busco antes de invertir."',
      '"El equipo los convenció. ¿Cómo cierran para asegurar la inversión?"',
      "Pedir el monto exacto con uso específico del dinero y métricas de retorno","Invitar al juez a ser un usuario antes de ser un inversionista","team"),
    ...ENDS,
  },
  tie: { // Gestión del Tiempo — Crisis del domingo
    breathe_2: s2("Tu escritorio · La lista de prioridades","confident",
      "Aplicas Eisenhower: urgente+importante primero. Son las 9:15 PM y ya tienes un plan claro. La ansiedad baja cuando el caos se convierte en orden.",
      "Tu plan de acción",'"3 tareas. 4 horas disponibles. Es ajustado pero es posible."',
      '"Tienes el mapa. Ahora la ejecución es clave. ¿Cómo proteges tu concentración?"',
      "Poner el teléfono en modo avión y usar bloques de 45 minutos de trabajo puro","Preparar el espacio de trabajo: agua, luz, sin distracciones, música instrumental","breathe"),
    improv_2: s2("Tu escritorio · La tarea más urgente primero","confident",
      "Empiezas con la entrega de ciencias que es a primera hora. En 90 minutos la tienes lista. La adrenalina funciona. Pero hay dos más y ya son las 11 PM.",
      "Tu alarma del celular",'"23:00 hs. Dos tareas más. Sigues con energía pero el tiempo aprieta."',
      '"Una abajo, dos por ir. La velocidad no puede vencer a la calidad. ¿Qué decides?"',
      "Hacer la segunda tarea completa y dejar la tercera para madrugada con alarma","Hacer ambas tareas de manera más concisa priorizando lo esencial","improv"),
    wait_2: s2("Tu escritorio · El análisis inteligente","confident",
      "Revisas el calendario y descubres que una de las entregas no es mañana sino el miércoles. Error de agenda. Tienes más tiempo del que creías.",
      "Tu agenda real",'"La entrega de Matemáticas es el miércoles. Solo son dos para mañana."',
      '"Verificar antes de actuar salvó tiempo y energía. ¿Cómo organizas las dos que quedan?"',
      "Hacer la más compleja primero mientras estás con más energía y lucidez","Dividir las 3 horas disponibles en bloques iguales para cada tarea pendiente","wait"),
    team_2: s2("Tu escritorio · El poder de pedir ayuda","happy",
      "Tu compañero Carlos acepta dividir la tarea de historia por capítulos. Cada uno hace su parte y comparten. El trabajo dura la mitad del tiempo.",
      "Carlos (compañero)",'"No me imaginé que podíamos hacer esto juntos. ¿Por qué no lo hacemos siempre así?"',
      '"La colaboración multiplicó el tiempo disponible. ¿Qué aprendes de esto para el futuro?"',
      "Proponer un sistema de estudio colaborativo permanente para este semestre","Establecer un grupo de apoyo mutuo donde todos aportan según sus fortalezas","team"),
    ...ENDS,
  },
  pro: { // Resolución de Problemas — Caso empresarial
    breathe_2: s2("Sala de casos · El mapa visual","confident",
      "En el pizarrón dibujas un diagrama causa-efecto. El grupo empieza a ver patrones. En 8 minutos identifican que el problema central no era el producto sino el servicio posventa.",
      "Facilitador",'"Excelente uso de herramientas de análisis. ¿Cuál es su hipótesis principal?"',
      '"El diagnóstico está tomando forma. ¿Cómo validan la hipótesis con los datos disponibles?"',
      "Buscar en los datos de ventas el patrón que confirme el problema de posventa","Proponer preguntar directamente a 3 clientes perdidos qué los hizo irse","breathe"),
    improv_2: s2("Sala de casos · La hipótesis rápida","confident",
      "Propones: 'El problema es precio'. Buscas el dato. El precio está en la media del mercado. La hipótesis cae. Pero el proceso de descartarla rápido ahorró tiempo.",
      "Compañera Valentina",'"Bien que lo intentaste. Ahora, ¿cuál es la siguiente hipótesis?"',
      '"Descartar rápido es una habilidad. ¿Qué segunda hipótesis propones con los datos disponibles?"',
      "Proponer que el problema es la experiencia del cliente, no el precio ni el producto","Analizar el NPS o las reseñas para encontrar el patrón de queja más frecuente","improv"),
    wait_2: s2("Sala de casos · Las preguntas correctas","confident",
      "Haces cinco preguntas al facilitador. La quinta revela que los clientes perdidos eran todos del segmento de mayor valor. Eso cambia todo el análisis.",
      "Facilitador",'"Esa pregunta es la que diferencia un analista bueno de uno excelente."',
      '"El segmento correcto ya está identificado. ¿Qué solución propones ahora?"',
      "Proponer un programa de retención específico para clientes de alto valor","Diseñar una estrategia de reactivación con propuesta de valor personalizada","wait"),
    team_2: s2("Sala de casos · División del análisis","happy",
      "Cada miembro analiza una dimensión: precio, producto, servicio, competencia. En 10 minutos tienen una visión 360 completa que ninguno hubiera alcanzado solo.",
      "Facilitador",'"El análisis colectivo es más robusto que el individual. ¿Cuál es su conclusión integrada?"',
      '"Tienen toda la información. ¿Cómo construyen la recomendación final?"',
      "Priorizar las 3 acciones con mayor impacto y menor costo de implementación","Presentar un plan de acción con responsables, recursos y plazo para cada recomendación","team"),
    ...ENDS,
  },
};

// Base outcomes (override per world if needed)
const BASE_OUTCOMES: Record<string, any> = {
  breathe:{ emoji:"✨", head:"¡Control bajo presión!", score:92, gains:{ "Comunicación":15,"Liderazgo":8,"Empatía":6,"Autogestión":10 }, strength:"Regulación emocional y presencia escénica perfecta", improve:"Incorporar datos cuantitativos para reforzar cada argumento" },
  improv: { emoji:"🔥", head:"¡Energía contagiosa!",   score:88, gains:{ "Comunicación":12,"Creatividad":16,"Liderazgo":6,"Empatía":5  }, strength:"Conexión instantánea con la audiencia desde el inicio", improve:"Añadir más estructura para sostener la atención hasta el final" },
  wait:   { emoji:"🧠", head:"¡Estratega reflexivo!",  score:90, gains:{ "Pensamiento Crítico":18,"Comunicación":8,"Empatía":5,"Autogestión":7 }, strength:"Planificación rápida bajo presión y claridad expositiva", improve:"Aumentar velocidad de respuesta en contextos más ágiles" },
  team:   { emoji:"🤝", head:"¡Líder colaborativo!",   score:95, gains:{ "Trabajo en Equipo":20,"Liderazgo":12,"Comunicación":8,"Empatía":9 }, strength:"Sinergia bajo presión y liderazgo natural innato", improve:"Desarrollar más confianza para actuar de forma individual también" },
};

// World-specific outcome overrides for skill gains relevance
const WORLD_OUTCOMES: Record<string, Record<string,any>> = {
  fin: { breathe:{ gains:{ "Ed. Financiera":15,"Pensamiento Crítico":12,"Comunicación":8,"Autogestión":8 } }, improv:{ gains:{ "Ed. Financiera":12,"Creatividad":14,"Comunicación":10,"Liderazgo":6 } }, wait:{ gains:{ "Ed. Financiera":18,"Pensamiento Crítico":16,"Autogestión":9,"Comunicación":5 } }, team:{ gains:{ "Ed. Financiera":15,"Trabajo en Equipo":18,"Liderazgo":10,"Comunicación":8 } } },
  tea: { breathe:{ gains:{ "Trabajo en Equipo":15,"Liderazgo":14,"Comunicación":8,"Autogestión":9 } }, improv:{ gains:{ "Trabajo en Equipo":12,"Creatividad":12,"Liderazgo":10,"Comunicación":8 } }, wait:{ gains:{ "Trabajo en Equipo":18,"Empatía":12,"Pensamiento Crítico":10,"Liderazgo":8 } }, team:{ gains:{ "Trabajo en Equipo":22,"Liderazgo":14,"Empatía":10,"Comunicación":6 } } },
  pen: { breathe:{ gains:{ "Pensamiento Crítico":16,"Comunicación":12,"Autogestión":8,"Liderazgo":6 } }, improv:{ gains:{ "Pensamiento Crítico":14,"Comunicación":14,"Creatividad":10,"Liderazgo":6 } }, wait:{ gains:{ "Pensamiento Crítico":20,"Comunicación":10,"Autogestión":8,"Empatía":6 } }, team:{ gains:{ "Pensamiento Crítico":16,"Trabajo en Equipo":18,"Comunicación":8,"Liderazgo":8 } } },
  lid: { breathe:{ gains:{ "Liderazgo":16,"Comunicación":12,"Autogestión":10,"Empatía":8 } }, improv:{ gains:{ "Liderazgo":14,"Creatividad":10,"Comunicación":12,"Autogestión":8 } }, wait:{ gains:{ "Liderazgo":18,"Pensamiento Crítico":16,"Empatía":10,"Autogestión":8 } }, team:{ gains:{ "Liderazgo":20,"Trabajo en Equipo":14,"Empatía":12,"Comunicación":8 } } },
  emo: { breathe:{ gains:{ "Empatía":16,"Autogestión":14,"Comunicación":10,"Liderazgo":6 } }, improv:{ gains:{ "Empatía":14,"Comunicación":16,"Autogestión":8,"Creatividad":8 } }, wait:{ gains:{ "Empatía":18,"Autogestión":16,"Pensamiento Crítico":10,"Comunicación":6 } }, team:{ gains:{ "Empatía":20,"Trabajo en Equipo":16,"Comunicación":8,"Liderazgo":6 } } },
  dig: { breathe:{ gains:{ "Comp. Digitales":16,"Pensamiento Crítico":12,"Autogestión":8,"Comunicación":6 } }, improv:{ gains:{ "Comp. Digitales":14,"Creatividad":10,"Autogestión":12,"Liderazgo":6 } }, wait:{ gains:{ "Comp. Digitales":18,"Pensamiento Crítico":16,"Autogestión":8,"Comunicación":6 } }, team:{ gains:{ "Comp. Digitales":15,"Trabajo en Equipo":18,"Pensamiento Crítico":10,"Comunicación":8 } } },
};

function getOutcome(path: string, worldId?: string) {
  const base = { ...BASE_OUTCOMES[path] };
  if (worldId && WORLD_OUTCOMES[worldId]?.[path]) {
    return { ...base, gains: WORLD_OUTCOMES[worldId][path].gains };
  }
  return base;
}

// Keep backward compatibility
const OUTCOMES = BASE_OUTCOMES;

// Two separate array references — recharts keys SVG children by array identity;
// sharing one array causes duplicate key collisions between PolarGrid and PolarAngleAxis.
const mkRadar = () => [
  { skill:"Comunicación", value:72 },{ skill:"Finanzas", value:45 },
  { skill:"Trabajo Eq.",  value:88 },{ skill:"Empatía",  value:60 },
  { skill:"Pensamiento",  value:55 },{ skill:"Creatividad", value:40 },
];
const RADAR_DATA         = mkRadar(); // student dashboard
const RADAR_DATA_TEACHER = mkRadar(); // teacher panel

const TEACHER_DATA = [
  { name:"Alejandro T.", avatar:"s1", alert:false, com:72, lid:58, emp:64, pen:55, missions:14, streak:5,  level:7 },
  { name:"Valentina R.", avatar:"s2", alert:false, com:88, lid:74, emp:90, pen:70, missions:22, streak:12, level:9 },
  { name:"Mateo G.",     avatar:"s3", alert:true,  com:42, lid:30, emp:50, pen:38, missions:9,  streak:2,  level:5 },
  { name:"Isabela M.",   avatar:"s4", alert:false, com:95, lid:89, emp:82, pen:91, missions:31, streak:21, level:11 },
  { name:"Sebastián V.", avatar:"s5", alert:true,  com:35, lid:25, emp:42, pen:30, missions:6,  streak:1,  level:4 },
  { name:"Camila J.",    avatar:"s6", alert:false, com:78, lid:65, emp:80, pen:60, missions:19, streak:9,  level:8 },
];

const AI_QA: Record<string,string> = {
  "¿Cómo mejorar mi liderazgo?":       "Tu comunicación (72%) es base excelente para liderar. Te recomiendo 'Debate en tiempo real'. Practicar decisiones bajo presión te llevará al siguiente nivel.",
  "¿Qué habilidad debería practicar?": "Tu Creatividad está en 40% — la más baja. Cuando se desbloquee ese mundo, será prioridad. Mientras tanto, 'Carta de bienvenida' activa ese músculo.",
  "¿Qué misión recomiendas?":          "'Debate en tiempo real' ahora: combina comunicación + pensamiento crítico, da 250 XP y te lleva al siguiente nivel esta semana.",
  "¿Qué carrera va con mis fortalezas?":"Con comunicación alta (72%) y trabajo en equipo (88%): Relaciones Públicas, Psicología Organizacional, Pedagogía y Comunicación Corporativa.",
};

const BADGES = [
  { emoji:"🌟", name:"Primera misión" },{ emoji:"🔥", name:"Racha 5 días" },
  { emoji:"🏆", name:"Top 10 ranking" },{ emoji:"💡", name:"Pensador crítico" },
  { emoji:"🎯", name:"Sin errores"    },{ emoji:"⚡", name:"Velocista"       },
];

const CONFETTI_COLORS = [P.v3,P.a3,P.g3,P.r3,P.c3,P.p3];
const CONFETTI = Array.from({ length:60 }, (_,i) => ({
  left:`${((i*7+3)*13)%100}%`, delay:`${(i*.042)%2}s`,
  dur:`${1.1+(i*.031)%1.4}s`, color:CONFETTI_COLORS[i%6],
  size:5+(i%7), rot:(i*37)%360,
}));
const STARS = Array.from({ length:50 }, (_,i) => ({
  top:`${((i*11+7)*19)%100}%`, left:`${((i*13+3)*17)%100}%`,
  sz:1+(i%3), op:.05+((i*7)%20)/100, d:`${(i*.3)%4}s`, dur:`${2+(i*.18)%3}s`,
}));

// ─── SVG Characters ───────────────────────────────────────────────────────────
function CharSVG({ hair="#2C1810", hairStyle="A", skin="#FDBCB4", shirt="#6D28D9", mood="happy", size=100 }: any) {
  const w = size * 0.7, h = size;
  return (
    <svg viewBox="0 0 70 100" width={w} height={h} fill="none">
      <ellipse cx="35" cy="97" rx="16" ry="3.5" fill="rgba(0,0,0,0.25)" />
      {/* Legs */}
      <rect x="19" y="72" width="12" height="24" rx="6" fill="#1E293B" />
      <rect x="39" y="72" width="12" height="24" rx="6" fill="#1E293B" />
      {/* Shoes */}
      <ellipse cx="25" cy="95" rx="9" ry="3.5" fill="#111827" />
      <ellipse cx="45" cy="95" rx="9" ry="3.5" fill="#111827" />
      {/* Body */}
      <rect x="14" y="43" width="42" height="33" rx="10" fill={shirt} />
      {/* Collar */}
      <path d="M29 43 L35 51 L41 43" fill="rgba(255,255,255,0.22)" />
      {/* Arms */}
      <rect x="1"  y="46" width="14" height="9"  rx="4.5" fill={shirt} />
      <rect x="55" y="46" width="14" height="9"  rx="4.5" fill={shirt} />
      {/* Hands */}
      <circle cx="8"  cy="58" r="5" fill={skin} />
      <circle cx="62" cy="58" r="5" fill={skin} />
      {/* Neck */}
      <rect x="29" y="33" width="12" height="13" rx="5" fill={skin} />
      {/* Head */}
      <ellipse cx="35" cy="22" rx="19" ry="21" fill={skin} />
      {/* Ears */}
      <ellipse cx="16" cy="22" rx="3.5" ry="4.5" fill={skin} />
      <ellipse cx="54" cy="22" rx="3.5" ry="4.5" fill={skin} />
      {/* Hair */}
      {hairStyle==="A"&&<><ellipse cx="35" cy="6" rx="19" ry="11" fill={hair}/><rect x="16" y="4" width="38" height="14" rx="7" fill={hair}/></>}
      {hairStyle==="B"&&<><ellipse cx="35" cy="6" rx="19" ry="11" fill={hair}/><rect x="14" y="4" width="8" height="26" rx="4" fill={hair}/><rect x="48" y="4" width="8" height="26" rx="4" fill={hair}/></>}
      {hairStyle==="C"&&<ellipse cx="35" cy="6" rx="19" ry="9" fill={hair}/>}
      {hairStyle==="D"&&<><ellipse cx="35" cy="5" rx="19" ry="9" fill={hair}/><path d="M16 8 Q35 -2 54 8 L54 18 Q35 9 16 18Z" fill={hair}/></>}
      {/* Eyes */}
      <ellipse cx="27" cy="20" rx="3.5" ry="4" fill="white" />
      <ellipse cx="43" cy="20" rx="3.5" ry="4" fill="white" />
      <circle cx="28" cy="21" r="2.2" fill="#1A1A2E" />
      <circle cx="44" cy="21" r="2.2" fill="#1A1A2E" />
      <circle cx="28.8" cy="19.5" r=".9" fill="white" />
      <circle cx="44.8" cy="19.5" r=".9" fill="white" />
      {/* Brows */}
      <path d={mood==="nervous"?"M24 13 Q27 11 30 13":"M24 12.5 Q27 10.5 30 12.5"} stroke={hair} strokeWidth="2" strokeLinecap="round"/>
      <path d={mood==="nervous"?"M40 13 Q43 11 46 13":"M40 12.5 Q43 10.5 46 12.5"} stroke={hair} strokeWidth="2" strokeLinecap="round"/>
      {/* Mouth */}
      {mood==="happy"    &&<path d="M28 31 Q35 37 42 31" stroke="#B07060" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {mood==="nervous"  &&<path d="M29 33 Q35 32 41 33" stroke="#B07060" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {mood==="confident"&&<path d="M28 31 Q35 36 42 31" stroke="#B07060" strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
      {/* Blush if nervous */}
      {mood==="nervous"&&<><ellipse cx="22" cy="26" rx="4" ry="2.5" fill="rgba(255,120,120,0.18)"/><ellipse cx="48" cy="26" rx="4" ry="2.5" fill="rgba(255,120,120,0.18)"/></>}
      {/* Sweat drops if nervous */}
      {mood==="nervous"&&<><circle cx="16" cy="16" r="2.2" fill="rgba(100,200,255,0.45)"/><circle cx="14" cy="24" r="1.5" fill="rgba(100,200,255,0.35)"/></>}
    </svg>
  );
}

function TeacherSVG({ size=90 }: any) {
  return (
    <svg viewBox="0 0 70 100" width={size*.7} height={size} fill="none">
      <ellipse cx="35" cy="97" rx="14" ry="3" fill="rgba(0,0,0,0.2)" />
      <rect x="19" y="72" width="12" height="24" rx="6" fill="#1E293B" />
      <rect x="39" y="72" width="12" height="24" rx="6" fill="#1E293B" />
      <ellipse cx="25" cy="95" rx="9" ry="3.5" fill="#111827" />
      <ellipse cx="45" cy="95" rx="9" ry="3.5" fill="#111827" />
      <rect x="14" y="43" width="42" height="33" rx="10" fill="#0E7490" />
      {/* Shirt detail - collar */}
      <path d="M28 43 L35 50 L42 43" fill="rgba(255,255,255,0.2)" />
      {/* Arm pointing at board */}
      <rect x="1"  y="46" width="14" height="9" rx="4.5" fill="#0E7490" />
      <rect x="55" y="46" width="14" height="9" rx="4.5" fill="#0E7490" />
      <circle cx="8"  cy="58" r="5" fill="#D08B5B" />
      <circle cx="62" cy="58" r="5" fill="#D08B5B" />
      <rect x="30" y="34" width="10" height="12" rx="5" fill="#D08B5B" />
      <ellipse cx="35" cy="21" rx="18" ry="20" fill="#D08B5B" />
      <ellipse cx="16" cy="21" rx="3" ry="4" fill="#D08B5B" />
      <ellipse cx="54" cy="21" rx="3" ry="4" fill="#D08B5B" />
      {/* Hair */}
      <ellipse cx="35" cy="5" rx="18" ry="10" fill="#1A1A2E" />
      <rect x="14" y="4" width="8" height="24" rx="4" fill="#1A1A2E" />
      <rect x="48" y="4" width="8" height="24" rx="4" fill="#1A1A2E" />
      <ellipse cx="27" cy="19" rx="3" ry="3.5" fill="white" />
      <ellipse cx="43" cy="19" rx="3" ry="3.5" fill="white" />
      <circle cx="28" cy="20" r="2" fill="#1A1A2E" />
      <circle cx="44" cy="20" r="2" fill="#1A1A2E" />
      <circle cx="28.7" cy="18.5" r=".8" fill="white" />
      <circle cx="44.7" cy="18.5" r=".8" fill="white" />
      <path d="M29 30 Q35 35 41 30" stroke="#8B5E52" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Illustrated Classroom Scene ───────────────────────────────────────────────
function ClassroomScene({ mood = "nervous" }: { mood?: string }) {
  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%" style={{ display:"block" }}>
      {/* Room bg */}
      <rect width="800" height="460" fill="#060E1C"/>
      {/* Ceiling */}
      <rect width="800" height="60" fill="#0A1628"/>
      {/* Back wall */}
      <rect y="60" width="800" height="300" fill="#0D1E38"/>
      {/* Floor */}
      <rect y="360" width="800" height="100" fill="#091525"/>
      <rect y="358" width="800" height="4" fill="rgba(255,255,255,0.04)"/>

      {/* Ceiling lights */}
      <ellipse cx="200" cy="15" rx="40" ry="10" fill="#1B2A45"/>
      <rect x="195" y="15" width="10" height="40" fill="#1B2A45"/>
      <ellipse cx="200" cy="55" rx="30" ry="8" fill="rgba(255,220,120,0.12)"/>
      <ellipse cx="600" cy="15" rx="40" ry="10" fill="#1B2A45"/>
      <rect x="595" y="15" width="10" height="40" fill="#1B2A45"/>
      <ellipse cx="600" cy="55" rx="30" ry="8" fill="rgba(255,220,120,0.12)"/>

      {/* Windows left */}
      <rect x="25" y="80" width="110" height="160" rx="5" fill="#1C3554"/>
      <rect x="35" y="90" width="90" height="140" rx="3" fill="#0F2540"/>
      <line x1="80" y1="90" x2="80" y2="230" stroke="rgba(255,255,255,0.09)" strokeWidth="2"/>
      <line x1="35" y1="160" x2="125" y2="160" stroke="rgba(255,255,255,0.09)" strokeWidth="2"/>
      <rect x="35" y="90" width="90" height="140" rx="3" fill="rgba(120,180,255,0.05)"/>
      {/* Window glow */}
      <ellipse cx="80" cy="240" rx="50" ry="15" fill="rgba(120,180,255,0.04)"/>

      {/* Windows right */}
      <rect x="665" y="80" width="110" height="160" rx="5" fill="#1C3554"/>
      <rect x="675" y="90" width="90" height="140" rx="3" fill="#0F2540"/>
      <line x1="720" y1="90" x2="720" y2="230" stroke="rgba(255,255,255,0.09)" strokeWidth="2"/>
      <line x1="675" y1="160" x2="765" y2="160" stroke="rgba(255,255,255,0.09)" strokeWidth="2"/>
      <rect x="675" y="90" width="90" height="140" rx="3" fill="rgba(120,180,255,0.05)"/>

      {/* Blackboard */}
      <rect x="170" y="70" width="460" height="230" rx="8" fill="#0C2F1E"/>
      <rect x="180" y="80" width="440" height="210" rx="5" fill="#0F3524"/>
      {/* Board frame */}
      <rect x="170" y="70" width="460" height="230" rx="8" fill="none" stroke="#1A5E38" strokeWidth="5"/>
      {/* Chalk tray */}
      <rect x="170" y="296" width="460" height="12" rx="4" fill="#1A5E38"/>
      {/* Board content */}
      <text x="400" y="140" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="22" fontWeight="600" fontFamily="Poppins,sans-serif">Cambio Climático Global</text>
      <text x="400" y="166" textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="13" fontFamily="Poppins,sans-serif">Los efectos en nuestro planeta hoy</text>
      <line x1="220" y1="188" x2="580" y2="188" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
      <line x1="230" y1="210" x2="450" y2="210" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="230" y1="228" x2="520" y2="228" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="230" y1="246" x2="480" y2="246" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      {/* Chalk drawing - simple globe */}
      <circle cx="530" cy="190" r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
      <ellipse cx="530" cy="190" rx="20" ry="35" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <line x1="495" y1="190" x2="565" y2="190" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>

      {/* Teacher (right side) */}
      <g transform="translate(628, 190)">
        <TeacherSVG size={110}/>
      </g>
      {/* Pointer arm extended */}
      <line x1="636" y1="240" x2="580" y2="200" stroke="#0E7490" strokeWidth="10" strokeLinecap="round"/>
      <circle cx="580" cy="200" r="5" fill="rgba(255,255,255,0.4)"/>

      {/* Spotlight beam from ceiling */}
      <path d="M400 0 L310 360 L490 360 Z" fill="rgba(255,220,100,0.03)"/>
      <ellipse cx="400" cy="360" rx="75" ry="12" fill="rgba(255,220,100,0.07)"/>

      {/* Student (player) at front - center */}
      <g transform="translate(350, 228)">
        <CharSVG
          hair="#2C1810" hairStyle="A"
          skin="#FDBCB4" shirt="#6D28D9"
          mood={mood} size={115}
        />
      </g>

      {/* Audience silhouettes - 2 rows */}
      {[80,175,295,505,625,720].map((x,i)=>(
        <g key={`r1-${i}`} transform={`translate(${x},285)`}>
          <ellipse cx="0" cy="-22" rx="14" ry="16" fill={i%2===0?"#1B2F4A":"#162840"} opacity=".7"/>
          <rect x="-12" y="-8" width="24" height="20" rx="6" fill={i%2===0?"#1B2F4A":"#162840"} opacity=".7"/>
          {/* Desk */}
          <rect x="-22" y="14" width="44" height="7" rx="3.5" fill="#0F2A45"/>
          <rect x="-16" y="21" width="32" height="18" rx="3" fill="#0C2238"/>
        </g>
      ))}
      {[120,240,370,430,560,680].map((x,i)=>(
        <g key={`r2-${i}`} transform={`translate(${x},330)`}>
          <ellipse cx="0" cy="-18" rx="12" ry="14" fill="#131E30" opacity=".5"/>
          <rect x="-10" y="-6" width="20" height="16" rx="5" fill="#131E30" opacity=".5"/>
        </g>
      ))}

      {/* Highlight glow under player */}
      <ellipse cx="400" cy="362" rx="55" ry="9" fill="rgba(255,220,100,0.1)"/>
    </svg>
  );
}

// ─── Minimal UI helpers ───────────────────────────────────────────────────────
const card = { background: P.s1, borderColor: P.border } as const;

function LXLogo({ size=32 }:{ size?:number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center rounded-xl font-black" style={{ width:size, height:size, background:g(P.v2,P.c2), fontSize:size*.46, color:"#fff", letterSpacing:"-1px", boxShadow:`0 4px 16px rgba(124,58,237,.45)` }}>LX</div>
      <span className="font-black tracking-tight" style={{ fontSize:size*.56, color:P.text }}>LifeXperience</span>
    </div>
  );
}

function XPBar({ cur, max, lv }:{ cur:number; max:number; lv:number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5"><span style={{ color:P.text }}>Nv.{lv} → Nv.{lv+1}</span><span style={{ color:P.v4 }}>{cur}/{max} XP</span></div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width:`${(cur/max)*100}%`, background:g(P.v2,P.v4,"90deg"), boxShadow:`0 0 8px ${P.v3}88`, transition:"width 1s ease" }}/>
      </div>
    </div>
  );
}

function Skill({ label, value, gain, color=P.v3 }:{ label:string; value:number; gain?:number; color?:string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color:"rgba(240,246,255,.75)" }}>{label}</span>
        <div className="flex gap-2">{gain!==undefined&&<span className="font-black" style={{ color:P.g3 }}>+{gain}</span>}<span className="font-bold" style={{ color }}>{value}%</span></div>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width:`${value}%`, background:`linear-gradient(90deg,${color}99,${color})`, boxShadow:`0 0 5px ${color}55` }}/>
      </div>
    </div>
  );
}

function StatPill({ icon, val, label, color }:{ icon:string; val:string; label:string; color:string }) {
  return (
    <div className="rounded-2xl p-4 text-center border" style={card}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-black text-lg" style={{ color }}>{val}</div>
      <div className="text-xs mt-0.5" style={{ color:P.muted }}>{label}</div>
    </div>
  );
}

function DiffBadge({ level }:{ level:"Básico"|"Intermedio"|"Avanzado" }) {
  const m = { Básico:[P.g3,"rgba(16,185,129,.18)"], Intermedio:[P.a3,"rgba(245,158,11,.18)"], Avanzado:[P.r3,"rgba(239,68,68,.18)"] };
  const [c, bg] = m[level];
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color:c, background:bg, borderColor:`${c}44` }}>{level}</span>;
}

function BackArrow({ onClick }:{ onClick:()=>void }) {
  return <button onClick={onClick} className="w-9 h-9 rounded-xl flex items-center justify-center border hover:bg-white/5 transition-colors" style={{ background:P.s2, borderColor:P.border, color:P.muted }}><ArrowLeft size={16}/></button>;
}

function InputField({ label, type="text", value, onChange, placeholder, error, hint, right, onKeyDown }:any) {
  return (
    <div className="mb-4">
      {label&&<label className="block text-xs font-bold mb-1.5" style={{ color:P.muted }}>{label}</label>}
      <div className="relative">
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
          className="w-full rounded-xl px-4 py-3 text-sm border focus:outline-none transition-all"
          style={{ background:P.s2, borderColor:error?"#EF4444":P.border, color:P.text }}
          onFocus={e=>{(e.target as HTMLElement).style.borderColor=P.v3}}
          onBlur={e=>{(e.target as HTMLElement).style.borderColor=error?"#EF4444":P.border}}
        />
        {right&&<div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error&&<p className="text-xs mt-1" style={{ color:P.r3 }}>{error}</p>}
      {hint&&!error&&<p className="text-xs mt-1" style={{ color:P.muted }}>{hint}</p>}
    </div>
  );
}

function PrimaryBtn({ children, onClick, full=false, variant="violet", disabled=false, size="md" }:any) {
  const bgs:Record<string,string> = { violet:g(P.v2,P.v3), cyan:g(P.c2,P.c3), green:g(P.g2,P.g3), ghost:"rgba(255,255,255,0.07)" };
  const shads:Record<string,string> = { violet:`0 6px 20px rgba(109,40,217,.38)`, cyan:`0 6px 20px rgba(14,165,233,.3)`, green:`0 6px 20px rgba(16,185,129,.3)`, ghost:"none" };
  const pad = size==="lg"?"py-4 px-8 text-base font-black":size==="sm"?"py-1.5 px-4 text-xs font-bold":"py-3 px-6 text-sm font-bold";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${full?"w-full":""} ${pad} ${disabled?"opacity-50 cursor-not-allowed":""} text-white`}
      style={{ background:bgs[variant], boxShadow:shads[variant], border:variant==="ghost"?`1px solid ${P.border}`:"none" }}>
      {children}
    </button>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // Auth — Supabase-backed
  const [authStep, setAuthStep]       = useState<AuthStep>("splash");
  const [currentUser, setCurrentUser] = useState<User|null>(null);
  const [authLoading, setAuthLoading] = useState(true); // checking session on mount
  // Login form
  const [lEmail, setLEmail]   = useState("");
  const [lPw, setLPw]         = useState("");
  const [lError, setLError]   = useState("");
  const [showPw, setShowPw]   = useState(false);
  // Register form
  const [rName, setRName]     = useState("");
  const [rLast, setRLast]     = useState("");
  const [rEmail, setREmail]   = useState("");
  const [rPw, setRPw]         = useState("");
  const [rPw2, setRPw2]       = useState("");
  const [rGrade, setRGrade]   = useState("3°A");
  const [rHair, setRHair]     = useState(HAIR_COLORS[0]);
  const [rHairSt, setRHairSt] = useState("A");
  const [rSkin, setRSkin]     = useState(SKIN_TONES[0]);
  const [rShirt, setRShirt]   = useState(SHIRT_COLORS[0]);
  const [rPet, setRPet]       = useState("🐶");
  const [rSubj, setRSubj]     = useState("");
  const [rGrp, setRGrp]       = useState("3°A · 3°B");
  const [rErrors, setRErrors] = useState<Record<string,string>>({});
  const [rStep, setRStep]     = useState(1);
  // App state
  const [appScreen, setAppScreen]         = useState<AppScreen>("home");
  const [selectedWorld, setSelectedWorld] = useState<typeof WORLDS[0]|null>(null);
  const [selMission, setSelMission]       = useState<MissionItem|null>(null);
  const [simScene, setSimScene]           = useState("start");
  const [simPath, setSimPath]             = useState<string|null>(null);
  const [skillGains, setSkillGains]       = useState<Record<string,number>>({});
  const [confetti, setConfetti]           = useState(false);
  const [expandedS, setExpandedS]         = useState<string|null>(null);
  // ── Teacher AI Case Generator ───────────────────────────────────────────────
  type TeacherTab = "dashboard"|"ai"|"plans";
  const [teacherTab, setTeacherTab]       = useState<TeacherTab>("dashboard");
  const [caseWorldId, setCaseWorldId]     = useState("com");
  const [caseDiff, setCaseDiff]           = useState<"Básico"|"Intermedio"|"Avanzado">("Intermedio");
  const [caseTarget, setCaseTarget]       = useState("all");
  const [caseContext, setCaseContext]     = useState("");
  const [generatedCase, setGeneratedCase] = useState<GenCase|null>(null);
  const [caseGenerating, setCaseGenerating] = useState(false);
  const [studentPlans, setStudentPlans]   = useState<Record<string,GenCase[]>>({});
  const [aiMsg, setAiMsg]                 = useState("");
  const [aiResp, setAiResp]               = useState<string|null>(null);
  const [aiLoad, setAiLoad]               = useState(false);
  // Avatar state (mirrors user's config)
  const [avHair, setAvHair]     = useState(HAIR_COLORS[0]);
  const [avHairSt, setAvHairSt] = useState("A");
  const [avSkin, setAvSkin]     = useState(SKIN_TONES[0]);
  const [avShirt, setAvShirt]   = useState(SHIRT_COLORS[0]);
  const [avPet, setAvPet]       = useState("🐶");
  const [avTab, setAvTab]       = useState<"char"|"pet">("char");
  // ── Interactive simulation ──────────────────────────────────────────────────
  type SimPhase = "narrate"|"dialogue"|"guide"|"choices"|"chosen"|"result";
  const [simPhase, setSimPhase]       = useState<SimPhase>("narrate");
  const [twTarget, setTwTarget]       = useState("");          // current text for typewriter
  const [countdown, setCountdown]     = useState(15);
  const [choiceStart, setChoiceStart] = useState(0);
  const [bonusXP, setBonusXP]         = useState(0);
  const [audioOn, setAudioOn]         = useState(false);
  const [doneMissions, setDoneMissions] = useState<Record<string,{score:number;xp:number;path:string}>>({});
  const [particles, setParticles]     = useState<{id:number;emoji:string;x:number;delay:number}[]>([]);
  const [levelUpShow, setLevelUpShow] = useState(false);
  const [animXP, setAnimXP]           = useState(0);
  const prevLevelRef                  = useRef(0);
  // Typewriter for splash
  const [tText, setTText] = useState("");
  const TAGLINE = "Practica la vida antes de vivirla.";
  useEffect(() => {
    if (authStep !== "splash") return;
    let i=0; setTText("");
    const t = setInterval(()=>{ i++; setTText(TAGLINE.slice(0,i)); if(i>=TAGLINE.length) clearInterval(t); }, 50);
    return ()=>clearInterval(t);
  }, [authStep]);

  const u = currentUser!;
  const xpInLv = currentUser ? currentUser.xp%500 : 0;
  const outcome = simPath ? getOutcome(simPath, selectedWorld?.id) : null;
  // Merge base SIM with world-specific overrides (world scenes replace base scenes)
  const activeSim = { ...SIM, ...(selectedWorld ? (WORLD_SIMS[selectedWorld.id] ?? {}) : {}) };
  const scene = activeSim[simScene];
  const confettiList = useMemo(()=>CONFETTI,[]);

  // ── typewriter target changes with sim phase ────────────────────────────────
  useEffect(() => {
    if (appScreen !== "sim") return;
    const textMap: Partial<Record<SimPhase,string>> = {
      narrate:  scene?.narration || "",
      dialogue: scene?.dialogue  || "",
      guide:    scene?.guide     || "",
    };
    setTwTarget(textMap[simPhase] || "");
  }, [simPhase, simScene, appScreen]);

  // ── countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (simPhase !== "choices") return;
    setCountdown(15); setChoiceStart(Date.now());
    const t = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [simPhase, simScene]);

  // ── auto-progress dialogue → guide ─────────────────────────────────────────
  const { chars: twChars, done: twDone, skip: twSkip } = useTypewriter(twTarget);
  useEffect(() => {
    if (simPhase === "dialogue" && twDone && appScreen === "sim") {
      const t = setTimeout(() => setSimPhase("guide"), 900);
      return () => clearTimeout(t);
    }
  }, [simPhase, twDone, appScreen]);

  // ── chosen → next phase (result or narrate) ────────────────────────────────
  useEffect(() => {
    if (simPhase !== "chosen" || appScreen !== "sim") return;
    const t = setTimeout(() => {
      setSimPhase(simPath !== null ? "result" : "narrate");
    }, 2200);
    return () => clearTimeout(t);
  }, [simPhase, simPath, appScreen]);

  // ── animate XP counter ─────────────────────────────────────────────────────
  useEffect(() => {
    const target = currentUser?.xp ?? 0;
    if (animXP === target) return;
    const diff = Math.abs(target - animXP);
    const step = Math.max(1, Math.ceil(diff / 40));
    const t = setInterval(() => {
      setAnimXP(p => {
        const next = target > p ? Math.min(p + step, target) : Math.max(p - step, target);
        if (next === target) clearInterval(t);
        return next;
      });
    }, 35);
    return () => clearInterval(t);
  }, [currentUser?.xp]);

  // ── TTS: habla en español con carga asíncrona de voces ────────────────────
  // Precargar voces al montar (algunos navegadores necesitan esto)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices(); // dispara carga inicial
  }, []);

  useEffect(() => {
    if (!audioOn || !("speechSynthesis" in window) || appScreen !== "sim") return;
    const textMap: Partial<Record<SimPhase,string>> = {
      narrate:  scene?.narration || "",
      dialogue: scene?.dialogue  || "",
      guide:    scene?.guide     || "",
    };
    const text = textMap[simPhase];
    if (!text) return;

    let cancelled = false;
    let tid: ReturnType<typeof setTimeout>;

    function pickSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
      // Prioridad: es-ES online → es-ES local → es-MX → es-US → es-419 → cualquier es-*
      return (
        voices.find(v => v.lang === "es-ES"  && !v.localService) ||
        voices.find(v => v.lang === "es-ES") ||
        voices.find(v => v.lang === "es-MX") ||
        voices.find(v => v.lang === "es-US") ||
        voices.find(v => v.lang === "es-419") ||
        voices.find(v => v.lang.startsWith("es-")) ||
        voices.find(v => v.lang.toLowerCase().startsWith("es"))
      );
    }

    function doSpeak() {
      if (cancelled) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text as string);
      utter.lang    = "es-ES";
      utter.rate    = 0.88;
      utter.pitch   = simPhase === "dialogue" ? 1.12 : simPhase === "guide" ? 1.05 : 1.0;
      utter.volume  = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const esVoice = pickSpanishVoice(voices);
      if (esVoice) {
        utter.voice = esVoice;
        console.debug("[TTS] voz:", esVoice.name, esVoice.lang);
      } else {
        console.debug("[TTS] sin voz española, usando lang=es-ES");
      }

      tid = setTimeout(() => {
        if (!cancelled) window.speechSynthesis.speak(utter);
      }, 180);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      // Voces aún no cargadas — espera el evento voiceschanged
      const onVoicesChanged = () => doSpeak();
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return () => {
        cancelled = true;
        clearTimeout(tid);
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }

    return () => {
      cancelled = true;
      clearTimeout(tid);
      window.speechSynthesis.cancel();
    };
  }, [simPhase, simScene, audioOn, appScreen]);

  // ── helpers ────────────────────────────────────────────────────────────────
  function calcBonusXP() {
    const secs = (Date.now() - choiceStart) / 1000;
    return secs < 5 ? 30 : secs < 10 ? 15 : 0;
  }

  function spawnParticles(emoji: string) {
    const ps = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i, emoji, x: 5 + Math.random() * 90, delay: i * 0.08,
    }));
    setParticles(ps);
    setTimeout(() => setParticles([]), 2200);
  }

  // ─── Auth helpers ──────────────────────────────────────────────────────────
  // ─── Supabase: restore session on mount ────────────────────────────────────
  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) applyProfile(profile);
      }
      setAuthLoading(false);
    });

    // Listen for auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) applyProfile(profile);
          setAuthLoading(false);
        } else if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setAuthStep("splash");
          setAuthLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  function applyProfile(profile: Profile) {
    // Map DB profile → local User shape
    const user: User = {
      id: profile.id, name: profile.name, last: profile.last,
      email: profile.email, grade: profile.grade,
      hairColor: profile.hair_color, hairStyle: profile.hair_style,
      skinTone: profile.skin_tone, shirtColor: profile.shirt_color,
      pet: profile.pet, level: profile.level, xp: profile.xp,
      coins: profile.coins, streak: profile.streak, role: profile.role,
      subject: profile.subject ?? undefined,
      group: profile.group_name ?? undefined,
    };
    setCurrentUser(user);
    setAvHair(user.hairColor); setAvHairSt(user.hairStyle);
    setAvSkin(user.skinTone);  setAvShirt(user.shirtColor);
    setAvPet(user.pet || "🐶");
    setLEmail(""); setLPw(""); setLError("");
    setAnimXP(user.xp);
  }

  // ─── Login student ──────────────────────────────────────────────────────────
  async function loginS() {
    setLError("");
    if (!lEmail.includes("@")) { setLError("Ingresa un correo válido"); return; }
    if (lPw.length < 6) { setLError("La contraseña debe tener al menos 6 caracteres"); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: lEmail.trim(), password: lPw });
    if (error) setLError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
  }

  // ─── Login teacher ──────────────────────────────────────────────────────────
  async function loginT() {
    setLError("");
    if (!lEmail.includes("@")) { setLError("Ingresa un correo válido"); return; }
    if (lPw.length < 6) { setLError("La contraseña debe tener al menos 6 caracteres"); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: lEmail.trim(), password: lPw });
    if (error) setLError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
  }

  // ─── Validate student reg step 1 ───────────────────────────────────────────
  function validateS1() {
    const e:Record<string,string>={};
    if(!rName.trim()) e.name="Nombre requerido";
    if(!rLast.trim()) e.last="Apellido requerido";
    if(!rEmail.includes("@")) e.email="Correo inválido";
    if(rPw.length<6) e.pw="Mínimo 6 caracteres";
    if(rPw!==rPw2) e.pw2="Las contraseñas no coinciden";
    setRErrors(e); return Object.keys(e).length===0;
  }

  // ─── Register student ───────────────────────────────────────────────────────
  async function submitStudent() {
    const { data, error } = await supabase.auth.signUp({
      email: rEmail.trim(),
      password: rPw,
      options: { data: { role: "student" } },
    });
    if (error) { setRErrors({ email: error.message }); return; }
    if (data.user) {
      // Wait a moment for the trigger to create the base profile, then upsert details
      await new Promise(r => setTimeout(r, 800));
      await upsertProfile({
        id: data.user.id, email: rEmail.trim(), role: "student",
        name: rName, last: rLast, grade: rGrade,
        hair_color: rHair, hair_style: rHairSt, skin_tone: rSkin,
        shirt_color: rShirt, pet: rPet,
        level: 1, xp: 0, coins: 50, streak: 0,
        subject: null, group_name: null,
      });
    }
    setAppScreen("home");
  }

  // ─── Validate teacher reg ───────────────────────────────────────────────────
  function validateT() {
    const e:Record<string,string>={};
    if(!rName.trim()) e.name="Nombre requerido";
    if(!rSubj.trim()) e.subj="Materia requerida";
    if(!rEmail.includes("@")) e.email="Correo inválido";
    if(rPw.length<6) e.pw="Mínimo 6 caracteres";
    setRErrors(e); return Object.keys(e).length===0;
  }

  // ─── Register teacher ───────────────────────────────────────────────────────
  async function submitTeacher() {
    const { data, error } = await supabase.auth.signUp({
      email: rEmail.trim(),
      password: rPw,
      options: { data: { role: "teacher" } },
    });
    if (error) { setRErrors({ email: error.message }); return; }
    if (data.user) {
      await new Promise(r => setTimeout(r, 800));
      await upsertProfile({
        id: data.user.id, email: rEmail.trim(), role: "teacher",
        name: rName, last: rLast, grade: "",
        hair_color: "#1A1A2E", hair_style: "B", skin_tone: "#D08B5B",
        shirt_color: "#0E7490", pet: "",
        level: 1, xp: 0, coins: 0, streak: 0,
        subject: rSubj, group_name: rGrp,
      });
    }
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    await supabase.auth.signOut();
    setCurrentUser(null); setAuthStep("splash");
    setSimScene("start"); setSimPath(null);
    setLEmail(""); setLPw(""); setLError("");
    setRName(""); setRLast(""); setREmail(""); setRPw(""); setRPw2("");
    setRErrors({}); setRStep(1);
  }

  function startMission(m: MissionItem) {
    // Inject world-specific context into SIM start scene
    const worldCtx = SIM_STARTS[selectedWorld?.id ?? "com"] ?? SIM_STARTS.com;
    SIM.start = { ...SIM.start, ...worldCtx, choices: SIM_CHOICES };
    setSelMission(m); setSimScene("start"); setSimPath(null);
    setSkillGains({}); setBonusXP(0); setParticles([]);
    setSimPhase("narrate");
    setAppScreen("sim");
  }

  function handleChoice(c: any) {
    const bonus = calcBonusXP();
    setBonusXP(bonus);
    spawnParticles(c.emoji);
    const worldSim = { ...SIM, ...(selectedWorld ? (WORLD_SIMS[selectedWorld.id] ?? {}) : {}) };
    const next = worldSim[c.next];
    if (next?.final) { setSimPath(next.path); setSkillGains(getOutcome(next.path, selectedWorld?.id).gains); }
    else setSimScene(c.next);
    setSimPhase("chosen");
  }

  function completeMission() {
    const base  = selMission?.xp ?? 150;
    const total = base + bonusXP;
    const curLv = Math.floor((u.xp) / 500) + 1;
    const newXP   = u.xp + total;
    const newCoins = u.coins + Math.floor(total / 3);
    const newLv  = Math.floor(newXP / 500) + 1;
    setCurrentUser(p => p ? { ...p, xp: newXP, coins: newCoins, level: newLv } : p);
    // Persist to Supabase
    updateXP(u.id, newXP, newCoins, newLv);
    if (selMission) {
      setDoneMissions(prev => ({ ...prev, [selMission.id]: { score: outcome?.score ?? 85, xp: total, path: simPath ?? "" } }));
    }
    if (newLv > curLv) {
      setTimeout(() => { setLevelUpShow(true); setTimeout(() => setLevelUpShow(false), 3000); }, 800);
    }
    setConfetti(true); setAppScreen("results");
    setTimeout(() => setConfetti(false), 4500);
  }

  function sendAi(q?:string) {
    const question=q??aiMsg; if(!question.trim()||aiLoad) return;
    setAiMsg(""); setAiResp(null); setAiLoad(true);
    setTimeout(()=>{ setAiResp(AI_QA[question]??"Basado en tu progreso, mantén tu racha y explora nuevas misiones. ¡Vas excelente! 🌟"); setAiLoad(false); },900);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── Loading screen while checking Supabase session ──────────────────────────
  if (authLoading) return (
    <Shell>
      <div className="min-h-screen flex items-center justify-center" style={{ background:P.bg }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-4xl mx-auto mb-5" style={{ background:`linear-gradient(135deg,${P.v2},${P.c2})`, boxShadow:`0 0 40px rgba(124,58,237,.5)` }}>LX</div>
          <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color:P.v4 }}/>
          <p className="text-sm" style={{ color:P.muted }}>Cargando tu aventura…</p>
        </div>
      </div>
    </Shell>
  );

  // AUTH — shown only when currentUser is null
  // ══════════════════════════════════════════════════════════════════════════════
  if (!currentUser) {

    // ── SPLASH ────────────────────────────────────────────────────────────────
    if (authStep==="splash") return (
      <Shell>
        <div className="min-h-screen flex">
          {/* Left — Branding */}
          <div className="hidden lg:flex flex-col w-[48%] relative overflow-hidden" style={{ background:"linear-gradient(145deg,#060D1F,#0D1735,#080E25)" }}>
            <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 35% 50%,rgba(109,40,217,0.22) 0%,transparent 60%)" }}/>
            <div className="absolute" style={{ bottom:0,right:0,width:"70%",height:"60%",background:"radial-gradient(ellipse at 70% 70%,rgba(14,165,233,0.12) 0%,transparent 60%)" }}/>
            {/* Logo top */}
            <div className="relative z-10 p-10"><LXLogo size={40}/></div>
            {/* Center content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 pb-16">
              {/* Character illustration */}
              <div className="relative mb-8">
                <div className="w-56 h-56 rounded-full flex items-center justify-center" style={{ background:"radial-gradient(circle,rgba(109,40,217,0.18) 0%,transparent 70%)" }}>
                  <div className="relative">
                    {/* Glow portal behind character */}
                    <div className="absolute inset-0 rounded-full" style={{ background:"radial-gradient(circle,rgba(139,92,246,0.35) 0%,transparent 70%)", transform:"scale(1.4)", filter:"blur(12px)" }}/>
                    <CharSVG hair="#2C1810" hairStyle="A" skin="#FDBCB4" shirt="#6D28D9" mood="confident" size={160}/>
                  </div>
                </div>
                {/* Floating badges */}
                {[{ x:-60, y:-30, content:"⭐ Nivel 7",  bg:g(P.a2,P.a1) },
                  { x:50,  y:-20, content:"🔥 5 días",   bg:g(P.r2,P.r1) },
                  { x:-50, y:120, content:"⚡ +150 XP",  bg:g(P.v2,P.v1) },
                  { x:45,  y:110, content:"🏆 Top 10",   bg:g(P.g2,P.g1) }].map((b,i)=>(
                  <div key={i} className="absolute rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg" style={{ left:`calc(50% + ${b.x}px)`,top:`${b.y}px`,background:b.bg,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }}>{b.content}</div>
                ))}
              </div>
              <h2 className="text-3xl font-black text-center mb-2" style={{ color:P.text }}>Practica la vida</h2>
              <p className="text-xl text-center font-medium mb-2" style={{ color:P.v4 }}>antes de vivirla.</p>
              <p className="text-sm text-center leading-relaxed max-w-xs" style={{ color:P.muted }}>Desarrolla habilidades reales mediante simulaciones inmersivas, historias interactivas y gamificación.</p>
            </div>
            <p className="relative z-10 text-xs text-center pb-6" style={{ color:"rgba(110,138,171,0.4)" }}>LifeXperience v2.0 · Plataforma EdTech</p>
          </div>

          {/* Right — Auth options */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12" style={{ background:P.bg }}>
            <div className="w-full max-w-sm">
              {/* Mobile logo */}
              <div className="lg:hidden mb-10 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-4xl mx-auto mb-4" style={{ background:g(P.v2,P.c2), color:"#fff", boxShadow:`0 0 40px rgba(124,58,237,.5)` }}>LX</div>
                <h1 className="text-2xl font-black" style={{ color:P.text }}>LifeXperience</h1>
                <p className="text-sm mt-1 h-6" style={{ color:P.v4 }}>{tText}<span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle animate-pulse"/></p>
              </div>

              <h2 className="text-3xl font-black mb-1" style={{ color:P.text }}>¡Bienvenido!</h2>
              <p className="text-sm mb-8" style={{ color:P.muted }}>Inicia sesión o crea tu cuenta para comenzar.</p>

              <PrimaryBtn full size="lg" onClick={()=>setAuthStep("role")} variant="violet">
                🚀 Iniciar sesión
              </PrimaryBtn>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background:P.border }}/>
                <span className="text-xs" style={{ color:P.muted }}>¿Nuevo aquí?</span>
                <div className="flex-1 h-px" style={{ background:P.border }}/>
              </div>

              <PrimaryBtn full size="lg" onClick={()=>{ setRStep(1); setAuthStep("reg-role"); }} variant="ghost">
                ✨ Crear cuenta gratis
              </PrimaryBtn>

              {/* Demo tip */}
              <div className="mt-8 rounded-2xl p-4 border" style={{ background:P.s1, borderColor:P.border }}>
                <p className="text-xs font-bold mb-2" style={{ color:P.muted }}>🔐 Autenticación real con Supabase</p>
                <p className="text-xs leading-relaxed" style={{ color:P.muted }}>Tu sesión y progreso se persisten de forma segura. Regístrate con tu correo o inicia sesión si ya tienes cuenta.</p>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );

    // ── ROLE ──────────────────────────────────────────────────────────────────
    if (authStep==="role") return (
      <Shell>
        <AuthWrap title="¿Cuál es tu rol?" sub="Selecciona cómo ingresar al sistema" onBack={()=>setAuthStep("splash")}>
          <div className="space-y-4">
            {[
              { icon:"🎒", title:"Soy Estudiante", desc:"Accede a misiones, simulaciones y tu progreso", action:()=>{ setLEmail(""); setLPw(""); setLError(""); setAuthStep("login-s"); }, grad:g(P.v2,P.v1) },
              { icon:"👩‍🏫", title:"Soy Docente",   desc:"Monitorea el progreso de tu grupo en tiempo real", action:()=>{ setLEmail(""); setLPw(""); setLError(""); setAuthStep("login-t"); }, grad:g(P.c2,P.c1) },
            ].map(r=>(
              <button key={r.title} onClick={r.action} className="w-full rounded-2xl p-5 flex items-center gap-4 border transition-all hover:scale-[1.01] text-left" style={{ background:P.s1, borderColor:P.border }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=r.grad.includes(P.v2)?P.v3:P.c3}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=P.border}}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background:r.grad }}>{r.icon}</div>
                <div className="flex-1"><p className="font-bold" style={{ color:P.text }}>{r.title}</p><p className="text-sm mt-0.5" style={{ color:P.muted }}>{r.desc}</p></div>
                <ChevronRight size={20} style={{ color:P.muted }}/>
              </button>
            ))}
          </div>
        </AuthWrap>
      </Shell>
    );

    // ── LOGIN STUDENT ──────────────────────────────────────────────────────────
    if (authStep==="login-s") return (
      <Shell>
        <AuthWrap title="Bienvenido de nuevo" sub="Ingresa con tu correo y contraseña" onBack={()=>setAuthStep("role")}>
          <InputField label="Correo electrónico" type="email" value={lEmail} onChange={(e:any)=>setLEmail(e.target.value)} placeholder="tu@correo.com"/>
          <InputField label="Contraseña" type={showPw?"text":"password"} value={lPw} onChange={(e:any)=>setLPw(e.target.value)} placeholder="Tu contraseña" error={lError}
            onKeyDown={(e:any)=>e.key==="Enter"&&loginS()}
            right={<button onClick={()=>setShowPw(p=>!p)} style={{ color:P.muted }}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
          />
          <PrimaryBtn full size="lg" onClick={loginS} variant="violet">Ingresar →</PrimaryBtn>
          <div className="mt-4 text-center">
            <span className="text-sm" style={{ color:P.muted }}>¿No tienes cuenta? </span>
            <button onClick={()=>{ setRStep(1); setAuthStep("reg-s"); }} className="text-sm font-bold hover:underline" style={{ color:P.v4 }}>Regístrate gratis</button>
          </div>
          {/* Info box */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor:P.border }}>
            <div className="rounded-xl p-3 border" style={{ background:"rgba(139,92,246,.08)", borderColor:"rgba(139,92,246,.2)" }}>
              <p className="text-xs font-bold mb-1" style={{ color:P.v4 }}>🔐 Acceso seguro con Supabase</p>
              <p className="text-xs leading-relaxed" style={{ color:P.muted }}>Tu cuenta y progreso se guardan de forma segura. Regístrate para comenzar o inicia sesión con tu correo y contraseña.</p>
            </div>
          </div>
        </AuthWrap>
      </Shell>
    );

    // ── LOGIN TEACHER ──────────────────────────────────────────────────────────
    if (authStep==="login-t") return (
      <Shell>
        <AuthWrap title="Acceso Docente" sub="Panel de monitoreo y seguimiento" onBack={()=>setAuthStep("role")}>
          <div className="rounded-2xl p-4 mb-5 flex items-center gap-3 border" style={{ background:"rgba(14,165,233,.08)", borderColor:"rgba(14,165,233,.25)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background:g(P.c2,P.c1) }}>👩‍🏫</div>
            <div><p className="font-bold" style={{ color:P.text }}>Prof. Ana García</p><p className="text-xs" style={{ color:P.c4 }}>Ciencias Sociales · Grupo 3°A · 3°B</p></div>
          </div>
          <InputField label="Correo" type="email" value={lEmail} onChange={(e:any)=>setLEmail(e.target.value)} placeholder="docente@demo.com"/>
          <InputField label="Contraseña" type={showPw?"text":"password"} value={lPw} onChange={(e:any)=>setLPw(e.target.value)} placeholder="Tu contraseña" error={lError}
            onKeyDown={(e:any)=>e.key==="Enter"&&loginT()}
            right={<button onClick={()=>setShowPw(p=>!p)} style={{ color:P.muted }}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
          />
          <PrimaryBtn full size="lg" onClick={loginT} variant="cyan">Ingresar al panel →</PrimaryBtn>
          <div className="mt-4 text-center">
            <button onClick={()=>{ setRStep(1); setAuthStep("reg-t"); }} className="text-sm font-bold hover:underline" style={{ color:P.c4 }}>Registrar cuenta docente</button>
          </div>
        </AuthWrap>
      </Shell>
    );

    // ── REGISTER ROLE ──────────────────────────────────────────────────────────
    if (authStep==="reg-role") return (
      <Shell>
        <AuthWrap title="Crear cuenta" sub="¿Cómo participarás en LifeXperience?" onBack={()=>setAuthStep("splash")}>
          <div className="space-y-4">
            {[
              { icon:"🎒", title:"Cuenta Estudiante", desc:"Accede a misiones y simulaciones de habilidades para la vida", action:()=>setAuthStep("reg-s"), col:P.v3 },
              { icon:"👩‍🏫", title:"Cuenta Docente",   desc:"Gestiona grupos y monitorea el progreso de tus estudiantes",  action:()=>setAuthStep("reg-t"), col:P.c3 },
            ].map(r=>(
              <button key={r.title} onClick={r.action} className="w-full rounded-2xl p-5 flex items-center gap-4 border transition-all hover:scale-[1.01] text-left" style={{ background:P.s1, borderColor:P.border }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=r.col}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=P.border}}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background:r.col===P.v3?g(P.v2,P.v1):g(P.c2,P.c1) }}>{r.icon}</div>
                <div><p className="font-bold" style={{ color:P.text }}>{r.title}</p><p className="text-sm mt-0.5" style={{ color:P.muted }}>{r.desc}</p></div>
                <ChevronRight size={20} className="ml-auto" style={{ color:P.muted }}/>
              </button>
            ))}
          </div>
          <div className="mt-5 text-center">
            <span className="text-sm" style={{ color:P.muted }}>¿Ya tienes cuenta? </span>
            <button onClick={()=>setAuthStep("role")} className="text-sm font-bold hover:underline" style={{ color:P.v4 }}>Iniciar sesión</button>
          </div>
        </AuthWrap>
      </Shell>
    );

    // ── REGISTER STUDENT ──────────────────────────────────────────────────────
    if (authStep==="reg-s") return (
      <Shell>
        <div className="min-h-screen flex">
          {/* Left - Form */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10" style={{ background:P.bg }}>
            <div className="w-full max-w-md">
              <div className="flex items-center gap-3 mb-6">
                <BackArrow onClick={()=>rStep>1?setRStep(p=>p-1):setAuthStep("reg-role")}/>
                <div>
                  <h2 className="text-xl font-black" style={{ color:P.text }}>Crea tu cuenta</h2>
                  <p className="text-xs" style={{ color:P.muted }}>Paso {rStep} de 3 — {rStep===1?"Datos personales":rStep===2?"Personaliza tu avatar":"Confirma y listo"}</p>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex gap-2 mb-6">
                {[1,2,3].map(s=><div key={s} className="flex-1 h-1.5 rounded-full transition-all" style={{ background:s<=rStep?g(P.v2,P.v3):"rgba(255,255,255,0.1)" }}/>)}
              </div>

              {rStep===1&&(
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Nombre *" value={rName} onChange={(e:any)=>setRName(e.target.value)} placeholder="Ana" error={rErrors.name}/>
                    <InputField label="Apellido *" value={rLast} onChange={(e:any)=>setRLast(e.target.value)} placeholder="García" error={rErrors.last}/>
                  </div>
                  <InputField label="Correo electrónico *" type="email" value={rEmail} onChange={(e:any)=>setREmail(e.target.value)} placeholder="tu@correo.com" error={rErrors.email}/>
                  <div className="mb-4">
                    <label className="block text-xs font-bold mb-1.5" style={{ color:P.muted }}>Grado</label>
                    <select value={rGrade} onChange={e=>setRGrade(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm border focus:outline-none" style={{ background:P.s2, borderColor:P.border, color:P.text }}>
                      {GRADES.map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <InputField label="Contraseña *" type={showPw?"text":"password"} value={rPw} onChange={(e:any)=>setRPw(e.target.value)} placeholder="Mínimo 6 caracteres" error={rErrors.pw} hint="Al menos 6 caracteres"
                    right={<button onClick={()=>setShowPw(p=>!p)} style={{ color:P.muted }}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
                  />
                  <InputField label="Confirmar contraseña *" type="password" value={rPw2} onChange={(e:any)=>setRPw2(e.target.value)} placeholder="Repite la contraseña" error={rErrors.pw2}/>
                  <PrimaryBtn full size="lg" onClick={()=>{if(validateS1())setRStep(2)}} variant="violet">Continuar →</PrimaryBtn>
                </div>
              )}

              {rStep===2&&(
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color:P.muted }}>Tono de piel</p>
                  <div className="flex gap-2 mb-4">
                    {SKIN_TONES.map(s=><button key={s} onClick={()=>setRSkin(s)} className="w-9 h-9 rounded-full border-2 transition-all hover:scale-110" style={{ background:s, borderColor:rSkin===s?P.v4:"transparent" }}/>)}
                  </div>
                  <p className="text-xs font-bold mb-3" style={{ color:P.muted }}>Color de cabello</p>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {HAIR_COLORS.map(h=><button key={h} onClick={()=>setRHair(h)} className="w-9 h-9 rounded-full border-2 transition-all hover:scale-110" style={{ background:h==="#F5F5F5"?"#d0d0d0":h, borderColor:rHair===h?P.v4:"transparent" }}/>)}
                  </div>
                  <p className="text-xs font-bold mb-3" style={{ color:P.muted }}>Estilo de cabello</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {HAIR_STYLES.map(s=>(
                      <button key={s} onClick={()=>setRHairSt(s)} className="rounded-xl p-2 border transition-all hover:scale-105" style={{ background:rHairSt===s?g(P.v2,P.v3):P.s2, borderColor:rHairSt===s?P.v3:P.border }}>
                        <CharSVG hair={rHair} hairStyle={s} skin={rSkin} shirt={rShirt} mood="happy" size={55}/>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-bold mb-3" style={{ color:P.muted }}>Color de ropa</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {SHIRT_COLORS.map(c=><button key={c} onClick={()=>setRShirt(c)} className="w-9 h-9 rounded-xl border-2 transition-all hover:scale-110" style={{ background:c, borderColor:rShirt===c?P.text:"transparent" }}/>)}
                  </div>
                  <div className="flex gap-3">
                    <PrimaryBtn onClick={()=>setRStep(1)} variant="ghost">← Atrás</PrimaryBtn>
                    <PrimaryBtn full onClick={()=>setRStep(3)} variant="violet">Continuar →</PrimaryBtn>
                  </div>
                </div>
              )}

              {rStep===3&&(
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color:P.muted }}>Elige tu mascota</p>
                  <div className="grid grid-cols-6 gap-2 mb-5">
                    {PETS.map(p=>(
                      <button key={p} onClick={()=>setRPet(p)} className="h-12 rounded-xl flex items-center justify-center text-xl border transition-all hover:scale-110" style={{ background:rPet===p?g(P.g2,P.g1):P.s2, borderColor:rPet===p?P.g3:P.border }}>
                        {p==="⛔"?<span className="text-xs" style={{ color:P.muted }}>Sin</span>:p}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl p-5 border mb-5" style={{ background:P.s2, borderColor:P.border }}>
                    {[{ label:"Nombre", val:`${rName} ${rLast}` },{ label:"Correo", val:rEmail },{ label:"Grado", val:rGrade }].map(r=>(
                      <div key={r.label} className="flex justify-between text-sm py-2 border-b last:border-0" style={{ borderColor:P.border }}>
                        <span style={{ color:P.muted }}>{r.label}</span>
                        <span style={{ color:P.text }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <PrimaryBtn onClick={()=>setRStep(2)} variant="ghost">← Atrás</PrimaryBtn>
                    <PrimaryBtn full onClick={submitStudent} variant="violet">✅ Crear mi cuenta</PrimaryBtn>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right - Avatar preview */}
          <div className="hidden lg:flex w-80 flex-col items-center justify-center border-l" style={{ background:"linear-gradient(145deg,#0A1420,#0D1F38)", borderColor:P.border }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color:P.muted }}>Tu personaje</p>
            <div className="relative mb-6">
              <div className="w-48 h-48 rounded-full flex items-center justify-center" style={{ background:"radial-gradient(circle,rgba(109,40,217,0.2) 0%,transparent 70%)" }}>
                <CharSVG hair={rHair} hairStyle={rHairSt} skin={rSkin} shirt={rShirt} mood="happy" size={160}/>
              </div>
              {rPet&&rPet!=="⛔"&&<div className="absolute bottom-2 right-2 text-3xl">{rPet}</div>}
            </div>
            {rName&&<p className="font-black text-lg" style={{ color:P.text }}>{rName} {rLast}</p>}
            <p className="text-sm" style={{ color:P.muted }}>{rGrade} · Nivel 1</p>
            {/* XP preview */}
            <div className="mt-6 w-48">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full w-0" style={{ background:g(P.v2,P.v4,"90deg") }}/>
              </div>
              <p className="text-xs text-center mt-1.5" style={{ color:P.muted }}>0 / 500 XP · Nivel 1</p>
            </div>
          </div>
        </div>
      </Shell>
    );

    // ── REGISTER TEACHER ──────────────────────────────────────────────────────
    if (authStep==="reg-t") return (
      <Shell>
        <AuthWrap title="Registro Docente" sub="Crea tu cuenta para gestionar tu grupo" onBack={()=>setAuthStep("reg-role")}>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Nombre *" value={rName} onChange={(e:any)=>setRName(e.target.value)} placeholder="Ana" error={rErrors.name}/>
            <InputField label="Apellido" value={rLast} onChange={(e:any)=>setRLast(e.target.value)} placeholder="García"/>
          </div>
          <InputField label="Correo *" type="email" value={rEmail} onChange={(e:any)=>setREmail(e.target.value)} placeholder="docente@colegio.edu" error={rErrors.email}/>
          <InputField label="Materia *" value={rSubj} onChange={(e:any)=>setRSubj(e.target.value)} placeholder="Ciencias Sociales, Matemáticas…" error={rErrors.subj}/>
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1.5" style={{ color:P.muted }}>Grupo(s)</label>
            <select value={rGrp} onChange={e=>setRGrp(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm border focus:outline-none" style={{ background:P.s2, borderColor:P.border, color:P.text }}>
              {["3°A","3°B","3°A · 3°B","2°A · 2°B","Todo el grado"].map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <InputField label="Contraseña *" type={showPw?"text":"password"} value={rPw} onChange={(e:any)=>setRPw(e.target.value)} placeholder="Mínimo 6 caracteres" error={rErrors.pw}
            right={<button onClick={()=>setShowPw(p=>!p)} style={{ color:P.muted }}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
          />
          <PrimaryBtn full size="lg" onClick={()=>{if(validateT())submitTeacher()}} variant="cyan">✅ Crear cuenta docente</PrimaryBtn>
        </AuthWrap>
      </Shell>
    );
  } // end !currentUser

  // ══════════════════════════════════════════════════════════════════════════════
  // TEACHER PANEL
  // ══════════════════════════════════════════════════════════════════════════════
  const tNavItems: { id:TeacherTab; icon:string; lbl:string }[] = [
    { id:"dashboard", icon:"📊", lbl:"Panel general"   },
    { id:"ai",        icon:"🤖", lbl:"Asistente IA"    },
    { id:"plans",     icon:"📋", lbl:"Planes asignados"},
  ];
  const totalPlans = Object.values(studentPlans).reduce((s,p)=>s+p.length, 0);

  if (u.role==="teacher") return (
    <Shell>
      <div className="flex h-screen" style={{ background:P.bg }}>
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 flex flex-col border-r py-6 px-4" style={{ background:P.s1, borderColor:P.border }}>
          <div className="mb-8 px-2"><LXLogo size={32}/></div>
          <nav className="space-y-1 flex-1">
            {tNavItems.map(n=>(
              <button key={n.id} onClick={()=>setTeacherTab(n.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all" style={teacherTab===n.id?{ background:g(P.c2,P.c1), color:"#fff" }:{ color:P.muted }}>
                <span>{n.icon}</span>
                <span className="text-sm font-semibold">{n.lbl}</span>
                {n.id==="plans"&&totalPlans>0&&<span className="ml-auto text-xs font-black px-1.5 py-0.5 rounded-full" style={{ background:P.v3, color:"#fff" }}>{totalPlans}</span>}
                {n.id==="ai"&&<span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background:"rgba(14,165,233,.2)", color:P.c4 }}>NEW</span>}
              </button>
            ))}
          </nav>
          <div className="border-t pt-4" style={{ borderColor:P.border }}>
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background:g(P.c2,P.c1) }}>👩‍🏫</div>
              <div className="min-w-0"><p className="text-sm font-bold truncate" style={{ color:P.text }}>{u.name} {u.last}</p><p className="text-xs truncate" style={{ color:P.muted }}>{u.subject}</p></div>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5" style={{ color:P.muted, borderColor:P.border }}>
              <LogOut size={14}/>Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">

            {/* ── DASHBOARD TAB ── */}
            {teacherTab==="dashboard"&&(<>
              <h1 className="text-2xl font-black mb-0.5" style={{ color:P.text }}>Panel Docente</h1>
              <p className="text-sm mb-6" style={{ color:P.muted }}>{u.subject} · Grupo {u.group} · Lunes 30 Jun, 2026</p>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatPill icon="👥" val="25"  label="Estudiantes"  color={P.c4}/>
                <StatPill icon="🎯" val="87%" label="Participación" color={P.v4}/>
                <StatPill icon="⚡" val="142" label="Misiones hoy"  color={P.a3}/>
                <StatPill icon="⚠️" val="2"   label="Alertas"       color={P.r3}/>
              </div>
              {TEACHER_DATA.some(s=>s.alert)&&(
                <div className="rounded-2xl p-4 mb-6 border flex gap-3" style={{ background:"rgba(239,68,68,.07)", borderColor:"rgba(239,68,68,.25)" }}>
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color:P.r3 }}/>
                  <div>
                    <p className="text-sm font-bold mb-1" style={{ color:P.r3 }}>Estudiantes que requieren atención inmediata</p>
                    {TEACHER_DATA.filter(s=>s.alert).map(s=>(
                      <p key={s.name} className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}>• <strong>{s.name}</strong> — racha de {s.streak} día(s), habilidades bajo el promedio.</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
                  <h3 className="font-bold text-sm mb-4" style={{ color:P.text }}>Habilidades promedio del grupo</h3>
                  <RadarSVG data={RADAR_DATA_TEACHER} color={P.c3} size={230}/>
                </div>
                <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
                  <h3 className="font-bold text-sm mb-4" style={{ color:P.text }}>Actividad semanal del grupo</h3>
                  <div className="flex items-end gap-2 h-40">
                    {[42,67,31,88,55,76,20].map((v,i)=>(
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full rounded-t-lg" style={{ height:`${(v/88)*130}px`, background:i===5?g(P.c2,P.c3,"180deg"):"rgba(255,255,255,0.08)" }}/>
                        <span className="text-xs" style={{ color:P.muted }}>{"LMXJVSD"[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-sm mb-3" style={{ color:P.text }}>Progreso individual</h3>
              <div className="space-y-3">
                {TEACHER_DATA.map((s,i)=>{
                  const stuKey=s.name.split(" ")[0].toLowerCase();
                  const stuPlans=studentPlans[stuKey]??[];
                  return (
                    <div key={i} className="rounded-2xl border overflow-hidden transition-all" style={{ background:expandedS===s.name?"rgba(139,92,246,.07)":P.s1, borderColor:expandedS===s.name?P.v3:P.border }}>
                      <button className="w-full px-5 py-4 flex items-center gap-4" onClick={()=>setExpandedS(expandedS===s.name?null:s.name)}>
                        <div className="flex-shrink-0"><CharSVG hair={SEED_USERS[i]?.hairColor||"#2C1810"} hairStyle={SEED_USERS[i]?.hairStyle||"A"} skin={SEED_USERS[i]?.skinTone||"#FDBCB4"} shirt={SEED_USERS[i]?.shirtColor||P.v2} mood="happy" size={50}/></div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color:P.text }}>{s.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={s.alert?{ background:"rgba(239,68,68,.15)",color:P.r3,border:"1px solid rgba(239,68,68,.3)" }:{ background:"rgba(16,185,129,.15)",color:P.g3 }}>{s.alert?"⚠ Alerta":"✓ Progreso"}</span>
                            {stuPlans.length>0&&<span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:"rgba(139,92,246,.15)",color:P.v4 }}>📋 {stuPlans.length} caso{stuPlans.length>1?"s":""}</span>}
                          </div>
                          <div className="flex gap-3 text-xs mt-0.5" style={{ color:P.muted }}><span>Nv.{s.level}</span><span>{s.missions} misiones</span><span>🔥 {s.streak}d</span></div>
                        </div>
                        <span style={{ color:P.muted }}>{expandedS===s.name?"▲":"▼"}</span>
                      </button>
                      {expandedS===s.name&&(
                        <div className="px-5 pb-5 pt-2 border-t" style={{ borderColor:P.border }}>
                          <div className="grid grid-cols-2 gap-6 mb-4">
                            <div>
                              <Skill label="Comunicación" value={s.com} color={P.v3}/>
                              <Skill label="Liderazgo"    value={s.lid} color={P.a3}/>
                              <Skill label="Empatía"      value={s.emp} color={P.g3}/>
                              <Skill label="Pensamiento"  value={s.pen} color={P.c3}/>
                            </div>
                            <div className="rounded-xl p-4 border" style={s.alert?{ background:"rgba(239,68,68,.06)",borderColor:"rgba(239,68,68,.2)" }:{ background:"rgba(16,185,129,.06)",borderColor:"rgba(16,185,129,.2)" }}>
                              <p className="text-xs font-bold mb-2" style={{ color:s.alert?P.r3:P.g3 }}>{s.alert?"📌 Recomendación IA":"✅ Sugerencia IA"}</p>
                              <p className="text-xs leading-relaxed mb-3" style={{ color:"rgba(240,246,255,.7)" }}>
                                {s.alert?`Generar un caso Básico personalizado para ${s.name.split(" ")[0]} con el Asistente IA para retomar el ritmo.`:`${s.name.split(" ")[0]} está listo para casos Avanzados. El Asistente IA puede generar uno de Liderazgo.`}
                              </p>
                              <button onClick={()=>{ setCaseTarget(stuKey); setCaseDiff(s.alert?"Básico":"Avanzado"); setTeacherTab("ai"); }}
                                className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-80" style={{ background:g(P.v2,P.c2) }}>
                                🤖 Generar caso con IA
                              </button>
                            </div>
                          </div>
                          {stuPlans.length>0&&(
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:P.muted }}>Casos asignados ({stuPlans.length})</p>
                              <div className="space-y-2">
                                {stuPlans.map(c=>(
                                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ background:P.s2, borderColor:P.border }}>
                                    <span className="text-lg">{c.worldEmoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate" style={{ color:P.text }}>{c.title}</p>
                                      <p className="text-xs" style={{ color:P.muted }}>{c.worldName} · {c.difficulty} · {c.duration} · {c.xp} XP</p>
                                    </div>
                                    <button onClick={()=>setStudentPlans(prev=>{ const p={...prev}; p[stuKey]=(p[stuKey]??[]).filter(x=>x.id!==c.id); return p; })} className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/10" style={{ color:P.r3 }}>✕</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>)}

            {/* ── AI CASE GENERATOR TAB ── */}
            {teacherTab==="ai"&&(<>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black" style={{ color:P.text }}>🤖 Asistente IA · Generador de Casos</h1>
                  <p className="text-sm mt-0.5" style={{ color:P.muted }}>Crea casos didácticos personalizados para tus estudiantes en segundos</p>
                </div>
                {totalPlans>0&&<button onClick={()=>setTeacherTab("plans")} className="text-sm font-bold px-4 py-2 rounded-xl border" style={{ borderColor:P.v3, color:P.v4, background:"rgba(139,92,246,.08)" }}>📋 Ver planes ({totalPlans})</button>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                {/* Form */}
                <div className="space-y-4">
                  {/* Target */}
                  <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:P.muted }}>¿Para quién es el caso?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={()=>setCaseTarget("all")} className="rounded-xl p-3 text-left border transition-all" style={caseTarget==="all"?{ background:"rgba(14,165,233,.15)",borderColor:P.c3 }:{ background:P.s2,borderColor:P.border }}>
                        <p className="text-lg mb-0.5">👥</p>
                        <p className="text-xs font-bold" style={{ color:caseTarget==="all"?P.text:P.muted }}>Todo el grupo</p>
                        <p className="text-xs" style={{ color:P.muted }}>3°A · 3°B</p>
                      </button>
                      {TEACHER_DATA.map((s,i)=>{
                        const key=s.name.split(" ")[0].toLowerCase();
                        return (
                          <button key={i} onClick={()=>setCaseTarget(key)} className="rounded-xl p-2.5 flex items-center gap-2 border transition-all" style={caseTarget===key?{ background:"rgba(139,92,246,.15)",borderColor:P.v3 }:{ background:P.s2,borderColor:P.border }}>
                            <CharSVG hair={SEED_USERS[i]?.hairColor||"#2C1810"} hairStyle={SEED_USERS[i]?.hairStyle||"A"} skin={SEED_USERS[i]?.skinTone||"#FDBCB4"} shirt={SEED_USERS[i]?.shirtColor||P.v2} mood="happy" size={38}/>
                            <div><p className="text-xs font-semibold" style={{ color:P.text }}>{s.name.split(" ")[0]}</p><p className="text-xs" style={{ color:P.muted }}>Nv.{s.level}</p></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* World */}
                  <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:P.muted }}>Habilidad a trabajar</p>
                    <div className="grid grid-cols-3 gap-2">
                      {WORLDS.filter(w=>!w.locked).map(w=>(
                        <button key={w.id} onClick={()=>setCaseWorldId(w.id)} className="rounded-xl p-3 text-center border transition-all" style={caseWorldId===w.id?{ background:`linear-gradient(135deg,${w.from}33,${w.to}22)`,borderColor:w.from }:{ background:P.s2,borderColor:P.border }}>
                          <p className="text-2xl mb-1">{w.emoji}</p>
                          <p className="text-xs font-semibold leading-tight" style={{ color:caseWorldId===w.id?P.text:P.muted }}>{w.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Difficulty */}
                  <div className="rounded-2xl p-4 border" style={{ background:P.s1, borderColor:P.border }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:P.muted }}>Nivel de dificultad</p>
                    <div className="flex gap-2">
                      {(["Básico","Intermedio","Avanzado"] as const).map(d=>(
                        <button key={d} onClick={()=>setCaseDiff(d)} className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all" style={caseDiff===d?{ background:d==="Básico"?g(P.g2,P.g1):d==="Intermedio"?g(P.a2,P.a1):g(P.r2,P.r1), color:"#fff", border:"none" }:{ background:P.s2,borderColor:P.border,color:P.muted }}>
                          {d==="Básico"?"🟢":d==="Intermedio"?"🟡":"🔴"} {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Context */}
                  <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color:P.muted }}>Contexto <span style={{ color:"rgba(124,143,172,.5)" }}>(opcional)</span></p>
                    <p className="text-xs mb-3" style={{ color:P.muted }}>Describe el contexto del estudiante, situación del salón o enfoque específico.</p>
                    <textarea value={caseContext} onChange={e=>setCaseContext(e.target.value)} rows={3} placeholder="Ej: El grupo tuvo un conflicto esta semana y quiero que reflexionen sobre comunicación asertiva..."
                      className="w-full rounded-xl px-4 py-3 text-sm border focus:outline-none resize-none" style={{ background:P.s2, borderColor:P.border, color:P.text, fontFamily:"'Poppins',sans-serif" }}
                      onFocus={e=>{(e.target as HTMLElement).style.borderColor=P.v3}} onBlur={e=>{(e.target as HTMLElement).style.borderColor=P.border}}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Conflicto grupal","Bajo rendimiento","Situación real del salón","Evaluación oral próxima"].map(hint=>(
                        <button key={hint} onClick={()=>setCaseContext(p=>p?p+". "+hint:hint)} className="text-xs px-2.5 py-1 rounded-full border hover:opacity-80 transition-all" style={{ background:"rgba(139,92,246,.1)", borderColor:"rgba(139,92,246,.25)", color:P.v4 }}>{hint}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>{ if(caseGenerating) return; setCaseGenerating(true); setGeneratedCase(null); setTimeout(()=>{ setGeneratedCase(generateAICase(caseWorldId,caseDiff,caseTarget,caseContext)); setCaseGenerating(false); },1800); }}
                    className="w-full py-4 rounded-2xl font-black text-white text-base hover:scale-[1.02] active:scale-[.98] transition-all" style={{ background:g(P.v2,P.c2), boxShadow:`0 6px 20px rgba(109,40,217,.35)` }}>
                    {caseGenerating?"🤖 Generando caso didáctico…":"✨ Generar caso con IA"}
                  </button>
                  {caseGenerating&&(
                    <div className="rounded-2xl p-4 border text-center" style={{ background:P.s1, borderColor:P.border }}>
                      <div className="flex justify-center gap-1.5 mb-2">{[0,1,2].map(i=><div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background:P.v4, animation:`pulse 1s ${i*.2}s infinite` }}/>)}</div>
                      <p className="text-sm" style={{ color:P.muted }}>Analizando perfil y generando caso personalizado…</p>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div>
                  {!generatedCase&&!caseGenerating&&(
                    <div className="rounded-2xl p-8 border text-center flex flex-col items-center justify-center" style={{ background:P.s1, borderColor:P.border, minHeight:"400px" }}>
                      <div className="text-6xl mb-4">🤖</div>
                      <p className="font-bold text-lg mb-2" style={{ color:P.text }}>Asistente IA listo</p>
                      <p className="text-sm leading-relaxed max-w-xs" style={{ color:P.muted }}>Configura el caso a la izquierda y pulsa "Generar". En segundos tendrás un caso didáctico completo y listo para asignar a tu(s) estudiante(s).</p>
                    </div>
                  )}
                  {generatedCase&&!caseGenerating&&(
                    <div className="space-y-4">
                      <div className="rounded-2xl overflow-hidden border" style={{ background:P.s1, borderColor:P.border }}>
                        {/* Header */}
                        <div className="p-5 border-b" style={{ background:`linear-gradient(135deg,${WORLDS.find(w=>w.id===generatedCase.worldId)?.from??P.v2}22,transparent)`, borderColor:P.border }}>
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-3xl">{generatedCase.worldEmoji}</span>
                            <div>
                              <p className="font-black text-base" style={{ color:P.text }}>{generatedCase.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color:P.text, borderColor:`${WORLDS.find(w=>w.id===generatedCase.worldId)?.from??P.v2}66` }}>{generatedCase.worldName}</span>
                                <DiffBadge level={generatedCase.difficulty as any}/>
                                <span className="text-xs" style={{ color:P.muted }}>⏱ {generatedCase.duration}</span>
                                <span className="text-xs font-bold" style={{ color:P.v4 }}>⚡ {generatedCase.xp} XP</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs p-2 rounded-xl border" style={{ background:"rgba(255,255,255,.04)", borderColor:P.border }}>
                            <span>👤</span><span style={{ color:P.muted }}>Para:</span>
                            <span className="font-bold" style={{ color:P.text }}>{generatedCase.targetName}</span>
                            <span className="ml-auto" style={{ color:P.muted }}>{generatedCase.createdAt}</span>
                          </div>
                        </div>
                        {/* Body */}
                        <div className="p-5 space-y-4">
                          <div><p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:P.c4 }}>🎯 Objetivo de aprendizaje</p><p className="text-sm leading-relaxed" style={{ color:"rgba(240,246,255,.85)" }}>{generatedCase.objective}</p></div>
                          <div><p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:P.v4 }}>📖 Escenario</p><p className="text-sm leading-relaxed" style={{ color:"rgba(240,246,255,.8)" }}>{generatedCase.scenario}</p></div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:P.a3 }}>💬 Preguntas de reflexión</p>
                            <div className="space-y-1.5">
                              {generatedCase.questions.map((q,i)=>(
                                <div key={i} className="flex gap-2.5 text-sm" style={{ color:"rgba(240,246,255,.78)" }}>
                                  <span className="font-black flex-shrink-0" style={{ color:P.a3 }}>{i+1}.</span><p>{q}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl p-3.5 border" style={{ background:"rgba(16,185,129,.06)", borderColor:"rgba(16,185,129,.2)" }}>
                            <p className="text-xs font-bold mb-1" style={{ color:P.g3 }}>✅ Criterio de evaluación</p>
                            <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}>{generatedCase.evaluation}</p>
                          </div>
                          {generatedCase.tips&&(
                            <div className="rounded-xl p-3.5 border" style={{ background:"rgba(14,165,233,.06)", borderColor:"rgba(14,165,233,.2)" }}>
                              <p className="text-xs font-bold mb-1" style={{ color:P.c3 }}>💡 Tips para el docente</p>
                              <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}>{generatedCase.tips}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={()=>{
                          const key=generatedCase.targetId==="all"?"all":generatedCase.targetId;
                          setStudentPlans(prev=>({...prev,[key]:[...(prev[key]??[]),generatedCase]}));
                          setGeneratedCase(null); setCaseContext("");
                          setTimeout(()=>setTeacherTab("plans"),300);
                        }} className="flex-1 py-3.5 rounded-xl font-black text-white text-sm hover:scale-[1.02] transition-all" style={{ background:g(P.g2,P.g3), boxShadow:`0 6px 20px rgba(16,185,129,.3)` }}>
                          ✅ Agregar al plan
                        </button>
                        <button onClick={()=>{ setCaseGenerating(true); setGeneratedCase(null); setTimeout(()=>{ setGeneratedCase(generateAICase(caseWorldId,caseDiff,caseTarget,caseContext)); setCaseGenerating(false); },1600); }}
                          className="px-5 py-3.5 rounded-xl font-bold text-sm border hover:bg-white/5 transition-all" style={{ color:P.muted, borderColor:P.border }}>
                          🔄 Otro caso
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>)}

            {/* ── PLANS TAB ── */}
            {teacherTab==="plans"&&(<>
              <h1 className="text-2xl font-black mb-0.5" style={{ color:P.text }}>Planes Asignados</h1>
              <p className="text-sm mb-6" style={{ color:P.muted }}>{totalPlans} caso{totalPlans!==1?"s":""} generado{totalPlans!==1?"s":""} con IA · Grupo {u.group}</p>
              {totalPlans===0?(
                <div className="rounded-2xl p-12 border text-center" style={{ background:P.s1, borderColor:P.border }}>
                  <div className="text-6xl mb-4">📋</div>
                  <p className="font-bold text-lg mb-2" style={{ color:P.text }}>Sin planes asignados aún</p>
                  <p className="text-sm mb-5" style={{ color:P.muted }}>Usa el Asistente IA para generar casos didácticos y asignarlos.</p>
                  <button onClick={()=>setTeacherTab("ai")} className="px-6 py-3 rounded-xl font-bold text-white" style={{ background:g(P.v2,P.c2) }}>🤖 Ir al Asistente IA</button>
                </div>
              ):(
                <div className="space-y-6">
                  {(studentPlans["all"]??[]).length>0&&(
                    <div>
                      <div className="flex items-center gap-2 mb-3"><span className="text-xl">👥</span><h3 className="font-bold" style={{ color:P.text }}>Todo el grupo</h3><span className="text-xs px-2 py-0.5 rounded-full" style={{ background:"rgba(14,165,233,.15)",color:P.c4 }}>{studentPlans["all"].length} casos</span></div>
                      <div className="grid grid-cols-2 gap-4">{studentPlans["all"].map(c=><CaseCard key={c.id} c={c} onRemove={()=>setStudentPlans(prev=>({...prev,all:(prev.all??[]).filter(x=>x.id!==c.id)}))}/>)}</div>
                    </div>
                  )}
                  {TEACHER_DATA.map((s,i)=>{
                    const key=s.name.split(" ")[0].toLowerCase();
                    const plans=studentPlans[key]??[];
                    if(!plans.length) return null;
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-3 mb-3">
                          <CharSVG hair={SEED_USERS[i]?.hairColor||"#2C1810"} hairStyle={SEED_USERS[i]?.hairStyle||"A"} skin={SEED_USERS[i]?.skinTone||"#FDBCB4"} shirt={SEED_USERS[i]?.shirtColor||P.v2} mood="happy" size={40}/>
                          <h3 className="font-bold" style={{ color:P.text }}>{s.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:"rgba(139,92,246,.15)",color:P.v4 }}>{plans.length} caso{plans.length>1?"s":""}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">{plans.map(c=><CaseCard key={c.id} c={c} onRemove={()=>setStudentPlans(prev=>({...prev,[key]:(prev[key]??[]).filter(x=>x.id!==c.id)}))}/>)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>)}

          </div>
        </main>
      </div>
    </Shell>
  );


  // ══════════════════════════════════════════════════════════════════════════════
  // STUDENT APP
  // ══════════════════════════════════════════════════════════════════════════════
  const mapScreens:AppScreen[] = ["skill","sim","results"];
  const activeNav = mapScreens.includes(appScreen)?"map":appScreen;

  return (
    <Shell>
      {/* Confetti */}
      {confetti&&(
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex:100 }}>
          {confettiList.map((p,i)=><div key={i} className="absolute rounded-sm" style={{ left:p.left,top:0,width:`${p.size}px`,height:`${p.size}px`,backgroundColor:p.color,transform:`rotate(${p.rot}deg)`,animation:`cffall ${p.dur} ${p.delay} linear forwards` }}/>)}
        </div>
      )}

      {/* Level-up overlay */}
      {levelUpShow&&(
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex:200 }}>
          <div className="text-center" style={{ animation:"lvup .5s cubic-bezier(.17,.67,.44,1.27)" }}>
            <div className="text-7xl mb-2" style={{ animation:"bounce-icon 0.8s infinite" }}>⬆️</div>
            <div className="rounded-3xl px-8 py-4 border" style={{ background:"linear-gradient(135deg,#0A1220,#1a0e4e)", borderColor:"rgba(139,92,246,.5)", boxShadow:"0 0 60px rgba(139,92,246,.4)" }}>
              <p className="font-black text-3xl" style={{ color:"#A78BFA" }}>¡NIVEL {u?.level}!</p>
              <p className="text-sm mt-1" style={{ color:"rgba(240,246,255,.7)" }}>Has subido de nivel 🌟</p>
            </div>
          </div>
        </div>
      )}

      {/* Sim floating particles */}
      {particles.length>0&&appScreen==="sim"&&(
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex:90 }}>
          {particles.map(p=>(
            <div key={p.id} className="absolute text-3xl" style={{ left:`${p.x}%`, bottom:"30%", animation:`particleup 2s ${p.delay}s ease-out forwards` }}>{p.emoji}</div>
          ))}
        </div>
      )}

      <div className="flex h-screen" style={{ background:P.bg }}>
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 flex flex-col border-r py-5 px-3" style={{ background:P.s1, borderColor:P.border }}>
          <div className="px-2 mb-6"><LXLogo size={28}/></div>
          {/* User card */}
          <div className="rounded-2xl p-3 mb-5 border" style={{ background:P.s2, borderColor:P.border }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-1"><CharSVG hair={avHair} hairStyle={avHairSt} skin={avSkin} shirt={avShirt} mood="happy" size={52}/></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate" style={{ color:P.text }}>{u.name} {u.last}</p>
                <p className="text-xs" style={{ color:P.muted }}>{u.grade}</p>
                {avPet&&avPet!=="⛔"&&<p className="text-sm mt-0.5">{avPet}</p>}
              </div>
            </div>
            <XPBar cur={xpInLv} max={500} lv={u.level}/>
            <div className="flex justify-between mt-2 pt-2 border-t" style={{ borderColor:P.border }}>
              {[{ icon:"⚡",val:animXP.toLocaleString(),color:P.v4 },{ icon:"💰",val:u.coins,color:P.a3 },{ icon:"🔥",val:`${u.streak}d`,color:"#FB923C" }].map(s=>(
                <div key={s.icon} className="text-center">
                  <div className="text-sm">{s.icon}</div>
                  <div className="text-xs font-bold" style={{ color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
          <nav className="space-y-1 flex-1">
            {[{ id:"home"  as AppScreen,icon:"🏠",lbl:"Inicio"   },
              { id:"map"   as AppScreen,icon:"🗺️",lbl:"Mapa"     },
              { id:"dash"  as AppScreen,icon:"📊",lbl:"Progreso" },
              { id:"avatar"as AppScreen,icon:"👤",lbl:"Avatar"   }].map(n=>(
              <button key={n.id} onClick={()=>setAppScreen(n.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all" style={activeNav===n.id?{ background:g(P.v2,P.v3),color:"#fff",boxShadow:`0 4px 12px rgba(109,40,217,.35)` }:{ color:P.muted }}>
                <span>{n.icon}</span>{n.lbl}
              </button>
            ))}
          </nav>
          <div className="border-t pt-3 mt-3" style={{ borderColor:P.border }}>
            <div className="flex gap-1.5 flex-wrap px-2 mb-3">
              {BADGES.slice(0,4).map(b=><div key={b.name} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:P.s3, border:`1px solid ${P.border}` }} title={b.name}>{b.emoji}</div>)}
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5" style={{ color:P.muted, borderColor:P.border }}>
              <LogOut size={14}/>Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {appScreen==="home"  &&<HomeScreen/>}
            {appScreen==="map"   &&<MapScreen/>}
            {appScreen==="skill" &&selectedWorld&&<SkillScreen/>}
            {appScreen==="sim"   &&<SimScreen/>}
            {appScreen==="results"&&<ResultsScreen/>}
            {appScreen==="dash"  &&<DashScreen/>}
            {appScreen==="avatar"&&<AvatarScreen/>}
          </div>
        </main>
      </div>
    </Shell>
  );

  // ── HOME ──────────────────────────────────────────────────────────────────
  function HomeScreen() {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm font-semibold" style={{ color:P.v4 }}>Lunes · 30 Junio 2026 · {u.grade}</p>
            <h1 className="text-3xl font-black mt-0.5" style={{ color:P.text }}>¡Hola, {u.name}! 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full px-3 py-2 border" style={{ background:"rgba(251,146,60,.1)", borderColor:"rgba(251,146,60,.28)" }}>
              <span>🔥</span><span className="font-black" style={{ color:"#FB923C" }}>{u.streak} días</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">
            {/* Orion guide */}
            <div className="rounded-2xl p-5 flex gap-4 items-start border" style={{ background:"linear-gradient(135deg,#0A1220,#101E3A)", borderColor:"rgba(109,40,217,.28)" }}>
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2" style={{ background:g(P.v2,P.v1), borderColor:"rgba(167,139,250,.5)", boxShadow:`0 0 20px rgba(124,58,237,.4)` }}>
                  <span className="text-3xl">🧙</span>
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs border" style={{ background:P.g3, borderColor:P.g4 }}>✨</div>
                </div>
                <p className="text-xs font-semibold text-center mt-1" style={{ color:P.v4 }}>Orión</p>
              </div>
              <div className="flex-1">
                <div className="rounded-xl rounded-tl-none p-4 border" style={{ background:"rgba(255,255,255,0.05)", borderColor:P.border }}>
                  <p className="text-sm leading-relaxed" style={{ color:"rgba(240,246,255,.9)" }}>
                    "¡Hola, {u.name}! Tu próximo nivel está a solo <strong style={{ color:P.v4 }}>{500-xpInLv} XP</strong>. Completa una misión hoy y lo alcanzas. ¡La aventura te espera! 🌟"
                  </p>
                </div>
              </div>
            </div>

            {/* Daily missions */}
            <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color:P.text }}>Misiones del día</h3>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.09)" }}>
                    <div className="h-full rounded-full" style={{ width:"66%", background:g(P.v2,P.v4,"90deg") }}/>
                  </div>
                  <span className="text-xs font-bold" style={{ color:P.v4 }}>2/3</span>
                </div>
              </div>
              {[{ done:true, text:"Completa una misión de Comunicación",xp:50 },
                { done:true, text:"Mantén tu racha diaria activa",       xp:30 },
                { done:false,text:"Explora un mundo nuevo en el mapa",   xp:75 }].map((m,i)=>(
                <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor:P.border }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={m.done?{ background:P.g3 }:{ border:`2px solid ${P.border}` }}>
                    {m.done&&<CheckCircle size={14} className="text-white"/>}
                  </div>
                  <span className="text-sm flex-1" style={{ color:m.done?"rgba(240,246,255,.35)":P.text, textDecoration:m.done?"line-through":"none" }}>{m.text}</span>
                  <span className="text-xs font-bold" style={{ color:P.v4 }}>+{m.xp} XP</span>
                </div>
              ))}
            </div>

            <button onClick={()=>setAppScreen("map")} className="w-full py-5 rounded-2xl font-black text-xl text-white relative overflow-hidden group transition-all hover:scale-[1.01]" style={{ background:g(P.v2,P.v3), boxShadow:`0 8px 32px rgba(109,40,217,.45)` }}>
              <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/8 transition-colors"/>
              <span className="relative">🚀 Comenzar aventura</span>
            </button>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatPill icon="⭐" val={String(u.level)} label="Nivel" color={P.a3}/>
              <StatPill icon="💰" val={String(u.coins)} label="Monedas" color={P.g3}/>
            </div>
            <div className="rounded-2xl p-4 border" style={{ background:P.s1, borderColor:P.border }}>
              <XPBar cur={xpInLv} max={500} lv={u.level}/>
            </div>
            <div className="rounded-2xl p-4 border" style={{ background:P.s1, borderColor:P.border }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:P.muted }}>Insignias recientes</p>
              <div className="grid grid-cols-3 gap-2">
                {BADGES.map(b=>(
                  <div key={b.name} className="flex flex-col items-center gap-1 p-2 rounded-xl border" style={{ background:P.s2, borderColor:P.border }} title={b.name}>
                    <span className="text-xl">{b.emoji}</span>
                    <span className="text-xs text-center leading-tight" style={{ color:P.muted }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAP ───────────────────────────────────────────────────────────────────
  function MapScreen() {
    return (
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BackArrow onClick={()=>setAppScreen("home")}/>
          <div><h2 className="text-2xl font-black" style={{ color:P.text }}>Mapa de Habilidades</h2><p className="text-sm" style={{ color:P.muted }}>Selecciona tu próxima aventura</p></div>
        </div>
        <p className="text-xs font-semibold mb-6 ml-12" style={{ color:"rgba(245,158,11,.8)" }}>🔒 Completa mundos para desbloquear los siguientes</p>
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
          {WORLDS.map(w=>(
            <button key={w.id} onClick={()=>{ if(!w.locked){setSelectedWorld(w);setAppScreen("skill");} }} disabled={w.locked}
              className={`rounded-2xl p-4 text-left relative overflow-hidden transition-all group ${w.locked?"opacity-40 cursor-not-allowed":"hover:scale-[1.03] active:scale-[0.98]"}`}
              style={{ background:w.locked?"rgba(255,255,255,0.03)":`linear-gradient(135deg,${w.from},${w.to})`, boxShadow:w.locked?"none":`0 8px 24px ${w.from}44`, border:w.locked?`1px solid ${P.border}`:`1px solid ${w.from}55` }}
            >
              {!w.locked&&<div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-colors"/>}
              {w.locked&&<Lock size={14} className="absolute top-3 right-3" style={{ color:"rgba(255,255,255,.5)" }}/>}
              {!w.locked&&w.completed>0&&<div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center"><span className="text-xs font-black text-white">{w.completed}</span></div>}
              <div className="text-3xl mb-2 relative z-10">{w.emoji}</div>
              <div className="font-bold text-white text-xs leading-snug mb-1 relative z-10">{w.name}</div>
              {!w.locked&&<div className="mt-2 relative z-10"><div className="w-full h-1 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,.2)" }}><div className="h-full rounded-full" style={{ width:`${(w.completed/w.missions)*100}%`,background:"rgba(255,255,255,.6)" }}/></div></div>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── SKILL ─────────────────────────────────────────────────────────────────
  function SkillScreen() {
    const w = selectedWorld!;
    const worldMs = WORLD_MISSIONS[w.id] ?? WORLD_MISSIONS.com;
    const doneCount = worldMs.filter(m => doneMissions[m.id]).length;
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <BackArrow onClick={()=>setAppScreen("map")}/>
          <div>
            <h2 className="text-2xl font-black" style={{ color:P.text }}>{w.emoji} {w.name}</h2>
            <p className="text-sm" style={{ color:P.muted }}>{doneCount}/{worldMs.length} completadas en esta sesión</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-6 ml-12">
          {MISSIONS.map(m => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border transition-all" style={doneMissions[m.id]?{ background:P.g3, borderColor:P.g3, boxShadow:`0 0 6px ${P.g3}` }:{ background:"rgba(255,255,255,0.1)", borderColor:P.border }}/>
            </div>
          ))}
          <span className="text-xs ml-2 font-bold" style={{ color:P.g3 }}>
            {doneCount > 0 ? `+${worldMs.filter(m=>doneMissions[m.id]).reduce((s,m)=>s+(doneMissions[m.id]?.xp??0),0)} XP ganados en este mundo` : "¡Completa misiones para ganar XP!"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {worldMs.map((m) => {
            const done = doneMissions[m.id];
            return (
              <div key={m.id} className="rounded-2xl overflow-hidden border group transition-all" style={{ background:P.s1, borderColor: done ? P.g3 : P.border, boxShadow: done ? `0 0 20px rgba(16,185,129,0.15)` : "none" }}>
                <div className="h-44 relative overflow-hidden">
                  <img src={m.img} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  <div className="absolute inset-0" style={{ background:"linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.72) 100%)" }}/>
                  {done ? (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-white" style={{ background:"rgba(16,185,129,.9)", backdropFilter:"blur(8px)" }}>
                      <CheckCircle size={12}/> Completada · {done.score}/100
                    </div>
                  ) : null}
                  <div className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-black" style={{ background:"rgba(109,40,217,.85)", backdropFilter:"blur(8px)", color:P.v4 }}>⚡ +{m.xp} XP</div>
                  {done && (
                    <div className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs font-black" style={{ background:"rgba(16,185,129,.85)", backdropFilter:"blur(8px)", color:"#fff" }}>
                      +{done.xp} XP ganados
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-1" style={{ color:P.text }}>{m.title}</h3>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color:P.muted }}>{m.desc}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1 text-xs" style={{ color:P.muted }}>⏱ {m.dur}</span>
                    <DiffBadge level={m.diff}/>
                  </div>
                  {done ? (
                    <div className="space-y-2">
                      {/* Score bar */}
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width:`${done.score}%`, background:g(P.v3,P.g3,"90deg") }}/>
                      </div>
                      <button onClick={()=>startMission(m)} className="w-full py-2.5 rounded-xl font-semibold text-sm border transition-all hover:bg-white/5" style={{ color:P.muted, borderColor:P.border }}>
                        🔄 Repetir misión
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>startMission(m)} className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[.98]" style={{ background:`linear-gradient(135deg,${w.from},${w.to})` }}>
                      ▶ Iniciar misión
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SIMULATION ────────────────────────────────────────────────────────────
  function SimScreen() {
    const sceneIdx = simScene === "start" ? 0 : 1;
    const phaseOrder: SimPhase[] = ["narrate","dialogue","guide","choices","chosen","result"];
    const phaseIdx  = phaseOrder.indexOf(simPhase);
    const sceneMood = simPhase === "chosen" || simPhase === "result"
      ? (outcome ? "confident" : "nervous")
      : scene?.mood || "nervous";

    // Countdown ring
    const cdRadius = 22, cdCirc = 2 * Math.PI * cdRadius;
    const cdOffset = cdCirc * (1 - countdown / 15);

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BackArrow onClick={() => setAppScreen("skill")}/>
            <div>
              <h2 className="font-black" style={{ color:P.text }}>{selMission?.emoji} {selMission?.title}</h2>
              {/* Phase progress */}
              <div className="flex items-center gap-1.5 mt-1">
                {phaseOrder.slice(0,6).map((ph,i)=>(
                  <div key={ph} className="rounded-full transition-all" style={{ height:"5px", width: i<=phaseIdx ? "20px" : "6px", background: i<=phaseIdx ? g(P.v2,P.v3) : "rgba(255,255,255,.1)" }}/>
                ))}
                <span className="text-xs ml-1" style={{ color:P.muted }}>
                  {simPhase==="narrate"?"Situación":simPhase==="dialogue"?"Diálogo":simPhase==="guide"?"Consejo":simPhase==="choices"?"Decisión":simPhase==="chosen"?"Reacción":"Resultado"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Audio toggle */}
            <button onClick={()=>{setAudioOn(p=>!p); if("speechSynthesis" in window) window.speechSynthesis.cancel();}}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all hover:scale-105"
              style={audioOn?{ background:g(P.v2,P.v3), color:"#fff", border:"none" }:{ background:"rgba(255,255,255,.06)", color:P.muted, borderColor:P.border }}>
              {audioOn ? <Volume2 size={13}/> : <VolumeX size={13}/>}
              {audioOn ? "Voz ON" : "Voz OFF"}
            </button>
            <div className="rounded-full px-3 py-1.5 text-xs font-black border" style={{ background:"rgba(139,92,246,.15)", borderColor:"rgba(139,92,246,.3)", color:P.v4 }}>+{selMission?.xp} XP</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-5">
          {/* ── Left: Classroom illustration ─────────────────────────────── */}
          <div className="col-span-3 flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden border" style={{ height:"320px", borderColor:P.border }}>
              <ClassroomScene mood={sceneMood}/>
            </div>

            {/* Location / narration bar */}
            {(simPhase==="narrate"||simPhase==="chosen") && (
              <div className="rounded-2xl p-4 border" style={{ background:"linear-gradient(135deg,#080F20,#0E1B35)", borderColor:"rgba(109,40,217,.22)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{scene?.mood==="nervous"?"😰":scene?.mood==="happy"?"😊":"😎"}</span>
                  <span className="text-xs font-bold" style={{ color:P.v4 }}>{scene?.location}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color:"rgba(240,246,255,.9)" }}>
                  {twChars}
                  {!twDone&&<span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle animate-pulse"/>}
                </p>
                <div className="flex items-center justify-between mt-3">
                  {!twDone && (
                    <button onClick={twSkip} className="text-xs underline" style={{ color:P.muted }}>Saltar texto ›</button>
                  )}
                  {simPhase==="narrate" && twDone && (
                    <button onClick={()=>setSimPhase("dialogue")}
                      className="ml-auto rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:scale-105"
                      style={{ background:g(P.v2,P.v3), boxShadow:`0 4px 12px rgba(124,58,237,.35)` }}>
                      Continuar → {audioOn&&"🔊"}
                    </button>
                  )}
                  {simPhase==="chosen" && twDone && (
                    <div className="ml-auto flex items-center gap-2">
                      {bonusXP > 0 && (
                        <span className="text-xs font-black rounded-full px-2 py-1" style={{ background:"rgba(245,158,11,.2)", color:P.a3 }}>
                          <Zap size={11} className="inline"/> +{bonusXP} XP bonus
                        </span>
                      )}
                      <span className="text-xs" style={{ color:P.muted }}>Cargando siguiente escena…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dialogue scene bar */}
            {simPhase==="dialogue" && (
              <div className="rounded-2xl p-4 border" style={{ background:"linear-gradient(135deg,#080F20,#0E1B35)", borderColor:"rgba(236,72,153,.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background:g(P.p2,P.p1) }}>👩‍🏫</div>
                  <span className="text-xs font-bold" style={{ color:P.p3 }}>{scene?.speaker}</span>
                  {/* Talking dots while typing */}
                  {!twDone && <div className="flex gap-0.5 ml-auto">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:P.p3, animation:`pulse 1s ${i*.2}s infinite` }}/>)}</div>}
                </div>
                <p className="text-sm leading-relaxed italic" style={{ color:"rgba(240,246,255,.9)" }}>
                  {twChars}
                  {!twDone&&<span className="inline-block w-0.5 h-4 bg-pink-400 ml-0.5 align-middle animate-pulse"/>}
                </p>
                {!twDone&&<button onClick={twSkip} className="text-xs underline mt-2" style={{ color:P.muted }}>Saltar ›</button>}
              </div>
            )}
          </div>

          {/* ── Right: Interactive panel ──────────────────────────────────── */}
          <div className="col-span-2 space-y-3">

            {/* NARRATE: guide panel shown as preview */}
            {simPhase==="narrate" && (
              <div className="rounded-2xl p-4 border" style={{ background:P.s1, borderColor:P.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:g(P.v2,P.v1) }}>🧙</div>
                  <p className="text-xs font-bold" style={{ color:P.v4 }}>Guía Orión</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.6)" }}>
                  Pronto tendrás que tomar una decisión importante. Presta mucha atención a la situación que se presenta…
                </p>
              </div>
            )}

            {/* GUIDE phase */}
            {simPhase==="guide" && (
              <div className="rounded-2xl p-4 border" style={{ background:P.s1, borderColor:P.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:g(P.v2,P.v1) }}>🧙</div>
                  <p className="text-xs font-bold" style={{ color:P.v4 }}>Guía Orión</p>
                  {!twDone && <div className="flex gap-0.5 ml-auto">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:P.v4, animation:`pulse 1s ${i*.2}s infinite` }}/>)}</div>}
                </div>
                <p className="text-xs leading-relaxed italic" style={{ color:"rgba(240,246,255,.82)" }}>
                  {twChars}
                  {!twDone&&<span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle animate-pulse"/>}
                </p>
                {twDone && (
                  <button onClick={()=>setSimPhase("choices")}
                    className="w-full mt-3 rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02]"
                    style={{ background:g(P.v2,P.v3), boxShadow:`0 4px 12px rgba(124,58,237,.3)` }}>
                    Ver alternativas →
                  </button>
                )}
                {!twDone && <button onClick={twSkip} className="text-xs underline mt-2" style={{ color:P.muted }}>Saltar ›</button>}
              </div>
            )}

            {/* CHOICES phase */}
            {simPhase==="choices" && (
              <>
                {/* Countdown + bonus indicator */}
                <div className="rounded-2xl p-3 border flex items-center gap-3" style={{ background:"linear-gradient(135deg,#0A1220,#101E3A)", borderColor: countdown<5?"rgba(239,68,68,.4)":"rgba(109,40,217,.28)" }}>
                  <svg width="52" height="52" className="flex-shrink-0">
                    <circle cx="26" cy="26" r={cdRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r={cdRadius} fill="none"
                      stroke={countdown < 5 ? P.r3 : countdown < 10 ? P.a3 : P.v3}
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={cdCirc} strokeDashoffset={cdOffset}
                      style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%", transition:"stroke-dashoffset .9s linear" }}
                    />
                    <text x="26" y="30" textAnchor="middle" fill={countdown<5?P.r3:P.text} fontSize="13" fontWeight="900" fontFamily="Poppins">{countdown}</text>
                  </svg>
                  <div>
                    <p className="text-xs font-bold" style={{ color:countdown<5?P.r3:P.text }}>
                      {countdown<5?"¡Decide ya!":"Tiempo para decidir"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Zap size={11} style={{ color:P.a3 }}/>
                      <span className="text-xs" style={{ color:P.a3 }}>
                        {countdown>10?"+30 XP bonus rápido":countdown>5?"+15 XP bonus":"Sin bonus"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Choice buttons */}
                <p className="text-xs font-bold uppercase tracking-widest px-1" style={{ color:P.muted }}>¿Qué haces?</p>
                <div className="space-y-2">
                  {scene?.choices?.map((c: any, idx: number)=>(
                    <button key={c.id} onClick={()=>handleChoice(c)}
                      className="w-full rounded-xl p-3 flex items-start gap-3 border text-left transition-all hover:scale-[1.02] active:scale-[.98]"
                      style={{ background:P.s1, borderColor:P.border, animation:`fadeSlideIn .25s ${idx*.07}s ease both` }}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor=P.bHover;el.style.background="rgba(109,40,217,.1)";}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor=P.border;el.style.background=P.s1;}}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background:"rgba(255,255,255,.06)" }}>
                        {c.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug" style={{ color:"rgba(240,246,255,.85)" }}>{c.text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* CHOSEN phase */}
            {simPhase==="chosen" && (
              <div className="rounded-2xl p-4 border" style={{ background:"rgba(16,185,129,.07)", borderColor:"rgba(16,185,129,.3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} style={{ color:P.g3 }}/>
                  <p className="text-xs font-bold" style={{ color:P.g3 }}>¡Decisión tomada!</p>
                  {bonusXP>0 && (
                    <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full" style={{ background:"rgba(245,158,11,.2)", color:P.a3 }}>
                      +{bonusXP} bonus
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}>
                  Consecuencias de tu elección en camino… preparate para la siguiente parte.
                </p>
                <div className="flex gap-1 mt-3">
                  {[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full" style={{ background:P.g3, animation:`pulse 0.8s ${i*.2}s infinite` }}/>)}
                </div>
              </div>
            )}

            {/* RESULT phase */}
            {simPhase==="result" && outcome && (
              <>
                <div className="rounded-2xl p-4 border" style={{ background:"linear-gradient(135deg,#080F20,#0E1B35)", borderColor:"rgba(109,40,217,.28)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">{outcome.emoji}</span>
                    <div>
                      <h3 className="font-black text-base" style={{ color:P.text }}>{outcome.head}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ width:"70px",background:"rgba(255,255,255,.1)" }}>
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width:`${outcome.score}%`,background:g(P.v3,P.g3,"90deg") }}/>
                        </div>
                        <span className="text-xs font-black" style={{ color:P.g3 }}>{outcome.score}/100</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="rounded-lg p-2.5 border" style={{ background:"rgba(16,185,129,.08)",borderColor:"rgba(16,185,129,.2)" }}>
                      <p className="text-xs font-bold mb-0.5" style={{ color:P.g3 }}>💪 Fortaleza</p>
                      <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}>{outcome.strength}</p>
                    </div>
                    <div className="rounded-lg p-2.5 border" style={{ background:"rgba(245,158,11,.08)",borderColor:"rgba(245,158,11,.2)" }}>
                      <p className="text-xs font-bold mb-0.5" style={{ color:P.a3 }}>🎯 A mejorar</p>
                      <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}>{outcome.improve}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:P.muted }}>Habilidades ganadas</p>
                  {Object.entries((outcome.gains||{}) as Record<string,number>).map(([s,gv])=>(
                    <Skill key={s} label={s} value={Math.min((gv as number)*4.5,100)} gain={gv as number} color={P.v4}/>
                  ))}
                  {bonusXP>0&&(
                    <div className="mt-2 rounded-lg p-2 flex items-center gap-2 border" style={{ background:"rgba(245,158,11,.08)",borderColor:"rgba(245,158,11,.25)" }}>
                      <Zap size={14} style={{ color:P.a3 }}/>
                      <span className="text-xs font-bold" style={{ color:P.a3 }}>+{bonusXP} XP bonus por respuesta rápida</span>
                    </div>
                  )}
                </div>
                <button onClick={completeMission}
                  className="w-full py-4 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[.98]"
                  style={{ background:g(P.g2,P.g3), boxShadow:`0 6px 20px rgba(16,185,129,.3)` }}>
                  🎉 Completar misión · +{(selMission?.xp??0)+bonusXP} XP
                </button>
              </>
            )}

            {/* Orión persistent tip for choices/dialogue */}
            {(simPhase==="narrate"||simPhase==="choices") && scene?.guide && (
              <div className="rounded-2xl p-3 border" style={{ background:P.s1, borderColor:P.border }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm" style={{ background:g(P.v2,P.v1) }}>🧙</div>
                  <p className="text-xs font-bold" style={{ color:P.v4 }}>Orión</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.65)" }}>
                  {simPhase==="choices" ? scene.guide : "Escucha con atención antes de tomar una decisión…"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  function ResultsScreen() {
    const earned=(selMission?.xp??150)+bonusXP;
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-8xl mb-4" style={{ animation:"bounce-icon 1.5s infinite" }}>{outcome?.emoji??"🎉"}</div>
        <h2 className="text-3xl font-black mb-1" style={{ color:P.text }}>¡Misión Completada!</h2>
        <p className="mb-8" style={{ color:P.muted }}>{selMission?.title}</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{ icon:"⚡",val:`+${earned}`,lbl:"XP",color:P.v4,bg:"rgba(139,92,246,.12)",border:"rgba(139,92,246,.28)" },
            { icon:"💰",val:`+${Math.floor(earned/3)}`,lbl:"Monedas",color:P.a3,bg:"rgba(245,158,11,.12)",border:"rgba(245,158,11,.28)" },
            { icon:"🏅",val:"+1",lbl:"Insignia",color:P.g3,bg:"rgba(16,185,129,.12)",border:"rgba(16,185,129,.28)" }].map(r=>(
            <div key={r.lbl} className="rounded-2xl p-5 border" style={{ background:r.bg, borderColor:r.border }}>
              <div className="text-3xl mb-2">{r.icon}</div>
              <div className="font-black text-2xl" style={{ color:r.color }}>{r.val}</div>
              <div className="text-sm mt-1" style={{ color:P.muted }}>{r.lbl}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-5 mb-5 text-left border" style={{ background:"linear-gradient(135deg,#0A1220,#101E3A)", borderColor:"rgba(109,40,217,.28)" }}>
          <div className="flex gap-3 items-center mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background:g(P.v2,P.v1) }}>🧙</div>
            <p className="text-sm leading-relaxed flex-1" style={{ color:"rgba(240,246,255,.9)" }}>"{outcome?.head}! {u.name}, demostraste un talento extraordinario. Estás a <strong style={{ color:P.v4 }}>{500-xpInLv} XP</strong> del nivel {u.level+1}."</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 border" style={{ background:"rgba(16,185,129,.08)",borderColor:"rgba(16,185,129,.2)" }}>
              <p className="text-xs font-bold mb-1" style={{ color:P.g3 }}>💪 Fortaleza</p>
              <p className="text-xs" style={{ color:"rgba(240,246,255,.7)" }}>{outcome?.strength}</p>
            </div>
            <div className="rounded-xl p-3 border" style={{ background:"rgba(245,158,11,.08)",borderColor:"rgba(245,158,11,.2)" }}>
              <p className="text-xs font-bold mb-1" style={{ color:P.a3 }}>🎯 A mejorar</p>
              <p className="text-xs" style={{ color:"rgba(240,246,255,.7)" }}>{outcome?.improve}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <PrimaryBtn onClick={()=>setAppScreen("map")} variant="ghost">Ver mapa</PrimaryBtn>
          <PrimaryBtn onClick={()=>{ setAppScreen("skill"); setSimPath(null); setSimScene("start"); setSimPhase("narrate"); setBonusXP(0); }} variant="violet">Otra misión 🚀</PrimaryBtn>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  function DashScreen() {
    return (
      <div>
        <h2 className="text-2xl font-black mb-0.5" style={{ color:P.text }}>Mi Progreso</h2>
        <p className="mb-8" style={{ color:P.muted }}>Semana del 25 — 30 de Junio, 2026</p>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatPill icon="🎯" val="14"     label="Misiones"   color={P.v4}/>
          <StatPill icon="⏱️" val="3.2h"   label="Práctica"   color={P.a3}/>
          <StatPill icon="🔥" val={`${u.streak}d`} label="Racha" color="#FB923C"/>
          <StatPill icon="🏆" val="#8"     label="Ranking"    color={P.g3}/>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
            <h3 className="font-bold text-sm mb-4" style={{ color:P.text }}>Radar de Habilidades</h3>
            <RadarSVG data={RADAR_DATA} color={P.v3} size={250}/>
          </div>
          <div className="rounded-2xl p-5 border" style={{ background:P.s1, borderColor:P.border }}>
            <h3 className="font-bold text-sm mb-4" style={{ color:P.text }}>Actividad Semanal</h3>
            <div className="flex items-end gap-2 h-44">
              {[3,5,2,7,4,6,1].map((v,i)=>(
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height:`${(v/7)*140}px`, background:i===5?g(P.v2,P.v3,"180deg"):"rgba(255,255,255,0.08)" }}/>
                  <span className="text-xs" style={{ color:P.muted }}>{"LMXJVSD"[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* AI */}
        <div className="rounded-2xl p-5 border" style={{ background:"linear-gradient(135deg,#0A1220,#101E3A)", borderColor:"rgba(109,40,217,.2)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:g(P.v2,P.c2) }}>🤖</div>
            <div><h3 className="font-bold text-sm" style={{ color:P.text }}>Asistente IA · Orión</h3><p className="text-xs" style={{ color:P.muted }}>Respuestas personalizadas para tu perfil</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.keys(AI_QA).map(q=>(
              <button key={q} onClick={()=>sendAi(q)} className="text-left text-xs border rounded-xl px-3 py-2.5 leading-snug transition-all" style={{ color:P.muted, background:"rgba(255,255,255,.04)", borderColor:P.border }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=P.v3}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=P.border}}
              >"{q}"</button>
            ))}
          </div>
          {aiLoad&&<div className="rounded-xl p-3 mb-3 border flex items-center gap-2" style={{ background:"rgba(255,255,255,.04)",borderColor:P.border }}>{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full" style={{ background:P.v4,animation:`pulse 1.2s ${i*.2}s infinite` }}/>)}<span className="text-xs ml-1" style={{ color:P.muted }}>Orión está pensando...</span></div>}
          {aiResp&&!aiLoad&&<div className="rounded-xl p-4 mb-3 text-sm leading-relaxed border" style={{ background:"rgba(255,255,255,.04)",borderColor:P.border,color:"rgba(240,246,255,.85)" }}><span className="font-bold" style={{ color:P.v4 }}>Orión: </span>{aiResp}</div>}
          <div className="flex gap-2">
            <input value={aiMsg} onChange={e=>setAiMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAi()} placeholder="Escribe tu pregunta…" className="flex-1 rounded-xl px-4 py-2.5 text-sm border focus:outline-none" style={{ background:"rgba(255,255,255,.06)",borderColor:P.border,color:P.text }}/>
            <button onClick={()=>sendAi()} className="px-4 py-2.5 rounded-xl" style={{ background:g(P.v2,P.v3) }}><Send size={16} className="text-white"/></button>
          </div>
        </div>
      </div>
    );
  }

  // ── AVATAR ────────────────────────────────────────────────────────────────
  function AvatarScreen() {
    return (
      <div>
        <h2 className="text-2xl font-black mb-1" style={{ color:P.text }}>Mi Avatar</h2>
        <p className="mb-8" style={{ color:P.muted }}>Personaliza tu personaje</p>
        <div className="grid grid-cols-3 gap-6">
          {/* Preview */}
          <div>
            <div className="rounded-2xl p-6 border text-center mb-4" style={{ background:P.s1, borderColor:P.border }}>
              <div className="relative w-32 h-40 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full" style={{ background:"radial-gradient(circle,rgba(109,40,217,.2) 0%,transparent 70%)" }}/>
                <CharSVG hair={avHair} hairStyle={avHairSt} skin={avSkin} shirt={avShirt} mood="happy" size={140}/>
                {avPet&&avPet!=="⛔"&&<div className="absolute bottom-0 right-0 text-2xl">{avPet}</div>}
              </div>
              <p className="font-bold" style={{ color:P.text }}>{u.name} {u.last}</p>
              <p className="text-xs mt-0.5" style={{ color:P.muted }}>Nivel {u.level} · {u.xp.toLocaleString()} XP</p>
            </div>
            <div className="rounded-2xl p-4 border space-y-3" style={{ background:P.s1, borderColor:P.border }}>
              {[{ icon:"⚡",val:`${u.xp.toLocaleString()} XP`,sub:"Total" },{ icon:"🏆",val:`${BADGES.length} insignias`,sub:"Colec." },{ icon:"🎯",val:"14 misiones",sub:"Hechas" },{ icon:"🔥",val:`${u.streak}d`,sub:"Racha" }].map(s=>(
                <div key={s.sub} className="flex items-center gap-3"><span className="text-lg">{s.icon}</span><div><p className="text-sm font-bold" style={{ color:P.text }}>{s.val}</p><p className="text-xs" style={{ color:P.muted }}>{s.sub}</p></div></div>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-5">
            <div className="flex gap-2">
              {(["char","pet"] as const).map(t=>(
                <button key={t} onClick={()=>setAvTab(t)} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all" style={avTab===t?{ background:g(P.v2,P.v3),color:"#fff" }:{ background:P.s1,color:P.muted,border:`1px solid ${P.border}` }}>
                  {t==="char"?"🧍 Personaje":"🐾 Mascota"}
                </button>
              ))}
            </div>

            {avTab==="char"&&(
              <>
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color:P.muted }}>Tono de piel</p>
                  <div className="flex gap-2">{SKIN_TONES.map(s=><button key={s} onClick={()=>setAvSkin(s)} className="w-9 h-9 rounded-full border-2 transition-all hover:scale-110" style={{ background:s,borderColor:avSkin===s?P.v4:"transparent" }}/>)}</div>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color:P.muted }}>Color de cabello</p>
                  <div className="flex gap-2 flex-wrap">{HAIR_COLORS.map(h=><button key={h} onClick={()=>setAvHair(h)} className="w-9 h-9 rounded-full border-2 transition-all hover:scale-110" style={{ background:h==="#F5F5F5"?"#c8c8c8":h,borderColor:avHair===h?P.v4:"transparent" }}/>)}</div>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color:P.muted }}>Estilo de cabello</p>
                  <div className="grid grid-cols-4 gap-2">
                    {HAIR_STYLES.map(s=>(
                      <button key={s} onClick={()=>setAvHairSt(s)} className="rounded-xl p-2 border transition-all hover:scale-105" style={{ background:avHairSt===s?g(P.v2,P.v3):P.s2,borderColor:avHairSt===s?P.v3:P.border }}>
                        <CharSVG hair={avHair} hairStyle={s} skin={avSkin} shirt={avShirt} mood="happy" size={55}/>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color:P.muted }}>Color de ropa</p>
                  <div className="flex gap-2 flex-wrap">{SHIRT_COLORS.map(c=><button key={c} onClick={()=>setAvShirt(c)} className="w-9 h-9 rounded-xl border-2 transition-all hover:scale-110" style={{ background:c,borderColor:avShirt===c?P.text:"transparent" }}/>)}</div>
                </div>
              </>
            )}

            {avTab==="pet"&&(
              <div className="grid grid-cols-6 gap-3">
                {PETS.map(p=>(
                  <button key={p} onClick={()=>setAvPet(p)} className="h-14 rounded-xl flex items-center justify-center text-2xl border transition-all hover:scale-110" style={{ background:avPet===p?g(P.v2,P.v1):P.s2,borderColor:avPet===p?P.v3:P.border }}>
                    {p==="⛔"?<span className="text-xs" style={{ color:P.muted }}>Sin</span>:p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

// ─── Layout atoms ──────────────────────────────────────────────────────────────
const CSS = `
  @keyframes cffall      {0%{transform:translateY(-60px) rotate(0deg);opacity:1}80%{opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}
  @keyframes bounce-icon {0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
  @keyframes lvup        {0%{opacity:0;transform:scale(.5)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
  @keyframes particleup  {0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-180px) scale(0.5);opacity:0}}
  @keyframes fadeSlideIn {from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.35);border-radius:4px}
  input::placeholder,textarea::placeholder{color:rgba(110,138,171,0.5)}
  input,select,button{font-family:'Poppins',sans-serif}
  select option{background:#152035}
`;

function Stars() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex:0 }}>
      {STARS.map((s,i)=><div key={i} className="absolute rounded-full bg-white animate-pulse" style={{ top:s.top,left:s.left,width:`${s.sz}px`,height:`${s.sz}px`,opacity:s.op,animationDelay:s.d,animationDuration:s.dur }}/>)}
      <div className="absolute" style={{ top:"-10%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(circle,rgba(109,40,217,0.09) 0%,transparent 65%)" }}/>
      <div className="absolute" style={{ bottom:"0",right:"-5%",width:"50%",height:"50%",background:"radial-gradient(circle,rgba(14,165,233,0.07) 0%,transparent 65%)" }}/>
    </div>
  );
}

// ─── Custom Radar Chart (pure SVG — no recharts key collisions) ────────────────
function RadarSVG({ data, color, size=240 }: { data:{skill:string;value:number}[]; color:string; size?:number }) {
  const N   = data.length;
  const CX  = size / 2;
  const CY  = size / 2 - 10;
  const R   = size * 0.33;
  const LR  = R + 28;
  const step = (2 * Math.PI) / N;

  const pt = (i:number, r:number) => {
    const a = i * step - Math.PI / 2;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  };

  const polygon = (r:number) => data.map((_,i) => { const p=pt(i,r); return `${p.x},${p.y}`; }).join(' ');

  const dataPts = data.map((d,i)=>pt(i,(d.value/100)*R));
  const dataStr = dataPts.map(p=>`${p.x},${p.y}`).join(' ');

  const anchor = (x:number, cx:number) => x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ overflow:"visible" }}>
      {/* Grid rings */}
      {[20,40,60,80,100].map(lvl=>(
        <polygon key={`ring-${lvl}`} points={polygon((lvl/100)*R)}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      ))}
      {/* Spokes */}
      {data.map((_,i)=>{ const p=pt(i,R); return (
        <line key={`spoke-${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      );})}
      {/* Data fill */}
      <polygon points={dataStr} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2}/>
      {/* Data dots */}
      {dataPts.map((p,i)=>(
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.5} fill={color} strokeWidth={1.5}
          stroke="rgba(0,0,0,0.3)"/>
      ))}
      {/* Labels */}
      {data.map((d,i)=>{ const p=pt(i,LR); return (
        <text key={`lbl-${i}`} x={p.x} y={p.y+3}
          textAnchor={anchor(p.x,CX)} fontSize="10.5" fill="rgba(124,143,172,0.9)"
          fontFamily="Poppins,sans-serif" fontWeight="600">
          {d.skill}
        </text>
      );})}
    </svg>
  );
}

// ─── CaseCard ─────────────────────────────────────────────────────────────────
function CaseCard({ c, onRemove }:{ c:GenCase; onRemove:()=>void }) {
  const [exp, setExp] = useState(false);
  const world = [{ id:"com",from:"#7C3AED" },{ id:"fin",from:"#D97706" },{ id:"tea",from:"#059669" },{ id:"pen",from:"#2563EB" },{ id:"dig",from:"#0891B2" },{ id:"lid",from:"#CA8A04" },{ id:"emo",from:"#BE185D" },{ id:"cre",from:"#DB2777" },{ id:"inn",from:"#4F46E5" },{ id:"emp",from:"#16A34A" },{ id:"tie",from:"#EA580C" },{ id:"pro",from:"#9333EA" }].find(w=>w.id===c.worldId);
  const bg=world?.from??"#7C3AED";
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background:"#131D31", borderColor:"rgba(85,120,175,0.16)" }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <span className="text-2xl flex-shrink-0">{c.worldEmoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-snug" style={{ color:"#F0F6FF" }}>{c.title}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full border" style={{ color:"#F0F6FF", borderColor:`${bg}66` }}>{c.worldName}</span>
              <span className="text-xs" style={{ color:c.difficulty==="Básico"?"#10B981":c.difficulty==="Intermedio"?"#F59E0B":"#EF4444" }}>{c.difficulty}</span>
              <span className="text-xs" style={{ color:"#7C8FAC" }}>⏱ {c.duration}</span>
              <span className="text-xs font-bold" style={{ color:"#A78BFA" }}>⚡ {c.xp} XP</span>
            </div>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color:"rgba(240,246,255,.6)", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" } as React.CSSProperties}>{c.objective}</p>
        <div className="flex gap-2">
          <button onClick={()=>setExp(p=>!p)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all" style={{ color:"#7C8FAC", borderColor:"rgba(85,120,175,0.16)" }}>{exp?"Ver menos ▲":"Ver completo ▼"}</button>
          <button onClick={onRemove} className="px-3 py-1.5 rounded-lg text-xs border transition-all" style={{ color:"#EF4444", borderColor:"rgba(239,68,68,.2)" }}>✕</button>
        </div>
      </div>
      {exp&&(
        <div className="px-4 pb-4 pt-1 border-t space-y-3" style={{ borderColor:"rgba(85,120,175,0.1)" }}>
          <div><p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color:"#38BDF8" }}>📖 Escenario</p><p className="text-xs leading-relaxed" style={{ color:"rgba(240,246,255,.75)" }}>{c.scenario}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:"#F59E0B" }}>💬 Preguntas de reflexión</p>
            {c.questions.map((q,i)=><p key={i} className="text-xs mb-1 leading-relaxed" style={{ color:"rgba(240,246,255,.7)" }}><span className="font-black" style={{ color:"#F59E0B" }}>{i+1}. </span>{q}</p>)}
          </div>
          <div className="rounded-lg p-3 border" style={{ background:"rgba(16,185,129,.06)",borderColor:"rgba(16,185,129,.2)" }}>
            <p className="text-xs font-bold mb-0.5" style={{ color:"#10B981" }}>✅ Evaluación</p>
            <p className="text-xs" style={{ color:"rgba(240,246,255,.7)" }}>{c.evaluation}</p>
          </div>
          {c.tips&&<div className="rounded-lg p-3 border" style={{ background:"rgba(14,165,233,.06)",borderColor:"rgba(14,165,233,.2)" }}>
            <p className="text-xs font-bold mb-0.5" style={{ color:"#0EA5E9" }}>💡 Tips docente</p>
            <p className="text-xs" style={{ color:"rgba(240,246,255,.7)" }}>{c.tips}</p>
          </div>}
        </div>
      )}
    </div>
  );
}

function Shell({ children }:{ children:React.ReactNode }) {
  return (
    <div className="bg-background text-foreground" style={{ fontFamily:"'Poppins',sans-serif",minHeight:"100vh" }}>
      <style>{CSS}</style>
      <Stars/>
      <div className="relative" style={{ zIndex:1 }}>{children}</div>
    </div>
  );
}

function AuthWrap({ title, sub, onBack, children }:{ title:string; sub:string; onBack:()=>void; children:React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background:P.bg }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center border hover:bg-white/5 transition-colors" style={{ background:P.s1,borderColor:P.border,color:P.muted }}><ArrowLeft size={16}/></button>
          <div><h2 className="text-xl font-black" style={{ color:P.text }}>{title}</h2><p className="text-xs" style={{ color:P.muted }}>{sub}</p></div>
        </div>
        <div className="rounded-2xl p-6 border" style={{ background:P.s1,borderColor:P.border }}>{children}</div>
      </div>
    </div>
  );
}
