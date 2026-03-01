#############################
# DEU CERTO? AGRADECE A GENTE PELO PIX
#
# (43) 991701144
#
# $5, $10 ou $30 ou o que vc puder.
# SE NAO DEU CERTO, A GENTE AJUDA
# santosdias.com
#############################


# Instalação e Carregamento de Todos os Pacotes----
pacotes <- c("RColorBrewer", "wordcloud", "grDevices", "data.table", 
             "tidyverse", "readxl", "dplyr", "tm", "readr", "stringi", 
             "writexl")

if(sum(as.numeric(!pacotes %in% installed.packages())) != 0){
  instalador <- pacotes[!pacotes %in% installed.packages()]
  for(i in 1:length(instalador)) {
    install.packages(instalador, dependencies = T)
  }
  sapply(pacotes, require, character = T) 
} else {
  sapply(pacotes, require, character = T) 
}
# ----

setwd("data")

# Código variável presente nos nomes dos arquivos (ex: D60214)
code_var <- "D60214"

# Parâmetros da cidade — podem ser passados via variáveis de ambiente
cidade_codigo <- Sys.getenv("CIDADE_CODIGO", unset = "5865")
cidade_nome   <- toupper(trimws(Sys.getenv("CIDADE_NOME", unset = "NITEROI")))

# Criar subpasta da cidade dentro de data/ para isolar artefatos
cidade_dir <- cidade_nome   # relativo ao cwd = data/
dir.create(cidade_dir, showWarnings = FALSE, recursive = TRUE)

# Logging / lock helpers
log_path  <- file.path(cidade_dir, "processamento.log")   # dentro de data/{CIDADE}
lock_path <- file.path(cidade_dir, "processing.lock")       # lock por cidade
log_msg <- function(...) {
  txt <- paste0(format(Sys.time(), "%Y-%m-%d %H:%M:%S"), " - ", paste(..., collapse = " "), "\n")
  cat(txt, file = log_path, append = TRUE)
  message(txt)
}
create_lock <- function(){
  if(!file.exists(lock_path)) file.create(lock_path)
  write(as.character(Sys.time()), file = lock_path)
}
remove_lock <- function(){
  if(file.exists(lock_path)) file.remove(lock_path)
}

options(error = function() {
  err_msg <- tryCatch(geterrmessage(), error = function(e) "Erro desconhecido")
  tb <- tryCatch(paste(capture.output(traceback(2)), collapse = " | "), error = function(e) "")
  try(log_msg("[ERRO_FATAL]", err_msg), silent = TRUE)
  if (!is.null(tb) && nzchar(tb)) {
    try(log_msg("[TRACEBACK]", tb), silent = TRUE)
  }
  if (exists("write_progress", mode = "function")) {
    stage <- if (exists("current_stage")) current_stage else "ERRO"
    cur_file <- if (exists("current_file_name")) current_file_name else ""
    f_done <- if (exists("current_file_lines_done")) as.integer(current_file_lines_done) else 0L
    f_total <- if (exists("current_file_lines_total")) as.integer(current_file_lines_total) else 0L
    fd <- if (exists("files_done_counter")) as.integer(files_done_counter) else 0L
    tf <- if (exists("total_files")) as.integer(total_files) else 0L
    ld <- if (exists("lines_done_counter")) as.integer(lines_done_counter) else 0L
    tl <- if (exists("total_lines")) as.integer(total_lines) else 0L
    try(write_progress(stage, cur_file, f_done, f_total, fd, tf, ld, tl, status = "failed", force = TRUE), silent = TRUE)
  }
  try(remove_lock(), silent = TRUE)
  quit(save = "no", status = 1, runLast = FALSE)
})

# === Progresso e cancelamento ===
progress_path  <- file.path(cidade_dir, "progress.json")
cancel_path    <- file.path(cidade_dir, "cancel.flag")
pause_path     <- file.path(cidade_dir, "pause.flag")
checkpoint_path <- file.path(cidade_dir, "checkpoint_state.rds")
partials_dir    <- file.path(cidade_dir, "resume_partials")
dir.create(partials_dir, showWarnings = FALSE, recursive = TRUE)
started_at     <- Sys.time()
.last_prog_upd <- started_at - 21  # forca escrita imediata na primeira chamada
.last_chunk_log <- started_at - 21

# Estado global de progresso (atualizado nos loops)
current_stage             <- "INIT"
current_file_name         <- ""
current_file_lines_done   <- 0L
current_file_lines_total  <- 0L
files_done_counter        <- 0L
lines_done_counter        <- 0L
total_files               <- 30L
total_lines               <- 0L
extra_outputs_total       <- 2L
processed_files_done      <- character(0)
created_outputs_done      <- character(0)
current_output_file       <- ""
resume_mode               <- tolower(trimws(Sys.getenv("RESUME_FROM_CHECKPOINT", unset = "0"))) %in% c("1", "true", "yes")
.pause_requested          <- FALSE

sanitize_name <- function(x) {
  gsub("[^A-Za-z0-9._-]", "_", basename(x))
}

partial_result_path <- function(stage, file_name) {
  file.path(partials_dir, paste0("partial_", stage, "_", sanitize_name(file_name), ".rds"))
}

final_result_path <- function(stage, file_name) {
  file.path(partials_dir, paste0("result_", stage, "_", sanitize_name(file_name), ".rds"))
}

save_checkpoint <- function(status = "running") {
  ck <- list(
    status = status,
    cidade_nome = cidade_nome,
    cidade_codigo = cidade_codigo,
    current_stage = current_stage,
    current_file_name = current_file_name,
    current_file_lines_done = as.integer(current_file_lines_done),
    current_file_lines_total = as.integer(current_file_lines_total),
    files_done_counter = as.integer(files_done_counter),
    lines_done_counter = as.integer(lines_done_counter),
    total_files = as.integer(total_files),
    total_lines = as.integer(total_lines),
    current_output_file = current_output_file,
    processed_files_done = unique(processed_files_done),
    created_outputs_done = unique(created_outputs_done),
    updated_at = format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  )
  tryCatch(saveRDS(ck, checkpoint_path), error = function(e) invisible(NULL))
}

load_checkpoint <- function() {
  if (!resume_mode || !file.exists(checkpoint_path)) return(NULL)
  tryCatch(readRDS(checkpoint_path), error = function(e) NULL)
}

check_control_flags <- function() {
  if (file.exists(cancel_path)) {
    log_msg("[CANCELAMENTO] Cancelamento solicitado. Encerrando processamento.")
    write_progress("CANCELADO", "", 0, 0, 0, 0, 0, 0, status = "cancelled", force = TRUE)
    remove_lock()
    quit(save = "no", status = 0)
  }
  if (file.exists(pause_path)) {
    .pause_requested <<- TRUE
    log_msg("[PAUSA] Solicitação de pausa detectada.",
            "arquivo:", basename(current_file_name),
            "linha:", current_file_lines_done,
            "arquivo_em_criacao:", current_output_file,
            "arquivos_criados:", paste(created_outputs_done, collapse = ","),
            "arquivos_processados:", paste(processed_files_done, collapse = ","))
    save_checkpoint("paused")
    write_progress(current_stage, current_file_name,
                   current_file_lines_done, current_file_lines_total,
                   files_done_counter, total_files,
                   lines_done_counter + current_file_lines_done, total_lines,
                   status = "paused", force = TRUE)
    return(TRUE)
  }
  return(FALSE)
}

