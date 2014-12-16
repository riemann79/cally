var express = require('express');
var bodyParser = require('body-parser');

var app = express();
console.log(__dirname);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendfile('demo.html', {root: __dirname });
});

app.get('/res/images/:file', function (req, res) {
    res.sendfile('images/' + req.params.file, {root: __dirname });
});

app.get('/js/:file', function (req, res) {
    res.sendfile(req.params.file);
});

app.get('/res/:file', function (req, res) {
    res.sendfile(req.params.file, {root: __dirname });
});

app.post('/load-html', function (req, res) {
    setTimeout(function () {
        res.json({ Html: "Hello world!" });
    }, 3000);
});

app.post('/load-data', function (req, res) {
    setTimeout(function () {
        res.json({ Success: true });
    }, 3000);
});

app.post('/throw', function () {
    throw new Error("error");
});

app.post('/form-submission', function (req, res) {
    res.json({ Html: "You typed: " + req.body.text });
});

app.post('/recursive', function (req, res) {
    var html = [
        '<div class="ajax-container">',
        '<a href="javascript:void(0)" class="call-on-click" data-url="/recursive" data-mode="html">Click me</a>',
        '<div class="contents"></div>',
        '</div>'
    ].join('');

    setTimeout(function () {
        res.json({ Html: html });
    }, 3000);

});

var server = app.listen(9001, function () {
    console.log('Server started. Please browse to http://localhost:%d', server.address().port);
});