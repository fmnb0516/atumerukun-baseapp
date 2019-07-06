

module.exports = (installer, appContext, logger) => {
    installer.install("page-data-persistence", async (configure, chain) => {
		logger.info("start process");
		
		const typeHint = configure["typeHint"] ? configure["typeHint"] : [];
		
		const pageResult = chain.lastPageResult();
		
		logger.info("perist data : " + chain.getUrl() + "," + typeHint);

		const persistence = chain.getContext().persistence;
		persistence.addPageResult(chain.getUrl(), pageResult, typeHint);
		
		await chain.proceed({});
		logger.info("end process");
    });
};