# Callback usado nos chunk readers; atualiza o estado global
update_chunk_progress <- function(n_rows) {
  pause_now <- check_control_flags()
  if (isTRUE(pause_now)) {
    stop(structure(list(message = "PAUSE_REQUESTED"), class = c("pause_requested", "error", "condition")))
  }
  current_file_lines_done <<- current_file_lines_done + n_rows
  now <- Sys.time()
  if (as.numeric(difftime(now, .last_chunk_log, units = "secs")) >= 10) {
    log_msg("Progress", current_stage,
            "file", basename(current_file_name),
            "lines", current_file_lines_done, "/", current_file_lines_total,
            "files", files_done_counter, "/", total_files)
    .last_chunk_log <<- now
  }
  write_progress(current_stage, current_file_name,
                 current_file_lines_done, current_file_lines_total,
                 files_done_counter, total_files,
                 lines_done_counter + current_file_lines_done, total_lines)
  save_checkpoint("running")
}

# Contagem rapida de linhas via leitura binaria (conta 0x0a sem carregar o arquivo)
contar_linhas_rapido <- function(f) {
  if (!file.exists(f)) return(0L)
  con <- NULL
  tryCatch({
    con <- file(f, "rb"); n <- 0L
    repeat { chk <- readBin(con, "raw", n = 65536L); if (!length(chk)) break; n <- n + sum(chk == as.raw(0x0a)) }
    close(con); n
  }, error = function(e) { try(close(con), silent = TRUE); 0L })
}

# Escreve progress.json — throttled a 1x/10s (ou imediato se force = TRUE)
write_progress <- function(stage, cur_file, f_done, f_total, fd, tf, ld, tl,
                           status = "running", force = FALSE) {
  now <- Sys.time()
  if (!force && as.numeric(difftime(now, .last_prog_upd, units = "secs")) < 10) return()
  elapsed <- as.numeric(difftime(now, started_at, units = "secs"))
  pct  <- if (tl > 0) round(100 * ld / tl, 2) else 0
  eta  <- if (pct > 0.5) round(elapsed / (pct / 100) * (1 - pct / 100)) else NA_real_
  json <- paste0(
    '{"status":"', status, '","stage":"', stage, '",',
    '"current_file":"', gsub('"', '', basename(cur_file)), '",',
    '"file_lines_done":', f_done, ',"file_lines_total":', f_total, ',',
    '"files_done":', fd, ',"total_files":', tf, ',',
    '"lines_done":', ld, ',"total_lines":', tl, ',',
    '"percent":', pct, ',"elapsed_secs":', round(elapsed), ',',
    '"eta_secs":', ifelse(is.na(eta), 'null', as.character(eta)), ',',
    '"started_at":"', format(started_at, "%Y-%m-%dT%H:%M:%S"), '",',
    '"updated_at":"', format(now, "%Y-%m-%dT%H:%M:%S"), '"}'
  )
  tryCatch(writeLines(json, progress_path), error = function(e) invisible(NULL))
  .last_prog_upd <<- now
}

# Verifica arquivo cancel.flag; se existir, para o script graciosamente
check_cancel <- function() {
  pause_now <- check_control_flags()
  if (isTRUE(pause_now)) {
    remove_lock()
    quit(save = "no", status = 0)
  }
}

resume_state <- load_checkpoint()
if (!is.null(resume_state)) {
  current_stage            <- resume_state$current_stage
  current_file_name        <- resume_state$current_file_name
  current_file_lines_done  <- as.integer(resume_state$current_file_lines_done)
  current_file_lines_total <- as.integer(resume_state$current_file_lines_total)
  files_done_counter       <- as.integer(resume_state$files_done_counter)
  lines_done_counter       <- as.integer(resume_state$lines_done_counter)
  total_files              <- as.integer(resume_state$total_files)
  total_lines              <- as.integer(resume_state$total_lines)
  current_output_file      <- if (is.null(resume_state$current_output_file) || !length(resume_state$current_output_file)) "" else as.character(resume_state$current_output_file[[1]])
  processed_files_done     <- if (is.null(resume_state$processed_files_done)) character(0) else as.character(resume_state$processed_files_done)
  created_outputs_done     <- if (is.null(resume_state$created_outputs_done)) character(0) else as.character(resume_state$created_outputs_done)
  processed_files_done     <- processed_files_done[!is.na(processed_files_done) & nzchar(processed_files_done)]
  created_outputs_done     <- created_outputs_done[!is.na(created_outputs_done) & nzchar(created_outputs_done)]
  log_msg("[RETOMADA] Checkpoint carregado.",
          "stage:", current_stage,
          "arquivo:", basename(current_file_name),
          "linha:", current_file_lines_done,
          "criando:", current_output_file,
          "arquivos_criados:", paste(created_outputs_done, collapse = ","),
          "arquivos_processados:", paste(processed_files_done, collapse = ","))
} else if (!resume_mode) {
  try(unlink(partials_dir, recursive = TRUE, force = TRUE), silent = TRUE)
  dir.create(partials_dir, showWarnings = FALSE, recursive = TRUE)
}

# write start
create_lock()
if (resume_mode) {
  log_msg("[RETOMADA] Script retomado")
} else {
  log_msg("Script started")
}

# Helpers de saneamento de texto para evitar falhas por UTF-8 inválido
safe_utf8 <- function(x) {
  if (is.factor(x)) x <- as.character(x)
  if (!is.character(x)) x <- as.character(x)

  out <- suppressWarnings(iconv(x, from = "", to = "UTF-8", sub = ""))
  bad <- is.na(out) & !is.na(x)
  if (any(bad)) {
    out[bad] <- suppressWarnings(iconv(x[bad], from = "latin1", to = "UTF-8", sub = ""))
  }
  bad <- is.na(out) & !is.na(x)
  if (any(bad)) {
    out[bad] <- suppressWarnings(iconv(x[bad], from = "bytes", to = "UTF-8", sub = ""))
  }
  out
}

safe_trimws <- function(x) {
  trimws(safe_utf8(x))
}

sanitize_char_columns <- function(df) {
  if (!is.data.frame(df) || ncol(df) == 0) return(df)
  is_char <- vapply(df, is.character, logical(1))
  if (any(is_char)) {
    df[is_char] <- lapply(df[is_char], safe_utf8)
  }
  df
}

