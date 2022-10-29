--
-- PostgreSQL database dump
--

-- Dumped from database version 14.5 (Ubuntu 14.5-1.pgdg20.04+1)
-- Dumped by pg_dump version 14.4

-- Started on 2022-10-25 12:55:08 BST

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
-- TOC entry 6 (class 2615 OID 13772860)
-- Name: heroku_ext; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA heroku_ext;


--
-- TOC entry 217 (class 1255 OID 13796529)
-- Name: trigger_personal_name_default(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_personal_name_default() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.personal_name := NEW.name;
   RETURN NEW;
END
$$;


SET default_table_access_method = heap;

--
-- TOC entry 214 (class 1259 OID 13833103)
-- Name: additional_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_properties (
    item_id character varying(32) NOT NULL,
    property_id character varying(255) NOT NULL,
    value text
);


--
-- TOC entry 210 (class 1259 OID 13772984)
-- Name: item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item (
    name character varying(255) NOT NULL,
    id character varying(32) NOT NULL,
    description text,
    aliases text,
    CONSTRAINT item_id_check CHECK (((id)::text ~ similar_to_escape('[A-Z]+-[A-Z]*[0-9]+'::text)))
);


--
-- TOC entry 216 (class 1259 OID 14268089)
-- Name: indexed_item; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.indexed_item AS
 SELECT item.name,
    item.id,
    item.description,
    item.aliases,
    to_tsvector('english'::regconfig, (((item.name)::text || ' '::text) || COALESCE(item.aliases, ''::text))) AS indexed_aliases
   FROM public.item;


--
-- TOC entry 213 (class 1259 OID 13772993)
-- Name: property_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_type (
    property_name character varying(255) NOT NULL,
    id character varying(32) NOT NULL,
    CONSTRAINT relationship_type_id_check CHECK (((id)::text ~ similar_to_escape('[A-Z]+-[A-Z]*[0-9]+'::text)))
);


--
-- TOC entry 215 (class 1259 OID 14167112)
-- Name: qualifier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qualifier (
    item_id character varying(32) NOT NULL,
    qualifier_type character varying(32) NOT NULL,
    value_hash text NOT NULL,
    value text,
    property_id character varying(32)
);


--
-- TOC entry 211 (class 1259 OID 13772989)
-- Name: relationship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationship (
    id integer NOT NULL,
    item1 character varying(32) NOT NULL,
    item2 character varying(32) NOT NULL,
    type character varying(32) NOT NULL
);


--
-- TOC entry 212 (class 1259 OID 13772992)
-- Name: relationship_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.relationship ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.relationship_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4183 (class 2606 OID 13833109)
-- Name: additional_properties additional_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_properties
    ADD CONSTRAINT additional_properties_pkey PRIMARY KEY (item_id, property_id);


--
-- TOC entry 4176 (class 2606 OID 13804900)
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- TOC entry 4185 (class 2606 OID 14167118)
-- Name: qualifier qualifier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifier
    ADD CONSTRAINT qualifier_pkey PRIMARY KEY (item_id, qualifier_type, value_hash);


--
-- TOC entry 4179 (class 2606 OID 13773000)
-- Name: relationship relationship_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_pkey PRIMARY KEY (id);


--
-- TOC entry 4181 (class 2606 OID 13805097)
-- Name: property_type relationship_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_type
    ADD CONSTRAINT relationship_type_pkey PRIMARY KEY (id);


--
-- TOC entry 4177 (class 1259 OID 14268087)
-- Name: name_aliases_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX name_aliases_index ON public.item USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(aliases, ''::text))));


--
-- TOC entry 4190 (class 2606 OID 13833132)
-- Name: additional_properties additional_properties_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_properties
    ADD CONSTRAINT additional_properties_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4189 (class 2606 OID 14160046)
-- Name: additional_properties additional_properties_property_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_properties
    ADD CONSTRAINT additional_properties_property_name_fkey FOREIGN KEY (property_id) REFERENCES public.property_type(id) NOT VALID;


--
-- TOC entry 4192 (class 2606 OID 14167232)
-- Name: qualifier qualifier_item_id_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifier
    ADD CONSTRAINT qualifier_item_id_property_id_fkey FOREIGN KEY (item_id, property_id) REFERENCES public.additional_properties(item_id, property_id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4191 (class 2606 OID 14167119)
-- Name: qualifier qualifier_qualifier_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifier
    ADD CONSTRAINT qualifier_qualifier_type_fkey FOREIGN KEY (qualifier_type) REFERENCES public.property_type(id);


--
-- TOC entry 4186 (class 2606 OID 13833193)
-- Name: relationship relationship_person1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_person1_fkey FOREIGN KEY (item1) REFERENCES public.item(id) ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;


--
-- TOC entry 4187 (class 2606 OID 13833198)
-- Name: relationship relationship_person2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_person2_fkey FOREIGN KEY (item2) REFERENCES public.item(id) ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;


--
-- TOC entry 4188 (class 2606 OID 13833203)
-- Name: relationship relationship_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_type_fkey FOREIGN KEY (type) REFERENCES public.property_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;


-- Completed on 2022-10-25 12:55:10 BST

--
-- PostgreSQL database dump complete
--

