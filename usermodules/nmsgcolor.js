var nmsgcolor = (function() {

	_window = null;

	return {
		version : "0.0.6",
		url : "http://vuzzle.googlecode.com/svn/release/usermodules/nmsgcolor.js",
		updateUrl : "http://vuzzle.googlecode.com/svn/release/usermodules/versions/nmsgcolor.version",
		name : "nmsgcolor",
		title : "Меняет цвет фона и текста новых сообщений в списке сообщений.",
		description : "Меняет цвет фона и текста новых сообщений в списке сообщений.",
		author : "Mr_Mig",
		icon : null,
		depends : [],
		settings : {
			bgcolor : {
				text : "Цвет фона",
				type : "input:color",
				value : '#B1BDD6',
				title : "Цвет фона новых сообщений"
			},
			color : {
				text : "Цвет текста",
				type : "input:color",
				value : '#FFFFFF',
				title : "Цвет текста новых сообщений"
			}
		},
		onApplySettings : function() {
			this.setColor();
		},
		onUninstall : function() {
		},
		setColor : function() {
			vu.ui.addStyle('.mailbox table tr.newRow {background-color:'
							+ this.settings.bgcolor.value
							+ '!important;}.mailbox tr.newRow .messageSnippet a{color: '
							+ this.settings.color.value + '!important;}');
		},
		init : function() {
			this.setColor();
		}
	}
})();