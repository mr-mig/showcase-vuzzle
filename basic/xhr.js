{
	version : "0.1",
	/**
	 * Crossdomain 'get' request. eXtended get function. Sends
	 * crossdomain GET request. O uses <script> transport. M uses
	 * GM_xmlHttpRequest C uses background xdr technique.
	 * 
	 */
	xget : function(url, onDone){
		/*
		 * if (vu.constants.USERAPI_DOMAIN_REG.test(url)){
		 * vu._core.xhr..apiGet(url, onDone); } else {
		 */
			try{
				vu._core.xhr.xget(url, onDone);
			}catch(e){
				vu.error(e);
			}
		// }
	},
	
	/**
	 * Simple get function. Sends ajax GET request.
	 * 
	 */
	get : function(url,param,onDone, onFail){
		$.ajax({
			url: url,
			type: "GET",
			data: param,
			success: onDone,
			error: function(x,r,e){
				vu._core.xhr.handleXhrError(x,r,e,onFail);
			}
		});
	},
	
	/**
	 * Simple post function. Sends ajax POST request.
	 * 
	 * 
	 */
	post : function(url,param,onDone, onFail){
		$.ajax({
			url: url,
			type: "POST",
			data: param,
			success: onDone,
			error: function(x,r,e){
				vu._core.xhr.handleXhrError(x,r,e,onFail);
			}
		});
	},
	/**
	 * Callback used for vkontakte userapi requests. Requests uses
	 * JSONP, so response can be simply evaluated.
	 * 
	 * @browser M,C
	 * 
	 */
	/*
	 * xdrCallback : function(data){ vu._core.xhr.response =
	 * eval("("+data+")"); },
	 */
				
	/**
	 * Chains ajax "GET" requests.
	 * 
	 * @param {String}
	 *            url Ajax target url
	 * @param {Array}
	 *            array Array of callback functions. They will be
	 *            invoked one by one in array index increment order.
	 * @param {Function}
	 *            array Single callback function.
	 * @param {Boolean}
	 *            loop If specified, request will be sent infinitly. The
	 *            callback array will restart from the beginning when
	 *            index will exceed array's length.
	 * @param {Number}
	 *            timeout Timeout between requests in milliseconds
	 * @throws Error
	 *             Throws an error when not all obligatory params are
	 *             specified
	 * 
	 * url and array params are obligatory. loop defaults to false
	 */ 
	chainAjax : function(param){
		param = $.extend({
			loop : false,
			timeout : 0
		},param);
		if (!param.url && !param.array){
			throw new Error("Invalid parameter count: url and array must be explicitly defined!")
		}
		var i = 0;
		$.get(param.url,handle);

		function handle(d){
			if(param.loop === true){
				if(typeof param.array !== 'function'){ 
					if (i >= param.array.length){
						i = 0;
					}
					param.array[i++](d);
				} else {
					param.array(d);
				}
				if (param.timeout > 0){
					setTimeout(function(){$.get(param.url,handle)}, param.timeout);
				} else {
					$.get(param.url,handle);
				}
			} else {
				if(typeof param.array !== 'function'){ 
					if (i >= param.array.length){
						return;
					}
					param.array[i++](d);
					if (param.timeout > 0){
						setTimeout(function(){$.get(param.url,handle)}, param.timeout);
					} else {
						$.get(param.url,handle);
					}
				} else {
					param.array(d);
				}
			}
		};
	}


}