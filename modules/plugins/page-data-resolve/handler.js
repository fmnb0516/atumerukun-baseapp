const accsessValue = (element, attr) => {
	if(attr === "html") {
		return element.html();
	} else if(attr === "text") {
		return element.text();
	} else {
		return element.attr(attr);
	}
};

const extention = (appContext, url) => {
	const src = appContext.urlObj.parse(url).pathname;
	
	const slashIndex = src.lastIndexOf("/");
	const path = src.substring(slashIndex);
	
	const dotIndex = path.lastIndexOf(".");
	return dotIndex === -1 ? "" : path.substring(dotIndex);
};

class ValueManager {
	constructor(baseDir, appContext, logger) {
		this.downloads = [];
		this.baseDir = baseDir;
		this.appContext = appContext;
		this.logger = logger;
	};
	
	prepareValue(element, attr, mode) {
		const value = accsessValue(element, attr);
		if(value === undefined || value === null || value === "") {
			return "";
		} 
		
		if(mode === "download") {
			const fileId = this.appContext.uuid.v4() + extention(this.appContext, value);
			
			this.downloads.push({
				id : fileId,
				src: value
			});
			
			return fileId;
		} else {
			return value;
		}
	};
	
	commit() {
		const promisses = [];
		for (var i = 0; i < this.downloads.length; i++) {
			const info = this.downloads[i];
			this.logger.info("start download url = "+ info.src + " =>" + this.baseDir + info.id);
			promisses.push(this.appContext.httpclient.download(this.baseDir + info.id, info.src));
		}
		return Promise.all(promisses);
	};
};

module.exports = (installer, appContext, logger) => {
    installer.install("page-data-resolve", async (configure, chain) => {
        logger.info("start process");
		
		const manager = new ValueManager(appContext.baseDir + "/storage/", appContext, logger);
		
		const processors = Array.isArray(configure.processors) ? configure.processors : [];
		
		const url = chain.getUrl();
		
		logger.info("fetch data : " + url);
		const response = await appContext.httpclient.wget(url);
		const $ = appContext.cheerio.load(response.buffer.toString("utf8"));
		const pageResult = {};
		
		for (var i = 0; i < processors.length; i++) {
			const processor = processors[i];
			logger.info("process data key=" + processor.dkey + ", selector="+processor.selector);
			
			const key = processor.dkey;
			const values = [];
			
			$(processor.selector).each((idx, elm) => {
				const value = manager.prepareValue($(elm), processor.attr, processor.mode);
				logger.info(" -- process value : " + value);
				values.push(value);
			});
			
			pageResult[key] = values;
			logger.info("processed data key=" + processor.dkey + ", selector="+processor.selector);
		}
		
		logger.info("process complete : " + url);

		await chain.proceed(pageResult);

		logger.info("commit data : " + url);
		await manager.commit();
		logger.info("end process");
    });
};
