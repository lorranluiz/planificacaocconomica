import json
import psycopg2
import os
import datetime
from decimal import Decimal
import re

# Database connection parameters
DB_PARAMS = {
    'dbname': 'planecon',
    'user': 'postgres',
    'password': 'planecon123',
    'host': 'localhost',
    'port': '5432'
}

# File path
DATA_FILE = 'data/data.json'

def connect_to_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        print("Successfully connected to the database.")
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return None

def load_json_data():
    """Load data from JSON file and fix common JSON format errors"""
    try:
        # Ler o arquivo como texto em vez de JSON diretamente
        with open(DATA_FILE, 'r', encoding='utf-8') as file:
            content = file.read()
        
        print(f"Arquivo carregado de {DATA_FILE}, realizando correções de formato...")
        
        # Remover comentários que não são permitidos em JSON
        content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        
        # 1. Substituir aspas simples por aspas duplas em nomes de propriedades
        content = re.sub(r"'([^']+)'(\s*:)", r'"\1"\2', content)
        
        # 2. Adicionar aspas duplas em nomes de propriedades sem aspas
        content = re.sub(r'([a-zA-Z0-9_]+)(\s*:)(?!["])(?=\s*[{\["tfn0-9.])', r'"\1"\2', content)
        
        # 3. Corrigir vírgulas extras antes de fechar objetos ou arrays
        content = re.sub(r',(\s*[\]}])', r'\1', content)
        
        # 4. Substituir valores NaN por strings "NaN" para evitar erros
        content = re.sub(r':\s*NaN\s*([,}])', r': "NaN"\1', content)
        
        # Tentar analisar o JSON corrigido
        try:
            data = json.loads(content)
            print("Correções de formato aplicadas com sucesso!")
            return data
        except json.JSONDecodeError as e:
            # Se ainda houver erros, tentar encontrar o erro específico
            line_no = e.lineno
            col_no = e.colno
            lines = content.split('\n')
            
            # Mostrar linhas ao redor do erro
            start = max(0, line_no - 3)
            end = min(len(lines), line_no + 2)
            context = "\n".join([f"{i+1}: {lines[i]}" for i in range(start, end)])
            
            print(f"Erro persistente na linha {line_no}, coluna {col_no}:")
            print(context)
            print(f"Mensagem de erro: {e}")
            return None
    except Exception as e:
        print(f"Erro ao carregar dados do JSON: {e}")
        return None

def clean_value(value, default_value=None):
    """Clean values to handle NaN, empty strings etc."""
    if value == "NaN" or value == "" or value is None:
        return default_value
    return value

def import_sectors(conn, data):
    """Import sector data from the JSON file"""
    cursor = conn.cursor()
    
    # Collect all unique sector names
    all_sectors = set()
    for entity_name, entity_data in data.items():
        if 'sectorNames' in entity_data:
            for sector in entity_data['sectorNames']:
                all_sectors.add(sector)
    
    # Insert sectors
    for i, sector_name in enumerate(sorted(all_sectors), 1):
        try:
            cursor.execute(
                "INSERT INTO sector (id, name) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING",
                (i, sector_name)
            )
            print(f"Added sector: {sector_name}")
        except Exception as e:
            print(f"Error adding sector {sector_name}: {e}")
    
    conn.commit()
    print(f"Imported {len(all_sectors)} sectors")
    
    # Create a mapping of sector names to IDs for later use
    cursor.execute("SELECT id, name FROM sector")
    sector_map = {name: id for id, name in cursor.fetchall()}
    
    return sector_map

