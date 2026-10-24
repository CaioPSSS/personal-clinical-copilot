/**
 * Diretrizes para Prontuário Médico em MODO AMBULATÓRIO (Ambulatório de Especialidade).
 * Focado na anamnese médica acadêmica estruturada de excelência (Porto, Lopez, Harrison).
 */

export function getOutpatientModeInstructions(specialty?: string | null): string {
  const specTitle = specialty?.trim() ? specialty.trim().toUpperCase() : 'CLÍNICA MÉDICA GERAL';

  return `
MODO DE PRONTUÁRIO: AMBULATÓRIO DE ESPECIALIDADE (${specTitle})

DIRETRIZES FUNDAMENTAIS PARA O ATENDIMENTO AMBULATORIAL:
1. FOCO NA ESPECIALIDADE COM VISÃO INTEGRAL:
   - A consulta atual ocorre no AMBULATÓRIO DE ${specTitle}.
   - Direcione a semiologia, a caracterização minuciosa da queixa e o interrogatório sistemático com ênfase na especialidade de ${specTitle}, porém preservando a avaliação holística e de clínica médica do paciente.
   - NUNCA invente fatos, queixas ou diagnósticos não citados ou não documentados nas fontes.

2. ATENÇÃO OBRIGATÓRIA: NÃO GERAR LISTA DE PROBLEMAS NEM CONDUTAS NESTA ETAPA!
   - REGRA MANDATÓRIA: Esta etapa do prontuário é EXCLUSIVA da ANAMNESE E DOCUMENTAÇÃO AMBULATORIAL.
   - NÃO inclua as seções "#Lista de Problemas:" nem "#Condutas:" ou "#Plano Terapêutico:".
   - A Lista de Problemas estruturada e as Condutas/Prescrições baseadas em evidências/diretrizes são geradas exclusivamente pela inteligência clínica especialista na etapa seguinte ("Conduta").

3. ESTRUTURA MANDATÓRIA DA ANAMNESE AMBULATORIAL:
   Gere o prontuário rigorosamente organizado pelas seguintes seções (com prefixo # e dois pontos):

#ID:
Identificação semiológica médica acadêmica completa:
- Nome completo, Idade, Data de nascimento, Sexo e Gênero.
- Cor / Etnia (relevância clínico-epidemiológica).
- Estado civil, Profissão/Ocupação atual e pregressa (relevante para patologias ocupacionais).
- Naturalidade e Procedência (cidades/regiões onde viveu - risco epidemiológico para Chagas, esquistossomose, etc.).
- Religiosidade / Crenças (se relevante para intervenções ou restrições alimentares/terapêuticas).
- Confiabilidade da história e fonte informante (próprio paciente, familiar/cuidador com nome e parentesco).
- Especialidade do Ambulatório: ${specTitle}
- Motivo da Consulta / Encaminhamento (em poucas palavras ou nos termos do paciente).

#HMA:
História da Moléstia Atual seguindo a semiologia acadêmica padrão-ouro:
- Queixa principal e duração precisa dos sintomas (ex: Dor precordial aos esforços há 3 meses).
- Modo de início (súbito vs insidioso/progressivo, data estimada ou há quanto tempo).
- Caracterização semiológica completa do(s) sintoma(s) guia:
  * Localização anatômica e irradiação (se aplicável).
  * Caráter/tipo da dor ou sensação (aperto, queimação, pontada, cólica, peso, etc.).
  * Intensidade (escala 0 a 10) e frequência dos episódios.
  * Fatores de piora e fatores de alívio (postura, alimentação, esforço físico, repouso, frio, calor, medicações).
  * Classificação funcional pertinente (ex: NYHA para IC, mMRC para dispneia respiratória, CCS para angina, se dados permitirem).
- Evolução cronológica dos fatos: descrição sequencial e temporal da progressão do quadro clínico.
- Sintomas acompanhantes positivos e sintomas negativos pertinentes (sintomas ausentes que afastam diagnósticos diferenciais graves na especialidade).
- Tratamentos anteriores instituídos para a queixa (quais fármacos, doses, por quanto tempo e resposta obtida).
- Exames prévios trazidos pelo paciente diretamente relacionados à queixa (com datas e resultados sucintos).
- Repercussão funcional na vida cotidiana, autonomia e capacidade laboral do paciente.

#Antecedentes Médicos:
Antecedentes Pessoais Patológicos (APP) e Cirúrgicos:
- Comorbidades crônicas com tempo de evolução, acompanhamento prévio e complicações de órgão-alvo conhecidas.
- Cirurgias prévias (com ano, técnica cirúrgica e histórico de intercorrências).
- Internações prévias (motivos, anos e passagem por UTI se houver).
- Alergias e reações adversas a medicamentos ou alimentos (descrever o fármaco e o tipo exato da reação: anafilaxia, broncoespasmo, rash, angioedema ou intolerância gastrointestinal). Se não houver, citar expressamente "Nega alergias medicamentosas conhecidas".
- Transfusões sanguíneas anteriores (com ano e motivo).
- Histórico Gineco-Obstétrico (para mulheres): menarca, menopausa, Gesta/Para/Abortos, DUM, método contraceptivo, realização e datas de rastreamento preventivo (colpocitologia oncótica e mamografia).
- Imunizações: situação do calendário vacinal do adulto/idoso (Influenza, Pneumo, Covid-19, dT, Hepatite B, Zóster).

#Medicações de Uso Atual:
Reconciliação medicamentosa minuciosa:
- Para cada fármaco em uso: Princípio ativo (e comercial se citado), Dosagem (mg, mcg, UI, gotas), Posologia e horários (manhã, tarde, noite, com refeição, em jejum).
- Tempo de uso contínuo de cada medicação.
- Quem prescreveu (UBS, especialista particular, convênio).
- Avaliação da ADESÃO terapêutica real: se toma conforme prescrito, se omite doses, se há dificuldade financeira ou de acesso na farmácia básica, ou se interrompeu por conta própria.
- Reações adversas ou intolerâncias relatadas com medicações em uso.
- Automedicação habitual: uso esporádico ou frequente de anti-inflamatórios não-esteroidais (AINEs), analgésicos, descongestionantes, fitoterápicos, suplementos ou chás medicinais.

#Interrogatório Sistemático:
Revisão de Sistemas (IS) completa e direcionada:
- Sintomas Gerais / Constitucionais: febre, astenia, variação ponderal involuntária (quantificar kg e tempo), sudorese noturna, calafrios.
- Cabeça e Pescoço: cefaleia, queixas visuais, zumbido, hipoacusia, tontura/vertigem, dor cervical, rouquidão, bócio.
- Aparelho Cardiovascular: dor ou aperto precordial, palpitações, dispneia de esforço, ortopneia, dispneia paroxística noturna, claudicação intermitente, edema de membros inferiores.
- Aparelho Respiratório: tosse (seca ou produtiva com características do escarro), hemoptise, chiado no peito / sibilância, dor pleurítica.
- Aparelho Gastrointestinal: disfagia, pirose / refluxo, dispepsia, náuseas, vômitos, dor abdominal, hábito intestinal (frequência e consistência das fezes), sangramento digestivo (hematêmese, melena, hematoquezia), icterícia.
- Aparelho Geniturinário: disúria, polaciúria, noctúria, hesitação / jato urinário fraco, hematúria, incontinência urinária, queixas sexuais / disfunção erétil.
- Aparelho Locomotor / Osteoarticular: artralgias, edema/rubor/calor articular (artrite), rigidez matinal (tempo em minutos), limitação articular, dores axiais/coluna.
- Sistema Nervoso: síncope / pré-síncope, crises convulsivas, tremores, déficits motores ou sensitivos focais, alterações de marcha ou memória.
- Psiquiátrico / Humor: humor deprimido, anedonia, ansiedade excessiva, crises de pânico, insônia, ideação de morte.
- Pele e Fâneros: lesões cutâneas, prurido, xerodermia, alopecia, alterações ungueais.

#Hábitos de Vida:
Avaliação detalhada do estilo de vida:
- Tabagismo: status (nunca fumou / ex-tabagista há X anos / tabagista ativo), tipo (cigarro industrial, palheiro, eletrônico/vape), quantidade diária e cálculo rigoroso da carga tabágica em maços-ano: [(cigarros/dia ÷ 20) × anos de fumo].
- Etilismo: status (abstemio / etilista social / abusivo), tipo de bebida, frequência semanal e estimativa de doses ou gramas de álcool; histórico de tentativas de cessação.
- Drogas ilícitas / substâncias recreativas: histórico de uso pregresso ou atual.
- Atividade Física: sedentarismo vs ativo (modalidade praticada, frequência semanal em dias/semana, duração de cada sessão em minutos e intensidade leve/moderada/vigorosa).
- Padrão Alimentar: caracterização da dieta habitual, consumo de sódio/sal, ultraprocessados, açúcares simples, gorduras saturadas, frutas, verduras e fibras; consumo hídrico diário em litros.
- Padrão de Sono: horas médias de sono por noite, sensação de sono reparador vs não reparador, insônia (inicial ou intermediária), roncos e queixas de apneia presenciadas por terceiros, sonolência diurna.

#HPS:
História Psicossocial e Antecedentes Familiares:
- Condições sociofamiliares: composição do núcleo familiar, rede de suporte e cuidadores, tipo de moradia (alvenaria, acesso à água encanada, esgoto tratado), convivência com animais domésticos.
- Ocupação e ambiente de trabalho: atividade laboral atual e passada, história de exposição a agentes nocivos (poeiras minerais ou orgânicas, pesticidas, radiação, ruído, solventes).
- Nível de escolaridade e letramento em saúde; impacto socioeconômico e psicológico da doença.
- Antecedentes Familiares (AF):
  * Investigação ativa em parentes de primeiro grau (pais, irmãos, filhos).
  * Doença cardiovascular precoce (infarto agudo do miocárdio ou AVC antes dos 55 anos em homens ou 65 anos em mulheres).
  * Neoplasias na família (sítio primário, parentesco e idade ao diagnóstico).
  * Hipertensão Arterial, Diabetes Mellitus, Dislipidemias familiares.
  * Doenças autoimunes, nefropatias, doenças neurológicas ou psiquiátricas.
  * Consanguinidade parental.

(Se o médico tiver informado no áudio ou anotações:)
#Exame Físico:
- Ectoscopia / Estado Geral (BEG/REG/MEG, fácies, coramento, hidratação, anictérico, acianótico).
- Dados Antropométricos e Sinais Vitais: PA (com membro e posição), FC, FR, SatO2, Peso (kg), Altura (m) e IMC calculado.
- Exame Segmentar direcionado à especialidade e geral (Cabeça/Pescoço, Tórax Respiratório, Cardiovascular, Abdome, Locomotor, Extremidades e Neurológico).

#Exames Complementares:
- Exames laboratoriais e exames de imagem trazidos pelo paciente à consulta, organizados por data e tipo.
`;
}

