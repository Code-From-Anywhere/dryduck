"use strict";

var Q = require("q");
var { debug } = require("./util");
module.exports = function (params) {
    var deferred = Q.defer();

    debug({ watchProjectSrc: params });

    //NB: try to watch-del the src first because we want .watchmanconfig to be refreshed. Even if this doesn't work, watch anyway.
    params.client.command(["watch-del", params.src], (error) => {
        // if (error) {
        //     deferred.reject(error);
        // } else {
        params.client.command(["watch", params.src], (error, resp) => {
            if (error) {
                deferred.reject(error);
            } else {
                debug({ watchProjectResponse: resp });
                deferred.resolve(resp);
            }
        });
        // }
    });
    return deferred.promise;
};
