#!/usr/bin/env Rscript
suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(stringi)
})

args <- commandArgs(trailingOnly = TRUE)
city <- if (length(args) >= 1) toupper(trimws(args[[1]])) else "PETROPOLIS"

cidade_dir <- file.path("data", city)
cnpj_rdata <- file.path(cidade_dir, paste0("cnpj_", city, ".RData"))
if (!file.exists(cnpj_rdata)) {
  stop("Arquivo base não encontrado: ", cnpj_rdata)
}

load(cnpj_rdata)
if (!exists("data") || !is.data.frame(data)) {
  stop("Objeto 'data' não encontrado em ", cnpj_rdata)
}

cidade_slug <- tolower(stri_trans_general(city, "Latin-ASCII"))
cidade_slug <- gsub("[^a-z0-9]+", "_", cidade_slug)
cidade_slug <- gsub("^_+|_+$", "", cidade_slug)

capital_num <- suppressWarnings(as.numeric(gsub("#", "", as.character(data$capital))))
ramo_num <- suppressWarnings(as.numeric(gsub("#", "", as.character(data$ramo))))
porte <- trimws(toupper(as.character(data$porte)))

fabricas <- data %>%
  mutate(.capital_num = capital_num, .ramo_num = ramo_num, .porte_norm = porte) %>%
  filter(!is.na(.capital_num), .capital_num > 1000000,
         !is.na(.ramo_num), .ramo_num >= 1000000, .ramo_num <= 3300000,
         .porte_norm == "GRANDE/OUTROS") %>%
  select(-.capital_num, -.ramo_num, -.porte_norm)

fabricas_csv <- file.path(cidade_dir, paste0("fabricas_", cidade_slug, ".csv"))
fabricas_rdata <- file.path(cidade_dir, paste0("fabricas_", cidade_slug, ".RData"))

write_csv(fabricas, fabricas_csv)
save(fabricas, file = fabricas_rdata)

cat("CITY=", city, "\n", sep = "")
cat("ROWS_BASE=", nrow(data), "\n", sep = "")
cat("ROWS_FABRICAS=", nrow(fabricas), "\n", sep = "")
cat("CSV=", fabricas_csv, "\n", sep = "")
cat("RDATA=", fabricas_rdata, "\n", sep = "")
