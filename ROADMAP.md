- Etapas

[ok] 1) Calculo de demanda

[ok] 1.1) Mutiplicar a quantidade da demanda pelo valor product.formatedSocialCost e subtrair ou somar (a depender da operação) direto no campo de trabalho social individual.

[ok] 1.2) Já faz isso sem multiplicar, incluir um .onchange no campo e usar essa multiplicação.

---------- Pausa antes da parte 2 ---------

[ok] 2) Limite para evitar demandas impossíveis (infinitas)

[ok] 2.1) Limitar o mínimo como 0, não negativo, o campo de participação individual e no de demanda o mínimo é 1, não menor que 1, pois isso só clicando em remover produto.

[ok] 2.2) Se inserir item ou atualizar demanda o próximo número do campo participação for menor que zero sair da função e não executar essa ação de incluir ou alterar o campo. Voltar para o valor anterior da demanda (se for alteração pelo valor da demanda). Ver se faço isso em uma única função, salvando sempre no onchange da demanda o valor atual temporário da demanda, e depois, no onchange, pra não dar confusão de mudança de valores de demanda cruzados de produtos, restauro esse valor se for ficar menor que 0 o valor da participação individual.

---------- Pausa antes da parte 3 ---------

3) Salvar e ler na tela do usuário trabalhador não conselheiro

[ok] 3.1) Na hora de salvar, verificar se é trabalhador não conselheiro (com UUID ou algo do tipo), se ja tiver essa verificação usar ela. Se for, criar um objeto, o mesmo para demanda de conselho, alimentar a mesma variável que sendData salva para demanda de conselho, juntando a demanda do vetor de bens de consumo e serviço. Teoricamente isso já deve estar na matriz tecnológica.

[ok] 3.2) Terminar salvamento. Só que a ordem que o usuário vai salvar não é a de sua matriz tecnológica pq ele não tem matriz tecnológica, usar a mesma lógica do comitê de fábrica, que tbm não tem matriz tecnológica e é usado na estimativa do conselho acima. Tem só um vetor tecnológico.

[ok] 3.3)  Carregar dados salvos (usar IA pra saber no código pras tabelas que salvam, para populá-las novamente);

[ok] - iterar onde já é carregado o que já está corretamente salvo
[ok] - chamar, para cada produto (que já está com o nome certo) a função que chama quando clica em "Retirar", e passar o nome do produto e passar o valor do campo numérico (ver se por dentro do objeto ou com parâmetro a mais, havendo um parâmetro padrão, caso não seja passado, de "1", que é quando adiciona pela primeira vez)
[ok] - colocar if(ver se é usuário não conselheiro), se verdadeiro (se não é conselheiro) executa essa implementação, senão, a que já está lá
[ok] - colocar if pra ver se productName contém a palavra "Rede", se sim chama a função para a tabela de serviços, se não, chama pra de produtos

[ok] 3.4) A Confirmação do Recebimento/Retirada

[ok] - Botão que faça isso, ao lado do produto (Confirmar Recebimento/Retirada), que executa o mesmo que excluir, porém ele desconta na carga horária trabalhada do trabalhador (a função inversa da que calcula o valor que ele pode gastar, ver formula fazer sua inversa e ver se zera horas trabalhadas (acumuladas) quando deve zera, isto é, quando gasta tudo, como prova dos nove, teste final) 

[ok] Já vai descontar automaticamente.
Depois ver se vai salvar esse descontado e carrega-lo, ao inves de descontar na hora que carrega, mantendo o total trabalhado a vida toda sempre (pq não posso resetar por mês etc)
E como vai tirar o produto ou serviço dessa lista de demanda do usuário, se será quando ele efetivamente receber na sua casa o item e confirmar o recebimento (ou confirmar a retirada)
        |----------- pode ter um botão que faça isso, ao lado do produto (Confirmar Recebimento/Retirada), que executa o mesmo que excluir, porém ele desconta na carga horária trabalhada do trabalhador (a função inversa da que calcula o valor que ele pode gastar, ver formula fazer sua inversa e ver se zera horas trabalhadas (acumuladas) quando deve zera, isto é, quando gasta tudo, como prova dos nove, teste final)

