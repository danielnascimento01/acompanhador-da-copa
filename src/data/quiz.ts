/**
 * Perguntas do QUIZ da Copa — 3 modos (Brasil / Geral / Copa 2026), 50 cada.
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
    { q: 'Quem é o maior artilheiro da história da seleção brasileira (todos os jogos)?', options: ['Pelé', 'Ronaldo', 'Neymar', 'Romário'], answer: 2 },
    { q: 'O Brasil é a única seleção a ter disputado todas as Copas do Mundo?', options: ['Sim', 'Não, faltou a 1ª', 'Não, faltou a de 1950', 'Não, faltou a de 1930'], answer: 0 },
    { q: 'Em que cidade o Brasil perdeu de 7x1 para a Alemanha, em 2014?', options: ['São Paulo', 'Belo Horizonte', 'Rio de Janeiro', 'Brasília'], answer: 1 },
    { q: 'Quem treinou o Brasil no tri de 1970?', options: ['Zagallo', 'Saldanha', 'Telê', 'Parreira'], answer: 0 },
    { q: 'Quantas finais de Copa do Mundo o Brasil já disputou?', options: ['5', '6', '7', '8'], answer: 2 },
    { q: 'O Brasil já ficou de fora de alguma Copa do Mundo?', options: ['Sim, uma vez', 'Nunca, sempre se classificou', 'Sim, duas vezes', 'Sim, em 1930'], answer: 1 },
    { q: 'Qual brasileiro disputou 3 finais de Copa seguidas (1994, 1998 e 2002)?', options: ['Cafu', 'Roberto Carlos', 'Ronaldo', 'Rivaldo'], answer: 0 },
    { q: 'No penta de 2002, o Brasil venceu quantos dos 7 jogos?', options: ['5', '6', '7', '4'], answer: 2 },
    { q: 'Quem foi o goleiro titular do penta, em 2002?', options: ['Marcos', 'Dida', 'Taffarel', 'Júlio César'], answer: 0 },
    { q: 'Quem foi o goleiro titular do tetra, em 1994?', options: ['Taffarel', 'Marcos', 'Dida', 'Zetti'], answer: 0 },
    { q: 'Em qual Copa o Brasil foi eliminado pela França nas quartas?', options: ['2006', '1998', '2002', '2010'], answer: 0 },
    { q: 'Quem passou mal horas antes da final da Copa de 1998?', options: ['Ronaldo', 'Rivaldo', 'Bebeto', 'Denílson'], answer: 0 },
    { q: 'Quem era a dupla de Romário no ataque do tetra, em 1994?', options: ['Bebeto', 'Ronaldo', 'Edmundo', 'Müller'], answer: 0 },
    { q: 'A comemoração de "ninar o bebê", em 1994, foi de qual jogador?', options: ['Bebeto', 'Romário', 'Dunga', 'Raí'], answer: 0 },
    { q: 'Quem foi o capitão do Brasil no tri, em 1970?', options: ['Carlos Alberto', 'Pelé', 'Gérson', 'Rivelino'], answer: 0 },
    { q: 'Quem marcou o famoso 4º gol do Brasil na final de 1970?', options: ['Carlos Alberto', 'Pelé', 'Jairzinho', 'Tostão'], answer: 0 },
    { q: 'Contra quem o Brasil venceu a final da Copa de 1970?', options: ['Itália', 'Alemanha', 'Uruguai', 'Hungria'], answer: 0 },
    { q: 'Contra quem o Brasil venceu a final da Copa de 1958?', options: ['Suécia', 'Itália', 'Alemanha', 'França'], answer: 0 },
    { q: 'Em qual Copa Ronaldo foi artilheiro com 8 gols?', options: ['2002', '1998', '2006', '1994'], answer: 0 },
    { q: 'Quantos gols Ronaldo marcou no total em Copas do Mundo?', options: ['12', '15', '17', '10'], answer: 1 },
    { q: 'Em que cidade foi a final da Copa de 2014?', options: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Belo Horizonte'], answer: 0 },
    { q: 'Quem o Brasil enfrentou na semifinal de 2014 (o 7x1)?', options: ['Alemanha', 'Holanda', 'Argentina', 'Colômbia'], answer: 0 },
    { q: 'Quem é o único jogador da história com 3 títulos mundiais?', options: ['Pelé', 'Cafu', 'Maradona', 'Beckenbauer'], answer: 0 },
    { q: 'Em que ano o Brasil ganhou o bicampeonato?', options: ['1958', '1962', '1970', '1994'], answer: 1 },
    { q: 'Quem foi o técnico do Brasil na Copa de 2014?', options: ['Felipão', 'Dunga', 'Tite', 'Mano Menezes'], answer: 0 },
    { q: 'Quem comandou o Brasil na Copa de 2018?', options: ['Tite', 'Dunga', 'Felipão', 'Zagallo'], answer: 0 },
    { q: 'Em qual Copa o Brasil conquistou o tetracampeonato?', options: ['1994', '1998', '2002', '1990'], answer: 0 },
  ],
  geral: [
    { q: 'Qual país tem mais títulos mundiais?', options: ['Alemanha', 'Itália', 'Brasil', 'Argentina'], answer: 2 },
    { q: 'Em que país foi a primeira Copa do Mundo, em 1930?', options: ['Brasil', 'Itália', 'Uruguai', 'França'], answer: 2 },
    { q: 'Quem venceu a Copa do Mundo de 2022?', options: ['França', 'Argentina', 'Brasil', 'Croácia'], answer: 1 },
    { q: 'Quem é o maior artilheiro da história das Copas?', options: ['Ronaldo', 'Klose', 'Müller', 'Pelé'], answer: 1 },
    { q: 'Quantos títulos mundiais a Alemanha tem?', options: ['3', '4', '5', '2'], answer: 1 },
    { q: 'Qual seleção foi campeã em casa, em 1998?', options: ['Brasil', 'França', 'Alemanha', 'Inglaterra'], answer: 1 },
    { q: 'Quem ganhou a primeira Copa do Mundo, em 1930?', options: ['Brasil', 'Itália', 'Argentina', 'Uruguai'], answer: 3 },
    { q: 'Qual seleção europeia perdeu 3 finais sem nunca ser campeã?', options: ['Holanda', 'Hungria', 'Bélgica', 'Suécia'], answer: 0 },
    { q: 'Em que país foi a Copa do Mundo de 2022?', options: ['Emirados Árabes', 'Catar', 'Arábia Saudita', 'Kuwait'], answer: 1 },
    { q: 'Quantas seleções disputaram a Copa de 2022?', options: ['24', '32', '48', '16'], answer: 1 },
    { q: 'Quantos títulos mundiais a Itália tem?', options: ['3', '4', '5', '2'], answer: 1 },
    { q: 'Quantos títulos mundiais a Argentina tem?', options: ['2', '3', '4', '1'], answer: 1 },
    { q: 'Quantos títulos mundiais o Uruguai tem?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: 'Em que Copa Maradona levou a Argentina ao título?', options: ['1978', '1986', '1990', '1982'], answer: 1 },
    { q: 'O gol de "mão de Deus" de Maradona foi em qual Copa?', options: ['1982', '1986', '1990', '1994'], answer: 1 },
    { q: 'Quem venceu a Copa do Mundo de 2014?', options: ['Argentina', 'Alemanha', 'Holanda', 'Brasil'], answer: 1 },
    { q: 'Onde foi a primeira Copa do Mundo disputada na África, em 2010?', options: ['Nigéria', 'África do Sul', 'Marrocos', 'Egito'], answer: 1 },
    { q: 'Quem ganhou a Bola de Ouro da Copa de 2022?', options: ['Mbappé', 'Messi', 'Modrić', 'Di María'], answer: 1 },
    { q: 'Quem foi o artilheiro da Copa de 2022?', options: ['Messi', 'Mbappé', 'Giroud', 'Álvarez'], answer: 1 },
    { q: 'Quais países sediaram juntos a Copa de 2002?', options: ['Coreia do Sul e Japão', 'China e Japão', 'Coreia do Sul e China', 'Japão e Tailândia'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 2006?', options: ['França', 'Itália', 'Alemanha', 'Brasil'], answer: 1 },
    { q: 'Na final de 2006, Zidane deu uma cabeçada em quem?', options: ['Cannavaro', 'Materazzi', 'Gattuso', 'Pirlo'], answer: 1 },
    { q: 'Em que ano a Copa passou a ter 32 seleções?', options: ['1994', '1998', '2002', '1990'], answer: 1 },
    { q: 'Qual foi a 1ª seleção africana a chegar às quartas de final?', options: ['Nigéria', 'Camarões', 'Senegal', 'Gana'], answer: 1 },
    { q: 'Quem venceu a Copa do Mundo de 2018?', options: ['Croácia', 'França', 'Bélgica', 'Inglaterra'], answer: 1 },
    { q: 'Quantos títulos mundiais a França tem?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: 'Quem a Argentina venceu na final da Copa de 2022?', options: ['Croácia', 'França', 'Brasil', 'Marrocos'], answer: 1 },
    { q: 'Quem foi o artilheiro da Copa de 2018?', options: ['Harry Kane', 'Mbappé', 'Lukaku', 'Griezmann'], answer: 0 },
    { q: 'Onde foi a Copa do Mundo de 1970?', options: ['México', 'Brasil', 'Inglaterra', 'Itália'], answer: 0 },
    { q: 'Quem venceu a Copa de 1966, em casa?', options: ['Inglaterra', 'Alemanha', 'Brasil', 'Itália'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 1990?', options: ['Alemanha', 'Argentina', 'Itália', 'Brasil'], answer: 0 },
    { q: 'A final de 1990 foi entre Alemanha e qual seleção?', options: ['Argentina', 'Holanda', 'Itália', 'Inglaterra'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 1978?', options: ['Argentina', 'Holanda', 'Brasil', 'Itália'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 1974?', options: ['Alemanha', 'Holanda', 'Polônia', 'Brasil'], answer: 0 },
    { q: 'Quem era o craque da Holanda do "carrossel", em 1974?', options: ['Cruyff', 'Van Basten', 'Gullit', 'Bergkamp'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 1982?', options: ['Itália', 'Alemanha', 'Brasil', 'Polônia'], answer: 0 },
    { q: 'Quem foi o artilheiro da Copa de 1982?', options: ['Paolo Rossi', 'Maradona', 'Zico', 'Rummenigge'], answer: 0 },
    { q: 'Quantos títulos mundiais a Inglaterra tem?', options: ['1', '2', '3', '0'], answer: 0 },
    { q: 'Quantos títulos mundiais a Espanha tem?', options: ['1', '2', '3', '0'], answer: 0 },
    { q: 'Quem venceu a Copa do Mundo de 2010?', options: ['Espanha', 'Holanda', 'Alemanha', 'Brasil'], answer: 0 },
    { q: 'A final de 2010 foi entre Espanha e qual seleção?', options: ['Holanda', 'Alemanha', 'Uruguai', 'Brasil'], answer: 0 },
    { q: 'Quem marcou o gol do título da Espanha, em 2010?', options: ['Iniesta', 'David Villa', 'Xavi', 'Torres'], answer: 0 },
    { q: 'Qual país sediou a Copa do Mundo de 2006?', options: ['Alemanha', 'França', 'Itália', 'Suíça'], answer: 0 },
    { q: 'Quantas finais de Copa do Mundo a Alemanha já disputou?', options: ['6', '7', '8', '9'], answer: 2 },
    { q: 'Quem ganhou a Bola de Ouro da Copa de 2018?', options: ['Modrić', 'Mbappé', 'Griezmann', 'Hazard'], answer: 0 },
    { q: 'Qual seleção africana chegou à semifinal pela 1ª vez, em 2022?', options: ['Marrocos', 'Senegal', 'Gana', 'Camarões'], answer: 0 },
    { q: 'Quem foi o artilheiro da Copa de 2014?', options: ['James Rodríguez', 'Müller', 'Messi', 'Neymar'], answer: 0 },
    { q: 'Quantos gols Mbappé marcou na final da Copa de 2022?', options: ['2', '3', '1', '4'], answer: 1 },
    { q: 'A primeira Copa do Mundo, em 1930, teve quantas seleções?', options: ['13', '16', '8', '24'], answer: 0 },
    { q: 'Qual seleção venceu as Copas de 1934 e 1938 seguidas?', options: ['Itália', 'Uruguai', 'Alemanha', 'França'], answer: 0 },
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
    { q: 'A Copa de 2026 é a 1ª sediada por quantos países ao mesmo tempo?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'Em que país será a grande final da Copa de 2026?', options: ['México', 'Canadá', 'Estados Unidos', 'Brasil'], answer: 2 },
    { q: 'Quantos jogos cada seleção faz na fase de grupos de 2026?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'Quantas cidades-sede recebem jogos da Copa de 2026?', options: ['12', '16', '20', '24'], answer: 1 },
    { q: 'A Copa de 2026 é a maior da história em número de jogos?', options: ['Sim', 'Não, a de 2022', 'Não, a de 2014', 'São iguais'], answer: 0 },
    { q: 'Com 48 seleções, 2026 é a maior em número de participantes?', options: ['Sim', 'Não, 2014', 'Não, 1982', 'São iguais'], answer: 0 },
    { q: 'Em que estádio será a final da Copa de 2026?', options: ['MetLife Stadium', 'Estádio Azteca', 'Rose Bowl', 'SoFi Stadium'], answer: 0 },
    { q: 'Em que estádio será o jogo de abertura de 2026?', options: ['Estádio Azteca', 'MetLife Stadium', 'Rose Bowl', 'Hard Rock'], answer: 0 },
    { q: 'Em que cidade será a abertura da Copa de 2026?', options: ['Cidade do México', 'Nova York', 'Los Angeles', 'Toronto'], answer: 0 },
    { q: 'Qual país sedia o jogo de abertura de 2026?', options: ['México', 'Estados Unidos', 'Canadá', 'Brasil'], answer: 0 },
    { q: 'Qual país sedia a final de 2026?', options: ['Estados Unidos', 'México', 'Canadá', 'Brasil'], answer: 0 },
    { q: 'Com 2026, o México se torna o 1º país a sediar quantas Copas masculinas?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'É a 1ª vez que o Canadá sedia uma Copa do Mundo masculina?', options: ['Sim', 'Não, foi em 1994', 'Não, foi em 1986', 'Não, foi em 2002'], answer: 0 },
    { q: 'Os Estados Unidos já sediaram a Copa do Mundo. Em que ano?', options: ['1994', '1986', '1990', '2002'], answer: 0 },
    { q: 'Quantas vagas a América do Sul (CONMEBOL) tem em 2026?', options: ['4', '5', '6', '7'], answer: 2 },
    { q: 'Quantas vagas a Europa (UEFA) tem em 2026?', options: ['13', '16', '12', '14'], answer: 1 },
    { q: 'Quantas vagas a África (CAF) tem em 2026?', options: ['5', '9', '7', '12'], answer: 1 },
    { q: 'Quantas vagas a Ásia (AFC) tem em 2026?', options: ['4', '8', '6', '10'], answer: 1 },
    { q: 'Os países-sede se classificam automaticamente para 2026?', options: ['Sim', 'Não, têm de jogar', 'Só os EUA', 'Só o México'], answer: 0 },
    { q: 'Quantos mascotes oficiais a Copa de 2026 tem?', options: ['1', '2', '3', '4'], answer: 2 },
    { q: 'Qual animal representa o Canadá nos mascotes de 2026?', options: ['Alce', 'Jaguar', 'Águia', 'Urso'], answer: 0 },
    { q: 'Qual animal representa o México nos mascotes de 2026?', options: ['Jaguar', 'Alce', 'Águia', 'Lobo'], answer: 0 },
    { q: 'Qual animal representa os EUA nos mascotes de 2026?', options: ['Águia', 'Alce', 'Jaguar', 'Bisão'], answer: 0 },
    { q: 'Em que mês começa a Copa de 2026?', options: ['Junho', 'Maio', 'Julho', 'Agosto'], answer: 0 },
    { q: 'Em que mês acontece a final da Copa de 2026?', options: ['Julho', 'Junho', 'Agosto', 'Maio'], answer: 0 },
    { q: 'Quem chega como atual campeão mundial defendendo o título em 2026?', options: ['Argentina', 'França', 'Brasil', 'Alemanha'], answer: 0 },
    { q: 'Quantas cidades dos Estados Unidos recebem jogos em 2026?', options: ['9', '11', '13', '16'], answer: 1 },
    { q: 'Quantas cidades do México recebem jogos em 2026?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'Quantas cidades do Canadá recebem jogos em 2026?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: 'Toronto e Vancouver são cidades-sede de qual país?', options: ['Canadá', 'Estados Unidos', 'México', 'Brasil'], answer: 0 },
    { q: 'Cidade do México, Guadalajara e Monterrey são sedes de qual país?', options: ['México', 'Estados Unidos', 'Canadá', 'Brasil'], answer: 0 },
    { q: 'Qual destas NÃO é cidade-sede da Copa de 2026?', options: ['Chicago', 'Miami', 'Dallas', 'Seattle'], answer: 0 },
    { q: 'Quantos times de cada grupo avançam direto (1º e 2º)?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: 'Quantos jogos a mais 2026 tem em relação a 2022 (que teve 64)?', options: ['24', '40', '16', '52'], answer: 1 },
    { q: 'Depois dos 16-avos, qual é a fase seguinte em 2026?', options: ['Oitavas de final', 'Quartas de final', 'Semifinais', 'Repescagem'], answer: 0 },
    { q: 'Quantas seleções são eliminadas na fase de grupos de 2026?', options: ['12', '16', '24', '8'], answer: 1 },
    { q: 'A Copa do Mundo é organizada por qual entidade?', options: ['FIFA', 'UEFA', 'CONMEBOL', 'COI'], answer: 0 },
    { q: 'Quantas confederações têm seleções classificadas para 2026?', options: ['4', '5', '6', '3'], answer: 2 },
    { q: 'Quantas vagas diretas a Oceania (OFC) tem pela 1ª vez em 2026?', options: ['0', '1', '2', '3'], answer: 1 },
    { q: 'Quantas vagas a CONCACAF tem em 2026 (incluindo os anfitriões)?', options: ['4', '6', '8', '3'], answer: 1 },
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
