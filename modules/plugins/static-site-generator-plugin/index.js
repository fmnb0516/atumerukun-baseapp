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
    const sitegen = await require("./lib/sitegen.js")(appContext, util, templates, {
        assetDir : assetDir,
        postDir : postDir,
        themeDir : themeDir,
        publicDir : publicDir
    });

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
        await appContext.core.fileSystem.remove(publicDir);
        await appContext.core.fileSystem.mkdirs(publicDir);
    };

    const generateAllPosts = async () => {
        const posts = await appContext.core.fileSystem.readdir(postDir);
        const site = sitegen(sqls(db), posts.filter(f => f.endsWith(".md")));

        await site.regenerateDatabase();
        await site.regenerateArticles();
        await site.regeneratePageNavigations();
        await site.regenerateCalenderNavigations();
        await site.regenerateTags();
         //generateIndexPage(context, configure, db, moduleDir, templates["index.html.hbs"])
    };

    await cleanDatabase();
    await cleanPublicDir();
    await resourceCopy();
    await generateAllPosts();
};