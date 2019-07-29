const selectQuery = (db, sql, parameter) => {
    return new Promise((resolve, reject) => {
        db.all(sql, parameter, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const insertQuery = (db, sql, parameter) => {
    return new Promise((resolve, reject) => {
        db.run(sql, parameter, function(err){
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

const deleteQuery = (db, sql, parameter) => {
    return new Promise((resolve, reject) => {
        db.all(sql, parameter, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({});
            }
        });
    });
    
};

const checkUpdate = (mtime, record) => {
    return mtime.getTime() > record.create_at;
};

const regenerateDatabase = async (context, db, dir, file) => {
    const regexp = /(---)([\s\S]*)(---)/gm;
    const mtime = (await context.fileSystem.stat(dir + "/" + file)).mtime;

    const record = await selectQuery(db, "SELECT post_id, create_at, title, generate_at FROM post_data WHERE post_id = ?", [file]);
    if(record.length != 0 && checkUpdate(mtime, record[0]) === false) {
        return;
    }

    if(record.length != 0) {
        await Promise.all([
            deleteQuery(db, "DELETE FROM post_data WHERE post_id = ?", [file]),
            deleteQuery(db, "DELETE FROM tag_data WHERE post_id = ?", [file])]);
    }

    const match = regexp.exec(await context.fileSystem.readFile(dir + "/" + file, "utf8"));
    const meta = context.external("js-yaml").safeLoad(match !== null ? match[2].trim() : {});

    const futures = [];

    futures.push(insertQuery(db, "insert into post_data (post_id, create_at, title, generate_at) values (?,?,?,?)", [file, new Date(meta.date).getTime(), meta.title, new Date().getTime()]));

    for(var i=0; i<meta.tags.lengthl; i++) {
        futures.push(insertQuery(db, "insert into tag_data (tag, post_id, create_at) values (?,?,?)", [meta.tags[i], file, new Date(meta.date).getTime()]));
    }

    return Promise.all(futures);
};

module.exports = async (installer, context) => {
    const moduleDir = context.baseDir + "/modules/plugins/site-generator";
    const configure = await context.fileSystem.readFile(moduleDir + "/configure.json", 'utf8')
        .then(text => JSON.parse(text));

    const sqlite3 = context.external("sqlite3");
    const db = new sqlite3.Database(moduleDir + "/_source/site.db");

    db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS post_data (post_id TEXT unique not null, create_at LONG, title TEXT, generate_at LONG)');
	    db.run('CREATE TABLE IF NOT EXISTS tag_data (tag TEXT, post_id TEXT, create_at LONG)');
    });

    const posts = await context.fileSystem.readdir(moduleDir+"/_source/posts");    
    const futures = posts.filter(f => f.endsWith("md")).map(f => regenerateDatabase(context, db, moduleDir+"/_source/posts", f));

    return Promise.all(futures)
        .then(() => console.log("post data generate"));
};