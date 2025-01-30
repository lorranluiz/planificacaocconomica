let addedProducts = new Set();
let numeroAproximadoDeTrabalhadores = 1600000; //Ordem de trabalhadores, de teste
//let numeroAproximadoDeTrabalhadores = 4000000000; //Para quando forem 4 bilhões de trabalhadores
//Quando tiver cerca de 4 bilhões (4*10^9) de trabalhadores "1e13", ou seja,
// (nº trabalhadores /4)*10^4 = 1e13 (aproximadamente, quando 4 bilhões de trabalhadores)
let socialWorkAndCostScale = (numeroAproximadoDeTrabalhadores/4)*10^4;
let unidade = "ℳ";
let partipacaoIndividualEstimadaNoTrabalhoSocialOriginal = 0;
let totalSocialCostDiscount = 0; //Sempre já formatado na escala

class Product {
  constructor(name = "Nome indefinido", type = "bemDeConsumo", socialCost = null, productionTimesOfProducts = 0.01) {
    this.name = name;
    this.type = type;
    this.socialCost = socialCost;
    this.formatedSocialCost = `${unidade} 0,00`;
    this.productionTimesOfProducts = productionTimesOfProducts;
    this.totalSocialCostWithDemmand = 0; //Sempre já formatado na escala
    this.demmand = 0;
    this.index = 0;
    this.floatFormatProductSocialCost = 0;
    this.formatProductSocialCost(); //popula formatedSocialCost
    this.socialCostFormated = false;
    this.totalSocialCostWithDemmandTest = 0; //Sempre já formatado na escala
    this.demmandTest = 0;
  }

  clone() {
    return new Product(this.name, this.type, this.socialCost);
  }

  setProductionTimesOfProducts(productionTimesOfProducts) {
    this.productionTimesOfProducts = productionTimesOfProducts;
    this.socialCost = productionTimesOfProducts/totalSocialWork;
    this.socialCostFormated = false;
    this.formatProductSocialCost(); //popula formatedSocialCost
    //console.info("instancia de Product->socialCost: ");
    //console.log(this.socialCost);
  }

  setDemmand(demmand) {

    if(!this.socialCostFormated){
        //Se o socialCost ainda não foi formatado na escala, formatamos ele na escala
        this.formatProductSocialCost();
    }

    this.demmand = demmand;
    this.totalSocialCostWithDemmand = demmand*this.socialCost;
  }

  setDemmandTest(demmandTest) {

    if(!this.socialCostFormated){
        //Se o socialCost ainda não foi formatado na escala, formatamos ele na escala
        this.formatProductSocialCost();
    }

    this.demmandTest = demmandTest  ;
    this.totalSocialCostWithDemmandTest = demmandTest*this.socialCost;
  }

  formatProductSocialCost(){

    if(this.socialCostFormated){
        return;
    }

    this.socialCostFormated = true;

    if (isNaN(this.socialCost) || this.socialCost == null) {
        this.socialCost = 0.00;
        return;
    }

    //console.info("formatProductSocialCost->socialWorkAndCostScale: ");
    //console.log(socialWorkAndCostScale);

    this.socialCost = this.socialCost*Number(socialWorkAndCostScale).toFixed(2);

    this.formatedSocialCost = `${unidade} ${formatToTwoDecimals(this.socialCost)}`;

  }

}

