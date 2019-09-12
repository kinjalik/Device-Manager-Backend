create table if not exists users
(
    id              serial                                      not null
        constraint users_pk
            primary key,
    login           varchar(32)                                 not null,
    name            varchar(32)                                 not null,
    surname         varchar(32)                                 not null,
    reg_date        timestamp    default CURRENT_TIMESTAMP      not null,
    hashed_password varchar(512) default '.'::character varying not null,
    email           text         default '.'::text              not null
);

create unique index if not exists users_id_uindex
    on users (id);

create unique index if not exists users_login_uindex
    on users (login);

create table if not exists devices
(
    id          serial       not null,
    name        varchar(128) not null,
    owner_id    integer
        constraint devices___ownership
            references users
            on update cascade on delete cascade,
    description text
);

create unique index if not exists devices_id_uindex
    on devices (id);

create table if not exists device_props
(
    id        serial       not null
        constraint device_params_pk
            primary key,
    device_id integer
        constraint device_params_devices_id_fk
            references devices (id)
            on update cascade on delete cascade,
    value     varchar(256) not null,
    name      varchar(64)  not null
);