Explicação Teórica:
Capital é trabalho acumulado no período anterior.
Existe trabalho acumulado na economia planificada.
Porém, o trabalho só pode ser acumulado pela própria pessoa que trabalhou, não por outra, que é o que determina a exploração (isto é, não existe exploração).
O Estado Operário apenas realoca obrigatoriamente parte do trabalho acumulado, de forma análoga ao imposto, mas essencialmente diferente, pois todo o realocado vai de volta para os próprios trabalhadores que obrigatoriamente só o recebem se trabalharem em um dos setores essenciais, não existe vantagem, privilégio, mordomia, sevidão, não vai para setor bancário, especulativo nem alimenta nenhum capital produtivo ou não, é a justiça final que se autojustifica, sem classes acima explorando as de baixo.


[~] 4) Segurança

[ok] 4.1) Colocar HTTPS novamente para funcionar integralmente.

[ok] 4.2) Colocar uma pseudo-criptografia no código enviado para o navegador, de modo que seja impossível alterar dados de campos manualmente por dentro do código fonte e mandar salvar.
Faça isso colocando um "embaralhador de código" que embaralha aleatoriamente, cada vez que o código é embaralhado é única, sem chave que o permita ser desembaralhado, sem que nenhum dos campos de texto ou numérico possa ter seu valor identificado diretamente no código fonte do navegador,
mas que seja lido e funciuone normalmente no navegador, só está embaralhado.

[ok] 4.3) Criar arquivo de configuração

[ok] 4.4) Ver se HTTPS é criptografado ou se pode ser acessado e quebrado por algum governo, se sim, ver se há protocolo alternativo reconhecido por todos os navegadores atuais.
    Sim. HTTPS critptografa a conexão e é praticamente impossível espionagem ou interceptação (a não por algo instalado no navegador que leia depois de descriptografado, mas não no meio do caminho, nem alteração de dados).

[ok] 4.5) Ver o código fonte não o torna vulnerável, pois o usuário pode tentar mudar o código fonte no repositório, mas não o muda no servidor, e saber como ele funciona não o ajuda a decifrar o misturador aleatório e alterar dados na camada front-end em tempo de execução e salvá-los, fraudando o sistema.
É como se o sistema estivesse "compilado" e não dá pra mexer nele, mudar seu conteúdo nem nada, em tempo de execução, se "recompila-lo" com seu novo codigo fonte alterado (que seria uma atualização no repositório e deploy no servidor de produção, mas isso para qualquer aplicação em qualquer linguagem).

[ok] 4.6) Criar um arquivo secure.js, pois apesar de parecer vulnerável fazer isso, caso alguém mexa nessa lógica de segurança será visível, ficará explícito e poderá ser desfeito facilmente, restaurando ou aperfeiçoando os mecanismos de segurança a cada falha ou brecha.

-------------------

[ok] 5) Usar comando "pm2 reload all", depois que atualizar a partir do código do github, para deploy sem downtime. Ver se meu parâmetro de pseudo-criptografia funciona com reload tbm, testar. Se não, ver alternativa, mas manter solução de pseudo-criptografia com criptografia real (HTTPS ou alternativa).

-----------------

[ok] 6) Testar analise de dados do data.json no deepseek ou outro
- [ok] deepseek com problema de uploads de arquivos, mas no chatgpt funcionou perfeitamente
- [ok] Microserviços: pegar códigos python gerados e incorporar ao código, ver como exibir para o cliente. usar códigos do python como microserviços, o PM2 e Node já gerenciam isso para que chamadas a programas python se comportem como microserviços separadas, para cada usuário que fez a requisição.

