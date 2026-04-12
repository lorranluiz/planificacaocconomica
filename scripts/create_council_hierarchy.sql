-- =====================================================================
-- Criação da hierarquia de Conselhos Populares
-- Internacional → Continente → País → Estado → Cidade
-- =====================================================================

DO $$
DECLARE
  id_internacional   INTEGER := 1;
  id_america_sul     INTEGER;
  id_brasil          INTEGER;
  id_argentina       INTEGER;
  id_bolivia         INTEGER;
  id_chile           INTEGER;
  id_colombia        INTEGER;
  id_equador         INTEGER;
  id_guiana          INTEGER;
  id_paraguai        INTEGER;
  id_peru            INTEGER;
  id_suriname        INTEGER;
  id_uruguai         INTEGER;
  id_venezuela       INTEGER;
  id_estado_rj       INTEGER;
  id_estado_sp       INTEGER;
  id_estado_pr       INTEGER;
BEGIN

-- 1. Atualizar instância ID 1 para Conselho Popular Internacional
--    Localização: Serra da Barriga, União dos Palmares, AL
UPDATE instance SET
  type = 'POPULARCOUNCIL',
  committee_name = 'Conselho Popular Internacional',
  latitude = -9.1656,
  longitude = -36.0783,
  city = 'UNIAO DOS PALMARES',
  state = 'Alagoas',
  country = 'Brasil',
  continent = 'América do Sul'
WHERE id = id_internacional;

-- 2. Conselho Popular da América do Sul (ponto central do continente)
INSERT INTO instance (id, type, committee_name, latitude, longitude, continent,
  popular_council_associated_with_popular_council, created_at)
VALUES (
  nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular da América do Sul',
  -15.7801, -56.5085,
  'América do Sul',
  id_internacional, NOW()
) RETURNING id INTO id_america_sul;

-- 3. Conselho Popular do Brasil – Belém, PA
INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, state, country, continent,
  popular_council_associated_with_popular_council, created_at)
VALUES (
  nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Brasil',
  -1.4558, -48.5024,
  'BELEM', 'Pará', 'Brasil', 'América do Sul',
  id_america_sul, NOW()
) RETURNING id INTO id_brasil;

-- =====================================================================
-- 4. Conselhos Populares dos países sul-americanos (exceto Brasil)
--    Parent = Conselho Popular da América do Sul
-- =====================================================================

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular da Argentina',
  -34.6037, -58.3816, 'BUENOS AIRES', 'Argentina', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_argentina;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular da Bolívia',
  -16.5000, -68.1500, 'LA PAZ', 'Bolívia', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_bolivia;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Chile',
  -33.4489, -70.6693, 'SANTIAGO', 'Chile', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_chile;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular da Colômbia',
  4.7110, -74.0721, 'BOGOTA', 'Colômbia', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_colombia;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Equador',
  -0.1807, -78.4678, 'QUITO', 'Equador', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_equador;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular da Guiana',
  6.8013, -58.1551, 'GEORGETOWN', 'Guiana', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_guiana;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Paraguai',
  -25.2637, -57.5759, 'ASSUNCAO', 'Paraguai', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_paraguai;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Peru',
  -12.0464, -77.0428, 'LIMA', 'Peru', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_peru;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Suriname',
  5.8520, -55.2038, 'PARAMARIBO', 'Suriname', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_suriname;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Uruguai',
  -34.9011, -56.1645, 'MONTEVIDEU', 'Uruguai', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_uruguai;

INSERT INTO instance (id, type, committee_name, latitude, longitude,
  city, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular da Venezuela',
  10.4806, -66.9036, 'CARACAS', 'Venezuela', 'América do Sul',
  id_america_sul, NOW()) RETURNING id INTO id_venezuela;

-- =====================================================================
-- 5. Conselhos Populares Estaduais do Brasil
--    Parent = Conselho Popular do Brasil
-- =====================================================================

-- Rio de Janeiro (estado) – capital: Rio de Janeiro
INSERT INTO instance (id, type, committee_name, latitude, longitude,
  state, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Rio de Janeiro',
  -22.9068, -43.1729,
  'Rio de Janeiro', 'Brasil', 'América do Sul',
  id_brasil, NOW()) RETURNING id INTO id_estado_rj;

-- São Paulo (estado) – capital: São Paulo
INSERT INTO instance (id, type, committee_name, latitude, longitude,
  state, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular de São Paulo',
  -23.5505, -46.6333,
  'São Paulo', 'Brasil', 'América do Sul',
  id_brasil, NOW()) RETURNING id INTO id_estado_sp;

-- Paraná (estado) – capital: Curitiba
INSERT INTO instance (id, type, committee_name, latitude, longitude,
  state, country, continent, popular_council_associated_with_popular_council, created_at)
VALUES (nextval('instance_id_seq'), 'POPULARCOUNCIL',
  'Conselho Popular do Paraná',
  -25.4284, -49.2733,
  'Paraná', 'Brasil', 'América do Sul',
  id_brasil, NOW()) RETURNING id INTO id_estado_pr;

-- =====================================================================
-- 6. Vincular conselhos de cidade existentes aos seus conselhos estaduais
-- =====================================================================

-- Cidades do Rio de Janeiro: Niterói(6052), Petrópolis(6053), Volta Redonda(6054), Rio de Janeiro(6061)
UPDATE instance SET
  popular_council_associated_with_popular_council = id_estado_rj,
  state = 'Rio de Janeiro',
  country = 'Brasil',
  continent = 'América do Sul'
WHERE id IN (6052, 6053, 6054, 6061);

-- Cidades de São Paulo: São José dos Campos(6055), Campinas(6063)
UPDATE instance SET
  popular_council_associated_with_popular_council = id_estado_sp,
  state = 'São Paulo',
  country = 'Brasil',
  continent = 'América do Sul'
WHERE id IN (6055, 6063);

-- Cidades do Paraná: Araucária(6065)
UPDATE instance SET
  popular_council_associated_with_popular_council = id_estado_pr,
  state = 'Paraná',
  country = 'Brasil',
  continent = 'América do Sul'
WHERE id = 6065;

RAISE NOTICE 'Hierarquia criada com sucesso!';
RAISE NOTICE 'Internacional: %, América do Sul: %, Brasil: %', id_internacional, id_america_sul, id_brasil;
RAISE NOTICE 'Estado RJ: %, SP: %, PR: %', id_estado_rj, id_estado_sp, id_estado_pr;

END $$;
