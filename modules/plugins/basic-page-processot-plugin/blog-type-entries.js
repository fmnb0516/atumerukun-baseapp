module.exports = (appContext) => {
    const logger = appContext.logger;

    const awaitAll = (promisses) => {
        return Promise.all(promisses);
    };

    const prepareDataCount = (max, dataCount, length) => {
        const newDataCount = dataCount + length;
        const next = max === -1 || max > newDataCount;
        
        const loop = next ? length : max - dataCount;
        return {
            next : next,
            count : newDataCount,
            loop : loop
        };
    };

    const prepareUrl = (from, next) => {
        const fromUrl = appContext.external("url").parse(from);
        if(next.startsWith("http://") || next.startsWith("https://")) {
            return next;
        } else if(next.startsWith("/")) {
            return fromUrl.protocol + "//" + fromUrl.host + next;
        } else if(next.startsWith("?")) {
            return fromUrl.protocol + "//" + fromUrl.host + fromUrl.pathname + next;
        } else {
            const index = fromUrl.pathname.lastIndexOf("/");
            const path = fromUrl.pathname.substring(0, index);
            return fromUrl.protocol + "//" + fromUrl.host + path + "/" + next;
        }
    };

    const queryBlockData = async (url, configure) => {
        const selectorBlock = configure["selector_for_block"];
        const selectorNext = configure["selector_for_next_page"];
        
        const selectorEntryLink = configure["selector_for_link"];
        const selectorEntryUpdate = configure["selector_for_update"];
        const entryTerm = configure["process_target_term"];
        
        const response = await appContext.httpclient.wget(url);
        const $ = appContext.external("cheerio").load(response.buffer.toString("utf8"));
    
        const blocks = [];
        $(selectorBlock).each((i, elem) => {
            const link = $(elem).find(selectorEntryLink).attr("href");
            const time = $(elem).find(selectorEntryUpdate).text().trim();
    
            if(link === undefined) {
                return;
            }
            blocks.push(prepareUrl(url, link));
        });
        
        const next = $(selectorNext).attr("href");
        return {
            blocks : blocks,
            next : next
        };
    };

    return async (configure, chain) => {
        logger.info("start process");
        logger.debug("configure : " + JSON.stringify(configure));
		
		var url = chain.getUrl();
		
		var dataCount = 0;
		var pageCount = 0;
		
		const promisses = [];

        const persistence = chain.getContext().persistence;
        
		while(true) {
			logger.info("resolve url : " + url);
			
			const data = await queryBlockData(url, configure);
			logger.info("complete resolve entries. url=" +url+ ", next=" + data.next + ", count="+data.blocks.length);
			
			const checkCountResult = prepareDataCount(configure["max_process_entry_count"], dataCount, data.blocks.length);
			dataCount = checkCountResult.count;

			const existResultMap = await persistence.existsPageResult(data.blocks);
			for (var i = 0; i < checkCountResult.loop; i++) {
				const entryUrl = data.blocks[i];
				if(existResultMap[entryUrl] === true) {
					logger.info("already proceed entry url : " + entryUrl);
					continue;
				}

				logger.info("proceed entry url : " + entryUrl);
				promisses.push(chain.proceed({}, entryUrl));
			}
			
			if(data.blocks.length === 0 && configure["is_continuation_nodata"] === false) {
				logger.info("finish traversal. reason is no entry data.");
				break;
			}
			
			if(checkCountResult.next == false) {
				logger.info("finish traversal. reason is over max process entry count : " + dataCount);
				break;
			}
			
			if(data.next === undefined || data.next === null) {
				logger.info("finish traversal. reason is next page url is none.");
				break;
			}
			
			url = prepareUrl(url, data.next);
			
			pageCount += 1;
			if(configure["max_process_page_count"] !== -1 && pageCount > configure["max_process_page_count"]) {
				logger.info("finish traversal. reason is over max page count : " + pageCount);
				break;
			}
		}
		
		await awaitAll(promisses);
        logger.info("end process");
    }; 
};