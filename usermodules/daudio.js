(function(){

	return {
		version : "0.0.7",
		url : "http://vuzzle.googlecode.com/svn/release/usermodules/daudio.js",
		updateUrl : "http://vuzzle.googlecode.com/svn/release/usermodules/versions/daudio.version",
		name : "daudio",
		title : "DAudio",
		description : "Создаёт ссылки на сохранение музыкальных треков",
		author : "konstantin89",
		titleContainers : [".audioTitle", ".audio_desc .fl_l", ".info"],
		audioContainers : [".audioRow",".audioTitle",".audio",'.audioRowWall'],
		insertedNodesSelectors : ["#page_body", "#page_wall_posts", "#status_top_box_wrap", ".mainPanel"],
		icon : null,
		depends : [],
		daimg : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89%2BbN%2FrXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz%2FSMBAPh%2BPDwrIsAHvgABeNMLCADATZvAMByH%2Fw%2FqQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf%2BbTAICd%2BJl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA%2Fg88wAAKCRFRHgg%2FP9eM4Ors7ONo62Dl8t6r8G%2FyJiYuP%2B5c%2BrcEAAAOF0ftH%2BLC%2BzGoA7BoBt%2FqIl7gRoXgugdfeLZrIPQLUAoOnaV%2FNw%2BH48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl%2FAV%2F1s%2BX48%2FPf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H%2FLcL%2F%2Fwd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s%2BwM%2B3zUAsGo%2BAXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93%2F%2B8%2F%2FUegJQCAZkmScQAAXkQkLlTKsz%2FHCAAARKCBKrBBG%2FTBGCzABhzBBdzBC%2FxgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD%2FphCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8%2BQ8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8%2BxdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR%2BcQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI%2BksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG%2BQh8lsKnWJAcaT4U%2BIoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr%2Bh0uhHdlR5Ol9BX0svpR%2BiX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK%2BYTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI%2BpXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q%2FpH5Z%2FYkGWcNMw09DpFGgsV%2FjvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY%2FR27iz2qqaE5QzNKM1ezUvOUZj8H45hx%2BJx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4%2FOBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up%2B6Ynr5egJ5Mb6feeb3n%2Bhx9L%2F1U%2FW36p%2FVHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm%2Beb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw%2B6TvZN9un2N%2FT0HDYfZDqsdWh1%2Bc7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc%2BLpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26%2FuNu5p7ofcn8w0nymeWTNz0MPIQ%2BBR5dE%2FC5%2BVMGvfrH5PQ0%2BBZ7XnIy9jL5FXrdewt6V3qvdh7xc%2B9j5yn%2BM%2B4zw33jLeWV%2FMN8C3yLfLT8Nvnl%2BF30N%2FI%2F9k%2F3r%2F0QCngCUBZwOJgUGBWwL7%2BHp8Ib%2BOPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo%2Bqi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt%2F87fOH4p3iC%2BN7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi%2FRNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z%2Bpn5mZ2y6xlhbL%2BxW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a%2FzYnKOZarnivN7cyzytuQN5zvn%2F%2FtEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1%2B1dT1gvWd%2B1YfqGnRs%2BFYmKrhTbF5cVf9go3HjlG4dvyr%2BZ3JS0qavEuWTPZtJm6ebeLZ5bDpaql%2BaXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO%2FPLi8ZafJzs07P1SkVPRU%2BlQ27tLdtWHX%2BG7R7ht7vPY07NXbW7z3%2FT7JvttVAVVN1WbVZftJ%2B7P3P66Jqun4lvttXa1ObXHtxwPSA%2F0HIw6217nU1R3SPVRSj9Yr60cOxx%2B%2B%2Fp3vdy0NNg1VjZzG4iNwRHnk6fcJ3%2FceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w%2B0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb%2B%2B6EHTh0kX%2Fi%2Bc7vDvOXPK4dPKy2%2BUTV7hXmq86X23qdOo8%2FpPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb%2F1tWeOT3dvfN6b%2FfF9%2FXfFt1%2Bcif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v%2B3Njv3H9qwHeg89HcR%2FcGhYPP%2FpH1jw9DBY%2BZj8uGDYbrnjg%2BOTniP3L96fynQ89kzyaeF%2F6i%2FsuuFxYvfvjV69fO0ZjRoZfyl5O%2FbXyl%2FerA6xmv28bCxh6%2ByXgzMV70VvvtwXfcdx3vo98PT%2BR8IH8o%2F2j5sfVT0Kf7kxmTk%2F8EA5jz%2FGMzLdsAAAAgY0hSTQAAeiUAAICDAAD5%2FwAAgOkAAHUwAADqYAAAOpgAABdvkl%2FFRgAAAVBJREFUeNqslDFuwjAUhj%2B%2FBGimSsxwkUrMHIMKBY5Au7QDU8sRIK1g7AkqZo5SZkQnIMRxFwelaQKJyjfFyvs%2FP9uJVe%2FpjRxaQPc2rgd7pTmqGICaETzjsJXQB5bAOhuUzFgBA8%2B4X0DwLSEHpYkxxBgOSrOVECAAPoCBzeQKm8ALMN2piBLcAVObaWaFCngARlRnZLMqLfTzZPNxn%2Fm4XzjOSH0AF2h5xj27zALJLzzjTHdKfwrQLblnZ9kpDdAVoMP16Egdp3ctW8M4PYmIr9beUcV%2FPux%2F47oIIbrSiaZr7p%2FfT881BAnRi3RxuuAS2doDeiHA6lJhGZllJcDyBpcq0rx31rEUYL0nGpYNFk1kHevklANgckl6puuJdZzWaoDX1I9eZU8nNmuy9%2BEGeASGjZw9LWBoM5uiG9sAswNRO7mOCvCBNjBLOkv4GQDQrXY73AXbEQAAAABJRU5ErkJggg%3D%3D",
		settings : {
			
		},
		parseUrlTitle : function(thismodule, $array, index){
			var $cont = $(this);
						if ($cont.size() == 0){
							return;
						}
						if ($cont.find(".dlink").size() > 0){
							if ($array && index){
								setTimeout(function(){thismodule.parseUrlTitle.call($array.get(index),thismodule,$array,++index);}, 50);
							}
							return;
						}
						try{
							var url, title;
							//wall
							try {
								url = $cont.find("input[type=hidden]").val().match(/(.+),\d+/)[1];
							}	catch(e){}						
							//user's audios
							try{
								url = url ? url : $cont.find(".play_btn").html().match(/operate\('.+','(.+)',\d+/)[1];
							} catch(e){}
							
							//group news audio section
							//user's message audio
							try{
								url = url ?	url : $cont.find(".playimg").parent().html().match(/operate\('.+','(.+)',\d+/)[1];;
							} catch(e){}
							 
							for (var i in thismodule.titleContainers){
								if (vu.vk.page.name == 'search' ){
									console.log(thismodule.titleContainers[i] + " span:last")
									$cont.find(thismodule.titleContainers[i] + " span:last").remove();
								}
								title = (title && title !== 'null - null') ? title : $cont.find(thismodule.titleContainers[i] + " b a").html() + " - " + ($cont.find(thismodule.titleContainers[i] +" span:last a").html() || $cont.find(thismodule.titleContainers[i] +" span:last").html() );
							} 
							
							var $link = $("<a></a>");
							$link.addClass("dlink").html("<img src='" +thismodule.daimg +"' style='width:16px;float:right;'>").attr("title",title).attr("href",url);
							
							
							$cont.find(".play_new").parents("td:eq(0)").append($link).css("width","13%").parents("table:eq(0)").css("width","100%");
							$cont.find(".playimg").parents("td:eq(0)").append($link).css("width","47px");
							
						} catch(e){}
						if ($array && index){
							setTimeout(function(){thismodule.parseUrlTitle.call($array.get(index),thismodule,$array,++index);}, 50);
						}
		},
		onApplySettings : function() {
		},
		createLinks : function(ctx_selector){
			var $containers;
			var thismodule = this;
			
			if (ctx_selector){
				$containers = $(ctx_selector).find(this.audioContainers.join(","));
			} else{
				$containers = $(this.audioContainers.join(","));
			}
			if ($containers.size() > 0) {
					//load balance
					if ($containers.size() <= 50){
						$containers.each(function(){
							thismodule.parseUrlTitle.call(this, thismodule);
						});	
					} else {
						thismodule.parseUrlTitle.call($containers.get(0), thismodule, $containers, 1);		
					}
			}
		},
		
		init : function() {
			var module = this;
			vu.ui.addStyle('.audioRow td.play_btn {width: 37px !important}.audio_add {margin-left: 350px !important; margin-top: -43px !important} .audio .play_new{display: inline-block; width: 16px;}');
			this.createLinks();
			// bind for ajax-updated elements
			for (var i in this.insertedNodesSelectors){
				$(this.insertedNodesSelectors[i]).bind("DOMNodeInserted",function(e){console.log(e.target);module.createLinks(e.target);});	
			}
		}
	}
})();