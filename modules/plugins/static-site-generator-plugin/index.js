const createSuccessHandler = (req, res) => {
	return (entries) => {
		res.json({
			status : 200,
			message: "",
			result : entries,
		});
	};
};

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

    const mockserver = await require("./lib/mockserver.js");
    const util = await require("./lib/util.js")(appContext);
    const templates = await require("./lib/template.js")(appContext, themeDir, util);
    const sqls = await require("./lib/sql.js")(appContext, util);
    const sitegen = await require("./lib/sitegen.js")(appContext, util, templates, {
        assetDir : assetDir,
        postDir : postDir,
        themeDir : themeDir,
        publicDir : publicDir
    });

    const postgen = await require("./lib/postgen.js")(appContext, util);

    const cleanDatabase = async () => {
        const sql =sqls(db);
        await sql.deleteQuery("DELETE FROM post_data", []);
        await sql.deleteQuery("DELETE FROM tag_data", []);
    };
    
    const cleanPublicDir = async () => {
        await appContext.core.fileSystem.remove(publicDir);
        await appContext.core.fileSystem.mkdirs(publicDir);
    };

    const status = {flg : false};

    const generateAllPosts = async () => {
        try {
            if(status.flg === true) {
                appContext.logger.info("already running generateAllPosts task.");
                return;
            }

            status.flg = true;

            const posts = await appContext.core.fileSystem.readdir(postDir);
            const site = sitegen(configure, sqls(db), posts.filter(f => f.endsWith(".md")));
    
            await cleanDatabase();
            await cleanPublicDir();
            await site.regenerateDatabase();
            await site.regenerateArticles();
            await site.regeneratePageNavigations();
            await site.regenerateCalenderNavigations();
            await site.regenerateTags();
            await site.generateIndexPage();
            await site.generateSiteContent();
            await site.generateRSS();
            await site.generateExtPages();
            await site.resourceCopy();
        }  finally  {
            status.flg = false;
        }        
    };

    const storePageResult = async (data) => {
        const id = util.md5(data.url);
        const postFilePath = postDir + "/" + id + ".md";
        const assetDir = postDir + "/" + id;
        await util.cleanDir(assetDir);

        await postgen(id, postFilePath, assetDir, data);
    };

    appContext.webApiInstaller.post('/sitegenerator/all', (req, res) => {  
        const successHandler = createSuccessHandler(req, res);
        generateAllPosts().then(() => successHandler("site generated"));
    });

    appContext.webApiInstaller.post('/publish/:id', (req, res) => {
        const successHandler = createSuccessHandler(req, res);

        context.repo.getPageResult(req.params.id)
            .then(data => storePageResult(data))
            .then(() => successHandler("解析結果を公開しました"));
    });

    appContext.event.on("admin-ui-plugin.initialize-btn.pageresult", (e) => {
        e.context.navi.push({
            label : "公開",
            url   : "/static-site-generator-plugin/publish/${pagevalue_id}",
            method: "POST"
        });
    });

    appContext.taskInstaller.install("generate-static-site", "5 23 * * *", async () => {
        await generateAllPosts();
    });

    appContext.logger.info("mock server listen : 8888 => http://localhost:8888/");
    mockserver(publicDir, 8888);
    appContext.event.on("system.exit", (e) => {
    });

    await generateAllPosts();
};