# Helper: ler arquivos grandes em chunks e filtrar por município (V21) e situação (V6)
library(readr)
read_filter_estabele <- function(file, filtro_V21, filtro_V6, chunk_size = 100000, progress_fn = NULL, skip_rows = 0L, seed_data = NULL){
  res <- seed_data
  cb <- SideEffectChunkCallback$new(function(x, pos){
    # when readr reads without col_names, columns are X1, X2, ...
    names(x) <- paste0("V", seq_len(ncol(x)))
    x <- sanitize_char_columns(as.data.frame(x, stringsAsFactors = FALSE))
    # robust matching for municipality: trim whitespace and compare numerically when possible
    matches_municipio <- function(col, target){
      col_trim <- safe_trimws(col)
      target_trim <- safe_trimws(target)
      exact <- col_trim == target_trim
      suppressWarnings({
        col_num <- as.numeric(col_trim)
        target_num <- as.numeric(target_trim)
      })
      num_eq <- !is.na(col_num) & !is.na(target_num) & (col_num == target_num)
      return(exact | num_eq)
    }

    matched <- x[matches_municipio(x$V21, filtro_V21) & safe_trimws(x$V6) == safe_trimws(filtro_V6), , drop = FALSE]
    if(nrow(matched) > 0){
      if(is.null(res)) res <<- matched else res <<- rbind(res, matched)
    }
    if (!is.null(progress_fn)) progress_fn(nrow(x))
  })
  paused <- FALSE
  tryCatch({
    read_delim_chunked(file = file, delim = ";", callback = cb, col_names = FALSE,
                      chunk_size = chunk_size, skip = as.integer(skip_rows), col_types = cols(.default = "c"))
  }, pause_requested = function(e) {
    paused <<- TRUE
  })
  if(is.null(res)) res <- data.frame()
  # ensure column names V1..Vn
  if (ncol(res) > 0) names(res) <- paste0("V", seq_len(ncol(res)))
  return(list(data = as.data.frame(res), paused = paused))
}

# Helper: ler arquivos grandes em chunks e filtrar por V1 presente em values
read_filter_by_v1 <- function(file, values, chunk_size = 100000, progress_fn = NULL, skip_rows = 0L, seed_data = NULL){
  res <- seed_data
  cb <- SideEffectChunkCallback$new(function(x, pos){
    names(x) <- paste0("V", seq_len(ncol(x)))
    matched <- x[x$V1 %in% values, , drop = FALSE]
    if(nrow(matched) > 0){
      if(is.null(res)) res <<- matched else res <<- rbind(res, matched)
    }
    if (!is.null(progress_fn)) progress_fn(nrow(x))
  })
  paused <- FALSE
  tryCatch({
    read_delim_chunked(file = file, delim = ";", callback = cb, col_names = FALSE,
                      chunk_size = chunk_size, skip = as.integer(skip_rows), col_types = cols(.default = "c"))
  }, pause_requested = function(e) {
    paused <<- TRUE
  })
  if(is.null(res)) res <- data.frame()
  if (ncol(res) > 0) names(res) <- paste0("V", seq_len(ncol(res)))
  return(list(data = as.data.frame(res), paused = paused))
}

###TABELAS E DICIONARIOS ADICIONAIS###
# Carregar dados totais
arquivos <-
  c(
    paste0("F.K03200$Z.", code_var, ".CNAECSV")
  )

lista <- list()

for (i in 1:length(arquivos)) {
  cnae <- read.table(file = arquivos[[i]],
                     header = FALSE,
                     colClasses = c("character", "character"),
                     sep = ";",
                     fill = TRUE,
                     encoding = 'latin1',
                     quote = "\""
)
lista[[i]] <- cnae
}
write_csv(cnae, "cnae.csv")
log_msg("Loaded cnae")

#Carregar dados Natureza Juridica
arquivos <-
  c(
    paste0("F.K03200$Z.", code_var, ".NATJUCSV")
  )

lista <- list()

for (i in 1:length(arquivos)) {
  natureza_juridica <- read.table(file = arquivos[[i]],
                                  header = FALSE,
                                  colClasses = c("character", "character"),
                                  sep = ";",
                                  fill = TRUE,
                                  encoding = 'latin1',
                                  quote = "\""
  )
  lista[[i]] <- natureza_juridica
}
write_csv(natureza_juridica, "natureza_juridica.csv")
log_msg("Loaded natureza_juridica")

#Carregar dados Natureza Juridica
arquivos <-
  c(
    paste0("F.K03200$Z.", code_var, ".QUALSCSV")
  )

lista <- list()

for (i in 1:length(arquivos)) {
  qualificacao <- read.table(file = arquivos[[i]],
                             header = FALSE,
                             colClasses = c("character", "character"),
                             sep = ";",
                             fill = TRUE,
                             encoding = 'latin1',
                             quote = "\""
  )
  lista[[i]] <- qualificacao
}
write_csv(qualificacao, "qualificacao.csv")
log_msg("Loaded qualificacao")

#Carregar dados Natureza Juridica
arquivos <-
  c(
    paste0("F.K03200$Z.", code_var, ".PAISCSV")
  )

lista <- list()

for (i in 1:length(arquivos)) {
  pais <- read.table(file = arquivos[[i]],
                     header = FALSE,
                     colClasses = c("character", "character"),
                     sep = ";",
                     fill = TRUE,
                     encoding = 'latin1',
                     quote = "\""
  )
  lista[[i]] <- pais
}
write_csv(pais, "pais.csv")
log_msg("Loaded pais")

#Carregar dados Natureza Juridica
arquivos <-
  c(
    paste0("F.K03200$Z.", code_var, ".MUNICCSV")
  )

lista <- list()

for (i in 1:length(arquivos)) {
  cidade <- read.table(file = arquivos[[i]],
                       header = FALSE,
                       colClasses = c("character", "character"),
                       sep = ";",
                       fill = TRUE,
                       encoding = 'latin1',
                       quote = "\""
  )
  lista[[i]] <- cidade
}
write_csv(cidade, "cidade.csv")
log_msg("Loaded cidade")

# Trim whitespace in municipality lookup for proper matching
cidade$V1 <- safe_trimws(cidade$V1)
cidade$V2 <- safe_trimws(cidade$V2)

# Extract municipality name from cidade table using cidade_codigo
municipio_lookup <- cidade$V2[which(cidade$V1 == cidade_codigo)]
if(length(municipio_lookup) > 0 && municipio_lookup[1] != "") {
  municipio_nome <- toupper(safe_trimws(municipio_lookup[1]))
  log_msg("Found municipality name in cidade table:", municipio_nome)
} else {
  municipio_nome <- cidade_nome
  log_msg("Municipality not found in cidade table, using env var:", cidade_nome)
}

