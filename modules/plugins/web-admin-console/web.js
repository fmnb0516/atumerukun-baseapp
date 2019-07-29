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