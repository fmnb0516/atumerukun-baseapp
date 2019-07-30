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

    const md5 = (text) => {
        const md5hash = appContext.core.external('crypto').createHash('md5');
        md5hash.update(text, 'binary');
        return md5hash.digest('hex');
    };

    const db = (() => {
        const sqlite3 = appContext.core.external("sqlite3");
        const database = new sqlite3.Database(dbFile);
        database.serialize(() => {
            database.run('CREATE TABLE IF NOT EXISTS tag_data (tag TEXT, post_id TEXT, create_at LONG)');
            database.run('CREATE TABLE IF NOT EXISTS post_data (post_id TEXT unique not null, create_at LONG, title TEXT, generate_at LONG, description TEXT, tags TEXT, thumbnail TEXT, caldata TEXT)');
        });
        return database;
    })();

    const templates = await (async () => {
        const Handlebars = appContext.core.external('handlebars');
        const marked = appContext.core.external('marked');

        const tpl = {};
        
        const templateFiles = (await appContext.core.fileSystem.readdir(themeDir)).filter(f => f.endsWith(".hbs"));
        for(var i=0; i<templateFiles.length; i++) {
            const text = await appContext.core.fileSystem.readFile(themeDir + "/" + templateFiles[i], "utf8");
            tpl[templateFiles[i]] = Handlebars.compile(text);
        }
        
        Handlebars.registerHelper('date', function (val, options) {
            const d = new Date(val);
            return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
        });
    
        Handlebars.registerHelper('disabled', function (val, options) {
            return val ? "" : "disabled";
        });
    
        Handlebars.registerHelper('include', function (file, options) {
            return new Handlebars.SafeString(tpl[file](this));
        });
    
        Handlebars.registerHelper('hash', function (text) {
            return md5(text);
        });
    
        Handlebars.registerHelper('marked', function (text, options) {
            return new Handlebars.SafeString(marked(text));
        });

        return tpl;
    })();
};