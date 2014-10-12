var rounder = (function() {

	_window = null;

	return {
		version : "0.0.1",
		url : "http://vuzzle.googlecode.com/svn/release/usermodules/rounder.js",
		updateUrl : "http://vuzzle.googlecode.com/svn/release/usermodules/versions/rounder.version",
		name : "rounder",
		title : "Rounder",
		description : "Скругляет маленькие аватарки",
		author : "Mr_Mig",
		icon : null,
		depends : [],
		settings : {
			radius : {
				text : "Радиус скругления",
				type : "input:int",
				value : 8,
				title : "Радиус скругления уголков аватар"
			}
		},
		onApplySettings : function() {
			this.setRadius();
		},
		onUninstall : function() {
		},
		setRadius : function() {
			vu.ui.addStyle('td div img{border-radius:'+this.settings.radius.value+'px; -moz-border-radius:'+this.settings.radius.value+'px}');
		},
		init : function() {
			this.setRadius();
		}
	}
})();