[ok] Criar um botão, na tela inicial, de login, que quando o usuário clica exibe um Alert cujo o conteúdo de texto foi processado em um python que rodou no servidor. Colocar inicialmente "Hello, World, Python no servidor!"

6.1)
[ok][ok] 6.1.1.1) Criar scripts que criem arquivo de schema com tipos de dados e constraints (condições, ranges, etc). Usar campos de cadastro de usuário e campos de entrada das seções (especificar o nome de todas as seções, pra ele entender do que falo) e código que salva e lê, fetchData e sendData etc (usar isso tudo como contexto). Se ele não entender explicar cada campo que tipo de dado e range de valores pra ele gerar. Falar pra gerar conselhos e comitês com base em nomes reais de bairros, cidades, estados, regiões, países e continentes, devidamente associados, de modo que faça sentido. Preencha devidamente e de maneira criativa e consistente cada campo criado no arquivo de dados.

[ok] 6.1.1.2) Depois, detecte cada produto demandado nos comitês "filhos" de um comitê distrital (os campos "bemDeProducao" dentro de "estoqueDemanda" do comitê filho) e verifique se todos eles estão em "productNames" do conselho pai que o comitê está associado. Se não, inseri-lo em ""productNames", inserir o nome do setor em "sectorNames" ("Produção de", se o "bemDeProducao" não contiver a expressão "Rede de"), inserir mais um valor numério em "finalDemand" (entre 1 e 1000) e inserir mais uma linha e mais uma coluna na matriz "inputTable" com números entre 0.01 e 0.4.

[ok] 6.1.2) Depois,

[ok] criar script que cria conselhos de cada continente, que ainda não tiver sido criado, associados ao Conselho da Terra

[ok] em seguida de cada região de cada continente que não tiver sido criada,

[ok] em seguida de 2 países de cada região de cada continente,

[ok] em seguida, das regiões nacionais de cada país(exemplo, norte, sul, leste, oeste e as interseções dessas regiões, conforme existam em cada país) de cada país criado,

[ok] em seguida, 2 estados de cada região nacional criada de cada país,

[ok] em seguida 2 cidades de cada estado criado,

[ok] em seguida 2 distritos de cada cidade criada, e 1 Conselho de Distribuição e Serviços para cada bairro criado,

[ok] garantindo que cada conselho está associado a um conselho acima criado anteriormente que, na medida do possível, de fato faça sentido com a realidade (por exemplo, um país que no mundo real está na região Leste do Continente Europeu deve estar associado a essa região, e essa região a esse continente, não com outra região de outro continente, e assim por diante com tudo o que solicitei que o script crie.

[ok] Para cada novo conselho criado já cadastre um novo conselheiro para esse conselho, use um nome que tenha a ver com o país daquele conselho, para ficar mais real, crie os nomes de usuário para login fáceis de intuitivos de lembrar, e uma mesma senha para todos, 123. 80% dos conselheiros criados devem ser mulheres.

[ok] Não apague informação já existente no arquivo de dados, só crie essas novas.

[ok] Para cada bairro do mundo criado por esse script devem estar sendo oferecidos 3 serviços e serem produzidos produtos de 2 setores diferentes nesse bairro (mas podem ser setores que existem em outros bairros ou setores novos, crie alguns setores e serviços novos para parecer real os dados, coloque os nomes dos Comitês, Conselhos, Setores, Produtos e Serviços, tudo e todos traduzidos para português, para que eu entenda, pois falo português). Preencha devidamente e de maneira criativa e consistente cada campo criado no arquivo de dados.

6.2) Otimizar Persistência

