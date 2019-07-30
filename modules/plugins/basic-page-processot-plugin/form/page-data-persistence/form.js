(function() {
    
    $("body").on("click", ".page-data-persistence-add-btn", function(e) {
        var container = $(this).parent();
        var table = container.find("table tbody");

        var html = "";
        html += "<tr>";
        html += "    <td><input type=\"text\" class=\"form-control\" name=\"key\"></td>";
        html += "    <td><input type=\"text\" class=\"form-control\" name=\"value\"></td>";
        html += "    <td><button type=\"button\" class=\"btn btn-outline-danger page-data-resolve-delete-btn\">削除</button></td>";
        html += "</tr>";

        table.append(html);
    });

    $("body").on("click", ".page-data-persistence-delete-btn", function(e) {
        $(this).parents("tr").remove();
    });

    var resolver = function(element) {
        var typeHint = [];
        element.find("table tbody tr").each(function() {
            var tr = $(this);

            var key = tr.find("input[name='key']").val();
            var value = tr.find("input[name='value']").val();

            typeHint.push({
                key:key,
                value:value
            });
        });

        return {typeHint:typeHint};
    };
    
    var valiadtor = function(data) {
        return [];
    };
    
    $('body').trigger('page-processor-form-regsiter', {
        name : "page-data-persistence",
        resolver : resolver,
        validatior : valiadtor
    });

})();