# =========================================================
# Definicao de todos os arquivos brutos + contagem de linhas
# (feito uma vez aqui para rastrear progresso depois)
# =========================================================
arquivos_estabele <- c(
  paste0("K3241.K03200Y6.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y7.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y8.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y9.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y0.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y1.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y2.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y3.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y4.", code_var, ".ESTABELE"),
  paste0("K3241.K03200Y5.", code_var, ".ESTABELE")
)
arquivos_empre <- c(
  paste0("K3241.K03200Y1.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y2.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y3.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y4.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y5.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y6.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y7.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y8.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y9.", code_var, ".EMPRECSV"),
  paste0("K3241.K03200Y0.", code_var, ".EMPRECSV")
)
arquivos_socio <- c(
  paste0("K3241.K03200Y0.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y1.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y2.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y3.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y4.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y5.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y6.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y7.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y8.", code_var, ".SOCIOCSV"),
  paste0("K3241.K03200Y9.", code_var, ".SOCIOCSV")
)
todos_arquivos <- c(arquivos_estabele, arquivos_empre, arquivos_socio)
total_files    <- as.integer(length(todos_arquivos) + extra_outputs_total)   # 30 arquivos brutos + 2 saídas fabricas
if (is.null(resume_state)) {
  write_progress("CONTANDO", "contando linhas...", 0, 0, 0, total_files, 0, 1, force = TRUE)
  log_msg("Contando linhas dos", total_files, "arquivos brutos...")
} else {
  log_msg("[RETOMADA] Recontando linhas para reconstruir mapa de arquivos.")
}
totalLinhasArquivos <- integer(length(todos_arquivos))
names(totalLinhasArquivos) <- todos_arquivos
linhas_contadas <- 0L
for (i in seq_along(todos_arquivos)) {
  check_cancel()
  arq <- todos_arquivos[[i]]
  nlin <- contar_linhas_rapido(arq)
  totalLinhasArquivos[[arq]] <- nlin
  linhas_contadas <- linhas_contadas + nlin
  if (is.null(resume_state)) {
    write_progress("CONTANDO", arq, nlin, nlin,
                   i, total_files, linhas_contadas, max(1L, linhas_contadas), force = TRUE)
  }
  log_msg("Linhas contadas:", basename(arq), "=", nlin)
}
if (is.null(resume_state)) {
  total_lines <- sum(totalLinhasArquivos)
  log_msg("Total de linhas a processar:", total_lines)
  write_progress("AGUARDANDO", "", 0, 0, 0, total_files, 0, total_lines, force = TRUE)
} else {
  if (!is.finite(total_files) || total_files < (length(todos_arquivos) + extra_outputs_total)) {
    total_files <- as.integer(length(todos_arquivos) + extra_outputs_total)
  }
  if (!is.finite(total_lines) || total_lines <= 0) total_lines <- sum(totalLinhasArquivos)
  log_msg("[RETOMADA] Total de linhas preservado para progresso:", total_lines)
}

### Layout dos Arquivos ESTABELECIMENTO ###------------------------
# V1 CNPJ Básico : NÚMERO BASE DE INSCRIÇÃO NO CNPJ (OITO PRIMEIROS DÍGITOS
#DO CNPJ).
# V2 CNPJ ORDEM NÚMERO DO ESTABELECIMENTO DE INSCRIÇÃO NO CNPJ (DO
#NONO ATÉ O DÉCIMO SEGUNDO DÍGITO DO CNPJ)
# V3 CNPJ DV DÍGITO VERIFICADOR DO NÚMERO DE INSCRIÇÃO NO CNPJ (DOIS
#ÚLTIMOS DÍGITOS DO CNPJ)
# V4 IDENTIFICADOR
#MATRIZ/FILIAL CÓDIGO DO IDENTIFICADOR MATRIZ/FILIAL: 1 – MATRIZ 2 – FILIAL
# V5 NOME FANTASIA CORRESPONDE AO NOME FANTASIA
# V6 SITUAÇÃO CADASTRAL CÓDIGO DA SITUAÇÃO CADASTRAL:
#01 – NULA
#2 – ATIVA
#3 – SUSPENSA
#4 – INAPTA
#08 – BAIXADA
# V7 DATA SITUAÇÃO CADASTRAL DATA DO EVENTO DA SITUAÇÃO CADASTRAL
# V8 MOTIVO SITUAÇÃO CADASTRAL CÓDIGO DO MOTIVO DA SITUAÇÃO CADASTRAL
# V9 NOME DA CIDADE NO EXTERIOR 
# V10 PAIS
# V11 DATA DE INÍCIO DA ATIVIDADE
# V12 CNAE FISCAL PRINCIPAL
# V13 CNAE FISCAL SECUNDÁRIA
# V14 TIPO DE LOGRADOURO DESCRICAO DO TIPO DE LOGRADOURO
# V15 LOGRADOURO NOME DO LOGRADOURO ONDE SE LOCALIZA O ESTABELECIMENTO
# V16 NUMERO NÚMERO ONDE SE LOCALIZA O ESTABELECIMENTO. QUANDO NÃO HOUVER 
#PREENCHIMENTO DO NÚMERO HAVERÁ ‘S/N’
# V17 COMPLEMENTO COMPLEMENTO PARA O ENDEREÇO DE LOCALIZAÇÃO DO ESTABELECIMENTO
# V18 BAIRRO
# V19 CEP
# V20 UF
# V21 MUNICIPIO CÓDIGO DO MUNICÍPIO DE JURISDIÇÃO ONDE SE ENCONTRA O 
#ESTABELECIMENTO
# V22 DDD 1
# V23 TELEFONE 1
# V24 DDD 2
# V25 TELEFONE 2
# V26 DDD FAX
# V27 FAX
# V28 CORREIO ELETRONICO CONTEM O EMAIL DO CONTRIBUINTE
# V29 SITUACAO ESPECIAL DA EMPRESA
# V30 DATA DA SITUACAO ESPECIAL

#Definicao dos filtros
#filtro_V20 <- "RJ"
filtro_V21 <- cidade_codigo
filtro_V6 <- "02"

#Carregar dados totais
arquivos <- arquivos_estabele   # definido antes da contagem de linhas

lista <- list()

log_msg("Starting ESTABELE loop")
current_stage <- "ESTABELE"
estabele_file <- file.path(cidade_dir, paste0("cnpj_", cidade_nome, "_ESTABELE.RData"))

