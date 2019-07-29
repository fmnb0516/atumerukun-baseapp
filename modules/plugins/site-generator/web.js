const createSuccessHandler = (req, res) => {
	return (entries) => {
		res.json({
			status : 200,
			message: "",
			result : entries,
		});
	};
};

const md5 = (context, text) => {
    const md5hash = context.external('crypto').createHash('md5');
    md5hash.update(text, 'binary');
    return md5hash.digest('hex');
};

const zeroPadding = (num,length) => {
    return ('0000000000' + num).slice(-length);
};

const chunk = (size, array) => {
    const result = [];
    for (var i=0; i < array.length; i+=size) {
        result.push(array.slice(i,i+size));
    }
    return result;
};

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

const copyResource = async (context, from, to) => {
    const resources = await context.fileSystem.readdir(from);
    const futures = [];

    for(var i=0; i<resources.length; i++) {
        const res = resources[i];
        futures.push(context.fileSystem.copy(from + "/" + res, to + "/" + res));
    }

    return Promise.all(futures);
};

const parseCalender = (result) => {
    const map = {};

    for(var i=0; i<result.length; i++) {
        var year = result[i].caldata.substr(0, 4);
        var month = result[i].caldata.substr(4);

        if(map[year] === undefined) {
            map[year] = {};
        }

        map[year][month] = result[i].cnt;
    }

    const calender = Object.keys(map).sort((d1, d2) => parseInt(d1) - parseInt(d2))
        .map(y => {
            const year = map[y];
            var allcount = 0;

            var month = Object.keys(year).sort((d1, d2) => parseInt(d2) - parseInt(d1))
                .map(m => {
                    allcount += year[m];
                    return {
                        count : year[m],
                        label : y + "年" + m + "月",
                        cal_id : y + "" + m
                    }
                });
            

            return {
                label : y + "年",
                count : allcount,
                entries : month
            };
        });

    return calender;
};

const regenerateDatabase = async (context, db, dir, file) => {
    const regexp = /(---)([\s\S]*)(---)/gm;
    const mtime = (await context.fileSystem.stat(dir + "/" + file)).mtime;

    const postId = context.external("path").basename(file, ".md");

    const record = await selectQuery(db, "SELECT post_id, create_at, title, generate_at FROM post_data WHERE post_id = ?", [postId]);
    if(record.length != 0 && checkUpdate(mtime, record[0]) === false) {
        return Promise.resolve({update : false});
    }

    if(record.length != 0) {
        await Promise.all([
            deleteQuery(db, "DELETE FROM post_data WHERE post_id = ?", [postId]),
            deleteQuery(db, "DELETE FROM tag_data WHERE post_id = ?", [postId])]);
    }

    const text = await context.fileSystem.readFile(dir + "/" + file, "utf8");
    const match = regexp.exec(text);
    const meta = context.external("js-yaml").safeLoad(match !== null ? match[2].trim() : {});

    const futures = [];

    const createAt = new Date(meta.date);
    
    const calender = createAt.getFullYear() + "" + zeroPadding((createAt.getMonth() + 1), 2);
    futures.push(insertQuery(db, "insert into post_data (post_id, create_at, title, generate_at, description, tags, thumbnail, caldata) values (?,?,?,?,?,?,?,?)", [postId, new Date(meta.date).getTime(), meta.title, new Date().getTime(), meta.description, meta.tags.join(","), meta.thumbnail, calender]));

    for(var i=0; i<meta.tags.length; i++) {
        futures.push(insertQuery(db, "insert into tag_data (tag, post_id, create_at) values (?,?,?)", [meta.tags[i], postId, new Date(meta.date).getTime()]));
    }
    return Promise.all(futures).then( () => {
        return {
            update : true,
            postId : postId,
            meta : meta,
            text : text.replace(/(---)([\s\S]*)(---)/gm, '').trim()
        };
    });
};

const regenerateArticles = async (context, configure, db, moduleDir, template, entries) => {
    const tags = await selectQuery(db, "SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag HAVING (COUNT(*) > 1) ORDER BY cnt DESC LIMIT ?", [20]);
    const newest = await selectQuery(db, "SELECT post_id, title, create_at FROM post_data ORDER BY create_at DESC LIMIT ?", [5]);
    const calender = parseCalender(await selectQuery(db, "SELECT caldata, COUNT(*) AS cnt FROM post_data GROUP BY caldata HAVING (COUNT(*) > 1)", []));
    
    await context.fileSystem.mkdirs(moduleDir + "/_public/post/");
    await context.fileSystem.mkdirs(moduleDir + "/_public/assets/");

    const futures = [];
    for(var i=0; i<entries.length; i++) {
        const entry = entries[i];

        const html = template({
            configure : configure,
            newest : newest,
            tags : tags,
            calender : calender,
            post : entry
        });
        futures.push(context.fileSystem.writeFile(moduleDir + "/_public/post/"+ (entry.postId) + ".html",  html, "utf8"));
        futures.push( copyResource(context, moduleDir + "/_source/posts/" + (entry.postId), moduleDir + "/_public/assets/" + (entry.postId)) );
    }

    return Promise.all(futures)
        .then(console.log("complete article generate"));
};