def import_social_materializations(conn, data, sector_map):
    """Import social materialization data"""
    cursor = conn.cursor()
    
    # Collect all unique products
    all_products = set()
    for entity_name, entity_data in data.items():
        if 'productNames' in entity_data:
            for product in entity_data['productNames']:
                all_products.add(product)
    
    # Insert social materializations
    sm_map = {}  # To store mapping from name to id
    for i, product_name in enumerate(sorted(all_products), 1):
        try:
            # Find corresponding sector
            sector_id = None
            for entity_name, entity_data in data.items():
                if ('productNames' in entity_data and 'sectorNames' in entity_data and
                    product_name in entity_data['productNames']):
                    idx = entity_data['productNames'].index(product_name)
                    if idx < len(entity_data['sectorNames']):
                        sector_name = entity_data['sectorNames'][idx]
                        sector_id = sector_map.get(sector_name)
                        break
            
            # If no sector found, use default id 1
            if sector_id is None:
                sector_id = 1
            
            # Determine type based on naming convention
            sm_type = 'SERVICE' if 'Rede' in product_name else 'PRODUCT'
            
            cursor.execute(
                "INSERT INTO social_materialization (id, name, type, id_sector) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (i, product_name, sm_type, sector_id)
            )
            sm_map[product_name] = i
            print(f"Added social materialization: {product_name} (type: {sm_type}, sector: {sector_id})")
        except Exception as e:
            print(f"Error adding social materialization {product_name}: {e}")
    
    conn.commit()
    print(f"Imported {len(all_products)} social materializations")
    return sm_map

def import_instances(conn, data, sm_map):
    """Import instance data"""
    cursor = conn.cursor()
    
    # First pass to create instances
    instance_map = {}  # To store mapping from name to id
    id_counter = 1
    
    # Predefined instances (requested in requirements)
    predefined_instances = [
        {
            'id': 1, 
            'name': 'Conselho Popular Municipal de Niterói',
            'type': 'COUNCIL',
            'worker_limit': 0  # Default value
        },
        {
            'id': 2, 
            'name': 'Comitê de Fábrica da Aimoré',
            'type': 'WORKER',
            'worker_limit': 0  # Default value
        }
    ]
    
    # Insert predefined instances first
    for instance in predefined_instances:
        try:
            cursor.execute(
                """INSERT INTO instance 
                   (id, committee_name, type, worker_effective_limit) 
                   VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING""",
                (instance['id'], instance['name'], instance['type'], instance['worker_limit'])
            )
            instance_map[instance['name']] = instance['id']
            print(f"Added predefined instance: {instance['name']}")
            id_counter = max(id_counter, instance['id'] + 1)
        except Exception as e:
            print(f"Error adding predefined instance {instance['name']}: {e}")
    
    # Process entities in the data
    for entity_name, entity_data in data.items():
        if entity_name.startswith("WorkerUUID:"):
            # This is a worker
            instance_type = 'WORKER'
        elif "Comitê" in entity_name:
            instance_type = 'COMMITTEE'
        else:
            instance_type = 'COUNCIL'
        
        # Skip if already processed
        if entity_name in instance_map:
            continue
        
        # Find social materialization ID if it's a committee
        sm_id = None
        if 'setorUnidade' in entity_data and entity_data['setorUnidade']:
            sector_unit = entity_data['setorUnidade']
            if sector_unit in sm_map:
                sm_id = sm_map[sector_unit]
        
        # Get worker effective limit
        worker_limit = 0
        if 'limiteEfetivoTrabalhadores' in entity_data:
            limit_value = entity_data['limiteEfetivoTrabalhadores']
            if limit_value and limit_value != "":
                try:
                    worker_limit = int(float(limit_value) * 100)  # Convert percentage to integer
                except:
                    worker_limit = 0
        
        # Get produced and target quantities
        produced_qty = None
        target_qty = None
        if 'producaoMeta' in entity_data and entity_data['producaoMeta']:
            for prod_meta in entity_data['producaoMeta']:
                if 'quantidadeProduzida' in prod_meta and prod_meta['quantidadeProduzida']:
                    try:
                        produced_qty = Decimal(prod_meta['quantidadeProduzida'])
                    except:
                        produced_qty = Decimal('0')
                if 'quantidadeMeta' in prod_meta and prod_meta['quantidadeMeta']:
                    try:
                        target_qty = Decimal(prod_meta['quantidadeMeta'])
                    except:
                        target_qty = Decimal('0')
        
        # Get total social work
        total_social_work = 0
        if 'totalSocialWorkDessaJurisdicao' in entity_data:
            social_work = entity_data['totalSocialWorkDessaJurisdicao']
            if social_work and social_work != "":
                try:
                    total_social_work = int(social_work)
                except:
                    total_social_work = 0
        
        # Get estimated participation
        estimated_participation = None
        if 'partipacaoIndividualEstimadaNoTrabalhoSocial' in entity_data:
            participation = entity_data['partipacaoIndividualEstimadaNoTrabalhoSocial']
            if participation is not None:
                try:
                    estimated_participation = Decimal(str(participation))
                except:
                    estimated_participation = None
        
        # Get hours at electronic point
        hours_at_point = None
        if 'hoursAtElectronicPoint' in entity_data:
            hours = entity_data['hoursAtElectronicPoint']
            if hours is not None:
                try:
                    hours_at_point = Decimal(str(hours))
                except:
                    hours_at_point = Decimal('0')
        
        # Insert instance
        try:
            cursor.execute(
                """INSERT INTO instance 
                   (id, committee_name, type, id_social_materialization, worker_effective_limit, 
                    produced_quantity, target_quantity, total_social_work_of_this_jurisdiction, 
                    estimated_individual_participation_in_social_work, hours_at_electronic_point) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING""",
                (id_counter, entity_name, instance_type, sm_id, worker_limit,
                 produced_qty, target_qty, total_social_work, estimated_participation, hours_at_point)
            )
            instance_map[entity_name] = id_counter
            print(f"Added instance: {entity_name} (id: {id_counter})")
            id_counter += 1
        except Exception as e:
            print(f"Error adding instance {entity_name}: {e}")
    
    conn.commit()
    print(f"Imported {len(instance_map)} instances (including predefined ones)")
    
    # Second pass to update relationships
    for entity_name, entity_data in data.items():
        if entity_name not in instance_map:
            continue
        
        instance_id = instance_map[entity_name]
        
        # Get associated council for committee/worker
        council_id_for_committee = None
        if 'conselhoPopularAssociadoDeComiteOuTrabalhador' in entity_data:
            council_name = entity_data['conselhoPopularAssociadoDeComiteOuTrabalhador']
            if council_name and council_name in instance_map:
                council_id_for_committee = instance_map[council_name]
        
        # Get associated council for council
        council_id_for_council = None
        if 'conselhoPopularAssociadoDeConselhoPopular' in entity_data:
            council_name = entity_data['conselhoPopularAssociadoDeConselhoPopular']
            if council_name and council_name in instance_map:
                council_id_for_council = instance_map[council_name]
        
        # Get associated committee for worker
        committee_id = None
        if 'comiteAssociadoDeTrabalhador' in entity_data:
            committee_name = entity_data['comiteAssociadoDeTrabalhador']
            if committee_name and committee_name in instance_map:
                committee_id = instance_map[committee_name]
        
        # Get associated residents association for worker
        assoc_id = None
        if 'associacaoDeMoradoresAssociadaDeTrabalhador' in entity_data:
            assoc_name = entity_data['associacaoDeMoradoresAssociadaDeTrabalhador']
            if assoc_name and assoc_name in instance_map:
                assoc_id = instance_map[assoc_name]
        
        # Update instance with relationships
        try:
            cursor.execute(
                """UPDATE instance 
                   SET popular_council_associated_with_committee_or_worker = %s,
                       popular_council_associated_with_popular_council = %s,
                       id_associated_worker_committee = %s,
                       id_associated_worker_residents_association = %s
                   WHERE id = %s""",
                (council_id_for_committee, council_id_for_council, committee_id, assoc_id, instance_id)
            )
            print(f"Updated relationships for instance: {entity_name}")
        except Exception as e:
            print(f"Error updating relationships for instance {entity_name}: {e}")
    
    conn.commit()
    
    return instance_map

