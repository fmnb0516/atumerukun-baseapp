

module.exports = (installer, appContext, logger) => {
    installer.install("media-download", async (configure, chain) => {
		logger.info("start process");
		
		const youtubedl = configure["youtubedl_cmd_path"] ? configure["youtubedl_cmd_path"] : "youtube-dl.py";
		const key = configure["result_key"] ? configure["result_key"] : "media";
		
		const filename = appContext.external("uuid").v4() + ".mp4"; 
		const output = appContext.baseDir + "/storage/" + filename;
		const url = chain.getUrl();
		
		const pageResult = {};	
	    const cmd = youtubedl + " -o \""+ output + "\" " + url;
	    
	    logger.info("invoke download commadn : " + cmd);
		const result = await appContext.exec(cmd)
			.then((stdout, stderr) => appContext.fileSystem.exist(output));
		
		if(result === true) {
			logger.info("media download complete : " + url + " => " + output);
			
			pageResult[key] = filename;
			persistence.addPageResult(chain.getUrl(), pageResult, {key : "media"});
		} else {
			logger.info("media download error : " + url);
		}
		
		await chain.proceed(pageResult);
		logger.info("end process");
    });
};


