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

3.1) Na hora de salvar, verificar se é trabalhador não conselheiro (com UUID ou algo do tipo), se ja tiver essa verificação usar ela. Se for, criar um objeto, o mesmo para demanda de conselho, alimentar a mesma variável que sendData salva para demanda de conselho, juntando a demanda do vetor de bens de consumo e serviço. Teoricamente isso já deve estar na matriz tecnológica.

3.2) Só que a ordem que o usuário vai salvar não é a de sua matriz tecnológica pq ele não tem matriz tecnológica, usar a mesma lógica do comitê de fábrica, que tbm não tem matriz tecnológica e é usado na estimativa do conselho acima. Tem só um vetor tecnológico.

3.3) Mas trabalhador não conselheiro não tem vetor tecnológico, criar tbm em salvar (sendData) um vetor tecnológico, usar a mesma variável que já salva como vetor tecnológico do "comitê de fábrica em questão", no caso um trabalhador não conselheiro, onde esse vetor tecnológico tem todos os campos preenchidos com. Um símbolo, "uuid:UUID do usuário|\"product\":{\"name\": \"${product.name}\", \"type\": \"${product.type}\", \"socialCost\": ${product.socialCost}}" (uma pseudo-entrada para reconstruir o objeto depois, na leitura) com "destryngfying" ou algo equivalente.  O valor da damanda, propriamente dito, embora exista tbm no objeto product, estará no vetor demanda, na mesma ordem de índice que esse vetor aqui, "vetor tecnológico". Então só carregar (no fetchData, se usuário com UUID, trabalhador não conselheiro) ler o vetor demanda para atribuir na lista (setlist ou o que for) de produtos que o usuário adicionou e salvou na sua lista para retirada. Popular essa lista, carregar, de acordo como product.type de cada produto.  Na hora de somar pra fazer a média e contar para a média, ser valor conter a palavra "uuid", pular. Depois, isso pode ser usado para rastrear os produtos que um usuário solicitou (ou não, mas essa informação fica). O "comitê de fábrica" que é o usuário vai salvar e carregar essas informações no seu "vetor tecnológico" e no seu vetor demanda.

-------------------

4) Usar comando "pm2 reload all", depois que atualizar a partir do código do github, para deploy sem downtime.

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

