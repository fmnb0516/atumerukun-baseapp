module.exports = async (appContext, themeDir, utils) => {
    const Handlebars = appContext.core.external('handlebars');
    const marked = appContext.core.external('marked');

    const renderer = new marked.Renderer();
    /*
    renderer.image = function(href, title, text) {
        return ('<img src="' + href + '" alt="' + text + '" >');
    };
    */

    const tpl = {};
        
    const templateFiles = (await appContext.core.fileSystem.readdir(themeDir)).filter(f => f.endsWith(".hbs"));
    for(var i=0; i<templateFiles.length; i++) {
        const text = await appContext.core.fileSystem.readFile(themeDir + "/" + templateFiles[i], "utf8");
        tpl[templateFiles[i]] = Handlebars.compile(text);
    }
    
    Handlebars.registerHelper('date', function (val, options) {
        const d = new Date(val);
        return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
    });

    Handlebars.registerHelper('disabled', function (val, options) {
        return val ? "" : "disabled";
    });

    Handlebars.registerHelper('include', function (file, options) {
        return new Handlebars.SafeString(tpl[file](this));
    });

    Handlebars.registerHelper('hash', function (text) {
        return utils.md5(text);
    });

    Handlebars.registerHelper('marked', function (text, options) {
        return new Handlebars.SafeString(marked(text, {renderer: renderer}));
    });

    return (name, data) => {
        return tpl[name](data);
    };
};