[===>>>>] Antes de criar novos usuários não conselheiros destravar o sistema.
Otimizar armazenamento de dados, tanto em seu tamanho quanto em velocidade de leitura, sem diminuir o conteúdo significativo dos dados em si. Estudar e buscar alternativas, tentar com indexação (índices que tiram redundâncias, ver como fazer leitura), tentar com Mongo.DB, SQLite ou outro banco sendo o critério ser o de que o banco deve ser o mais fácil possível de converter o conteúdo .json e adaptar todas as chamadas de leitura dele com seus filtros (fazer busca automatica em todo código pra achar comando de filtro, pois os filtros que devem ser passados nas "querys" ajax, seja por url, string ou como for, e a resposta deve ser do mesmo tipo, se vier em .json já filtrada melhor ainda, mais rápido e não preciso mexer em mais nenhuma outra parte do código), ver SQL tbm (mySQL ou outro melhor ou mais rápido, gratuito, de preferência opensource). Mais pra frente quem saber ver se não tem algo parecido com Hibernate em javascript (carregando apenas o necessário e persistindo de maneira intuitiva os objetos).

- [ok] Antes de começar: Criar backups (mais de um, do arquivo completo de conselhos, no google drive e localmente)
- [ok] Restaurar o ambiente do servidor (incluindo python) e rodá-lo no wsl, com todas as funcionalidades, incluindo a geração de gráfico com python online.

Para logar no postgreSQL:
sudo -i -u postgres

Para gerar o SQL da estrutura de todo o banco de dados:
PGPASSWORD=planecon123 pg_dump -h 127.0.0.1 -p 5432 -U postgres --schema-only planecon > /mnt/g/Downloads/GitHubClones/planificacaoEconomica/dump.sql

Para ver o status do postgreSQL:
systemctl status postgresql

Para ver o log do postgreSQL:
tail -n 50 /var/log/postgresql/postgresql-16-main.log

Para iniciar o shell do postgreSQL:
psql



Colocar um .java no servidor, intermediário, que, depois que o .java correto pega os dados corretamente, de maneira organizada, o java intermediário "embaralha" pra criar a resposta como se tivesse sendo lido o arquivo json abaixo, porém apenas com o dado do conselho/instância/usuário solicitado carregado, única e exclusivamente.