const regenerateNavigations = async (context, configure, db, moduleDir, prefix, template, result, title) => {
    const futures = [];
    const tags = await selectQuery(db, "SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag HAVING (COUNT(*) > 1) ORDER BY cnt DESC LIMIT ?", [20]);
    const newest = await selectQuery(db, "SELECT post_id, title, create_at FROM post_data ORDER BY create_at DESC LIMIT ?", [5]);
    const calender = parseCalender(await selectQuery(db, "SELECT caldata, COUNT(*) AS cnt FROM post_data GROUP BY caldata HAVING (COUNT(*) > 1)", []));

    const subarray = chunk(10, result);

    await context.fileSystem.mkdirs(moduleDir + "/_public/" + prefix);

    for(var i=0; i<subarray.length; i++) {
        const entry = subarray[i].map(e => {
            e.tags = e.tags.split(",");
            return e;
        });

        const html = template({
            configure : configure,
            newest : newest,
            tags : tags,
            calender : calender,
            entries : entry,
            title : title + " - " + (i+1) + "ページ目",
            navi : {
                next : (i+1) < subarray.length ? "/"+prefix+"/" + (i+1) + ".html" : null,
                prev : i == 0 ? null : "/"+prefix+"/" + (i-1) + ".html"
            }
        });
        futures.push(context.fileSystem.writeFile(moduleDir + "/_public/"+prefix+ "/"+ i + ".html",  html, "utf8"));
    }
    
    return Promise.all(futures);
};

const regeneratePageNavigations = async (context, configure, db, moduleDir, template) => {
    const entries = await selectQuery(db, "SELECT post_id, title, create_at, description, tags, thumbnail FROM post_data ORDER BY create_at DESC", []);
    return regenerateNavigations(context, configure, db, moduleDir, "navi", template, entries, "新着記事")
        .then(console.log("complete navigation generate"));
};

const regenerateTags = async (context, configure, db, moduleDir, template1, template2) => {
    const tags = await selectQuery(db, "SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag HAVING (COUNT(*) > 1) ORDER BY cnt DESC", []);
    await context.fileSystem.mkdirs(moduleDir + "/_public/tags");

    const futures = [];
    for(var i=0; i<tags.length; i++) {
        const tag =tags[i].tag;
        
        const f = selectQuery(db, "SELECT tag_data.tag, post_data.tags, post_data.description, post_data.title, post_data.thumbnail, post_data.post_id, post_data.create_at FROM tag_data INNER JOIN post_data on post_data.post_id=tag_data.post_id WHERE tag_data.tag = ? ORDER BY post_data.create_at DESC", [tag])
            .then(result => {
                const prefix = "tags/" + md5(context, tag);
                return regenerateNavigations(context, configure, db, moduleDir, prefix, template1, result, tag)
                .then(console.log("complete tag generate : " + tag));
            });
        futures.push(f);
    }

    const html = template2({
        configure : configure,
        tags : tags
    });

    futures.push(context.fileSystem.writeFile(moduleDir + "/_public/tags/list.html",  html, "utf8"));

    return Promise.all(futures);
};

const regenerateCalenderNavigations = async (context, configure, db, moduleDir, template) => {
    const calender = await selectQuery(db, "SELECT caldata FROM post_data GROUP BY caldata", [])
   
    const futures = [];
    for(var i=0; i<calender.length; i++) {
        const cal =calender[i].caldata;
        
        const f = selectQuery(db, "SELECT post_id, title, create_at, description, tags, thumbnail FROM post_data WHERE caldata = ? ORDER BY create_at DESC", [cal])
            .then(result => {
                const prefix = "archive/" + cal;
                return regenerateNavigations(context, configure, db, moduleDir, prefix, template, result, cal)
                .then(console.log("complete archive generate : " + cal));
            });

    }

    return Promise.all(futures);
};

const generateIndexPage = async (context, configure, db, moduleDir, template) => {
    const html = template({
        configure : configure
    });
    return context.fileSystem.writeFile(moduleDir + "/_public/index.html",  html, "utf8")
        .then(console.log("complete index generate"));
};

const initAssetDir = async (context, dir) => {
    const eixist = await context.fileSystem.exist(dir);
    if(eixist === true) {
        await context.fileSystem.remove(dir);
    }
    return context.fileSystem.mkdirs(dir);
};

