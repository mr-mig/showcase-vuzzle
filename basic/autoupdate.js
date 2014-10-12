{
				version : "0.4",
				updatable : [],
				updatedList : null,
				toCheck : 0,
				showCritical : false,
				isUINotified : null,
				
				/**
				 * @param moduelInfo -
				 *            Object or String (moduleName).
				 * @param moduleVersion -
				 *            String
				 */
				notify : function(moduleInfo,moduleVersion){
					var obj = {};
					if (typeof moduleInfo === "object"){
						obj.name = moduleInfo.module.name;
						obj.version = moduleInfo.version;
					} else {
						obj.name = moduleInfo;
						obj.version = moduleVersion;
					}
					obj.time= (new Date).toUTCString();
					vu.autoupdate.updatedList.push(obj);
					vu.data.save("autoupdate.updatedList", vu.autoupdate.updatedList);
					
					if (vu.autoupdate.isUINotified){
							vu.autoupdate.showNotificationButton();
						}
					
					vu.autoupdate.isUINotified = false;
					vu.data.save("autoupdate.isNotified",false);
				},
				
				showNotificationButton : function(){
					var $btn = new vu.ui.Button(vu.resources.images.alert);
					$btn.click(function(){
						$(this).remove();
						vu.data.save("autoupdate.isNotified", true);
						var msg = [];
						msg.push("<table style='width:100%'><col width='100px'></col><col></col><col></col><tbody><tr><td>"+"Модуль"+"</td><td>"+"Версия"+"</td><td>"+"Дата обновления"+"</td></tr>");
						var el;
						for (var i in vu.autoupdate.updatedList){
							el = vu.autoupdate.updatedList[i];
							msg.push("<tr><td>");
							msg.push(el.name);
							msg.push("</td>");
							msg.push("<td>");
							msg.push(el.version);
							msg.push("</td>");
							msg.push("<td>");
							msg.push(el.time);
							msg.push("</td>");
							msg.push("</tr>");
						}
						
						msg.push("</tbody></table>");
						vu.alert(msg.join(""), {width:400});
						vu.autoupdate.updatedList = [];
						vu.data.save("autoupdate.updatedList", vu.autoupdate.updatedList);
					});
					vu.ui.toolbar.addButton($btn);
				},
				compareVersion : function(v1, v2){
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
				getModuleVersion : function(module){
					vu.autoupdate.toCheck++;
					vu.xhr.xget(module.updateUrl,function(data){vu.autoupdate.checkModuleVersion(module, data);});
				},
				checkModuleVersion : function(module,data){
					console.log("version module="+module.name+" data="+data);
					var version = data.match(vu.constants.VERSION_REG)[1];
					if (vu.autoupdate.compareVersion(version, module.version)){
						vu.autoupdate.updatable.push({module: module, version: version});
						module.version = version;
					}
					vu.autoupdate.toCheck--;
				},
				checkForUpdate : function(){
					var module;
					for (i in vu.platform.modules){
						module = vu.platform[i];
						vu.debug("Module version check: "+module.name);
						vu.autoupdate.getModuleVersion(module);
					}
					setTimeout(vu.autoupdate.isAllChecked, 200);
				},
				checkOptions : function(data){
					vu.debug("options data="+data);
					var optVersion = data.match(vu.constants.VERSION_REG)[1];
					if (vu.autoupdate.compareVersion(optVersion, vu.config.version)){
						vu.log("vuzzle config version="+optVersion+" found and ready to update!")
						vu.xhr.xget(vu.constants.CONFIG_URL, function(data){
							var config = eval("("+data+")");
							vu.data.save("basic.config",config);
							vu.log("vuzzle config updated!");
							if (vu.autoupdate.compareVersion(config.CRITICAL_UPDATE_VERSION, VERSION) && !vu.autoupdate.showCritical){
								vu.autoupdate.showCritical =  true;
								new vu.ui.Alert({
									msg: config.CRITICAL_UPDATE_MSG, 
									width: 300, 
									height: 200, 
									lable: vu.lang.CRITICAL_UPDATE_ALERT_LABLE,
									onConfirm: function(){
										_beforeCriticalUpdate();
										window.location.href = config.CRITICAL_UPDATE_URL;
									}, 
									onCancel : function(){
										vu.config = config;
										vu.autoupdate.checkBasicUpdate();
									}
								});
							} else {
								vu.config = config;
								vu.autoupdate.checkBasicUpdate();
							}
						})	
					} else {
						vu.log("config is up-to-date. Skipping update.")
						vu.autoupdate.checkBasicUpdate();
					}
				},
				checkConfigUpdate : function(){
					vu.xhr.xget(vu.constants.CONFIG_VERSION_URL, function(data){vu.autoupdate.checkOptions(data);})
				},
				checkBasicUpdate : function(){
					console.log("getting basics versions");
					console.log(vu.config);
					vu.autoupdate.getBasicVersion(vu.config.BASIC_VERSION_URL);	
				},
				getBasicVersion : function(url){
					vu.xhr.xget(url,function(data){vu.autoupdate.checkBasicVersion(data);})
				},
				checkBasicVersion : function(data){
					var versions = eval("("+data+")");
					for (var i in vu.config.basics){
						var name = vu.config.basics[i];
						console.log("checking "+name+" version");
						if (vu.autoupdate.compareVersion(versions[name],vu[name].version)){
							vu.log("basic name="+name+" version="+versions[name]+" ready to update!");
							vu.autoupdate.installNewBasic(name,vu.config.BASIC_URL.replace(vu.constants.PLACEHOLDER, name));	
						}		
					}
					
				},
				installNewBasic : function(name, url){
					vu.xhr.xget(url,function(data){
						var basic = eval("("+data+")")
						vu.data.save(["basic",name],basic);
						
						// pass new version to prevent cascade autoupdates
						vu[name].version = basic.version;
						
						vu.autoupdate.notify(name, basic.version);
						vu.log("basic name="+name+" updated!");
						console.log("vu."+name+".version="+vu[name].version);
					});
				},
				isAllChecked : function(){
					if (vu.autoupdate.toCheck <=0 ){
						vu.autoupdate.alertUpdate();
					} else{
						setTimeout(vu.autoupdate.isAllChecked, 200);
					}
				},
				alertUpdate : function(){
					var array = vu.autoupdate.updatable;
					if (array.length >0){
						for (var i in array){
							vu.platform.instalModule(array[i].module.url);
							vu.autoupdate.notify(array[i]);
							console.log(array[i].module.name + " обновлен");
						}
						vu.autoupdate.updatable = [];
					}
				},
				init : function(){
					try{
						
						vu.autoupdate.updatedList = vu.data.load("autoupdate.updatedList",[]);
						vu.autoupdate.isUINotified = vu.data.load("autoupdate.isNotified", true);
						var timer = new vu.util.SyncTimer("userModuleUpdate");
						// TODO Move interval to settings
						timer.check(this.checkForUpdate, 1*10*1000);
						// vu.autoupdate.updatable =
						// vu.data.load(["update","stack"],[]);
						var basicTimer = new vu.util.SyncTimer("basicUpdateTimer");
						basicTimer.check(this.checkConfigUpdate,1*10*1000);
						
						if (vu.autoupdate.isUINotified !== true){
							vu.autoupdate.showNotificationButton();
						}
					} catch (e){
						vu.error(e);
					}
				}
			}