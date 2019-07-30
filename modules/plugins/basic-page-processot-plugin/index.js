module.exports = (appContext) => {
    appContext.pageProcessInstaller.install("blog-type-entries", require("./blog-type-entries.js")(appContext));
    appContext.pageProcessInstaller.install("page-data-resolve", require("./page-data-resolve.js")(appContext));
    appContext.pageProcessInstaller.install("page-data-persistence", require("./page-data-persistence.js")(appContext));
    appContext.webApiInstaller.resource("/form", "form");

    appContext.event.on("admin-ui-plugin.initialize-form", (e) => {
        e.context["blog-type-entries"] = {
            script  : "/basic-page-processot-plugin/form/blog-type-entries/form.js",
            template: "/basic-page-processot-plugin/form/blog-type-entries/form.html"
        };

        e.context["page-data-resolve"] = {
            script  : "/basic-page-processot-plugin/form/page-data-resolve/form.js",
            template: "/basic-page-processot-plugin/form/page-data-resolve/form.html"
        };

        e.context["page-data-persistence"] = {
            script  : "/basic-page-processot-plugin/form/page-data-persistence/form.js",
            template: "/basic-page-processot-plugin/form/page-data-persistence/form.html"
        };
    });
};