def import_technological_tensor(conn, data, instance_map, sm_map):
    """Import technological tensor data"""
    cursor = conn.cursor()
    
    count = 0
    for entity_name, entity_data in data.items():
        if entity_name not in instance_map or 'inputTable' not in entity_data:
            continue
        
        instance_id = instance_map[entity_name]
        
        if not entity_data['inputTable'] or not entity_data['productNames']:
            continue
        
        # Process input-output matrix
        for i, row in enumerate(entity_data['inputTable']):
            if i >= len(entity_data['sectorNames']):
                continue
                
            output_sector = entity_data['sectorNames'][i]
            if output_sector not in sm_map:
                continue
                
            output_sm_id = sm_map[output_sector]
            
            for j, value in enumerate(row):
                if j >= len(entity_data['productNames']):
                    continue
                    
                input_product = entity_data['productNames'][j]
                if input_product not in sm_map:
                    continue
                    
                input_sm_id = sm_map[input_product]
                
                try:
                    cursor.execute(
                        """INSERT INTO technological_tensor 
                           (id_instance, id_social_materialization, id_production_input, element_value) 
                           VALUES (%s, %s, %s, %s)
                           ON CONFLICT (id_instance, id_social_materialization, id_production_input) 
                           DO UPDATE SET element_value = EXCLUDED.element_value""",
                        (instance_id, output_sm_id, input_sm_id, value)
                    )
                    count += 1
                except Exception as e:
                    print(f"Error adding technological tensor entry: {e}")
    
    conn.commit()
    print(f"Imported {count} technological tensor entries")