"Conselho Popular Municipal de Petrópolis": {
    "inputTable": [         //Vai ser montado pelo .java intermediário (iterando os vetores tecnologicos dos produtos)
      [
        0.01,
        0.02,
        0.03,
        0.06,
        0.06
      ],
      [
        0.08,
        0.03,
        0.06,
        0.05,
        0.07,
        0.01,
        0.02
      ]
    ],
    "finalDemand": [        //Vai ser montado pelo .java intermediário, carregando o vetor demando diretamente 
      50,
      100,
      40,
      0.01,
      0,
      0,
      0,
      0,
      500,
      100,
      150
    ],
    "optimizationInputs": { //Vai ser montado pelo .java intermediário, carregando diretamente de uma nova tabela 
                            "optimization_inputs_results" com esses campos abaixo, e "id_social_materialization", para associar ao produto ou serviço
      "0": {},
      "1": {
        "workerLimit": 500,
        "workerHours": 2,
        "productionTime": 0.3,
        "nightShift": true,
        "weeklyScale": 4,
        "productionGoal": 6995437.219838782
      },
      "2": {}
    },
    "optimizationResults": {    //Vai ser montado pelo .java intermediário, carregando diretamente de uma nova 
                                tabela "optimization_inputs_results" com esses campos abaixo, e  "id_social_materialization", para associar ao produto ou serviço
      "1": {
        "totalHours": 2098631.1659516348,
        "workersNeeded": 262329,
        "factoriesNeeded": 3,
        "totalShifts": 2099,
        "minimumProductionTime": 1837,
        "totalEmploymentPeriod": "2 anos, 10 meses, 2 semanas, 6 dias",
        "weeklyScale": 4,
        "plannedFinalDemand": 6995440
      },
      "3": {
        "totalHours": 3722399.8664519256,
        "workersNeeded": 177258,
        "factoriesNeeded": 6,
        "totalShifts": 760,
        "minimumProductionTime": 887,
        "totalEmploymentPeriod": "1 ano, 2 semanas, 1 dia",
        "weeklyScale": 3,
        "plannedFinalDemand": 7444800
      }
    },
    "productNames": [       //Vai ser montado pelo .java intermediário, carregando diretamente de materialização   
                            social
      "Rede de Saúde",
      "Rede de Educação",
      "Rede Logística Rodoviária",
      "Projetor",
      "Quadro Branco"
    ],
    "sectorNames": [        //Vai ser montado pelo .java intermediário, carregando diretamente de materialização   
                            social, o respectivo setor associado de cada item
      "Rede de Saúde",
      "Rede de Educação",
      "Rede Logística Rodoviária",
      "Produção de Projetor",
      "Produção de Quadro Branco"
    ],
    "setorUnidade": "",     //Vai ser montado pelo .java intermediário, carregando diretamente de instance
    "limiteEfetivoTrabalhadores": "",   //Vai ser montado pelo .java intermediário, carregando diretamente de
                                        instance
    "conselhoPopularAssociadoDeComiteOuTrabalhador": "",    //Vai ser montado pelo .java intermediário,
                                                            carregando diretamente de instance
    "conselhoPopularAssociadoDeConselhoPopular": "Conselho Popular Regional Estadual da Região Serrana do Rio de Janeiro",                  //Vai ser montado pelo .java intermediário,
                                carregando diretamente de instance
    "estoqueDemanda": [],       //Vai ser montado pelo .java intermediário,
                                ver se precisa criar mais uma tabela
    teste
    "producaoMeta": [           //Vai ser montado pelo .java intermediário, carregando diretamente de instance. 
                                separar campos, mas juntar apenas aqui (ao invés de ser esse vetor desnecessário no db)                                 
      {
        "produto": "Produto Produzido",
        "quantidadeProduzida": "0.000",
        "quantidadeMeta": "10000"
      }
    ],
    "comiteColTitle": "",               //Vai ser montado pelo .java intermediário, carregando diretamente de 
                                        instance
    "propostaTrabalhadores": {},        //Vai ser montado pelo .java intermediário, ver se crio tabela
                                        separada (pra evitar salvar vetor como .json dentro do campo)
    "vetorTecnologico": [],                 //Vai ser montado pelo .java intermediário, carregando do
                                            tensor tecnologico associado
    "totalSocialWorkDessaJurisdicao": 0,    //Vai ser montado pelo .java intermediário, carregando diretamente 
                                            de instance
    "comiteAssociadoDeTrabalhador": "",     //Vai ser montado pelo .java intermediário, carregando diretamente de 
                                            instance
    "associacaoDeMoradoresAssociadaDeTrabalhador": "",  //Vai ser montado pelo .java intermediário, de tabela 
                                                        associada a ser criada, com nomes das associações de moradores (etc)
    "partipacaoIndividualEstimadaNoTrabalhoSocial": 0,  //Vai ser montado pelo .java intermediário, carregando 
                                                        diretamente de instance
    "hoursAtElectronicPoint": 0,    //Vai ser montado pelo .java intermediário, carregando diretamente de instance
    "effectivelyPlannedProductionTime": 0   //Vai ser montado pelo .java intermediário, carregando diretamente de 
                                            instance












6.2.1) a) Desenhar, a partir das 3 telas (conselho, comitê e usuário não conselheiro) o banco de dados.
b) Com o desenho do banco de dados em mãos ir para as funções fetch que baixam os dados e fazem as buscas, as pesquisas, e ver se o desenho responde a todas elas (e como ele responderia, se fosse uma query ou não, etc).
c) A partir disso, ver a partir das querys possíveis ou a partir das bibliotecas possíveis (tipo Hibernate) quais seriam as que menos causariam impacto no código, nas funções fetch, para consulta de dados (de preferência alguma que não precise de query, tipo Hibernate para javascript).
d) A partir disso, escolher a tecnologia que usa isso, o método de consulta (se query ou tipo Hibernate), escolher com base na tecnologia que seja mais fácil ou mais automático (se já existe, se possível) de fazer a transição dos dados de .json para essa tecnologia, de maneira automática e consistente (seguindo ou dentro do modelo desenhado (ou modelado) de banco de dados inicialmente).
e) A partir disso, desenvolver os códigos ou scripts para essa transição (se já não tiver nada que faça automaticamente ou que facilite isso, mas provavelmente escrever em detalhes permite melhor modelagem), e executá-los, testá-los se estão consistentes etc (tudo isso com os dados reduzidos de data.json, não o completo ainda).
f) Começar a passar então os trechos de código fetch para a nova forma de chamada e consulta/busca de dados (se com query ou tipo Hibernate).
g) Testar e ver inconsistências, encontrá-las, e ver como resolvê-las. Resolvê-las todas, o sistema deve voltar funcionar exatamente como antes, mas mais rápido e fluido. Mais fluido, natural, profissional, aumentar a usabilidade, profissionalizar a usabilidade dos dados.
h) Preparar para a próxima etapa, ver se script python responde corretamente à mesma consulta, fazer outro que faça a mesma consulta, mudando a forma de leitura de dados nele, mas entregando a mesma saída, mantendo todo o resto na camada javascript e do cliente (que deve continuar usando .json para comunicação, se possível, mesmo que/se integrado com query ou Hibernate em algum momento, em alguns trechos).
i.1) Tendo funcionado, tendo atendido isso, passar para a próxima etapa, que é a preparação para novos scripts python de consulta e análise de dados, com geração de gráficos otimizados (personalizados, se possível, mais pra frente) etc.
i.2) [*** NOVA FUNCIONALIDADE, SERÁ NOVO SETOR INDEPENDENTE AQUI DO ARQUIVO DE ROADMAP]
        De repente com uma tabela, mais pra frente, uma tela ou trecho de tela, janela modal ou coisa do tipo, com um formulário, com todos os tipos de consultas possíveis e saídas possívels, com um python que responda a isso e gere a saída desejada, formatada, colorida, com textos, informações etc.


