const http = require('http');
const path = require('path');
const fs = require('fs');

const mimes = {
    '.html': 'text/html',
    '.js': 'text/javascript'
};

module.exports = (dir, port) => {
    return http.createServer(function onRequest(req, res) {
        const start = process.hrtime();
        res.end = (end => function () { 
            const delta = process.hrtime(start);
            console.log(res.statusCode + '', req.method, req.url,
                (delta[0] * 1e3 + delta[1] / 1e6).toFixed(3), 'msec');
            end.apply(this, arguments);
        })(res.end);

        const file = path.join(dir, req.url);
        if (!file.startsWith(dir))
            return resError(418, new Error('malicious? ' + file));

        fs.stat(file, (err, stat) => {
            if (err) return resError(404, err);

            if (stat.isDirectory()) {
                if (!req.url.endsWith('/'))
                    return resRedirect(301, req.url + '/');
                const file2 = path.join(file, 'index.html');
                fs.stat(file2, (err, stat) => {
                    if (err) resDir(file);
                    else resFile(file2);
                });
            }
            else resFile(file);
        });

        function resFile(file) {
            res.writeHead(200, {
                'content-type':
                    mimes[path.extname(file)] || 'text/plain'
            });
            fs.createReadStream(file).on('error', resError).pipe(res);
        }

        function resDir(dir) {
            fs.readdir(dir, (err, names) => {
                if (err) return resError(500, err);

                res.writeHead(200, { 'content-type': 'text/html' });
                res.end('<pre>' + names.map(x =>
                    '<a href="' + x + '">' + x + '</a>')
                    .join('\n') + '</pre>');
            });
        }

        function resRedirect(code, loc) {
            res.writeHead(code, { location: loc });
            res.end(code + ' ' + http.STATUS_CODES[code] + '\n' + loc);
        }

        function resError(code, err) {
            if (code instanceof Error) err = code, code = 500;
            res.writeHead(code, { 'content-type': 'text/plain' });
            res.end(code + ' ' + http.STATUS_CODES[code] + '\n' +
                (err + '').replace(dir, '*'));
        }

    }).listen(port);

};