def import_demand_vectors(conn, data, instance_map, sm_map):
    """Import demand vector data"""
    cursor = conn.cursor()
    
    count = 0
    for entity_name, entity_data in data.items():
        try:
            if entity_name not in instance_map or 'finalDemand' not in entity_data:
                continue
            
            instance_id = instance_map[entity_name]
            
            if not entity_data['finalDemand'] or not entity_data['productNames']:
                continue
            
            # Process final demand vector
            for i, value in enumerate(entity_data['finalDemand']):
                if i >= len(entity_data['productNames']):
                    continue
                    
                product = entity_data['productNames'][i]
                if product not in sm_map:
                    continue
                    
                sm_id = sm_map[product]
                
                try:
                    # Verificar se o registro já existe
                    cursor.execute(
                        """SELECT COUNT(*) FROM demand_vector 
                           WHERE id_instance = %s AND id_social_materialization = %s""",
                        (instance_id, sm_id)
                    )
                    record_exists = cursor.fetchone()[0] > 0
                    
                    if record_exists:
                        # Atualizar registro existente
                        cursor.execute(
                            """UPDATE demand_vector SET value = %s
                               WHERE id_instance = %s AND id_social_materialization = %s""",
                            (value, instance_id, sm_id)
                        )
                    else:
                        # Inserir novo registro
                        cursor.execute(
                            """INSERT INTO demand_vector
                               (id_instance, id_social_materialization, value)
                               VALUES (%s, %s, %s)""",
                            (instance_id, sm_id, value)
                        )
                    
                    conn.commit()  # Confirmar cada operação individualmente
                    count += 1
                except Exception as e:
                    conn.rollback()  # Reverter a transação em caso de erro
                    print(f"Error adding demand vector entry: {e}")
        except Exception as e:
            conn.rollback()
            print(f"Error processing entity {entity_name}: {e}")
    
    print(f"Imported {count} demand vector entries")

def import_demand_stocks(conn, data, instance_map, sm_map):
    """Import demand stock data"""
    cursor = conn.cursor()
    
    count = 0
    for entity_name, entity_data in data.items():
        try:
            if entity_name not in instance_map or 'estoqueDemanda' not in entity_data:
                continue
            
            instance_id = instance_map[entity_name]
            
            if not entity_data['estoqueDemanda']:
                continue
            
            # Process demand stocks
            for stock_entry in entity_data['estoqueDemanda']:
                if 'produto' not in stock_entry or 'estoque' not in stock_entry or 'demanda' not in stock_entry:
                    continue
                
                product = stock_entry['produto']
                if product not in sm_map:
                    continue
                    
                sm_id = sm_map[product]
                
                try:
                    stock_value = Decimal(clean_value(stock_entry['estoque'], '0'))
                    demand_value = Decimal(clean_value(stock_entry['demanda'], '0'))
                    
                    # Verificar se o registro já existe
                    cursor.execute(
                        """SELECT COUNT(*) FROM demand_stock 
                           WHERE id_instance = %s AND id_social_materialization = %s""",
                        (instance_id, sm_id)
                    )
                    record_exists = cursor.fetchone()[0] > 0
                    
                    if record_exists:
                        # Atualizar registro existente
                        cursor.execute(
                            """UPDATE demand_stock SET stock = %s, demand = %s
                               WHERE id_instance = %s AND id_social_materialization = %s""",
                            (stock_value, demand_value, instance_id, sm_id)
                        )
                    else:
                        # Inserir novo registro
                        cursor.execute(
                            """INSERT INTO demand_stock
                               (id_instance, id_social_materialization, stock, demand) 
                               VALUES (%s, %s, %s, %s)""",
                            (instance_id, sm_id, stock_value, demand_value)
                        )
                    
                    conn.commit()  # Confirmar cada operação individualmente
                    count += 1
                except Exception as e:
                    conn.rollback()  # Reverter a transação em caso de erro
                    print(f"Error adding demand stock entry: {e}")
        except Exception as e:
            conn.rollback()
            print(f"Error processing entity {entity_name}: {e}")
    
    print(f"Imported {count} demand stock entries")

