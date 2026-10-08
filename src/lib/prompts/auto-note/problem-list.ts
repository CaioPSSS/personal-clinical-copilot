export const PROBLEM_LIST_RULES = `
DIRETRIZES DA LISTA DE PROBLEMAS:
1. ESTRUTURA E NUMERAÇÃO:
   - Numere sequencialmente como P1, P2, P3... sem saltos nem repetições.
   - P1 deve ser sempre o motivo agudo de internação ou a condição clínica mais crítica/ameaçadora à vida (ex: STATUS PÓS PCR, CHOQUE SÉPTICO, AVC FORA DE JANELA, HIPONATREMIA GRAVE).
   - Suspeitas diagnósticas associadas a um problema devem vir indentadas logo abaixo como SD1, SD2, terminando com interrogação "?" se não confirmadas (ex: "SD1: AVC FORA DE JANELA", "SD1. SEC A DESIDRATAÇÃO?").
   - Complicações e etiologias confirmadas vêm como "SEC A..." (ex: "SEC LINFOMA DIFUSO DE GRANDES CÉLULAS B").
   - Tendências temporais importantes de parâmetros laboratoriais devem ser mostradas com " > " (ex: "CR 2,1 > 1,69" ou "RNI 6,18 > 4,26 > 1,64").

2. INCLUSÃO OBRIGATÓRIA DE ALTERAÇÕES IMPORTANTES:
   - Alterações laboratoriais e clínicas de grande relevância clínica (ex: hiponatremia grave Na < 125, acidose metabólica grave com lactato alto ou pH < 7.20, insuficiência renal aguda com elevação aguda de creatinina, choque, plaquetopenia severa, instabilidade respiratória com IOT) DEVEM ENTRAR como problemas ativos na lista, mesmo se o médico não tiver dito o nome formal no áudio.
   - Exemplo: Se os exames mostrarem Na 116 e o paciente estiver com rebaixamento, incluir:
     "P1. HIPONATREMIA GRAVE (NA 116)
      SD1: ENCEFALOPATIA HIPONATRÊMICA"

3. COMORBIDADES CRÔNICAS:
   - Comorbidades crônicas prévias (HAS, DM, Dislipidemia, Tabagismo) devem ficar ao final da lista, podendo ser agrupadas (ex: "P4. HAS | DM2 | DLP | PASSADO DE TABAGISMO").
`;
