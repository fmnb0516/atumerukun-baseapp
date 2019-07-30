
(function(exports) {
	var application = {};
	
	application.request = function(opt) {
		var header = opt.header ? opt.header : {};
		
		var ajaxContext = {};
		ajaxContext.type = opt.method.toLowerCase();
		ajaxContext.url = opt.url;
		
		if(opt.data) {
			ajaxContext.contentType = opt.data.type === "json" ? "application/json" : "";
			ajaxContext.data = opt.data.type === "json" ? JSON.stringify(opt.data.value) : "";
		}
		
		return new Promise(function(resolve, reject) {
			ajaxContext.beforeSend = function(request) {
				Object.keys(header).forEach(function(k) {
					request.setRequestHeader(k, header[k]);
				});
			};
			
			ajaxContext.error = function(xhr, textStatus, errorThrown){
				reject({xhr:xhr, status:textStatus, e:errorThrown});
			};
			
			ajaxContext.success = function(data){
				resolve(data);
			},

			$.ajax(ajaxContext);
		});
	};
	
	(function() {
		var html = "";
		html += "<div class=\"modal\" tabindex=\"-1\" role=\"dialog\" id=\"confirm-modal\">";
		html += "    <div class=\"modal-dialog\" role=\"document\">";
		html += "        <div class=\"modal-content\">";
		html += "            <div class=\"modal-header\">";
		html += "                <h5 class=\"modal-title\">Confirm</h5>";
		html += "                <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\">";
		html += "                    <span aria-hidden=\"true\">&times;</span>";
		html += "                </button>";
		html += "            </div>";
		html += "            <div class=\"modal-body\">";
		html += "                <p></p>";
		html += "            </div>";
		html += "            <div class=\"modal-footer\">";
		html += "                <button  type=\"button\" class=\"confirm-dialog-ok btn btn-info\">OK</button>";
		html += "                <button type=\"button\" class=\"btn btn-success\" data-dismiss=\"modal\">Cancel</button>";
		html += "            </div>";
		html += "        </div>";
		html += "    </div>";
		html += "</div>";
		
		var onclick = null;
		
		application.confirm = function(visible, message, callback) {
			if($("#confirm-modal").length === 0) {
				$("body").append(html);
				
				$("#confirm-modal .confirm-dialog-ok").click(function() {
					onclick();
					onclick = null;
					$("#confirm-modal .modal-body p").text('');
					$("#confirm-modal").modal("hide");
				});
			}
			
			if(visible === true) {
				$("#confirm-modal .modal-body p").text(message);
				$("#confirm-modal").modal("show");
				onclick = callback;
			} else {
				onclick = null;
				$("#confirm-modal .modal-body p").text('');
				$("#confirm-modal").modal("hide");
			}
		};
		
	})();
	
	(function() {
		var toast = new Toast();
		
		application.toast = function(type, message) {
			toast.show(message);
		};
	})();
	
	(function() {
		function generateUuid() {
			let chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("");
			for (let i = 0, len = chars.length; i < len; i++) {
				switch (chars[i]) {
					case "x":
						chars[i] = Math.floor(Math.random() * 16).toString(16);
						break;
					case "y":
						chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
						break;
				}
			}
			return chars.join("");
		};

		var AppModule = function(hbs, metadata) {
			this.hbs = hbs;
			this.templates = {};
			this.metadata = metadata;
			
			this.hbs.registerHelper('unixtime', function(t) {
				var d = new Date(t);
				return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日"
					+ " "
					+ ( '0' + d.getHours() ).slice(-2) + "時"
					+ ( '0' + d.getMinutes() ).slice(-2) + "分";
			});

			this.hbs.registerHelper('equals', function(val1, val2, opt) {
				if(val1 === val2) {
					return opt.fn(this);
				} else {
					return opt.inverse(this);
				}
			});

			this.hbs.registerHelper('notequals', function(val1, val2, opt) {
				if(val1 === val2) {
					return opt.inverse(this);
				} else {
					return opt.fn(this);
				}
			});
			
			this.hbs.registerHelper('decodeurl', function(url) {
				return decodeURI(url);
			});
			
			this.hbs.registerHelper('compare', function(actual, expect, t, f) {
				return actual === expect ? t : f;
			});

			this.hbs.registerHelper('json', function(json) {
				return new Handlebars.SafeString(JSON.stringify(json, null, "\t"));
			});

			this.hbs.registerHelper('check', function(value) {
				return value ? "checked" : "";
			});

			this.hbs.registerHelper('select', function(v1, v2) {
				return v1 === v2 ? "selected" : "";
			});

			this.hbs.registerHelper('plugin_configure', function(type, configure) {
				var uuid = generateUuid();
				application.request({
					url : metadata[type].template,
					method : "GET"
				}).then(function(resp) {
					var result = hbs.compile(resp)({uuid:uuid, data:configure});
					$("#"+uuid).html(result);
				});

				return new Handlebars.SafeString("<div data-type='"+type+"' style='padding: 10px;' class='configure-container' id='"+uuid+"'></div>");
			});
		};
		
		AppModule.prototype.render = function(id, context) {
			if(this.templates[id] === undefined || this.templates[id] === null) {
				var src = $("#" + id).html()
				this.templates[id] = this.hbs.compile(src);
			}
			
			return this.templates[id](context);
		};
		
		application.create = function(metadata) {
			metadata = metadata !== undefined ? metadata : {};
			for(var k in metadata) {
				var url = metadata[k].script;
				$("body").append($("<script>", {type:"text/javascript", src:url}));
			}

			var hbs = Handlebars.create();
			return new AppModule(hbs, metadata);
		};
	})();

	(function() {
		application._handler = {};

		application.resolveHandlerConfigure = function(element) {
			var type = element.attr("data-type");
			var dataHandler = application._handler[type];

			var data = dataHandler.resolver(element);
			return data;
		};

		/*
		application.registerHandlerForm = function(key, resolver, validation) {
			
		};
		*/

		$("body").on("page-processor-form-regsiter", function(e, data) {
			var key = data.name;

			application._handler[key] = {
				resolver : data.resolver,
				validation : data.validator
			};

		});
	})();
	
	exports.application = application;
})(window);