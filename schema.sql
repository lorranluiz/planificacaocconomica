--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Ubuntu 16.8-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: instance_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.instance_type AS ENUM (
    'COUNCIL',
    'COMMITTEE',
    'WORKER'
);


ALTER TYPE public.instance_type OWNER TO postgres;

--
-- Name: social_materialization_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.social_materialization_type AS ENUM (
    'PRODUCT',
    'SERVICE'
);


ALTER TYPE public.social_materialization_type OWNER TO postgres;

--
-- Name: user_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_type AS ENUM (
    'COUNCILLOR',
    'NON-COUNCILLOR'
);


ALTER TYPE public.user_type OWNER TO postgres;

--
-- Name: validate_non_councillor_worker_relation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_non_councillor_worker_relation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    instance_type VARCHAR(50);
    instance_user_count INTEGER;
BEGIN
    -- Verificar se o novo registro é do tipo NON_COUNCILLOR
    IF NEW.type = 'NON_COUNCILLOR' THEN
        -- Verificar se a instância é do tipo WORKER
        SELECT i.type INTO instance_type
        FROM instance i
        WHERE i.id = NEW.id_instance;
        
        IF instance_type != 'WORKER' THEN
            -- Registrar a violação no log
            INSERT INTO business_rule_violation_log (
                table_name, operation, user_id, instance_id, user_type, instance_type, error_message
            ) VALUES (
                'user', 
                TG_OP, 
                NEW.id, 
                NEW.id_instance, 
                NEW.type, 
                instance_type, 
                'Usuários NON_COUNCILLOR só podem ser associados a instâncias WORKER'
            );
            
            RAISE EXCEPTION 'Usuários NON_COUNCILLOR só podem ser associados a instâncias WORKER';
        END IF;
        
        -- Verificar se a instância já está associada a outro usuário
        SELECT COUNT(*) INTO instance_user_count
        FROM "user" u
        WHERE u.id_instance = NEW.id_instance 
          AND u.id != NEW.id;
          
        IF instance_user_count > 0 THEN
            -- Registrar a violação no log
            INSERT INTO business_rule_violation_log (
                table_name, operation, user_id, instance_id, user_type, instance_type, error_message
            ) VALUES (
                'user', 
                TG_OP, 
                NEW.id, 
                NEW.id_instance, 
                NEW.type, 
                instance_type, 
                'Esta instância WORKER já está associada a outro usuário'
            );
            
            RAISE EXCEPTION 'Esta instância WORKER já está associada a outro usuário';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_non_councillor_worker_relation() OWNER TO postgres;

