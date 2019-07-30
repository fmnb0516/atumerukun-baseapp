module.exports = async (appContext, util) => {
    return async (id, postFilePath, assetDir, metadata) => {
        const textLine = [];
        const images = util.resolve(metadata.page_values, "image");
		const title = util.resolve(metadata.page_values, "title")[0];
		const category = util.resolve(metadata.page_values, "category");
		const description = util.resolve(metadata.page_values, "description")[0];

		textLine.push("---");
		textLine.push("title: \"" + title + "\"");
		textLine.push("date: \"" + dateformat(new Date()) + "\"");
		textLine.push("thumbnail: \"" + "/assets/"+id+"/"+ images[0] + "\"");
		textLine.push("tags:");
        
        category.forEach(element => {
			textLine.push("- \"" + element + "\"");
		});
		textLine.push("---");
		textLine.push("");

		for(var i=0; i < images.length; i++) {
		    const f = images[i];
            textLine.push("!["+f+"](/assets/"+id+"/"+f+")");
            if(i==0) {
				textLine.push("<!-- more -->");
				textLine.push("");
				textLine.push(description);
				textLine.push("");
			}
			await appContext.core.fileSystem.copy(storageDir + "/" + images[i], assetDir + "/" + images[i])
        }
        
        await appContext.core.fileSystem.writeFile(postFilePath,textLine.join("\r\n"), "utf8")     
    };
};