7) Pós otimização na persistência (velocidade e tamanho, fim do download de tudo e de busca em tudo)

7.1) Depois, gerar script que cria novos usuários não conselheiro, como Julia, com nomes reais associados ao local do mundo em que o usuário for criado. Perceba que ala tem um UUID, veja como isso é armazenado no arquivo de dados e veja como os dados dela são salvos em torno desse UUID e respeite isso. Crie 1 usuário para cada Conselho de Distribuição e Serviços que existe associado a cada bairro em todo o mundo existente no sistema. Use nomes de usuário para login fáceis e intuitivos de serem lembrados, e como senha use 123 para todos. 70% dos usuários criados devem ser mulheres. Para cada usuário criado já crie uma demanda que ele tenha feito (como se tivesse ido na tela para retirada de produtos e escolhido produtos serviços para retirada) escolha 3 produtos e 3 serviços existentes no sistema para cada usuário, não seja muito repetitivo, varie nas escolhas, para que pareçam usuários reais que tenham escolhido.Crie valores quaisquer e diferentes entre 30 a 100 horas de trabalho no ponto eletrônico de cada usuário criado, criado. Preencha devidamente e de maneira criativa e consistente cada campo criado no arquivo de dados.

7.2) Depois que eu fizer isso, continuar testando o script de gráficos do Amazonas, pra ver se aparece mais coisas.

