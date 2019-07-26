const createSuccessHandler = (req, res) => {
	
	return (entries) => {
		res.json({
			status : 200,
			message: "",
			result : entries,
		});
	};
};

const createErrorHandler = (req, res) => {
	return (e) => {
		res.json({
			status : 500,
			message: "" + e,
		});
	};
};

const resolve = (map, key) => {
	var data = map[key];
	if(data === undefined || data === null) {
			return [""];
	} else {
			return data.map(d => d.data_value);
	}
};

const dateformat = (d) => {
	return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + ""
	+ " "
	+ ( '0' + d.getHours() ).slice(-2) + ":"
	+ ( '0' + d.getMinutes() ).slice(-2) + ":"
	+ "00";
};

module.exports = (installer, context) => {
	installer.resource("/web-admin-console", "admin");

	const storageDir = context.baseDir + "/storage";

	const md5 = (str) => {
		const md5 = context.external("crypto").createHash('md5')
		return md5.update(str, 'binary').digest('hex')
	};

	const initAssetDir = async (dir) => {
		const eixist = await context.fileSystem.exist(dir);
		if(eixist === true) {
			await context.fileSystem.remove(dir);
		}
		return context.fileSystem.mkdirs(dir);
	};
	
	installer.upload('/file/upload', "upFile", (req, res) => {
		const successHandler = createSuccessHandler(req, res);

		const toname = context.external("path").dirname(req.file.path) + "/" + req.file.originalname;
		context.fileSystem.rename(req.file.path, toname)
			.then(() => successHandler(""));
	});

	installer.post('/publish/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const hexoDir = "/mnt/c/opt/workspace_eclipse/node/blog";

		context.repo.getPageResult(req.params.id)
			.then(data => {
				const id = md5(data.url);
				const postFilePath = hexoDir + "/source/_posts/" + id + ".md";
				const assetDir = hexoDir + "/source/images/" + id;
				return initAssetDir(assetDir)
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
				textLine.push("thumbnail: \"" + "/images/"+id+"/"+ images[0] + "\"");
				textLine.push("tags:");
				category.forEach(element => {
					textLine.push("- \"" + element + "\"");
				});
				textLine.push("---");
		
				textLine.push("");

				for(var i=0; i < images.length; i++) {
					const f = images[i];
					textLine.push("!["+f+"](/images/"+id+"/"+f+")");
					
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

    installer.get('/metadata/handlers', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const map = {};
		const futures = [];

		context.plugins.forEach(plugin => {
			if(plugin.handler === false) {
				return;
			}

			map[plugin.name] = {};

			futures.push(context.fileSystem.exist(plugin.dir + "/admin-form/form.html")
				.then(exist => map[plugin.name].html = exist));
				
			futures.push(context.fileSystem.exist(plugin.dir + "/admin-form/form.js")
				.then(exist => map[plugin.name].js = exist));

			futures.push(context.fileSystem.exist(plugin.dir + "/admin-form/readme.md")
				.then(exist => map[plugin.name].readme = exist));
		});
		
		Promise.all(futures).then(ret => {
			successHandler(map);
		});		
	});

	installer.get('/metadata/load/:plugin/:datatype', (req, res) => {
		const plugin = req.params.plugin;
		const datatype = req.params.datatype;

		const data = context.plugins.find(p => p.name === plugin);
		if(data === undefined) {
			res.status(404).send('Not Found');
		} else if(datatype === "html") {
			context.fileSystem.readFile(data. dir + "/admin-form/form.html")
				.then(text =>  res.send(text.toString('utf-8')));
		} else if(datatype === "js") {
			context.fileSystem.readFile(data. dir + "/admin-form/form.js")
				.then(text =>  res.send(text.toString('utf-8')));
		} else {
			res.status(404).send('Not Found');
		}
    });
    
};