function plannedDistribution(worldSectorNames, productionTimesOfProducts) {
    const bensDeConsumoTableBody = document.querySelector("#bensDeConsumoTable tbody");
    const servicosTableBody = document.querySelector("#servicosTable tbody");
    const showcaseDiv = document.getElementById("plannedDistributionShowcase");

    // Arrays para armazenar os itens disponíveis
    const bensDeConsumoProducts = [];
    const servicosProducts = [];

    document.getElementById("socialWorkAndCostScale").innerHTML = `${unidade} = %${socialWorkAndCostScale.toExponential(0).replace("+", "")}`;
    document.getElementById("unidade").innerHTML = unidade;

    // Separar os itens em suas respectivas categorias
    worldSectorNames.forEach((itemSectorName, index) => {
        if (itemSectorName.includes("Produção")) {
            let bemDeConsumo = new Product();
            bemDeConsumo.index = index;
            bemDeConsumo.type = "bemDeConsumo";
            bemDeConsumo.name = itemSectorName.replace("Produção de", "");
            bemDeConsumo.setProductionTimesOfProducts(productionTimesOfProducts[index]);
            bensDeConsumoProducts.push(bemDeConsumo);
        } else {
            let servico = new Product();
            servico.index = index;
            servico.type = "servico";
            servico.name = itemSectorName;
            servico.setProductionTimesOfProducts(productionTimesOfProducts[index]);
            servicosProducts.push(servico);
        }
    });

    // Limpar as tabelas
    bensDeConsumoTableBody.innerHTML = "";
    servicosTableBody.innerHTML = "";
    showcaseDiv.innerHTML = "";

    // Criar apenas os campos de busca para ambas as tabelas
    createSearchRow(bensDeConsumoTableBody, bensDeConsumoProducts);
    createSearchRow(servicosTableBody, servicosProducts);

    // Função para criar o showcase de produtos
    function createProductShowcase(products) {
        let row = document.createElement("div");
        row.className = "row justify-content-center"; // Centralizar a linha

        products.forEach((product, index) => {
            const col = document.createElement("div");
            col.className = "col-2"; // 6 produtos por linha
            col.style.flex = "0 0 14%"; // Ajustar a largura da coluna
            col.style.maxWidth = "14%"; // Ajustar a largura da coluna
            col.style.padding = "10px"; // Espaçamento entre os produtos
            col.style.marginLeft = "1%"; // Adicionar margem à esquerda para centralizar

            const card = document.createElement("div");
            
            if (product.type === "bemDeConsumo") {
                card.classList.add('card', 'bensDeConsumoDistribuicaoClass');
            } else {
                card.classList.add('card', 'servicosDistribuicaoClass');
            }
            card.style.cursor = "pointer";

            const img = document.createElement("img");
            img.src = "https://http2.mlstatic.com/D_NQ_NP_994262-MLA78902848202_092024-O.webp";
            img.className = "card-img-top";
            img.alt = product.name;
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.borderRadius = "10px"; // Bordas arredondadas

            const cardBody = document.createElement("div");
            cardBody.className = "card-body";

            const cardTitle = document.createElement("h5");
            cardTitle.className = "card-title";
            cardTitle.textContent = product.name;

            const cardText = document.createElement("p");
            cardText.className = "card-text";
            cardText.textContent = `Custo Social de Produção: ${product.formatedSocialCost}`; // Valor de exemplo

            const button = document.createElement("button");
            button.className = "btn btn-primary";
            button.textContent = "Retirar";
            button.onclick = () => {
                if (product.type === "bemDeConsumo") {
                    addItemToTable(bensDeConsumoTableBody, product);
                } else {
                    addItemToTable(servicosTableBody, product);
                }
            };

            cardBody.appendChild(cardTitle);
            cardBody.appendChild(cardText);
            cardBody.appendChild(button);
            card.appendChild(img);
            card.appendChild(cardBody);
            col.appendChild(card);
            row.appendChild(col);

            // Adicionar uma nova linha a cada 6 produtos
            if ((index + 1) % 6 === 0) {
                showcaseDiv.appendChild(row);
                row = document.createElement("div");
                row.className = "row justify-content-center"; // Centralizar a linha
            }
        });

        // Adicionar a última linha se não estiver vazia
        if (row.children.length > 0) {
            showcaseDiv.appendChild(row);
        }
    }

    // Criar o showcase para ambos os tipos de itens
    createProductShowcase(bensDeConsumoProducts);
    createProductShowcase(servicosProducts);
    document.getElementById('tabBensDeConsumo').click(); //Por padrão inicia mostrando os bens de consumo
}

// Função para adicionar item à tabela
function addItemToTable(tableBody, product) {

    if (addedProducts.has(product)) return;

    //Testamos se a inclusão desse produto, com demanda inicial 1, não gera um custo social maior que a partipacao Individual Estimada No Trabalho Social
    product.setDemmandTest(1);

    if (!atualizarTotalSocialCostDiscountTest(product)) {
        return; //Se o custo social gerado pela inclusão desse produto com demanda inicial 1 é maior que a partipacao Individual Estimada No Trabalho Social, não adicionamos o produto
    }
        
        const row = document.createElement("tr");
        
        const nameCell = document.createElement("td");
        const removeBtn = document.createElement("span");
        removeBtn.textContent = "[-] ";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.color = "red";
        removeBtn.onclick = () => {
            removeItemFromTable(row, product); //Remove o item da tabela e atualiza o totalSocialCostDiscount
        };
        
        nameCell.appendChild(removeBtn);
        nameCell.appendChild(document.createTextNode(product.name));

        const demandaCell = document.createElement("td");
        const demandaInput = document.createElement("input");
        demandaInput.type = "number";
        demandaInput.id = product.index;
        demandaInput.value = 1;
        demandaInput.previousValue = demandaInput.value;
        demandaInput.onchange = () => {
            checkDemandAndRecalculate(product, demandaInput);
        };

        demandaCell.appendChild(demandaInput);

        row.appendChild(nameCell);
        row.appendChild(demandaCell);
        tableBody.appendChild(row);
        addedProducts.add(product);

        product.setDemmand(1); //Quando adicionar um produto pela primeira vez, automaticamente ele é adicionado com demanda 1
            
        atualizarTotalSocialCostDiscount(product); //Atualiza no calculo e na tela

}

