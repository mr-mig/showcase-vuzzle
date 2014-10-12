{
	version : "0.3",
	ui : {
		/*
		 * Settings Layer container {Jquery}
		 */
		cont: null,
		moduleCont : null,
		settingsCont : null,
		bar : null,
		createList : function(){
			if (!this.cont){
				this.cont = new vu._core.ui.BiLayer({centered: true, fixed: true, height: '80%', width: '80%'}, {centered: true, fixed: true, width: "78%", height:"78%"});
				this.cont.$layer1.css({
					background: "transparent"
				});
			} else {
				this.cont.show();	
			}
			if (!this.bar){
				this.bar = new vu._core.ui.Layer({centered: true, fixed:true, width: '80%'});
				this.bar.addClass("vu-sett-bar").css('top','0');
				var $update = new vu.ui.Button({width: 130}).html(vu.lang.version_label+": "+VERSION).click(function(){
					var str = ["<table><tr><td><center>",vu.lang.basic_versions_lable,"</center></td></tr><tr>"];
					for(var i in vu.config.basics){
						str.push("<td>");
						str.push(vu.config.basics[i]);
						str.push("</td><td>");
						str.push(vu[vu.config.basics[i]].version);
						str.push("</td></tr>");
					}
					new vu.ui.Alert({
						msg : str.join(""),
						width: 190,
						height: 300
					});
				});
				var $close = new vu.ui.Button({width: 24}).css("float","right").html("X").click(vu.ui.toolbar.closeSett);
				this.bar.append($update).append($close);
				
				var $install = new vu.ui.Button({width: 150}).html(vu.lang.add_new_module);
				
				this.bar.append($install);
				$install.click(function(){
					var l1 = vu.lang.install_btn;
					var l2 = vu.lang.cancel_btn;
					var d = new vu.ui.CustomDialog({
						height: 350,
						width: 650,
						closeMethod : 'remove',
						lable : vu.lang.add_new_module,
						buttons: {
							l2: {width: 120, lable: l2, click: function(){
									d.close();
									d = null;
								}
							},
							l1 : {bold: true, width: 120, lable: l1, click: function(){
									try{
										if (d.$msgContent.find(".vu-add-module-area").val() !== ""){
											vu.platform.loadModule(d.$msgContent.find(".vu-add-module-area").val(), true);
											vu.alert(vu.lang.module_installed_ok);
										}
										d.close();
									} catch (e){
										vu.alert(vu.lang.module_installed_error + "<br/><span class='vu-error'>"+e.message+"</span>");	
									}
								}
							}
						}
					});
					
					d.$msgContent.append("<textarea class='vu-add-module-area'></textarea>");
					d.$msgContent.css({
						"padding" :"0px 10px",
						"height": "100%"});
				});
				
			} else {
				this.bar.show();
			}
			vu.ui.toploader.show();
			this.cont.$layer1.empty();
			this.cont.$layer1.css({
					"overflow-y" : "auto",
					"z-index" : "1002"
					});
			this.cont.$layer0.css("z-index","1002");
			vu.platform.getAvailableModulesList(vu._core.settings.onCreateList);
		},
		showSettings : function(){
			vu.settings.ui.cont.$layer1.show();
			vu.settings.ui.cont.$layer0.show();
			vu.settings.ui.bar.show();
		},
		hideSettings : function(){
			vu.settings.ui.cont.$layer1.hide();
			vu.settings.ui.cont.$layer0.hide();
			vu.settings.ui.bar.hide();
		},
		toggleSettings : function(){
			if (vu.settings.ui.cont.$layer1.css('display') == 'none'){
				this.showSettings();
			} else {
				this.hideSettings();	
			}
		},
		init : function(){
			
			
		}
		
	},
	init: function(){
		this.ui.init();
	}
	
}