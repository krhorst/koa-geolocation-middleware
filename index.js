'use strict'

var request = require('co-request');

module.exports = function koaGeocodeMiddleware (blacklist) {	
	return function * (next) {
		this.geo = {};
		var ip = this.ip;
		var url = "http://ipinfo.io/" + ip + "/json";		
		var geo_data = yield request(url);
	    yield * next;
	 }	
}