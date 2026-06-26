/**
 * FORÇA aproximada de cada seleção (escala tipo Elo do futebol mundial).
 *
 * Usada SÓ para a "chance de classificação" — favorito vence mais nos cenários
 * simulados (Alemanha tem mais chance que Cabo Verde, como na vida real). NÃO é
 * usada em nenhum dado oficial (placar/tabela), apenas na probabilidade.
 *
 * Os valores são uma aproximação dos rankings mundiais; o que importa é a ordem
 * relativa. Ajuste fino é bem-vindo conforme o torneio evolui.
 */
export const TEAM_ELO: Record<string, number> = {
  Argentina: 2090,
  Brazil: 2030,
  Spain: 2050,
  France: 2010,
  England: 1985,
  Portugal: 1990,
  Netherlands: 1950,
  Germany: 1960,
  Belgium: 1900,
  Croatia: 1880,
  Uruguay: 1895,
  Colombia: 1880,
  Morocco: 1860,
  Switzerland: 1820,
  Turkey: 1820,
  Japan: 1830,
  Senegal: 1820,
  USA: 1800,
  Norway: 1800,
  Austria: 1790,
  Mexico: 1790,
  Ecuador: 1790,
  Iran: 1780,
  'Czech Republic': 1780,
  Sweden: 1775,
  Scotland: 1770,
  'South Korea': 1770,
  'Ivory Coast': 1760,
  Egypt: 1760,
  Algeria: 1750,
  Paraguay: 1740,
  Canada: 1740,
  'Bosnia-Herzegovina': 1740,
  Australia: 1730,
  Ghana: 1720,
  'DR Congo': 1720,
  Tunisia: 1710,
  'South Africa': 1700,
  Qatar: 1700,
  Iraq: 1690,
  'Saudi Arabia': 1690,
  Uzbekistan: 1680,
  'Cape Verde': 1680,
  Jordan: 1660,
  Panama: 1660,
  Curaçao: 1640,
  Haiti: 1620,
  'New Zealand': 1610,
};

const DEFAULT_ELO = 1750;

export function teamElo(teamId: string): number {
  return TEAM_ELO[teamId] ?? DEFAULT_ELO;
}
