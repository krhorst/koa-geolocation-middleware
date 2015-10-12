var expect    = require("chai").expect;
var geo_middleware = require("../index.js");
var request = require("supertest");
var koa = require("koa");
var nock = require("nock");

var server_with_middleware = function(middleware){
	var app = koa();
	app.proxy = true;  
	return app.use(middleware).use(function * (next){	
			this.body = 'Request Received';
		   	yield * next;
		});
	}

var geocode_api_response = {
	  "ip": "8.8.8.8",
	  "hostname": "google-public-dns-a.google.com",
	  "city": "Mountain View",
	  "region": "California",
	  "country": "US",
	  "loc": "37.3860,-122.0838",
	  "org": "AS15169 Google Inc.",
	  "postal": "94040"
	};
	
var no_geo_response = {
	 "ip": "0.40.40.40",
	 "hostname": "No Hostname",
	 "bogon": true
	};
	
var invalid_ip_response = "Please provide a valid IP address";		

var api;
var api_without_geo;
var api_invalid_ip;
	
describe("middleware", function(){
		
	beforeEach(function(){
		api = nock("http://ipinfo.io").get("/" + geocode_api_response.ip + '/json').reply(200,geocode_api_response, {'Content-Type': 'application/json'});
		ip_without_geo = nock("http://ipinfo.io").get("/" + no_geo_response.ip + '/json').reply(200,no_geo_response, {'Content-Type': 'application/json'});
		api_invalid_ip = nock("http://ipinfo.io").get("/b/json").reply(404, invalid_ip_response)		
	});
		
    afterEach(function(){
		nock.cleanAll();
	})
			
	it("should allow a request to go through if no blacklist", function(done){	    
		var server = server_with_middleware(geo_middleware());
		request(server.callback()).get('/').set('X-Forwarded-For', geocode_api_response.ip).expect(200, 'Request Received').end(done);
	});
			
	it("should allow a request to go through if not on blacklist", function(done){	    
		var server = server_with_middleware(geo_middleware(['/differentroute']));
		request(server.callback()).get('/').set('X-Forwarded-For', geocode_api_response.ip).expect(200, 'Request Received').end(done);
	});
	
	it("should allow a request to go through if on blacklist", function(done){
		var server = server_with_middleware(geo_middleware(['/']));
		request(server.callback()).get('/').set('X-Forwarded-For', geocode_api_response.ip).expect(200, 'Request Received').end(done);
	});
	
	it("should have called api if no blacklist", function(done){
		var server = server_with_middleware(geo_middleware());		
		request(server.callback()).get('/').set('X-Forwarded-For', geocode_api_response.ip).end(function(){
			expect(api.isDone()).to.equal(true);		
			done();
		});
	});
	
	it("should not have geocoded if on blacklist", function(done){
			var server = server_with_middleware(geo_middleware(['/']));
			server.use(function * (next){
				this.body = this.has_geo;
			})
			request(server.callback()).get('/').set('X-Forwarded-For', geocode_api_response.ip).expect('false').end(function(){
				expect(api.isDone()).to.equal(false);		
				done();
			});
	});
	
	it("should have the location available in the request object", function(done){
		var server = server_with_middleware(geo_middleware());
		server.use(function * (next){
			this.body = this.geo.loc;
	  		yield * next;
		});
		request(server.callback()).get('/').set('X-Forwarded-For', geocode_api_response.ip).expect(geocode_api_response.loc,done);
	});
	
	it("should set the has_geo flag to false if geolocation fails", function(done){
		var server = server_with_middleware(geo_middleware());
		server.use(function * (next){
			this.body = this.has_geo;
	  		yield * next;
		});
		request(server.callback()).get('/').set('X-Forwarded-For', 'b').expect('false',done);
	});
	
	

		
})