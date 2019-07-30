(function() {

    $("body").on("click", ".page-data-resolve-add-btn", function(e) {
        var container = $(this).parent();
        var table = container.find("table tbody");

        var html = "";
        html += "<tr>";
        html += "    <td><input type=\"text\" class=\"form-control\" name=\"dkey\"></td>";
        html += "    <td><input type=\"text\" class=\"form-control\" name=\"selector\"></td>";
        html += "    <td><input type=\"text\" class=\"form-control\" name=\"attr\"></td>";
        html += "    <td><select class=\"form-control\" name=\"mode\"><option value=\"\">NONE</option><option value=\"download\">Download</option></select></td>";
        html += "    <td><button type=\"button\" class=\"btn btn-outline-danger page-data-resolve-delete-btn\">削除</button></td>";
        html += "</tr>";

        table.append(html);
    });

    $("body").on("click", ".page-data-resolve-delete-btn", function(e) {
        $(this).parents("tr").remove();
    });
    
    var resolver = function(element) {
        var processors = [];
        element.find("table tbody tr").each(function() {
            var tr = $(this);

            var dkey = tr.find("input[name='dkey']").val();
            var attr = tr.find("input[name='attr']").val();
            var selector = tr.find("input[name='selector']").val();
            var mode = tr.find("select[name='mode']").val();

            processors.push({
                dkey:dkey,
                attr:attr,
                mode:mode,
                selector:selector
            });
        });

        return {processors:processors};
    };
    
    var valiadtor = function(data) {
        return [];
    };
    
    $('body').trigger('page-processor-form-regsiter', {
        name : "page-data-resolve",
        resolver : resolver,
        validatior : valiadtor
    });
})();
