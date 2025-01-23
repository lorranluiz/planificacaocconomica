// public/js/services/plannedDistribution.js

export function plannedDistribution(worldSectorNames) {
    const bensDeConsumoTableBody = document.querySelector("#bensDeConsumoTable tbody");
    const servicosTableBody = document.querySelector("#servicosTable tbody");

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

    // Criar apenas os campos de busca para ambas as tabelas
    createSearchRow(bensDeConsumoTableBody, bensDeConsumoItems, true);
    createSearchRow(servicosTableBody, servicosItems, false);
}