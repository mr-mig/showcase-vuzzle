var note = (function() {

	_window = null;

	return {
		version : "0.0.2",
		url : "http://vuzzle.googlecode.com/svn/release/usermodules/note.js",
		updateUrl : "http://vuzzle.googlecode.com/svn/release/usermodules/versions/note.version",
		name : "note",
		title : "Блокнотик",
		description : "Блокнотик",
		author : "konstantin89",
		icon : null,
		depends : [],
		settings : {
			count : {
				text : "Количество блокнотов",
				type : "input:int",
				value : 1,
				title : "Количество блокнотов"
			}
		},
		onApplySettings : function() {
		},
		onUninstall : function() {
		},
		init : function() {
	vu.ui.addStyle("textarea.note{width:100% !important;height:100% !important;border-style:none !important;padding:0px !important}		input.noteheadinp{position:absolute;width:100%;border-style:none;background-color:transparent;font-family:tahoma,arial,verdana,sans-serif,Lucida Sans;font-size:11px;margin-top:3px;margin-left:3px;color:#AAAAAA;text-align:center;top:2px;left:-3px;display:none;}");
	
	//создаем окошко
	for(var i = 0;this.settings.count.value>i;i++){
		new vu.ui.Window({element: 
			$("<textarea id= 'note_"+i+"' class= 'note'>"
			+ vu.data.load("notetxt_"+i)+"</textarea>"),
		
			lable: vu.data.load("notetxt_"+i+"_name")||"Блокнот "+i,
		
			idString:"v_note_"
		});
	};
	
	//листенер на анлоад для сохранения  значение во всех блокнотах
	$(window).unload(function(){
		$(".note").each(function(indx, element){
			vu.data.save("notetxt_"+indx,this.value);
		});		
	});
	
//находим все наши textarea
$('.note').each(function(indx, element){
	//для каждой вешаем блюр с сохранением
	$(element).blur(function(){
		vu.data.save("notetxt_"+indx,this.value);
	});
	//создаем инпут для смены заголовка окна
	$(element).parent().parent().append("<input class='noteheadinp' type='text'></input>");

	//находим тока что созданный инпут
	$(".noteheadinp").eq(indx).(function(){
		//вешаем на него блюр с хайдом
		$(this).blur(function(){
			$(this).hide();
		});

		//вешаем на негоже кейап на энтер
		$(this).keyup(function(eventObject){
						if(eventObject.which==13){
							vu.data.save("notetxt_"+indx+"_name",this.value);
							$(this).parent('.vu-window-header-lable:first').html(this.value);
							$(this).parent('.vu-window-header-lable:first').show();
							$(this).parent('.vu-window-header-btns:first').hide();
							$(this).hide();
						};
			}
		);

		//вешаем на заголовок контейнера листнер на дабл клик (не пашет=\)
		$(this).parent(".vu-window-header:first").dblclick(function(){
			$(this).show();
			$(element).parent().find('.vu-window-header-lable:first').hide();
			$(element).parent().find('.vu-window-header-btns:first').show();

		})
	})	

});	
		}
	}
})();