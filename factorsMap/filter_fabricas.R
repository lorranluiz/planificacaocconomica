#!/usr/bin/env Rscript
# Filter manufacturing facilities (fábricas) from NITEROI CNPJ dataset
# Criteria: capital > 1,000,000 AND CNAE code (ramo) in range [1000000, 3300000]

library(tidyverse)
library(readr)
library(dplyr)

cat("Loading cnpj_NITEROI.RData...\n")
load("data/cnpj_NITEROI.RData")

cat("Initial dataset: ", nrow(data), " rows\n")

# Clean capital column (remove # and convert to numeric)
data$capital_num <- as.numeric(gsub("#", "", data$capital))

# Clean ramo column (remove # and convert to numeric)
data$ramo_num <- as.numeric(gsub("#", "", data$ramo))

# Filter: capital > 1,000,000 AND ramo between 1,000,000 and 3,300,000 AND porte = "GRANDE/OUTROS"
fabricas <- data %>%
  filter(capital_num > 1000000,
         ramo_num >= 1000000,
         ramo_num <= 3300000,
         porte == "GRANDE/OUTROS")

# Store summary stats before removing temp columns
capital_min <- min(fabricas$capital_num, na.rm = TRUE)
capital_max <- max(fabricas$capital_num, na.rm = TRUE)
ramo_min <- min(fabricas$ramo_num, na.rm = TRUE)
ramo_max <- max(fabricas$ramo_num, na.rm = TRUE)

# Remove temporary columns
fabricas <- fabricas %>% select(-capital_num, -ramo_num)

cat("Filtered dataset (fabricas): ", nrow(fabricas), " rows\n")

# Export to CSV
cat("Writing fabricas_niteroi.csv...\n")
write_csv(fabricas, "data/fabricas_niteroi.csv", col_names = TRUE)

# Export to RData
cat("Writing fabricas_niteroi.RData...\n")
save(fabricas, file = "data/fabricas_niteroi.RData", compress = TRUE)

cat("✓ Done! fabricas_niteroi.csv (", file.size("data/fabricas_niteroi.csv") / (1024^2), " MB)\n")
cat("✓ Done! fabricas_niteroi.RData (", file.size("data/fabricas_niteroi.RData") / (1024^2), " MB)\n")

# Summary
cat("\nSummary:\n")
cat("  Total factories (capital > 1M, CNAE 1M-3.3M): ", nrow(fabricas), "\n")
cat("  Capital range: R$ ", format(capital_min, big.mark=",", trim=TRUE), " to R$ ", 
    format(capital_max, big.mark=",", trim=TRUE), "\n")
cat("  CNAE code range: ", as.integer(ramo_min), " to ", as.integer(ramo_max), "\n")
