import json
import os
import numpy as np
import matplotlib.pyplot as plt
from io import BytesIO
import base64


# Definir os caminhos
root_dir = os.path.dirname(os.path.abspath(__file__))
data_file_path = os.path.join(root_dir, '../../../../../data/data.json')
#output_image_path = os.path.join(root_dir, '../../../analysis', 'amazonas_sector_analysis.png')

# Verificar se o diretório de saída existe, se não, criar
#output_dir = os.path.dirname(output_image_path)
#if not os.path.exists(output_dir):
#    os.makedirs(output_dir)

# Carregar os dados do arquivo JSON com encoding UTF-8
with open(data_file_path, 'r', encoding='utf-8') as file:
    data = json.load(file)


# Filtrar apenas fábricas do Amazonas
amazonas_conselhos = [key for key in data.keys() if "Amazonas" in key]

# Coletar dados das fábricas no Amazonas
amazonas_sector_counts = {}

for conselho in amazonas_conselhos:
    info = data[conselho]
    if "sectorNames" in info and "optimizationResults" in info:
        sector_names = info["sectorNames"]
        workers_needed = [info["optimizationResults"].get(str(i), {}).get("workersNeeded", 0) for i in range(len(sector_names))]

        for sector, workers in zip(sector_names, workers_needed):
            amazonas_sector_counts[sector] = amazonas_sector_counts.get(sector, 0) + workers

# Verificar se há dados suficientes
if amazonas_sector_counts:
    # Ordenar os setores pelo número de trabalhadores
    sorted_sectors = sorted(amazonas_sector_counts.items(), key=lambda x: x[1])
    sector_labels, sector_values = zip(*sorted_sectors)

    # Calcular a média
    average_workers = np.mean(sector_values)

    # Criar o gráfico
    plt.figure(figsize=(12, 8))
    plt.barh(sector_labels, sector_values, color="skyblue", label="Número de Trabalhadores")
    plt.axvline(average_workers, color="red", linestyle="dashed", label=f"Média: {average_workers:.0f}")
    plt.xlabel("Número de Trabalhadores")
    plt.ylabel("Setores")
    plt.title("Setores com Mais e Menos Trabalhadores (Fábricas do Amazonas)")
    plt.legend()
    plt.grid(axis="x", linestyle="--", alpha=0.7)

    # Salvar o gráfico no diretório especificado
    #plt.savefig(output_image_path)
    #plt.close()
    #print(f"Gráfico salvo em {output_image_path}")

    # Salvar em um buffer de memória em vez de um arquivo
    buffer = BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)

    # Codificar a imagem para base64
    imageBase64 = base64.b64encode(buffer.read()).decode('utf-8')
    buffer.close()
    
    # Retornar a imagem como JSON
    response = {"imageBase64": imageBase64}
    print(json.dumps(response))

else:
    print("Nenhuma fábrica do Amazonas encontrada nos dados.")