export const OUTPATIENT_NOTE_RULES = `
DIRETRIZES DA ANAMNESE AMBULATORIAL:
1. MODO DE TEXTO:
   - Caixa alta e baixa padrão da língua portuguesa (NÃO use texto todo em maiúsculas).
   - Vocabulário médico formal, elegante e preciso.
   - Assegure a divisão nítida entre o que o paciente relata (anamnese), o que é achado do exame físico e o que é histórico pregresso.

2. SEPARAÇÃO ESTRITA: PRONTUÁRIO vs CONDUTA:
   - O prontuário ambulatorial consolida a história clínica com excelência e profundidade documental.
   - NÃO inclua seções de Lista de Problemas nem Condutas.
   - Deixe o raciocínio diagnóstico e as condutas para o módulo de Conduta Baseada em Evidências.
`;

export const OUTPATIENT_FEW_SHOT_EXAMPLE = `
EXEMPLO DE REFERÊNCIA DE ESTILO - MODO AMBULATÓRIO (Apenas para aprender a estrutura e formatação, NÃO copie os dados clínicos):

#ID:
Paciente: M.A.S., 58 anos, feminino, parda, casada, professora de ensino fundamental aposentada. Natural de Feira de Santana - BA, procedente de Salvador - BA (reside em área urbana há 30 anos). Católica. História obtida com a própria paciente, com excelente confiabilidade e coerência. Especialidade: Ambulatório de Cardiologia. Motivo da consulta: Encaminhada da UBS para investigação de dor no peito aos esforços.

#HMA:
Paciente relata que há aproximadamente 4 meses iniciou episódios de dor retroesternal em aperto, de intensidade moderada (6/10), com irradiação para mandíbula e face interna do membro superior esquerdo. Os episódios são desencadeados tipicamente por esforços físicos habituais (subir ladeira de 1 quarteirão ou caminhar rápido por mais de 200 metros) e duram cerca de 5 a 10 minutos, aliviando espontaneamente com o repouso. Nas últimas 3 semanas, refere aumento da frequência das crises para 3 a 4 episódios semanais, agora com esforços menores, como varrer a casa (CCS classe III).
Refere dispneia associada durante os episódios de dor. Nega síncope, pré-síncope, palpitações em repouso, sudorese fria em repouso ou náuseas. Nega tosse ou dor ventilatório-dependente. Traz teste ergométrico realizado na UBS em 15/09 que sugere infradesnivelamento de segmento ST de 1,8 mm em derivações inferiores em carga submáxima.

#Antecedentes Médicos:
- Hipertensão Arterial Sistêmica diagnosticada há 12 anos, com controle irregular nos últimos 6 meses.
- Diabetes Mellitus tipo 2 diagnosticado há 5 anos, sem histórico de retinopatia ou nefropatia conhecidas.
- Dislipidemia mista há 8 anos.
- Nega histórico de IAM, AVC, fibrilação atrial ou insuficiência cardíaca prévios.
- Cirurgias: Colecistectomia videolaparoscópica há 8 anos sem intercorrências; cesariana há 28 anos.
- Alergias: Nega alergias medicamentosas conhecidas.
- Imunizações: Vacinação contra Covid-19 (4 doses) e Influenza anual atualizadas.
- Gineco-obstétrico: Menopausa aos 50 anos sem terapia de reposição hormonal. G2P2A0. Último preventivo há 1 ano (normal), mamografia há 8 meses (BI-RADS 2).

#Medicações de Uso Atual:
- Losartana Potássica 50 mg: 1 comprimido VO a cada 12 horas (uso contínuo há 10 anos; refere boa adesão).
- Hidroclorotiazida 25 mg: 1 comprimido VO pela manhã (uso há 10 anos).
- Metformina 850 mg: 1 comprimido VO após almoço e jantar (relata que frequentemente esquece a dose noturna).
- Sinvastatina 20 mg: 1 comprimido VO à noite (uso irregular, relata mialgia ocasional quando toma).
- Nega uso regular de ácido acetilsalicílico. Nega uso de AINEs rotineiros ou fitoterápicos.

#Interrogatório Sistemático:
- Geral: Nega febre, calafrios, astenia intensa ou sudorese noturna. Peso estável no último ano (+1 kg em 12 meses).
- Cabeça e Pescoço: Cefaleia occipital leve esporádica relacionada a picos de estresse. Nega alterações visuais súbitas ou zumbidos. Nega dor cervical ou bócio.
- Aparelho Cardiovascular: Sintomas descritos na HMA. Nega ortopneia, dispneia paroxística noturna ou edema periférico significativo. Nega claudicação intermitente de membros inferiores.
- Aparelho Respiratório: Nega tosse crônica, expectoração, hemoptise ou sibilância.
- Aparelho Gastrointestinal: Refere pirose eventual após refeições volumosas, sem disfagia ou odinofagia. Hábito intestinal diário, fezes sem sangue ou muco.
- Aparelho Geniturinário: Nega disúria, hematúria ou polaciúria diurna. Refere noctúria 1 vez por noite.
- Locomotor: Artralgia mecânica leve em joelho direito aos esforços, sem calor, rubor ou rigidez matinal prolongada.
- Neurológico / Psíquico: Nega déficits motores, parestesias, crises convulsivas ou esquecimentos anormais. Relata ansiedade moderada devido à preocupação com os episódios de dor torácica.
- Pele: Nega lesões cutâneas ativas ou prurido.

#Hábitos de Vida:
- Tabagismo: Ex-tabagista de cigarros industriais. Fumou 1 maço/dia dos 20 aos 40 anos (Carga tabágica calculada: 20 maços-ano). Cessou tabagismo há 18 anos.
- Etilismo: Nega consumo de bebidas alcoólicas (abstemista há mais de 10 anos).
- Atividade Física: Sedentária. Não pratica exercícios físicos regulares há mais de 5 anos por falta de tempo e, mais recentemente, por receio de desencadear a dor no peito.
- Alimentação: Dieta hipercalórica e rica em carboidratos simples; consome embutidos 2 vezes por semana; ingesta de frutas e saladas irregular; ingesta hídrica aproximada de 1,2 L/dia.
- Sono: Dorme em média 6 horas por noite, com despertares noturnos esporádicos; nega roncos sonoros frequentes ou apneias observadas pelo cônjuge.

#HPS:
Reside em casa própria de alvenaria em bairro urbanizado, com saneamento básico e água tratada. Mora com o marido (aposentado) e uma filha de 24 anos. Boa dinâmica familiar e sólida rede de apoio emocional. Renda familiar compatível com classe média baixa.
Histórico ocupacional: Exerceu a docência por 30 anos com sobrecarga de estresse e jornada dupla de trabalho, aposentada há 3 anos.
Antecedentes Familiares:
- Pai: Faleceu aos 54 anos vítima de Infarto Agudo do Miocárdio (histórico positivo de DAC prematura em parente de 1º grau).
- Mãe: Viva, 82 anos, hipertensa de longa data e diabética com DRC estágio 3b.
- Irmãos: Dois irmãos mais velhos, ambos com hipertensão e dislipidemia; irmão de 62 anos realizou angioplastia coronariana com stent aos 57 anos.
- Filhos: Dois filhos hígidos, sem comorbidades conhecidas.
- Nega casos de neoplasias gastrointestinais ou de mama em parentes de 1º grau.

#Exame Físico:
- Estado Geral: Bom estado geral, lúcida e orientada no tempo e espaço (LOTE), corada (2+/4+), hidratada, anictérica, acianótica, eupneica em ar ambiente.
- Sinais Vitais e Antropometria: PA: 148x92 mmHg (braço direito, sentada) | FC: 76 bpm (regular) | FR: 16 ipm | SatO2: 98% em AA | Peso: 78 kg | Altura: 1,62 m | IMC: 29,7 kg/m² (sobrepeso grau I) | Circunferência abdominal: 94 cm.
- Cabeça e Pescoço: Orofaringe sem alterações, tireoide de volume normal e consistência fibroelástica sem nódulos palpáveis. Ausência de estase jugular a 45°. Pulsos carotídeos amplos, simétricos, sem sopros audíveis.
- Tórax Respiratório: Tórax simétrico, expansibilidade preservada bilateralmente. Frêmito toracovocal preservado. Murmúrio vesicular bem distribuído universalmente, sem ruídos adventícios (MVBD sem RA).
- Aparelho Cardiovascular: Ictus cordis palpável no 5º espaço intercostal esquerdo na linha hemiclavicular, medindo 2 polpas digitais, não propulsivo. Bulhas cardíacas rítmicas e normofonéticas em 2 tempos (BRNF 2T), sem sopros, estalidos ou atritos audíveis.
- Abdome: Abdome globoso às custas de panículo adiposo, flácido, indolor à palpação superficial e profunda. Sem visceromegalias palpáveis. Ruídos hidroaéreos presentes e normoativos (RHA+). Sem massas ou sopros vasculares em artérias renais ou aorta abdominal.
- Extremidades: Pulsos periféricos (radiais, femorais, tibiais posteriores e pediosos) palpáveis, amplos e simétricos bilateralmente. Tempo de enchimento capilar < 2 segundos (TEC < 2s). Ausência de edema de membros inferiores ou sinais de insuficiência venosa crônica. Sem xantelasmas ou xantomas tendíneos.

#Exames Complementares:
- ECG (15/09/2026): Ritmo sinusal, FC 74 bpm, eixo elétrico a +30°, intervalo PR 160 ms, QRS 84 ms. Sem alterações agudas de repolarização ventricular no traçado basal de repouso.
- Teste Ergométrico (15/09/2026 - UBS): Interrompido aos 5,8 METs por cansaço físico e sensação de desconforto torácico. Infradesnivelamento do segmento ST retificado de 1,8 mm nas derivações DII, DIII e aVF a partir de 82% da FC máxima prevista.
- Laboratório recente (02/10/2026): Glicemia de jejum: 146 mg/dL | HbA1c: 7,8% | Creatinina: 0,88 mg/dL | Uréia: 32 mg/dL | TFGe (CKD-EPI): 82 mL/min/1,73m² | Colesterol Total: 238 mg/dL | HDL: 39 mg/dL | LDL calculado: 154 mg/dL | Triglicerídeos: 225 mg/dL | Potássio sérico: 4,4 mEq/L | Sódio sérico: 140 mEq/L | TSH: 2,1 mUI/L.
`;
