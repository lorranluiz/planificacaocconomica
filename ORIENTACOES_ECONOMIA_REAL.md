# Orientações para Uso do Sistema de Planificação Econômica em uma Economia Real

> Guia de boas práticas para administradores, conselhos planificadores e comitês de produção.

---

## Sumário

- [1. Introdução](#1-introdução)
- [2. Equilíbrio entre Produção e Poder de Consumo](#2-equilíbrio-entre-produção-e-poder-de-consumo)
  - [2.1. O problema: custos sociais desproporcionais à renda dos trabalhadores](#21-o-problema-custos-sociais-desproporcionais-à-renda-dos-trabalhadores)
  - [2.2. Causa raiz: trabalho social total subdimensionado](#22-causa-raiz-trabalho-social-total-subdimensionado)
  - [2.3. Os três pilares do equilíbrio](#23-os-três-pilares-do-equilíbrio)
    - [2.3.1. Volume de produção em escala real](#231-volume-de-produção-em-escala-real)
    - [2.3.2. Tempo de produção por unidade fidedigno](#232-tempo-de-produção-por-unidade-fidedigno)
    - [2.3.3. Demanda factível e proporcional à capacidade](#233-demanda-factível-e-proporcional-à-capacidade)
  - [2.4. Resumo e recomendação prática](#24-resumo-e-recomendação-prática)

---

## 1. Introdução

Este documento reúne orientações práticas para o uso correto do sistema Planecon em uma economia real. O objetivo é prevenir desequilíbrios econômicos que podem surgir quando os dados inseridos no sistema não refletem a realidade produtiva da sociedade.

As orientações são dirigidas a todas as instâncias que interagem com o sistema: comitês de produção, conselhos populares e conselhos planificadores. Cada seção aborda um tipo de problema identificado, sua causa e como evitá-lo.

---

## 2. Equilíbrio entre Produção e Poder de Consumo

### 2.1. O problema: custos sociais desproporcionais à renda dos trabalhadores

Em determinadas condições, o sistema pode apresentar custos sociais dos produtos muito superiores à participação individual dos trabalhadores no trabalho social — isto é, os trabalhadores trabalham muitas horas, mas sua cota de participação não é suficiente para retirar os bens que a própria sociedade produz.

Quando isso acontece, mesmo um trabalhador dedicado, com muitas horas registradas no ponto eletrônico, não consegue acumular participação suficiente para retirar produtos básicos. Isso não indica uma falha no modelo econômico do sistema, mas sim um descompasso nos dados que alimentam o cálculo.

### 2.2. Causa raiz: trabalho social total subdimensionado

O custo social de um produto é calculado como a fração que o tempo de produção daquele produto representa no **trabalho social total** da sociedade:

$$
\text{Custo Social} = \frac{\text{Tempo de Produção por Unidade}}{\text{Trabalho Social Total}} \times \text{Escala}
$$

O **trabalho social total** é a soma, para todos os comitês de produção, do produto entre o tempo de produção planificado por unidade e a quantidade efetivamente produzida:

$$
\text{Trabalho Social Total} = \sum_{\text{comitês}} \left( \text{Tempo Planificado}_i \times \text{Quantidade Produzida}_i \right)
$$

Quando essa soma é pequena — seja porque há poucos comitês cadastrados, porque as quantidades produzidas são baixas, ou porque os tempos de produção são subestimados — cada produto individual passa a representar uma parcela grande demais do esforço coletivo, e seu custo dispara.

### 2.3. Os três pilares do equilíbrio

Para que os custos sociais sejam proporcionais ao poder de consumo dos trabalhadores, três fatores precisam estar calibrados corretamente.

#### 2.3.1. Volume de produção em escala real

A quantidade produzida informada por cada comitê deve refletir a **produção industrial real em escala**. Se a sociedade possui 1,6 milhão de trabalhadores, os comitês não podem registrar dezenas ou centenas de unidades como se fossem oficinas artesanais.

**Exemplo prático:**
| Cenário | Quantidade Produzida | Efeito no Custo |
|---|---|---|
| Artesanal (incorreto) | 50 unidades | Custos muito altos |
| Industrial (correto) | 3.000.000 unidades | Custos proporcionais |

> **Recomendação:** Ao cadastrar um comitê, pergunte-se — "essa quantidade faz sentido para uma economia do tamanho que estamos simulando?" Se a resposta for não, ajuste antes de planificar.

#### 2.3.2. Tempo de produção por unidade fidedigno

O tempo de produção por unidade informado na proposta dos trabalhadores deve corresponder ao tempo real que a cadeia produtiva leva para entregar **uma unidade do produto final**, considerando automação, divisão de trabalho e tecnologia disponível.

**Exemplo prático:**
| Produto | Tempo Incorreto | Tempo Correto |
|---|---|---|
| Caneta | 0,70 h/unidade | 0,01 h/unidade |
| Habitação pré-fabricada | 0,70 h/unidade | 0,15 h/unidade |
| Alimento processado | 0,50 h/unidade | 0,01 h/unidade |

Se um comitê reporta 0,70 hora para produzir algo que na realidade leva 0,01 hora, o custo desse bem será **70 vezes maior** do que deveria.

> **Recomendação:** Os conselhos populares devem revisar os tempos de produção reportados pelos comitês antes de repassá-los ao conselho planificador. Tempos anormalmente altos para produtos de massa indicam erro de preenchimento.

#### 2.3.3. Demanda factível e proporcional à capacidade

A meta de produção (demanda) definida para cada materialização não deve ser desproporcionalmente alta em relação à capacidade produtiva real. Se a demanda exige que a sociedade produza muito mais do que consegue, os planos ficam irrealistas e os números se desalinham.

> **Recomendação:** A meta de produção deve ser ligeiramente superior à quantidade já produzida, não ordens de magnitude acima. O conselho planificador deve verificar, antes de planificar, se as metas são alcançáveis com os recursos disponíveis (número de trabalhadores, horas de trabalho, dias por semana).

### 2.4. Resumo e recomendação prática

O sistema funciona corretamente quando os dados dos comitês refletem fielmente a realidade produtiva — **escala real de produção**, **tempos reais de fabricação** e **demandas factíveis**.

Antes de executar a planificação, o conselho planificador deve verificar:

1. **O trabalho social total é coerente com o tamanho da força de trabalho?**
   - Para uma sociedade de *N* trabalhadores, o trabalho social total deve estar na ordem de grandeza de milhões, não de milhares.

2. **Os tempos de produção por unidade fazem sentido para cada tipo de produto?**
   - Bens de consumo em massa (alimentos, vestuário, materiais de escrita) devem ter tempos na faixa de centésimos de hora por unidade.
   - Bens complexos (habitação, painéis solares, equipamentos) podem ter tempos maiores, mas raramente acima de 0,15 h/unidade para produção em escala.

3. **As quantidades produzidas refletem produção industrial?**
   - Se um comitê tem centenas de trabalhadores, a produção de dezenas de unidades é um sinal de alerta.

> **Em síntese:** o desequilíbrio entre custo dos produtos e renda dos trabalhadores não é um defeito do modelo econômico — é consequência de dados que simulam uma sociedade industrial com números de uma oficina artesanal. Numa economia real, basta garantir que os comitês alimentem o sistema com dados verdadeiros.

---

*Este documento será atualizado com novas orientações à medida que forem identificadas.*
