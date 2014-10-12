var dvideo = (function() {

	_window = null;

	return {
		version : "0.0.4",
		url : "http://vuzzle.googlecode.com/svn/release/usermodules/dvideo.js",
		updateUrl : "http://vuzzle.googlecode.com/svn/release/usermodules/versions/dvideo.version",
		name : "dvideo",
		title : "DVideo",
		description : "Создаёт ссылки на сохранение видео.",
		author : "konstantin89",
		icon : null,
		depends : [],
		settings : {

		},
		onApplySettings : function() {
		},
		init : function() {
	
function dvideo(){

if(!document.getElementById('dvidA')&&document.getElementById('video_player')){
var ext = {
'0' : '240.mp4',
'1' : '360.mp4',
'2' : '480.mp4',
'3' : '720.mp4',
'5' : 'flv'
};
var parStr = document.getElementById('video_player').parentNode.innerHTML;

var param = {
'uid' : parStr.match(/uid=([0-9]*)/)[1],
'vkid' : parStr.match(/vkid=([0-9]*)/)[1],
'host' : decodeURIComponent(parStr.match(/host=([^&]*)/)[1]),
'vtag' : parStr.match(/vtag=([^&|"]*)/)[1],
'noflv' : parStr.match(/no_flv=([0-9]*)/)[1],
'hd' : parStr.match(/hd=([^&]*)/)[1]
};

var docFragment = document.createDocumentFragment();
var boxCont = document.getElementsByClassName('controls_wrap')[1]||document.getElementsByClassName('controls_wrap')[0]||document.getElementsByClassName('box_controls_text')[0];
var simpCont = document.getElementById('videoactions');
var vidCont = boxCont?boxCont:simpCont;
var linkCont = document.createElement('span');
linkCont.className = 'action_link';
linkCont.id = 'dvidA';
function swlink(){if(boxCont){return ' |<a id="dvl"> Скачать </a>'}else{return '<a style="display:inline" id="dvl">Скачать </a>'}};
linkCont.innerHTML = swlink();
var selEl = document.createElement('select');
selEl.id = 'dvid';
vidCont.appendChild(linkCont);
document.getElementById('dvidA').appendChild(selEl);

if(param.noflv==0){
var b = document.createElement('option');
b.value = '5';
b.innerHTML = 'flv';
docFragment.appendChild(b);
};

if(param.hd>0||param.noflv==1){
for(var i=0;i<=param.hd;i++){
if(param.noflv==0){i++;param.noflv=1};
var b = document.createElement('option');
b.value = i;
b.innerHTML = ext[i];
docFragment.appendChild(b);
};
};

document.getElementById('dvid').appendChild(docFragment);

function downloadLink(ind){
var dlink = param.uid==0?'http://'+param.host+'/assets/videos/'+param.vtag+param.vkid+'.vk.flv':param.host+'u'+param.uid+'/video/'+param.vtag+'.'+ext[ind];
document.getElementById('dvl').href = dlink;
};

document.getElementById('dvid').addEventListener('change',function(){downloadLink(document.getElementById('dvid').value)},false);
downloadLink(document.getElementById('dvid').value);


};
};
setInterval(function(){dvideo()},300);

		}
	}
})();