if (file.exists(estabele_file)) {
  load(estabele_file)
  if (!"cnpj_cidade" %in% ls()) cnpj_cidade <- data.frame()
  created_outputs_done <- unique(c(created_outputs_done, basename(estabele_file)))
  log_msg("[RETOMADA] Arquivo final de ESTABELE já existe:", basename(estabele_file), "- etapa pulada")
} else {
  if (resume_mode) {
    log_msg("[RETOMADA] Continuando etapa ESTABELE")
  }

  for (i in 1:length(arquivos)) {
    check_cancel()
    arq <- arquivos[[i]]
    result_fp <- final_result_path(current_stage, arq)
    partial_fp <- partial_result_path(current_stage, arq)

    if (file.exists(result_fp)) {
      lista[[i]] <- tryCatch(readRDS(result_fp), error = function(e) data.frame())
      processed_files_done <- unique(c(processed_files_done, basename(arq)))
      next
    }

    current_file_name        <- arq
    current_file_lines_total <- as.integer(totalLinhasArquivos[[arq]])

    skip_rows <- 0L
    seed <- NULL
    if (!is.null(resume_state) && identical(current_stage, resume_state$current_stage) && identical(arq, resume_state$current_file_name)) {
      skip_rows <- as.integer(resume_state$current_file_lines_done)
      if (file.exists(partial_fp)) seed <- tryCatch(readRDS(partial_fp), error = function(e) NULL)
      current_file_lines_done <- skip_rows
      log_msg("[RETOMADA] ESTABELE arquivo", basename(arq), "retomando da linha", skip_rows)
    } else {
      current_file_lines_done <- 0L
    }

    write_progress(current_stage, current_file_name, current_file_lines_done, current_file_lines_total,
                   files_done_counter, total_files, lines_done_counter + current_file_lines_done, total_lines, force = TRUE)
    save_checkpoint("running")
    log_msg("Start ESTABELE file", arq)
    t0 <- Sys.time()
    out <- read_filter_estabele(arq, filtro_V21, filtro_V6,
                                progress_fn = update_chunk_progress,
                                skip_rows = skip_rows,
                                seed_data = seed)
    data <- out$data
    t1 <- Sys.time()
    elapsed <- round(as.numeric(difftime(t1, t0, units = "secs")), 2)

    if (isTRUE(out$paused)) {
      saveRDS(data, partial_fp)
      save_checkpoint("paused")
      log_msg("[PAUSA] Arquivo atual:", basename(arq),
              "linha:", current_file_lines_done,
              "arquivo_em_criacao:", current_output_file,
              "arquivos_criados:", paste(created_outputs_done, collapse = ","),
              "arquivos_processados:", paste(processed_files_done, collapse = ","))
      write_progress(current_stage, current_file_name,
                     current_file_lines_done, current_file_lines_total,
                     files_done_counter, total_files,
                     lines_done_counter + current_file_lines_done, total_lines,
                     status = "paused", force = TRUE)
      remove_lock()
      quit(save = "no", status = 0)
    }

    log_msg("Finished ESTABELE file", arq, "rows:", nrow(data), "time_s:", elapsed)
    lista[[i]] <- data
    saveRDS(data, result_fp)
    if (file.exists(partial_fp)) try(file.remove(partial_fp), silent = TRUE)
    processed_files_done <- unique(c(processed_files_done, basename(arq)))
    files_done_counter  <- files_done_counter + 1L
    lines_done_counter  <- lines_done_counter + current_file_lines_total
    save_checkpoint("running")
    write_progress(current_stage, current_file_name,
                   current_file_lines_total, current_file_lines_total,
                   files_done_counter, total_files, lines_done_counter, total_lines, force = TRUE)
  }

  cnpj_cidade <- do.call("rbind", lista)
  current_output_file <- basename(estabele_file)
  save(cnpj_cidade, file = estabele_file)
  created_outputs_done <- unique(c(created_outputs_done, basename(estabele_file)))
  save_checkpoint("running")
  log_msg("Saved", estabele_file)
  current_output_file <- ""
}

rm(lista)
#Comecar por aqui apos passar pelas tabelas ESTABELE
data <- cnpj_cidade
if(nrow(data) > 0){
  data$municipio <- municipio_nome
} else {
  log_msg("Warning: cnpj data is empty — skipping municipio assignment")
}
data$id_cnpj = data$V1
#write_csv(cnpj_NITEROI, "cnpj_NITEROI_ESTABELE.csv")


# Corrigindo os numeros dos imoveis
data <- sanitize_char_columns(data)
data$V16 <- ifelse(data$V16=="000", "", data$V16)
data$V16 <- ifelse(data$V16=="00", "", data$V16)
data$V16 <- ifelse(data$V16=="0", "", data$V16)
data$V16 <- ifelse(data$V16=="SN", "S/N", data$V16)

# Corrigindo o tipo de logradouro
data$V14 <- iconv(data$V14, from = "UTF-8", to = "ASCII//TRANSLIT")
data$V14 <- gsub("^.*\\bRUA\\b.*$", "RUA", data$V14)
data$V14 <- gsub("^.*\\bAVENIDA\\b.*$", "AVENIDA", data$V14)
data$V14 <- gsub("^.*\\bTRAVESSA\\b.*$", "TRAVESSA", data$V14)

# Criando a variavel com o cnpj completo
codigo_municipio_estabele <- data$V2
data$cnpj = paste(data$V1, data$V2, data$V3, sep = "")
data <- subset(data, select = -c(V1, V2, V3))

# Endereco completo
# Use municipality name directly from lookup table
data$municipio <- municipio_nome

# Build address components correctly
data$gps = paste(data$V14, data$V15, sep = " ")
data$gps = paste(data$gps, data$V16, sep = ", ")
data$bairro <- safe_trimws(data$V18)
bairro_valido <- !is.na(data$bairro) & nzchar(data$bairro) & toupper(data$bairro) != "NA"
data$gps[bairro_valido] <- paste(data$gps[bairro_valido], data$bairro[bairro_valido], sep = ", ")
data$gps = paste(data$gps, data$municipio, sep = " - ")
data$gps = paste(data$gps, data$V20, sep = "/")
data$endereco = paste(data$gps, data$V17, sep = " ")
data$numero <- data$V16
data$cep <- data$V19

# Matriz ou filial
data$V4 = ifelse(data$V4==1, "matriz", "filial")

# Transformacao da Data de Atividade
ano <- substr(data$V11,1,4)
mes <- substr(data$V11,5,6)
dia <- substr(data$V11,7,8)
data$data_atividade = paste0(dia,"/",mes,"/",ano)

# Transformando o telefone
data$telefone = paste0("(", data$V22, ")", " ", data$V23)
data$telefone <- ifelse(data$telefone == "() ", "NA", data$telefone)

# Criando variavel botao de whats
data$whats = paste0("https://api.whatsapp.com/send?phone=55", data$V22, 
                    data$V23, "&text=Ol%C3%A1%2C%20tudo%20bom%3F%20Pe%C3%A7o%20licen%C3%A7a%20para%20entrar%20em%20contato...")

# Criando a variavel email
data$email = ifelse(data$V28=="NULL", "NA", data$V28)
data$email <- ifelse(data$V28 == "NULL" | data$V28 == "", "NA", data$V28)

# Criando o botao de busca no google
data$google = paste0("https://www.google.com/search?q=", "cnpj", " ", data$cnpj," ", 
                     data$V5, " ", codigo_municipio_estabele, "/", data$V20)

# O telefone e celular?
data$tem_whats <- ifelse(substr(data$V23, 1, 1) %in% c("8", "9"), "SIM", "NAO")

# Selecionando as variaveis, renomeando e apagando o restante
data$matriz = data$V4
data$nome = data$V5
#data$estado = data$V20
data$cidade = codigo_municipio_estabele
data$ramo = data$V12
data <- data[,c("id_cnpj", "cnpj", "gps", "endereco", "numero", "bairro", "cep", "data_atividade", 
                "telefone", "whats", "email", "google", "tem_whats", 
                "matriz", "nome", "municipio", "cidade", "ramo")]

