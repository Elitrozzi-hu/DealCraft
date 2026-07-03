

import type { Language } from "@/types";

const es = {
  // ── ui/ primitives ──────────────────────────────────────────────────────
  "ui.spinner.loading": "Cargando…",
  "ui.overlay.close": "Cerrar",
  "ui.status.validated.word": "validado",
  "ui.status.validated.desc": "Verificado en una fuente con URL.",
  "ui.status.inferred.word": "inferido",
  "ui.status.inferred.desc":
    "Estimado por benchmarks o señales, sin fuente directa.",
  "ui.status.cold.word": "sin dato",
  "ui.status.cold.desc": "No encontramos el dato — queda marcado para validar.",
  "ui.errorBoundary.title": "Algo salió mal",
  "ui.errorBoundary.body":
    "Ocurrió un error inesperado. Recargá la página para volver a empezar.",
  "ui.errorBoundary.reload": "Recargar",
  "ui.provenance.legendTitle": "Procedencia",
  "ui.sourceLink.open": "Abrir fuente",
  "ui.provenanceBadge.confidence": "confianza {pct}%",

  // ── i18n / language ───────────────────────────────────────────────────────
  "i18n.lang.es": "español",
  "i18n.lang.en": "inglés",
  "i18n.staleNotice": "Este contenido sigue en {lang} — regeneralo para traducirlo.",

  // ── common (reused across features) ───────────────────────────────────────
  "common.empCount": "{count} emp.",
  "common.desklessPct": "{pct}% deskless",
  "nav.backToStart": "Volver al inicio",

  // ── landing / search flow ─────────────────────────────────────────────────
  "search.errorTitle": "No se pudo completar la búsqueda",
  "search.errorFallback": "Error de búsqueda.",
  "search.analyzing": "Analizando deal",
  "search.complete": "Análisis completo",
  "search.completeDetail":
    "{company} · {count} campos verificados, cada uno con su fuente y nivel de confianza.",
  "search.provenanceNote":
    "Cada dato se guarda con su fuente y nivel de confianza. Nunca inventamos.",
  "landing.heading": "Analizá tu próximo deal",
  "landing.subhead":
    "Buscamos el lead en HubSpot por su email para enriquecer el análisis.",
  "landing.emailLabel": "Email del lead",
  "landing.emailPlaceholder": "nombre@empresa.com",
  "landing.searchButton": "Buscar →",
  "landing.examples": "Ejemplos:",
  "landing.searchingLeads": "Buscando leads…",
  "landing.searchingLeadsHub": "Buscando leads en HubSpot…",
  "landing.leadErrorTitle": "No se pudo buscar el lead",
  "landing.noMatchTitle": "Sin coincidencias",
  "landing.noMatchBody":
    "No encontramos ningún lead para ese email. Verificá el email o cargá el lead en HubSpot antes de continuar.",
  "landing.dealsFoundTitle": "Deals encontrados",
  "landing.dealsFoundSub": "Elegí el deal correcto para iniciar el análisis.",
  "landing.recentTitle": "Análisis recientes",
  "landing.recentCount": "{count} deals activos",
  "landing.scoreLabel": "score",
  "landing.contactFallback": "Contacto",
  "landing.noContact": "Sin contacto",
  "landing.dealUnnamed": "Deal sin nombre",
  "landing.noDeals": "Sin deals asociados — continuar sin deal",
  "landing.pickDeal": "Elegí un deal",

  // ── deal header + analysis panel + copilot ────────────────────────────────
  "nav.newAnalysis": "Nuevo análisis",
  "dealHeader.stage": "Etapa HubSpot",
  "dealHeader.amount": "Monto",
  "panel.tab.company": "Empresa",
  "panel.tab.pains": "Dolores",
  "panel.tab.cases": "Casos de éxito",
  "panel.tab.signals": "Signals",
  "panel.tab.brief": "Brief pre-call",
  "panel.tab.briefShort": "Brief",
  "panel.section.context": "Contexto",
  "panel.section.stakeholders": "Stakeholders",
  "panel.sub.company": "Contexto y stakeholders del deal.",
  "panel.sub.cases": "Clientes similares que ya usan Humand.",
  "panel.sub.signals":
    "Signals recientes de la empresa — liderazgo, expansión, financiamiento.",
  "panel.sub.brief":
    "Hipótesis de valor para preparar la call de discovery — uso interno.",
  "panel.coldStart.title": "Cold start.",
  "panel.coldStart.body":
    "Todo inferido, baja confianza. No fabricamos data — marcamos qué validar.",
  "panel.keyMetrics": "Key metrics",
  "panel.metric.region": "Región",
  "panel.metric.industry": "Industria",
  "panel.metric.workforce": "Workforce",
  "panel.metric.integratedSystems": "Sistemas integrados",
  "panel.metric.integratedSystemsTooltip":
    "Sistemas de terceros con los que Humand se ha integrado en esta cuenta",
  "panel.metric.headcount": "Headcount",
  "panel.metric.headcountValue": "{count} empleados",
  "panel.metric.headcountConflict": "Headcount · conflicto",
  "panel.metric.resolveHeadcount": "resolver → 485",
  "panel.techStack": "Tech stack ({count})",
  "panel.techKind.desplazar": "desplazar",
  "panel.techKind.integrar": "integrar",
  "panel.techKind.coexistir": "coexistir",
  "panel.sourceFallback": "fuente",
  "panel.openSourceWith": "Abrir fuente · {source}",
  "copilot.analysisTitle": "Análisis del deal",
  "copilot.analysisSub": "Contexto, stakeholders y señales del mercado.",
  "copilot.resourcesTitle": "Recursos para la llamada",
  "copilot.resourcesSub": "Materiales de venta y guía de discovery.",
  "copilot.materialsTitle": "Materiales de venta",
  "copilot.materialsSub":
    "Personalizados para este deal. Revisá y descargá antes de la reunión.",

  // ── blocks: stakeholders / pains / comps ──────────────────────────────────
  "common.validate": "validar",
  "common.validated": "validado",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.add": "＋ agregar",
  "common.edit": "editar",
  "stakeholders.namePlaceholder": "Nombre",
  "stakeholders.titlePlaceholder": "Puesto",
  "stakeholders.roleLabel": "Rol",
  "stakeholders.emptyTitle": "Sin stakeholders todavía",
  "stakeholders.emptyHint":
    "El research no encontró decisores verificables para este deal. Agregá uno a mano o reintentá el enrichment.",
  "stakeholders.addStakeholder": "＋ agregar stakeholder",
  "stakeholders.openSourceOf": "Abrir fuente de {name}",
  "stakeholders.sourceFirmografia": "Firmografía",
  "comps.painsOne": "{count} dolor",
  "comps.painsMany": "{count} dolores",
  "comps.modulesOne": "{count} módulo",
  "comps.modulesMany": "{count} módulos",
  "comps.collaborators": "{count} colabs.",
  "comps.modulesImplemented": "Módulos de Humand implementados",
  "comps.afterImplementing": "Tras implementar Humand",
  "comps.viewCase": "Ver caso de éxito",
  "comps.viewVideo": "Ver video",
  "comps.emptyTitle": "Sin casos para esta industria",
  "comps.emptyBody": "Humand aún no tiene un caso publicado para este sector.",

  // ── blocks: signals ───────────────────────────────────────────────────────
  "common.retry": "Reintentar",
  "common.unknownError": "Error desconocido",
  "signals.scan.leadership": "Buscando cambios de liderazgo…",
  "signals.scan.maFunding": "Buscando M&A y financiamiento…",
  "signals.scan.expansion": "Buscando expansiones y nuevas aperturas…",
  "signals.scan.culture": "Buscando programas de cultura y GPTW…",
  "signals.scan.restructuring": "Buscando reestructuraciones y conflictos…",
  "signals.scan.stack": "Verificando stack tecnológico…",
  "signals.type.new_people_leader": "Nuevo líder RRHH",
  "signals.type.m_and_a": "M&A",
  "signals.type.funding": "Financiamiento",
  "signals.type.hiring_surge": "Contratación masiva",
  "signals.type.expansion": "Expansión",
  "signals.type.hr_digital_transformation": "Transf. HR Digital",
  "signals.type.culture_program": "Cultura",
  "signals.type.gptw": "GPTW",
  "signals.type.restructuring": "Reestructuración",
  "signals.type.labor_conflict": "Conflicto laboral",
  "signals.type.esg_dei": "ESG / DEI",
  "signals.type.compliance_training": "Compliance",
  "signals.type.turnover": "Rotación",
  "signals.type.stack": "Stack tecnológico",
  "signals.verified": "verificado",
  "signals.idleTitle": "Signals de mercado",
  "signals.idleBody":
    "Detectá qué está pasando en la empresa ahora — cambios de liderazgo, financiamiento, expansiones y más.",
  "signals.research": "Investigar signals",
  "signals.researching": "Investigando…",
  "signals.errorTitle": "La investigación falló",
  "signals.emptyTitle": "Sin signals en los últimos 6 meses",
  "signals.emptyBody":
    "No encontramos eventos recientes y verificables para esta empresa. Puede haber más información disponible en otros idiomas o fuentes.",
  "signals.realtime": "Últimos 6 meses · investigación en tiempo real",
  "signals.reResearch": "Reinvestigar →",

  // ── blocks: pre-call brief ────────────────────────────────────────────────
  "brief.build.profile": "Leyendo perfil de la empresa…",
  "brief.build.comparables": "Cruzando casos comparables del sector…",
  "brief.build.hypotheses": "Formulando hipótesis de valor…",
  "brief.build.questions": "Armando preguntas de discovery…",
  "brief.caseFallback": "caso",
  "brief.proof": "Prueba",
  "brief.askToConfirm": "Preguntar para confirmar",
  "brief.confirmsLabel": "Confirma",
  "brief.discardsLabel": "Descartá",
  "brief.idleBody":
    "Llegá preparado a la call: 2-3 hipótesis de valor priorizadas, con prueba de casos comparables y preguntas para validarlas.",
  "brief.buildAction": "Armar brief pre-call",
  "brief.building": "Armando brief…",
  "brief.errorTitle": "No se pudo armar el brief",
  "brief.prioritized": "{count} hipótesis priorizadas · a validar en la call",
  "brief.internalUse": "● uso interno · no se envía al cliente",
  "brief.contextToCover": "Contexto a cubrir en discovery",
  "brief.footer":
    "Generado desde el perfil de la empresa + casos comparables del mismo sector. Las hipótesis son inferencias para validar en la call, no hechos confirmados.",
  "brief.rebuild": "Rearmar brief →",

  // ── materials (panel chrome — generated content lives server-side) ─────────
  "materials.generating": "Generando materiales…",
  "materials.personalizing": "Personalizando para este deal",
  "materials.errorTitle": "No se pudieron generar los materiales",
  "materials.errorFallback": "Revisá la conexión e intentá de nuevo.",
  "materials.empty": "Los materiales aparecerán acá en segundos.",
  "materials.viewMaterial": "Ver material",
  "materials.downloadLoading": "Generando…",
  "materials.downloadPptx": "↓ Descargar .pptx",
  "materials.downloadError": "No se pudo generar la presentación",
  "materials.pricingHidden": "Pricing oculto. Activá el toggle.",
  "materials.pricingConfirmed": "USD {mrr}/mes · confirmado ✓",
  "materials.pricingEstimateBold": "Possibly MRR ≈ USD {mrr}/mes",
  "materials.pricingEstimateBefore": "— estimado. Hereda el",
  "materials.pricingEstimateAfter": "hasta confirmar.",
  "materials.presentationTitle": "Presentación - {client}",
  "materials.configurePresentation": "Configurar presentación",
  "materials.title.pres": "Presentación",
  "materials.title.pre": "Email pre-reunión",
  "materials.title.post": "Recap post-reunión",
  "materials.sub.pres": "client-facing · gated",
  "materials.sub.pre": "comunicación · antes de la call",
  "materials.sub.post": "comunicación · dispara re-análisis",
  "deck.users": "Users",
  "deck.mrr": "MRR",
  "deck.mrrDesc": "MRR desc.",
  "deck.client": "Cliente",
  "deck.date": "Fecha",
  "deck.logo": "Logo",
  "deck.logoPlaceholder": "url o image.png (opcional)",
  "deck.planMain": "Plan principal",
  "deck.planA": "Plan A",
  "deck.planB": "Plan B",

  // ── auth ─────────────────────────────────────────────────────────────────────
  "auth.signOut": "Cerrar sesión",
  "auth.login.heading": "Ingresá a DealCraft",
  "auth.login.subhead": "Usá tu cuenta de Google de Humand para continuar.",
  "auth.login.googleButton": "Continuar con Google",
  "auth.error.title": "Algo salió mal",
  "auth.error.missing_params": "La sesión expiró o la URL de callback estaba incompleta. Volvé a intentar el inicio de sesión.",
  "auth.error.auth_failed": "No pudimos validar tu identidad con Google. Volvé a intentarlo.",
  "auth.error.session_expired": "Tu sesión expiró. Iniciá sesión de nuevo para continuar.",
  "auth.error.fallback": "No pudimos completar el inicio de sesión. Por favor, volvé a intentarlo.",
  "auth.error.retry": "Volver a intentar",
  "auth.error.goToHumand": "Ir a Humand",

  // ── search steps + taxonomy display (keys stay Spanish for matching) ───────
  "search.steps.resolving": "Resolviendo entidad…",
  "search.steps.enriching": "Enriqueciendo firmografía…",
  "search.steps.deskless": "Estimando % deskless…",
  "search.steps.hubspot": "Consultando HubSpot…",
  "search.steps.signals": "Buscando señales…",
  "search.steps.provenance": "Compilando procedencia…",
  "taxonomy.comunicacionInterna": "Comunicación interna",
  "taxonomy.onboarding": "Onboarding / Capacitación",
  "taxonomy.clima": "Clima / Engagement",
  "taxonomy.autogestion": "Autogestión / Documentos",
  "taxonomy.reconocimiento": "Reconocimiento",
  "taxonomy.seguridad": "Seguridad / Compliance",
  "taxonomy.beneficios": "Beneficios",

  // ── discovery tab ───────────────────────────────────────────────────────
  "discovery.header.title": "Discovery",
  "discovery.header.badge": "15 min",
  "discovery.header.sub": "Preguntas y objeciones para esta etapa.",
  "discovery.subtab.trigger": "Trigger questions",
  "discovery.subtab.byRole": "Por rol",
  "discovery.subtab.objections": "Objeciones",
  "discovery.pill.context": "Contexto",
  "discovery.pill.painPriority": "Dolor y prioridad",
  "discovery.objections.verTodas": "Ver todas",
  "discovery.objections.starredBadge": "⭐ Frecuente",
  "discovery.objections.whatItMeansLabel": "Qué significa",
  "discovery.objections.respondWithLabel": "Respondé con",

  "discovery.trigger.discovery":
    "¿Cómo comunican hoy los cambios importantes — políticas, beneficios, novedades — a todos los empleados?",
  "discovery.trigger.hr":
    "¿Qué procesos de HR siguen siendo manuales o por email? Vacaciones, onboarding, solicitudes...",
  "discovery.trigger.tech":
    "¿Qué herramientas tienen hoy para la gestión de personas? ¿Solo el sistema de nómina o algo más?",
  "discovery.trigger.pain":
    "Si pudieras resolver un solo problema del equipo de HR este año, ¿cuál elegiría?",
  "discovery.trigger.decision":
    "¿Quién más debería estar en esta conversación? ¿El CEO / COO también participa en este tipo de decisiones?",

  "discovery.role.all": "Todos",
  "discovery.role.hrLeader.label": "HR Leader",
  "discovery.role.opsLeader.label": "Ops Leader",
  "discovery.role.itLeader.label": "IT Leader",
  "discovery.role.cSuite.label": "C-Suite / Exec",

  "discovery.role.hrLeader.q1":
    "¿Qué canales usan hoy para que las políticas y novedades de HR lleguen a todo el personal?",
  "discovery.role.hrLeader.q2":
    "¿Cuáles de los procesos de tu equipo — vacaciones, onboarding, solicitudes — todavía dependen de planillas o email?",
  "discovery.role.hrLeader.q3":
    "¿Cuántas horas por semana dedica el equipo de HR a consultas repetitivas de empleados?",
  "discovery.role.opsLeader.q1":
    "¿Cómo garantizan que un mensaje operativo importante llegó a todos — especialmente fuera de la oficina?",
  "discovery.role.opsLeader.q2":
    "¿Qué herramientas usan los managers para coordinar sus equipos?",
  "discovery.role.opsLeader.q3":
    "¿Dónde está el mayor cuello de botella operativo relacionado con la gestión de personas?",
  "discovery.role.itLeader.q1": "¿Qué sistemas de HR o nómina tienen actualmente?",
  "discovery.role.itLeader.q2":
    "¿Cuáles son los requerimientos de integración y seguridad para herramientas de employee experience?",
  "discovery.role.itLeader.q3":
    "¿Los empleados tienen acceso a email corporativo o usan dispositivos personales?",
  "discovery.role.cSuite.q1":
    "¿Cuál es el mayor desafío de personas que quieren resolver este año?",
  "discovery.role.cSuite.q2":
    "Si pudieran resolver un solo problema de HR este año, ¿cuál sería?",
  "discovery.role.cSuite.q3":
    "¿Cuál es el impacto de la rotación actual en el negocio — tienen estimado el costo?",

  "discovery.objections.sinPresupuesto.quote": "No tenemos presupuesto este año",
  "discovery.objections.sinPresupuesto.whatItMeans":
    "No ven ROI inmediato. Prioridades internas compitiendo. Falta de urgencia percibida.",
  "discovery.objections.sinPresupuesto.response1":
    "¿Hoy cuánto tiempo o dinero se les va en procesos manuales?",
  "discovery.objections.sinPresupuesto.response2":
    "¿Esto es falta de presupuesto o falta de prioridad?",
  "discovery.objections.sinPresupuesto.closing":
    "¿Te sirve si armamos juntos un cálculo rápido del costo actual de estos procesos manuales?",

  "discovery.objections.corporativoDecide.quote": "Eso lo decide el corporativo",
  "discovery.objections.corporativoDecide.whatItMeans":
    "Centralización regional o global. Falta de champion local.",
  "discovery.objections.corporativoDecide.response1":
    "¿Qué criterios suele pedir corporativo para aprobar herramientas?",
  "discovery.objections.corporativoDecide.closing":
    "¿Hay alguien de tu equipo que pueda hacer de sponsor interno para llevar esto a corporativo?",

  "discovery.objections.yaTienenHR.quote": "Ya tenemos una herramienta de RRHH",
  "discovery.objections.yaTienenHR.whatItMeans":
    "Solapamiento parcial percibido. Resistencia al cambio.",
  "discovery.objections.yaTienenHR.response1":
    "¿Qué siguen resolviendo con Excel o WhatsApp?",
  "discovery.objections.yaTienenHR.closing":
    "¿Te interesaría ver cómo Humand se integra con lo que ya tienen, sin migrar todo de una?",

  "discovery.objections.noUsanCelular.quote":
    "Nuestros colaboradores no pueden usar el celular",
  "discovery.objections.noUsanCelular.whatItMeans":
    "Personal operativo en planta, tienda o campo con restricciones de dispositivos móviles.",
  "discovery.objections.noUsanCelular.response1":
    "¿Hoy cómo comunican avisos o políticas a este personal?",
  "discovery.objections.noUsanCelular.response2":
    "¿Qué pasa cuando alguien dice que no se enteró de un cambio importante?",
  "discovery.objections.noUsanCelular.closing":
    "¿Qué otros canales tienen disponibles hoy en planta — kioscos, tablets, pantallas — para llegar a ese personal?",

  "discovery.objections.whatsappAlcanza.quote": "Con WhatsApp nos funciona",
  "discovery.objections.whatsappAlcanza.whatItMeans":
    "Informalidad, falta de visibilidad y trazabilidad interna.",
  "discovery.objections.whatsappAlcanza.response1":
    "¿Qué pasa cuando alguien dice que no vio el mensaje?",
  "discovery.objections.whatsappAlcanza.response2":
    "¿Cómo auditan comunicación interna hoy?",
  "discovery.objections.whatsappAlcanza.closing":
    "¿Te gustaría empezar con un piloto acotado para comparar la trazabilidad contra lo que tienen hoy con WhatsApp?",

  "discovery.objections.cambiarSistemasComplejo.quote": "Cambiar sistemas es muy complejo",
  "discovery.objections.cambiarSistemasComplejo.whatItMeans":
    "RRHH saturado. Miedo a implementación fallida.",
  "discovery.objections.cambiarSistemasComplejo.response1":
    "¿Qué proceso les quita más tiempo hoy?",
  "discovery.objections.cambiarSistemasComplejo.response2":
    "¿Qué pasaría si solo automatizan uno?",
  "discovery.objections.cambiarSistemasComplejo.closing":
    "¿Qué proceso te gustaría automatizar primero para ver un resultado rápido?",

  "discovery.objections.sinTiempoImplementar.quote": "No tenemos tiempo para implementar",
  "discovery.objections.sinTiempoImplementar.whatItMeans":
    "Equipo pequeño, operación reactiva constante.",
  "discovery.objections.sinTiempoImplementar.response1":
    "¿Qué tarea repetitiva harían desaparecer mañana?",
  "discovery.objections.sinTiempoImplementar.closing":
    "¿Qué tarea repetitiva te gustaría que desaparezca desde el primer mes?",

  "discovery.objections.noPuedenMoverNomina.quote": "La nómina no la podemos mover",
  "discovery.objections.noPuedenMoverNomina.whatItMeans":
    "Riesgo legal percibido. Dependencia de proveedor local.",
  "discovery.objections.noPuedenMoverNomina.response1":
    "Perfecto, Humand no reemplaza nómina — se integra con tu sistema actual.",
  "discovery.objections.noPuedenMoverNomina.closing":
    "¿Qué sistema de nómina usan hoy, para confirmar cómo se integraría?",

  "discovery.objections.seVeGrande.quote": "Humand se ve muy grande para nosotros",
  "discovery.objections.seVeGrande.whatItMeans":
    "Miedo a pagar de más. Baja madurez digital interna.",
  "discovery.objections.seVeGrande.response1": "¿Qué proceso te duele más hoy?",
  "discovery.objections.seVeGrande.response2": "¿Y si empiezan solo con ese?",
  "discovery.objections.seVeGrande.closing":
    "¿Con qué módulo te gustaría empezar si arrancáramos por lo más chico?",

  "discovery.objections.yaTienenSAP.quote": "Tenemos SAP implementado",
  "discovery.objections.yaTienenSAP.whatItMeans":
    "SAP cubre corporativo. Planta y frontline quedan sin cobertura real.",
  "discovery.objections.yaTienenSAP.response1":
    "SAP gestiona datos. ¿Cómo le comunicás cambios a los operarios de planta?",
  "discovery.objections.yaTienenSAP.closing":
    "¿Cómo le comunican hoy los cambios a los operarios que no tienen acceso a SAP?",

  "discovery.objections.seguridadDatos.quote":
    "¿Cómo garantizan la seguridad de nuestros datos?",
  "discovery.objections.seguridadDatos.whatItMeans":
    "Preocupación de IT/legal por compliance y exposición de datos sensibles de RRHH; a veces es un requisito formal de aprobación antes de evaluar cualquier herramienta nueva.",
  "discovery.objections.seguridadDatos.response1":
    "Contamos con cifrado en tránsito y en reposo, controles de acceso y certificaciones vigentes — ¿qué requisitos les pide hoy su equipo de IT o seguridad?",
  "discovery.objections.seguridadDatos.response2":
    "¿Ya evaluaron la seguridad de otro proveedor de HR tech? ¿Qué les pidieron en ese proceso?",
  "discovery.objections.seguridadDatos.closing":
    "¿Quién de su equipo de IT o seguridad debería sumarse a la conversación para resolver esto en paralelo?",

  "discovery.objections.slaSoporte.quote": "¿Qué SLA de soporte tienen?",
  "discovery.objections.slaSoporte.whatItMeans":
    "Temor a quedar sin resolución rápida ante un incidente operativo — más crítico si tienen personal frontline que depende de la plataforma para comunicación diaria.",
  "discovery.objections.slaSoporte.response1":
    "Tenemos SLAs diferenciados por criticidad, con tiempos de respuesta garantizados. ¿Hoy, con su proveedor actual, cuánto tardan en resolver un incidente urgente?",
  "discovery.objections.slaSoporte.closing":
    "¿Qué pasó la última vez que tuvieron un problema urgente con una herramienta similar?",

  "discovery.objections.guiaImplementacion.quote":
    "¿Cómo es el proceso de implementación? Necesitamos que nos guíen paso a paso.",
  "discovery.objections.guiaImplementacion.whatItMeans":
    "Falta de confianza en la capacidad interna de ejecutar el cambio, o una mala experiencia previa con una implementación sin acompañamiento.",
  "discovery.objections.guiaImplementacion.response1":
    "La implementación es guiada por nuestro equipo de Customer Success desde el día uno, con quick wins desde el primer mes.",
  "discovery.objections.guiaImplementacion.response2":
    "¿Qué fue lo que más les costó en la última implementación de una herramienta nueva?",
  "discovery.objections.guiaImplementacion.closing":
    "¿Quién sería el owner interno del proyecto durante la implementación?",

  "discovery.objections.integracionesAPI.quote":
    "Necesitamos que se integre con nuestros sistemas actuales vía API.",
  "discovery.objections.integracionesAPI.whatItMeans":
    "Requisito técnico de IT para evitar silos de datos o doble carga manual entre sistemas (HRIS, nómina, mensajería).",
  "discovery.objections.integracionesAPI.response1":
    "Contamos con APIs documentadas para integrar con HRIS, nómina y otros sistemas. ¿Con qué sistemas necesitarían integrar hoy?",
  "discovery.objections.integracionesAPI.closing":
    "¿Su equipo de IT ya tiene mapeados los sistemas con los que esto debería conectarse?",
} as const;