--
-- Name: validate_user_instance_type(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_user_instance_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    instance_type VARCHAR(50);
BEGIN
    -- Obter o tipo de instância
    SELECT i.type INTO instance_type
    FROM instance i
    WHERE i.id = NEW.id_instance;
    
    -- Verificar a compatibilidade
    IF (NEW.type = 'COUNCILLOR' AND instance_type NOT IN ('COUNCIL', 'COMMITTEE')) THEN
        -- Registrar a violação
        INSERT INTO business_rule_violation_log (
            table_name, operation, user_id, instance_id, user_type, instance_type, error_message
        ) VALUES (
            'user', 
            TG_OP, 
            NEW.id, 
            NEW.id_instance, 
            NEW.type, 
            instance_type, 
            'Usuários COUNCILLOR só podem pertencer a instâncias COUNCIL ou COMMITTEE'
        );
        
        -- Rejeitar a operação
        RAISE EXCEPTION 'Usuários COUNCILLOR só podem pertencer a instâncias COUNCIL ou COMMITTEE';
    END IF;
    
    IF (NEW.type = 'NON_COUNCILLOR' AND instance_type != 'WORKER') THEN
        -- Registrar a violação
        INSERT INTO business_rule_violation_log (
            table_name, operation, user_id, instance_id, user_type, instance_type, error_message
        ) VALUES (
            'user', 
            TG_OP, 
            NEW.id, 
            NEW.id_instance, 
            NEW.type, 
            instance_type, 
            'Usuários NON_COUNCILLOR só podem pertencer a instâncias WORKER'
        );
        
        -- Rejeitar a operação
        RAISE EXCEPTION 'Usuários NON_COUNCILLOR só podem pertencer a instâncias WORKER';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_user_instance_type() OWNER TO postgres;

--
-- Name: validate_worker_instance_association(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_worker_instance_association() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    has_non_councillor BOOLEAN;
BEGIN
    -- Se não é uma instância WORKER, não precisamos validar
    IF NEW.type != 'WORKER' THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se existe algum usuário NON_COUNCILLOR associado a esta instância
    SELECT EXISTS(
        SELECT 1 
        FROM "user" u 
        WHERE u.id_instance = NEW.id 
        AND u.type = 'NON_COUNCILLOR'
    ) INTO has_non_councillor;
    
    -- Se estamos atualizando um WORKER existente e não há usuário NON_COUNCILLOR associado
    IF NOT has_non_councillor AND TG_OP = 'UPDATE' THEN
        -- Registrar a violação no log
        INSERT INTO business_rule_violation_log (
            table_name, operation, instance_id, instance_type, error_message
        ) VALUES (
            'instance', 
            TG_OP, 
            NEW.id, 
            NEW.type, 
            'Instâncias WORKER devem estar associadas a um usuário NON_COUNCILLOR'
        );
        
        RAISE EXCEPTION 'Instâncias WORKER devem estar associadas a um usuário NON_COUNCILLOR';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_worker_instance_association() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: business_rule_violation_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_rule_violation_log (
    id integer NOT NULL,
    table_name character varying(50) NOT NULL,
    operation character varying(10) NOT NULL,
    user_id integer,
    instance_id integer,
    user_type character varying(50),
    instance_type character varying(50),
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.business_rule_violation_log OWNER TO postgres;

--
-- Name: business_rule_violation_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_rule_violation_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_rule_violation_log_id_seq OWNER TO postgres;

--
-- Name: business_rule_violation_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_rule_violation_log_id_seq OWNED BY public.business_rule_violation_log.id;


--
-- Name: committee_id; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.committee_id (
    id integer
);


ALTER TABLE public.committee_id OWNER TO postgres;

--
-- Name: demand_stock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demand_stock (
    id_instance integer NOT NULL,
    id_social_materialization integer NOT NULL,
    stock numeric(16,6) NOT NULL,
    demand numeric(16,6) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.demand_stock OWNER TO postgres;

--
-- Name: TABLE demand_stock; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.demand_stock IS 'estoqueDemanda, de Comitê, com o id_social_materialization sendo o bemDeProducao';


--
-- Name: demand_vector; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demand_vector (
    id_instance integer NOT NULL,
    id_social_materialization integer NOT NULL,
    demand double precision,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.demand_vector OWNER TO postgres;

--
-- Name: instance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instance (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_social_materialization integer,
    worker_effective_limit integer,
    popular_council_associated_with_committee_or_worker integer,
    popular_council_associated_with_popular_council integer,
    produced_quantity numeric(16,2),
    target_quantity numeric(16,2),
    committee_name character varying(150),
    total_social_work_of_this_jurisdiction integer DEFAULT 0,
    id_associated_worker_committee integer,
    id_associated_worker_residents_association integer,
    estimated_individual_participation_in_social_work numeric(20,10),
    hours_at_electronic_point numeric(10,2),
    type character varying(50) NOT NULL,
    CONSTRAINT chk_committee_columns CHECK ((((type)::text <> 'COMMITTEE'::text) OR ((committee_name IS NOT NULL) AND (popular_council_associated_with_committee_or_worker IS NOT NULL) AND (total_social_work_of_this_jurisdiction IS NOT NULL) AND (id_social_materialization IS NOT NULL) AND (produced_quantity IS NOT NULL) AND (target_quantity IS NOT NULL) AND (produced_quantity < target_quantity)))),
    CONSTRAINT chk_council_columns CHECK ((((type)::text <> 'COUNCIL'::text) OR ((total_social_work_of_this_jurisdiction IS NOT NULL) AND (popular_council_associated_with_popular_council IS NOT NULL)))),
    CONSTRAINT chk_worker_columns CHECK ((((type)::text <> 'WORKER'::text) OR ((popular_council_associated_with_committee_or_worker IS NOT NULL) AND (id_associated_worker_committee IS NOT NULL) AND (id_associated_worker_residents_association = 0) AND (estimated_individual_participation_in_social_work IS NOT NULL) AND (hours_at_electronic_point IS NOT NULL)))),
    CONSTRAINT chk_worker_effective_limit CHECK (((((type)::text = 'COMMITTEE'::text) AND (worker_effective_limit IS NOT NULL)) OR (((type)::text <> 'COMMITTEE'::text) AND (worker_effective_limit IS NULL)))),
    CONSTRAINT instance_type_check CHECK (((type)::text = ANY ((ARRAY['COUNCIL'::character varying, 'COMMITTEE'::character varying, 'WORKER'::character varying])::text[])))
);


ALTER TABLE public.instance OWNER TO postgres;

--
-- Name: TABLE instance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.instance IS 'Conselho, Comitê ou Trabalhador.';


--
-- Name: COLUMN instance.id_social_materialization; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.id_social_materialization IS 'setorUnidade, o setor associado a esse produto ou serviço, usado quando for Comitê';


--
-- Name: COLUMN instance.worker_effective_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.worker_effective_limit IS 'limiteEfetivoTrabalhadores - Limite do efetivo de trabalhadores para esta instância';


--
-- Name: COLUMN instance.popular_council_associated_with_committee_or_worker; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.popular_council_associated_with_committee_or_worker IS 'Referência ao conselho popular associado a este comitê ou trabalhador. No caso do Conselho da Intercontinental da Terra Pode ser NULL, não estando associado a um outro conselho superior.';


--
-- Name: COLUMN instance.popular_council_associated_with_popular_council; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.popular_council_associated_with_popular_council IS 'Referência ao conselho popular associado a este conselho popular. No caso do Conselho da Intercontinental da Terra Pode ser NULL, não estando associado a um outro conselho superior.';


--
-- Name: COLUMN instance.produced_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.produced_quantity IS 'quantidadeProduzida, de Comitê (era de producaoMeta) - Quantidade que já foi produzida pela instância';


--
-- Name: COLUMN instance.target_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.target_quantity IS 'quantidadeMeta, de Comitê (era de producaoMeta) - Meta de produção estabelecida para a instância';


--
-- Name: COLUMN instance.committee_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.committee_name IS 'comiteColTitle, nome do Comitê';


--
-- Name: COLUMN instance.total_social_work_of_this_jurisdiction; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.total_social_work_of_this_jurisdiction IS 'totalSocialWorkDessaJurisdicao, anteriormente.';


--
-- Name: COLUMN instance.id_associated_worker_committee; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.id_associated_worker_committee IS 'Trabalhador não-conselheiro. Comitê do local em que ele trabalha. Referência ao comitê de trabalhadores associado a esta instância. Pode ser NULL se não houver um comitê associado.';


--
-- Name: COLUMN instance.id_associated_worker_residents_association; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.id_associated_worker_residents_association IS 'Trabalhador não-conselheiro. Referência à Associação de Moradores associada a este Trabalhador (instância do tipo Trabalhador). Pode ser NULL, mas senão, deve corresponder a um id existente.';


--
-- Name: COLUMN instance.estimated_individual_participation_in_social_work; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.estimated_individual_participation_in_social_work IS 'Trabalhador não-conselheiro. partipacaoIndividualEstimadaNoTrabalhoSocial - Estimativa da participação individual no trabalho social';


--
-- Name: COLUMN instance.hours_at_electronic_point; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.instance.hours_at_electronic_point IS 'Trabalhador não-conselheiro. Horas registradas no ponto eletrônico do Trabalhador';


--
-- Name: instance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instance_id_seq OWNER TO postgres;

--
-- Name: instance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instance_id_seq OWNED BY public.instance.id;


--
-- Name: optimization_inputs_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.optimization_inputs_results (
    id_social_materialization integer NOT NULL,
    worker_limit integer NOT NULL,
    worker_hours numeric(10,2) NOT NULL,
    production_time numeric(10,2) NOT NULL,
    night_shift boolean NOT NULL,
    weekly_scale integer NOT NULL,
    planned_weekly_scale integer NOT NULL,
    production_goal numeric(16,6) NOT NULL,
    total_hours numeric(16,10) NOT NULL,
    workers_needed integer NOT NULL,
    factories_needed integer NOT NULL,
    total_shifts integer NOT NULL,
    minimum_production_time numeric(10,2) NOT NULL,
    planned_final_demand numeric(16,6) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_instance integer NOT NULL,
    total_employment_period bigint,
    CONSTRAINT optimization_inputs_results_total_employment_period_check CHECK ((total_employment_period >= 0))
);


ALTER TABLE public.optimization_inputs_results OWNER TO postgres;

--
-- Name: TABLE optimization_inputs_results; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.optimization_inputs_results IS 'O que fica nas janelas modais, tanto nas entradas do usuário quanto nas janelas com saídas com valores otimizados.';


--
-- Name: COLUMN optimization_inputs_results.id_social_materialization; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.optimization_inputs_results.id_social_materialization IS 'Produto ou serviço associado.';


--
-- Name: COLUMN optimization_inputs_results.id_instance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.optimization_inputs_results.id_instance IS 'Referência à instância associada a este resultado de otimização';


--
-- Name: sector; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sector (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sector OWNER TO postgres;

--
-- Name: sector_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sector_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sector_id_seq OWNER TO postgres;

--
-- Name: sector_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sector_id_seq OWNED BY public.sector.id;


--
-- Name: social_materialization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.social_materialization (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type character varying(50) NOT NULL,
    id_sector integer NOT NULL,
    CONSTRAINT social_materialization_type_check CHECK (((type)::text = ANY ((ARRAY['PRODUCT'::character varying, 'SERVICE'::character varying])::text[])))
);


ALTER TABLE public.social_materialization OWNER TO postgres;

--
-- Name: COLUMN social_materialization.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.social_materialization.type IS 'Produto ou Serviço';


--
-- Name: COLUMN social_materialization.id_sector; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.social_materialization.id_sector IS 'Categoria analítica. Setor.';


--
-- Name: social_materialization_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.social_materialization_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.social_materialization_id_seq OWNER TO postgres;

--
-- Name: social_materialization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.social_materialization_id_seq OWNED BY public.social_materialization.id;


--
-- Name: technological_tensor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.technological_tensor (
    id_instance integer NOT NULL,
    id_social_materialization integer NOT NULL,
    id_production_input integer NOT NULL,
    technical_coefficient_element_value numeric(12,6),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.technological_tensor OWNER TO postgres;

--
-- Name: COLUMN technological_tensor.id_production_input; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.technological_tensor.id_production_input IS 'Bem de produção.';


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    id_instance integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type character varying(50) NOT NULL,
    pronoun character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    CONSTRAINT user_pronoun_check CHECK (((pronoun)::text = ANY ((ARRAY['HE_HIM'::character varying, 'SHE_HER'::character varying, 'THEY_THEM'::character varying])::text[]))),
    CONSTRAINT user_type_check CHECK (((type)::text = ANY ((ARRAY['COUNCILLOR'::character varying, 'NON_COUNCILLOR'::character varying, 'WORKER'::character varying])::text[])))
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: TABLE "user"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."user" IS 'A validação da relação entre tipo de usuário e tipo de instância é feita pelo trigger check_user_instance_type_trigger';


--
-- Name: COLUMN "user".type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."user".type IS 'Indica se o usuário é conselheiro ou não';


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: v_non_councillor_worker_relation; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_non_councillor_worker_relation AS
 SELECT u.id AS user_id,
    u.username,
    u.name AS user_name,
    i.id AS instance_id,
    i.committee_name AS instance_name,
    u.created_at AS user_created_at,
    i.created_at AS instance_created_at
   FROM (public."user" u
     JOIN public.instance i ON ((u.id_instance = i.id)))
  WHERE (((u.type)::text = 'NON_COUNCILLOR'::text) AND ((i.type)::text = 'WORKER'::text));


ALTER VIEW public.v_non_councillor_worker_relation OWNER TO postgres;

--
-- Name: v_user_instance_compatibility; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_user_instance_compatibility AS
 SELECT u.id AS user_id,
    u.username,
    u.name AS user_name,
    u.type AS user_type,
    i.id AS instance_id,
    i.committee_name,
    i.type AS instance_type,
        CASE
            WHEN (((u.type)::text = 'COUNCILLOR'::text) AND ((i.type)::text = ANY ((ARRAY['COUNCIL'::character varying, 'COMMITTEE'::character varying])::text[]))) THEN true
            WHEN (((u.type)::text = 'NON_COUNCILLOR'::text) AND ((i.type)::text = 'WORKER'::text)) THEN true
            ELSE false
        END AS is_compatible
   FROM (public."user" u
     JOIN public.instance i ON ((u.id_instance = i.id)));


ALTER VIEW public.v_user_instance_compatibility OWNER TO postgres;

--
-- Name: workers_proposal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workers_proposal (
    worker_limit integer NOT NULL,
    worker_hours numeric(10,2) NOT NULL,
    production_time numeric(10,2) NOT NULL,
    night_shift boolean NOT NULL,
    weekly_scale integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_instance integer NOT NULL
);


ALTER TABLE public.workers_proposal OWNER TO postgres;

--
-- Name: TABLE workers_proposal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.workers_proposal IS 'propostaTrabalhadores, de Comitê.';


--
-- Name: COLUMN workers_proposal.id_instance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.workers_proposal.id_instance IS 'Referência à instância associada a este resultado de otimização';


--
-- Name: business_rule_violation_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_rule_violation_log ALTER COLUMN id SET DEFAULT nextval('public.business_rule_violation_log_id_seq'::regclass);


--
-- Name: instance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance ALTER COLUMN id SET DEFAULT nextval('public.instance_id_seq'::regclass);


--
-- Name: sector id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector ALTER COLUMN id SET DEFAULT nextval('public.sector_id_seq'::regclass);


--
-- Name: social_materialization id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_materialization ALTER COLUMN id SET DEFAULT nextval('public.social_materialization_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: business_rule_violation_log business_rule_violation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_rule_violation_log
    ADD CONSTRAINT business_rule_violation_log_pkey PRIMARY KEY (id);


--
-- Name: instance instance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT instance_pkey PRIMARY KEY (id);


--
-- Name: sector sector_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector
    ADD CONSTRAINT sector_pkey PRIMARY KEY (id);


--
-- Name: social_materialization social_materialization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_materialization
    ADD CONSTRAINT social_materialization_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user user_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_username_key UNIQUE (username);


--
-- Name: idx_instance_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instance_type ON public.instance USING btree (type);


--
-- Name: idx_unique_worker_instance_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_worker_instance_user ON public."user" USING btree (id_instance) WHERE ((type)::text = 'NON_COUNCILLOR'::text);


--
-- Name: idx_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_type ON public."user" USING btree (type);


--
-- Name: user check_non_councillor_worker_relation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_non_councillor_worker_relation BEFORE INSERT OR UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.validate_non_councillor_worker_relation();


--
-- Name: user check_user_instance_type_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_user_instance_type_trigger BEFORE INSERT OR UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.validate_user_instance_type();


--
-- Name: instance check_worker_instance_association; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_worker_instance_association AFTER UPDATE ON public.instance FOR EACH ROW WHEN (((new.type)::text = 'WORKER'::text)) EXECUTE FUNCTION public.validate_worker_instance_association();


--
-- Name: demand_stock fk_demand_stock_instance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_stock
    ADD CONSTRAINT fk_demand_stock_instance FOREIGN KEY (id_instance) REFERENCES public.instance(id);


--
-- Name: demand_stock fk_demand_stock_social_materialization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_stock
    ADD CONSTRAINT fk_demand_stock_social_materialization FOREIGN KEY (id_social_materialization) REFERENCES public.social_materialization(id);


--
-- Name: demand_vector fk_demand_vector_instance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_vector
    ADD CONSTRAINT fk_demand_vector_instance FOREIGN KEY (id_instance) REFERENCES public.instance(id);


--
-- Name: demand_vector fk_demand_vector_social_materialization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_vector
    ADD CONSTRAINT fk_demand_vector_social_materialization FOREIGN KEY (id_social_materialization) REFERENCES public.social_materialization(id);


--
-- Name: instance fk_instance_council__council_reference; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_instance_council__council_reference FOREIGN KEY (popular_council_associated_with_popular_council) REFERENCES public.instance(id);


--
-- Name: instance fk_instance_council_committee_or_worker_reference; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_instance_council_committee_or_worker_reference FOREIGN KEY (popular_council_associated_with_committee_or_worker) REFERENCES public.instance(id);


--
-- Name: instance fk_instance_council_council_reference; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_instance_council_council_reference FOREIGN KEY (popular_council_associated_with_popular_council) REFERENCES public.instance(id);


--
-- Name: instance fk_instance_social_materialization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_instance_social_materialization FOREIGN KEY (id_social_materialization) REFERENCES public.social_materialization(id);


--
-- Name: instance fk_instance_worker_committee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_instance_worker_committee FOREIGN KEY (id_associated_worker_committee) REFERENCES public.instance(id);


--
-- Name: instance fk_instance_worker_residents_association; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_instance_worker_residents_association FOREIGN KEY (id_associated_worker_residents_association) REFERENCES public.instance(id);


--
-- Name: optimization_inputs_results fk_optimization_inputs_results_instance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optimization_inputs_results
    ADD CONSTRAINT fk_optimization_inputs_results_instance FOREIGN KEY (id_instance) REFERENCES public.instance(id);


--
-- Name: workers_proposal fk_optimization_inputs_results_instance_0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workers_proposal
    ADD CONSTRAINT fk_optimization_inputs_results_instance_0 FOREIGN KEY (id_instance) REFERENCES public.instance(id);


--
-- Name: optimization_inputs_results fk_optimization_inputs_results_social_materialization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optimization_inputs_results
    ADD CONSTRAINT fk_optimization_inputs_results_social_materialization FOREIGN KEY (id_social_materialization) REFERENCES public.social_materialization(id);


--
-- Name: instance fk_popular_council_association; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_popular_council_association FOREIGN KEY (popular_council_associated_with_committee_or_worker) REFERENCES public.instance(id);


--
-- Name: instance fk_popular_council_to_popular_council; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_popular_council_to_popular_council FOREIGN KEY (popular_council_associated_with_popular_council) REFERENCES public.instance(id);


--
-- Name: social_materialization fk_social_materialization_sector; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_materialization
    ADD CONSTRAINT fk_social_materialization_sector FOREIGN KEY (id_sector) REFERENCES public.sector(id);


--
-- Name: technological_tensor fk_technological_tensor_instance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technological_tensor
    ADD CONSTRAINT fk_technological_tensor_instance FOREIGN KEY (id_instance) REFERENCES public.instance(id);


--
-- Name: technological_tensor fk_technological_tensor_social_materialization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technological_tensor
    ADD CONSTRAINT fk_technological_tensor_social_materialization FOREIGN KEY (id_social_materialization) REFERENCES public.social_materialization(id);


--
-- Name: user fk_user_instance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT fk_user_instance FOREIGN KEY (id_instance) REFERENCES public.instance(id);


--
-- Name: instance fk_worker_committee_association; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instance
    ADD CONSTRAINT fk_worker_committee_association FOREIGN KEY (id_associated_worker_committee) REFERENCES public.instance(id);


--
-- PostgreSQL database dump complete
--