7.3) Se tudo for criado certo, pedir pra ele ver os scripts criados e as condições e critérios de cada tipo e campo de dado, e criar um script capaz de criar do zero um novo arquivo de dados completo, com todas as especificações que dei para criação de dados de todas as parte do mundo e para criação de conselheiros e de usuários não conselheiros. Esse script só deve receber 1 parâmetro numérico, ali onde especifiquei que é para criar 2 de cada comitê ou conselho associado abaixo de cada conselho criado, e 2 conselheiros e 2 usuários conselheiros, tudo especificado e associado como solicitei, 2 setores diferentes de produção e 2 de serviço em cada bairro, esse número 2, usado em todas as regras que específico acima, agora nesse novo script pode ser variável, podendo ser 3 ou qualquer valor que o usuário especificar como parâmetro ao rodar o script, sendo 2 o padrão.

7.4) Depois que fizer o script acima, fazer um que faça o mesmo que acima, porém com dados numéricos diferentes, respeitando todas as condições, limites, faixas e critérios desses números, e mantendo todos os dados de texto inalterados. Esse novo script deve gerar dados números diferentes toda vez pois ele será usado para criar uma história, com cada arquivo novo data.json criado agora como se fosse os dados que existiram de fato em algum momento. Irei posteriormente fazer outro script para comparar esses arquivos data.json simulando uma análise histórica, mas não é pra fazer isso agora, agora é só pra fazer o que solicito inicial mente. O nome do arquivo criado deve ser dataANOMES.json, com o ano começando em 2024 e o mês 12, e indo mês a mês a partir do último criado. Quando for criar um novo ver se já não existe outro com esse padrão de nome criado, se sim, criar para o mês seguinte, por exemplo, o prêmio data202412.json, depois data202501.json e assim por diante.

7.5) Depois, criar script que faça um gráfico da variação da demanda dos 3 setores com maior demanda média no Brasil nos últimos 5 meses.

7.6) Todos os gráficos gerados usar o mesmo microserviceCanvaArea, aí só mundo o script, e depois só crio os botões ou o que for e os conectores para o script, o retorno de todos é tratado da mesma forma (para os gráficos, o mesmo depois para retorno escrito. Colocar pra responder em uma div específica. Manter o estilo, não mudar praticamente cores etc.

7.7)
- [OUTRO CAMPO, MAS QUE SAI DESSE:
OTIMIZAÇÃO DA PLANIFICAÇÃO (DOS CALCULOS LOCAIS DE (i) OTIMIZAÇÃO E DE (ii) ESTIMATIVA)]
Otimização da velocidade e desempenho dos códigos decentralizados de otimização da planificação e calculo das estimativas. Avaliar se é possível rodar no usuário programas python compilados (pra não precisar instalar e chamar todo o python), e a página web apenas faz chamadas locais (como o login online do LOL faz chamando o cliente local no usuário, passando essas informações ou recebendo dele informações por um link). O "servidor" local com os programas python deverá estar rodando. Caso ele instale esses programas no dispositivo dele;
- pegar alguns prompts e traduzir para python e incorporar como opções de pesquisa (já pré renderizadas, sem necessidade de IA ainda e pra rodar mais levemente e rapidamente, no programa)
    - listar algumas úteis, mas muito mais podem ser incluidas, criar pasta para isso
        - search
            - engines
                - arquivosComNomesDeBuscas.py //Com opcao de geração de arquivo .csv com busca dentro dele ou fora (uma pasta /search/export com arquivos py de exportação para .csv), em arquivo unico ou separado
            - graphs
                - arquivoGeradorDeGraficosAPartirDeDadosDeBuscaEQueIntermediaComClienteQueConsultouOuAlgoDoTipoTalvezColandoEmPastaCriadasDinamicamenteComNomeDasBuscasJaQueBuscasSaoFinitas.py
            - export