# Layout dos Arquivos EMPRESA---------------------------
# V1 CNPJ Básico : NÚMERO BASE DE INSCRIÇÃO NO CNPJ (OITO PRIMEIROS DÍGITOS
#DO CNPJ).
# V2 RAZÃO SOCIAL / NOME EMPRESARIAL NOME EMPRESARIAL DA PESSOA JURÍDICA
# V3 NATUREZA JURÍDICA CÓDIGO DA NATUREZA JURÍDICA
# V4 QUALIFICAÇÃO DO RESPONSÁVEL QUALIFICAÇÃO DA PESSOA FÍSICA RESPONSÁVEL
#PELA EMPRESA
# V5 CAPITAL SOCIAL DA EMPRESA CAPITAL SOCIAL DA EMPRESA
# V6 PORTE DA EMPRESA CÓDIGO DO PORTE DA EMPRESA:
#00 – NÃO INFORMADO
#01 - MICRO EMPRESA
#03 - EMPRESA DE PEQUENO PORTE
#05 - DEMAIS
# V7 ENTE FEDERATIVO RESPONSÁVEL O ENTE FEDERATIVO RESPONSÁVEL É PREENCHIDO
#PARA OS CASOS DE ÓRGÃOS E ENTIDADES DO GRUPO DE NATUREZA JURÍDICA 1XXX. PARA
#AS DEMAIS NATUREZAS, ESTE ATRIBUTO FICA EM BRANCO.
# ----

# Carregar dados totais
arquivos <- arquivos_empre   # definido antes da contagem de linhas

lista <- list()

# Assuming you have a dataset called 'data' and you want to match with its V1 column
V1_values <- data$id_cnpj
current_stage <- "EMPRE"
emprecsv_file <- file.path(cidade_dir, paste0("cnpj_", cidade_nome, "_EMPRECSV.RData"))

if (file.exists(emprecsv_file)) {
  load(emprecsv_file)
  if (!"data_empresa" %in% ls()) data_empresa <- data.frame()
  created_outputs_done <- unique(c(created_outputs_done, basename(emprecsv_file)))
  log_msg("[RETOMADA] Arquivo final de EMPRE já existe:", basename(emprecsv_file), "- etapa pulada")
} else {
  for (i in 1:length(arquivos)) {
    check_cancel()
    arq <- arquivos[[i]]
    result_fp <- final_result_path(current_stage, arq)
    partial_fp <- partial_result_path(current_stage, arq)

    if (file.exists(result_fp)) {
      lista[[i]] <- tryCatch(readRDS(result_fp), error = function(e) data.frame())
      processed_files_done <- unique(c(processed_files_done, basename(arq)))
      next
    }

    current_file_name        <- arq
    current_file_lines_total <- as.integer(totalLinhasArquivos[[arq]])
    skip_rows <- 0L
    seed <- NULL
    if (!is.null(resume_state) && identical(current_stage, resume_state$current_stage) && identical(arq, resume_state$current_file_name)) {
      skip_rows <- as.integer(resume_state$current_file_lines_done)
      if (file.exists(partial_fp)) seed <- tryCatch(readRDS(partial_fp), error = function(e) NULL)
      current_file_lines_done <- skip_rows
      log_msg("[RETOMADA] EMPRE arquivo", basename(arq), "retomando da linha", skip_rows)
    } else {
      current_file_lines_done <- 0L
    }

    write_progress(current_stage, current_file_name, current_file_lines_done, current_file_lines_total,
                   files_done_counter, total_files, lines_done_counter + current_file_lines_done, total_lines, force = TRUE)
    save_checkpoint("running")
    log_msg("Start EMPRE file", arq)
    t0 <- Sys.time()
    out <- read_filter_by_v1(arq, V1_values,
                             progress_fn = update_chunk_progress,
                             skip_rows = skip_rows,
                             seed_data = seed)
    data_empresa <- out$data
    t1 <- Sys.time()
    elapsed <- round(as.numeric(difftime(t1, t0, units = "secs")), 2)

    if (isTRUE(out$paused)) {
      saveRDS(data_empresa, partial_fp)
      save_checkpoint("paused")
      log_msg("[PAUSA] Arquivo atual:", basename(arq),
              "linha:", current_file_lines_done,
              "arquivo_em_criacao:", current_output_file,
              "arquivos_criados:", paste(created_outputs_done, collapse = ","),
              "arquivos_processados:", paste(processed_files_done, collapse = ","))
      write_progress(current_stage, current_file_name,
                     current_file_lines_done, current_file_lines_total,
                     files_done_counter, total_files,
                     lines_done_counter + current_file_lines_done, total_lines,
                     status = "paused", force = TRUE)
      remove_lock()
      quit(save = "no", status = 0)
    }

    log_msg("Finished EMPRE file", arq, "rows:", nrow(data_empresa), "time_s:", elapsed)
    lista[[i]] <- data_empresa
    saveRDS(data_empresa, result_fp)
    if (file.exists(partial_fp)) try(file.remove(partial_fp), silent = TRUE)
    processed_files_done <- unique(c(processed_files_done, basename(arq)))
    files_done_counter  <- files_done_counter + 1L
    lines_done_counter  <- lines_done_counter + current_file_lines_total
    save_checkpoint("running")
    write_progress(current_stage, current_file_name,
                   current_file_lines_total, current_file_lines_total,
                   files_done_counter, total_files, lines_done_counter, total_lines, force = TRUE)
  }

  data_empresa <- do.call("rbind", lista)
  current_output_file <- basename(emprecsv_file)
  save(data_empresa, file = emprecsv_file)
  created_outputs_done <- unique(c(created_outputs_done, basename(emprecsv_file)))
  save_checkpoint("running")
  log_msg("Saved", emprecsv_file)
  current_output_file <- ""
}

rm(lista)
#load("cnpj_NITEROI_EMPRECSV.RData")
data_empresa$id_cnpj = data_empresa$V1

# Criando uma unica base com todos os dados
data <- merge(data, data_empresa, by = "id_cnpj")
data$razao_social = data$V2

# Substituicao dos Codigos
data <- merge(data, natureza_juridica, 
              by.x = "V3", by.y = "V1", all.x = TRUE)
data <- merge(data, qualificacao, 
              by.x = "V4", by.y = "V1", all.x = TRUE)
data$porte = data$V6

# Montando a base de dados final
# Selecionando as variaveis, renomeando e apagando o restante
data$capital = data$V5
data$capital <- as.numeric(gsub(",", ".", data$capital))
data$qualificacao = data$V2
data$porte = data$V6
data$natureza_juridica = data$V2.y
data <- data[,c("id_cnpj","cnpj", "matriz", "nome", "data_atividade", "ramo", "gps",
                "endereco", "numero", "bairro", "cep", "municipio", "telefone", "whats", "email",
                "cidade", "google", "tem_whats", "qualificacao",
                "natureza_juridica", "capital", "porte", "razao_social")]

