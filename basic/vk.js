{
	version : "0.4",
	host : null,
	currentUser : {
		vkname: null,
		id : null
	},
	page : {
		name : null,
		isProfile : false,
		profileId : null,
		profileName : null,
		myProfile : false
	},
	getCurrentPage : function(){
		var isP = this.checkForName(window.location.pathname);
		var res, id;
		if (isP){
			res = window.location.pathname.match(vu.constants.PROFILE_TEST_REG);
			try {
				id = $("#profile_avatar img").attr("src").match(vu.constants.IMG_USERID_REG)[1];
			} catch(e){}
			id ? id : vu.vk.getCurrentUser().id;		
		} else {
			res = window.location.href.replace(window.location.origin,'').replace(/\?.*/,'').match(vu.constants.PAGE_TEST_REG);
		}
		var name = res[1] || res[2] || res[3];
		return {
			name : name,
			isProfile : isP,
			profileName : name,
			profileId : id
		};
	},
	checkForName : function(chkStr){
		if (chkStr) {
		return 	(!(/.php/).test(chkStr))
				&& (!(/write\d+/).test(chkStr))
				&& (!(/club\d+/).test(chkStr))
				// && (!(/object XPC/).test(chkStr))
				&& (!(/event\d+/).test(chkStr)) 
				&& (!(/app\d+/).test(chkStr))
				&& (!(/album.+\d+/).test(chkStr))
				&& (!(/video.+\d+/).test(chkStr))
				&& (!(/audio.+\d+/).test(chkStr))
				&& (!(/photo.+\d+/).test(chkStr))
				&& (!(/topic.+\d+/).test(chkStr))
				&& (!(/board.+\d+/).test(chkStr))
				&& (!(/note\d+/).test(chkStr))
				&& (!(/search/).test(chkStr));
		} else {
			return null;
		}
	},
	getCurrentUser : function(chkStr){
		var user = vu.data.load("user",null);
		if (!user){
			var name = $("#myprofile a.hasedit").attr("href").match(/\/(.+)/)[1];
			var id = $("#nav").html().match(vu.constants.HREF_USERID_REG)[1];
			user = {
				vkname : name,
				id : id
			};
		}
		vu.data.save("user", user);
		return user;
	},
	init : function(){
		try{
			this.host = window.location.origin;
			this.page = vu.vk.getCurrentPage();
			this.currentUser = vu.vk.getCurrentUser();
		} catch (e){
			vu.error("vk module is off. Reason:"+e);
		}
	}
}