-- Verificar conselhos populares existentes
SELECT 
    id,
    committee_name,
    city,
    city_code,
    state,
    type
FROM instance
WHERE type = 'POPULARCOUNCIL'
ORDER BY city;

-- Contar quantos conselhos têm nomes preenchidos
SELECT 
    COUNT(*) as total_councils,
    COUNT(committee_name) as councils_with_name,
    COUNT(*) - COUNT(committee_name) as councils_without_name
FROM instance
WHERE type = 'POPULARCOUNCIL';

-- Verificar comitês e seus conselhos associados
SELECT 
    c.id as committee_id,
    c.committee_name as committee_name,
    c.city as committee_city,
    c.city_code as committee_city_code,
    c.popular_council_associated_with_committee_or_worker as council_id,
    p.committee_name as council_name,
    p.city as council_city,
    p.city_code as council_city_code
FROM instance c
LEFT JOIN instance p ON c.popular_council_associated_with_committee_or_worker = p.id
WHERE c.type = 'COMMITTEE'
LIMIT 10;
