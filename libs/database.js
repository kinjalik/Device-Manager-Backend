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
    - AccessDenied - if checkPermit failed
*/
// PASSWORD IN OBJECT MUST BE HASHED WITH User.getHash()
class User {
    static async get(id, passwd) {
        // ToDo: remove hashed_password from SQL-query
        if (!id) {
            log.debug("User.get w/o ID called");
            const r = (await client.query("SELECT * FROM public.users", [])).rows;
            r.forEach((el) => delete el.hashed_password);
            return r;
        } else if (!passwd) {
            log.debug("User.get w ID called");
            let r;
            if (isNumber(id))
                r = (await client.query("SELECT * FROM public.users WHERE id = $1", [id])).rows[0];
            else
                r = (await client.query("SELECT * FROM public.users WHERE login = $1", [id])).rows[0];
            
            delete r.hashed_password;
            return r;
        } else {
            log.debug("User.get w/ ID, w/ passwd called");
            let r;
            if (isNumber(id))
                r = (await client.query("SELECT * FROM public.users WHERE id = $1", [id])).rows[0];
            else
                r = (await client.query("SELECT * FROM public.users WHERE login = $1", [id])).rows[0];
            delete r.hashed_password;
            try {
                r.hasPermit = await this.checkPermit(r.id, passwd);
            } catch {
                r.hasPermit = false;
            }
            return r;

        }
    }

    
    static async checkExists(id) {
        return (await client.query("SELECT EXISTS (\
  SELECT * FROM users WHERE id = $1 \
        )", [id])).rows[0].exists;
    }

    static async checkPermit(id, passwd) {
        try {
            const hash = this.getHash(passwd);
            return (await client.query("SELECT EXISTS (\
  SELECT * FROM users WHERE id = $1 AND hashed_password = $2\
        )", [id, hash])).rows[0].exists;
        } catch (err) {
            return false;
        }
        
    }

    static getHash(passwd) {
        log.debug("User.getHash called");
        log.debug("Passwd: " + passwd);
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
            const id = (await client.query('INSERT INTO "public"."users" ("id", "login", "name", "surname", "reg_date", "hashed_password", "email") \
            VALUES (DEFAULT, $1, $2, $3, DEFAULT, $4, $5) RETURNING id', [
                this.struct.login,
                this.struct.name,
                this.struct.surname,
                this.struct.hashed_password,
                this.struct.email
                ])).rows[0].id;
            log.info(`Created user with id ${id}`)
            return (await User.get(id));
        }
    }

    static async delete(id, passwd) {
        if (await this.checkPermit(id, passwd)) {
            try {
                await client.query("DELETE FROM users WHERE id = $1", [id]);
            } catch {
                return false;
            }
            log.info(`Deleted user w/ ID ${id}`);
            return true;
        } else {
            log.debug("ACCESS DENIED TO USER " + uid);
            throw new Error("AccesDenied");
        }
    }

    validate() {
        return (
            (this.struct && this.struct.login && this.struct.name && this.struct.surname && this.struct.hashed_password)
        )
    }
}

class Device {
    static async get(user_id, device_id) {
        if (!user_id) {
            return null;
        }
        if (!device_id) {
            const res = (await client.query('SELECT * FROM devices WHERE owner_id = $1', [user_id])).rows;
            return res;
        } else {
            const res = (await client.query('SELECT * FROM devices WHERE owner_id = $1 AND id = $2', [user_id, device_id])).rows[0];
            return res;
        }
    }

    constructor(obj) {
        this.struct = obj ? obj : {};
    }

    async submit() {
        if (!this.validate()) {
            console.log(this.struct)
            throw new Error("ValidationError");
        }

        if (this.struct.id && this.struct.id != 0) {
            // ToDo - EDIT feature
        } else {
            const id = (await client.query('INSERT INTO devices ("id", "name", "owner_id", "description") VALUES (DEFAULT, $1, $2, $3) RETURNING ID', [
                    this.struct.name,
                    this.struct.owner_id,
                    this.struct.description
                ])).rows[0].id;
            log.info(`Created device with id ${id}`)
            return (await Device.get(this.struct.owner_id, id));
        }
    }

    static async delete(uid, did, passwd) {
        if (await User.checkPermit(uid, passwd)) {
            try {
                log.info(`Deleting device w/ ID ${did}`)
                await client.query("DELETE FROM devices WHERE id = $1 AND owner_id = $2", [did, uid]);
            } catch (e) {
                log.info("Fail to delete");
                console.log(e);
                return false;
            }
            log.info(`Deleted device w/ ID ${did}`);
            return true;
        } else {
            log.debug("ACCESS DENIED TO USER " + uid);
            throw new Error("AccesDenied");
        }
    }

    validate() {
        return (this.struct && this.struct.owner_id && this.struct.name) && User.checkExists(this.struct.owner_id);
    }

    static async checkExists(id) {
        return (await client.query("SELECT EXISTS (\
  SELECT * FROM devices WHERE id = $1 \
        )", [id])).rows[0].exists;
    }
}

class DeviceProp {
    static async get(device_id, prop_id) {
        if (!device_id) {
            return null;
        }
        if (!prop_id) {
            const res = (await client.query('SELECT * FROM device_props WHERE device_id = $1', [device_id])).rows;
            return res;
        } else {
            const res = (await client.query('SELECT * FROM device_props WHERE device_id = $1 AND id = $2', [device_id, prop_id])).rows[0];
            return res;
        }
    }

    constructor(obj) {
        this.struct = obj ? obj : {};
    }

    async submit() {
        if (!this.validate()) {
            console.log(this.struct)
            throw new Error("ValidationError");
        }

        if (this.struct.id) {
            // ToDo - EDIT feature
        } else {
            const id = (await client.query('INSERT INTO "public"."device_props" ("id", "device_id", "value", "name") VALUES (DEFAULT, $1, $2, $3) RETURNING id', [
                this.struct.device_id,
                this.struct.value,
                this.struct.name
            ])).rows[0].id;
            log.info(`Created device's property with id ${id}`)
            return (await DeviceProp.get(this.struct.device_id, id));
        }
    }

    static async delete(uid, did, pid, passwd) {
        if (await User.checkPermit(uid, passwd)) {
            try {
                log.info(`Deleting device property w/ ID ${pid}`)
                await client.query("DELETE FROM device_props WHERE id = $1 AND device_id = $2", [pid, did]);
            } catch {
                return false;
            }
            log.info(`Deleted device property w/ ID ${did}`);
            return true;
        } else {
            log.debug("ACCESS DENIED TO USER " + uid);
            throw new Error("AccesDenied");
        }
    }

    validate() {
        return (this.struct && this.struct.device_id && this.struct.name && this.struct.value) 
            && Device.checkExists(this.struct.device_id);
        
    }
}

function isNumber(s) {
    return !isNaN(s) ? true : false;
}


module.exports.User = User;
module.exports.Device = Device;
module.exports.DeviceProp = DeviceProp;