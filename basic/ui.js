{
	version : "0.3",
	$body : $body,
	/**
	 * @type vu._core.ui.Toolbar
	 * @class vu._core.ui.Toolbar
	 */
	toolbar : null,
	blackout: null,
	toploader : null,
	
	/**
	 * Interface for draggable HTMLElement wrapper.
	 * 
	 * @type Object
	 * @param {jQuery}
	 *            element Element to wrap
	 * @param {Object}
	 *            param.bound Bounding rectangle object margins
	 * 
	 * @param {jQuery}
	 *            param.handle handling element
	 * @param {Funtion}
	 *            param.onStop stop event callback
	 * @param {Funtion}
	 *            param.onDrag drag event callback
	 */
	Draggable : function(param){
		if (!param.element) {
			return;
		}
		param = $.extend({
			bound: {left: 0, top: 0, bottom: 0, right: 0},
			handler : param.element,
			propagateEvent: false
		}, param);
		
		if (param.position){
			param.element.css("position", param.position);
		}
		
		var ox = 0;
		var oy = 0;

		var isDrag = false;
		var _t = this;
		
		var currentBound = {};
		
		var preventEvent=function(e){
			e.stopPropagation();
			e.preventDefault();
		};

		var startDrag = function(e) {
			preventEvent(e);
			isDrag = true;
			ox = e.pageX -$window.scrollLeft() ;
			oy = e.pageY -$window.scrollTop();
		};

		var stopDrag = function(e) {
			if (isDrag) {
				isDrag = false;
				if (typeof param.onStop === 'function'){
					param.onStop(ox,oy);	
				}
			}
		};
		
		var getCurrentBound = function(){
			currentBound = {};
				currentBound.left = typeof param.bound.left === 'function' ? param.bound.bottom() : param.bound.left;
				currentBound.right = typeof param.bound.right === 'function' ? param.bound.right() : $window.width() - param.bound.right;
				currentBound.top = typeof param.bound.top === 'function' ? param.bound.top() : param.bound.top;
				currentBound.bottom = typeof param.bound.bottom === 'function' ? param.bound.bottom() : $window.height() - param.bound.bottom;
		};
		
		var updatePos = function(px, py){
			
				var rect = {
					height : param.element.height(),
					width : param.element.width()
				};
				
				getCurrentBound();
				var t,l;

				l = px + param.element.offset().left -$window.scrollLeft();
				t = py + param.element.offset().top - $window.scrollTop();
				
				if (l < currentBound.left){
					l = currentBound.left;
				} else if (l + rect.width > currentBound.right){
					l = currentBound.right - rect.width;
				}
				if (t < currentBound.top){
					t = currentBound.top;	
				} else if(t + rect.height > currentBound.bottom){
					t = currentBound.bottom - rect.height;
				}
						
				param.element.css({
					left:l,
					top: t
				});	
		};
			
		var drag = function(e) {
			if (isDrag) {
				if (!param.propagateEvent){
					preventEvent(e);
				}
						
				var px = e.pageX -$window.scrollLeft() - ox;
				var py = e.pageY -$window.scrollTop() - oy;
				ox = e.pageX -$window.scrollLeft();
				oy = e.pageY -$window.scrollTop();	
				if (ox < currentBound.left) {
					ox = currentBound.left;
				} else if (ox > currentBound.right) {
					ox = currentBound.right;
				}
				if (oy < currentBound.top) {
					oy = currentBound.top;
				} else if (oy > currentBound.bottom) {
					oy = currentBound.bottom;
				}
				
				updatePos(px,py);
				if (typeof param.onDrag === 'function'){
					param.onDrag(px,py);	
				}
			}
		};
	
		getCurrentBound(); 

		param.handler.mousedown(startDrag);
		// param.handle.mouseup(stopDrag);
		/*
		 * param.handle.mouseover(function(){ console.log("over")
		 * 
		 * if (isDrag){ stopDrag(); } });
		 */
		$window.mousemove(drag);
		$window.mouseup(stopDrag);
		$window.resize(function(){updatePos(0,0)});
	},
	
	/**
	 * Resizable wrapper.
	 * 
	 * @param {JQuery}
	 *            param.element - element to wrap maxHeight... - maximum
	 *            height of wrapped element onResize
	 */
	 Resizable : function(param){
		param = $.extend({
			autoHide: true,
			minWidth : 50,
			minHeight : 30,
			borderWidth : 8,
			bound : {
				left : 0,
				top : 0,
				bottom: 0,
				right: 0
			}
		},param);
		
		if (typeof param.element === 'undefined'){
			return;	
		}
		
		param.height = param.height +2 + 2*param.borderWidth|| param.element.height() + 2*param.borderWidth;
		param.width = param.width +2 + 2*param.borderWidth|| param.element.width() + 2*param.borderWidth;
		
		param.minHeight += 2*param.borderWidth + 2;
		param.minWidth += 2*param.borderWidth + 2;		
		
	
		var $cont = $("<div></div>").css({
			width: param.width,
			height:param.height,
			position: 'fixed',
			left : param.element.position().left - $window.scrollLeft(),
			top : param.element.position().top - $window.scrollTop()
		});
		
		var $nw =  $("<div class='nw vu-res-handler'></div>").css({
			width: param.borderWidth,
			height:param.borderWidth,
			cursor: "nw-resize" 
		});
		var $n = $("<div class='n vu-res-handler'></div>").css({
			width: param.width - 2*param.borderWidth - 4,
			height:param.borderWidth,
			cursor: "n-resize"
		});
		var $ne = $("<div class='ne vu-res-handler'></div>").css({
			width: param.borderWidth,
			height:param.borderWidth,
			cursor : "ne-resize"
		});
		var $e = $("<div class='e vu-res-handler'></div>").css({
			height: param.height - 2*param.borderWidth -4,
			width:param.borderWidth,
			cursor : "e-resize"
		});
		var $se = $("<div class='se vu-res-handler'></div>").css({
			width: param.borderWidth,
			height:param.borderWidth,
			cursor: "se-resize"
		});
		var $s = $("<div class='s vu-res-handler'></div>").css({
			width: param.width - 2*param.borderWidth - 4,
			height:param.borderWidth,
			cursor: "s-resize"
		});
		var $sw = $("<div class='sw vu-res-handler'></div>").css({
			width: param.borderWidth,
			height:param.borderWidth,
			cursor: "sw-resize"
		});
		var $w = $("<div class='w vu-res-handler'></div>").css({
			height: param.height - 2*param.borderWidth - 4,
			width:param.borderWidth,
			cursor: "w-resize"
		});
		var $cbody = param.element.css({
			float : 'left',
			overflow : 'hidden',
			position: 'relative',
			margin: '-2px',
			top:0,
			left:0,
			width: param.width - 2*param.borderWidth - 2,
			height: param.height - 2*param.borderWidth - 2
		});
					
		var updatePosition = function(dx,dy, shiftX, shiftY){
			if (shiftX) {
				$cont.css('left',$cont.position().left - dx);
			}
			if (shiftY) {
				$cont.css('top',$cont.position().top - $window.scrollTop()- dy);
			}
			
			$cont.css('height', param.height);
			$cont.css('width', param.width);
			
			$n.css('width', param.width - 2*param.borderWidth - 4);
			$s.css('width', param.width- 2*param.borderWidth - 4);
			$e.css('height', param.height- 2*param.borderWidth - 4);
			$w.css('height', param.height- 2*param.borderWidth - 4);
			$cbody.css('height', param.height - 2*param.borderWidth - 2);
			$cbody.css('width', param.width - 2*param.borderWidth - 2);
			if (typeof param.onResize === 'function'){
				param.onResize();
			}
		};
		
		var moveXDirection = function(dx) {
			if (param.width + dx > param.minWidth) {
				param.width += dx;
			} else if (param.width != param.minWidth) {
				dx = param.minWidth - (param.width);
				param.width = param.minWidth;
			} else {
				dx = 0;
			}
			return dx;
		};
		
		var moveYDirection = function(dy) {

			if (param.height + dy > param.minHeight) {
				param.height += dy;
			} else if (param.height != param.minHeight) {
				dy = param.minHeight - (param.height);
				param.height = param.minHeight;
			} else {
				dy = 0;
			}
			return dy;
		};
		
		var check = function(dx,dy,top, right, bottom, left){
			if(left && $cont.position().left + dx< 0){
				$cont.css('left',0);
				return false;
			}
			if (right && $cont.width() + $cont.offset().left + dx - 4> $window.width()){
				return false;
			}
			
			if(top && $cont.position().top - $window.scrollTop() + dy< 0){
				$cont.css('top',0);
				return false;
			}
			if (bottom && $cont.height() + $cont.offset().top -$window.scrollTop()+ dy - 4> $window.height()){
				return false;
			}
			
			return true;
		};
		
		var nResize = function(dx,dy){
			if (check(dx,dy,true)){
				updatePosition(0,moveYDirection(-dy),false,true);
			}
		};
		
		var sResize = function(dx,dy){
			if (check(dx,dy,false,false,true)){
				updatePosition(0,moveYDirection(dy));
			}
		};
		
		var eResize = function(dx,dy){
			if (check(dx,dy,false, true)){
				updatePosition(moveXDirection(dx),0);
			}
		};
		
		var wResize = function(dx,dy){
			if(check(dx,dy,false,false,false,true)){
				updatePosition(moveXDirection(-dx),0, true, false);
			}
		};
		
		var nwResize = function(dx,dy){
			if(check(dx,dy,true, false,false,true)){
				updatePosition(moveXDirection(-dx),moveYDirection(-dy), true, true);
			}
		};
		
		var neResize = function(dx,dy){
			if(check(dx,dy,true, true,false,false)){
				updatePosition(moveXDirection(dx),moveYDirection(-dy), false, true);
			}
		};
		
		var seResize = function(dx,dy){
			if(check(dx,dy,false,true,true,false)){
				updatePosition(moveXDirection(dx),moveYDirection(dy));
			}	
		};
		
		var swResize = function(dx,dy){
			if(check(dx,dy,false,false,true,true)){
				updatePosition(moveXDirection(-dx),moveYDirection(dy), true, false);
			}
		};
		
		new vu.ui.Draggable({element: $nw, onDrag: nwResize});
		new vu.ui.Draggable({element: $n, onDrag: nResize});
		new vu.ui.Draggable({element: $ne, onDrag: neResize});
		new vu.ui.Draggable({element: $e, onDrag: eResize});
		new vu.ui.Draggable({element: $se, onDrag: seResize});
		new vu.ui.Draggable({element: $s, onDrag: sResize});
		new vu.ui.Draggable({element: $sw, onDrag: swResize});
		new vu.ui.Draggable({element: $w, onDrag: wResize});
		
		var showBorder = false;
		
		var hideBorders = function(){
			if (!showBorder){
				$nw.hide();
				$n.hide();
				$s.hide();
				$w.hide();
				$e.hide();
				$ne.hide();
				$se.hide();
				$sw.hide();
				$cbody.get(0).style.left = param.borderWidth + "px";
				$cbody.get(0).style.top = param.borderWidth + "px" ;
			}
		};
		
		var showBorders = function(){
			$nw.show();
			$n.show();
			$s.show();
			$w.show();
			$e.show();
			$ne.show();
			$se.show();
			$sw.show();
			$cbody.get(0).style.left ="0px";
			$cbody.get(0).style.top = "0px" ;
		};
		
		var lockBorder = function(){
			showBorder = true;
		};
		
		var unlockBorder = function(){
			showBorder = false;
		};
		
		$cont.append($nw).append($n).append($ne).append($w).append($cbody).append($e).append($sw).append($s).append($se);
		
		if (param.autoHide){
			$cont.mouseover(showBorders);
			$cont.mouseout(hideBorders);
			$nw.mousedown(lockBorder);
			$n.mousedown(lockBorder);
			$s.mousedown(lockBorder);
			$w.mousedown(lockBorder);
			$e.mousedown(lockBorder);
			$ne.mousedown(lockBorder);
			$se.mousedown(lockBorder);
			$sw.mousedown(lockBorder);
			$nw.mouseup(unlockBorder);
			$n.mouseup(unlockBorder);
			$s.mouseup(unlockBorder);
			$w.mouseup(unlockBorder);
			$e.mouseup(unlockBorder);
			$ne.mouseup(unlockBorder);
			$se.mouseup(unlockBorder);
			$sw.mouseup(unlockBorder);
			$window.mouseup(unlockBorder)
			hideBorders();
		}
		
		// resizes content to the specified dimensions
		$cont.resizeTo = function(newWidth, newHeight){
			param.height = newHeight + 2*param.borderWidth + 2;
			param.width = newWidth  + 2*param.borderWidth + 2;
			$cont.css({width: param.width, height: param.height});
			param.element.css({width: newWidth, height: newHeight});
			$n.css({width: newWidth - 2});
			$s.css({width: newWidth -2 });
			$w.css({height: newHeight -2});
			$e.css({height: newHeight - 2});
		};
		
		$body.append($cont);
		return $cont;
	
	},
	
	Dialog : function(param){
		vu._core.ui.AbstractDialog.call(this,param);
		this.prototype = new vu._core.ui.AbstractDialog();
		this.constructor = vu.ui.Dialog;
		var _t= this;
		if (param){
			var $confirm = new vu.ui.Button({value : param.confirmLable, width: 60}).css("font-weight","bold");
			var $cancel = new vu.ui.Button({value : param.cancelLable, width: 60});
			
			this.addButton($cancel);
			this.addButton($confirm);
			
			$confirm.click(function(){
				param.onConfirm();
				console.log("beforeDialogClose");
				_t.close();
			});
			
			$cancel.click(function(){
				param.onCancel();
				_t.close();
			});
		}
	},
	
	
	/**
	 * @param param.buttons Object, containing buttons description
	 * {
	 * 	"buttonLable":{width:"", click: function(){}, bold: true}
	 * }
	 * 
	 */
	CustomDialog : function(param){
		if (!param.lable){
			throw new Error("CustomDialog needs param.lable specified!");	
		}
		
		param = $.extend({
			width : 250,
			height : 400,
			minHeight : 100,
			minWidth: 150
		}, param);
		
		vu._core.ui.AbstractDialog.call(this,param);
		this.prototype = new vu._core.ui.AbstractDialog();
		this.constructor = vu.ui.CustomDialog;
		var _t= this;
		var $bt;
		if (param){
			for (var i in param.buttons){
				if (param.buttons[i].lable){
					$bt = new vu.ui.Button({value: param.buttons[i].lable, width: param.buttons[i].width || 60});
				} else {
					$bt = new vu.ui.Button({value: i, width: param.buttons[i].width || 60});
				}
				$bt.click(param.buttons[i].click);
				if (param.buttons[i].bold){
					$bt.css("font-weight","bold");
				}
				_t.addButton($bt);
			}
		}
	},
	
	Alert : function(param){
		if (typeof param === "string"){
			var msg = param;
			param = {};
			param.msg = msg;
		}
		param = $.extend({
			confirmLable : "Ok",
			cancelLable : "Отмена",
			width : 250,
			height : 130,
			minHeight : 100,
			minWidth: 150,
			idString : "alert",
			lable : "Сообщение"
		}, param);
		
		this.forceShow = function(msg){
			vu.ui.blackout.show();
			_t.$msgContent.html(msg);
			_t.open();
		};
		
		vu.ui.blackout.show();
		var cancel = param.onCancel;
		var confirm = param.onConfirm;
		
		param.onCancel = function(){
			if(typeof cancel === 'function') {
				cancel();
			}
			if (!vu.settings.ui.cont || vu.settings.ui.cont.$layer0.css("display") === "none"){
				vu.ui.blackout.hide();
			}
		};
		
		param.onConfirm = function(){
			if(typeof confirm === 'function') {
				confirm();
			}
		
			if (!vu.settings.ui.cont || vu.settings.ui.cont.$layer0.css("display") === "none"){
				vu.ui.blackout.hide();
			}
		};
		vu.ui.Dialog.call(this,param);
		this.prototype = new vu.ui.Dialog();
		this.constructor = vu.ui.Alert;
		var _t= this;
			
		this.$msgContent.html(param.msg);
	},
	
	
	
	
	/**
	 * Window class. Drag + resize + state save.
	 * 
	 * @param {Number}
	 *            param.height Initial window height.
	 * @default param.minHeight
	 * @param {Number}
	 *            param.width Initial window width
	 * @default param.minWidth
	 */
	Window : function(param){
		if (!param || ! param.element){
			return;
		}
		if (param.lable != vu.lang.console_lable && !param.idString){
			vu.throwError("idString not specified for Window Class!");
		}
		vu._core.ui.AbstractWindow.call(this,param);
		param = $.extend(this._param, param);
		var _t=this;
		this.prototype = new vu._core.ui.AbstractWindow();
		this.constructor = vu.ui.Window;
		var _namespace = "_window."+this.getId();
		var collapsed = vu.data.load([_namespace,"collapsed"], false);
		
		_t.closed = vu.data.load([_namespace,"closed"], false);
		var height = vu.data.load([_namespace,"h"], param.height || param.minHeight);
		var width = vu.data.load([_namespace,"w"], param.width) || param.minWidth;
						
		// assuming than all windows are attached to resizable wrappers
		// we use $wrap.parent() coordinates
		this.savePosition = function(){
			vu.data.save([_namespace,"x"], _t.$wrap.parent().offset().left - $window.scrollLeft());
			vu.data.save([_namespace,"y"], _t.$wrap.parent().offset().top - $window.scrollTop());
		};
		
		var saveState = function(){
				vu.data.save([_namespace,"oh"],_t.$wrap.height());
				vu.data.save([_namespace,"ow"],_t.$wrap.width());
				vu.data.save([_namespace,"collapsed"],collapsed);
			};
		
		this.updateSize = function(){
			if (_t.$footer){
				_t.$content.css('height',_t.$wrap.height() - _t.$header.height() - 10 - _t.$footer.height());
			} else {
				_t.$content.css('height',_t.$wrap.height() - _t.$header.height() - 10);
			}
			vu.data.save([_namespace,"h"], _t.$wrap.height());
			vu.data.save([_namespace,"w"], _t.$wrap.width());
			if (collapsed){
				collapsed = false;
				saveState();
				$collapse.html("_").attr("title",vu.lang.collapse_btn);
			}
			_t.savePosition();
		};
		
		this.onClose = function(){
			_t.closed = true;
			vu.data.save([_namespace,"closed"], _t.closed);	
		};
		
		this.onOpen = function(){
			_t.closed = false;
			vu.data.save([_namespace,"closed"], _t.closed);
			_t.$btns.hide();
			_t.$lable.show();
		};
		
		this.init = function(){
			this.createWindow(vu.data.load([_namespace,"x"], ($window.width() - param.minWidth) /2),
					vu.data.load([_namespace,"y"], ($window.height() - param.minHeight) /2) + "px",
					width,
					height);
			
			var $collapse = new vu.ui.Button({width: 16, height:16}).css({position: 'relative', top: 1, float: 'right', marginRight: 0}).addClass("vu-window-collapse").appendTo(this.$btns);
			collapsed ? $collapse.html("□").attr("title",vu.lang.expand_btn) : $collapse.html("_").attr("title",vu.lang.collapse_btn);
			
			this.toggleBtns = function(){
				_t.$btns.toggle();
				_t.$lable.toggle();
			};
			
			this.$header.mouseover(_t.toggleBtns);
			this.$header.mouseout(_t.toggleBtns);
							
			var collapseWindow = function(){
				collapsed = true;
				saveState();
				_t.$res.resizeTo (param.minWidth, param.minHeight)
				vu.data.save([_namespace,"h"], param.minHeight);
				vu.data.save([_namespace,"w"], param.minWidth);
				$collapse.html("□").attr("title",vu.lang.expand_btn);;
			};
			
			var expandWindow = function(){
				collapsed = false;
				var oldW =vu.data.load([_namespace,"ow"],width);
				var oldH = vu.data.load([_namespace,"oh"],height);
				_t.$res.resizeTo(oldW,oldH);
				height = oldH;
				width = oldW;
				_t.updateSize();
				saveState();
				$collapse.html("_").attr("title",vu.lang.collapse_btn);
			};
		
			var toggleWindowSize = function(){
				collapsed ? expandWindow() : collapseWindow();
			};
			
			$collapse.click(toggleWindowSize);
		};
		if (!_t.closed){
			this.init();
		}
	},
	
	/**
	 * Simple Button class.
	 * 
	 * @param {String}
	 *            src Button image URL
	 * @param {String}
	 *            param.src Button image URL
	 * @param {Number}
	 *            param.width Button width
	 * @param {Number}
	 *            param.height Button height
	 * @param {String}
	 *            param.bg Button background url
	 * @param {String}
	 *            param.value Button lable
	 * @param {String}
	 *            param.title Button tooltip
	 */
	Button : function(param){
		if (typeof param === 'string'){
			var src = param;
			param = {};
			param.src = src;
		}
		param = $.extend({
			width: 24,
			height: 24
		},param);
		
		/**
		 * @type JQuery
		 */
		var $cont = $('<div class="vu-button"></div>');
		$cont.css({
			width: param.width,
			height: param.height,
			lineHeight: param.height + "px"
		});

		if(param.bg){
			$cont.css('background','url("'+param.bg+'") 50% 50%');	
		}
		
		if (param.src){
			var $img = $('<img src="'+param.src+'"></img>').css({
				width: param.width,
				height: param.height
			});
			$cont.css('line-height',param.height-2+'px');
			$img.appendTo($cont);
		}
		if (param.value){
			$cont.append(param.value);	
		}
		
		if (param.title){
			$cont.attr("title", param.title);	
		}
		
		$cont.mousedown(function(){$cont.addClass('down');});
		$cont.mouseup(function(){$cont.removeClass('down');});
		$cont.mouseout(function(){$cont.removeClass('down');});
		
		return $cont;
	},
	addStyle: function(styles){
		$("head").append("<style type='text/css'>"+styles+"</style>");		
	},
	init : function(){
		vu._core.ui.applyStyles();
		this.blackout = new vu._core.ui.Blackout();
		this.toolbar = new vu._core.ui.Toolbar();
		this.uiWindowManager = new vu._core.ui.UIWindowManager();
		this.toploader = (new vu._core.ui.Layer({centered: true, fixed:true, width: 200, height: 15})).append($("<img src=\""+vu.resources.images.loadingBar+"\"></img>")).css({
			background : 'transparent',
			zIndex: 20000,
			textAlign: 'center'
		}).hide();
	}
}