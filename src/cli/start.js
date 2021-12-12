"use strict";

require("colors");

var path = require("path");

var capabilityCheck = require("../capabilityCheck.js");
var watchProject = require("../watchProject.js");
var getConfig = require("../getConfig.js");
var subscribe = require("../subscribe.js");
var watchman = require("fb-watchman");
var links = require("../links.js");
var copyHandler = require("../handlers/copy.js");
var untildify = require("untildify");
var { debug } = require("../util");
exports.command = "start";

exports.describe = "Starts watching all links";

exports.builder = {};

function onLinksChange(onChange) {
    return function (resp) {
        var hasLinksChanged =
            resp.files &&
            resp.files.some(function (file) {
                return file.name === "dryduck.config.json";
            });

        if (hasLinksChanged) {
            onChange();
        }

        debug("check onLinksChange", { resp, hasLinksChanged });
    };
}

var watchers = [];

function getAbsoluteLink(src) {
    return path.resolve(untildify(src));
}

function startWatcher(link, linkId) {
    //console.log({oldSrc: link.src});
    link.src = getAbsoluteLink(link.src);
    link.dest = getAbsoluteLink(link.dest);

    debug("startWatcher", { link });
    if (!link.enabled) {
        return;
    }

    var client = new watchman.Client();
    var relativePath;
    var watch;

    watchers[linkId] = client;

    capabilityCheck({
        client: client,
    })
        .then(() => {
            return watchProject({
                client: client,
                src: link.src,
            });
        })
        .then((resp) => {
            if ("warning" in resp) {
                console.log("[watch-warning]".yellow, resp.warning);
            }

            debug("[watch]".green, resp.watch, resp.relative_path);

            relativePath = resp.relative_path;
            watch = resp.watch;

            return getConfig({
                client: client,
                src: link.src,
            });
        })
        .then((resp) => {
            debug("[watch-config]".green, resp.config, link);

            return subscribe({
                client: client,
                watch: watch,
                relativePath: relativePath,
                src: link.src,
                handler: copyHandler({
                    src: link.src,
                    dest: link.dest,
                    ignore: link.ignore,
                }),
            });
        })
        .then(
            () => {
                debug("[subscribe]".green, link.src);
            },
            (err) => {
                client.end();

                var error = err.watchmanResponse
                    ? err.watchmanResponse.error
                    : err;

                console.log("[error]".red, { error, link });

                // throw err;
            }
        )
        .done();

    return client;
}

function stopWatcher(watcher, src, dest) {
    watcher.end();
    debug("[end]".green, src, "->", dest);
}

function updateWatchers() {
    debug("update watchers");
    var prevLinks = links.data,
        i;

    links.load();

    // Create new watchers and change current watchers state
    //
    for (i in links.data) {
        var link = links.data[i],
            prevLink = prevLinks[i] || {};

        debug({ prevEnabled: prevLink.enabled, enabled: link.enabled });
        if (!prevLink.enabled && link.enabled) {
            watchers[i] = startWatcher(links.data[i], i);
        } else if (prevLink.enabled && !link.enabled) {
            stopWatcher(watchers[i], link.src, link.dest);
            delete watchers[i];
        }

        delete prevLinks[i];
    }

    // Turn off all previous watchers that didn't exists in current links list
    //
    for (i in prevLinks) {
        stopWatcher(watchers[i], link.src, link.dest);
        delete watchers[i];
    }
}

exports.handler = () => {
    debug("starting...");
    var linksPath = path.resolve(".");

    const client = new watchman.Client();
    watchProject({
        client: client,
        src: linksPath,
    }).then((response) => {
        debug({ firstWatchProjectResponse: response });

        subscribe({
            client,
            watch: linksPath,
            src: linksPath,
            handler: onLinksChange(updateWatchers),
        });
    });
};
