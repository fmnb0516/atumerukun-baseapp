const createSuccessHandler = (req, res) => {
	
	return (entries) => {
		res.json({
			status : 200,
			message: "",
			result : entries,
		});
	};
};

const createErrorHandler = (req, res) => {
	return (e) => {
		res.json({
			status : 500,
			message: "" + e,
		});
	};
};

module.exports = (appContext) => {

    appContext.webApiInstaller.get('/console', (req, res) => {
		
		res.send(`
				<!DOCTYPE html>
				<html style="height: 100%;">
					<head>
						<meta charset="utf-8">
						<title>Torasan: [webscraping-data-crud]</title>
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<meta http-equiv="X-UA-Compatible" content="IE=edge" />
						<link rel="stylesheet" href="https://bootswatch.com/4/flatly/bootstrap.css" media="screen">
					</head>
					<body style="height: 100%;">
						
						<div class="navbar navbar-expand-lg fixed-top navbar-dark bg-primary">
							<div class="container">
								<a href="#" class="navbar-brand">Torasan - [webscraping-data-crud] - console</a>
								<button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
									<span class="navbar-toggler-icon"></span>
								</button>
								
								<div class="collapse navbar-collapse" id="navbarResponsive">
									<ul class="navbar-nav">
									</ul>
									
									<ul class="nav navbar-nav ml-auto">	
									</ul>
								</div>
							</div>
						</div>
						
						<div class="container" style="padding-top: 80px;height: 100%;">
							<div class="row" style="height: 100%;">
								<div class="col-lg-6">
									<div class="form-group">
										<label for="inputApiUrl">URL</label>
										<input type="text" class="form-control" id="inputApiUrl" placeholder="input api url">
									</div>
									<div class="form-group">
										<label for="methodSelect">Http Method</label>
										<select class="form-control" id="methodSelect">
											<option value="get">GET</option>
											<option value="post">POST</option>
											<option value="put">PUT</option>
											<option value="delete">DELETE</option>
										</select>
									</div>
                  
									<div class="form-group" style="height: calc(100% - 220px);">
										<label for="requestInput">request(json)</label>
										<textarea class="form-control" id="requestInput" style="height: calc(100% - 20px);"></textarea>
									</div>
									<button type="button" class="btn btn-primary" id="submit-btn">Submit</button>
									<button type="button" class="btn btn-info" id="clear-btn">Clear</button>
								</div>
								<div class="col-lg-6">
									<div class="form-group" style="height: calc(100% - 20px);">
										<label for="responseOutput">response(json)</label>
										<textarea readonly="readonly" class="form-control" id="responseOutput" style="height: calc(100% - 20px);"></textarea>
									</div>
								</div>
							</div>
						</div>
						
						<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
						<script type="text/javascript">
							$("#clear-btn").click(function() {
								$("#responseOutput").val("");
								$("#requestInput").val("");
								$("#inputApiUrl").val("");
								$("#methodSelect").val("get");
							});
							
							$("#submit-btn").click(function() {
								var parameter = $("#requestInput").val().trim();
								
								var url = $("#inputApiUrl").val();
								var method = $("#methodSelect").val();
								
								$.ajax({
									url:url,
									type:method,
									dataType: 'json',
									contentType: 'application/json',
									data: parameter,
									success: function(data) {
										$("#responseOutput").val(JSON.stringify(data, null , "\t"));
									},
									error: function(XMLHttpRequest, textStatus, errorThrown) {
										$("#responseOutput").val(errorThrown);
									},
								});
							});
						</script>
					</body>
				</html>
		`.trim());
    });
    
    appContext.webApiInstaller.get('/webscrapings', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.allWebscraping()
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.get('/webscraping/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.getWebscraping(req.params.id)
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.put('/webscraping/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.updateWebscraping(req.params.id, req.body)
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.delete('/webscraping/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.removeWebscraping(req.params.id)
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.post('/webscrapings', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.createWebscraping(req.body)
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.get('/pageresults', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.allPageResult(req.query.web_scraping_id, req.query.offset, req.query.limit)
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.get('/pageresult/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.getPageResult(req.params.id)
			.then(successHandler, errorHandler);
	});
	
	appContext.webApiInstaller.delete('/pageresult/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.removePageResult(req.params.id)
			.then(successHandler, errorHandler);
	});

	appContext.webApiInstaller.post('/pagevalue/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.createPageValue(req.params.id, req.body)
			.then(successHandler, errorHandler);
	});

	appContext.webApiInstaller.put('/pagevalue/:rid/:vid', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.updatePageValue(req.params.rid, req.params.vid, req.body)
			.then(successHandler, errorHandler);
	});

	appContext.webApiInstaller.delete('/pagevalue/:id', (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const errorHandler = createErrorHandler(req, res);
		
		appContext.repo.removePageValue(req.params.id)
			.then(successHandler, errorHandler);
    });
    
};