#!/usr/bin/env Rscript

suppressWarnings({
  options(stringsAsFactors = FALSE)
})

has_dt <- requireNamespace("data.table", quietly = TRUE)

read_csv_fast <- function(path) {
  if (has_dt) {
    return(as.data.frame(data.table::fread(path, encoding = "UTF-8", data.table = FALSE, showProgress = FALSE)))
  }
  read.csv(path, stringsAsFactors = FALSE, check.names = FALSE)
}

write_csv_fast <- function(df, path) {
  if (has_dt) {
    data.table::fwrite(df, file = path, quote = TRUE, bom = FALSE, na = "")
    return(invisible(NULL))
  }
  write.csv(df, path, row.names = FALSE, na = "")
}

base_dir <- "data"
log_path <- "temp_fix_gps_historico.progress.log"
if (file.exists(log_path)) {
  try(unlink(log_path), silent = TRUE)
}

targets <- list(
  list(city = "NITEROI", slug = "niteroi"),
  list(city = "PETROPOLIS", slug = "petropolis"),
  list(city = "RIO DE JANEIRO", slug = "rio_de_janeiro")
)

fix_city_suffix_niteroi <- function(x) {
  y <- as.character(x)
  y <- gsub("\\bNA\\s*/\\s*RJ\\b", "NITEROI/RJ", y, ignore.case = TRUE)
  y <- gsub("-\\s*NA/RJ", "- NITEROI/RJ", y, ignore.case = TRUE)
  y
}

infer_bairro_from_endereco <- function(endereco, city_name = "") {
  e <- as.character(endereco)
  city <- trimws(as.character(city_name))
  out <- rep("", length(e))

  stopwords <- c(
    "SALA", "SALA:", "LOJA", "LJ", "LJ.", "CASA", "APTO", "APT", "APARTAMENTO",
    "ANDAR", "BLOCO", "BL", "QUADRA", "QD", "LOTE", "LT", "KM", "PARTE",
    "FUNDOS", "TERREO", "PAVIMENTO", "SOBRELOJA", "GALPAO", "CONJ", "CONJUNTO",
    "SN", "S/N", "N", "NUM", "NUMERO"
  )

  for (i in seq_along(e)) {
    txt <- trimws(e[i])
    if (is.na(txt) || txt == "" || toupper(txt) == "NA") next

    tail_txt <- ""
    if (nzchar(city)) {
      pat <- paste0("-\\s*", city, "/[A-Z]{2}\\s*(.*)$")
      m <- regexec(pat, txt, ignore.case = TRUE, perl = TRUE)
      g <- regmatches(txt, m)
      if (length(g[[1]]) >= 2) tail_txt <- trimws(g[[1]][2])
    }

    if (!nzchar(tail_txt)) next
    if (nchar(tail_txt) > 40) next
    if (nzchar(city) && grepl(city, tail_txt, ignore.case = TRUE, perl = TRUE)) next

    tail_txt <- gsub("^(NA|N/A)\\s+", "", tail_txt, ignore.case = TRUE, perl = TRUE)
    cleaned <- gsub("[^A-Za-zÀ-ÿ0-9 ]", " ", tail_txt, perl = TRUE)
    cleaned <- gsub("\\s+", " ", cleaned, perl = TRUE)
    cleaned <- trimws(cleaned)
    if (!nzchar(cleaned)) next

    tokens <- unlist(strsplit(cleaned, " ", fixed = TRUE), use.names = FALSE)
    if (!length(tokens)) next

    keep <- tokens[
      !toupper(tokens) %in% stopwords &
      !grepl("^[0-9]+$", tokens)
    ]
    if (!length(keep)) next

    n <- min(3L, length(keep))
    cand <- paste(tail(keep, n), collapse = " ")
    cand <- trimws(cand)
    if (nchar(cand) < 3) next
    out[i] <- cand
  }

  out
}

ensure_bairro_in_gps <- function(gps, bairro, endereco = NULL, city_name = "") {
  gps <- as.character(gps)
  bairro_vec <- trimws(as.character(bairro))

  if (is.null(endereco)) {
    endereco <- rep("", length(gps))
  }
  endereco <- as.character(endereco)

  inferred <- infer_bairro_from_endereco(endereco, city_name)
  use_inferred <- is.na(bairro_vec) | bairro_vec == "" | toupper(bairro_vec) == "NA"
  bairro_vec[use_inferred] <- inferred[use_inferred]

  out <- gps
  for (i in seq_along(out)) {
    g <- out[i]
    b <- bairro_vec[i]
    if (is.na(g) || trimws(g) == "" || toupper(trimws(g)) == "NA") next
    if (is.na(b) || trimws(b) == "" || toupper(trimws(b)) == "NA") next

    if (grepl(paste0(", ", tolower(b), " -"), tolower(g), fixed = TRUE)) {
      next
    }

    sep_pos <- regexpr("\\s-\\s", g, perl = TRUE)
    if (sep_pos[1] > 0) {
      prefix <- trimws(substr(g, 1, sep_pos[1] - 1))
      suffix <- trimws(substr(g, sep_pos[1] + 3, nchar(g)))
      out[i] <- paste0(prefix, ", ", b, " - ", suffix)
    } else {
      out[i] <- paste0(trimws(g), ", ", b)
    }
  }
  out
}

