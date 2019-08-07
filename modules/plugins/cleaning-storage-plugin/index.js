const createSuccessHandler = (req, res) => {
	return (entries) => {
		res.json({
			status : 200,
			message: "",
			result : entries,
		});
	};
};

const chunk = (size, array) => {
    const result = [];
    for (var i=0; i < array.length; i+=size) {
        result.push(array.slice(i,i+size));
    }
    return result;
};

module.exports = async (appContext) => {
    const logger = appContext.logger;

    const storageDir = appContext.core.baseDir + "/storage";
    const db = appContext.core.repo.getDB();

    const cleanupFiles = async (entries) => {
        const query = entries.map(e => "'" + e + "'").join(",");

        const sql = "SELECT id, page_result_id, data_key, data_value, data_type, sort FROM page_value WHERE data_type = 'image' AND data_value IN(" + query + ")";
        const records = await db.selectQuery(sql, []);
        const existMap = {};

        records.forEach(r => {
            existMap[r.data_value] = true;
        });

        for(var i=0; i<entries.length; i++) {
            const file = entries[i];

            if(existMap[file] === true) {
                continue;
            }

            logger.info("    - delete storage file : " + file);
            await appContext.core.fileSystem.remove(storageDir + "/" + file);
        }
    };

    const coleanupStorage = async () => {
        logger.info("---- begin coleanup storage directory ----");
        const files = await appContext.core.fileSystem.readdir(storageDir);
        const entries = chunk(10, files);
        for(var i=0; i<entries.length; i++) {
            const entry = entries[i];
            await cleanupFiles(entry);
        }
        logger.info("---- end coleanup storage directory ----");
    }

    appContext.webApiInstaller.post('/cleanup', (req, res) => {  
        const successHandler = createSuccessHandler(req, res);
        coleanupStorage().then(() => successHandler("cleanup success."));
    });

};
