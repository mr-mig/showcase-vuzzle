{
	version : "0.1",
	/**
	 * Saves arbitrary data to the localStorage. Automatically uneval
	 * objects.
	 * 
	 * @param {String}
	 *            key - key for the storage mapping
	 * @param {Object}
	 *            value - value to be mapped for key provided
	 */
	save : function(key, value){
		value = uneval(value);
		/*
		 * browser.isMozilla ?
		 * setTimeout(function(){GM_setValue(key,value);},0) :
		 */
		if (typeof key === 'object'){
			key = key.join(".");	
		}
		key = vu._core.NAMESPACE+key;

		unsafeWindow.localStorage[key] = value;
	},
	
	/**
	 * Loads arbitrary data from the localStorage. Automatically eval
	 * objects.
	 * 
	 * @param {String}
	 *            key - key for the storage mapping
	 * @param {Object}
	 *            defaultValue - value to be mapped for key if no value
	 *            was retrieved from storage
	 */
	load : function(key,defaultValue){
		if (typeof key === 'object'){
			key = key.join(".");	
		}
		key = vu._core.NAMESPACE+key;
		
		try{
			var value = unsafeWindow.localStorage[key];
			if (typeof defaultValue != 'undefined') {
				if (value === "" || value === null || value === "null" || value === undefined) {
					return defaultValue;
				}
			}
			return eval(value);
		}
		catch(e){
			vu._core.log(e);
			return defaultValue;	
		}
	},
	/**
	 * Removes arbitrary data from the localStorage.
	 * 
	 * @param {String}
	 *            key - value, mapped by this key, will be removed
	 */

	remove : function(key){
		if (typeof key === 'object'){
			key = key.join(".");	
		}
		key = vu._core.NAMESPACE+key;
		unsafeWindow.localStorage[key] = "";
	},
	/**
	 * Deletes all data from the storage
	 * 
	 */
	clear : function(){
		if(localStorage.clear){
			localStorage.clear();	
		}
	}
}