def import_optimization_data(conn, data, instance_map, sm_map):
    """Import optimization inputs and results data"""
    cursor = conn.cursor()
    
    count = 0
    for entity_name, entity_data in data.items():
        try:
            if entity_name not in instance_map or 'optimizationInputs' not in entity_data or 'optimizationResults' not in entity_data:
                continue
            
            instance_id = instance_map[entity_name]
            
            # Verificar se optimizationInputs é um dicionário
            if not isinstance(entity_data['optimizationInputs'], dict):
                print(f"Warning: optimizationInputs for {entity_name} is not a dictionary, skipping")
                continue
            
            # Process optimization data
            for idx, input_data in entity_data['optimizationInputs'].items():
                if not isinstance(input_data, dict):
                    continue
                
                # Find corresponding result data
                result_data = entity_data['optimizationResults'].get(str(idx))
                if not result_data:
                    continue
                
                # Determine social materialization ID
                sm_id = None
                try:
                    idx_num = int(idx)
                    if idx_num < len(entity_data.get('sectorNames', [])):
                        sector = entity_data['sectorNames'][idx_num]
                        if sector in sm_map:
                            sm_id = sm_map[sector]
                except (ValueError, TypeError):
                    continue  # Ignorar se idx não for um número válido
                
                if not sm_id:
                    continue
                
                # Extract input fields
                worker_limit = int(clean_value(input_data.get('workerLimit'), 0))
                worker_hours = Decimal(clean_value(input_data.get('workerHours'), '0'))
                production_time = Decimal(clean_value(input_data.get('productionTime'), '0'))
                night_shift = bool(input_data.get('nightShift', False))
                weekly_scale = int(clean_value(input_data.get('weeklyScale'), 1))
                
                # Garantir que production_goal não exceda o limite
                try:
                    production_goal = Decimal(clean_value(input_data.get('productionGoal'), '0'))
                    # Limitar o valor máximo para evitar estouro
                    if production_goal > 999999:
                        production_goal = Decimal('999999')
                except:
                    production_goal = Decimal('0')
                
                # Extract result fields
                planned_weekly_scale = int(clean_value(result_data.get('weeklyScale'), 1))
                
                # Limitar valores numéricos para evitar estouro
                try:
                    total_hours = Decimal(clean_value(result_data.get('totalHours'), '0'))
                    if total_hours > 999999:
                        total_hours = Decimal('999999')
                except:
                    total_hours = Decimal('0')
                    
                workers_needed = int(clean_value(result_data.get('workersNeeded'), 0))
                factories_needed = int(clean_value(result_data.get('factoriesNeeded'), 0))
                total_shifts = int(clean_value(result_data.get('totalShifts'), 0))
                
                try:
                    min_production_time = Decimal(clean_value(result_data.get('minimumProductionTime'), '0'))
                    if min_production_time > 999999:
                        min_production_time = Decimal('999999')
                except:
                    min_production_time = Decimal('0')
                
                # Parse employment period as interval
                employment_period_str = clean_value(result_data.get('totalEmploymentPeriod'), '')
                employment_period = datetime.timedelta(days=30)  # Default 1 month
                try:
                    if "anos" in employment_period_str:
                        years = int(employment_period_str.split("anos")[0].strip())
                        employment_period = datetime.timedelta(days=years*365)
                    elif "mês" in employment_period_str:
                        months = int(employment_period_str.split("mês")[0].strip())
                        employment_period = datetime.timedelta(days=months*30)
                    elif "dias" in employment_period_str:
                        days = int(employment_period_str.split("dias")[0].strip())
                        employment_period = datetime.timedelta(days=days)
                except:
                    pass
                
                # Get planned final demand
                try:
                    planned_final_demand = Decimal(clean_value(result_data.get('plannedFinalDemand'), '0'))
                    if planned_final_demand > 999999:
                        planned_final_demand = Decimal('999999')
                except:
                    planned_final_demand = Decimal('0')
                
                try:
                    cursor.execute(
                        """INSERT INTO optimization_inputs_results
                           (id_social_materialization, id_instance, worker_limit, worker_hours, 
                            production_time, night_shift, weekly_scale, planned_weekly_scale, 
                            production_goal, total_hours, workers_needed, factories_needed, 
                            total_shifts, minimum_production_time, total_employment_period, 
                            planned_final_demand) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (sm_id, instance_id, worker_limit, worker_hours, production_time, 
                         night_shift, weekly_scale, planned_weekly_scale, production_goal,
                         total_hours, workers_needed, factories_needed, total_shifts,
                         min_production_time, employment_period, planned_final_demand)
                    )
                    conn.commit()  # Confirmar cada inserção individualmente
                    count += 1
                except Exception as e:
                    conn.rollback()  # Reverter a transação em caso de erro
                    print(f"Error adding optimization data: {e}")
        except Exception as e:
            conn.rollback()
            print(f"Error processing entity {entity_name}: {e}")
    
    print(f"Imported {count} optimization data entries")

def import_workers_proposals(conn, data, instance_map):
    """Import workers proposal data"""
    cursor = conn.cursor()
    
    count = 0
    for entity_name, entity_data in data.items():
        if entity_name not in instance_map or 'propostaTrabalhadores' not in entity_data:
            continue
        
        instance_id = instance_map[entity_name]
        
        if not entity_data['propostaTrabalhadores']:
            continue
        
        # Process workers proposals
        for proposal in entity_data['propostaTrabalhadores'].values():
            if not isinstance(proposal, dict):
                continue
                
            # Extract proposal fields
            worker_limit = int(clean_value(proposal.get('workerLimit'), 0))
            worker_hours = Decimal(clean_value(proposal.get('workerHours'), '0'))
            production_time = Decimal(clean_value(proposal.get('productionTime'), '0'))
            night_shift = bool(proposal.get('nightShift', False))
            weekly_scale = int(clean_value(proposal.get('weeklyScale'), 1))
            
            try:
                cursor.execute(
                    """INSERT INTO workers_proposal
                       (id_instance, worker_limit, worker_hours, production_time, night_shift, weekly_scale) 
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (instance_id, worker_limit, worker_hours, production_time, night_shift, weekly_scale)
                )
                count += 1
            except Exception as e:
                print(f"Error adding workers proposal: {e}")
    
    conn.commit()
    print(f"Imported {count} workers proposals")