module.exports = async (installer, context) => {
    const moduleDir = context.baseDir + "/modules/plugins/site-generator";
    const storageDir = context.baseDir + "/storage";
    
    const configure = await context.fileSystem.readFile(moduleDir + "/configure.json", 'utf8')
        .then(text => JSON.parse(text));

    const sqlite3 = context.external("sqlite3");
    const db = new sqlite3.Database(moduleDir + "/_source/site.db");

    const Handlebars = context.external('handlebars');
    const marked = context.external('marked');
    var templates = {};
    

    const templateFiles = (await context.fileSystem.readdir(moduleDir+"/_theme/"+configure.theme)).filter(f => f.endsWith(".hbs"));
    for(var i=0; i<templateFiles.length; i++) {
       const text = await context.fileSystem.readFile(moduleDir+"/_theme/"+configure.theme + "/" + templateFiles[i], "utf8");
       templates[templateFiles[i]] = Handlebars.compile(text);
    }

    Handlebars.registerHelper('date', function (val, options) {
        const d = new Date(val);
        return d.getFullYear() + "年" + (d.getMonth() + 1) + "月"
            + d.getDate() + "日";
    });

    Handlebars.registerHelper('disabled', function (val, options) {
        return val ? "" : "disabled";
    });

    Handlebars.registerHelper('include', function (file, options) {
        return new Handlebars.SafeString(templates[file](this));
    });

    Handlebars.registerHelper('hash', function (text) {
        return md5(context, text);
    });

    Handlebars.registerHelper('marked', function (text, options) {
        return new Handlebars.SafeString(marked(text));
    });

    db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS tag_data (tag TEXT, post_id TEXT, create_at LONG)');
        db.run('CREATE TABLE IF NOT EXISTS post_data (post_id TEXT unique not null, create_at LONG, title TEXT, generate_at LONG, description TEXT, tags TEXT, thumbnail TEXT, caldata TEXT)');
    });

    const generateAllPosts = async () => {
        const posts = await context.fileSystem.readdir(moduleDir+"/_source/posts");    
        const futures = posts.filter(f => f.endsWith("md"))
            .map(f => regenerateDatabase(context, db, moduleDir+"/_source/posts", f));
        
        return Promise.all(futures)
            .then(resuls => resuls.filter(r => r.update))
            .then(result => regenerateArticles(context, configure, db, moduleDir, templates["article.html.hbs"], result))
            .then(() => regeneratePageNavigations(context, configure, db, moduleDir, templates["navi.html.hbs"]))
            .then(() => regenerateCalenderNavigations(context, configure, db, moduleDir, templates["navi.html.hbs"]))
            .then(() => regenerateTags(context, configure, db, moduleDir, templates["navi.html.hbs"], templates["alltags.html.hbs"]))
            .then(() => generateIndexPage(context, configure, db, moduleDir, templates["index.html.hbs"]));
    };

    const cleanDatabase = async () => {
        return Promise.all([
            deleteQuery(db, "DELETE FROM post_data", []),
            deleteQuery(db, "DELETE FROM tag_data", [])]);
    };

    const cleanPublicDir = async () => {
        return context.fileSystem.remove(moduleDir + "/_public")
            .then(() => context.fileSystem.mkdirs(moduleDir + "/_public"));
   };

    const resourceCopy = async () => {
        return Promise.all([copyResource(context, moduleDir + "/_resource", moduleDir + "/_public"),
            copyResource(context, moduleDir+"/_theme/"+configure.theme + "/_resource", moduleDir + "/_public")]);
    };
    

    installer.post('/publish/:id', (req, res) => {
        const successHandler = createSuccessHandler(req, res);
        
		context.repo.getPageResult(req.params.id)
			.then(data => {
				const id = md5(context, data.url);
				const postFilePath = moduleDir + "/_source/posts/" + id + ".md";
				const assetDir = moduleDir + "/_source/posts/" + id;
				return initAssetDir(context, assetDir)
					.then(() => [id, postFilePath, assetDir, data]);
			}).then(data => {
				const textLine = [];
				const futures = [];

				const id = data[0];
				const postFilePath = data[1];
				const assetDir = data[2];

				const metadata = data[3];
				const images = resolve(metadata.page_values, "image");
				const title = resolve(metadata.page_values, "title")[0];
				const category = resolve(metadata.page_values, "category");
				const description = resolve(metadata.page_values, "description")[0];

				textLine.push("---");
				textLine.push("title: \"" + title + "\"");
				textLine.push("date: \"" + dateformat(new Date()) + "\"");
				textLine.push("thumbnail: \"" + "/assets/"+id+"/"+ images[0] + "\"");
				textLine.push("tags:");
				category.forEach(element => {
					textLine.push("- \"" + element + "\"");
				});
				textLine.push("---");
		
				textLine.push("");

				for(var i=0; i < images.length; i++) {
					const f = images[i];
					textLine.push("!["+f+"](/assets/"+id+"/"+f+")");
					
					if(i==0) {
						textLine.push("<!-- more -->");
						textLine.push("");
						textLine.push(description);
						textLine.push("");
					}
					futures.push(context.fileSystem.copy(storageDir + "/" + images[i], assetDir + "/" + images[i]));
				}

				futures.push(context.fileSystem.writeFile(postFilePath,textLine.join("\r\n"), "utf8"));
				return Promise.all(futures);
			}).then(() => successHandler("ok"));
    });
    
    installer.post('/sitegenerator/all', (req, res) => {     
        cleanPublicDir()
            .then(() => cleanDatabase())
            .then(() => generateAllPosts())
            .then(() => resourceCopy())
            .then(() => {
                res.json({
                    status : 200,
                    message: ""
                });
            });
    });
};