# Layout dos Arquivos SOCIO---------------------------
# V1* CNPJ Básico : NÚMERO BASE DE INSCRIÇÃO NO CNPJ (OITO PRIMEIROS DÍGITOS
#DO CNPJ).
# V2* IDENTIFICADOR DE SÓCIO CÓDIGO DO IDENTIFICADOR DE SÓCIO
#1 – PESSOA JURÍDICA
#2 – PESSOA FÍSICA
#3 – ESTRANGEIRO
# V3* NOME DO SÓCIO (NO CASO PF) OU RAZÃO SOCIAL (NO CASO PJ) NOME DO SÓCIO
#PESSOA FÍSICA OU A RAZÃO SOCIAL E/OU NOME EMPRESARIAL DA PESSOA JURÍDICA 
#E/OU NOME DO SÓCIO/RAZÃO SOCIAL DO SÓCIO ESTRANGEIRO
# V4 CNPJ/CPF DO SÓCIO CPF OU CNPJ DO SÓCIO (SÓCIO ESTRANGEIRO NÃO TEM ESTA
#INFORMAÇÃO)
# V5* QUALIFICAÇÃO DO SÓCIO CÓDIGO DA QUALIFICAÇÃO DO SÓCIO
# V6 DATA DE ENTRADA SOCIEDADE DATA DE ENTRADA NA SOCIEDADE
# V7* PAIS CÓDIGO PAÍS DO SÓCIO ESTRANGEIRO
# V8 REPRESENTANTE LEGAL NÚMERO DO CPF DO REPRESENTANTE LEGAL
# V9* NOME DO REPRESENTANTE NOME DO REPRESENTANTE LEGAL
# V10 QUALIFICAÇÃO DO REPRESENTANTE LEGAL CÓDIGO DA QUALIFICAÇÃO DO 
#REPRESENTANTE LEGAL
# V11* FAIXA ETÁRIA CÓDIGO CORRESPONDENTE À FAIXA ETÁRIA DO SÓCIO
# ----

# Carregar dados totais
arquivos <- arquivos_socio   # definido antes da contagem de linhas

lista <- list()

# Assuming you have a dataset called 'data' and you want to match with its V1 column
V1_values <- data$id_cnpj
current_stage <- "SOCIO"
sociocsv_file <- file.path(cidade_dir, paste0("cnpj_", cidade_nome, "_SOCIOCSV.RData"))

if (file.exists(sociocsv_file)) {
  load(sociocsv_file)
  if (!"data_socio" %in% ls()) data_socio <- data.frame()
  created_outputs_done <- unique(c(created_outputs_done, basename(sociocsv_file)))
  log_msg("[RETOMADA] Arquivo final de SOCIO já existe:", basename(sociocsv_file), "- etapa pulada")
} else {
  for (i in 1:length(arquivos)) {
    check_cancel()
    arq <- arquivos[[i]]
    result_fp <- final_result_path(current_stage, arq)
    partial_fp <- partial_result_path(current_stage, arq)

    if (file.exists(result_fp)) {
      lista[[i]] <- tryCatch(readRDS(result_fp), error = function(e) data.frame())
      processed_files_done <- unique(c(processed_files_done, basename(arq)))
      next
    }

    current_file_name        <- arq
    current_file_lines_total <- as.integer(totalLinhasArquivos[[arq]])
    skip_rows <- 0L
    seed <- NULL
    if (!is.null(resume_state) && identical(current_stage, resume_state$current_stage) && identical(arq, resume_state$current_file_name)) {
      skip_rows <- as.integer(resume_state$current_file_lines_done)
      if (file.exists(partial_fp)) seed <- tryCatch(readRDS(partial_fp), error = function(e) NULL)
      current_file_lines_done <- skip_rows
      log_msg("[RETOMADA] SOCIO arquivo", basename(arq), "retomando da linha", skip_rows)
    } else {
      current_file_lines_done <- 0L
    }

    write_progress(current_stage, current_file_name, current_file_lines_done, current_file_lines_total,
                   files_done_counter, total_files, lines_done_counter + current_file_lines_done, total_lines, force = TRUE)
    save_checkpoint("running")
    log_msg("Start SOCIO file", arq)
    t0 <- Sys.time()
    out <- read_filter_by_v1(arq, V1_values,
                             progress_fn = update_chunk_progress,
                             skip_rows = skip_rows,
                             seed_data = seed)
    data_socio <- out$data
    t1 <- Sys.time()
    elapsed <- round(as.numeric(difftime(t1, t0, units = "secs")), 2)

    if (isTRUE(out$paused)) {
      saveRDS(data_socio, partial_fp)
      save_checkpoint("paused")
      log_msg("[PAUSA] Arquivo atual:", basename(arq),
              "linha:", current_file_lines_done,
              "arquivo_em_criacao:", current_output_file,
              "arquivos_criados:", paste(created_outputs_done, collapse = ","),
              "arquivos_processados:", paste(processed_files_done, collapse = ","))
      write_progress(current_stage, current_file_name,
                     current_file_lines_done, current_file_lines_total,
                     files_done_counter, total_files,
                     lines_done_counter + current_file_lines_done, total_lines,
                     status = "paused", force = TRUE)
      remove_lock()
      quit(save = "no", status = 0)
    }

    log_msg("Finished SOCIO file", arq, "rows:", nrow(data_socio), "time_s:", elapsed)
    lista[[i]] <- data_socio
    saveRDS(data_socio, result_fp)
    if (file.exists(partial_fp)) try(file.remove(partial_fp), silent = TRUE)
    processed_files_done <- unique(c(processed_files_done, basename(arq)))
    files_done_counter  <- files_done_counter + 1L
    lines_done_counter  <- lines_done_counter + current_file_lines_total
    save_checkpoint("running")
    write_progress(current_stage, current_file_name,
                   current_file_lines_total, current_file_lines_total,
                   files_done_counter, total_files, lines_done_counter, total_lines, force = TRUE)
  }

  data_socio <- do.call("rbind", lista)
  current_output_file <- basename(sociocsv_file)
  save(data_socio, file = sociocsv_file)
  created_outputs_done <- unique(c(created_outputs_done, basename(sociocsv_file)))
  save_checkpoint("running")
  log_msg("Saved", sociocsv_file)
  current_output_file <- ""
}

rm(lista)
#load("data_socio_original.RData")
data_socio$id_cnpj = data_socio$V1

# Criando uma unica base com todos os dados
data <- merge(data, data_socio, by = "id_cnpj")

# Substituicao dos Codigos
data$tipo_socio = data$V2
data$tipo_socio <- ifelse(data$V2 == "1", "pessoa_juridica",
                          ifelse(data$V2 == "2", "pessoa_fisica",
                                 ifelse(data$V2 == "3", "estrangeiro", data$tipo_socio)))
data <- merge(data, qualificacao, 
              by.x = "V5", by.y = "V1", all.x = TRUE)
data <- merge(data, pais, 
              by.x = "V7", by.y = "V1", all.x = TRUE)
