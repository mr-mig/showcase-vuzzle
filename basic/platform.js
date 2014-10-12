{
	version : "0.4",
	console : {
		window: $("<div></div>"),
		init : function(){
			vu._core.ui.Console({element: vu.platform.console.window, 
				width : 100,
				height : 400,
				minHeight : 100});
			vu.debug("vu-console defined");
		}, 
		log : function(msg, class){
			var date = new Date();
			date = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
			if (class){
				vu.platform.console.window.append("<span class='vu-window-header-lable'>" + date + "</span>"+ "  <span class='"+class+"'>" +msg+"</span><br/>");
			} else {
				vu.platform.console.window.append("<span class='vu-window-header-lable'>" + date + "</span>"+ " "+msg+"<br/>");
			}
		}
	},
	/**
	 * Contains all loaded modules names and switch status. I.e
	 * modules["audio"] == true means that audio module is switched on.
	 * 
	 * @type {Object}
	 */
	modules : {},
	availableModules : [],
	parseModuleName : function (data){
		try{
			return data.match(vu.constants.MODULE_NAME_REG)[1].replace(/\s/g,"");
		} catch(e){
			throw new Error(vu.lang.module_name_error);	
		}
	},
	parseModuleBody : function(data){
		try{
			return data.substr(data.indexOf("(func"));
		} catch(e){
			throw new Error(vu.lang.module_body_error);	
		}
	},
	loadModule : function(data, throwError){
		try {
			var moduleName = vu.platform.parseModuleName(data);
			var moduleBody = vu.platform.parseModuleBody(data);
			try{
				this[moduleName] = eval(moduleBody);
			} catch(e){
				vu.error("Файл модуля "+moduleName+" содержит ошибки!");
				throw new Error(e);
			}
			try{
				for (var j in this[moduleName].settings){
					this[moduleName].settings[j].value = vu.data.load(["modules",moduleName,j], this[moduleName].settings[j].value);
				}
			}catch(e){
				throw new Error(e);
			}
			if (!this.modules[moduleName]){
				// modules are turned on by default
				this.modules[moduleName] = 1;
				vu.data.save("modules",this.modules);
			}
			try{// start module
				this[moduleName].init();
			} catch(e){
				vu.error("Не удалось стартовать модуль "+moduleName+" вызовом init()");
				throw new Error(e);
			}
			// cache the module object to the localStorage
			// N.B. We cache OBJECT, not String moduleBody
			vu.data.save(["modules",moduleName],moduleBody);
			vu.debug("module loaded: " + moduleName);
		} catch(x){
			if (!throwError){
				vu.error("Не удалось загрузить модуль "+moduleName);
				vu.error("Ошибка в модуле: " + x.message);
			} else {
				throw new Error("Ошибка в модуле: " + x.message);	
			}
		}
	},
	instalModule : function(url, onDone){
		var handle = function(data){
			vu.platform.loadModule(data);
			onDone();
		}
		vu.xhr.xget(url, handle);
	},
	/**
	 * Get available module list from server.
	 * 
	 */
	getAvailableModulesList : function(onDone){
		var handler = function(data){
			vu.platform.availableModules = eval("("+data+")");
			onDone(data);
		};
		vu.xhr.xget(vu.config.MODULE_LIST_URL, handler);
	},
	init : function(){
		this.modules = vu.data.load("modules",{});
		for (var i in this.modules){
			// load all modules from storage
			// double eval for double string
			vu.debug("Try to load module="+i)
			try {
				this[i] = eval(vu.data.load(["modules",i],null));
			} catch(e0){
				vu.error("Ошибка в модуле "+i+"! Ошибка: "+e0);	
			}
			if (! this[i]){
				vu.error("Ошибка целостности! Модуль "+i+" не был установлен либо возникла ошибка установки!");
				return;	
			}
			
			// loop through settings
			// and load saved settings (or default)
			for (var j in this[i].settings){
				this[i].settings[j].value = vu.data.load(["modules",i,j], this[i].settings[j].value);
			}
			vu.debug("Settings loaded for module="+i);		
			// if module is on, then init
			if (this.modules[i]){
				try {
					this[i].init();
					vu.debug("Module loading result=OK");
				} catch(e){
					vu.error(e);
					vu.debug("Module loading result=ERROR");
				}
			}
		}
		this.console.init();
		console.log(vu.config);
	}
	
}