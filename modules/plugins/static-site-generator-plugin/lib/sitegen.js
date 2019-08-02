const checkUpdate = (mtime, record) => {
    return mtime.getTime() > record.create_at;
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

module.exports = async (appContext, util, templates, dirs) => {
    const logger = appContext.logger;

    class SiteGenerator {
        constructor(configure, sql, posts) {
            this.configure = configure;
            this.sql = sql;
            this.posts = posts;
        };

        async generateIndexPage() {
            logger.info("---- begin regenerate top index html ----");
            const html = templates("index.html.hbs", {
                configure : this.configure
            });
            await appContext.core.fileSystem.writeFile(dirs.publicDir + "/index.html",  html, "utf8");
            logger.info("---- end regenerate top index html ----");
        };

        async regenerateNavigations(prefix, result, title) {
            const tags = await this.sql.selectQuery("SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag ORDER BY cnt DESC LIMIT ?", [20]);
            const newest = await this.sql.selectQuery("SELECT post_id, title, create_at, thumbnail, tags FROM post_data ORDER BY create_at DESC LIMIT ?", [5]);
            const calender = parseCalender(await this.sql.selectQuery("SELECT caldata, COUNT(*) AS cnt FROM post_data GROUP BY caldata", []));
            
            const subarray = util.chunk(10, result);
            await appContext.core.fileSystem.mkdirs(dirs.publicDir +"/" + prefix);

            for(var i=0; i<subarray.length; i++) {
                const entry = subarray[i].map(e => {
                    e.tags = e.tags.split(",");
                    return e;
                });
        
                const html = templates("navi.html.hbs", {
                    configure :this.configure,
                    newest : newest,
                    tags : tags,
                    calender : calender,
                    entries : entry,
                    page : {
                        title : title + " - " + (i+1) + "ページ目",
                    },
                    navi : {
                        next : (i+1) < subarray.length ? "/"+prefix+"/" + (i+1) + ".html" : null,
                        prev : i == 0 ? null : "/"+prefix+"/" + (i-1) + ".html"
                    }
                });
                await appContext.core.fileSystem.writeFile(dirs.publicDir + "/" +prefix+ "/"+ i + ".html",  html, "utf8");
            }
        };

        async regeneratePageNavigations() {
            logger.info("---- begin regenerate navigation ----");

            const entries = await this.sql.selectQuery("SELECT post_id, title, create_at, description, tags, thumbnail FROM post_data ORDER BY create_at DESC", []);
            await this.regenerateNavigations("navi", entries, "新着記事");

            logger.info("---- end regenerate navigation ----");
        };

        async regenerateTags() {
            logger.info("---- begin regenerate tag navigation ----");

            const tags = await this.sql.selectQuery("SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag ORDER BY cnt DESC", []);
            await appContext.core.fileSystem.mkdirs(dirs.publicDir + "/tags");

            for(var i=0; i<tags.length; i++) {
                const tag =tags[i].tag;

                logger.info("    - generate tag naviagtion start : " +  tag);
                const result = await this.sql.selectQuery("SELECT tag_data.tag, post_data.tags, post_data.description, post_data.title, post_data.thumbnail, post_data.post_id, post_data.create_at FROM tag_data INNER JOIN post_data on post_data.post_id=tag_data.post_id WHERE tag_data.tag = ? ORDER BY post_data.create_at DESC", [tag]);
                const prefix = "tags/" + util.md5(tag);
                await this.regenerateNavigations(prefix, result, tag);
                logger.info("    - generate tag naviagtion end : " +  tag);
            }

            logger.info("    - generate all tag page start");
            const html = templates("alltags.html.hbs", {
                configure : this.configure,
                tags : tags
            });
            await appContext.core.fileSystem.writeFile(dirs.publicDir + "/tags/list.html",  html, "utf8");
            logger.info("    - generate all tag page end");

            logger.info("---- end regenerate tag navigation ----");
        };

        async regenerateCalenderNavigations() {
            logger.info("---- begin regenerate archive navigation ----");

            const calender = await this.sql.selectQuery("SELECT caldata FROM post_data GROUP BY caldata", []);
            for(var i=0; i<calender.length; i++) {
                const cal =calender[i].caldata;
                
                logger.info("    - generate tag archive start : " +  cal);

                const result = await this.sql.selectQuery("SELECT post_id, title, create_at, description, tags, thumbnail FROM post_data WHERE caldata = ? ORDER BY create_at DESC", [cal])
                const prefix = "archive/" + cal;
                await this.regenerateNavigations(prefix, result, cal);

                logger.info("    - generate tag archive end : " +  cal);
            }

            logger.info("---- end regenerate archive navigation ----");
        };

        async regenerateArticles(posts) {
            logger.info("---- begin regenerate articles ----");

            posts = posts ? posts : this.posts;

            const tags = await this.sql.selectQuery("SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag ORDER BY cnt DESC LIMIT ?", [20], true);
            const newest = await this.sql.selectQuery("SELECT post_id, title, create_at, thumbnail, tags FROM post_data ORDER BY create_at DESC LIMIT ?", [5], true);
            const calender = parseCalender(await this.sql.selectQuery("SELECT caldata, COUNT(*) AS cnt FROM post_data GROUP BY caldata", [], true));

            await appContext.core.fileSystem.mkdirs(dirs.publicDir + "/post");
            await appContext.core.fileSystem.mkdirs(dirs.publicDir + "/assets");

            for(var i=0; i<posts.length; i++) {
                const file = posts[i];
                logger.info("    - regenerate article entry start : " + file);

                logger.info("    - parsing metadata : " + file);
                const postId = appContext.core.external("path").basename(file, ".md");
                const text = await appContext.core.fileSystem.readFile(dirs.postDir + "/" + file, "utf8");
                const match =  /(---)([\s\S]*)(---)/gm.exec(text);
                const meta = appContext.core.external("js-yaml").safeLoad(match !== null ? match[2].trim() : {});
                
                logger.info("    - generate html : " + file);
                const html = templates("article.html.hbs", {
                    configure : this.configure,
                    newest : newest,
                    tags : tags,
                    calender : calender,
                    page : {
                        title : meta.title
                    },
                    post : {
                        meta : meta,
                        postId : postId,
                        text : text.replace(/(---)([\s\S]*)(---)/gm, '').trim()
                    }
                });

                logger.info("    - write generate html : " + file);
                await appContext.core.fileSystem.writeFile(dirs.publicDir + "/post/"+ postId + ".html",  html, "utf8");
                logger.info("    - copy post asset : " + dirs.postDir + "/" + postId, dirs.publicDir + " => " + dirs.publicDir + "/assets/" + postId);
                await util.copyResource(dirs.postDir + "/" + postId, dirs.publicDir + "/assets/" + postId);
                logger.info("    - regenerate article entry end : " + file);
            }

            logger.info("---- end regenerate articles ----");
        };

        async regenerateDatabase() {
            logger.info("---- begin regenerate database ----");

            const result = [];

            for(var i=0; i<this.posts.length; i++) {
                const file = this.posts[i];

                logger.info("    - regenerate database entry start : " + file);
                const mtime = (await appContext.core.fileSystem.stat(dirs.postDir + "/" + file)).mtime;
                const postId = appContext.core.external("path").basename(file, ".md");

                const record = await this.sql.selectQuery("SELECT post_id, create_at, title, generate_at FROM post_data WHERE post_id = ?", [postId]);
                if(record.length != 0 && checkUpdate(mtime, record[0]) === false) {
                    logger.info("    - no update : " + file);
                    continue;
                }

                if(record.length != 0) {
                    logger.info("    - clean entry : " + file);
                    await this.sql.deleteQuery("DELETE FROM post_data WHERE post_id = ?", [postId]);
                    await this.sql.deleteQuery("DELETE FROM tag_data WHERE post_id = ?", [postId]);
                }

                logger.info("    - parsing entry : " + file);
                const text = await appContext.core.fileSystem.readFile(dirs.postDir + "/" + file, "utf8");
                const match =  /(---)([\s\S]*)(---)/gm.exec(text);
                const meta = appContext.core.external("js-yaml").safeLoad(match !== null ? match[2].trim() : {});

                const createAt = new Date(meta.date);
                const calender = createAt.getFullYear() + "" + util.zeroPadding((createAt.getMonth() + 1), 2);
                
                logger.info("    - update entry post data : " + file);
                await this.sql.insertQuery("insert into post_data (post_id, create_at, title, generate_at, description, tags, thumbnail, caldata) values (?,?,?,?,?,?,?,?)", [postId, new Date(meta.date).getTime(), meta.title, new Date().getTime(), meta.description, meta.tags.join(","), meta.thumbnail, calender]);

                for(var j=0; j<meta.tags.length; j++) {
                    logger.info("    - update entry post tag data : " + file + "," + meta.tags[j]);
                    await this.sql.insertQuery("insert into tag_data (tag, post_id, create_at) values (?,?,?)", [meta.tags[j], postId, new Date(meta.date).getTime()]);
                }

                result.push(postId);
                logger.info("    - regenerate database entry complete : " + file);
            }

            logger.info("---- end regenerate database ----");
            return result;
        };
    }

    return (configure, sql, posts) => {
        return new SiteGenerator(configure, sql, posts);
    };
};