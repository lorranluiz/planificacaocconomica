#!/usr/bin/env python3
import psycopg2
import json

# Conectar ao banco
try:
    conn = psycopg2.connect(
        host="localhost",
        database="planecon",
        user="postgres",
        password="planecon123"
    )
    cur = conn.cursor()
    
    # Verificar conselhos
    print("=" * 80)
    print("CONSELHOS POPULARES NO BANCO DE DADOS")
    print("=" * 80)
    
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(committee_name) as with_name,
            COUNT(*) - COUNT(committee_name) as without_name
        FROM instance
        WHERE type = 'POPULARCOUNCIL'
    """)
    total, with_name, without_name = cur.fetchone()
    print(f"Total de conselhos: {total}")
    print(f"Conselhos com nome: {with_name}")
    print(f"Conselhos sem nome: {without_name}")
    print()
    
    # Mostrar alguns conselhos
    print("=" * 80)
    print("EXEMPLOS DE CONSELHOS (primeiros 5)")
    print("=" * 80)
    cur.execute("""
        SELECT id, committee_name, city, city_code
        FROM instance
        WHERE type = 'POPULARCOUNCIL'
        ORDER BY id
        LIMIT 5
    """)
    for row in cur.fetchall():
        id, name, city, city_code = row
        print(f"ID: {id}, Nome: {name}, Cidade: {city}, Código: {city_code}")
    print()
    
    # Verificar associações de comitês
    print("=" * 80)
    print("COMITÊS E SUAS ASSOCIAÇÕES (primeiros 5)")
    print("=" * 80)
    cur.execute("""
        SELECT 
            c.id,
            c.committee_name,
            c.city,
            c.popular_council_associated_with_committee_or_worker as council_id,
            p.committee_name as council_name
        FROM instance c
        LEFT JOIN instance p ON c.popular_council_associated_with_committee_or_worker = p.id
        WHERE c.type = 'COMMITTEE'
        ORDER BY c.id
        LIMIT 5
    """)
    for row in cur.fetchall():
        c_id, c_name, c_city, council_id, council_name = row
        print(f"Comitê {c_id}: {c_name}")
        print(f"  Cidade: {c_city}")
        print(f"  Conselho ID: {council_id}, Nome: {council_name}")
        print()
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Erro: {e}")
