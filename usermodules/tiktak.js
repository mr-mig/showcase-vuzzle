var tiktak =

	(function(){
	
		var _window = null;
		var _bar = null;
		var _t = {
			version : "0.0.2",
			url : "http://vuzzle.googlecode.com/svn/release/usermodules/tiktak.js",
			updateUrl : "http://vuzzle.googlecode.com/svn/release/usermodules/versions/tiktak.js",
			name : "tiktak",
			title : "TikTak",
		    description: "Часики.",
			author: "Mr_Mig",
			icon : null,
			depends : [],
			settings : {
				// Example of width option
				width : {
					// text label to be displayed by the option
					text : "Ширина",
					// control type
					type : "input:posint",
					// default value
					value : 200,
					// control title
					title : "Ширина часиков в пикселях",
					// function to be invoked on control activation (button click)
					action : null
				},
				height : {
					text : "Высота",
					type : "input:posint",
					value : 200,
					title : "Высота часиков в пикселях",
					action : null
				}
			
			},
			clocks : "http://vuzzle.googlecode.com/svn/release/res/uhr.swf",
			onApplySettings : function(){
				_bar.css({
					width : this.settings.width.value,
					height : this.settings.height.value
				});
				_bar.find("object").attr("width",this.settings.width.value).attr("height",this.settings.height.value);
				_bar.find("embed").attr("width",this.settings.width.value).attr("height",this.settings.height.value);
			},
			onUnintall : function(){
				_bar.remove();
			},
			getWindow: function() {
				return _window;
			},
			init : function(){
				_bar = $("<div></div>");
				_bar.html('<object height="'+this.settings.height.value+'" width="'+this.settings.width.value+'"><param name="movie" value="'+this.clocks+'"><embed src="'+this.clocks+'" width="'+this.settings.width.value+'" height="'+this.settings.height.value+'"></embed><param name="quality" value="high"><param name="wmode" value="transparent"></param></object>');
				_bar.css({
					position: 'fixed',
					cursor : 'pointer',
					left : vu.data.load(["tiktak","x"], 50),
					width: this.settings.width.value,
					height: this.settings.height.value,
					top : vu.data.load(["tiktak","y"], 50)
				})
				.addClass("round");
				vu.ui.$body.append(_bar); 
				new vu.ui.Draggable({element:_bar, onStop : _t.savePosition, propagateEvent: true});
			},
			savePosition : function(){
				vu.data.save(["tiktak","x"], _bar.offset().left - $window.scrollLeft());
				vu.data.save(["tiktak","y"], _bar.offset().top - $window.scrollTop());	
			}
		}
		return _t;
	})();