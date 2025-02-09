const BaseMicroservice = require('../../base/BaseMicroservice');
const handlers = require('./server/handlers');

class GraficoTrabalhadoresAmazonas extends BaseMicroservice {
    constructor() {
        super('graficoTrabalhadoresAmazonas', {
            //Acima o nome do microsserviço, usado para a rota, abaixo as funções de deste microsseviço aqui, com o nome que será chamado no client, e a função que será executada no servidor
            analisarEGerarGraficoTrabalhadoresAmazonas: handlers.analisarEGerarGraficoTrabalhadoresAmazonas //,
            //Inserir mais funções como a linha aqui acima, se necessário, com virgula no final das linhas, menos da ultima
        });
    }
}

module.exports = new GraficoTrabalhadoresAmazonas();
