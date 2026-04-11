-- Atualizar todos os conselhos populares para terem nomes corretos
-- baseados em suas cidades

UPDATE instance
SET committee_name = 'Conselho Popular de ' || city
WHERE type = 'POPULARCOUNCIL'
  AND (committee_name IS NULL OR committee_name = '');

-- Verificar resultado
SELECT 
    COUNT(*) as total_councils,
    COUNT(committee_name) as councils_with_name
FROM instance
WHERE type = 'POPULARCOUNCIL';

-- Mostrar alguns exemplos
SELECT id, committee_name, city, city_code
FROM instance
WHERE type = 'POPULARCOUNCIL'
ORDER BY id
LIMIT 10;
