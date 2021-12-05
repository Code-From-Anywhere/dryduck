'use strict';

var Q = require('q');

module.exports = function (params) {
	var deferred = Q.defer();

	console.log({watchProjectSrc:params.src})
	params.client.command(['watch-project', params.src], (error, resp) => {
		if (error) {
			console.log("ERRORORRORORO")
			deferred.reject(error);
		} else {
			deferred.resolve(resp);
		}

	});

	return deferred.promise;
}
