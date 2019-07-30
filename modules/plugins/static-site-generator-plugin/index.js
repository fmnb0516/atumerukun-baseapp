module.exports = async (appContext) => {
    const moduleDir = appContext.dir;
    const configure = await appContext.core.fileSystem.readFile(moduleDir + "/configure.json", 'utf8')
        .then(text => JSON.parse(text));
        
    const storageDir = appContext.core.baseDir + "/storage";
    const assetDir = moduleDir + "/source/assets"; 
    const postDir = moduleDir + "/source/posts"; 
    const dbFile = moduleDir + "/source/site.db";
    const themeDir = moduleDir + "/theme/" + configure.theme;
    const publicDir = moduleDir + "/public";
    
    await appContext.core.fileSystem.mkdirs(assetDir);
    await appContext.core.fileSystem.mkdirs(postDir);
    await appContext.core.fileSystem.mkdirs(publicDir);

    const db = (() => {
        const sqlite3 = appContext.core.external("sqlite3");
        const database = new sqlite3.Database(dbFile);
        database.serialize(() => {
            database.run('CREATE TABLE IF NOT EXISTS tag_data (tag TEXT, post_id TEXT, create_at LONG)');
            database.run('CREATE TABLE IF NOT EXISTS post_data (post_id TEXT unique not null, create_at LONG, title TEXT, generate_at LONG, description TEXT, tags TEXT, thumbnail TEXT, caldata TEXT)');
        });
        return database;
    })();

    const util = await require("./lib/util.js")(appContext);
    const templates = await require("./lib/template.js")(appContext, themeDir, util);
    const sqls = await require("./lib/sql.js")(appContext, util);

    const resourceCopy = async () => {
        await util.copyResource(assetDir, publicDir);
        await util.copyResource(themeDir+"/assets", publicDir);
    };

    const cleanDatabase = async () => {
        const sql =sqls(db);
        await sql.deleteQuery("DELETE FROM post_data", []);
        await sql.deleteQuery("DELETE FROM tag_data", []);
    };
    
    const cleanPublicDir = async () => {
        await appContext.core.fileSystem.remove(moduleDir + "/_public");
        await appContext.core.fileSystem.mkdirs(moduleDir + "/_public");
    };

    /*
    const generateAllPosts = async () => {
        const sql = new SQLManager(db);
        
        const posts = await appContext.core.fileSystem.readdir(postDir);    
        const futures = posts.filter(f => f.endsWith(".md"))
            .map(f => regenerateDatabase(context, db, postDir, f));
        
        return Promise.all(futures)
            .then(resuls => resuls.filter(r => r.update))
            .then(result => regenerateArticles(context, configure, db, moduleDir, templates["article.html.hbs"], result))
            .then(() => regeneratePageNavigations(context, configure, db, moduleDir, templates["navi.html.hbs"]))
            .then(() => regenerateCalenderNavigations(context, configure, db, moduleDir, templates["navi.html.hbs"]))
            .then(() => regenerateTags(context, configure, db, moduleDir, templates["navi.html.hbs"], templates["alltags.html.hbs"]))
            .then(() => generateIndexPage(context, configure, db, moduleDir, templates["index.html.hbs"]));
    };
    */
};