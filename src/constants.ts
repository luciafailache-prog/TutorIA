export const INITIAL_TOPICS = [
  {
    id: 'mru-mruv',
    title: 'MRU y MRUV (Horizontal)',
    description: 'Movimiento horizontal con y sin aceleración.',
    theory: `
      En física no se estudia de memoria. Hay que pensar. 
      - **MRU**: Velocidad constante. $X = X_o + V \cdot t$. La pendiente del gráfico $X(t)$ es la velocidad.
      - **MRUV**: Aceleración constante. La velocidad cambia linealmente. $X = X_o + V_o \cdot t + 0.5 \cdot a \cdot t^2$.
      Lula dice: "Si el término cuadrático es positivo, la parábola está contenta ($\cup$)".
    `,
    exercises: [
      { id: 'ex_mru_1', question: 'Un automóvil se mueve a 75 km/h. ¿Cuánto recorre en 3h?', difficulty: 'easy', correctSolution: '225 km' },
      { id: 'ex_mruv_1', question: 'Un auto arranca con aceleración constante de 2.2 m/s². En el mismo instante un camión, que viaja a una velocidad constante de 9.5 m/s, lo pasa. ¿A qué distancia el auto alcanza al camión?', difficulty: 'hard', correctSolution: '82.04m' }
    ]
  },
  {
    id: 'mov-vertical',
    title: 'Movimiento Vertical',
    description: 'Caída libre y tiro vertical.',
    theory: `
      Es un MRUV pero en el aire. La aceleración es la gravedad ($g \approx 10 \, \text{m/s}^2$). 
      Importante: Si tomás el eje $Y$ para arriba, $g$ es negativa.
      En la altura máxima, la velocidad es CERO.
    `,
    exercises: [
      { id: 'ex_vertical_1', question: 'Desde una terraza a 40 m del suelo se lanza una piedra hacia arriba con v=15 m/s. ¿Cuándo llega al suelo?', difficulty: 'medium', correctSolution: '4.62s' },
      { id: 'ex_vertical_2', question: 'Un cuerpo cae libremente y emplea 4s en recorrer la primera mitad de su desplazamiento. ¿Cuál es el desplazamiento total?', difficulty: 'hard', correctSolution: '156.8m' }
    ]
  },
  {
    id: 'tiro-oblicuo',
    title: 'Tiro Oblicuo',
    description: 'Parábolas y proyectiles.',
    theory: `
      Principio de independencia de Galileo: una sombra en $X$ (MRU) y una sombra en $Y$ (Tiro Vertical).
      Cada una hace su vida sin enterarse de la otra.
      Usás trigonometría: $V_x = V_o \cdot \cos(\alpha)$ y $V_y = V_o \cdot \sin(\alpha)$.
    `,
    exercises: [
      { id: 'ex_oblicuo_1', question: 'Un arquero dispara una flecha con v=50 m/s a 37º. Calcula el alcance máximo.', difficulty: 'medium', correctSolution: '240m' }
    ]
  },
  {
    id: 'dinamica',
    title: 'Dinámica',
    description: 'Fuerzas y Leyes de Newton.',
    theory: `
      - 1ra Ley: Inercia. Si nadie lo empuja, no cambia.
      - 2da Ley: $F = m \cdot a$. La madre de las fórmulas.
      - 3ra Ley: Acción y reacción. 
      DCL: Hacé siempre el Diagrama de Cuerpo Libre. Dibujá todas las flechitas (fuerzas).
    `,
    exercises: [
      { id: 'ex_dinamica_1', question: 'Una grúa eleva 800 kg con un cable que soporta 12000 N. ¿Cuál es la máxima aceleración con que se puede elevar?', difficulty: 'medium', correctSolution: '5.2 m/s²' }
    ]
  },
  {
    id: 'trabajo-energia',
    title: 'Trabajo y Energía',
    description: 'Joules y conservación.',
    theory: `
      - Trabajo: $W = F \cdot d \cdot \cos(\theta)$. Transferencia de energía.
      - $E_c$: $\frac{1}{2} m \cdot v^2$ (Energía del movimiento).
      - $E_p$: $m \cdot g \cdot h$ (Energía de la altura).
      La energía mecánica se conserva si no hay rozamiento. No se crea ni se destruye, se transforma.
    `,
    exercises: [
      { id: 'ex_energia_1', question: 'Un tren de 12 Ton va a 15 m/s. El maquinista frena y se detiene en 70m. ¿Cuánto vale el trabajo del freno?', difficulty: 'medium', correctSolution: '-1.35x10^6 J' },
      { id: 'ex_energia_2', question: 'Una bala de 200g a 340 m/s impacta un árbol y penetra 20cm. Calcula la fuerza realizada por el árbol.', difficulty: 'hard', correctSolution: '289000 N' }
    ]
  }
];

export const BADGES = [
  { id: 'first_step', name: 'Primer Paso', icon: '🚀', criteria: 'Completa tu primer tema' },
  { id: 'pro_solver', name: 'Modo Profe', icon: '🎓', criteria: 'Corrige 3 ejercicios' },
  { id: 'exam_warrior', name: 'Guerrero de Exámenes', icon: '⚔️', criteria: 'Completa un modelo de evaluación' }
];
