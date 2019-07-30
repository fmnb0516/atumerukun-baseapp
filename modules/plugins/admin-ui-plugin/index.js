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

module.exports = (appContext) => {
    appContext.webApiInstaller.resource("/admin", "admin");

	const forms = {};

	const buttons = {
		pageresult : {
			navi : [],
			entry: []
		}
	};
	
    appContext.event.on("system.initialized", (e) => {
		appContext.event.raise("admin-ui-plugin.initialize-form", forms);
		appContext.event.raise("admin-ui-plugin.initialize-btn.pageresult", buttons.pageresult);
    });

    appContext.webApiInstaller.get('/forminfo', (req, res) => {
        const successHandler = createSuccessHandler(req, res);
        successHandler(forms);
	});
	
	appContext.webApiInstaller.get('/btninfo/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const id = req.param.id;
        successHandler(buttons[id]);
    });
};