export type MessageKey = keyof typeof es;

const en: Record<MessageKey, string> = {
  // ── ui/ primitives ──────────────────────────────────────────────────────
  "ui.spinner.loading": "Loading…",
  "ui.overlay.close": "Close",
  "ui.status.validated.word": "validated",
  "ui.status.validated.desc": "Verified against a source with a URL.",
  "ui.status.inferred.word": "inferred",
  "ui.status.inferred.desc":
    "Estimated from benchmarks or signals, with no direct source.",
  "ui.status.cold.word": "no data",
  "ui.status.cold.desc": "We couldn't find this — it's flagged to validate.",
  "ui.errorBoundary.title": "Something went wrong",
  "ui.errorBoundary.body":
    "An unexpected error occurred. Reload the page to start over.",
  "ui.errorBoundary.reload": "Reload",
  "ui.provenance.legendTitle": "Provenance",
  "ui.sourceLink.open": "Open source",
  "ui.provenanceBadge.confidence": "confidence {pct}%",

  // ── i18n / language ───────────────────────────────────────────────────────
  "i18n.lang.es": "Spanish",
  "i18n.lang.en": "English",
  "i18n.staleNotice": "This content is still in {lang} — regenerate to translate it.",

  // ── common (reused across features) ───────────────────────────────────────
  "common.empCount": "{count} emp.",
  "common.desklessPct": "{pct}% deskless",
  "nav.backToStart": "Back to start",

  // ── landing / search flow ─────────────────────────────────────────────────
  "search.errorTitle": "Search couldn't be completed",
  "search.errorFallback": "Search error.",
  "search.analyzing": "Analyzing deal",
  "search.complete": "Analysis complete",
  "search.completeDetail":
    "{company} · {count} fields verified, each with its source and confidence level.",
  "search.provenanceNote":
    "Every datum is stored with its source and confidence level. We never make things up.",
  "landing.heading": "Analyze your next deal",
  "landing.subhead":
    "We look up the lead in HubSpot by email to enrich the analysis.",
  "landing.emailLabel": "Lead email",
  "landing.emailPlaceholder": "name@company.com",
  "landing.searchButton": "Search →",
  "landing.examples": "Examples:",
  "landing.searchingLeads": "Searching leads…",
  "landing.searchingLeadsHub": "Searching leads in HubSpot…",
  "landing.leadErrorTitle": "Couldn't search for the lead",
  "landing.noMatchTitle": "No matches",
  "landing.noMatchBody":
    "We couldn't find any lead for that email. Check the email or add the lead in HubSpot before continuing.",
  "landing.dealsFoundTitle": "Deals found",
  "landing.dealsFoundSub": "Pick the right deal to start the analysis.",
  "landing.recentTitle": "Recent analyses",
  "landing.recentCount": "{count} active deals",
  "landing.scoreLabel": "score",
  "landing.contactFallback": "Contact",
  "landing.noContact": "No contact",
  "landing.dealUnnamed": "Unnamed deal",
  "landing.noDeals": "No associated deals — continue without a deal",
  "landing.pickDeal": "Pick a deal",

  // ── deal header + analysis panel + copilot ────────────────────────────────
  "nav.newAnalysis": "New analysis",
  "dealHeader.stage": "HubSpot stage",
  "dealHeader.amount": "Amount",
  "panel.tab.company": "Company",
  "panel.tab.pains": "Pains",
  "panel.tab.cases": "Success cases",
  "panel.tab.signals": "Signals",
  "panel.tab.brief": "Pre-call brief",
  "panel.tab.briefShort": "Brief",
  "panel.section.context": "Context",
  "panel.section.stakeholders": "Stakeholders",
  "panel.sub.company": "Deal context and stakeholders.",
  "panel.sub.cases": "Similar customers already using Humand.",
  "panel.sub.signals":
    "Recent company signals — leadership, expansion, funding.",
  "panel.sub.brief":
    "Value hypotheses to prep the discovery call — internal use.",
  "panel.coldStart.title": "Cold start.",
  "panel.coldStart.body":
    "All inferred, low confidence. We don't fabricate data — we flag what to validate.",
  "panel.keyMetrics": "Key metrics",
  "panel.metric.region": "Region",
  "panel.metric.industry": "Industry",
  "panel.metric.workforce": "Workforce",
  "panel.metric.integratedSystems": "Integrated systems",
  "panel.metric.integratedSystemsTooltip":
    "Third-party systems Humand has integrated with in this account",
  "panel.metric.headcount": "Headcount",
  "panel.metric.headcountValue": "{count} employees",
  "panel.metric.headcountConflict": "Headcount · conflict",
  "panel.metric.resolveHeadcount": "resolve → 485",
  "panel.techStack": "Tech stack ({count})",
  "panel.techKind.desplazar": "displace",
  "panel.techKind.integrar": "integrate",
  "panel.techKind.coexistir": "coexist",
  "panel.sourceFallback": "source",
  "panel.openSourceWith": "Open source · {source}",
  "copilot.analysisTitle": "Deal analysis",
  "copilot.analysisSub": "Context, stakeholders, and market signals.",
  "copilot.resourcesTitle": "Resources for the call",
  "copilot.resourcesSub": "Sales materials and discovery guide.",
  "copilot.materialsTitle": "Sales materials",
  "copilot.materialsSub":
    "Tailored to this deal. Review and download before the meeting.",

  // ── blocks: stakeholders / pains / comps ──────────────────────────────────
  "common.validate": "validate",
  "common.validated": "validated",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.add": "＋ add",
  "common.edit": "edit",
  "stakeholders.namePlaceholder": "Name",
  "stakeholders.titlePlaceholder": "Title",
  "stakeholders.roleLabel": "Role",
  "stakeholders.emptyTitle": "No stakeholders yet",
  "stakeholders.emptyHint":
    "Research found no verifiable decision-makers for this deal. Add one manually or retry enrichment.",
  "stakeholders.addStakeholder": "＋ add stakeholder",
  "stakeholders.openSourceOf": "Open {name}'s source",
  "stakeholders.sourceFirmografia": "Firmographics",
  "comps.painsOne": "{count} pain",
  "comps.painsMany": "{count} pains",
  "comps.modulesOne": "{count} module",
  "comps.modulesMany": "{count} modules",
  "comps.collaborators": "{count} employees",
  "comps.modulesImplemented": "Humand modules implemented",
  "comps.afterImplementing": "After implementing Humand",
  "comps.viewCase": "View case study",
  "comps.viewVideo": "Watch video",
  "comps.emptyTitle": "No cases for this industry",
  "comps.emptyBody": "Humand doesn't have a published case for this sector yet.",

  // ── blocks: signals ───────────────────────────────────────────────────────
  "common.retry": "Retry",
  "common.unknownError": "Unknown error",
  "signals.scan.leadership": "Searching leadership changes…",
  "signals.scan.maFunding": "Searching M&A and funding…",
  "signals.scan.expansion": "Searching expansions and new openings…",
  "signals.scan.culture": "Searching culture programs and GPTW…",
  "signals.scan.restructuring": "Searching restructurings and conflicts…",
  "signals.scan.stack": "Verifying tech stack…",
  "signals.type.new_people_leader": "New HR leader",
  "signals.type.m_and_a": "M&A",
  "signals.type.funding": "Funding",
  "signals.type.hiring_surge": "Hiring surge",
  "signals.type.expansion": "Expansion",
  "signals.type.hr_digital_transformation": "HR digital transf.",
  "signals.type.culture_program": "Culture",
  "signals.type.gptw": "GPTW",
  "signals.type.restructuring": "Restructuring",
  "signals.type.labor_conflict": "Labor conflict",
  "signals.type.esg_dei": "ESG / DEI",
  "signals.type.compliance_training": "Compliance",
  "signals.type.turnover": "Turnover",
  "signals.type.stack": "Tech stack",
  "signals.verified": "verified",
  "signals.idleTitle": "Market signals",
  "signals.idleBody":
    "Spot what's happening at the company now — leadership changes, funding, expansions, and more.",
  "signals.research": "Research signals",
  "signals.researching": "Researching…",
  "signals.errorTitle": "Research failed",
  "signals.emptyTitle": "No signals in the last 6 months",
  "signals.emptyBody":
    "We found no recent, verifiable events for this company. More may be available in other languages or sources.",
  "signals.realtime": "Last 6 months · real-time research",
  "signals.reResearch": "Re-research →",

  // ── blocks: pre-call brief ────────────────────────────────────────────────
  "brief.build.profile": "Reading the company profile…",
  "brief.build.comparables": "Cross-referencing comparable sector cases…",
  "brief.build.hypotheses": "Formulating value hypotheses…",
  "brief.build.questions": "Building discovery questions…",
  "brief.caseFallback": "case",
  "brief.proof": "Proof",
  "brief.askToConfirm": "Ask to confirm",
  "brief.confirmsLabel": "Confirms",
  "brief.discardsLabel": "Discard",
  "brief.idleBody":
    "Walk into the call prepared: 2-3 prioritized value hypotheses, with proof from comparable cases and questions to validate them.",
  "brief.buildAction": "Build pre-call brief",
  "brief.building": "Building brief…",
  "brief.errorTitle": "Couldn't build the brief",
  "brief.prioritized": "{count} prioritized hypotheses · to validate on the call",
  "brief.internalUse": "● internal use · not sent to the client",
  "brief.contextToCover": "Context to cover in discovery",
  "brief.footer":
    "Generated from the company profile + comparable cases in the same sector. The hypotheses are inferences to validate on the call, not confirmed facts.",
  "brief.rebuild": "Rebuild brief →",

  // ── materials (panel chrome — generated content lives server-side) ─────────
  "materials.generating": "Generating materials…",
  "materials.personalizing": "Tailoring to this deal",
  "materials.errorTitle": "Couldn't generate the materials",
  "materials.errorFallback": "Check your connection and try again.",
  "materials.empty": "Materials will appear here in seconds.",
  "materials.viewMaterial": "View material",
  "materials.downloadLoading": "Generating…",
  "materials.downloadPptx": "↓ Download .pptx",
  "materials.downloadError": "Couldn't generate the presentation",
  "materials.pricingHidden": "Pricing hidden. Enable the toggle.",
  "materials.pricingConfirmed": "USD {mrr}/mo · confirmed ✓",
  "materials.pricingEstimateBold": "Possibly MRR ≈ USD {mrr}/mo",
  "materials.pricingEstimateBefore": "— estimated. Inherits the",
  "materials.pricingEstimateAfter": "until confirmed.",
  "materials.presentationTitle": "Presentation - {client}",
  "materials.configurePresentation": "Configure presentation",
  "materials.title.pres": "Presentation",
  "materials.title.pre": "Pre-meeting email",
  "materials.title.post": "Post-meeting recap",
  "materials.sub.pres": "client-facing · gated",
  "materials.sub.pre": "comms · before the call",
  "materials.sub.post": "comms · triggers re-analysis",
  "deck.users": "Users",
  "deck.mrr": "MRR",
  "deck.mrrDesc": "MRR disc.",
  "deck.client": "Client",
  "deck.date": "Date",
  "deck.logo": "Logo",
  "deck.logoPlaceholder": "url or image.png (optional)",
  "deck.planMain": "Main plan",
  "deck.planA": "Plan A",
  "deck.planB": "Plan B",

  // ── auth ─────────────────────────────────────────────────────────────────────
  "auth.signOut": "Sign out",
  "auth.login.heading": "Sign in to DealCraft",
  "auth.login.subhead": "Use your Humand Google account to continue.",
  "auth.login.googleButton": "Continue with Google",
  "auth.error.title": "Something went wrong",
  "auth.error.missing_params": "Session expired or the callback URL was incomplete. Try signing in again.",
  "auth.error.auth_failed": "We couldn't validate your identity with Google. Please try again.",
  "auth.error.session_expired": "Your session expired. Sign in again to continue.",
  "auth.error.fallback": "We couldn't complete sign-in. Please try again.",
  "auth.error.retry": "Try again",
  "auth.error.goToHumand": "Go to Humand",

  // ── search steps + taxonomy display (keys stay Spanish for matching) ───────
  "search.steps.resolving": "Resolving entity…",
  "search.steps.enriching": "Enriching firmographics…",
  "search.steps.deskless": "Estimating % deskless…",
  "search.steps.hubspot": "Querying HubSpot…",
  "search.steps.signals": "Searching for signals…",
  "search.steps.provenance": "Compiling provenance…",
  "taxonomy.comunicacionInterna": "Internal communication",
  "taxonomy.onboarding": "Onboarding / Training",
  "taxonomy.clima": "Climate / Engagement",
  "taxonomy.autogestion": "Self-service / Documents",
  "taxonomy.reconocimiento": "Recognition",
  "taxonomy.seguridad": "Safety / Compliance",
  "taxonomy.beneficios": "Benefits",

  // ── discovery tab ───────────────────────────────────────────────────────
  "discovery.header.title": "Discovery",
  "discovery.header.badge": "15 min",
  "discovery.header.sub": "Questions and objections for this stage.",
  "discovery.subtab.trigger": "Trigger questions",
  "discovery.subtab.byRole": "By role",
  "discovery.subtab.objections": "Objections",
  "discovery.pill.context": "Context",
  "discovery.pill.painPriority": "Pain & priority",
  "discovery.objections.verTodas": "See all",
  "discovery.objections.starredBadge": "⭐ Frequent",
  "discovery.objections.whatItMeansLabel": "What it means",
  "discovery.objections.respondWithLabel": "Respond with",

  "discovery.trigger.discovery":
    "How do you communicate important changes today — policies, benefits, news — to all employees?",
  "discovery.trigger.hr":
    "Which HR processes are still manual or handled over email? Vacation requests, onboarding, other requests...",
  "discovery.trigger.tech":
    "What tools do you currently use for people management? Just the payroll system, or something more?",
  "discovery.trigger.pain":
    "If you could solve just one problem for your HR team this year, which would you pick?",
  "discovery.trigger.decision":
    "Who else should be part of this conversation? Does the CEO / COO also weigh in on this kind of decision?",

  "discovery.role.all": "All",
  "discovery.role.hrLeader.label": "HR Leader",
  "discovery.role.opsLeader.label": "Ops Leader",
  "discovery.role.itLeader.label": "IT Leader",
  "discovery.role.cSuite.label": "C-Suite / Exec",

  "discovery.role.hrLeader.q1":
    "What channels do you use today to get HR policies and updates to everyone?",
  "discovery.role.hrLeader.q2":
    "Which of your team's processes — vacation, onboarding, requests — still run on spreadsheets or email?",
  "discovery.role.hrLeader.q3":
    "How many hours a week does your HR team spend on repetitive employee questions?",
  "discovery.role.opsLeader.q1":
    "How do you make sure an important operational message reaches everyone — especially those outside the office?",
  "discovery.role.opsLeader.q2":
    "What tools do your managers use to coordinate their teams?",
  "discovery.role.opsLeader.q3":
    "Where's the biggest operational bottleneck related to people management?",
  "discovery.role.itLeader.q1": "What HR or payroll systems do you currently have?",
  "discovery.role.itLeader.q2":
    "What are your integration and security requirements for employee experience tools?",
  "discovery.role.itLeader.q3":
    "Do employees have corporate email access, or do they use personal devices?",
  "discovery.role.cSuite.q1":
    "What's the biggest people challenge you want to solve this year?",
  "discovery.role.cSuite.q2":
    "If you could solve just one HR problem this year, what would it be?",
  "discovery.role.cSuite.q3":
    "What's the business impact of your current turnover — do you have a cost estimate?",

  "discovery.objections.sinPresupuesto.quote": "We don't have budget this year",
  "discovery.objections.sinPresupuesto.whatItMeans":
    "They don't see immediate ROI. Competing internal priorities. Perceived lack of urgency.",
  "discovery.objections.sinPresupuesto.response1":
    "How much time or money do you currently lose to manual processes?",
  "discovery.objections.sinPresupuesto.response2":
    "Is this a budget problem, or a priority problem?",
  "discovery.objections.sinPresupuesto.closing":
    "Would it help if we put together a quick estimate of what these manual processes cost you today?",

  "discovery.objections.corporativoDecide.quote": "That's a decision made at corporate",
  "discovery.objections.corporativoDecide.whatItMeans":
    "Regional or global centralization. No local champion.",
  "discovery.objections.corporativoDecide.response1":
    "What criteria does corporate usually require to approve new tools?",
  "discovery.objections.corporativoDecide.closing":
    "Is there someone on your team who could sponsor this internally and take it to corporate?",

  "discovery.objections.yaTienenHR.quote": "We already have an HR tool",
  "discovery.objections.yaTienenHR.whatItMeans":
    "Perceived partial overlap. Resistance to change.",
  "discovery.objections.yaTienenHR.response1":
    "What are you still handling with Excel or WhatsApp?",
  "discovery.objections.yaTienenHR.closing":
    "Would you like to see how Humand integrates with what you already have, without migrating everything at once?",

  "discovery.objections.noUsanCelular.quote": "Our employees can't use their phones",
  "discovery.objections.noUsanCelular.whatItMeans":
    "Frontline staff in plants, stores, or the field with mobile device restrictions.",
  "discovery.objections.noUsanCelular.response1":
    "How do you communicate notices or policies to this staff today?",
  "discovery.objections.noUsanCelular.response2":
    "What happens when someone says they never heard about an important change?",
  "discovery.objections.noUsanCelular.closing":
    "What other channels do you have on-site today — kiosks, tablets, screens — to reach that staff?",

  "discovery.objections.whatsappAlcanza.quote": "WhatsApp works fine for us",
  "discovery.objections.whatsappAlcanza.whatItMeans":
    "Informality, lack of visibility and internal traceability.",
  "discovery.objections.whatsappAlcanza.response1":
    "What happens when someone says they never saw the message?",
  "discovery.objections.whatsappAlcanza.response2":
    "How do you audit internal communication today?",
  "discovery.objections.whatsappAlcanza.closing":
    "Would you like to start with a small pilot to compare traceability against what you have today with WhatsApp?",

  "discovery.objections.cambiarSistemasComplejo.quote": "Switching systems is too complex",
  "discovery.objections.cambiarSistemasComplejo.whatItMeans":
    "An overloaded HR team. Fear of a failed rollout.",
  "discovery.objections.cambiarSistemasComplejo.response1":
    "Which process takes up the most of your time today?",
  "discovery.objections.cambiarSistemasComplejo.response2":
    "What if you only automated that one?",
  "discovery.objections.cambiarSistemasComplejo.closing":
    "Which process would you want to automate first to see a quick win?",

  "discovery.objections.sinTiempoImplementar.quote": "We don't have time to implement anything",
  "discovery.objections.sinTiempoImplementar.whatItMeans":
    "Small team, constantly reactive operations.",
  "discovery.objections.sinTiempoImplementar.response1":
    "What repetitive task would you make disappear tomorrow if you could?",
  "discovery.objections.sinTiempoImplementar.closing":
    "What repetitive task would you want gone from month one?",

  "discovery.objections.noPuedenMoverNomina.quote": "We can't touch payroll",
  "discovery.objections.noPuedenMoverNomina.whatItMeans":
    "Perceived legal risk. Dependence on a local provider.",
  "discovery.objections.noPuedenMoverNomina.response1":
    "That's fine — Humand doesn't replace payroll, it integrates with your current system.",
  "discovery.objections.noPuedenMoverNomina.closing":
    "What payroll system do you use today, so we can confirm how it would integrate?",

  "discovery.objections.seVeGrande.quote": "Humand looks too big for us",
  "discovery.objections.seVeGrande.whatItMeans":
    "Fear of overpaying. Low internal digital maturity.",
  "discovery.objections.seVeGrande.response1": "Which process is the most painful for you today?",
  "discovery.objections.seVeGrande.response2": "What if you started with just that one?",
  "discovery.objections.seVeGrande.closing":
    "Which module would you want to start with if we kept it small?",

  "discovery.objections.yaTienenSAP.quote": "We already have SAP in place",
  "discovery.objections.yaTienenSAP.whatItMeans":
    "SAP covers the corporate side. Plant and frontline staff are left without real coverage.",
  "discovery.objections.yaTienenSAP.response1":
    "SAP manages data. How do you communicate changes to plant workers?",
  "discovery.objections.yaTienenSAP.closing":
    "How do you communicate changes today to the workers who don't have SAP access?",

  "discovery.objections.seguridadDatos.quote":
    "How do you guarantee the security of our data?",
  "discovery.objections.seguridadDatos.whatItMeans":
    "IT/legal concern about compliance and exposure of sensitive HR data; sometimes a formal approval requirement before evaluating any new tool.",
  "discovery.objections.seguridadDatos.response1":
    "We have encryption in transit and at rest, access controls, and current certifications — what requirements does your IT or security team ask for today?",
  "discovery.objections.seguridadDatos.response2":
    "Have you evaluated the security of another HR tech vendor? What did they ask you for in that process?",
  "discovery.objections.seguridadDatos.closing":
    "Who from your IT or security team should join the conversation to work through this in parallel?",

  "discovery.objections.slaSoporte.quote": "What support SLA do you offer?",
  "discovery.objections.slaSoporte.whatItMeans":
    "Fear of being left without a fast resolution during an operational incident — more critical if they have frontline staff who depend on the platform for daily communication.",
  "discovery.objections.slaSoporte.response1":
    "We have SLAs tiered by severity, with guaranteed response times. Today, with your current provider, how long does it take to resolve an urgent incident?",
  "discovery.objections.slaSoporte.closing":
    "What happened the last time you had an urgent issue with a similar tool?",

  "discovery.objections.guiaImplementacion.quote":
    "What does the implementation process look like? We need to be guided step by step.",
  "discovery.objections.guiaImplementacion.whatItMeans":
    "Lack of confidence in their internal ability to execute the change, or a bad past experience with an unsupported rollout.",
  "discovery.objections.guiaImplementacion.response1":
    "Implementation is guided by our Customer Success team from day one, with quick wins from the first month.",
  "discovery.objections.guiaImplementacion.response2":
    "What was the hardest part of your last new-tool implementation?",
  "discovery.objections.guiaImplementacion.closing":
    "Who would be the internal project owner during implementation?",

  "discovery.objections.integracionesAPI.quote":
    "We need it to integrate with our current systems via API.",
  "discovery.objections.integracionesAPI.whatItMeans":
    "A technical IT requirement to avoid data silos or duplicate manual entry across systems (HRIS, payroll, messaging).",
  "discovery.objections.integracionesAPI.response1":
    "We have documented APIs to integrate with HRIS, payroll, and other systems. Which systems would you need to integrate with today?",
  "discovery.objections.integracionesAPI.closing":
    "Has your IT team already mapped out which systems this should connect to?",
};

export const messages: Record<Language, Record<MessageKey, string>> = { es, en };

export type TParams = Record<string, string | number>;

/** Pure message lookup with `{token}` interpolation. */
export function translate(
  lang: Language,
  key: MessageKey,
  params?: TParams,
): string {
  const template = messages[lang][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
