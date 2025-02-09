function updateAllOptimizeButtons() {
    const demandRows = document.querySelectorAll('#finalDemandInputs tr');
    
    demandRows.forEach((row, index) => {
        updateOptimizeButtonColor(index); // Atualiza a cor do botão com base nos novos dados
    });
}
