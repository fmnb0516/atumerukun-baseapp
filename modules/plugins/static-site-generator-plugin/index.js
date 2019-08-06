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

    if((await appContext.core.fileSystem.exist(moduleDir + "/configure.json")) === false) {
        const initialData = {
            "favicon" : "",
            "theme" : "default",
            "author" : {
                "name" : "",
                "email" : ""
            },
            
            "site" : {
                "description" : "",
                "sitename" : "",
                "url"   : "http://localhost:8888/",
                "link" : [
                ]
            },
        
            "social" : {
                "twitter" : ""
            },

            "generate" : {
                "schedule" : "",
            }
        };
        await appContext.core.fileSystem.writeFile(moduleDir + "/configure.json", JSON.stringify(initialData), 'utf8');
    }

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

    const postgen = await require("./lib/postgen.js")(appContext, util, storageDir);

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

    appContext.webApiInstaller.put('/sitegenerator/configure', (req, res) => {
        const successHandler = createSuccessHandler(req, res);
        const json = JSON.stringify(req.body);
        appContext.core.fileSystem.writeFile(moduleDir + "/configure.json", json, 'utf8')
            .then(() => successHandler("ok"));
     });

    appContext.webApiInstaller.get('/sitegenerator/configure', (req, res) => {
        appContext.core.fileSystem.readFile(moduleDir + "/configure.json", 'utf8')
            .then(text => JSON.parse(text))
            .then(json => {
                res.json(json);
            });
    });

    appContext.webApiInstaller.post('/sitegenerator/all', (req, res) => {  
        const successHandler = createSuccessHandler(req, res);
        generateAllPosts().then(() => successHandler("site generated"));
    });

    appContext.webApiInstaller.post('/publish/:id', (req, res) => {
        const successHandler = createSuccessHandler(req, res);

        appContext.core.repo.getPageResult(req.params.id)
            .then(data => storePageResult(data))
            .then(() => successHandler("解析結果を公開しました"));
    });

    appContext.event.on("admin-ui-plugin.initialize-btn.pageresult", (e) => {
        e.context.navi.push({
            label : "公開",
            url   : "/static-site-generator-plugin/publish/${pagevalue_id}",
            success_message : "公開しました",
            confirm_message : "解析結果を公開しますか",
            method: "POST"
        });
    });

    appContext.webApiInstaller.get('/console', (req, res) => {
		
		res.send(`
				<!DOCTYPE html>
				<html style="height: 100%;">
					<head>
						<meta charset="utf-8">
						<title>Torasan: [webscraping-data-crud]</title>
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<meta http-equiv="X-UA-Compatible" content="IE=edge" />
						<link rel="stylesheet" href="https://bootswatch.com/4/flatly/bootstrap.css" media="screen">
					</head>
					<body style="height: 100%;">
						
						<div class="navbar navbar-expand-lg fixed-top navbar-dark bg-primary">
							<div class="container">
								<a href="#" class="navbar-brand">Atumerukun - [static-site-generator-plugin] - console</a>
							</div>
						</div>
						
						<div class="container" style="padding-top: 80px;height: 100%;">
							<div class="row" style="height: 100%;">
								<div class="col-lg-12">
									<div class="form-group" style="height: calc(100% - 80px);">
										<label for="responseOutput">configure (json)</label>
										<textarea class="form-control" id="responseOutput" style="height: calc(100% - 20px);"></textarea>
                                        <br/>
                                        <button type="button" class="btn btn-primary" id="save-btn">SAVE</button>
									    <button type="button" class="btn btn-info" id="load-btn">LOAD</button>
                                    </div>
								</div>
							</div>
						</div>
						
						<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
						<script type="text/javascript">
							$("#load-btn").click(function() {
								$.ajax({
									url:"./sitegenerator/configure",
									type:"get",
									dataType: 'json',
									success: function(data) {
										$("#responseOutput").val(JSON.stringify(data, null , "\t"));
									},
									error: function(XMLHttpRequest, textStatus, errorThrown) {
										alert(errorThrown);
									},
								});
							});
							
							$("#save-btn").click(function() {
                                var parameter = $("#responseOutput").val().trim();
                                
								$.ajax({
									url:"./sitegenerator/configure",
									type:"put",
									dataType: 'json',
									contentType: 'application/json',
									data: parameter,
									success: function(data) {
                                        alert(data.result);
									},
									error: function(XMLHttpRequest, textStatus, errorThrown) {
										alert(errorThrown);
									},
								});
							});
						</script>
					</body>
				</html>
		`.trim());
    });

    const schedule = configure.generate.schedule

    if(schedule !== "") {
        appContext.taskInstaller.install("generate-static-site", schedule, async () => {
            await generateAllPosts();
        });
    }

    appContext.logger.info("mock server listen : 8888 => http://localhost:8888/");
    mockserver(publicDir, 8888);
    appContext.event.on("system.exit", (e) => {
    });
};
