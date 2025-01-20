async function handleLogin() {
    const usernameField = document.getElementById('username');
    const username = usernameField.value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showNotification('Preencha todos os campos de login.', false);
        return;
    }

    try {
        // Buscar dados
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();  // Parse dos dados em formato JSON

        //console.info("data: ");
        //console.log(data);

        // Verifica se o usuário existe e a senha corresponde
        user = data.users.find(
            user => user.username === username && user.password === password
        );

        if (user) {
            // Define os dados globais do usuário logado
            userIsLoggedIn = true;
            user = {
                username: user.username,
                instance: user.instance,
                pronoun: user.pronoun,
                jurisdiction: user.jurisdiction,
                preposition: user.preposition,
                instancePrepositionJurisdictionUUID: user.instancePrepositionJurisdictionUUID,
                uuid: user.uuid,
                name: user.name
            };

            // Realize outras ações de login aqui, se necessário
            
            if (user.pronoun === 'feminino') {
                showNotification(`Bem-vinda, ${user.name}!`, true);
            } else if (user.pronoun === 'masculino') {
                showNotification(`Bem-vindo, ${user.name}!`, true);
            } else {
                showNotification(`Bem-vinde, ${user.name}!`, true);
            }
            
            // Aplica a classe 'logged-in' ao #globeContainer para aplicar o estilo de login
            const globeContainer = document.getElementById('globeContainer');
            globeContainer.classList.add('logged-in'); // Adiciona a classe para alinhamento à direita
            
            // Exibe a div "logado"
            document.getElementById('logado').style.display = 'block'; // Torna visível
            
            // Oculta a seção de login
            document.getElementById('loginSection').style.display = 'none';
            userIsLoggedIn = true;
            document.getElementById('sendDataButton').style.display = 'inline-block'; // Exibe o botão para enviar dados
            
            // Controle de exibição das divs de telas com base na instância
            
        if (user.instance.includes('Conselho')) {
            document.getElementById('conselheiroDeConselho').style.display = 'block';
            document.getElementById('conselheiroDeComiteDeFabricaOuCampo').style.display = 'none';
            document.getElementById('conselheiroDeAssociacaoDeMoradores').style.display = 'none';
            document.getElementById('trabalhador').style.display = 'none';
            
        } else if (user.instance.includes('Comitê')) {
            document.getElementById('conselheiroDeComiteDeFabricaOuCampo').style.display = 'block';
            document.getElementById('conselheiroDeConselho').style.display = 'none';
            document.getElementById('conselheiroDeAssociacaoDeMoradores').style.display = 'none';
            document.getElementById('trabalhador').style.display = 'none';

            // Atualizar o título da segunda coluna
            const comiteColTitle = document.getElementById('comiteColTitle');
            comiteColTitle.value = user.instance === 'Comitê de Fábrica' ? 'Nome da Fábrica' : 'Nome do Campo';

            // Preencher tabela com valores padrão
            updateVetorTecnologicoTable();
            
        } else if (user.instance.includes('Trabalhador')) {
            document.getElementById('conselheiroDeComiteDeFabricaOuCampo').style.display = 'none';
            document.getElementById('conselheiroDeConselho').style.display = 'none';
            document.getElementById('conselheiroDeAssociacaoDeMoradores').style.display = 'none';
            document.getElementById('trabalhador').style.display = 'block';			
            
        } else {
            // Para Associação de Moradores ou outras instâncias
            document.getElementById('conselheiroDeConselho').style.display = 'none';
            document.getElementById('conselheiroDeComiteDeFabricaOuCampo').style.display = 'none';
            document.getElementById('conselheiroDeAssociacaoDeMoradores').style.display = 'block';
            document.getElementById('trabalhador').style.display = 'none';
        }
            
            // Chama automaticamente a função que recebe os dados online
            setTimeout(() => {
                fetchDataFromJsonBin();
                // Chama automaticamente a função que recebe os dados online
                setTimeout(() => {
                    scrollToEndOfPage();
                    openProducaoMetaModal();
                }, 2000);
            }, 1000);
            
            } else {
                showNotification('Usuário ou senha inválidos.', false);
                document.getElementById('logado').style.display = 'none'; 
                document.getElementById('conselheiroDeConselho').style.display = 'none';
                document.getElementById('conselheiroDeComiteDeFabricaOuCampo').style.display = 'none';
                document.getElementById('conselheiroDeAssociacaoDeMoradores').style.display = 'none';
            }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        showNotification('Erro ao autenticar. Tente novamente mais tarde.', false);
        document.getElementById('logado').style.display = 'none'; 
        document.getElementById('conselheiroDeConselho').style.display = 'none';
        document.getElementById('conselheiroDeComiteDeFabricaOuCampo').style.display = 'none';
        document.getElementById('conselheiroDeAssociacaoDeMoradores').style.display = 'none';
    }
}

