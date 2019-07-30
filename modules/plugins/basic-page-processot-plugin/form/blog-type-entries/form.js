(function() {
    
    var resolver = function(element) {
        var data = {};

        data["selector_for_block"] = element.find("input[name='selector_for_block']").val();
        data["selector_for_link"] = element.find("input[name='selector_for_link']").val();
        data["selector_for_update"] = element.find("input[name='selector_for_update']").val();
        data["entry_update_format"] = element.find("input[name='entry_update_format']").val();
        data["process_target_term"] = element.find("input[name='process_target_term']").val();
        data["max_process_entry_count"] = element.find("input[name='max_process_entry_count']").val();
        data["selector_for_next_page"] = element.find("input[name='selector_for_next_page']").val();
        data["max_process_page_count"] = element.find("input[name='max_process_page_count']").val();
        data["is_continuation_nodata"] = $("input[name='is_continuation_nodata']").prop("checked");
        return data;
    };
    
    var valiadtor = function(data) {
        return [];
    };
    
    $('body').trigger('page-processor-form-regsiter', {
        name : "blog-type-entries",
        resolver : resolver,
        validatior : valiadtor
    });

})();