- historico gerenciado em python. a cada dia 28 gera 1 vez (se não existe, uma cópia do arquivo data.json dentro de uma pasta chamada history cujo nome sera data_anomesdia.json (pra ser consultavel))
- simulação teste de situação (randonSituationSimulatorTest.py): criar um código python que popula aleatoriamente todos os campos que faltam, passando pra ele as regras (limites numerios etc, que façam sentido, razoáveis)
- simulação teste de historia (randonHistorySimulatorTest.py): criar um código, baseado no anterior, que a partir de um arquivo cria um novo com novos dados, em que todos os campos numericos tem os dados modificados para valores próximos, com alguns poucos, aleatoriamente, variando um pouco mais

7) Ver se algum desses modelos que funcione em teste online possui versão offline (pra rodar no próprio server da planificação ou no próprio dispositivo (celular ou computador))

8) Escalabilidade Horizontal: Aplicação em Clusters com Balanceamento de Carga

8.1) A implementação de Cluster real deve ser de acordo com as melhores práticas DevOps e seus mais eficientes processos CI/CD (alguns já seminalmente implementados)

8.2) Usar "spawn" ou "exec" ao invés de "execSync" para executar microserviços (que tem inicio meio e fim breve, executam uma tarefa, entregam a resposta e terminam, não ficam rodando continuamente, e não são em larga escala, apenas para processamentos mais pesados, análise de dados, cálculos de planificação (o cálculo de estimativas e o cálculo de otimização, os dois principais/centrais da planificação)

8.3) Utilizar multiplas instâncias do servidor, para evitar overhead, balanceando melhor a carga:

pm2 start server.js -i max

8.4) Fazer o Load Balancer usando portas diferentes do 127.0.0.1:<3000, 3001 etc...>, formando um Cluster Virtual (que já melhora o desempenho), e num segundo passo, máquinas diferentes, formando Clusters Reais, para suportar melhor milhões de requisições:

sudo apt install nginx

http {
    upstream node_servers {
        server 127.0.0.1:3000;
        server 127.0.0.1:3001;
        server 127.0.0.1:3002;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://planecon.xyz;
        }
    }
}

9) Além da análise e da revolução no terreno do que hoje é unilateralmente chamado de Economia, expandir o código para abordar mais outras duas temáticas relacionadas à econômica no socialismo (porque a realidade não é feita de retalhos):

9.1) Análise e Revolução Política:
    Com sistema integrado, open-source (publicamente auditável), seguro e transparente de eleição para os Conselhos e Comitês

9.2) Análise e Revolução Social:
    Como sistema de censo e métricas sociais para análise de: a) taxa de variação das diversas formas de violência (análise discriminando a taxa para cada forma de violência)
    b) taxa de variação da quantidade de pessoas desnutridas, ou com insegurança alimentar ou situação de fome (tudo bem discriminado também)
    c) taxa de variação de pessoas sem moradia
    d) taxa de variação de pessoas sem emprego
    e) taxa de variação de pessoas sem acesso à educação, fora da escola, ou muito longe da idade recomendada para a turma em que estuda (em caso de menores de idade), de jovens e adultos que querem estudar e ainda não conseguem vaga (indicando a necessidade da construção de mais escolas e contratação de mais trabalhadores no setor)
    f) o mesmo para a saúde, com métricas de pacientes, doenças, leitos e hospitais
    g) muitas outras métricas podem ser sempre acopladas ao sistema, garantindo uma planificação crescente de todos os aspectos da vida, consequentemente desalienando. humanizando e libertando um a um.

    Todas essas taxas devem se manter negativas (ou seja, apontando um decrescimento no valor dessas variáveis). A partir das taxas com menor negatividade (que apontam menos decrescimento) e maiores números absolutos de incidência (não a taxa de variação aqui) se delinear, utilizando também da ferramenta da IA, os melhores planos para, atendem ao que já condiciona o sistema de planificação, se priorize esses setores mais críticos, sem deixar que os demais deixem de ser negativos nenhuma vez.

    É nesse sentido que a planificação econômica é também uma planificação social, direta e concreta, não indireta ou metafóricamente.

-----------------

Rascunhos temporários:

