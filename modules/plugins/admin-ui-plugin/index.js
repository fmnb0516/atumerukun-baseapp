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
    appContext.event.on("system.initialized", (e) => {
        appContext.event.raise("admin-ui-plugin.initialize-form", forms);
    });

    appContext.webApiInstaller.get('/forminfo', (req, res) => {
        const successHandler = createSuccessHandler(req, res);
        successHandler(forms);
    });
};