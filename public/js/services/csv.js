document.getElementById('downloadDataButton').addEventListener('click', () => {
    try {
        const csvContent = generateCSV();
        downloadCSV(csvContent, 'dados_economia.csv');
    } catch (error) {
        console.error('Erro ao gerar o arquivo CSV:', error);
    }
});

function generateCSV() {
    const data = collectAllData();

    let csv = '';

    // Nomes dos Produtos
    csv += 'Produtos\n';
    csv += data.productNames.join(',') + '\n\n';

    // Matriz Tecnológica
    csv += 'Matriz Tecnológica\n';
    data.techMatrix.forEach((row, rowIndex) => {
        csv += `${data.productNames[rowIndex]},${row.map(value => value || 0).join(',')}\n`;
    });
    csv += '\n';

    // Demanda Final
    csv += 'Demanda Final\n';
    data.finalDemand.forEach((value, rowIndex) => {
        csv += `${data.productNames[rowIndex]},${value || 0}\n`;
    });
    csv += '\n';

    // Dados de Otimização
    csv += 'Otimização\n';
    for (const [index, inputs] of Object.entries(data.optimizationInputs)) {
        const values = [
            data.productNames[index] || '',
            inputs.workerLimit || 0,
            inputs.workerHours || 0,
            inputs.productionTime || 0,
            inputs.nightShift ? 'true' : 'false',
            inputs.weeklyScale || 0,
            optimizedStatus[index] ? 'true' : 'false'
        ];
        csv += values.join(',') + '\n';
    }
    csv += '\n';

    // Resultados da Planificação
    csv += 'Resultados da Planificação\n';
    for (const [index, results] of Object.entries(data.optimizationResults)) {
        const values = [
            data.productNames[index] || '',
            results.totalHours || 0,
            results.workersNeeded || 0,
            results.factoriesNeeded || 0,
            results.totalShifts || 0,
            results.minimumProductionTime || 0,
            results.totalEmploymentPeriod || ''
        ];
        csv += values.join(',') + '\n';
    }

    return csv;
}






function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}


document.getElementById('uploadDataButton').addEventListener('click', () => {
    const fileInput = document.getElementById('uploadInput');
    fileInput.click();
});

document.getElementById('uploadInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const content = await file.text();
            restoreDataFromCSV(content);
            console.info('Dados restaurados com sucesso!');
        } catch (error) {
            console.error('Erro ao restaurar os dados:', error);
            console.info('Ocorreu um erro ao restaurar os dados. Verifique o arquivo CSV.');
        }
    }
});

function restoreDataFromCSV(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    let section = null;

    const data = {
        productNames: [],
        techMatrix: [],
        finalDemand: [],
        optimizationInputs: {},
        optimizationResults: {}
    };

    lines.forEach(line => {
        const cells = line.split(',');

        if (line === 'Produtos') {
            section = 'productNames';
        } else if (line === 'Matriz Tecnológica') {
            section = 'techMatrix';
        } else if (line === 'Demanda Final') {
            section = 'finalDemand';
        } else if (line === 'Otimização') {
            section = 'optimizationInputs';
        } else if (line === 'Resultados da Planificação') {
            section = 'optimizationResults';
        } else {
            if (section === 'productNames') {
                data.productNames = cells.map(name => name.trim());
            } else if (section === 'techMatrix') {
                if (cells.length > 1) {
                    const values = cells.slice(1).map(value => parseFloat(value) || 0);
                    data.techMatrix.push(values);
                }
            } else if (section === 'finalDemand') {
                if (cells.length === 2) {
                    const demand = parseFloat(cells[1]) || 0;
                    data.finalDemand.push(demand);
                }
            } else if (section === 'optimizationInputs') {
                const [
                    productName,
                    workerLimit,
                    workerHours,
                    productionTime,
                    nightShift,
                    weeklyScale,
                    optimized
                ] = cells;

                const productIndex = data.productNames.indexOf(productName);

                if (productIndex !== -1) {
                    const inputs = {
                        workerLimit: parseFloat(workerLimit) || 0,
                        workerHours: parseFloat(workerHours) || 0,
                        productionTime: parseFloat(productionTime) || 0,
                        nightShift: nightShift === 'true',
                        weeklyScale: parseInt(weeklyScale, 10) || 0
                    };

                    // Salvar os dados no objeto e processar se otimizados
                    data.optimizationInputs[productIndex] = inputs;
                    if (optimized === 'true') {
                        optimizationInputs[productIndex] = inputs;
                        saveOptimizationInputsForProduct(productIndex); // Chama a função para salvar e processar
                    }
                }
            }
        }
    });

    // Validação e ajuste de dados restaurados
    if (data.finalDemand.length !== data.productNames.length) {
        while (data.finalDemand.length < data.productNames.length) {
            data.finalDemand.push(0);
        }
    }

    // Redimensionar a tabela e carregar os dados
    resizeTableForData(data.productNames.length, data.techMatrix[0]?.length || 0);
    populateTechMatrix(data.techMatrix, data.productNames);
    populateFinalDemand(data.finalDemand);

    // Atualiza o status de otimização e os botões
    Object.keys(optimizationInputs).forEach(index => {
        const productIndex = parseInt(index, 10);
        const hasOptimization = isOptimizationDataComplete(productIndex);
        optimizedStatus[productIndex] = hasOptimization; // Define o status
        updateOptimizeButtonColor(productIndex); // Atualiza a cor do botão
    });

    // Executar a função de planificação automaticamente
    planify();

    console.info('Dados restaurados e planificados com sucesso!');
}