async function handleRegister() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const pronoun = document.getElementById('pronoun').value;
    const instance = document.getElementById('instance').value;
    const name = document.getElementById('nameRegistration').value;
    
    let space = "";
    let preposition = "";
    let jurisdiction = "";
    let uuid = "";
    let uuidPreposition = "";

    if(instance.includes("Trabalhador")) {
        uuid = generateUUID();
        uuidPreposition = "UUID:";
    }
    else {
        space = " ";
        preposition = document.getElementById('preposition').value;
        jurisdiction = document.getElementById('jurisdiction').value.trim();
    }

    // Combina instance, preposition e jurisdiction
    const instancePrepositionJurisdictionUUID = (`${instance=='Trabalhador'?'Worker':instance}${space}${preposition}${space}${jurisdiction}${space}${uuidPreposition}${space}${uuid}`).trim();

    if (!username || !password || !instance || !pronoun) {
        if(!instance.includes("Trabalhador") && (!jurisdiction || !preposition))
        showNotification('Preencha todos os campos corretamente.', false);
        return;
    }

    try {
        
        // Buscar dados
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();  // Parse dos dados em formato JSON

        // Certifique-se de que a chave "users" exista no objeto
        if (!data.users) {
            data.users = [];
        }

        // Verifica se o nome de usuário já está registrado
        if (data.users.some(user => user.username === username)) {
            showNotification('Nome de usuário já registrado. Escolha outro.', false);
            return;
        }

        // Adiciona o novo usuário com todos os dados
        data.users.push({
            username,
            password,
            instance,
            pronoun,
            jurisdiction,
            preposition,
            instancePrepositionJurisdictionUUID,
            uuid,
            name
        });

        // Salva de volta online
        await fetch(apiUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });


        showNotification('Usuário registrado com sucesso!', true);
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        showNotification('Erro ao registrar usuário. Tente novamente mais tarde.', false);
    }
}

// Exibe os campos de registro ao clicar no botão "Cadastre-se"
function showRegistrationFields() {
    const registrationFields = document.getElementById('registrationFields');
    registrationFields.style.display = 'block'; // Exibe os campos
}

// Função para mostrar os campos adicionais quando o Instância é selecionado
function showFields() {
    const select = document.getElementById('instance');
    const additionalFields = document.getElementById('additionalFields');
    
    if (select.value && !select.value.includes("Trabalhador")) {
        additionalFields.style.display = 'flex'; // Exibe os campos adicionais
    } else {
        additionalFields.style.display = 'none'; // Oculta os campos adicionais
    }
}

// Função para mostrar ou ocultar a seção de Login
   function showLoginSection() {
    const loginSection = document.getElementById("loginSection");
    loginSection.style.display = "block"; // Torna a seção de login visível
    const loginButton = document.getElementById("loginButton");
    loginButton.style.display = "none"; // Oculta o botão "Faça Login"
    // Ocultar os campos de registro, caso estejam visíveis
    document.getElementById('registrationFields').style.display = 'none';
    
    // Rola a página para o topo
    
    // Rola suavemente para o topo da página
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    const usernameField = document.getElementById('username');
    usernameField.focus(); // Move o cursor para o campo "Nome de Usuário"
    
    
    
}

// Manter os dados inseridos no formulário quando clicar em "Faça Login"
document.getElementById("loginButton").addEventListener("click", showLoginSection);

// Função para mostrar o campo de jurisdição quando uma opção é selecionada
function showJurisdiction() {
    const select = document.getElementById('instance');
    const jurisdictionContainer = document.getElementById('jurisdictionContainer');
    
    // Exibe o campo apenas se uma opção válida for selecionada
    if (select.value) {
        jurisdictionContainer.style.display = 'flex'; // Exibe o campo com layout flex
        jurisdictionContainer.style.alignItems = 'center'; // Centraliza o rótulo e o campo
    } else {
        jurisdictionContainer.style.display = 'none'; // Oculta o campo
    }
}

// Função para atualizar o texto do conselho
function updateCouncilText(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Impede comportamento padrão do Enter

        const instance = document.getElementById("instance").value;
        const jurisdiction = document.getElementById("jurisdiction").value.trim();
        const preposition = document.getElementById("preposition").value;
        const infoText = document.getElementById("infoText");

        if (!(instance && jurisdiction && preposition)) {
            showNotification("Por favor, preencha todos os campos obrigatórios.", false);
        }
    }
}

// Adiciona o evento de Enter no campo de jurisdição
document.getElementById("jurisdiction").addEventListener("keydown", updateCouncilText);

// Mostra os campos adicionais ao selecionar o Instância
document.getElementById("instance").addEventListener("change", showFields);

function logout() {
    userIsLoggedIn = false; // Altere o estado do usuário para deslogado
    
    document.getElementById('sendDataButton').style.display = 'none'; // Oculta o botão de enviar dados

    let title = "";
    if(!user.instancePrepositionJurisdictionUUID.includes("WorkerUUID")){
        if (user.pronoun === 'feminino') {
            title = 'Conselheira';
        } else if (user.pronoun === 'masculino') {
            title = 'Conselheiro';
        } else {
            title = 'Conselheire';
        }
    }

    showNotification(`Até a próxima, ${title} ${user.name}!`, true); // Mensagem de confirmação
    
    // Limpar os campos do formulário
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('instance').value = '';
    document.getElementById('pronoun').value = '';
    document.getElementById('jurisdiction').value = '';
    document.getElementById('preposition').value = '';
    document.getElementById('nameRegistration').value = '';
    document.getElementById('uuidQRCode').innerHTML = '';
    clearTable();
    user = null;
    
    updateInfoBar(); // Atualiza a barra de informações para refletir o estado de logout
    
    // Rola suavemente para o topo da página
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    // Esconde a div "logado"
    document.getElementById('logado').style.display = 'none'; // Torna invisível
    
     // Remove a classe 'logged-in' do #globeContainer para voltar ao alinhamento centralizado
    const globeContainer = document.getElementById('globeContainer');
    globeContainer.classList.remove('logged-in'); // Remove a classe para voltar ao centro
    
}
