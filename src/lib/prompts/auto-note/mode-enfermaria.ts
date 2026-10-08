export const WARD_MODE_INSTRUCTIONS = `
MODO DE PRONTUÁRIO: ENFERMARIA DE CLÍNICA MÉDICA / INTERNAÇÃO

DIRETRIZES FUNDAMENTAIS DE ESTILO:
1. CAIXA NORMAL: Escreva em linguagem médica culta, frases completas e boa pontuação (letras maiúsculas e minúsculas naturais).
2. FLUIDEZ CLÍNICA: A evolução diária é redigida em parágrafo corrido e coeso, detalhando o estado do paciente, sono, dieta, queixas e diurese/dejeções.
3. EXAMES LABORATORIAIS E GASOMETRIAS: SEMPRE ordenados do MAIS RECENTE para o MAIS ANTIGO.

ESTRUTURA PARA EVOLUÇÃO DIÁRIA DE ENFERMARIA:

#Lista de Problemas:
- [Problema agudo principal / Suspeitas diagnósticas]
- [Disfunções orgânicas ou alterações laboratoriais importantes com tendência temporal]
- [Comorbidades crônicas]

#Evolução:
[Parágrafo corrido e detalhado abrangendo: leito/enfermaria, nível de consciência e orientação, padrão ventilatório e suporte de oxigênio em ar ambiente ou cateter, curva térmica e antibioticoterapia em uso (com DI), estabilidade hemodinâmica e pressão arterial, aceitação de dieta via oral ou sonda, aspecto e débito de diurese e dejeções, ciclo sono-vigília e deambulação.]

> HGT:
(DD/MM): valor (HH) // valor (HH)...
(Listar por dia, mais recente primeiro)

#Dispositivos/Antimicrobianos em Uso:
[Tabela ou lista com Nome da Droga/Dispositivo, Data de Início e se está "em uso" ou data de término]

#Sinais Vitais (24h):
PAS min–máx mmHg | PAD min–máx mmHg | FC min–máx bpm | FR min–máx ipm | TAX min–máx °C | DEJ: ... | DIURESE: ...

#Exame Físico:
Geral: [Estado geral, fácies, hidratação, mucosas, acianótico, anictérico]
Cabeça e pescoço: [Orofaringe, jugulares, gânglios, traqueia]
Pele e fâneros: [Lesões, úlceras, turgor]
Tórax respiratório: [Expansibilidade, FTV, murmúrio vesicular e ruídos adventícios]
Cardiovascular: [Ictus, bulhas, ritmo, sopros, pulso]
Abdome: [Inspeção, RHA, palpação superficial e profunda, dor, visceromegalias, sinais peritoneais]
Osteoarticular: [Articulações, mobilidade, dor]
Extremidades: [Perfusão, pulsos periféricos, edema, TEC]
Neurológico: [Vigil, Glasgow, déficits focais, sensibilidade e motricidade, sinais meníngeos]

#Exames Complementares:
#INTERNOS
EAS DD/MM: ...
LAB (DD/MM/AA): HB | HT | VCM | LEUCO | PLAQ | UR | CR | NA | K | ...
(Listar exames internos do mais recente para o mais antigo)

#EXAMES EXTERNOS
>> LABORATÓRIO (Exames de UPAs ou outros hospitais com datas)
>> OUTROS (ECG, Tomografias, Raio-X com datas)

#Plano Terapêutico:
Vigilância infecciosa: [Antimicrobianos, rastreio, provas inflamatórias]
Vigilância renal/metabólica: [Ajuste de doses, reposições, hidratação]
Para comorbidades (ex: DM, HAS): [Esquema de insulina basal-bolus, anti-hipertensivos]
Outros: [Profilaxia TEV, profilaxia LAMG, orientações e ciência do paciente/familiares]
`;
