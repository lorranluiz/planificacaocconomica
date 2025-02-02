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

3.4) A Confirmação do Recebimento/Retirada

- Botão que faça isso, ao lado do produto (Confirmar Recebimento/Retirada), que executa o mesmo que excluir, porém ele desconta na carga horária trabalhada do trabalhador (a função inversa da que calcula o valor que ele pode gastar, ver formula fazer sua inversa e ver se zera horas trabalhadas (acumuladas) quando deve zera, isto é, quando gasta tudo, como prova dos nove, teste final) 

Já vai descontar automaticamente.
Depois ver se vai salvar esse descontado e carrega-lo, ao inves de descontar na hora que carrega, mantendo o total trabalhado a vida toda sempre (pq não posso resetar por mês etc)
E como vai tirar o produto ou serviço dessa lista de demanda do usuário, se será quando ele efetivamente receber na sua casa o item e confirmar o recebimento (ou confirmar a retirada)
        |----------- pode ter um botão que faça isso, ao lado do produto (Confirmar Recebimento/Retirada), que executa o mesmo que excluir, porém ele desconta na carga horária trabalhada do trabalhador (a função inversa da que calcula o valor que ele pode gastar, ver formula fazer sua inversa e ver se zera horas trabalhadas (acumuladas) quando deve zera, isto é, quando gasta tudo, como prova dos nove, teste final)

Explicação Teórica:
Capital é trabalho acumulado no período anterior.
Existe trabalho acumulado na economia planificada.
Porém, o trabalho só pode ser acumulado pela própria pessoa que trabalhou, não por outra, que é o que determina a exploração (isto é, não existe exploração).
O Estado Operário apenas realoca obrigatoriamente parte do trabalho acumulado, de forma análoga ao imposto, mas essencialmente diferente, pois todo o realocado vai de volta para os próprios trabalhadores que obrigatoriamente só o recebem se trabalharem em um dos setores essenciais, não existe vantagem, privilégio, mordomia, sevidão, não vai para setor bancário, especulativo nem alimenta nenhum capital produtivo ou não, é a justiça final que se autojustifica, sem classes acima explorando as de baixo.


3.4) Salvar e Carregar campo com o total que o usuário possui para gastar, já descontando o que já gastou. Não processar na hora, salvar e carregar dado já calculado salvo diretamente num campo do "comitê" que é o UUID do usuário. Incluir nos dados salvos no sendDataToJson etc.

[~] 3.5) Mas trabalhador não conselheiro não tem vetor tecnológico, criar tbm em salvar (sendData) um vetor tecnológico, usar a mesma variável que já salva como vetor tecnológico do "comitê de fábrica em questão", no caso um trabalhador não conselheiro, onde esse vetor tecnológico tem todos os campos preenchidos com. Um símbolo, "uuid:UUID do usuário|\"product\":{\"name\": \"${product.name}\", \"type\": \"${product.type}\", \"socialCost\": ${product.socialCost}}" (uma pseudo-entrada para reconstruir o objeto depois, na leitura) com "destryngfying" ou algo equivalente.  O valor da damanda, propriamente dito, embora exista tbm no objeto product, estará no vetor demanda, na mesma ordem de índice que esse vetor aqui, "vetor tecnológico". Então só carregar (no fetchData, se usuário com UUID, trabalhador não conselheiro) ler o vetor demanda para atribuir na lista (setlist ou o que for) de produtos que o usuário adicionou e salvou na sua lista para retirada. Popular essa lista, carregar, de acordo como product.type de cada produto.  Na hora de somar pra fazer a média e contar para a média, ser valor conter a palavra "uuid", pular. Depois, isso pode ser usado para rastrear os produtos que um usuário solicitou (ou não, mas essa informação fica). O "comitê de fábrica" que é o usuário vai salvar e carregar essas informações no seu "vetor tecnológico" e no seu vetor demanda.


4) Segurança

4.1) Colocar uma pseudo-criptografia no código enviado para o navegador, de modo que seja impossível alterar dados de campos manualmente por dentro do código fonte e mandar salvar.
Faça isso colocando um "embaralhador de código" que embaralha aleatoriamente, cada vez que o código é embaralhado é única, sem chave que o permita ser desembaralhado, sem que nenhum dos campos de texto ou numérico possa ter seu valor identificado diretamente no código fonte do navegador,
mas que seja lido e funciuone normalmente no navegador, só está embaralhado.

4.2) Colocar a leitura de parâmetro recebido pelo pm2 ao server direto na linha de comando, que informe ao server.js (chamdo pelo pm2) quando é para ele enviar o código embaralhado ou não.
No desenvolvimento, suspenso o banco de dados real, para algum debug em tempo de produção, não envia embaralhado, mas via de regra envia embaralhado
A função deve informa se "não envia embaralhado", pois se não for informado nada ou passado parâmetro nenhum ou inválido é para embaralhar.
A principio esse parâmetro não será uma chave que só funciona no servidor, apenas um parâmetro, mas poderia ser.

4.3) O código embaralhado não deve ser enviado diretamente, mas deve haver uma página intermediária que carrega todo o código fonte (o insere no DOM), essa intermediária inicial que é também embaralhada e enviada para o navegador, apenas com uma função pequena de carregar via AJAX todo o código fonte embaralhado da página e o iniciar.
pra evitar enviar o código todo para o usuário, se ele tentar ver no navegador não vai ver nada além dessa função reduzida e já tbm toda embaralhada no meio de uma poluição (ruido) embaralhada tbm, impossível de ser decifrada.
Pedir para ele inserir varias funções que não fazem nada no meio, só para confundir quem tentar desembaralhar;

4.4) Ver se HTTPS é criptografado ou se pode ser acessado e quebrado por algum governo, se sim, ver se há protocolo alternativo reconhecido por todos os navegadores atuais.

4.5) Ver o código fonte não o torna vulnerável, pois o usuário pode tentar mudar o código fonte no repositório, mas não o muda no servidor, e saber como ele funciona não o ajuda a decifrar o misturador aleatório e alterar dados na camada front-end em tempo de execução e salvá-los, fraudando o sistema.
É como se o sistema estivesse "compilado" e não dá pra mexer nele, mudar seu conteúdo nem nada, em tempo de execução, se "recompila-lo" com seu novo codigo fonte alterado (que seria uma atualização no repositório e deploy no servidor de produção, mas isso para qualquer aplicação em qualquer linguagem).

4.6) Criar um arquivo secure.js, pois apesar de parecer vulnerável fazer isso, caso alguém mexa nessa lógica de segurança será visível, ficará explícito e poderá ser desfeito facilmente, restaurando ou aperfeiçoando os mecanismos de segurança a cada falha ou brecha.

-------------------

5) Usar comando "pm2 reload all", depois que atualizar a partir do código do github, para deploy sem downtime. Ver se meu parâmetro de pseudo-criptografia funciona com reload tbm, testar. Se não, ver alternativa, mas manter solução de pseudo-criptografia com criptografia real (HTTPS ou alternativa).

-----------------

Rascunhos temporários:

"WorkerUUID:UyO6ebhxTGl4grkEGEK0HLoj": {

 "productNames": [
      "Automóvel",
      "Computador",
      "Celular"
    ],
"sectorNames": [
    "Produção de Automóvel",
    "Produção de Computador",
    "Produção de Celular"
],
"finalDemand": [
    1,
    0,
    0
],

--------

api.js

const dataToSave = {
productNames: getProductNames(),
sectorNames: getSectorNames(),
finalDemand: getFinalDemand(),

----------

main.js

function getProductNames() {

function getSectorNames() {

function getFinalDemand() {

