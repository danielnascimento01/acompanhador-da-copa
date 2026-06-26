/**
 * Perguntas do QUIZ da Copa — 3 modos (Brasil / Geral / Copa 2026).
 * Fatos conferidos; a precisão importa (mesmo princípio do "zero bug de dados").
 * `answer` é o índice (0-3) da opção correta.
 *
 * O banco é grande de propósito: cada partida sorteia só algumas perguntas
 * (QUESTIONS_PER_ROUND), então dá pra jogar várias vezes sem repetir tudo.
 * Para "mais e mais perguntas", é só acrescentar itens aqui e mandar OTA.
 */
export type QuizMode = 'brasil' | 'geral' | 'copa2026';

export type Question = { q: string; options: string[]; answer: number };

export const QUIZ_MODES: { key: QuizMode; label: string; emoji: string; desc: string }[] = [
  { key: 'brasil', label: 'Brasil', emoji: '🇧🇷', desc: 'A seleção brasileira nas Copas' },
  { key: 'geral', label: 'Geral', emoji: '🌎', desc: 'História das Copas do Mundo' },
  { key: 'copa2026', label: 'Copa 2026', emoji: '🏆', desc: 'A Copa que está rolando agora' },
];

/** Quantas perguntas entram em cada partida (sorteadas do banco do modo). */
export const QUESTIONS_PER_ROUND = 10;