update_df <- function(df, city_name, file_tag) {
  changed <- FALSE
  if (!is.data.frame(df)) return(list(df = df, changed = FALSE))

  if ("gps" %in% names(df)) {
    bairro_src <- if ("bairro" %in% names(df)) df$bairro else rep("", nrow(df))
    endereco_src <- if ("endereco" %in% names(df)) df$endereco else rep("", nrow(df))
    old <- as.character(df$gps)
    new <- ensure_bairro_in_gps(df$gps, bairro_src, endereco_src, city_name)
    if (!identical(old, new)) {
      df$gps <- new
      changed <- TRUE
    }
  }

  if (toupper(city_name) == "NITEROI") {
    if ("gps" %in% names(df)) {
      old <- as.character(df$gps)
      new <- fix_city_suffix_niteroi(df$gps)
      if (!identical(old, new)) {
        df$gps <- new
        changed <- TRUE
      }
    }
    if ("endereco" %in% names(df)) {
      old <- as.character(df$endereco)
      new <- fix_city_suffix_niteroi(df$endereco)
      if (!identical(old, new)) {
        df$endereco <- new
        changed <- TRUE
      }
    }
  }

  list(df = df, changed = changed)
}

all_files <- list()
for (t in targets) {
  city_dir <- file.path(base_dir, t$city)
  all_files <- c(all_files,
                 list(list(path = file.path(city_dir, paste0("cnpj_", t$city, ".csv")), city = t$city, type = "csv")),
                 list(list(path = file.path(city_dir, paste0("fabricas_", t$slug, ".csv")), city = t$city, type = "csv")),
                 list(list(path = file.path(city_dir, paste0("cnpj_", t$city, ".RData")), city = t$city, type = "rdata")),
                 list(list(path = file.path(city_dir, paste0("fabricas_", t$slug, ".RData")), city = t$city, type = "rdata")))
}

existing_files <- Filter(function(f) file.exists(f$path), all_files)

sink(log_path, append = TRUE, split = TRUE)
on.exit({
  while (sink.number() > 0) sink()
}, add = TRUE)

if (!length(existing_files)) {
  cat("[INFO] Nenhum arquivo alvo encontrado.\n")
  quit(save = "no", status = 0)
}

start_time <- Sys.time()
total_steps <- length(existing_files)
processed_steps <- 0

format_eta <- function(seconds_left) {
  if (!is.finite(seconds_left) || is.na(seconds_left)) return("--")
  s <- max(0, as.integer(round(seconds_left)))
  h <- s %/% 3600
  m <- (s %% 3600) %/% 60
  sec <- s %% 60
  if (h > 0) return(sprintf("%dh %dm %ds", h, m, sec))
  if (m > 0) return(sprintf("%dm %ds", m, sec))
  sprintf("%ds", sec)
}

report_progress <- function() {
  elapsed <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))
  pct <- if (total_steps > 0) (processed_steps / total_steps) * 100 else 100
  eta <- if (processed_steps > 0) (elapsed / processed_steps) * (total_steps - processed_steps) else NA_real_
  cat(sprintf("[PROGRESS] %.1f%% (%d/%d) | decorrido: %s | ETA: %s\n",
              pct, processed_steps, total_steps,
              format_eta(elapsed), format_eta(eta)))
}

cat(sprintf("[START] Corrigindo %d arquivo(s)...\n", total_steps))
report_progress()

for (f in existing_files) {
  cat(sprintf("[FILE] %s\n", f$path))
  if (f$type == "csv") {
    df <- tryCatch(read_csv_fast(f$path), error = function(e) NULL)
    if (is.null(df)) {
      cat("[WARN] Falha ao ler CSV, pulando.\n")
    } else {
      upd <- update_df(df, f$city, basename(f$path))
      if (isTRUE(upd$changed)) {
        write_csv_fast(upd$df, f$path)
        cat("[OK] CSV atualizado.\n")
      } else {
        cat("[OK] CSV sem alterações necessárias.\n")
      }
    }
  } else if (f$type == "rdata") {
    env <- new.env(parent = emptyenv())
    ok_load <- TRUE
    tryCatch(load(f$path, envir = env), error = function(e) { ok_load <<- FALSE })
    if (!ok_load) {
      cat("[WARN] Falha ao ler RData, pulando.\n")
    } else {
      objs <- ls(env, all.names = TRUE)
      changed_any <- FALSE
      for (nm in objs) {
        obj <- get(nm, envir = env)
        if (is.data.frame(obj)) {
          upd <- update_df(obj, f$city, basename(f$path))
          if (isTRUE(upd$changed)) {
            assign(nm, upd$df, envir = env)
            changed_any <- TRUE
          }
        }
      }
      if (changed_any) {
        save(list = ls(env, all.names = TRUE), file = f$path, envir = env)
        cat("[OK] RData atualizado.\n")
      } else {
        cat("[OK] RData sem alterações necessárias.\n")
      }
    }
  }

  processed_steps <- processed_steps + 1
  report_progress()
}

cat("[DONE] Correção concluída com sucesso.\n")