// Função para criar a linha de busca
function createSearchRow(tableBody, products) {
    
    console.info("170: products: ");
    console.log(products);

    const searchRow = document.createElement("tr");
    const searchCell = document.createElement("td");
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search...";
    searchInput.className = "form-control";

    searchInput.addEventListener("input", function () {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchTerm));
        updateTableWithSearchResults(tableBody, filteredProducts);
    });

    searchCell.appendChild(searchInput);
    searchRow.appendChild(searchCell);
    tableBody.appendChild(searchRow);
}

// Função para atualizar a tabela com os resultados da busca
function updateTableWithSearchResults(tableBody, products) {
    // Limpar as linhas de resultados anteriores
    while (tableBody.rows.length > 1) {
        tableBody.deleteRow(1);
    }

    products.forEach(product => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.textContent = product.name;
        row.appendChild(cell);
        tableBody.appendChild(row);
    });
}

document.getElementById('tabBensDeConsumo').addEventListener('click', function() {
    document.querySelectorAll('.bensDeConsumoDistribuicaoClass').forEach(item => {
        item.style.display = 'block';
    });
    document.querySelectorAll('.servicosDistribuicaoClass').forEach(item => {
        item.style.display = 'none';
    });
});

document.getElementById('tabServicos').addEventListener('click', function() {
    document.querySelectorAll('.bensDeConsumoDistribuicaoClass').forEach(item => {
        item.style.display = 'none';
    });
    document.querySelectorAll('.servicosDistribuicaoClass').forEach(item => {
        item.style.display = 'block';
    });
});