export const QUIZ: Record<QuizMode, Question[]> = {
  brasil: [
    { q: 'Quantos títulos mundiais o Brasil tem?', options: ['4', '5', '6', '3'], answer: 1 },
    { q: 'Em que ano o Brasil conquistou o penta?', options: ['1998', '2002', '2006', '1994'], answer: 1 },
    { q: 'Contra quem o Brasil perdeu o título em casa, em 1950?', options: ['Itália', 'Uruguai', 'Argentina', 'Suécia'], answer: 1 },
    { q: 'Quem marcou os 2 gols da final de 2002 contra a Alemanha?', options: ['Rivaldo', 'Ronaldinho', 'Ronaldo', 'Cafu'], answer: 2 },
    { q: 'Em qual país o Brasil ganhou o tri, em 1970?', options: ['México', 'Inglaterra', 'Alemanha', 'Brasil'], answer: 0 },
    { q: 'Quem ergueu a taça como capitão do tetra, em 1994?', options: ['Dunga', 'Raí', 'Bebeto', 'Romário'], answer: 0 },
    { q: 'O Brasil sediou a Copa mais recentemente em que ano?', options: ['1950', '2010', '2014', '2016'], answer: 2 },
    { q: 'Quem foi eleito o melhor jogador (Bola de Ouro) da Copa de 1994?', options: ['Romário', 'Bebeto', 'Baggio', 'Dunga'], answer: 0 },
    { q: 'Qual foi a maior goleada que o Brasil sofreu em Copas?', options: ['6x1', '7x1', '5x2', '4x0'], answer: 1 },
    { q: 'Quem é o maior artilheiro do Brasil em Copas do Mundo?', options: ['Pelé', 'Ronaldo', 'Neymar', 'Romário'], answer: 1 },
    { q: 'Em qual país o Brasil conquistou seu primeiro título, em 1958?', options: ['Suíça', 'Suécia', 'Chile', 'Inglaterra'], answer: 1 },
    { q: 'Quantos anos Pelé tinha quando foi campeão em 1958?', options: ['17', '19', '21', '16'], answer: 0 },
    { q: 'Quem marcou em todos os jogos do Brasil na Copa de 1970?', options: ['Pelé', 'Tostão', 'Jairzinho', 'Rivelino'], answer: 2 },
    { q: 'Quem foi o craque do bi de 1962, com Pelé machucado?', options: ['Garrincha', 'Vavá', 'Didi', 'Zagallo'], answer: 0 },
    { q: 'Quem foi o capitão do penta, em 2002?', options: ['Cafu', 'Roberto Carlos', 'Emerson', 'Lúcio'], answer: 0 },
    { q: 'Quem treinou o Brasil no penta de 2002?', options: ['Parreira', 'Felipão', 'Zagallo', 'Dunga'], answer: 1 },
    { q: 'Quem treinou o Brasil no tetra de 1994?', options: ['Parreira', 'Felipão', 'Telê', 'Zagallo'], answer: 0 },
    { q: 'Como foi decidida a final da Copa de 1994?', options: ['Gol no fim', 'Nos pênaltis', 'Na prorrogação', 'Gol contra'], answer: 1 },
    { q: 'Quem perdeu o pênalti decisivo para o Brasil na final de 1994?', options: ['Baresi', 'Baggio', 'Massaro', 'Albertini'], answer: 1 },
    { q: 'Para quem o Brasil perdeu a final da Copa de 1998?', options: ['Itália', 'França', 'Alemanha', 'Holanda'], answer: 1 },
    { q: 'Quantos gols Pelé marcou em Copas do Mundo?', options: ['10', '12', '14', '9'], answer: 1 },
    { q: 'Quantas Copas do Mundo Pelé venceu?', options: ['2', '3', '4', '1'], answer: 1 },
    { q: 'Antes de 1950, de que cor era a camisa principal do Brasil?', options: ['Amarela', 'Azul', 'Branca', 'Verde'], answer: 2 },
    { q: 'Quem é o maior artilheiro da história da seleção brasileira (em todos os jogos)?', options: ['Pelé', 'Ronaldo', 'Neymar', 'Romário'], answer: 2 },
    { q: 'O Brasil é a única seleção a ter disputado todas as Copas do Mundo?', options: ['Sim', 'Não, faltou a 1ª', 'Não, faltou a de 1950', 'Não, faltou a de 1930'], answer: 0 },
    { q: 'Em que cidade o Brasil perdeu de 7x1 para a Alemanha, em 2014?', options: ['São Paulo', 'Belo Horizonte', 'Rio de Janeiro', 'Brasília'], answer: 1 },
    { q: 'Quem treinou o Brasil no tri de 1970?', options: ['Zagallo', 'Saldanha', 'Telê', 'Parreira'], answer: 0 },
  ],
  geral: [
    { q: 'Qual país tem mais títulos mundiais?', options: ['Alemanha', 'Itália', 'Brasil', 'Argentina'], answer: 2 },
    { q: 'Em que país foi disputada a primeira Copa do Mundo, em 1930?', options: ['Brasil', 'Itália', 'Uruguai', 'França'], answer: 2 },
    { q: 'Quem venceu a Copa do Mundo de 2022?', options: ['França', 'Argentina', 'Brasil', 'Croácia'], answer: 1 },
    { q: 'Quem é o maior artilheiro da história das Copas do Mundo?', options: ['Ronaldo', 'Klose', 'Müller', 'Pelé'], answer: 1 },
    { q: 'Quantos títulos mundiais a Alemanha tem?', options: ['3', '4', '5', '2'], answer: 1 },
    { q: 'Qual seleção foi campeã em casa, em 1998?', options: ['Brasil', 'França', 'Alemanha', 'Inglaterra'], answer: 1 },
    { q: 'Quem ganhou a primeira Copa do Mundo, em 1930?', options: ['Brasil', 'Itália', 'Argentina', 'Uruguai'], answer: 3 },
    { q: 'Qual seleção europeia perdeu 3 finais sem nunca ter sido campeã?', options: ['Holanda', 'Hungria', 'Bélgica', 'Suécia'], answer: 0 },
    { q: 'Em que país foi a Copa do Mundo de 2022?', options: ['Emirados Árabes', 'Catar', 'Arábia Saudita', 'Kuwait'], answer: 1 },
    { q: 'Quantas seleções disputaram a Copa de 2022?', options: ['24', '32', '48', '16'], answer: 1 },
    { q: 'Quantos títulos mundiais a Itália tem?', options: ['3', '4', '5', '2'], answer: 1 },
    { q: 'Quantos títulos mundiais a Argentina tem?', options: ['2', '3', '4', '1'], answer: 1 },
    { q: 'Quantos títulos mundiais o Uruguai tem?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: 'Em que Copa Maradona levou a Argentina ao título?', options: ['1978', '1986', '1990', '1982'], answer: 1 },
    { q: 'O gol de "mão de Deus" de Maradona foi em qual Copa?', options: ['1982', '1986', '1990', '1994'], answer: 1 },
    { q: 'Quem venceu a Copa do Mundo de 2014?', options: ['Argentina', 'Alemanha', 'Holanda', 'Brasil'], answer: 1 },
    { q: 'Onde foi a primeira Copa do Mundo disputada na África, em 2010?', options: ['Nigéria', 'África do Sul', 'Marrocos', 'Egito'], answer: 1 },
    { q: 'Quem ganhou a Bola de Ouro (melhor jogador) da Copa de 2022?', options: ['Mbappé', 'Messi', 'Modrić', 'Di María'], answer: 1 },
    { q: 'Quem foi o artilheiro (Chuteira de Ouro) da Copa de 2022?', options: ['Messi', 'Mbappé', 'Giroud', 'Álvarez'], answer: 1 },
    { q: 'Quais países sediaram juntos a Copa de 2002?', options: ['Coreia do Sul e Japão', 'China e Japão', 'Coreia do Sul e China', 'Japão e Tailândia'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 2006?', options: ['França', 'Itália', 'Alemanha', 'Brasil'], answer: 1 },
    { q: 'Na final de 2006, Zidane deu uma cabeçada em quem?', options: ['Cannavaro', 'Materazzi', 'Gattuso', 'Pirlo'], answer: 1 },
    { q: 'Em que ano a Copa passou a ter 32 seleções pela primeira vez?', options: ['1994', '1998', '2002', '1990'], answer: 1 },
    { q: 'Qual foi a primeira seleção africana a chegar às quartas de final?', options: ['Nigéria', 'Camarões', 'Senegal', 'Gana'], answer: 1 },
    { q: 'Quem venceu a Copa do Mundo de 2018?', options: ['Croácia', 'França', 'Bélgica', 'Inglaterra'], answer: 1 },
    { q: 'Quantos títulos mundiais a França tem?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: 'Quem a Argentina venceu na final da Copa de 2022?', options: ['Croácia', 'França', 'Brasil', 'Marrocos'], answer: 1 },
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
    { q: 'Quantas seleções a mais a Copa de 2026 tem em relação a 2022?', options: ['8', '12', '16', '24'], answer: 2 },
    { q: 'A Copa de 2026 é a primeira sediada por quantos países ao mesmo tempo?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'Em que país será a grande final da Copa de 2026?', options: ['México', 'Canadá', 'Estados Unidos', 'Brasil'], answer: 2 },
    { q: 'Quantos jogos cada seleção faz na fase de grupos de 2026?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'Quantas cidades-sede recebem jogos da Copa de 2026?', options: ['12', '16', '20', '24'], answer: 1 },
    { q: 'A Copa de 2026 é a maior da história em número de jogos?', options: ['Sim', 'Não, a de 2022', 'Não, a de 2014', 'São iguais'], answer: 0 },
    { q: 'Com 48 seleções, a Copa de 2026 é a maior em número de participantes?', options: ['Sim', 'Não, 2014', 'Não, 1982', 'São iguais'], answer: 0 },
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

/** Sorteia as perguntas de uma partida (subconjunto aleatório do banco do modo). */
export function drawQuestions(mode: QuizMode, n: number = QUESTIONS_PER_ROUND): Question[] {
  return shuffle(QUIZ[mode]).slice(0, Math.min(n, QUIZ[mode].length));
}
