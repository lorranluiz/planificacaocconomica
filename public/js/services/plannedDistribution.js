let addedItems = new Set();

function plannedDistribution(worldSectorNames) {
    const bensDeConsumoTableBody = document.querySelector("#bensDeConsumoTable tbody");
    const servicosTableBody = document.querySelector("#servicosTable tbody");
    const showcaseDiv = document.getElementById("plannedDistributionShowcase");

    // Arrays para armazenar os itens disponíveis
    const bensDeConsumoItems = [];
    const servicosItems = [];

    // Separar os itens em suas respectivas categorias
    worldSectorNames.forEach((item) => {
        if (item.includes("Produção")) {
            bensDeConsumoItems.push(item);
        } else {
            servicosItems.push(item);
        }
    });

    // Limpar as tabelas
    bensDeConsumoTableBody.innerHTML = "";
    servicosTableBody.innerHTML = "";
    showcaseDiv.innerHTML = "";

    // Criar apenas os campos de busca para ambas as tabelas
    createSearchRow(bensDeConsumoTableBody, bensDeConsumoItems, true);
    createSearchRow(servicosTableBody, servicosItems, false);

    // Função para criar o showcase de produtos
    function createProductShowcase(items, isBensDeConsumo) {
        let row = document.createElement("div");
        row.className = "row justify-content-center"; // Centralizar a linha

        items.forEach((item, index) => {
            const col = document.createElement("div");
            col.className = "col-2"; // 6 produtos por linha
            col.style.flex = "0 0 14%"; // Ajustar a largura da coluna
            col.style.maxWidth = "14%"; // Ajustar a largura da coluna
            col.style.padding = "10px"; // Espaçamento entre os produtos
            col.style.marginLeft = "1%"; // Adicionar margem à esquerda para centralizar

            const card = document.createElement("div");
            card.className = "card";

            const img = document.createElement("img");
            img.src = "https://http2.mlstatic.com/D_NQ_NP_994262-MLA78902848202_092024-O.webp";
            img.className = "card-img-top";
            img.alt = item;
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.borderRadius = "10px"; // Bordas arredondadas

            const cardBody = document.createElement("div");
            cardBody.className = "card-body";

            const cardTitle = document.createElement("h5");
            cardTitle.className = "card-title";
            cardTitle.textContent = item.replace("Produção de", "");

            const cardText = document.createElement("p");
            cardText.className = "card-text";
            cardText.textContent = "Cost: $0.00"; // Valor simbólico

            const button = document.createElement("button");
            button.className = "btn btn-primary";
            button.textContent = "Retirar";
            button.onclick = () => {
                if (isBensDeConsumo) {
                    addItemToTable(bensDeConsumoTableBody, item);
                } else {
                    addItemToTable(servicosTableBody, item);
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
    createProductShowcase(bensDeConsumoItems, true);
    createProductShowcase(servicosItems, false);
}

// Função para adicionar item à tabela
function addItemToTable(tableBody, item) {

    if (addedItems.has(item)) return;
        
        const row = document.createElement("tr");
        
        const nameCell = document.createElement("td");
        const removeBtn = document.createElement("span");
        removeBtn.textContent = "[-] ";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.color = "red";
        removeBtn.onclick = () => {
            row.remove();
            addedItems.delete(item);
        };
        
        const itemName = item.includes("Produção") ? item.replace("Produção de ", "") : item;
        nameCell.appendChild(removeBtn);
        nameCell.appendChild(document.createTextNode(itemName));

        const demandaCell = document.createElement("td");
        const demandaInput = document.createElement("input");
        demandaInput.type = "number";
        demandaInput.value = 1;
        demandaCell.appendChild(demandaInput);

        row.appendChild(nameCell);
        row.appendChild(demandaCell);
        tableBody.appendChild(row);
        addedItems.add(item);
}

// Função para criar a linha de busca
function createSearchRow(tableBody, items, isBensDeConsumo) {
    const searchRow = document.createElement("tr");
    const searchCell = document.createElement("td");
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search...";
    searchInput.className = "form-control";

    searchInput.addEventListener("input", function () {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredItems = items.filter(item => item.toLowerCase().includes(searchTerm));
        updateTableWithSearchResults(tableBody, filteredItems, isBensDeConsumo);
    });

    searchCell.appendChild(searchInput);
    searchRow.appendChild(searchCell);
    tableBody.appendChild(searchRow);
}

// Função para atualizar a tabela com os resultados da busca
function updateTableWithSearchResults(tableBody, items, isBensDeConsumo) {
    // Limpar as linhas de resultados anteriores
    while (tableBody.rows.length > 1) {
        tableBody.deleteRow(1);
    }

    items.forEach(item => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.textContent = item.replace("Produção de", "");
        row.appendChild(cell);
        tableBody.appendChild(row);
    });
}