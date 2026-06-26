/**
 * Perguntas do QUIZ da Copa — 3 modos (Brasil / Geral / Copa 2026).
 * Fatos conferidos; a precisão importa (mesmo princípio do "zero bug de dados").
 * `answer` é o índice (0-3) da opção correta.
 */
export type QuizMode = 'brasil' | 'geral' | 'copa2026';

export type Question = { q: string; options: string[]; answer: number };

export const QUIZ_MODES: { key: QuizMode; label: string; emoji: string; desc: string }[] = [
  { key: 'brasil', label: 'Brasil', emoji: '🇧🇷', desc: 'A seleção brasileira nas Copas' },
  { key: 'geral', label: 'Geral', emoji: '🌎', desc: 'História das Copas do Mundo' },
  { key: 'copa2026', label: 'Copa 2026', emoji: '🏆', desc: 'A Copa que está rolando agora' },
];

export const QUIZ: Record<QuizMode, Question[]> = {
  brasil: [
    { q: 'Quantos títulos mundiais o Brasil tem?', options: ['4', '5', '6', '3'], answer: 1 },
    { q: 'Em que ano o Brasil conquistou o penta?', options: ['1998', '2002', '2006', '1994'], answer: 1 },
    { q: 'Contra quem o Brasil perdeu a final da Copa de 1950?', options: ['Itália', 'Uruguai', 'Argentina', 'Suécia'], answer: 1 },
    { q: 'Quem marcou os 2 gols da final de 2002 contra a Alemanha?', options: ['Rivaldo', 'Ronaldinho', 'Ronaldo', 'Cafu'], answer: 2 },
    { q: 'Em qual Copa o Brasil ganhou o tri (1970)?', options: ['México', 'Inglaterra', 'Alemanha', 'Brasil'], answer: 0 },
    { q: 'Quem era o capitão do tetra em 1994?', options: ['Dunga', 'Raí', 'Bebeto', 'Romário'], answer: 0 },
    { q: 'O Brasil sediou a Copa mais recentemente em que ano?', options: ['1950', '2010', '2014', '2016'], answer: 2 },
    { q: 'Quem ganhou a Bola de Ouro (melhor jogador) da Copa de 1994 sendo brasileiro? (dica: nenhum)', options: ['Romário', 'Bebeto', 'Nenhum brasileiro', 'Dunga'], answer: 0 },
    { q: 'Qual a maior goleada do Brasil em Copas?', options: ['6x1', '7x1 (sofrida)', '5x2', '4x0'], answer: 1 },
    { q: 'Quem é o maior artilheiro do Brasil em Copas do Mundo?', options: ['Pelé', 'Ronaldo', 'Neymar', 'Romário'], answer: 1 },
  ],
  geral: [
    { q: 'Qual país tem mais títulos mundiais?', options: ['Alemanha', 'Itália', 'Brasil', 'Argentina'], answer: 2 },
    { q: 'Onde foi disputada a primeira Copa do Mundo (1930)?', options: ['Brasil', 'Itália', 'Uruguai', 'França'], answer: 2 },
    { q: 'Quem venceu a Copa do Mundo de 2022?', options: ['França', 'Argentina', 'Brasil', 'Croácia'], answer: 1 },
    { q: 'Quem é o maior artilheiro da história das Copas?', options: ['Ronaldo', 'Klose', 'Müller', 'Pelé'], answer: 1 },
    { q: 'Quantos títulos a Alemanha tem?', options: ['3', '4', '5', '2'], answer: 1 },
    { q: 'Qual seleção foi campeã em casa em 1998?', options: ['Brasil', 'França', 'Alemanha', 'Inglaterra'], answer: 1 },
    { q: 'Quem ganhou a primeira Copa do Mundo?', options: ['Brasil', 'Itália', 'Argentina', 'Uruguai'], answer: 3 },
    { q: 'Qual país europeu nunca foi campeão mas tem 4 vices? (dica: laranja)', options: ['Holanda', 'Hungria', 'Tchéquia', 'Suécia'], answer: 0 },
    { q: 'Em que ano teve a Copa do Mundo do Catar?', options: ['2018', '2022', '2020', '2024'], answer: 1 },
    { q: 'Quantas seleções disputaram a Copa de 2022?', options: ['24', '32', '48', '16'], answer: 1 },
  ],
  copa2026: [
    { q: 'Quantas seleções disputam a Copa de 2026?', options: ['32', '40', '48', '64'], answer: 2 },
    { q: 'Quantos países sediam a Copa de 2026?', options: ['1', '2', '3', '4'], answer: 2 },
    { q: 'Quais são os países-sede de 2026?', options: ['EUA, Canadá e México', 'EUA e México', 'EUA, Canadá e Brasil', 'México e Canadá'], answer: 0 },
    { q: 'Quantos grupos tem a fase de grupos em 2026?', options: ['8', '10', '12', '16'], answer: 2 },
    { q: 'Quantos jogos a Copa de 2026 tem no total?', options: ['64', '80', '104', '128'], answer: 2 },
    { q: 'Além de 1º e 2º, quantos melhores 3ºs avançam?', options: ['4', '6', '8', '12'], answer: 2 },
    { q: 'Como se chama a 1ª fase do mata-mata em 2026?', options: ['Oitavas', '16-avos de final', '32-avos', 'Repescagem'], answer: 1 },
    { q: 'Quantas seleções avançam ao mata-mata em 2026?', options: ['16', '24', '32', '48'], answer: 2 },
    { q: 'Quantos times tem cada grupo na Copa de 2026?', options: ['3', '4', '5', '6'], answer: 1 },
    { q: 'É a primeira Copa com quantas seleções (recorde)?', options: ['40', '48', '52', '64'], answer: 1 },
  ],
};

/** Embaralha um array (cópia) — para variar a ordem das perguntas a cada partida. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
