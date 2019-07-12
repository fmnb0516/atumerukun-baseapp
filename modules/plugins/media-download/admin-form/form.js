(function() {
    
    var resolver = function(element) {
        var data = {};

        data["youtubedl_cmd_path"] = element.find("input[name='youtubedl_cmd_path']").val();
        data["result_key"] = element.find("input[name='result_key']").val();
        return data;
    };
    
    var validation = function(data) {
        return [];
    };
    
    application.registerHandlerForm("media-download", resolver, validation);

})();
