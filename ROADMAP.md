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

[~] 6) Testar analise de dados do data.json no deepseek ou outro
- [ok] deepseek com problema de uploads de arquivos, mas no chatgpt funcionou perfeitamente
- [~] Microserviços: pegar códigos python gerados e incorporar ao código, ver como exibir para o cliente. usar códigos do python como microserviços, o PM2 e Node já gerenciam isso para que chamadas a programas python se comportem como microserviços separadas, para cada usuário que fez a requisição.

[ok] Criar um botão, na tela inicial, de login, que quando o usuário clica exibe um Alert cujo o conteúdo de texto foi processado em um python que rodou no servidor. Colocar inicialmente "Hello, World, Python no servidor!"

6.1)
[ok][~] 6.1.1) Criar scripts que criem arquivo de schema com tipos de dados e constraints (condições, ranges, etc). Usar campos de cadastro de usuário e campos de entrada das seções (especificar o nome de todas as seções, pra ele entender do que falo) e código que salva e lê, fetchData e sendData etc (usar isso tudo como contexto). Se ele não entender explicar cada campo que tipo de dado e range de valores pra ele gerar. Falar pra gerar conselhos e comitês com base em nomes reais de bairros, cidades, estados, regiões, países e continentes, devidamente associados, de modo que faça sentido. Preencha devidamente e de maneira criativa e consistente cada campo criado no arquivo de dados.

6.1.2) Depois criar script que cria conselhos de cada continente, que ainda não tiver sido criado, associados ao Conselho da Terra, em seguida de cada região de cada continente que não tiver sido criada, em seguida de 2 países de cada região de cada continente, em.seguida, 2 regiões nacionais (exemplo, sudeste, norte, sul, centro-oeste etc) de cada país criado, em seguida, 2 estados de cada região nacional de cada país criado, em seguida 2 cidades de cada estado criado, em seguida 2 bairros de cada cidade criada, e 1 Conselho de Distribuição e Serviços para cada bairro criado, garantindo que cada conselho está associado a um conselho acima criado anteriormente que de fato faça sentido com a realidade (por exemplo, um país que no mundo real está na região Leste do Continente Europeu deve estar associado a essa região, e essa região a esse continente, não com outra região de outro continente, e assim por diante com tudo o que solicitei que o script crie. Para cada novo conselho criado já cadastre um novo conselheiro para esse conselho, use um nome que tenha a ver com o país daquele conselho, para ficar mais real, crie os nomes de usuário para login fáceis de intuitivos de lembrar, e uma mesma senha para todos, 123. 80% dos conselheiros criados devem ser mulheres. Não apague informação já existente no arquivo de dados, só crie essas novas. Para cada bairro do mundo criado por esse script devem estar sendo oferecidos 3 serviços e serem produzidos produtos de 2 setores diferentes nesse bairro (mas podem ser setores que existem em outros bairros ou setores novos, crie alguns setores e serviços novos para parecer real os dados, coloque os nomes dos Comitês, Conselhos, Setores, Produtos e Serviços, tudo e todos traduzidos para português, para que eu entenda, pois falo português). Preencha devidamente e de maneira criativa e consistente cada campo criado no arquivo de dados.

6.1.3) Depois, gerar script que cria novos usuários não conselheiro, como Julia, com nomes reais associados ao local do mundo em que o usuário for criado. Perceba que ala tem um UUID, veja como isso é armazenado no arquivo de dados e veja como os dados dela são salvos em torno desse UUID e respeite isso. Crie 1 usuário para cada Conselho de Distribuição e Serviços que existe associado a cada bairro em todo o mundo existente no sistema. Use nomes de usuário para login fáceis e intuitivos de serem lembrados, e como senha use 123 para todos. 70% dos usuários criados devem ser mulheres. Para cada usuário criado já crie uma demanda que ele tenha feito (como se tivesse ido na tela para retirada de produtos e escolhido produtos serviços para retirada) escolha 3 produtos e 3 serviços existentes no sistema para cada usuário, não seja muito repetitivo, varie nas escolhas, para que pareçam usuários reais que tenham escolhido.Crie valores quaisquer e diferentes entre 30 a 100 horas de trabalho no ponto eletrônico de cada usuário criado, criado. Preencha devidamente e de maneira criativa e consistente cada campo criado no arquivo de dados.

6.1.4) Depois que eu fizer isso, continuar testando o script de gráficos do Amazonas, pra ver se aparece mais coisas.

6.1.5) Se tudo for criado certo, pedir pra ele ver os scripts criados e as condições e critérios de cada tipo e campo de dado, e criar um script capaz de criar do zero um novo arquivo de dados completo, com todas as especificações que dei para criação de dados de todas as parte do mundo e para criação de conselheiros e de usuários não conselheiros. Esse script só deve receber 1 parâmetro numérico, ali onde especifiquei que é para criar 2 de cada comitê ou conselho associado abaixo de cada conselho criado, e 2 conselheiros e 2 usuários conselheiros, tudo especificado e associado como solicitei, 2 setores diferentes de produção e 2 de serviço em cada bairro, esse número 2, usado em todas as regras que específico acima, agora nesse novo script pode ser variável, podendo ser 3 ou qualquer valor que o usuário especificar como parâmetro ao rodar o script, sendo 2 o padrão.

6.1.6) Depois que fizer o script acima, fazer um que faça o mesmo que acima, porém com dados numéricos diferentes, respeitando todas as condições, limites, faixas e critérios desses números, e mantendo todos os dados de texto inalterados. Esse novo script deve gerar dados números diferentes toda vez pois ele será usado para criar uma história, com cada arquivo novo data.json criado agora como se fosse os dados que existiram de fato em algum momento. Irei posteriormente fazer outro script para comparar esses arquivos data.json simulando uma análise histórica, mas não é pra fazer isso agora, agora é só pra fazer o que solicito inicial mente. O nome do arquivo criado deve ser dataANOMES.json, com o ano começando em 2024 e o mês 12, e indo mês a mês a partir do último criado. Quando for criar um novo ver se já não existe outro com esse padrão de nome criado, se sim, criar para o mês seguinte, por exemplo, o prêmio data202412.json, depois data202501.json e assim por diante.

6.1.7) Depois, criar script que faça um gráfico da variação da demanda dos 3 setores com maior demanda média no Brasil nos últimos 5 meses.

6.1.8) Todos os gráficos gerados usar o mesmo microserviceCanvaArea, aí só mundo o script, e depois só crio os botões ou o que for e os conectores para o script, o retorno de todos é tratado da mesma forma (para os gráficos, o mesmo depois para retorno escrito. Colocar pra responder em uma div específica. Manter o estilo, não mudar praticamente cores etc.

6.2)
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

