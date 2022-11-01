--
-- PostgreSQL database dump
--

-- Dumped from database version 14.5 (Ubuntu 14.5-1.pgdg20.04+1)
-- Dumped by pg_dump version 14.4

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
-- Name: heroku_ext; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA heroku_ext;


--
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
-- Name: additional_property; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_property (
    item_id character varying(32) NOT NULL,
    property_id character varying(32) NOT NULL,
    value text NOT NULL,
    value_hash text NOT NULL
);


--
-- Name: item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item (
    name character varying(255) NOT NULL,
    id character varying(32) NOT NULL,
    description text NOT NULL,
    aliases text,
    CONSTRAINT item_id_check CHECK (((id)::text ~ similar_to_escape('[A-Z]+-[A-Z]*[0-9]+'::text)))
);


--
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
-- Name: property_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_type (
    property_name character varying(255) NOT NULL,
    id character varying(32) NOT NULL,
    CONSTRAINT relationship_type_id_check CHECK (((id)::text ~ similar_to_escape('[A-Z]+-[A-Z]*[0-9]+'::text)))
);


--
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
-- Name: relationship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationship (
    id integer NOT NULL,
    item1 character varying(32) NOT NULL,
    item2 character varying(32) NOT NULL,
    type character varying(32) NOT NULL
);


--
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
-- Name: additional_property additional_property_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_property
    ADD CONSTRAINT additional_property_pkey PRIMARY KEY (item_id, property_id, value_hash);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- Name: qualifier qualifier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifier
    ADD CONSTRAINT qualifier_pkey PRIMARY KEY (item_id, qualifier_type, value_hash);


--
-- Name: relationship relationship_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_pkey PRIMARY KEY (id);


--
-- Name: property_type relationship_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_type
    ADD CONSTRAINT relationship_type_pkey PRIMARY KEY (id);


--
-- Name: name_aliases_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX name_aliases_index ON public.item USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(aliases, ''::text))));


--
-- Name: additional_property additional_property_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_property
    ADD CONSTRAINT additional_property_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: additional_property additional_property_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_property
    ADD CONSTRAINT additional_property_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.property_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: qualifier qualifier_item_id_property_id_value_hash_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifier
    ADD CONSTRAINT qualifier_item_id_property_id_value_hash_fkey FOREIGN KEY (item_id, property_id, value_hash) REFERENCES public.additional_property(item_id, property_id, value_hash) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: qualifier qualifier_qualifier_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifier
    ADD CONSTRAINT qualifier_qualifier_type_fkey FOREIGN KEY (qualifier_type) REFERENCES public.property_type(id);


--
-- Name: relationship relationship_person1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_person1_fkey FOREIGN KEY (item1) REFERENCES public.item(id) ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;


--
-- Name: relationship relationship_person2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_person2_fkey FOREIGN KEY (item2) REFERENCES public.item(id) ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;


--
-- Name: relationship relationship_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_type_fkey FOREIGN KEY (type) REFERENCES public.property_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;


--
-- PostgreSQL database dump complete
--

