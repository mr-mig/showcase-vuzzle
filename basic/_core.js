{
	/**
	 * Namespace for localStorage key identification
	 * 
	 * @type {String}
	 * @browser O,C
	 */
	NAMESPACE : "vuzzle.",
	version : "0.2",
	lang : "ru",
	_alertWnd : null,		
	_compareVersion : function(v1, v2){
		try{
			v1 ? v1 : "0.0";
			v2 ? v2 : "0.0";
			v1 = v1.split(".");
			if (v1[2]){
				v1 = v1[0]*10000 + v1[1]*100 + v1[2]*1;
			} else {
				v1 = v1[0]*10000 + v1[1]*100;
			}
			v2 = v2.split(".");
			if (v2[2]){
				v2 = v2[0]*10000 + v2[1]*100 + v2[2]*1;
			} else {
				v2 = v2[0]*10000 + v2[1]*100;
			}
			return v1 > v2;
		} catch(e){
			vu.error(e);
		}
	},
	_instantiate : function(){
		vu.config = vu.data.load("basic.config",vu.config);
		var currBasic = null;
		for (var i in vu.config.basics){
			var name = vu.config.basics[i];
			currBasic = vu.data.load(["basic",name],vu[name]);
			
			//if basic in storage is freshier than vu basic 
			if (vu._core._compareVersion(currBasic.version, vu[name].version)){
				vu[name] = currBasic;
				vu.debug("basic name="+name+" loaded. Version: "+vu[name].version);
			}
		}
		vu._core.lang = vu.data.load("selectedLang",vu._core.lang);
		vu["lang"] = vu.data.load("basic.lang", vu.lang);
	},
	_resetLog : function(){
		vu.data.save("log0",vu.data.load("log",""));
		vu.data.remove("log");
	},
	
	_throwError : function(msg){
		throw new Error("Vuzzle lib error : "+msg); 
	},
	
	_error : function(msg){
		vu._core._log(msg, "vu-error");
	},
	_debug : function(msg){
		if (DEBUG){
			vu._core._log(msg, "vu-debug");
		}
	},
	_alert : function(msg,param){
		if (!vu._alertWnd){
			param ? param.msg = msg : param = msg;
			vu._alertWnd = new vu.ui.Alert(param);	
		} else {
			vu._alertWnd.forceShow(msg);
		}
	},
		
	_dumpLog : function(msg){
		var obj;
		try{
			obj = vu.data.load("log","");
			vu.data.save("log",obj+"<br />" + msg);
		}catch(e){}
	},
	
	_log : function(msg, class){
		if(vu.platform.console){
			class = class ? class : "";
			console.log("VUZZLE "+class.toUpperCase()+": " + msg);
			vu.platform.console.log(msg, class);
		} else {
			console.log("VUZZLE NC: " + msg);	
		}
		vu._core._dumpLog(msg);
	},
	_getLang : function(){
		return vu._core.lang;
	},
	
	xhr : {
		handleXhrError : function(x,r,e,onFail){
			vu._core.log("xhr error "+r+" caused by "+e);
			if (onFail && typeof(onFail) === "function"){
				onFail();
			}
		},
		
		prepareUrl : function(url){
			var seed = Math.floor(Math.random()*1000);
			url = /\?/.test(url) ? url + "&" + seed : url + "?" + seed;
			if (DEV){url = url.replace("svn/release","svn/devflow");}
			return url;
		},
		
		/*
		 * apiGet : function(url, onDone){ url = url +
		 * "&callback=vu.xhr.xdrCallback"; this.get(url,onDone); },
		 */
		
		/**
		 * Handles GET request and response.
		 * 
		 */
		xget : function(url, onDone){
			vu.debug(" req url: "+url);
			url = this.prepareUrl(url);
			if ($.browser.opera){
				this.scriptTransport(url, onDone);
			} else if($.browser.webkit) {
				this.xhrTransport(url, onDone);
			} else if ($.browser.mozilla){
				this.GMTransport(url,onDone);
			}
		},
		
		/**
		 * Make GET request via <script> transport.
		 * 
		 */
		scriptTransport : function(url, onDone){
			var t = document.createElement("script");
			t.src = url;
			t._callback = onDone;
			document.body.appendChild(t);
		},
		
		// transport should be moved to background.html of the chrome
		// extension
		xhrTransport : function(url, onDone){
			chrome.extension.sendRequest({'action' : 'vuget', 'url':url}, onDone);
		},
		/**
		 * Make GET request via GM_xmlhttpRequest.
		 * 
		 */
		GMTransport : function(url, onDone){
			setTimeout(function(){GM_xmlhttpRequest({
				method : "GET",
				url : url,
				onload : function(x) {
					var o = x.responseText;
					if (onDone) {
						onDone(o);
					}
				}
			});},0);
		
		}
	},
	autoupdate : {
		beforeCriticalUpdate : function(){
			for (var i in vu.config.basics){
				vu.data.remove("basic."+vu.config.basics[i]);	
			}
			vu.data.remove("basic.config");
		}	
	},
	
	ui : {
		
			/**
		 * Base class for window-based UI elements. Abstract methods:
		 * this.onClose this.onOpen this.init
		 * 
		 * @type {Object}
		 * @param {String}
		 *            param.lable lable to be shown in window header
		 * @param {String}
		 *            param.idString unique window identifier
		 * @param {Number}
		 *            param.minHeight window minimal height
		 * @param {Number}
		 *            param.minWidth window minimal width
		 */
		AbstractWindow : function(param){
			if (!param || !param.element){
				return;
			}
			if (param.lable != vu.lang.console_lable && !param.idString){
				console.log(param);
				return;
			}
			param = $.extend({
				registerWindow : true,
				minWidth : parseInt(param.element.css('minWidth')) || 50,
				minHeight: parseInt(param.element.css('minHeight')) || 24,
				lable : "",
				idString : "default",
				closeMethod : "hide"
			},param);
			
			var id = vu.constants.DIALOG_ID;
			this._param = param;
			if (param.registerWindow){
				var wm = vu._core.ui.windowManager;
				id = wm.push(this);
			}
			var _t = this;
			
			this.lable = param.lable;
			this.idString = param.idString;
			this.created = false;
				
			this.getId = function(){
				return param.idString + id;
			};
			
			this.close = function(){
				if (param.closeMethod != "hide"){
					this.created = false;
					_t.$wrap.parent().fadeOut(_t.$wrap.parent().remove);
				} else {
					_t.$wrap.parent().fadeOut();
				}
				if (typeof _t.onClose === 'function'){
					_t.onClose();	
				}
			};
				
			this.open = function(){
				if (_t.created){
					_t.$wrap.parent().fadeIn();
				} else {
					_t.init();
				}
				if (typeof _t.onOpen === 'function'){
					_t.onOpen();	
				}
			};
			
			this.show = this.open;
			
			this.createWindow = function(left, top, width, height){
				this.$wrap = $("<div class='vu-window'></div>").appendTo($body).css({
					border : '1px solid',
					position : 'fixed',
					left : left,
					top : top
				});
				this.$header = $("<div class='vu-window-header'></div>").css({
					overflowX : 'hidden',
					overflowY: 'hidden'
				});
				this.$lable = $("<div class='vu-window-header-lable'></div>").appendTo(this.$header).css("margin", "0 auto").html(param.lable);
				this.$btns = $("<div class='vu-window-header-btns'></div>").appendTo(this.$header).hide();
				
				this.$wrap.append(this.$header);$
				
				var $close = new vu.ui.Button({width: 16, height:16}).css({position: 'relative', top: 1, float: 'right'}).addClass("vu-window-close").appendTo(this.$btns).html("X").attr("title",vu.lang.close_btn);
			
				$close.click(this.close);
			
				this.$content = $("<div class='vu-window-content'></div>").css({
					"overflow-y": 'auto',
					height: height - this.$header.height() - 10
				}).append(param.element);
				
				this.$wrap.append(this.$content);
				this.$res = new vu.ui.Resizable({
					element: this.$wrap,
					height : height,
					width: width,
					minWidth : param.minWidth,
					minHeight : param.minHeight,
					onResize: _t.updateSize
				});
			
				this.$res.css({display: closed ? "none" : "block"});
				
				var h = this.$header;
				new vu.ui.Draggable({
					element: this.$res,
					handler: h,
					onStop: _t.savePosition,
					bound : {left:-6,top:-6,bottom: -9,right: -11}
				});
				var setCursor = function(){
					h.css('cursor','move');
				};
				
				var resetCursor = function(){
					h.css('cursor','default');
				};	
				h.mousedown(setCursor);
				h.mouseup(resetCursor);
				$window.mouseup(resetCursor);
				this.created = true;
			};
		},
		
		AbstractDialog : function(param){
			if (param){
				param = $.extend({
					idString : "cdlg" 
				},param);
				param.element = $("<div class='vu-dialog-body'></div>");
				param.element.appendTo($body);
				param.registerWindow = false;
			
				vu._core.ui.AbstractWindow.call(this,param);
				param = $.extend(param, this._param);
				this.prototype = new vu._core.ui.AbstractWindow();
				this.constructor = vu._core.ui.AbstractDialog;
				var _t= this;
				
				this.$msgContent = param.element;
				
				this.updateSize = function(){
					_t.$content.css('height',_t.$wrap.height() - _t.$header.height() - 10 - _t.$footer.height());
				};
				
				if (param){
					this.createWindow(($window.width() - param.width)/2, ($window.height() - param.height)/2, param.width, param.height);
					this.$footer = $("<div class='vu-window-footer'>");
					this.$content.removeClass("vu-window-content");
					this.$content.addClass("vu-window-content-with-footer");
					this.$footer.css({
						height: 30
					});
					
					this.$wrap.append(this.$footer);
					this.$content.css("height",this.$content.height() - 30);
					
					this.addButton = function($button){
						_t.$footer.append($button);
						$button.css("float","right");
					};
				}
				this.$wrap.parent().css("z-index","10001");
			} else {
				return;	
			}
		},
			
		Console : function(param){
			param = $.extend({
				lable : vu.lang.console_lable
			}, param);
			
			vu.ui.Window.call(this,param);
			this.prototype = new vu.ui.Window();
			this.constructor = vu._core.ui.Console;
			var _t= this;
			
			if (param){
				this.$input = $("<textarea title='Ctrl + Enter'></textarea>");
				this.$content.removeClass("vu-window-content");
				this.$content.addClass("vu-window-content-with-footer");
				this.$input.css({
					height: 14,
					width : "95%",
					marginTop : "5px",
					fontFamily : "Courier New",
					backgroundColor : "#eeeeee",
					fontSize: 11,
					border : "1px solid #dddddd"
				});
				
				this.$footer = $("<div class='vu-window-footer'>");
				this.$footer.css({
						height: 30,
						textAlign : "center"
					});
				this.$wrap.append(this.$footer);
				
				this.$footer.append(this.$input);
				this.$content.css("height",this.$content.height() - 30);
				
				this.updateSize = function(){
					_t.$content.css('height',_t.$wrap.height() - _t.$header.height() - 10 - _t.$footer.height());
				};
				
				this.$input.keydown(function(e){
					//Ctrl+Enter
					if (e.ctrlKey && e.keyCode == 13){
						try{
							var r = eval(_t.$input.val());
								_t.$input.css("border","1px solid #dddddd");
								vu._core._log("<< " + _t.$input.val(),'vu-code');
								_t.$input.val("");
							if (r){
								vu._core._log("Result>> " + r, 'vu-code');
							}
						} catch(e){
							vu._core._error(e);
							_t.$input.css("border","2px solid red");
						}
					}
					if (e.keyCode == 9){
						e.preventDefault();
						_t.$input.val(_t.$input.val() + "\t");
					}
				});
				
				this.$input.focus(function(){
					$(this).css({
						fontSize: 11,
						color : '#000000',
						backgroundColor : "#f8f8f8"
					});
				});
				this.$input.blur(function(){
					$(this).css({
						fontSize: 9,
						color : '#aaaaaa',
						backgroundColor : "#eeeeee"
					});
				});
				
			} else {
				return;	
			}						
			return this;
		},
		
		/**
		 * Blackout layer class. Exposed through vu.ui.blackout
		 * 
		 * @see vu.ui.blackout
		 * @type {Object}
		 * 
		 */
			
		Blackout : function(){
			var $el = $("<div id='vu-blackout'></div>").css({
				display: "none",
				height: $(document).height(),
				width: "100%",
				top: 0,
				position: "fixed"
			});
			$body.append($el);
			
			/**
			 * Shows the blackout layer.
			 * 
			 * @method
			 */
			this.show = function(){		
				$el.show();
			};
			
			/**
			 * Hides the blackout layer.
			 * 
			 * @method
			 */
			this.hide =  function(){
				$el.hide();
			};
			
			/**
			 * Toggles the blackout layer.
			 * 
			 * @method
			 */
			this.toggle = function(){
				$el.toggle();
			}
		},
		
		/**
		 * Toolbar class. Exposed through vu.ui.toolbar
		 * 
		 * @see vu.ui.toolbar
		 * @type {Object}
		 * @param {Integer}
		 *            param.height - toolbar height (px)
		 * @default 30
		 * 
		 * @param {Integer}
		 *            param.width - toolbar width (px).
		 * @default 600
		 */
		Toolbar : function(param){
			var _t = this;
			$mainButton = null;
			$settButton = null;
			
			var hidden = vu.data.load("vu.ui.toolbar.hidden",false);
			
			// array of jQuery objects
			var buttons = null;
			
			var $tbody, $tbodyWrap = null;
			
			param = $.extend({
				height: 30,
				width: 300
			},param);
			
			/**
			 * Hides the toolbar
			 * 
			 * @method
			 */
			this.hide = function(){
				vu.data.save("vu.ui.toolbar.hidden",true);
				$tbodyWrap.animate({
					top:$window.height()
				}, "fast", function(){
					$mainButton.css({
						lineHeight: "1em",
						fontSize: "8pt",
						top: -12
					});
				});
				
				$mainButton.unbind("click");
				$mainButton.click(_t.show);
			};
			
			/**
			 * Shows the toolbar
			 * 
			 * @method
			 */
			this.show = function(){
				vu.data.save("vu.ui.toolbar.hidden",false);
				$tbodyWrap.animate({
					top: ($window.height()-param.height)
				}, "fast");
				$mainButton.css({
					lineHeight: param.height+5+"px",
					fontSize: "12pt",
					top: -5
				});
				$mainButton.unbind("click");
				$mainButton.click(_t.hide);
			};
			
			var settOpened = false;
			
			this.openSett = function(){
				vu.ui.blackout.show();
				if (!vu.settings.ui.cont){
					vu.settings.ui.createList();
				} else {
					vu.settings.ui.showSettings();
				}
				settOpened = true;
			};
			
			this.closeSett = function(){
				vu.ui.blackout.hide();
				vu.settings.ui.hideSettings();
				settOpened = false;
			};
			
			this.toggleSett = function(){
				if (settOpened){
					_t.closeSett();	
				} else {
					_t.openSett();	
				}
			};
			
			this.addButton = function($vuButton){
				$vuButton.css({
					position: "relative",
					float : "left"
				});
				$btnHolder.append($vuButton);
				$tbody.width($tbody.width() + $vuButton.width());
			};
			
			this.savePosition = function(){
				vu.data.save(["toolbar","x"], $tbodyWrap.offset().left);
				vu.data.save(["toolbar","y"], $tbodyWrap.offset().top - $window.scrollTop());
			};

			var _createToolbar = function(){
				$tbodyWrap = $("<div id='toolbarWrap'></div>").css({
					position: "fixed",
					height: param.height,
					minWidth: param.width,
					top : hidden ? $window.height() : $window.height()-param.height,
					left : vu.data.load(["toolbar","x"],($window.width()-param.width)/2)
				});
				$tbody = $("<div class='vu-toolbar-body'></div>").css({
					height: param.height,
					minWidth: param.width,
					left : vu.data.load(["toolbar","x"],($window.width()-param.width)/2)
				});
				$body.append($tbodyWrap);
				$tbodyWrap.append($tbody);
				
				$window.resize(function(){
					$tbodyWrap.css({top : hidden ? $window.height() : $window.height()-param.height});
				});
				
				$mainButton = $("<div class='vu-toolbar-mbtn'></div>").css({
					height: param.height+5,
					top: hidden ? -12 : -5,
					left: 5,
					lineHeight: hidden ? "1em" : param.height+5+"px",
					fontSize: hidden ? "8pt":"12pt"
				});
				$tbody.append($mainButton);
				
				$btnHolder = $("<div></div>");
				$btnHolder.css({
					position: "relative",
					display: "inline-block",
					minWidth : 100,
					maxWidth : $tbody.width() - $mainButton.position().left - $mainButton.width() - (param.height -6),
					left: 10
				});
				$btnHolder.appendTo($tbody);
					
				new vu.ui.Draggable({
					element: $tbodyWrap,
					handler : $tbody,
					bound: {
						top: function(){return $window.height() - $tbodyWrap.height()},
						bottom: 0, 
						left: 0,
						right: 0
						},
					onStop : _t.savePosition	
					});
				
				
				
				$mainButton.html("Vuzzle");
				hidden ? $mainButton.click(_t.show) : $mainButton.click(_t.hide);
				// remove text selection
				$mainButton.mousedown(function(){return false;});
				
				$settButton = $("<div title='Настройки' class='vu-toolbar-btn'><span></span></div>").css({
					height : param.height - 6,
					width : param.height - 6,
					lineHeight : param.height - 6 + "px",
					right: 1,
					display : 'inline-block',
					float : "right",
					position: "relative"
				});
				
				$settButtonImage = $("<img></img>").attr("src",vu.resources.images.toolIcon).css({
					height: param.height - 6,
					width: param.height - 6
				});
				$tbody.append($settButton);
				$settButton.find("span").append($settButtonImage);
				$settButton.click(_t.toggleSett);
				$settButton.mousedown(function(){$settButton.addClass('down');});
				$settButton.mouseup(function(){$settButton.removeClass('down');});
				
				var $wnds = vu.ui.Button({
					title: vu.lang.windows_btn_title,
					src : vu.resources.images.windowCascade});
				_t.addButton($wnds);
							
				$wnds.click(function(){vu.ui.uiWindowManager.toggle();});
			};
			_createToolbar();
		},
		
		UIWindowManager : function(){
			var _t = this;
			var created = false;
			var wndsOpened = false;
				
			this.toggle = function(){
				if (!wndsOpened){
					_t.open();
					wndsOpened = true;
				} else {
					_t.close();
					wndsOpened = false;
				}
			};
				
			var $cont = $("<div class='vu-win-manager-body'></div>").css({
				width: 100,
				display: 'block',
				position: 'absolute',
				left : 90,
				top: 30,
				maxHeight: 157,
				overflowY : "auto"
			});
			
			var $header = $("<div class='vu-win-manager-header'></div>");
			$header.html("Окна");
			$header.appendTo($cont);
			$header.click(function(){_t.toggle();});
			
			var $holder = $("<div></div>");
			$holder.appendTo($cont);
			
			this.open = function(){
				if (created){
					var arr = [];
					var list = vu._core.ui.windowManager.getList();
					for (var i in list){
						arr.push("<div class='vu-win-manager-pad hand' id='win_"+list[i].getId()+"'>");
						list[i].closed ? arr.push("<span>") : arr.push("<span class='opened'>");
						arr.push(list[i].lable);
						arr.push("</span>");
						arr.push("</div>");
					}
					$holder.html(arr.join(""));
					$cont.stop().animate({top:vu._core.ui.windowManager.getList().length <= 5 ? -17 - vu._core.ui.windowManager.getList().length*28 : -157},400);
				} else {
					create();	
					this.open();
				}
			};
			
			this.close = function(){
				$cont.stop().animate({top:30},400);
			};
			
			var create = function(){				
				$(".vu-toolbar-body").before($cont);
				created = true;
				$(".vu-win-manager-pad").live("click",function(){
					if(this.id.substr(0,4)=== "win_"){
						vu._core.ui.windowManager.get(this.id.substr(4)).open();
					}
					
				});
			};
		},
		
		/**
		 * Single layer class.
		 * 
		 * @type {JQuery}
		 * @param {Boolean}
		 *            param.centered Shall the layer be centered
		 * @default false
		 * 
		 * @param {HTMLElement}
		 *            param.parent Parent node.
		 * @default $body (GLOBAL)
		 * 
		 * @param {Boolean}
		 *            param.fixed Shall the layer be fixed
		 * @default false
		 * 
		 * @param {Boolean}
		 *            param.transparent Shall the layer be transparent
		 * @default false
		 */
		Layer: function(param){
			param = $.extend({
				centered: false,
				parent: $body,
				fixed : false,
				transparent: false
			},param);
			var $cont = $("<div class='vu-layer'></div>");
			if (param.transparent){
				$cont.addClass("trans");
			}
			
				$cont.css({
					height: param.height ? param.height : '',
					width: param.width ? param.width : '',
					position: param.fixed ? "fixed" : "relative"
				});
				var $sel = null;
					if(param.parent == $body){
						$sel = $window;
					} else {
						$sel = param.parent;	
					}
					
				param.parent.append($cont);
				if (param.centered){		
					$cont.css({
							top: ($sel.height() - $cont.height() - 20*2)/2,
							left: ($sel.width() - $cont.width() - 20*2)/2
						});
				}
			
			
			return $cont;			
		},
		/**
		 * Layer with semitransparent background layer. First layer is
		 * transparent by default
		 * 
		 * @type {Object}
		 * @param {Object}
		 *            Layer1param Layer class parameter object for the 1st layer
		 * 
		 * @param {Object}
		 *            Layer2param Layer class parameter object for the 2nd layer
		 */
		BiLayer : function(Layer1param, Layer2param){
			if (!Layer2param){
				Layer2param = Layer1param;	
			}
			var param = $.extend(Layer1param, {transparent: true})
			var $holder = $("<div>");
			$holder.appendTo($body);
			this.$layer0 = new vu._core.ui.Layer(param);
			this.$layer1 = new vu._core.ui.Layer(Layer2param);
			
			this.$layer0.appendTo($holder);
			this.$layer1.appendTo($holder);
			
			this.show = function (){
				$holder.show();
			};
			this.hide= function (){
				$holder.hide();
			};
			this.toggle = function (){
				$holder.toggle();
			};
			
		},
		ModuleHolderLayer : function(param){
			param.module = $.extend({name:"Неизвестный модуль",author: "Неизвестный автор", description : "Нет описания"}, param.module);
			
			var installed = typeof vu.platform.modules[param.module.name]!== 'undefined';
			var isOn = vu.platform.modules[param.module.name] == 1;
			
			var $appender = vu.settings.ui.cont.$layer1.find("#module-cont");
			var layer = new vu._core.ui.Layer({parent: $appender}).css({margin : '0 auto;', minHeight: '60px'});
			if (!isOn){
				layer.addClass("hover");
			}
			var $cont = $("<div></div>");
			
			var $sett, $install, $delete;
			
			var $header = $("<div title='Модуль не установлен' class='vu-sett-module-header round'>"+param.module.title+"</div>").appendTo($cont);
			
			if (installed){
				$header.attr("title","Версия: "+vu.platform[param.module.name].version);	
			}
			
			$("<div style='display: inline-block; float:left; margin:5px; 10px; min-width:10%; height: 50px; line-height: 50px;'>Автор: "+param.module.author+"</div><div style='display: inline-block; margin: 5px 5px 5px 2%; width:30%; float:left;'><div style='line-height: 14px; word-wrap: break-word; overflow-y: auto; overflow-x: none; height: 50px; display: table-cell; vertical-align:middle; text-align: justify;'>"+param.module.description+"</div></div><div id='btnHolder'></div><div id='scrHolder'></div><div style='clear:both;'></div>").appendTo($cont);
			layer.append($cont);
			
			var $btnH = $cont.find("#btnHolder");
					
			var createInstallBtn = function(){
				$install = new vu.ui.Button({
					width: 120,
					value: '<b>Установить</b>' 
				}).css({
					marginLeft: 'auto',
					top : 13,
					left: -10
				}).click(install);
				$install.appendTo($btnH);
			};
			
			var createDeleteBtn = function(){
				$delete = new vu.ui.Button({
					width: 120,
					value: 'Удалить'
				}).css({
					marginLeft: 'auto',
					top : 13,
					left: -10
				}).click(remove);
				$delete.appendTo($btnH);
			};
			
			var createSettBtn = function(){
				$sett = new vu.ui.Button(vu.resources.images.toolIcon);
				$sett.css({
					left: 120,
					top: 13,
					position: "absolute"
					}).click(function(){
						vu._core.settings.openSettingsCont();
						vu._core.settings.createSettings(vu.platform[param.module.name]);
						});
				$btnH.append($sett);
			};
			
			if (installed){
				createDeleteBtn();
				createSettBtn();
			} else {
				createInstallBtn();	
			}
					
			var install = function(){
				$install.remove(); 
					var $loader = $('<div class="loader"/>').css({
						position: 'absolute',
						left: 180,
						top: 10
					});
					$btnH.append($loader);
// $t.css({
// background : "url(\""+vu.resources.images.loading+"\") no-repeat 50px 0"
// });
				vu.platform.instalModule(param.module.url,function(){
					$loader.remove();
					layer.removeClass('hover');
					createDeleteBtn();
					createSettBtn();
				});	
			};
			
			var remove = function(){
				$delete.remove();
				$sett.remove();
// $(this).css({
// background : "none"
// });
				console.log(param.module.name)
				vu.data.remove(param.module.name);
				try {
					vu.platform.modules[param.module.name].onUninstall();
				} catch(e){
				}
				delete vu.platform.modules[param.module.name];
				vu.data.save("modules", vu.platform.modules);
				layer.addClass("hover");
				createInstallBtn();
			};
			
			if($install){
				$install.click(install);
				$btnH.append($install);
			}
			if($delete){
				$delete.click(remove);
				$btnH.append($delete);
			}
			
			return layer;
		},
		
		
		/**
		 * Singleton Window manager class.
		 * 
		 * @type {Object}
		 */
		windowManager : new function(){
			var windows = [];
			
			this.get = function(id){
				id = /\d+$/.exec(id).toString();
				return windows[id] ? windows[id] : null;
			};
			
			this.put= function(id, obj) {
				window[id] = obj;
			};
			
			this.push = function(obj){
				if (windows.length){
					for (var i = windows.length - 1; i>=0; i--){
						if (!windows[i]){
							windows[i] = obj;
							return i;
						}
					}
				}
				windows.push(obj);
				return windows.length - 1;
			};
			
			this.getList = function(){
				return windows;	
			};
		},
		
		roundCorners : function(radius){
			var s = "border-radius: {1}; -moz-border-radius: {1};";
			if (typeof radius === 'number'){
				return s.replace(/\{1\}/g,radius+"px");
			} else if(typeof radius === 'string'){
				return s.replace(/\{1\}/g,radius);
			}
		},
		bgUrl : function(uri){
			return "background: url(\""+uri+"\")";
		},
		bg: function(name){
			switch (name){
				case 'panel' : return this.bgUrl(vu.resources.images.controlBg) + " repeat-x top;";
				case 'btn' : return this.bgUrl(vu.resources.images.btnBg) + " repeat-x top #dddddd;";
				case 'btnHover' : return this.bgUrl(vu.resources.images.btnBg) + " repeat-x 0 -6px #dddddd;";
				case 'btnDown' : return " background: none repeat-x 0 -6px #dddddd;";
				case 'orange' :  return this.bgUrl(vu.resources.images.slashBgOrange) + "repeat-x 0;";
				case 'glass' : return this.bgUrl(vu.resources.images.glassBgBlue) + "repeat-x 0;";
				case 'wave' : return this.bgUrl(vu.resources.images.waveBgBlue) + "repeat-x 0;";
				default: return "none;";
			}
		},
		absPos : function(top, left){
			if (top && left){
				return "position: absolute; top:"+top+"px; left: "+left+"px;";
			} else {
				return "position: absolute; top:0; left:0;";
			}
		},
		fixedPos : function(top, left){
			if (top && left){
				return "position: fixed; top:"+top+"px; left: "+left+"px;";
			} else {
				return "position: fixed; top:0; left:0;";
			}
		},
		baseStyle : "font-family: verdana; font-size: 11px; color: #333333;",
		applyStyles : function(){
			var style = "#vu-blackout{" +
					"background: black;" +
					"opacity: 0.7;" +
					"z-index: 1000;}" +
					"							" +
					"#toolbarWrap{" +
					"opacity: 0.4;" +
					"z-index:9996;" +
					"}"+
					"#toolbarWrap:hover{" +
						"opacity: 1;" +
					"}"+
					".vu-toolbar-body{" +
					this.bg('panel')+
					this.roundCorners("8px 8px 0px 0px")+
					
					"border: 1px solid #999999;" +
					"z-index: 9999;" +
					"}" +
					"							" +
					".vu-toolbar-body:hover{" +
				
					"}" +
					" 							" +
					".vu-toolbar-mbtn{" +
					"width: 80px;" +
					this.bgUrl(vu.resources.images.slashBgOrange)+";"+
					"color: white;" +
					"border: 1px solid #BBBBBB;" +
					"font-family: Verdana;" +
					"font-size: 12pt;" +
					"font-weight: bold;" +
					"position: relative;" +
					"cursor: pointer;" +
					"text-align: center;" +
					"z-index: 10000;" +
					"float:left;" +
					this.roundCorners("8px 8px 0px 0px")+
					"}" +
					"							" +
					".vu-button{" +
					"position: relative;" +
					"margin: 2px;" +
					"display: inline-block;" +
					this.baseStyle+
					"text-align: center;" +
					"cursor:pointer;" +
					this.roundCorners("4px 4px 4px 4px")+
					this.bg('btn')+
					"border: 1px solid #dddddd;"+
					"}" +
					"							" +
					".vu-button:hover{" +
					this.bg('btnHover')+
					"border: 1px solid #999999;" +
					"}" +
					"							" +
					".vu-button img{" +
					"vertical-align: middle;" +
					"}" +
					"							" +
					".vu-toolbar-btn{" +
					"margin: 2px;" +
					"text-align: center;" +
					"cursor: pointer;" +
					"border: 1px solid #dddddd;" +
					this.roundCorners("4px 4px 4px 4px")+
					"}" +
					"							" +
					".vu-toolbar-btn:hover{" +
					this.bg('btnHover')+
					"border: 1px solid #999999;" +
					"background-position: 0 -6px;" +
					"}" +
					"							" +
					".vu-layer{" +
					"color: black;" +
					"margin: 10px;" +
					"font-family: verdana;" +
					this.baseStyle+
					"background-color: #ffffff;" +
					this.fixedPos()+
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					"							" +
					".down, .down:hover{" +
					this.bg('btnDown') +
					"}" +
					"							" +
					".trans{" +
					"opacity: 0.6;" +
					"}" +
					"							" +
					".hover{" +
					"opacity: 0.7;" +
					"}" +
					"							"+
					".hover:hover{" +
					"opacity: 1;" +
					"}" +
					"							" +
					".border{" +
					"border: 1px solid #A6C9E2 !important;" +
					"}" +
					".round{" +
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					".active{" +
					"border: 2px solid #FFB841;" +
					"}" +
					"							" +
					".vu-header{" +
					this.baseStyle+
					this.bgUrl(vu.resources.images.glassBgBlue) + "50% 50%;"+
					"text-align: center;" +
					"color: white;" +
					"margin: 3px;" +
					"height: 28px;" +
					"line-height: 28px;" +
					"position: relative;" +
					"}" +
					"							" +
					".vu-content{" +
					"font-size: 10pt;" +
					"padding: 15px; " +
					"}" +
					".vu-sett-module-header{" +
					"display: inline-block;" +
					"float:left;" +
					"padding: 0 5px;" +
					"max-width: 200px; " +
					"min-height: 50px;" +
					"line-height: 50px;" +
					"margin: 5px;" +
					"min-width: 100px;" +
					"overflow: hidden; " +
					"white-space: nowrap; " +
					"text-align: center;" +
					"font-weight: bold;" +
					"font-size: 11pt;" +
					"color: white;" +
					this.bgUrl(vu.resources.images.slashBgOrange)+";"+
					"}" +
					"							" +
					".vu-sett-bar{" +
					"z-index: 1002;" +
					this.roundCorners("6px 6px 6px 6px")+
					this.bg('panel')+
					"height: 30px;" +
					"}" +
					"#btnHolder{" +
					"min-width: 150px; " +
					"display: inline-block; " +
					"float:right; " +
					"position: relative; " +
					"height: 50px; " +
					"margin: 5px;" +
					"}" +
					"							" +
					"#scrHolder{" +
					"width: 150px; " +
					"display: inline-block; " +
					"float:left; " +
					"position: relative; " +
					"height: 50px; " +
					"margin: 5px;" +
					"overflow-x: auto;" +
					"overflow-y: hidden;" +
					"}" +
					"							" +
					".loader{" +
					"height: 31px;" +
					"width: 31px;" +
					this.bgUrl(vu.resources.images.loading)+
					"}" +
					"							" +
					"#sett-cont{" +
					" height: 100%;" +
					"}" +
					"							" +
					"#sett-cont-body{" +
					"height: 80%;" +
					"width: 500px;" +
					this.roundCorners("8px 8px 8px 8px")+
					"background: white;" +
					"margin: 0 auto;" +
					"overflow: auto;" +
					"}" +
					"							" +
					"#sett-cont-body table{" +
					"border-collapse: collapse;" +
					"width: 100%;" +			
					"}" +
					"							" +
					"#sett-cont-body table tr:hover{" +
					"background: #FAFAFA;" +
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					"							" +
					"#sett-cont-body input{" +
					this.baseStyle +
					"width: 70px;" +
					"text-align: center;" +
					"padding: 0px;" +
					"margin: 2px 5px;" +
					"float: right;" +
					"border: 1px solid #DDDDDD;" +
					this.roundCorners("3px 3px 3px 3px")+
					"}" +
					"#sett-cont-btns{" +
					"position: relative;" +
					"margin: 10px auto;" +
					"width: 500px;" +
					"}" +
					"#sett-cont-msg{" +
					"margin : 10px auto;" +
					"padding: 5px;" +
					"width: 400px;" +
					"text-align: center;" +
					"display: none;" +
					"background-color: #dedede;" +
					"color: #333333;" +
					this.roundCorners("8px 8px 8px 8px")+
					"}"+
					"							" +
					".vu-res-handler{" +
					"float:left;" +
					"opacity: 0.3;" +
					"background: #dddddd;" +
					"}" +
					".nw{" +
					this.roundCorners("16px 0px 0px 0px") +
					"}" +
					".ne{" +
					this.roundCorners("0px 16px 0px 0px")+
					"}" +
					".sw{" +
					this.roundCorners("0px 0px 0px 16px")+
					"}" +
					".se{" +
					this.roundCorners("0px 0px 16px 0px")+
					"}" +
					".vu-window-header{" +
					"							" +
					this.bg("panel") +
					"height: 24px;" +
					"line-height: 24px;" +
					this.roundCorners("8px 8px 0px 0px")+
					"}" +
					"" +
					"							" +
					".vu-window{" +
					"z-index: 900;" +
					"border-color:#dddddd!important;" +
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					"" +
					".vu-window-header-lable{" +
					" color: #aaaaaa;" +
					" text-align: center;" +
					"}" +
					".vu-window-close{" +
					"color: red;" +
					this.roundCorners("10px 10px 10px 10px")+
					"}" +
					".vu-window-content{" +
					this.roundCorners("0px 0px 8px 8px")+
					"overflow-y: auto;" +
					"overflow-x: hidden;" +
					"padding: 5px;" +
					"background: #ffffff;" +
					"}" +
					".vu-window-content-with-footer{" +
					this.roundCorners("0px 0px 0px 0px")+
					"overflow-y: auto;" +
					"overflow-x: hidden;" +
					"padding: 5px;" +
					"background: #ffffff;" +
					"}" +
					".vu-window-footer{" +
					this.roundCorners("0px 0px 8px 8px")+
					this.bg("panel")+
					"}" +
					".vu-dialog-body{" +
					"padding: 10px;" +
					"}" +
					".vu-vtext{" +
					"display: block;" +
					"right: -10px;" +
					"top: 20px;" +
					"position: relative;" +
					"-moz-transform: rotate(90deg);"+
  					"-webkit-transform: rotate(90deg);"+
  					"-o-transform: rotate(-90deg);" +
  					"}" +
  					".vu-error{" +
  					"color: #dd0000;" +
  					"}" +
  					".vu-debug{" +
  					"color: #0000dd;" +
  					"}" +
  					".vu-code{" +
  					"color: #666666;" +
  					"}"+
  					".vu-win-manager-body{" +
  					this.roundCorners("8px 8px 0px 0px")+
  					"background-color: #ffffff;" +
  					"color: #aaaaaa;" +
  					"border: 1px solid #cccccc;" +
  					"z-index: -1;" +
  					"}" +
  					".vu-win-manager-pad {" +
  					"height: 24px;"+
  					"text-align: center;" +
  					"width: 100%;" +
  					"margin: 2px 0px;" +
  					"line-height: 24px;"+
  					"border-top: 1px solid #cccccc;"+
  					"border-bottom: 1px solid #cccccc;"+
  					this.bg("panel") + 
  					"}" +
  					".vu-win-manager-pad img{" +
  					"margin: 2px 15px 7px 5px;" +
  					"vertical-align: middle;" +
  					"}" +
  					".vu-win-manager-pad .opened{" +
  					"color: #333333;" +
  					"}" +
  					".vu-win-manager-pad:hover{" +
  					" color: #333333;" +
  					"}" +
  					".hand{" +
  					"cursor: pointer;" +
  					"}" +
  					".vu-win-manager-header{" +
  					this.roundCorners("6px 6px 0px 0px")+
  					"border-bottom: 1px dashed #aaaaaa;"+
  					this.bg("orange")+
  					"height: 14px;" +
					"line-height: 14px;" +
					"cursor: pointer;" +
					"color: #ffffff;" +
					"font-weight: bold;" +
					"text-align: center;" +
  					"}" +
  					".vu-add-module-area{" +
  					"height:100%;" +
  					"width:100%;" +
  					"padding: 0px;" +
  					"font-size: 11pt;" +
  					"font-family: Courier New;" +
  					"}";
			vu.ui.addStyle(style);
		}
	},
	settings : {
		currentModule : null,
		onCreateList : function(){
			var mod = vu.platform.availableModules;
			for (var m in vu.platform.modules){
				var flag = true;
				for (var j in mod){
					if (m == mod[j].name){
						flag = false;
						break;
					}
				}
				
				if (flag){
					mod.push(vu.platform[m]);	
				}
			}
			var l;
			vu.ui.toploader.hide();	
			vu.settings.ui.cont.$layer1.append("<div id='module-cont' style='margin: 0 auto;'></div><div id='sett-cont' style='display:none;'><div id='sett-cont-body'><table colspan='0' border='0'></table></div><div id='sett-cont-msg'></div><div id='sett-cont-btns'></div></div>");
			vu.settings.ui.moduleCont = $("#module-cont");
			vu.settings.ui.settingsCont = $("#sett-cont");
			var $okBtn = new vu.ui.Button({
				width:100,
				value : 'Сохранить',
				rel : true
			}).css({
				fontWeight: 'bold',
				left: 140
			}).click(vu._core.settings.apply);
			
			var $closeBtn = new vu.ui.Button({
				width: 100,
				value : 'Закрыть',
				rel: true
			}).css({
					left: 140
				}).click(vu._core.settings.closeSettingsCont);
			vu.settings.ui.settingsCont.find("#sett-cont-btns").append($okBtn).append($closeBtn);
			for(var i =0, length = mod.length; i<length; i++){
				l = new vu._core.ui.ModuleHolderLayer({module:mod[i]});
			}
		},
		closeSettingsCont : function(){
			vu.settings.ui.settingsCont.hide();	
			vu.settings.ui.moduleCont.show();
		},
		openSettingsCont : function(){
			vu.settings.ui.settingsCont.show();	
			vu.settings.ui.moduleCont.hide();
		},
		
		// TODO: add parsing for all types
		parseSettings : function(){
			for (var j = 0; j < vu.validator.types.length; j++){
				var $el = vu.settings.ui.settingsCont.find("input[stype="+vu.validator.types[j]+"]");
				for (var i = $el.length; i--;){
					var value = $el.eq(i).val();
					var name = $el.eq(i).attr("name");
					vu.data.save(["modules",vu._core.settings.currentModule.name,name],value);
					vu._core.settings.currentModule.settings[name].value = value;
					$el.eq(i).attr("old",value);
				}
			}
		},
		apply : function(){
			vu._core.settings.parseSettings();
			vu._core.settings.currentModule.onApplySettings();
			vu._core.settings.showMsg("Настройки сохранены");
		},
		showMsg : function(msg){
			var $msgCont = vu.settings.ui.settingsCont.find("#sett-cont-msg").html(msg);
			$msgCont.show();
			setTimeout(function(){vu.settings.ui.settingsCont.find("#sett-cont-msg").fadeOut()}, 2000);
		},
		createSettings : function(module){
			vu._core.settings.currentModule = module;
			var obj = module.settings;
			
			var $cont = vu.settings.ui.settingsCont.find("table");
			$cont.empty();
			var $row, $value, type, elementVal;
			for(var i in obj){
				$row = $('<tr></tr>');
				
				var $txt = $("<div>").html(obj[i].text).css({
					minWidth : 200,
					padding: 5
					});
				$row.append($txt);
				type = obj[i].type.split(":");
				// TODO: add types
				switch (type[0]){
					case "input" : $value = $("<input>").val(obj[i].value);
						$value.focus(function(){$(this).addClass("border")});
						$value.blur(function(){$(this).removeClass("border")});
						$value.attr("stype",type[1]).attr('name',i).attr("old",obj[i].value);
						$value.change(function(){
							if(vu.validator.validate(this.value,type[1],$(this).attr("old")) === false){
								this.value = vu.validator.value;
								vu._core.settings.showMsg(vu.validator.msg);
							}
						});
						break;
					default:$value = $("<div>").html(obj[i].value).css({
								minWidth : 80,
								padding: 5
							}).attr('name',i);
							break;
				};
				$row.append($value);
				$value.wrap("<td>");
				$value.wrap("<div>");
				
				$txt.wrap("<td>");
				$cont.append($row);
			}
		}
		
	}
	
}
	