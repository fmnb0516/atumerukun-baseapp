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
        constructor(sql, posts) {
            this.sql = sql;
            this.posts = posts;
        };

        async regenerateArticles(posts) {
            posts = posts ? posts : this.posts;

            const tags = await this.sql.selectQuery("SELECT tag, COUNT(*) AS cnt FROM tag_data GROUP BY tag ORDER BY cnt DESC LIMIT ?", [20], true);
            const newest = await this.sql.selectQuery("SELECT post_id, title, create_at FROM post_data ORDER BY create_at DESC LIMIT ?", [5], true);
            const calender = parseCalender(await this.sql.selectQuery("SELECT caldata, COUNT(*) AS cnt FROM post_data GROUP BY caldata", [], true));

            await appContext.core.fileSystem.mkdirs(dirs.publicDir + "/post");
            await appContext.core.fileSystem.mkdirs(dirs.publicDir + "/assets");

            for(var i=0; i<posts.length; i++) {
                const file = posts[i];

                const postId = appContext.core.external("path").basename(file, ".md");
                const text = await appContext.core.fileSystem.readFile(dirs.postDir + "/" + file, "utf8");
                const match =  /(---)([\s\S]*)(---)/gm.exec(text);
                const meta = appContext.core.external("js-yaml").safeLoad(match !== null ? match[2].trim() : {});
                
                const html = templates("article.html.hbs", {
                    configure : appContext.core.configure,
                    newest : newest,
                    tags : tags,
                    calender : calender,
                    post : {
                        meta : meta,
                        postId : postId,
                        text : text.replace(/(---)([\s\S]*)(---)/gm, '').trim()
                    }
                });

                await appContext.core.fileSystem.writeFile(dirs.publicDir + "/post/"+ postId + ".html",  html, "utf8");
                await util.copyResource(dirs.postDir + "/" + postId, dirs.publicDir + "/assets/" + postId);
            }
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

    return (sql, posts) => {
        return new SiteGenerator(sql, posts);
    };
};