const pg = require("pg");
const crypto = require("crypto");
const log = require("./log.js")(module);;

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
})

client.connect(err => {
    if (err)
        log.error(err);
    else
        log.info("Database connected");
});

/* 
    ERROR Types:
    - ValidationError - too big or too small string, invalid datetime format, etc.
    - ImmutableValueEdited - if record changed and protected fields was edited (such as logins)
*/
// PASSWORD IN OBJECT MUST BE HASHED WITH User.getHash()
class User {
    static async get(id) {
        if (!id) {
            return (await client.query("SELECT * FROM public.users", [])).rows;
        } else {
            return (await client.query("SELECT * FROM public.users WHERE id = $1", [id])).rows[0];
        }
    }

    static getHash(passwd) {
        if (!passwd || passwd.length < 8)
            throw new Error("ValidationError");

        for (let i = 0; i < 1e3; i++)
            passwd = crypto.createHash('md5').update(passwd).digest('hex');
        return passwd;
    }

    constructor(obj) {
        this.struct = obj ? obj : {};
    }

    async submit() {
        if (!this.validate()) {
            throw new Error("ValidationError");
        } 
        
        if (this.struct.id) {
            const ref = await this.get(this.struct.id);
            if (ref.login != this.struct.login) {
                throw new Error("ImmutableValueEdited")
            }
            return (await client.query('UPDATE "users" SET "name" = $2, "surname" = $3, "hashed_password" = $4 WHERE "id" = $1', [
                this.struct.id, this.struct.name, this.struct.surname, this.struct.hashed_password
            ]));
        } else {
            const id = (await client.query('INSERT INTO "public"."users" ("id", "login", "name", "surname", "reg_date", "hashed_password") \
            VALUES (DEFAULT, $1, $2, $3, DEFAULT, $4) RETURNING id', [
                this.struct.login,
                this.struct.name,
                this.struct.surname,
                this.struct.hashed_password
                ])).rows[0].id;
            log.info(`Created user with id ${id}`)
            return (await User.get(id));
        }
    }

    validate() {
        return (
            (this.struct && this.struct.login && this.struct.name && this.struct.surname && this.struct.hashed_password) &&
            (3 < this.struct.login.length && this.struct.login.length <= 32) &&
            (3 < this.struct.name.length && this.struct.name.length <= 32) &&
            (3 < this.struct.surname.length && this.struct.surname.length <= 32)
        )
    }
}

module.exports.User = User;