def create_default_users(conn, instance_map):
    """Create default users for instances"""
    cursor = conn.cursor()
    
    count = 0
    for name, instance_id in instance_map.items():
        # Create simplified username from the instance name
        username = name.lower().replace(" ", "_")[:20]
        
        # Determine if this is a council or not
        is_council = any(council_term in name.lower() for council_term in ['conselho', 'council'])
        user_type = 'COUNCILLOR' if is_council else 'NON-COUNCILLOR'
        
        # Create a default password
        password = "password123"  # In production this should be hashed
        
        try:
            cursor.execute(
                """INSERT INTO "user"
                   (username, password, id_instance, type, pronoun, name) 
                   VALUES (%s, %s, %s, %s, %s, %s)
                   ON CONFLICT (username) DO NOTHING""",
                (username, password, instance_id, user_type, "they/them", name)
            )
            count += 1
            print(f"Created user for instance: {name}")
        except Exception as e:
            print(f"Error creating user for instance {name}: {e}")
    
    conn.commit()
    print(f"Created {count} default users")

def main():
    """Main function to import data from JSON file to PostgreSQL database"""
    conn = connect_to_db()
    if not conn:
        return
    
    data = load_json_data()
    if not data:
        conn.close()
        return
    
    # Import data in the correct order to maintain referential integrity
    try:
        sector_map = import_sectors(conn, data)
        sm_map = import_social_materializations(conn, data, sector_map)
        instance_map = import_instances(conn, data, sm_map)
        import_technological_tensor(conn, data, instance_map, sm_map)
        import_demand_vectors(conn, data, instance_map, sm_map)
        import_demand_stocks(conn, data, instance_map, sm_map)
        import_optimization_data(conn, data, instance_map, sm_map)
        import_workers_proposals(conn, data, instance_map)
        create_default_users(conn, instance_map)
        
        print("Data import completed successfully!")
    except Exception as e:
        print(f"Error during data import: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()