function restoreFromCSV(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    let section = null;

    const data = {
        productNames: [],
        techMatrix: [],
        finalDemand: [],
        optimizationInputs: {},
        optimizationResults: {}
    };

    lines.forEach(line => {
        if (line === 'Produtos') {
            section = 'productNames';
        } else if (line === 'Matriz Tecnológica') {
            section = 'techMatrix';
        } else if (line === 'Demanda Final') {
            section = 'finalDemand';
        } else if (line === 'Otimização') {
            section = 'optimizationInputs';
        } else if (line === 'Resultados da Planificação') {
            section = 'optimizationResults';
        } else {
            const cells = line.split(',');

            if (section === 'productNames') {
                data.productNames = cells;
            } else if (section === 'techMatrix') {
                const productName = cells[0];
                const values = cells.slice(1).map(Number);
                data.techMatrix.push(values);
                if (!data.productNames.includes(productName)) {
                    data.productNames.push(productName);
                }
            } else if (section === 'finalDemand') {
                const productName = cells[0];
                const value = Number(cells[1]);
                data.finalDemand.push(value);
            } else if (section === 'optimizationInputs') {
                const [productName, workerLimit, workerHours, productionTime, nightShift, weeklyScale] = cells;
                const productIndex = data.productNames.indexOf(productName);
                data.optimizationInputs[productIndex] = {
                    workerLimit: parseFloat(workerLimit),
                    workerHours: parseFloat(workerHours),
                    productionTime: parseFloat(productionTime),
                    nightShift: nightShift === 'true',
                    weeklyScale: parseInt(weeklyScale, 10)
                };
            } else if (section === 'optimizationResults') {
                const [
                    productName,
                    totalHours,
                    workersNeeded,
                    factoriesNeeded,
                    totalShifts,
                    minimumProductionTime,
                    totalEmploymentPeriod
                ] = cells;
                const productIndex = data.productNames.indexOf(productName);
                data.optimizationResults[productIndex] = {
                    totalHours: parseFloat(totalHours),
                    workersNeeded: parseInt(workersNeeded, 10),
                    factoriesNeeded: parseFloat(factoriesNeeded),
                    totalShifts: parseInt(totalShifts, 10),
                    minimumProductionTime: parseInt(minimumProductionTime, 10),
                    totalEmploymentPeriod
                };
            }
        }
    });

    // Restaurar os dados
    resizeTableForData(data.techMatrix.length, data.techMatrix[0]?.length || 0);
    populateTechMatrix(data.techMatrix, data.productNames);
    populateFinalDemand(data.finalDemand);
    optimizationInputs = data.optimizationInputs;
    optimizationResults = data.optimizationResults;
    planify(); // Recalcula os resultados
    
    // Atualiza os botões com base nos dados carregados
    Object.keys(optimizationInputs).forEach(index => {
        updateOptimizeButtonColor(parseInt(index, 10));
    });
    
}

function convertJSONToCSV(data) {
    let csv = "";

    // Nomes dos Produtos
    csv += "Produtos\n";
    csv += data.productNames.join(",") + "\n\n";

    // Matriz Tecnológica
    csv += "Matriz Tecnológica\n";
    data.techMatrix.forEach((row, rowIndex) => {
        csv += `${data.productNames[rowIndex]},${row.map(value => value || 0).join(",")}\n`;
    });
    csv += "\n";

    // Demanda Final
    csv += "Demanda Final\n";
    data.finalDemand.forEach((value, rowIndex) => {
        csv += `${data.productNames[rowIndex]},${value || 0}\n`;
    });
    csv += "\n";

    // Dados de Otimização
    if (data.optimizationInputs) {
        csv += "Otimização\n";
        for (const [index, inputs] of Object.entries(data.optimizationInputs)) {
            const values = [
                data.productNames[index] || "",
                inputs.workerLimit || 0,
                inputs.workerHours || 0,
                inputs.productionTime || 0,
                inputs.nightShift ? "true" : "false",
                inputs.weeklyScale || 0,
                "true" // Supondo que os dados de JSON incluem otimizações feitas
            ];
            csv += values.join(",") + "\n";
        }
        csv += "\n";
    }

    // Resultados da Planificação
    if (data.optimizationResults) {
        csv += "Resultados da Planificação\n";
        for (const [index, results] of Object.entries(data.optimizationResults)) {
            const values = [
                data.productNames[index] || "",
                results.totalHours || 0,
                results.workersNeeded || 0,
                results.factoriesNeeded || 0,
                results.totalShifts || 0,
                results.minimumProductionTime || 0,
                results.totalEmploymentPeriod || ""
            ];
            csv += values.join(",") + "\n";
        }
    }

    return csv;
}