function createSearchRow(tableBody, products) {
    // Criar linha de busca
    const searchRow = document.createElement("tr");
    const searchCell = document.createElement("td");
    const searchContainer = document.createElement("div");
    searchContainer.style.position = "relative";
    searchContainer.style.alignContent = "center";
    searchContainer.style.alignItems = "center";
    searchContainer.style.justifyContent = "center";
    searchContainer.style.alignSelf = "center";
    searchContainer.style.width = "500px";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Digite para buscar...";
    
    // Criar dropdown para autocomplete
    const dropdown = document.createElement("div");
    dropdown.style.cssText = `
        position: absolute;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: rgba(100, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-top: none;
        z-index: 1000;
        display: none;
    `;

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(dropdown);
    searchCell.appendChild(searchContainer);
    searchRow.appendChild(searchCell);
    searchRow.appendChild(document.createElement("td")); // Célula vazia para alinhamento
    tableBody.appendChild(searchRow);

    // Array para armazenar itens já adicionados
    //Por algum motivo essa mesma função em @plannedDistribution.js se chamada aqui não funciona corretamente, mesmo ajustando os parâmetros.
    //Por isso está duplicada, existe aqui e lá.
    function addItemToTable(product) {
        if (addedProducts.has(product)) return;
        
        const row = document.createElement("tr");
        
        const nameCell = document.createElement("td");
        const removeBtn = document.createElement("span");
        removeBtn.textContent = "[-] ";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.color = "red";
        removeBtn.onclick = () => {
            removeItemFromTable(row, product); //Remove o item da tabela e atualiza o totalSocialCostDiscount
        };
        
        const itemName = product.name;
        nameCell.appendChild(removeBtn);
        nameCell.appendChild(document.createTextNode(itemName));

        const demandaCell = document.createElement("td");
        const demandaInput = document.createElement("input");
        demandaInput.type = "number";
        demandaInput.value = 1;
        demandaInput.previousValue = demandaInput.value;
        demandaInput.onchange = () => {
            checkDemandAndRecalculate(product, demandaInput);
        };
        demandaCell.appendChild(demandaInput);

        row.appendChild(nameCell);
        row.appendChild(demandaCell);
        tableBody.appendChild(row);
        addedProducts.add(product);

        product.setDemmand(1); //Quando adicionar um produto pela primeira vez, automaticamente ele é adicionado com demanda 1
            
        atualizarTotalSocialCostDiscount(product); //Atualiza no calculo e na tela

    }

    // Atualizar dropdown com sugestões
    function updateDropdown(searchText) {
        const suggestions = products.filter(product => 
            !addedProducts.has(product) && 
            (product.name.toLowerCase().includes(searchText.toLowerCase()))
        );

        if (suggestions.length > 0 && searchText) {
            dropdown.innerHTML = "";
            dropdown.style.display = "block";
            
            suggestions.forEach(suggestion => {
                const div = document.createElement("div");
                div.textContent = suggestion.name;
                div.style.cssText = `
                    padding: 8px;
                    cursor: pointer;
                    hover: background-color: rgba(255, 255, 255, 0.6);
                `;
                //div.onmouseover = () => div.style.backgroundColor = rgba(255, 255, 255, 0.6);
                //div.onmouseout = () => div.style.backgroundColor = rgba(100, 0, 0, 0.5);
                div.onclick = () => {
                    addItemToTable(suggestion);
                    searchInput.value = "";
                    dropdown.style.display = "none";
                };
                dropdown.appendChild(div);
            });
        } else {
            dropdown.style.display = "none";
        }
    }

    // Event listeners
    searchInput.addEventListener("input", (e) => {
        updateDropdown(e.target.value);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && dropdown.children.length > 0) {
            const firstSuggestion = dropdown.children[0].textContent;
            const originalItem = products.find(product => 
                product.name.includes("Produção") ? 
                product.name.replace("Produção de ", "") === firstSuggestion : 
                product.name === firstSuggestion
            );
            if (originalItem) {
                addItemToTable(originalItem);
                searchInput.value = "";
                dropdown.style.display = "none";
            }
        }
    });

    // Fechar dropdown quando clicar fora
    document.addEventListener("click", (e) => {
        if (!searchContainer.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}


function formatToTwoDecimals(number) {
    return Number((number+"").replace(",", ".")).toFixed(2).replace('.', ',');
  }

  function atualizarTotalSocialCostDiscount(product){

    totalSocialCostDiscount = 0;

    addedProducts.forEach(product => {
        totalSocialCostDiscount += product.totalSocialCostWithDemmand; //Sempre já formatados na escala
    });

    atualizarPartipacaoIndividualEstimadaNoTrabalhoSocial();
  }

/**
* @description Verifica se a mudança na demanda vai gerar um custo social maior que a partipacao Individual Estimada No Trabalho Social
* @param product    
* @returns boolean
*/
function atualizarTotalSocialCostDiscountTest(product){

    let totalSocialCostDiscountTest = 0;

    addedProducts.forEach(productAdded => {
        totalSocialCostDiscountTest += productAdded.totalSocialCostWithDemmandTest; //Sempre já formatados na escala
    });

    if(!addedProducts.has(product)){ //Produto que será incluido, ainda não existe no addedProducts
        totalSocialCostDiscountTest += product.totalSocialCostWithDemmandTest;
    }

    return partipacaoIndividualEstimadaNoTrabalhoSocialOriginal - totalSocialCostDiscountTest >= 0.00;
  }

  function getTotalSocialCostDiscount(){
    return totalSocialCostDiscount;
  }

  function atualizarPartipacaoIndividualEstimadaNoTrabalhoSocial(){
    //partipacaoIndividualEstimadaNoTrabalhoSocialAtual = parseFloat(document.getElementById("partipacaoIndividualEstimadaNoTrabalhoSocial").value.replace(",", "."));
    document.getElementById("partipacaoIndividualEstimadaNoTrabalhoSocial").value = `${formatToTwoDecimals(partipacaoIndividualEstimadaNoTrabalhoSocialOriginal - totalSocialCostDiscount)}`; //Sempre já formatados na escala
  }

  function removeItemFromTable(row, product){
    row.remove();
    addedProducts.delete(product);

    product.setDemmand(0); //Definir a demanda atual do produto removido como zero
    
    atualizarTotalSocialCostDiscount(product); //Atualiza no calculo e na tela
  }

  function checkDemandAndRecalculate(product, demandaInput){

    //Quando alterar o valor da demanda do respectivo produto
    //Tudo é recalculado e atualizado automaticamente
    if (isNaN(product.socialCost) || product.socialCost == null) {
        return;
    }

    if(demandaInput.value <= 0){ //Não pode ser zero, para zerar tem que excluir o produto
        demandaInput.value = demandaInput.previousValue;
        return;
    }

    product.setDemmandTest(demandaInput.value);

    if (atualizarTotalSocialCostDiscountTest(product)) {
        // Se a condição for satisfeita, prosseguir com a lógica do recalculo considerando a nova demanda
        
        product.setDemmand(demandaInput.value);
        
        atualizarTotalSocialCostDiscount(product); //Atualiza no calculo e na tela

        demandaInput.previousValue = demandaInput.value; // Atualize o valor anterior
    } else {
        // Se a condição não for satisfeita, retorna o valor anterior e não executa mudança nenhuma
        demandaInput.value = demandaInput.previousValue; // Reverte o valor para o anterior
        return;
    }

  }