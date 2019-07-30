module.exports = async (appContext) => {
    const moduleDir = appContext.dir;
    const storageDir = appContext.core.baseDir + "/storage";

    const configure = await appContext.core.fileSystem.readFile(moduleDir + "/configure.json", 'utf8')
        .then(text => JSON.parse(text))    
};