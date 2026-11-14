export const es = {
  app: {
    title: 'CompiLab',
    subtitle: 'Simulador interactivo de compilador aritmético',
    nav: {
      editor: 'Editor de Bloques',
      arena: 'Arena de Compilación',
      result: 'Resultado',
      error: 'Error',
    },
    actions: {
      compile: 'Compilar',
      compiling: 'Compilando...',
      reset: 'Reiniciar',
      loadExample: 'Cargar Ejemplo',
      continue: 'Continuar',
      skip: 'Saltar animación',
      play: 'Reproducir',
      pause: 'Pausar',
      stepForward: 'Paso siguiente',
      stepBackward: 'Paso anterior',
    },
  },
  phases: {
    lexical: 'Análisis Léxico',
    syntactic: 'Análisis Sintáctico',
    semantic: 'Análisis Semántico',
    ir: 'Código Intermedio',
    optimization: 'Optimización',
    assembly: 'Ensamblador',
    binary: 'Binario',
  },
  errors: {
    server: 'El servidor no responde o devolvió un error interno.',
    contract: 'La respuesta del servidor no cumple con el contrato v1.',
    network: 'Error de conexión de red.',
    fixApplied: 'Corrección aplicada.',
  },
  editor: {
    limits: 'Límites: máx 8 líneas y 12 fragmentos',
    fragmentLimitReached: 'Has alcanzado el límite máximo de 12 fragmentos.',
  },
} as const;
