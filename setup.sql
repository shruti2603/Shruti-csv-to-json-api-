CREATE TABLE public.users (
    name varchar NOT NULL,
    age int4 NOT NULL,
    address jsonb NULL,
    additional_info jsonb NULL,
    id serial4 NOT NULL
);
