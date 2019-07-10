

module.exports = (installer, appContext, logger) => {
    installer.install("page-data-persistence", async (configure, chain) => {
		logger.info("start process");
		
		const typeHint = configure["typeHint"] ? configure["typeHint"] : [];
		const map = {};
		
		typeHint.forEach((v) => {
			map[v.key] = v.value;
		});
		
		const pageResult = chain.lastPageResult();
		
		logger.info("perist data : " + chain.getUrl() + "," + JSON.stringify(map));

		const persistence = chain.getContext().persistence;
		persistence.addPageResult(chain.getUrl(), pageResult, map);
		
		await chain.proceed({});
		logger.info("end process");
    });
};


