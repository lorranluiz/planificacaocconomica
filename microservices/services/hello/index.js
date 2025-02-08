const BaseMicroservice = require('../../base/BaseMicroservice');
const handlers = require('./server/handlers');

class HelloMicroservice extends BaseMicroservice {
    constructor() {
        super('hello', {
            processarEExibirHelloWorld: handlers.processarEExibirHelloWorld,
            processarEExibirHelloWorld2: handlers.processarEExibirHelloWorld2
        });
    }
}

module.exports = new HelloMicroservice();
