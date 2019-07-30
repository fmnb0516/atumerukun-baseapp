module.exports = (appContext) => {

    appContext.pageProcessInstaller.install("blog-type-entries", require("./blog-type-entries.js")(appContext));
    appContext.pageProcessInstaller.install("page-data-resolve", require("./page-data-resolve.js")(appContext));
    appContext.pageProcessInstaller.install("page-data-persistence", require("./page-data-persistence.js")(appContext));

};