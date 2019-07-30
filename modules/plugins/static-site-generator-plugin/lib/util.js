module.exports = async (appContext) => {
    const util = {};

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
    
    const zeroPadding = (num,length) => {
        return ('0000000000' + num).slice(-length);
    };
    
    const chunk = (size, array) => {
        const result = [];
        for (var i=0; i < array.length; i+=size) {
            result.push(array.slice(i,i+size));
        }
        return result;
    };

    const copyResource = async (from, to) => {
        const resources = await appContext.core.fileSystem.readdir(from);
        const futures = [];
        for(var i=0; i<resources.length; i++) {
            const res = resources[i];
            await appContext.core.fileSystem.copy(from + "/" + res, to + "/" + res);
        }
    };

    const md5 = (text) => {
        const md5hash = appContext.core.external('crypto').createHash('md5');
        md5hash.update(text, 'binary');
        return md5hash.digest('hex');
    };

    const cleanDir = async (dir) => {
        const eixist = await appContext.core.fileSystem.exist(dir);
        if(eixist === true) {
            await appContext.core.fileSystem.remove(dir);
        }
        return appContext.core.fileSystem.mkdirs(dir);
    };

    util.copyResource = copyResource;
    util.md5 = md5;
    util.zeroPadding = zeroPadding;
    util.chunk = chunk;
    util.dateformat = dateformat;
    util.resolve = resolve;
    util.cleanDir = cleanDir;
    
    return util;
};