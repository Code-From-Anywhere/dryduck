"use strict";

var fs = require("fs-extra");
var path = require("path");
var { debug } = require("./util");

var linksPath = path.resolve("./dryduck.config.json");
debug({ linksPath1: linksPath });
module.exports.data = [];

module.exports.load = function () {
    var links;

    try {
        links = fs.readJsonSync(linksPath);
    } catch (err) {
        links = {};
    }

    module.exports.data = links;
};

module.exports.save = function () {
    fs.outputJsonSync(linksPath, module.exports.data);
};