data$faixa_etaria = data$V11
data$faixa_etaria <- ifelse(data$V11 == "0", "Nao_se_aplica",
                            ifelse(data$V11 == "1", "0 a 12",
                                   ifelse(data$V11 == "2", "13 a 20",
                                          ifelse(data$V11 == "3", "21 a 30",
                                                 ifelse(data$V11 == "4", "31 a 40",
                                                        ifelse(data$V11 == "5", "41 a 50",
                                                               ifelse(data$V11 == "6", "51 a 60",
                                                                      ifelse(data$V11 == "7", "61 a 70",
                                                                             ifelse(data$V11 == "8", "71 a 80",
                                                                                    ifelse(data$V11 == "9", "Mais_de_80", data$faixa_etaria))))))))))


# Transformacao da Data de Entrada
ano <- substr(data$V6,1,4)
mes <- substr(data$V6,5,6)
dia <- substr(data$V6,7,8)
data$data_entrada_socio = paste0(dia,"/",mes,"/",ano)

# Montando a base de dados final
# Selecionando as variaveis, renomeando e apagando o restante
data$nome_socio = data$V3
data$rep_socio = data$V9
data$pais_socio = data$V2
data$qualificacao_socio = data$V2.y

# Colocando os ramos/cnae
data$V1 = data$ramo
data <- merge(data, cnae, 
              by.x = "ramo", by.y = "V1", all.x = TRUE)
data$ramo_nome = data[,41]

# Substituting values in 'porte'
data$porte <- paste("#", data$porte, sep = "")

# Create a new variable 'new_category' with the updated values
data$new_category <- replace(data$porte, data$porte == "#01", "MICRO")
data$new_category <- replace(data$new_category, data$porte == "#03", "PEQUENA")
data$new_category <- replace(data$new_category, data$porte == "#05", "GRANDE/OUTROS")

# If you want to handle other cases or use NA for unmatched values
data$new_category <- replace(data$new_category, !(data$porte %in% c("#01", "#03", "#05")), NA_character_)

# Assign the updated 'porte2' values to 'porte'
data$porte = data$new_category

data <- data[,c("cnpj", "matriz", "nome", "data_atividade", "ramo", "gps",
                "endereco", "numero", "bairro", "cep", "municipio", "telefone", "whats", "email",
                "cidade", "google", "tem_whats", "qualificacao",
                "natureza_juridica", "capital", "tipo_socio", "razao_social",
                "data_entrada_socio", "qualificacao_socio", "nome_socio",
                "pais_socio", "rep_socio", "faixa_etaria", "porte", "id_cnpj")]

#Contando a frequencia do ramo
data$contagem <- table(data$ramo)[as.character(data$ramo)]

data$data_atividade <- paste("#", data$data_atividade, sep = "")
data$cnpj <- paste("#", data$cnpj, sep = "")
data$id_cnpj <- paste("#", data$id_cnpj, sep = "")
data$ramo <- paste("#", data$ramo, sep = "")
data$capital <- paste("#", format(data$capital, scientific = FALSE), sep = "")
data$data_entrada_socio <- paste("#", data$data_entrada_socio, sep = "")
data$contagem <- paste("#", data$contagem, sep = "")

# Removendo os acentos latinos
char_cols <- sapply(data, is.character)

# Apply the transformation to each character column
data[, char_cols] <- lapply(data[, char_cols], function(x) stri_trans_general(x, "Latin-ASCII"))

# write final outputs
cnpj_csv   <- file.path(cidade_dir, paste0("cnpj_", cidade_nome, ".csv"))
cnpj_rdata <- file.path(cidade_dir, paste0("cnpj_", cidade_nome, ".RData"))
current_output_file <- basename(cnpj_csv)
write_csv(data, cnpj_csv)
created_outputs_done <- unique(c(created_outputs_done, basename(cnpj_csv)))
save_checkpoint("running")
current_output_file <- basename(cnpj_rdata)
save(data, file = cnpj_rdata)
created_outputs_done <- unique(c(created_outputs_done, basename(cnpj_rdata)))
save_checkpoint("running")
log_msg("Saved final", cnpj_csv, "and", cnpj_rdata)
current_output_file <- ""

# gerar arquivos de fábricas por cidade (mesma lógica usada no fluxo de Niterói)
cidade_slug <- tolower(stri_trans_general(cidade_nome, "Latin-ASCII"))
cidade_slug <- gsub("[^a-z0-9]+", "_", cidade_slug)
cidade_slug <- gsub("^_+|_+$", "", cidade_slug)

fabricas <- data
fabricas$capital_num <- suppressWarnings(as.numeric(gsub("#", "", fabricas$capital)))
fabricas$ramo_num <- suppressWarnings(as.numeric(gsub("#", "", fabricas$ramo)))

fabricas <- fabricas %>%
  filter(capital_num > 1000000,
         ramo_num >= 1000000,
         ramo_num <= 3300000,
         porte == "GRANDE/OUTROS") %>%
  select(-capital_num, -ramo_num)

fabricas_csv <- file.path(cidade_dir, paste0("fabricas_", cidade_slug, ".csv"))
fabricas_rdata <- file.path(cidade_dir, paste0("fabricas_", cidade_slug, ".RData"))

current_stage <- "FABRICAS"
current_file_name <- fabricas_csv
current_file_lines_total <- ifelse(is.finite(total_lines) && total_lines > 0, as.integer(total_lines), 1L)
current_file_lines_done <- as.integer(lines_done_counter)
write_progress(current_stage, current_file_name,
               current_file_lines_done, current_file_lines_total,
               files_done_counter, total_files,
               lines_done_counter, total_lines, force = TRUE)

current_output_file <- basename(fabricas_csv)
write_csv(fabricas, fabricas_csv)
created_outputs_done <- unique(c(created_outputs_done, basename(fabricas_csv)))
files_done_counter <- files_done_counter + 1L
save_checkpoint("running")
write_progress(current_stage, current_output_file,
               current_file_lines_total, current_file_lines_total,
               files_done_counter, total_files,
               total_lines, total_lines, force = TRUE)

current_output_file <- basename(fabricas_rdata)
save(fabricas, file = fabricas_rdata)
created_outputs_done <- unique(c(created_outputs_done, basename(fabricas_rdata)))
files_done_counter <- files_done_counter + 1L
save_checkpoint("running")
write_progress(current_stage, current_output_file,
               current_file_lines_total, current_file_lines_total,
               files_done_counter, total_files,
               total_lines, total_lines, force = TRUE)

log_msg("Saved fabricas", fabricas_csv, "and", fabricas_rdata, "rows:", nrow(fabricas))
current_output_file <- ""

# finish
write_progress("CONCLUIDO", "finalizado", 0, 0, total_files, total_files,
               total_lines, total_lines, status = "done", force = TRUE)
log_msg("Script finished")
try(if (file.exists(checkpoint_path)) file.remove(checkpoint_path), silent = TRUE)
try(if (file.exists(pause_path)) file.remove(pause_path), silent = TRUE)
try(unlink(partials_dir, recursive = TRUE, force = TRUE), silent = TRUE)
remove_lock()
#load("C:/Users/colet/Downloads/Processamento de Dados/datadata/cnpj_NITEROI.RData")
