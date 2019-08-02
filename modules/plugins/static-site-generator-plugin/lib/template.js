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
    
    Handlebars.registerHelper('split', function (text, max, options) {
        const ary = text.split(",");

        if(!ary || ary.length === 0) {
            return options.inverse(this);
        }

        const size = ary.length > max ? max : ary.length;
        const data = options.data ? Handlebars.createFrame(options.data) : undefined;
        const result = [];
        for(var i = 0; i < size; ++i) {
            if (data) {
                data.index = i;
            }
            result.push(options.fn(ary[i], {data: data}));
        }
        return new Handlebars.SafeString(result.join(''));
    });

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

    Handlebars.registerHelper('json', function (data) {
        return JSON.stringify(data);
    });

    Handlebars.registerHelper('marked', function (text, options) {
        return new Handlebars.SafeString(marked(text, {renderer: renderer}));
    });

    return (name, data) => {
        return tpl[name](data);
    };
};