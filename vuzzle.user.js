// ==UserScript==
// @name vuzzle
// @namespace vuzzle
// @description Платформа пользовательских скриптов для vkontakte.ru
// @author Mr_Mig
// @version 0.0
// @copyright 2010+, Mr_Mig (http://vkontakte.ru/id4518704)
// @license Beerware
// @include http://*vkontakte.ru/*
// @include http://*vk.com/*
// @include http://vk.hamlab.net/*
// @exclude http://vkontakte.ru/login*
// @exclude http://vk.com/login*
// @exclude http://login.vk.com/*
// @exclude http://vk.com/im*
// @exclude http://vkontakte.ru/im*
// ==/UserScript==


// TODO modules
// popup-menu
// ex-friends
// friends-online



/*
 * Local storage map
 * 
 * vuzzle | modules : modulesArray | moduleName : moduleBody | moduleSetting :
 * settingValue | ui | synctimer | user
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

/*
 * Uses jQuery 1.4 Uses black voodoo magic (=
 * 
 * Requirements: Opera 10.50+ Mozilla 3.6+ Chrome 5+
 * 
 * /////////////////////////////////////////////////////////////////////////////////
 * The magic is based on JavaScript interpreter automatic *non declared
 * variable* bind to the current global scope. It is used to bind variable both
 * to window and unsafeWindow in GreaseMonkey. This magical trick let us use $
 * and _ both in GM and in pure browser.
 * 
 * The initial jQuery lib loading time is ~ 10 msec for COM. Not so bad.
 * 
 * ////////////////////////////////////////////////////////////////////////////////////
 * Comments glossary: C - chrome, O - opera, M - mozilla, GM - GreaseMonkey. (As
 * you can see, COM stands for "Chrome, Opera, Mozilla")
 * 
 * ///////////////////////////////////////////////////////////////////////////////////////
 * @browser annotation shows for which of the COM browsers the function/hack is
 * necessary
 * 
 * ///////////////////////////////////////////////////////////////////////////////////////
 * Shorthand for library object is "vu".
 * 
 * Library usage: var newPlugin = {}; newPlugin.megaFunction = function(){
 * vu.doSmth(); };
 * 
 * You may use vu object both from browsers and GreaseMonkey.
 * 
 * Your scripts will be managed by vuzzle platform. No preparations needed. You
 * need not to follow user scripts notation (metablock, *.user.js), but it is
 * strongly recommended to provide some comments in the script =)
 * 
 * ///////////////////////////////////////////////////////////////////////////////////////
 * Main problem: Crossdomain requests. Cases: 1. Request for srcipt modules. 2.
 * Requests for userapi.com data. 3. Request for any other data This cases is
 * solved as: 1. All data wrapped in vu.platform.loadModule 2. url contains
 * "back" parameter, which wraps response data in a vu.platform.instalModule 3.
 * All data must be wrapped in any orbitrary callback
 * 
 * For chrome:
 * http://src.chromium.org/viewvc/chrome/trunk/src/chrome/common/extensions/docs/examples/howto/contentscript_xhr/
 */

var DEBUG = true; // Log file depth
var DEV = true // override server settings

var VERSION = "0.5";
/**
 * Wrap everything in sandbox closure. Prevents "return defined out of function
 * definition" error.
 * 
 * @browser O
 */
(function(){

if (top != self){
	return;
}

var startTime, stopTime;
startTime = new Date();
var $,jQuery;

if(typeof unsafeWindow === 'undefined'){
	unsafeWindow = window;
} else if (this.unsafeWindow != unsafeWindow){
	// Create unsafeWindow mock for O and C
 	this.unsafeWindow = window;
 	// if no unsafeWindow is defined, then browser is not M
	
}
console.log("Vuzzle loading...");
/**
 * Unevals object
 * 
 * @type Function
 * @return {String}
 * @browser O,C
 */
if (typeof(unsafeWindow['uneval']) !== 'function') {
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var protos = [];
	var char2esc = {
		'\t' : 't',
		'\n' : 'n',
		'\v' : 'v',
		'\f' : 'f',
		'\r' : '\r',
		'\'' : '\'',
		'\"' : '\"',
		'\\' : '\\'
	};
	var escapeChar = function(c) {
		if (c in char2esc){
			return '\\' + char2esc[c];
		}
		var ord = c.charCodeAt(0);
		return ord < 0x20 ? '\\x0' + ord.toString(16) : ord < 0x7F
				? '\\' + c
				: ord < 0x100 ? '\\x' + ord.toString(16) : ord < 0x1000
						? '\\u0' + ord.toString(16)
						: '\\u' + ord.toString(16)
	};
	var uneval_asis = function(o) {
		return o.toString()
	};
	/* predefine objects where typeof(o) != 'object' */
	var name2uneval = {
		'boolean' : uneval_asis,
		'number' : uneval_asis,
		'string' : function(o) {
			return '\''
					+ o.toString().replace(/[\x00-\x1F\'\"\\\u007F-\uFFFF]/g,
							escapeChar) + '\''
		},
		'undefined' : function(o) {
			return 'undefined'
		},
		'function' : uneval_asis
	};

	var uneval_default = function(o, np) {
		var src = []; // a-ha!
		for (var p in o) {
			if (!hasOwnProperty.call(o, p)){
				continue;
			}
			src[src.length] = uneval(p) + ':' + uneval(o[p], 1);
		};
		// parens needed to make eval() happy
		return np ? '{' + src.toString() + '}' : '({' + src.toString() + '})';
	};

	var uneval_set = function(proto, name, func) {
		protos[protos.length] = [proto, name];
		name2uneval[name] = func || uneval_default;
	};

	uneval_set(Array, 'array', function(o) {
				var src = [];
				for (var i = 0, l = o.length; i < l; i++)
					src[i] = uneval(o[i]);
				return '[' + src.toString() + ']';
			});
	uneval_set(RegExp, 'regexp', uneval_asis);
	uneval_set(Date, 'date', function(o) {
				return '(new Date(' + o.valueOf() + '))';
			});

	var typeName = function(o) {
		// if (o === null) return 'null';
		var t = typeof o;
		if (t != 'object'){
			return t;
		}
		// we have to lenear-search. sigh.
		for (var i = 0, l = protos.length; i < l; i++) {
			if (o instanceof protos[i][0]){
				return protos[i][1];
			}
		}
		return 'object';
	};
	
	/**
	 * Converts object into JSON String
	 * 
	 * @type Function
	 * @return {String} unevaled object
	 * @browser O, C
	 */
	unsafeWindow.uneval = function(o, np) {
		// if (o.toSource) return o.toSource();
		if (o === null){
			return 'null';
		}
		var func = name2uneval[typeName(o)] || uneval_default;
		return func(o, np);
	}
}
	/**
	 * Clones object
	 * 
	 * @type Function
	 * @return {Object}
	 * @browser O,C
	 */
if (typeof(unsafeWindow['clone']) !== 'function') {
	var clone = function(o) {
		try {
			return eval(uneval(o));
		} catch (e) {
			throw (e);
		}
	};
}
	
	
// ====================================================================================*/
// =============================jQuery 1.4
// block=======================================*/
// ====================================================================================*/
try{	
(function(A,w){function ma(){if(!c.isReady){try{s.documentElement.doScroll("left")}catch(a){setTimeout(ma,1);return}c.ready()}}function Qa(a,b){b.src?c.ajax({url:b.src,async:false,dataType:"script"}):c.globalEval(b.text||b.textContent||b.innerHTML||"");b.parentNode&&b.parentNode.removeChild(b)}function X(a,b,d,f,e,j){var i=a.length;if(typeof b==="object"){for(var o in b)X(a,o,b[o],f,e,d);return a}if(d!==w){f=!j&&f&&c.isFunction(d);for(o=0;o<i;o++)e(a[o],b,f?d.call(a[o],o,e(a[o],b)):d,j);return a}return i?
e(a[0],b):w}function J(){return(new Date).getTime()}function Y(){return false}function Z(){return true}function na(a,b,d){d[0].type=a;return c.event.handle.apply(b,d)}function oa(a){var b,d=[],f=[],e=arguments,j,i,o,k,n,r;i=c.data(this,"events");if(!(a.liveFired===this||!i||!i.live||a.button&&a.type==="click")){a.liveFired=this;var u=i.live.slice(0);for(k=0;k<u.length;k++){i=u[k];i.origType.replace(O,"")===a.type?f.push(i.selector):u.splice(k--,1)}j=c(a.target).closest(f,a.currentTarget);n=0;for(r=
j.length;n<r;n++)for(k=0;k<u.length;k++){i=u[k];if(j[n].selector===i.selector){o=j[n].elem;f=null;if(i.preType==="mouseenter"||i.preType==="mouseleave")f=c(a.relatedTarget).closest(i.selector)[0];if(!f||f!==o)d.push({elem:o,handleObj:i})}}n=0;for(r=d.length;n<r;n++){j=d[n];a.currentTarget=j.elem;a.data=j.handleObj.data;a.handleObj=j.handleObj;if(j.handleObj.origHandler.apply(j.elem,e)===false){b=false;break}}return b}}function pa(a,b){return"live."+(a&&a!=="*"?a+".":"")+b.replace(/\./g,"`").replace(/ /g,
"&")}function qa(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function ra(a,b){var d=0;b.each(function(){if(this.nodeName===(a[d]&&a[d].nodeName)){var f=c.data(a[d++]),e=c.data(this,f);if(f=f&&f.events){delete e.handle;e.events={};for(var j in f)for(var i in f[j])c.event.add(this,j,f[j][i],f[j][i].data)}}})}function sa(a,b,d){var f,e,j;b=b&&b[0]?b[0].ownerDocument||b[0]:s;if(a.length===1&&typeof a[0]==="string"&&a[0].length<512&&b===s&&!ta.test(a[0])&&(c.support.checkClone||!ua.test(a[0]))){e=
true;if(j=c.fragments[a[0]])if(j!==1)f=j}if(!f){f=b.createDocumentFragment();c.clean(a,b,f,d)}if(e)c.fragments[a[0]]=j?f:1;return{fragment:f,cacheable:e}}function K(a,b){var d={};c.each(va.concat.apply([],va.slice(0,b)),function(){d[this]=a});return d}function wa(a){return"scrollTo"in a&&a.document?a:a.nodeType===9?a.defaultView||a.parentWindow:false}var c=function(a,b){return new c.fn.init(a,b)},Ra=A.jQuery,Sa=A.$,s=A.document,T,Ta=/^[^<]*(<[\w\W]+>)[^>]*$|^#([\w-]+)$/,Ua=/^.[^:#\[\.,]*$/,Va=/\S/,
Wa=/^(\s|\u00A0)+|(\s|\u00A0)+$/g,Xa=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,P=navigator.userAgent,xa=false,Q=[],L,$=Object.prototype.toString,aa=Object.prototype.hasOwnProperty,ba=Array.prototype.push,R=Array.prototype.slice,ya=Array.prototype.indexOf;c.fn=c.prototype={init:function(a,b){var d,f;if(!a)return this;if(a.nodeType){this.context=this[0]=a;this.length=1;return this}if(a==="body"&&!b){this.context=s;this[0]=s.body;this.selector="body";this.length=1;return this}if(typeof a==="string")if((d=Ta.exec(a))&&
(d[1]||!b))if(d[1]){f=b?b.ownerDocument||b:s;if(a=Xa.exec(a))if(c.isPlainObject(b)){a=[s.createElement(a[1])];c.fn.attr.call(a,b,true)}else a=[f.createElement(a[1])];else{a=sa([d[1]],[f]);a=(a.cacheable?a.fragment.cloneNode(true):a.fragment).childNodes}return c.merge(this,a)}else{if(b=s.getElementById(d[2])){if(b.id!==d[2])return T.find(a);this.length=1;this[0]=b}this.context=s;this.selector=a;return this}else if(!b&&/^\w+$/.test(a)){this.selector=a;this.context=s;a=s.getElementsByTagName(a);return c.merge(this,
a)}else return!b||b.jquery?(b||T).find(a):c(b).find(a);else if(c.isFunction(a))return T.ready(a);if(a.selector!==w){this.selector=a.selector;this.context=a.context}return c.makeArray(a,this)},selector:"",jquery:"1.4.2",length:0,size:function(){return this.length},toArray:function(){return R.call(this,0)},get:function(a){return a==null?this.toArray():a<0?this.slice(a)[0]:this[a]},pushStack:function(a,b,d){var f=c();c.isArray(a)?ba.apply(f,a):c.merge(f,a);f.prevObject=this;f.context=this.context;if(b===
"find")f.selector=this.selector+(this.selector?" ":"")+d;else if(b)f.selector=this.selector+"."+b+"("+d+")";return f},each:function(a,b){return c.each(this,a,b)},ready:function(a){c.bindReady();if(c.isReady)a.call(s,c);else Q&&Q.push(a);return this},eq:function(a){return a===-1?this.slice(a):this.slice(a,+a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(R.apply(this,arguments),"slice",R.call(arguments).join(","))},map:function(a){return this.pushStack(c.map(this,
function(b,d){return a.call(b,d,b)}))},end:function(){return this.prevObject||c(null)},push:ba,sort:[].sort,splice:[].splice};c.fn.init.prototype=c.fn;c.extend=c.fn.extend=function(){var a=arguments[0]||{},b=1,d=arguments.length,f=false,e,j,i,o;if(typeof a==="boolean"){f=a;a=arguments[1]||{};b=2}if(typeof a!=="object"&&!c.isFunction(a))a={};if(d===b){a=this;--b}for(;b<d;b++)if((e=arguments[b])!=null)for(j in e){i=a[j];o=e[j];if(a!==o)if(f&&o&&(c.isPlainObject(o)||c.isArray(o))){i=i&&(c.isPlainObject(i)||
c.isArray(i))?i:c.isArray(o)?[]:{};a[j]=c.extend(f,i,o)}else if(o!==w)a[j]=o}return a};c.extend({noConflict:function(a){A.$=Sa;if(a)A.jQuery=Ra;return c},isReady:false,ready:function(){if(!c.isReady){if(!s.body)return setTimeout(c.ready,13);c.isReady=true;if(Q){for(var a,b=0;a=Q[b++];)a.call(s,c);Q=null}c.fn.triggerHandler&&c(s).triggerHandler("ready")}},bindReady:function(){if(!xa){xa=true;if(s.readyState==="complete")return c.ready();if(s.addEventListener){s.addEventListener("DOMContentLoaded",
L,false);A.addEventListener("load",c.ready,false)}else if(s.attachEvent){s.attachEvent("onreadystatechange",L);A.attachEvent("onload",c.ready);var a=false;try{a=A.frameElement==null}catch(b){}s.documentElement.doScroll&&a&&ma()}}},isFunction:function(a){return $.call(a)==="[object Function]"},isArray:function(a){return $.call(a)==="[object Array]"},isPlainObject:function(a){if(!a||$.call(a)!=="[object Object]"||a.nodeType||a.setInterval)return false;if(a.constructor&&!aa.call(a,"constructor")&&!aa.call(a.constructor.prototype,
"isPrototypeOf"))return false;var b;for(b in a);return b===w||aa.call(a,b)},isEmptyObject:function(a){for(var b in a)return false;return true},error:function(a){throw a;},parseJSON:function(a){if(typeof a!=="string"||!a)return null;a=c.trim(a);if(/^[\],:{}\s]*$/.test(a.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,"")))return A.JSON&&A.JSON.parse?A.JSON.parse(a):(new Function("return "+
a))();else c.error("Invalid JSON: "+a)},noop:function(){},globalEval:function(a){if(a&&Va.test(a)){var b=s.getElementsByTagName("head")[0]||s.documentElement,d=s.createElement("script");d.type="text/javascript";if(c.support.scriptEval)d.appendChild(s.createTextNode(a));else d.text=a;b.insertBefore(d,b.firstChild);b.removeChild(d)}},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,b,d){var f,e=0,j=a.length,i=j===w||c.isFunction(a);if(d)if(i)for(f in a){if(b.apply(a[f],
d)===false)break}else for(;e<j;){if(b.apply(a[e++],d)===false)break}else if(i)for(f in a){if(b.call(a[f],f,a[f])===false)break}else for(d=a[0];e<j&&b.call(d,e,d)!==false;d=a[++e]);return a},trim:function(a){return(a||"").replace(Wa,"")},makeArray:function(a,b){b=b||[];if(a!=null)a.length==null||typeof a==="string"||c.isFunction(a)||typeof a!=="function"&&a.setInterval?ba.call(b,a):c.merge(b,a);return b},inArray:function(a,b){if(b.indexOf)return b.indexOf(a);for(var d=0,f=b.length;d<f;d++)if(b[d]===
a)return d;return-1},merge:function(a,b){var d=a.length,f=0;if(typeof b.length==="number")for(var e=b.length;f<e;f++)a[d++]=b[f];else for(;b[f]!==w;)a[d++]=b[f++];a.length=d;return a},grep:function(a,b,d){for(var f=[],e=0,j=a.length;e<j;e++)!d!==!b(a[e],e)&&f.push(a[e]);return f},map:function(a,b,d){for(var f=[],e,j=0,i=a.length;j<i;j++){e=b(a[j],j,d);if(e!=null)f[f.length]=e}return f.concat.apply([],f)},guid:1,proxy:function(a,b,d){if(arguments.length===2)if(typeof b==="string"){d=a;a=d[b];b=w}else if(b&&
!c.isFunction(b)){d=b;b=w}if(!b&&a)b=function(){return a.apply(d||this,arguments)};if(a)b.guid=a.guid=a.guid||b.guid||c.guid++;return b},uaMatch:function(a){a=a.toLowerCase();a=/(webkit)[ \/]([\w.]+)/.exec(a)||/(opera)(?:.*version)?[ \/]([\w.]+)/.exec(a)||/(msie) ([\w.]+)/.exec(a)||!/compatible/.test(a)&&/(mozilla)(?:.*? rv:([\w.]+))?/.exec(a)||[];return{browser:a[1]||"",version:a[2]||"0"}},browser:{}});P=c.uaMatch(P);if(P.browser){c.browser[P.browser]=true;c.browser.version=P.version}if(c.browser.webkit)c.browser.safari=
true;if(ya)c.inArray=function(a,b){return ya.call(b,a)};T=c(s);if(s.addEventListener)L=function(){s.removeEventListener("DOMContentLoaded",L,false);c.ready()};else if(s.attachEvent)L=function(){if(s.readyState==="complete"){s.detachEvent("onreadystatechange",L);c.ready()}};(function(){c.support={};var a=s.documentElement,b=s.createElement("script"),d=s.createElement("div"),f="script"+J();d.style.display="none";d.innerHTML="   <link/><table></table><a href='/a' style='color:red;float:left;opacity:.55;'>a</a><input type='checkbox'/>";
var e=d.getElementsByTagName("*"),j=d.getElementsByTagName("a")[0];if(!(!e||!e.length||!j)){c.support={leadingWhitespace:d.firstChild.nodeType===3,tbody:!d.getElementsByTagName("tbody").length,htmlSerialize:!!d.getElementsByTagName("link").length,style:/red/.test(j.getAttribute("style")),hrefNormalized:j.getAttribute("href")==="/a",opacity:/^0.55$/.test(j.style.opacity),cssFloat:!!j.style.cssFloat,checkOn:d.getElementsByTagName("input")[0].value==="on",optSelected:s.createElement("select").appendChild(s.createElement("option")).selected,
parentNode:d.removeChild(d.appendChild(s.createElement("div"))).parentNode===null,deleteExpando:true,checkClone:false,scriptEval:false,noCloneEvent:true,boxModel:null};b.type="text/javascript";try{b.appendChild(s.createTextNode("window."+f+"=1;"))}catch(i){}a.insertBefore(b,a.firstChild);if(A[f]){c.support.scriptEval=true;delete A[f]}try{delete b.test}catch(o){c.support.deleteExpando=false}a.removeChild(b);if(d.attachEvent&&d.fireEvent){d.attachEvent("onclick",function k(){c.support.noCloneEvent=
false;d.detachEvent("onclick",k)});d.cloneNode(true).fireEvent("onclick")}d=s.createElement("div");d.innerHTML="<input type='radio' name='radiotest' checked='checked'/>";a=s.createDocumentFragment();a.appendChild(d.firstChild);c.support.checkClone=a.cloneNode(true).cloneNode(true).lastChild.checked;c(function(){var k=s.createElement("div");k.style.width=k.style.paddingLeft="1px";s.body.appendChild(k);c.boxModel=c.support.boxModel=k.offsetWidth===2;s.body.removeChild(k).style.display="none"});a=function(k){var n=
s.createElement("div");k="on"+k;var r=k in n;if(!r){n.setAttribute(k,"return;");r=typeof n[k]==="function"}return r};c.support.submitBubbles=a("submit");c.support.changeBubbles=a("change");a=b=d=e=j=null}})();c.props={"for":"htmlFor","class":"className",readonly:"readOnly",maxlength:"maxLength",cellspacing:"cellSpacing",rowspan:"rowSpan",colspan:"colSpan",tabindex:"tabIndex",usemap:"useMap",frameborder:"frameBorder"};var G="jQuery"+J(),Ya=0,za={};c.extend({cache:{},expando:G,noData:{embed:true,object:true,
applet:true},data:function(a,b,d){if(!(a.nodeName&&c.noData[a.nodeName.toLowerCase()])){a=a==A?za:a;var f=a[G],e=c.cache;if(!f&&typeof b==="string"&&d===w)return null;f||(f=++Ya);if(typeof b==="object"){a[G]=f;e[f]=c.extend(true,{},b)}else if(!e[f]){a[G]=f;e[f]={}}a=e[f];if(d!==w)a[b]=d;return typeof b==="string"?a[b]:a}},removeData:function(a,b){if(!(a.nodeName&&c.noData[a.nodeName.toLowerCase()])){a=a==A?za:a;var d=a[G],f=c.cache,e=f[d];if(b){if(e){delete e[b];c.isEmptyObject(e)&&c.removeData(a)}}else{if(c.support.deleteExpando)delete a[c.expando];
else a.removeAttribute&&a.removeAttribute(c.expando);delete f[d]}}}});c.fn.extend({data:function(a,b){if(typeof a==="undefined"&&this.length)return c.data(this[0]);else if(typeof a==="object")return this.each(function(){c.data(this,a)});var d=a.split(".");d[1]=d[1]?"."+d[1]:"";if(b===w){var f=this.triggerHandler("getData"+d[1]+"!",[d[0]]);if(f===w&&this.length)f=c.data(this[0],a);return f===w&&d[1]?this.data(d[0]):f}else return this.trigger("setData"+d[1]+"!",[d[0],b]).each(function(){c.data(this,
a,b)})},removeData:function(a){return this.each(function(){c.removeData(this,a)})}});c.extend({queue:function(a,b,d){if(a){b=(b||"fx")+"queue";var f=c.data(a,b);if(!d)return f||[];if(!f||c.isArray(d))f=c.data(a,b,c.makeArray(d));else f.push(d);return f}},dequeue:function(a,b){b=b||"fx";var d=c.queue(a,b),f=d.shift();if(f==="inprogress")f=d.shift();if(f){b==="fx"&&d.unshift("inprogress");f.call(a,function(){c.dequeue(a,b)})}}});c.fn.extend({queue:function(a,b){if(typeof a!=="string"){b=a;a="fx"}if(b===
w)return c.queue(this[0],a);return this.each(function(){var d=c.queue(this,a,b);a==="fx"&&d[0]!=="inprogress"&&c.dequeue(this,a)})},dequeue:function(a){return this.each(function(){c.dequeue(this,a)})},delay:function(a,b){a=c.fx?c.fx.speeds[a]||a:a;b=b||"fx";return this.queue(b,function(){var d=this;setTimeout(function(){c.dequeue(d,b)},a)})},clearQueue:function(a){return this.queue(a||"fx",[])}});var Aa=/[\n\t]/g,ca=/\s+/,Za=/\r/g,$a=/href|src|style/,ab=/(button|input)/i,bb=/(button|input|object|select|textarea)/i,
cb=/^(a|area)$/i,Ba=/radio|checkbox/;c.fn.extend({attr:function(a,b){return X(this,a,b,true,c.attr)},removeAttr:function(a){return this.each(function(){c.attr(this,a,"");this.nodeType===1&&this.removeAttribute(a)})},addClass:function(a){if(c.isFunction(a))return this.each(function(n){var r=c(this);r.addClass(a.call(this,n,r.attr("class")))});if(a&&typeof a==="string")for(var b=(a||"").split(ca),d=0,f=this.length;d<f;d++){var e=this[d];if(e.nodeType===1)if(e.className){for(var j=" "+e.className+" ",
i=e.className,o=0,k=b.length;o<k;o++)if(j.indexOf(" "+b[o]+" ")<0)i+=" "+b[o];e.className=c.trim(i)}else e.className=a}return this},removeClass:function(a){if(c.isFunction(a))return this.each(function(k){var n=c(this);n.removeClass(a.call(this,k,n.attr("class")))});if(a&&typeof a==="string"||a===w)for(var b=(a||"").split(ca),d=0,f=this.length;d<f;d++){var e=this[d];if(e.nodeType===1&&e.className)if(a){for(var j=(" "+e.className+" ").replace(Aa," "),i=0,o=b.length;i<o;i++)j=j.replace(" "+b[i]+" ",
" ");e.className=c.trim(j)}else e.className=""}return this},toggleClass:function(a,b){var d=typeof a,f=typeof b==="boolean";if(c.isFunction(a))return this.each(function(e){var j=c(this);j.toggleClass(a.call(this,e,j.attr("class"),b),b)});return this.each(function(){if(d==="string")for(var e,j=0,i=c(this),o=b,k=a.split(ca);e=k[j++];){o=f?o:!i.hasClass(e);i[o?"addClass":"removeClass"](e)}else if(d==="undefined"||d==="boolean"){this.className&&c.data(this,"__className__",this.className);this.className=
this.className||a===false?"":c.data(this,"__className__")||""}})},hasClass:function(a){a=" "+a+" ";for(var b=0,d=this.length;b<d;b++)if((" "+this[b].className+" ").replace(Aa," ").indexOf(a)>-1)return true;return false},val:function(a){if(a===w){var b=this[0];if(b){if(c.nodeName(b,"option"))return(b.attributes.value||{}).specified?b.value:b.text;if(c.nodeName(b,"select")){var d=b.selectedIndex,f=[],e=b.options;b=b.type==="select-one";if(d<0)return null;var j=b?d:0;for(d=b?d+1:e.length;j<d;j++){var i=
e[j];if(i.selected){a=c(i).val();if(b)return a;f.push(a)}}return f}if(Ba.test(b.type)&&!c.support.checkOn)return b.getAttribute("value")===null?"on":b.value;return(b.value||"").replace(Za,"")}return w}var o=c.isFunction(a);return this.each(function(k){var n=c(this),r=a;if(this.nodeType===1){if(o)r=a.call(this,k,n.val());if(typeof r==="number")r+="";if(c.isArray(r)&&Ba.test(this.type))this.checked=c.inArray(n.val(),r)>=0;else if(c.nodeName(this,"select")){var u=c.makeArray(r);c("option",this).each(function(){this.selected=
c.inArray(c(this).val(),u)>=0});if(!u.length)this.selectedIndex=-1}else this.value=r}})}});c.extend({attrFn:{val:true,css:true,html:true,text:true,data:true,width:true,height:true,offset:true},attr:function(a,b,d,f){if(!a||a.nodeType===3||a.nodeType===8)return w;if(f&&b in c.attrFn)return c(a)[b](d);f=a.nodeType!==1||!c.isXMLDoc(a);var e=d!==w;b=f&&c.props[b]||b;if(a.nodeType===1){var j=$a.test(b);if(b in a&&f&&!j){if(e){b==="type"&&ab.test(a.nodeName)&&a.parentNode&&c.error("type property can't be changed");
a[b]=d}if(c.nodeName(a,"form")&&a.getAttributeNode(b))return a.getAttributeNode(b).nodeValue;if(b==="tabIndex")return(b=a.getAttributeNode("tabIndex"))&&b.specified?b.value:bb.test(a.nodeName)||cb.test(a.nodeName)&&a.href?0:w;return a[b]}if(!c.support.style&&f&&b==="style"){if(e)a.style.cssText=""+d;return a.style.cssText}e&&a.setAttribute(b,""+d);a=!c.support.hrefNormalized&&f&&j?a.getAttribute(b,2):a.getAttribute(b);return a===null?w:a}return c.style(a,b,d)}});var O=/\.(.*)$/,db=function(a){return a.replace(/[^\w\s\.\|`]/g,
function(b){return"\\"+b})};c.event={add:function(a,b,d,f){if(!(a.nodeType===3||a.nodeType===8)){if(a.setInterval&&a!==A&&!a.frameElement)a=A;var e,j;if(d.handler){e=d;d=e.handler}if(!d.guid)d.guid=c.guid++;if(j=c.data(a)){var i=j.events=j.events||{},o=j.handle;if(!o)j.handle=o=function(){return typeof c!=="undefined"&&!c.event.triggered?c.event.handle.apply(o.elem,arguments):w};o.elem=a;b=b.split(" ");for(var k,n=0,r;k=b[n++];){j=e?c.extend({},e):{handler:d,data:f};if(k.indexOf(".")>-1){r=k.split(".");
k=r.shift();j.namespace=r.slice(0).sort().join(".")}else{r=[];j.namespace=""}j.type=k;j.guid=d.guid;var u=i[k],z=c.event.special[k]||{};if(!u){u=i[k]=[];if(!z.setup||z.setup.call(a,f,r,o)===false)if(a.addEventListener)a.addEventListener(k,o,false);else a.attachEvent&&a.attachEvent("on"+k,o)}if(z.add){z.add.call(a,j);if(!j.handler.guid)j.handler.guid=d.guid}u.push(j);c.event.global[k]=true}a=null}}},global:{},remove:function(a,b,d,f){if(!(a.nodeType===3||a.nodeType===8)){var e,j=0,i,o,k,n,r,u,z=c.data(a),
C=z&&z.events;if(z&&C){if(b&&b.type){d=b.handler;b=b.type}if(!b||typeof b==="string"&&b.charAt(0)==="."){b=b||"";for(e in C)c.event.remove(a,e+b)}else{for(b=b.split(" ");e=b[j++];){n=e;i=e.indexOf(".")<0;o=[];if(!i){o=e.split(".");e=o.shift();k=new RegExp("(^|\\.)"+c.map(o.slice(0).sort(),db).join("\\.(?:.*\\.)?")+"(\\.|$)")}if(r=C[e])if(d){n=c.event.special[e]||{};for(B=f||0;B<r.length;B++){u=r[B];if(d.guid===u.guid){if(i||k.test(u.namespace)){f==null&&r.splice(B--,1);n.remove&&n.remove.call(a,u)}if(f!=
null)break}}if(r.length===0||f!=null&&r.length===1){if(!n.teardown||n.teardown.call(a,o)===false)Ca(a,e,z.handle);delete C[e]}}else for(var B=0;B<r.length;B++){u=r[B];if(i||k.test(u.namespace)){c.event.remove(a,n,u.handler,B);r.splice(B--,1)}}}if(c.isEmptyObject(C)){if(b=z.handle)b.elem=null;delete z.events;delete z.handle;c.isEmptyObject(z)&&c.removeData(a)}}}}},trigger:function(a,b,d,f){var e=a.type||a;if(!f){a=typeof a==="object"?a[G]?a:c.extend(c.Event(e),a):c.Event(e);if(e.indexOf("!")>=0){a.type=
e=e.slice(0,-1);a.exclusive=true}if(!d){a.stopPropagation();c.event.global[e]&&c.each(c.cache,function(){this.events&&this.events[e]&&c.event.trigger(a,b,this.handle.elem)})}if(!d||d.nodeType===3||d.nodeType===8)return w;a.result=w;a.target=d;b=c.makeArray(b);b.unshift(a)}a.currentTarget=d;(f=c.data(d,"handle"))&&f.apply(d,b);f=d.parentNode||d.ownerDocument;try{if(!(d&&d.nodeName&&c.noData[d.nodeName.toLowerCase()]))if(d["on"+e]&&d["on"+e].apply(d,b)===false)a.result=false}catch(j){}if(!a.isPropagationStopped()&&
f)c.event.trigger(a,b,f,true);else if(!a.isDefaultPrevented()){f=a.target;var i,o=c.nodeName(f,"a")&&e==="click",k=c.event.special[e]||{};if((!k._default||k._default.call(d,a)===false)&&!o&&!(f&&f.nodeName&&c.noData[f.nodeName.toLowerCase()])){try{if(f[e]){if(i=f["on"+e])f["on"+e]=null;c.event.triggered=true;f[e]()}}catch(n){}if(i)f["on"+e]=i;c.event.triggered=false}}},handle:function(a){var b,d,f,e;a=arguments[0]=c.event.fix(a||A.event);a.currentTarget=this;b=a.type.indexOf(".")<0&&!a.exclusive;
if(!b){d=a.type.split(".");a.type=d.shift();f=new RegExp("(^|\\.)"+d.slice(0).sort().join("\\.(?:.*\\.)?")+"(\\.|$)")}e=c.data(this,"events");d=e[a.type];if(e&&d){d=d.slice(0);e=0;for(var j=d.length;e<j;e++){var i=d[e];if(b||f.test(i.namespace)){a.handler=i.handler;a.data=i.data;a.handleObj=i;i=i.handler.apply(this,arguments);if(i!==w){a.result=i;if(i===false){a.preventDefault();a.stopPropagation()}}if(a.isImmediatePropagationStopped())break}}}return a.result},props:"altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY originalTarget pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which".split(" "),
fix:function(a){if(a[G])return a;var b=a;a=c.Event(b);for(var d=this.props.length,f;d;){f=this.props[--d];a[f]=b[f]}if(!a.target)a.target=a.srcElement||s;if(a.target.nodeType===3)a.target=a.target.parentNode;if(!a.relatedTarget&&a.fromElement)a.relatedTarget=a.fromElement===a.target?a.toElement:a.fromElement;if(a.pageX==null&&a.clientX!=null){b=s.documentElement;d=s.body;a.pageX=a.clientX+(b&&b.scrollLeft||d&&d.scrollLeft||0)-(b&&b.clientLeft||d&&d.clientLeft||0);a.pageY=a.clientY+(b&&b.scrollTop||
d&&d.scrollTop||0)-(b&&b.clientTop||d&&d.clientTop||0)}if(!a.which&&(a.charCode||a.charCode===0?a.charCode:a.keyCode))a.which=a.charCode||a.keyCode;if(!a.metaKey&&a.ctrlKey)a.metaKey=a.ctrlKey;if(!a.which&&a.button!==w)a.which=a.button&1?1:a.button&2?3:a.button&4?2:0;return a},guid:1E8,proxy:c.proxy,special:{ready:{setup:c.bindReady,teardown:c.noop},live:{add:function(a){c.event.add(this,a.origType,c.extend({},a,{handler:oa}))},remove:function(a){var b=true,d=a.origType.replace(O,"");c.each(c.data(this,
"events").live||[],function(){if(d===this.origType.replace(O,""))return b=false});b&&c.event.remove(this,a.origType,oa)}},beforeunload:{setup:function(a,b,d){if(this.setInterval)this.onbeforeunload=d;return false},teardown:function(a,b){if(this.onbeforeunload===b)this.onbeforeunload=null}}}};var Ca=s.removeEventListener?function(a,b,d){a.removeEventListener(b,d,false)}:function(a,b,d){a.detachEvent("on"+b,d)};c.Event=function(a){if(!this.preventDefault)return new c.Event(a);if(a&&a.type){this.originalEvent=
a;this.type=a.type}else this.type=a;this.timeStamp=J();this[G]=true};c.Event.prototype={preventDefault:function(){this.isDefaultPrevented=Z;var a=this.originalEvent;if(a){a.preventDefault&&a.preventDefault();a.returnValue=false}},stopPropagation:function(){this.isPropagationStopped=Z;var a=this.originalEvent;if(a){a.stopPropagation&&a.stopPropagation();a.cancelBubble=true}},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=Z;this.stopPropagation()},isDefaultPrevented:Y,isPropagationStopped:Y,
isImmediatePropagationStopped:Y};var Da=function(a){var b=a.relatedTarget;try{for(;b&&b!==this;)b=b.parentNode;if(b!==this){a.type=a.data;c.event.handle.apply(this,arguments)}}catch(d){}},Ea=function(a){a.type=a.data;c.event.handle.apply(this,arguments)};c.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){c.event.special[a]={setup:function(d){c.event.add(this,b,d&&d.selector?Ea:Da,a)},teardown:function(d){c.event.remove(this,b,d&&d.selector?Ea:Da)}}});if(!c.support.submitBubbles)c.event.special.submit=
{setup:function(){if(this.nodeName.toLowerCase()!=="form"){c.event.add(this,"click.specialSubmit",function(a){var b=a.target,d=b.type;if((d==="submit"||d==="image")&&c(b).closest("form").length)return na("submit",this,arguments)});c.event.add(this,"keypress.specialSubmit",function(a){var b=a.target,d=b.type;if((d==="text"||d==="password")&&c(b).closest("form").length&&a.keyCode===13)return na("submit",this,arguments)})}else return false},teardown:function(){c.event.remove(this,".specialSubmit")}};
if(!c.support.changeBubbles){var da=/textarea|input|select/i,ea,Fa=function(a){var b=a.type,d=a.value;if(b==="radio"||b==="checkbox")d=a.checked;else if(b==="select-multiple")d=a.selectedIndex>-1?c.map(a.options,function(f){return f.selected}).join("-"):"";else if(a.nodeName.toLowerCase()==="select")d=a.selectedIndex;return d},fa=function(a,b){var d=a.target,f,e;if(!(!da.test(d.nodeName)||d.readOnly)){f=c.data(d,"_change_data");e=Fa(d);if(a.type!=="focusout"||d.type!=="radio")c.data(d,"_change_data",
e);if(!(f===w||e===f))if(f!=null||e){a.type="change";return c.event.trigger(a,b,d)}}};c.event.special.change={filters:{focusout:fa,click:function(a){var b=a.target,d=b.type;if(d==="radio"||d==="checkbox"||b.nodeName.toLowerCase()==="select")return fa.call(this,a)},keydown:function(a){var b=a.target,d=b.type;if(a.keyCode===13&&b.nodeName.toLowerCase()!=="textarea"||a.keyCode===32&&(d==="checkbox"||d==="radio")||d==="select-multiple")return fa.call(this,a)},beforeactivate:function(a){a=a.target;c.data(a,
"_change_data",Fa(a))}},setup:function(){if(this.type==="file")return false;for(var a in ea)c.event.add(this,a+".specialChange",ea[a]);return da.test(this.nodeName)},teardown:function(){c.event.remove(this,".specialChange");return da.test(this.nodeName)}};ea=c.event.special.change.filters}s.addEventListener&&c.each({focus:"focusin",blur:"focusout"},function(a,b){function d(f){f=c.event.fix(f);f.type=b;return c.event.handle.call(this,f)}c.event.special[b]={setup:function(){this.addEventListener(a,
d,true)},teardown:function(){this.removeEventListener(a,d,true)}}});c.each(["bind","one"],function(a,b){c.fn[b]=function(d,f,e){if(typeof d==="object"){for(var j in d)this[b](j,f,d[j],e);return this}if(c.isFunction(f)){e=f;f=w}var i=b==="one"?c.proxy(e,function(k){c(this).unbind(k,i);return e.apply(this,arguments)}):e;if(d==="unload"&&b!=="one")this.one(d,f,e);else{j=0;for(var o=this.length;j<o;j++)c.event.add(this[j],d,i,f)}return this}});c.fn.extend({unbind:function(a,b){if(typeof a==="object"&&
!a.preventDefault)for(var d in a)this.unbind(d,a[d]);else{d=0;for(var f=this.length;d<f;d++)c.event.remove(this[d],a,b)}return this},delegate:function(a,b,d,f){return this.live(b,d,f,a)},undelegate:function(a,b,d){return arguments.length===0?this.unbind("live"):this.die(b,null,d,a)},trigger:function(a,b){return this.each(function(){c.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0]){a=c.Event(a);a.preventDefault();a.stopPropagation();c.event.trigger(a,b,this[0]);return a.result}},
toggle:function(a){for(var b=arguments,d=1;d<b.length;)c.proxy(a,b[d++]);return this.click(c.proxy(a,function(f){var e=(c.data(this,"lastToggle"+a.guid)||0)%d;c.data(this,"lastToggle"+a.guid,e+1);f.preventDefault();return b[e].apply(this,arguments)||false}))},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}});var Ga={focus:"focusin",blur:"focusout",mouseenter:"mouseover",mouseleave:"mouseout"};c.each(["live","die"],function(a,b){c.fn[b]=function(d,f,e,j){var i,o=0,k,n,r=j||this.selector,
u=j?this:c(this.context);if(c.isFunction(f)){e=f;f=w}for(d=(d||"").split(" ");(i=d[o++])!=null;){j=O.exec(i);k="";if(j){k=j[0];i=i.replace(O,"")}if(i==="hover")d.push("mouseenter"+k,"mouseleave"+k);else{n=i;if(i==="focus"||i==="blur"){d.push(Ga[i]+k);i+=k}else i=(Ga[i]||i)+k;b==="live"?u.each(function(){c.event.add(this,pa(i,r),{data:f,selector:r,handler:e,origType:i,origHandler:e,preType:n})}):u.unbind(pa(i,r),e)}}return this}});c.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error".split(" "),
function(a,b){c.fn[b]=function(d){return d?this.bind(b,d):this.trigger(b)};if(c.attrFn)c.attrFn[b]=true});A.attachEvent&&!A.addEventListener&&A.attachEvent("onunload",function(){for(var a in c.cache)if(c.cache[a].handle)try{c.event.remove(c.cache[a].handle.elem)}catch(b){}});(function(){function a(g){for(var h="",l,m=0;g[m];m++){l=g[m];if(l.nodeType===3||l.nodeType===4)h+=l.nodeValue;else if(l.nodeType!==8)h+=a(l.childNodes)}return h}function b(g,h,l,m,q,p){q=0;for(var v=m.length;q<v;q++){var t=m[q];
if(t){t=t[g];for(var y=false;t;){if(t.sizcache===l){y=m[t.sizset];break}if(t.nodeType===1&&!p){t.sizcache=l;t.sizset=q}if(t.nodeName.toLowerCase()===h){y=t;break}t=t[g]}m[q]=y}}}function d(g,h,l,m,q,p){q=0;for(var v=m.length;q<v;q++){var t=m[q];if(t){t=t[g];for(var y=false;t;){if(t.sizcache===l){y=m[t.sizset];break}if(t.nodeType===1){if(!p){t.sizcache=l;t.sizset=q}if(typeof h!=="string"){if(t===h){y=true;break}}else if(k.filter(h,[t]).length>0){y=t;break}}t=t[g]}m[q]=y}}}var f=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
e=0,j=Object.prototype.toString,i=false,o=true;[0,0].sort(function(){o=false;return 0});var k=function(g,h,l,m){l=l||[];var q=h=h||s;if(h.nodeType!==1&&h.nodeType!==9)return[];if(!g||typeof g!=="string")return l;for(var p=[],v,t,y,S,H=true,M=x(h),I=g;(f.exec(""),v=f.exec(I))!==null;){I=v[3];p.push(v[1]);if(v[2]){S=v[3];break}}if(p.length>1&&r.exec(g))if(p.length===2&&n.relative[p[0]])t=ga(p[0]+p[1],h);else for(t=n.relative[p[0]]?[h]:k(p.shift(),h);p.length;){g=p.shift();if(n.relative[g])g+=p.shift();
t=ga(g,t)}else{if(!m&&p.length>1&&h.nodeType===9&&!M&&n.match.ID.test(p[0])&&!n.match.ID.test(p[p.length-1])){v=k.find(p.shift(),h,M);h=v.expr?k.filter(v.expr,v.set)[0]:v.set[0]}if(h){v=m?{expr:p.pop(),set:z(m)}:k.find(p.pop(),p.length===1&&(p[0]==="~"||p[0]==="+")&&h.parentNode?h.parentNode:h,M);t=v.expr?k.filter(v.expr,v.set):v.set;if(p.length>0)y=z(t);else H=false;for(;p.length;){var D=p.pop();v=D;if(n.relative[D])v=p.pop();else D="";if(v==null)v=h;n.relative[D](y,v,M)}}else y=[]}y||(y=t);y||k.error(D||
g);if(j.call(y)==="[object Array]")if(H)if(h&&h.nodeType===1)for(g=0;y[g]!=null;g++){if(y[g]&&(y[g]===true||y[g].nodeType===1&&E(h,y[g])))l.push(t[g])}else for(g=0;y[g]!=null;g++)y[g]&&y[g].nodeType===1&&l.push(t[g]);else l.push.apply(l,y);else z(y,l);if(S){k(S,q,l,m);k.uniqueSort(l)}return l};k.uniqueSort=function(g){if(B){i=o;g.sort(B);if(i)for(var h=1;h<g.length;h++)g[h]===g[h-1]&&g.splice(h--,1)}return g};k.matches=function(g,h){return k(g,null,null,h)};k.find=function(g,h,l){var m,q;if(!g)return[];
for(var p=0,v=n.order.length;p<v;p++){var t=n.order[p];if(q=n.leftMatch[t].exec(g)){var y=q[1];q.splice(1,1);if(y.substr(y.length-1)!=="\\"){q[1]=(q[1]||"").replace(/\\/g,"");m=n.find[t](q,h,l);if(m!=null){g=g.replace(n.match[t],"");break}}}}m||(m=h.getElementsByTagName("*"));return{set:m,expr:g}};k.filter=function(g,h,l,m){for(var q=g,p=[],v=h,t,y,S=h&&h[0]&&x(h[0]);g&&h.length;){for(var H in n.filter)if((t=n.leftMatch[H].exec(g))!=null&&t[2]){var M=n.filter[H],I,D;D=t[1];y=false;t.splice(1,1);if(D.substr(D.length-
1)!=="\\"){if(v===p)p=[];if(n.preFilter[H])if(t=n.preFilter[H](t,v,l,p,m,S)){if(t===true)continue}else y=I=true;if(t)for(var U=0;(D=v[U])!=null;U++)if(D){I=M(D,t,U,v);var Ha=m^!!I;if(l&&I!=null)if(Ha)y=true;else v[U]=false;else if(Ha){p.push(D);y=true}}if(I!==w){l||(v=p);g=g.replace(n.match[H],"");if(!y)return[];break}}}if(g===q)if(y==null)k.error(g);else break;q=g}return v};k.error=function(g){throw"Syntax error, unrecognized expression: "+g;};var n=k.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
CLASS:/\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(g){return g.getAttribute("href")}},
relative:{"+":function(g,h){var l=typeof h==="string",m=l&&!/\W/.test(h);l=l&&!m;if(m)h=h.toLowerCase();m=0;for(var q=g.length,p;m<q;m++)if(p=g[m]){for(;(p=p.previousSibling)&&p.nodeType!==1;);g[m]=l||p&&p.nodeName.toLowerCase()===h?p||false:p===h}l&&k.filter(h,g,true)},">":function(g,h){var l=typeof h==="string";if(l&&!/\W/.test(h)){h=h.toLowerCase();for(var m=0,q=g.length;m<q;m++){var p=g[m];if(p){l=p.parentNode;g[m]=l.nodeName.toLowerCase()===h?l:false}}}else{m=0;for(q=g.length;m<q;m++)if(p=g[m])g[m]=
l?p.parentNode:p.parentNode===h;l&&k.filter(h,g,true)}},"":function(g,h,l){var m=e++,q=d;if(typeof h==="string"&&!/\W/.test(h)){var p=h=h.toLowerCase();q=b}q("parentNode",h,m,g,p,l)},"~":function(g,h,l){var m=e++,q=d;if(typeof h==="string"&&!/\W/.test(h)){var p=h=h.toLowerCase();q=b}q("previousSibling",h,m,g,p,l)}},find:{ID:function(g,h,l){if(typeof h.getElementById!=="undefined"&&!l)return(g=h.getElementById(g[1]))?[g]:[]},NAME:function(g,h){if(typeof h.getElementsByName!=="undefined"){var l=[];
h=h.getElementsByName(g[1]);for(var m=0,q=h.length;m<q;m++)h[m].getAttribute("name")===g[1]&&l.push(h[m]);return l.length===0?null:l}},TAG:function(g,h){return h.getElementsByTagName(g[1])}},preFilter:{CLASS:function(g,h,l,m,q,p){g=" "+g[1].replace(/\\/g,"")+" ";if(p)return g;p=0;for(var v;(v=h[p])!=null;p++)if(v)if(q^(v.className&&(" "+v.className+" ").replace(/[\t\n]/g," ").indexOf(g)>=0))l||m.push(v);else if(l)h[p]=false;return false},ID:function(g){return g[1].replace(/\\/g,"")},TAG:function(g){return g[1].toLowerCase()},
CHILD:function(g){if(g[1]==="nth"){var h=/(-?)(\d*)n((?:\+|-)?\d*)/.exec(g[2]==="even"&&"2n"||g[2]==="odd"&&"2n+1"||!/\D/.test(g[2])&&"0n+"+g[2]||g[2]);g[2]=h[1]+(h[2]||1)-0;g[3]=h[3]-0}g[0]=e++;return g},ATTR:function(g,h,l,m,q,p){h=g[1].replace(/\\/g,"");if(!p&&n.attrMap[h])g[1]=n.attrMap[h];if(g[2]==="~=")g[4]=" "+g[4]+" ";return g},PSEUDO:function(g,h,l,m,q){if(g[1]==="not")if((f.exec(g[3])||"").length>1||/^\w/.test(g[3]))g[3]=k(g[3],null,null,h);else{g=k.filter(g[3],h,l,true^q);l||m.push.apply(m,
g);return false}else if(n.match.POS.test(g[0])||n.match.CHILD.test(g[0]))return true;return g},POS:function(g){g.unshift(true);return g}},filters:{enabled:function(g){return g.disabled===false&&g.type!=="hidden"},disabled:function(g){return g.disabled===true},checked:function(g){return g.checked===true},selected:function(g){return g.selected===true},parent:function(g){return!!g.firstChild},empty:function(g){return!g.firstChild},has:function(g,h,l){return!!k(l[3],g).length},header:function(g){return/h\d/i.test(g.nodeName)},
text:function(g){return"text"===g.type},radio:function(g){return"radio"===g.type},checkbox:function(g){return"checkbox"===g.type},file:function(g){return"file"===g.type},password:function(g){return"password"===g.type},submit:function(g){return"submit"===g.type},image:function(g){return"image"===g.type},reset:function(g){return"reset"===g.type},button:function(g){return"button"===g.type||g.nodeName.toLowerCase()==="button"},input:function(g){return/input|select|textarea|button/i.test(g.nodeName)}},
setFilters:{first:function(g,h){return h===0},last:function(g,h,l,m){return h===m.length-1},even:function(g,h){return h%2===0},odd:function(g,h){return h%2===1},lt:function(g,h,l){return h<l[3]-0},gt:function(g,h,l){return h>l[3]-0},nth:function(g,h,l){return l[3]-0===h},eq:function(g,h,l){return l[3]-0===h}},filter:{PSEUDO:function(g,h,l,m){var q=h[1],p=n.filters[q];if(p)return p(g,l,h,m);else if(q==="contains")return(g.textContent||g.innerText||a([g])||"").indexOf(h[3])>=0;else if(q==="not"){h=
h[3];l=0;for(m=h.length;l<m;l++)if(h[l]===g)return false;return true}else k.error("Syntax error, unrecognized expression: "+q)},CHILD:function(g,h){var l=h[1],m=g;switch(l){case "only":case "first":for(;m=m.previousSibling;)if(m.nodeType===1)return false;if(l==="first")return true;m=g;case "last":for(;m=m.nextSibling;)if(m.nodeType===1)return false;return true;case "nth":l=h[2];var q=h[3];if(l===1&&q===0)return true;h=h[0];var p=g.parentNode;if(p&&(p.sizcache!==h||!g.nodeIndex)){var v=0;for(m=p.firstChild;m;m=
m.nextSibling)if(m.nodeType===1)m.nodeIndex=++v;p.sizcache=h}g=g.nodeIndex-q;return l===0?g===0:g%l===0&&g/l>=0}},ID:function(g,h){return g.nodeType===1&&g.getAttribute("id")===h},TAG:function(g,h){return h==="*"&&g.nodeType===1||g.nodeName.toLowerCase()===h},CLASS:function(g,h){return(" "+(g.className||g.getAttribute("class"))+" ").indexOf(h)>-1},ATTR:function(g,h){var l=h[1];g=n.attrHandle[l]?n.attrHandle[l](g):g[l]!=null?g[l]:g.getAttribute(l);l=g+"";var m=h[2];h=h[4];return g==null?m==="!=":m===
"="?l===h:m==="*="?l.indexOf(h)>=0:m==="~="?(" "+l+" ").indexOf(h)>=0:!h?l&&g!==false:m==="!="?l!==h:m==="^="?l.indexOf(h)===0:m==="$="?l.substr(l.length-h.length)===h:m==="|="?l===h||l.substr(0,h.length+1)===h+"-":false},POS:function(g,h,l,m){var q=n.setFilters[h[2]];if(q)return q(g,l,h,m)}}},r=n.match.POS;for(var u in n.match){n.match[u]=new RegExp(n.match[u].source+/(?![^\[]*\])(?![^\(]*\))/.source);n.leftMatch[u]=new RegExp(/(^(?:.|\r|\n)*?)/.source+n.match[u].source.replace(/\\(\d+)/g,function(g,
h){return"\\"+(h-0+1)}))}var z=function(g,h){g=Array.prototype.slice.call(g,0);if(h){h.push.apply(h,g);return h}return g};try{Array.prototype.slice.call(s.documentElement.childNodes,0)}catch(C){z=function(g,h){h=h||[];if(j.call(g)==="[object Array]")Array.prototype.push.apply(h,g);else if(typeof g.length==="number")for(var l=0,m=g.length;l<m;l++)h.push(g[l]);else for(l=0;g[l];l++)h.push(g[l]);return h}}var B;if(s.documentElement.compareDocumentPosition)B=function(g,h){if(!g.compareDocumentPosition||
!h.compareDocumentPosition){if(g==h)i=true;return g.compareDocumentPosition?-1:1}g=g.compareDocumentPosition(h)&4?-1:g===h?0:1;if(g===0)i=true;return g};else if("sourceIndex"in s.documentElement)B=function(g,h){if(!g.sourceIndex||!h.sourceIndex){if(g==h)i=true;return g.sourceIndex?-1:1}g=g.sourceIndex-h.sourceIndex;if(g===0)i=true;return g};else if(s.createRange)B=function(g,h){if(!g.ownerDocument||!h.ownerDocument){if(g==h)i=true;return g.ownerDocument?-1:1}var l=g.ownerDocument.createRange(),m=
h.ownerDocument.createRange();l.setStart(g,0);l.setEnd(g,0);m.setStart(h,0);m.setEnd(h,0);g=l.compareBoundaryPoints(Range.START_TO_END,m);if(g===0)i=true;return g};(function(){var g=s.createElement("div"),h="script"+(new Date).getTime();g.innerHTML="<a name='"+h+"'/>";var l=s.documentElement;l.insertBefore(g,l.firstChild);if(s.getElementById(h)){n.find.ID=function(m,q,p){if(typeof q.getElementById!=="undefined"&&!p)return(q=q.getElementById(m[1]))?q.id===m[1]||typeof q.getAttributeNode!=="undefined"&&
q.getAttributeNode("id").nodeValue===m[1]?[q]:w:[]};n.filter.ID=function(m,q){var p=typeof m.getAttributeNode!=="undefined"&&m.getAttributeNode("id");return m.nodeType===1&&p&&p.nodeValue===q}}l.removeChild(g);l=g=null})();(function(){var g=s.createElement("div");g.appendChild(s.createComment(""));if(g.getElementsByTagName("*").length>0)n.find.TAG=function(h,l){l=l.getElementsByTagName(h[1]);if(h[1]==="*"){h=[];for(var m=0;l[m];m++)l[m].nodeType===1&&h.push(l[m]);l=h}return l};g.innerHTML="<a href='#'></a>";
if(g.firstChild&&typeof g.firstChild.getAttribute!=="undefined"&&g.firstChild.getAttribute("href")!=="#")n.attrHandle.href=function(h){return h.getAttribute("href",2)};g=null})();s.querySelectorAll&&function(){var g=k,h=s.createElement("div");h.innerHTML="<p class='TEST'></p>";if(!(h.querySelectorAll&&h.querySelectorAll(".TEST").length===0)){k=function(m,q,p,v){q=q||s;if(!v&&q.nodeType===9&&!x(q))try{return z(q.querySelectorAll(m),p)}catch(t){}return g(m,q,p,v)};for(var l in g)k[l]=g[l];h=null}}();
(function(){var g=s.createElement("div");g.innerHTML="<div class='test e'></div><div class='test'></div>";if(!(!g.getElementsByClassName||g.getElementsByClassName("e").length===0)){g.lastChild.className="e";if(g.getElementsByClassName("e").length!==1){n.order.splice(1,0,"CLASS");n.find.CLASS=function(h,l,m){if(typeof l.getElementsByClassName!=="undefined"&&!m)return l.getElementsByClassName(h[1])};g=null}}})();var E=s.compareDocumentPosition?function(g,h){return!!(g.compareDocumentPosition(h)&16)}:
function(g,h){return g!==h&&(g.contains?g.contains(h):true)},x=function(g){return(g=(g?g.ownerDocument||g:0).documentElement)?g.nodeName!=="HTML":false},ga=function(g,h){var l=[],m="",q;for(h=h.nodeType?[h]:h;q=n.match.PSEUDO.exec(g);){m+=q[0];g=g.replace(n.match.PSEUDO,"")}g=n.relative[g]?g+"*":g;q=0;for(var p=h.length;q<p;q++)k(g,h[q],l);return k.filter(m,l)};c.find=k;c.expr=k.selectors;c.expr[":"]=c.expr.filters;c.unique=k.uniqueSort;c.text=a;c.isXMLDoc=x;c.contains=E})();var eb=/Until$/,fb=/^(?:parents|prevUntil|prevAll)/,
gb=/,/;R=Array.prototype.slice;var Ia=function(a,b,d){if(c.isFunction(b))return c.grep(a,function(e,j){return!!b.call(e,j,e)===d});else if(b.nodeType)return c.grep(a,function(e){return e===b===d});else if(typeof b==="string"){var f=c.grep(a,function(e){return e.nodeType===1});if(Ua.test(b))return c.filter(b,f,!d);else b=c.filter(b,f)}return c.grep(a,function(e){return c.inArray(e,b)>=0===d})};c.fn.extend({find:function(a){for(var b=this.pushStack("","find",a),d=0,f=0,e=this.length;f<e;f++){d=b.length;
c.find(a,this[f],b);if(f>0)for(var j=d;j<b.length;j++)for(var i=0;i<d;i++)if(b[i]===b[j]){b.splice(j--,1);break}}return b},has:function(a){var b=c(a);return this.filter(function(){for(var d=0,f=b.length;d<f;d++)if(c.contains(this,b[d]))return true})},not:function(a){return this.pushStack(Ia(this,a,false),"not",a)},filter:function(a){return this.pushStack(Ia(this,a,true),"filter",a)},is:function(a){return!!a&&c.filter(a,this).length>0},closest:function(a,b){if(c.isArray(a)){var d=[],f=this[0],e,j=
{},i;if(f&&a.length){e=0;for(var o=a.length;e<o;e++){i=a[e];j[i]||(j[i]=c.expr.match.POS.test(i)?c(i,b||this.context):i)}for(;f&&f.ownerDocument&&f!==b;){for(i in j){e=j[i];if(e.jquery?e.index(f)>-1:c(f).is(e)){d.push({selector:i,elem:f});delete j[i]}}f=f.parentNode}}return d}var k=c.expr.match.POS.test(a)?c(a,b||this.context):null;return this.map(function(n,r){for(;r&&r.ownerDocument&&r!==b;){if(k?k.index(r)>-1:c(r).is(a))return r;r=r.parentNode}return null})},index:function(a){if(!a||typeof a===
"string")return c.inArray(this[0],a?c(a):this.parent().children());return c.inArray(a.jquery?a[0]:a,this)},add:function(a,b){a=typeof a==="string"?c(a,b||this.context):c.makeArray(a);b=c.merge(this.get(),a);return this.pushStack(qa(a[0])||qa(b[0])?b:c.unique(b))},andSelf:function(){return this.add(this.prevObject)}});c.each({parent:function(a){return(a=a.parentNode)&&a.nodeType!==11?a:null},parents:function(a){return c.dir(a,"parentNode")},parentsUntil:function(a,b,d){return c.dir(a,"parentNode",
d)},next:function(a){return c.nth(a,2,"nextSibling")},prev:function(a){return c.nth(a,2,"previousSibling")},nextAll:function(a){return c.dir(a,"nextSibling")},prevAll:function(a){return c.dir(a,"previousSibling")},nextUntil:function(a,b,d){return c.dir(a,"nextSibling",d)},prevUntil:function(a,b,d){return c.dir(a,"previousSibling",d)},siblings:function(a){return c.sibling(a.parentNode.firstChild,a)},children:function(a){return c.sibling(a.firstChild)},contents:function(a){return c.nodeName(a,"iframe")?
a.contentDocument||a.contentWindow.document:c.makeArray(a.childNodes)}},function(a,b){c.fn[a]=function(d,f){var e=c.map(this,b,d);eb.test(a)||(f=d);if(f&&typeof f==="string")e=c.filter(f,e);e=this.length>1?c.unique(e):e;if((this.length>1||gb.test(f))&&fb.test(a))e=e.reverse();return this.pushStack(e,a,R.call(arguments).join(","))}});c.extend({filter:function(a,b,d){if(d)a=":not("+a+")";return c.find.matches(a,b)},dir:function(a,b,d){var f=[];for(a=a[b];a&&a.nodeType!==9&&(d===w||a.nodeType!==1||!c(a).is(d));){a.nodeType===
1&&f.push(a);a=a[b]}return f},nth:function(a,b,d){b=b||1;for(var f=0;a;a=a[d])if(a.nodeType===1&&++f===b)break;return a},sibling:function(a,b){for(var d=[];a;a=a.nextSibling)a.nodeType===1&&a!==b&&d.push(a);return d}});var Ja=/ jQuery\d+="(?:\d+|null)"/g,V=/^\s+/,Ka=/(<([\w:]+)[^>]*?)\/>/g,hb=/^(?:area|br|col|embed|hr|img|input|link|meta|param)$/i,La=/<([\w:]+)/,ib=/<tbody/i,jb=/<|&#?\w+;/,ta=/<script|<object|<embed|<option|<style/i,ua=/checked\s*(?:[^=]|=\s*.checked.)/i,Ma=function(a,b,d){return hb.test(d)?
a:b+"></"+d+">"},F={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]};F.optgroup=F.option;F.tbody=F.tfoot=F.colgroup=F.caption=F.thead;F.th=F.td;if(!c.support.htmlSerialize)F._default=[1,"div<div>","</div>"];c.fn.extend({text:function(a){if(c.isFunction(a))return this.each(function(b){var d=
c(this);d.text(a.call(this,b,d.text()))});if(typeof a!=="object"&&a!==w)return this.empty().append((this[0]&&this[0].ownerDocument||s).createTextNode(a));return c.text(this)},wrapAll:function(a){if(c.isFunction(a))return this.each(function(d){c(this).wrapAll(a.call(this,d))});if(this[0]){var b=c(a,this[0].ownerDocument).eq(0).clone(true);this[0].parentNode&&b.insertBefore(this[0]);b.map(function(){for(var d=this;d.firstChild&&d.firstChild.nodeType===1;)d=d.firstChild;return d}).append(this)}return this},
wrapInner:function(a){if(c.isFunction(a))return this.each(function(b){c(this).wrapInner(a.call(this,b))});return this.each(function(){var b=c(this),d=b.contents();d.length?d.wrapAll(a):b.append(a)})},wrap:function(a){return this.each(function(){c(this).wrapAll(a)})},unwrap:function(){return this.parent().each(function(){c.nodeName(this,"body")||c(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,true,function(a){this.nodeType===1&&this.appendChild(a)})},
prepend:function(){return this.domManip(arguments,true,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,false,function(b){this.parentNode.insertBefore(b,this)});else if(arguments.length){var a=c(arguments[0]);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,false,function(b){this.parentNode.insertBefore(b,
this.nextSibling)});else if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,c(arguments[0]).toArray());return a}},remove:function(a,b){for(var d=0,f;(f=this[d])!=null;d++)if(!a||c.filter(a,[f]).length){if(!b&&f.nodeType===1){c.cleanData(f.getElementsByTagName("*"));c.cleanData([f])}f.parentNode&&f.parentNode.removeChild(f)}return this},empty:function(){for(var a=0,b;(b=this[a])!=null;a++)for(b.nodeType===1&&c.cleanData(b.getElementsByTagName("*"));b.firstChild;)b.removeChild(b.firstChild);
return this},clone:function(a){var b=this.map(function(){if(!c.support.noCloneEvent&&!c.isXMLDoc(this)){var d=this.outerHTML,f=this.ownerDocument;if(!d){d=f.createElement("div");d.appendChild(this.cloneNode(true));d=d.innerHTML}return c.clean([d.replace(Ja,"").replace(/=([^="'>\s]+\/)>/g,'="$1">').replace(V,"")],f)[0]}else return this.cloneNode(true)});if(a===true){ra(this,b);ra(this.find("*"),b.find("*"))}return b},html:function(a){if(a===w)return this[0]&&this[0].nodeType===1?this[0].innerHTML.replace(Ja,
""):null;else if(typeof a==="string"&&!ta.test(a)&&(c.support.leadingWhitespace||!V.test(a))&&!F[(La.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(Ka,Ma);try{for(var b=0,d=this.length;b<d;b++)if(this[b].nodeType===1){c.cleanData(this[b].getElementsByTagName("*"));this[b].innerHTML=a}}catch(f){this.empty().append(a)}}else c.isFunction(a)?this.each(function(e){var j=c(this),i=j.html();j.empty().append(function(){return a.call(this,e,i)})}):this.empty().append(a);return this},replaceWith:function(a){if(this[0]&&
this[0].parentNode){if(c.isFunction(a))return this.each(function(b){var d=c(this),f=d.html();d.replaceWith(a.call(this,b,f))});if(typeof a!=="string")a=c(a).detach();return this.each(function(){var b=this.nextSibling,d=this.parentNode;c(this).remove();b?c(b).before(a):c(d).append(a)})}else return this.pushStack(c(c.isFunction(a)?a():a),"replaceWith",a)},detach:function(a){return this.remove(a,true)},domManip:function(a,b,d){function f(u){return c.nodeName(u,"table")?u.getElementsByTagName("tbody")[0]||
u.appendChild(u.ownerDocument.createElement("tbody")):u}var e,j,i=a[0],o=[],k;if(!c.support.checkClone&&arguments.length===3&&typeof i==="string"&&ua.test(i))return this.each(function(){c(this).domManip(a,b,d,true)});if(c.isFunction(i))return this.each(function(u){var z=c(this);a[0]=i.call(this,u,b?z.html():w);z.domManip(a,b,d)});if(this[0]){e=i&&i.parentNode;e=c.support.parentNode&&e&&e.nodeType===11&&e.childNodes.length===this.length?{fragment:e}:sa(a,this,o);k=e.fragment;if(j=k.childNodes.length===
1?(k=k.firstChild):k.firstChild){b=b&&c.nodeName(j,"tr");for(var n=0,r=this.length;n<r;n++)d.call(b?f(this[n],j):this[n],n>0||e.cacheable||this.length>1?k.cloneNode(true):k)}o.length&&c.each(o,Qa)}return this}});c.fragments={};c.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){c.fn[a]=function(d){var f=[];d=c(d);var e=this.length===1&&this[0].parentNode;if(e&&e.nodeType===11&&e.childNodes.length===1&&d.length===1){d[b](this[0]);
return this}else{e=0;for(var j=d.length;e<j;e++){var i=(e>0?this.clone(true):this).get();c.fn[b].apply(c(d[e]),i);f=f.concat(i)}return this.pushStack(f,a,d.selector)}}});c.extend({clean:function(a,b,d,f){b=b||s;if(typeof b.createElement==="undefined")b=b.ownerDocument||b[0]&&b[0].ownerDocument||s;for(var e=[],j=0,i;(i=a[j])!=null;j++){if(typeof i==="number")i+="";if(i){if(typeof i==="string"&&!jb.test(i))i=b.createTextNode(i);else if(typeof i==="string"){i=i.replace(Ka,Ma);var o=(La.exec(i)||["",
""])[1].toLowerCase(),k=F[o]||F._default,n=k[0],r=b.createElement("div");for(r.innerHTML=k[1]+i+k[2];n--;)r=r.lastChild;if(!c.support.tbody){n=ib.test(i);o=o==="table"&&!n?r.firstChild&&r.firstChild.childNodes:k[1]==="<table>"&&!n?r.childNodes:[];for(k=o.length-1;k>=0;--k)c.nodeName(o[k],"tbody")&&!o[k].childNodes.length&&o[k].parentNode.removeChild(o[k])}!c.support.leadingWhitespace&&V.test(i)&&r.insertBefore(b.createTextNode(V.exec(i)[0]),r.firstChild);i=r.childNodes}if(i.nodeType)e.push(i);else e=
c.merge(e,i)}}if(d)for(j=0;e[j];j++)if(f&&c.nodeName(e[j],"script")&&(!e[j].type||e[j].type.toLowerCase()==="text/javascript"))f.push(e[j].parentNode?e[j].parentNode.removeChild(e[j]):e[j]);else{e[j].nodeType===1&&e.splice.apply(e,[j+1,0].concat(c.makeArray(e[j].getElementsByTagName("script"))));d.appendChild(e[j])}return e},cleanData:function(a){for(var b,d,f=c.cache,e=c.event.special,j=c.support.deleteExpando,i=0,o;(o=a[i])!=null;i++)if(d=o[c.expando]){b=f[d];if(b.events)for(var k in b.events)e[k]?
c.event.remove(o,k):Ca(o,k,b.handle);if(j)delete o[c.expando];else o.removeAttribute&&o.removeAttribute(c.expando);delete f[d]}}});var kb=/z-?index|font-?weight|opacity|zoom|line-?height/i,Na=/alpha\([^)]*\)/,Oa=/opacity=([^)]*)/,ha=/float/i,ia=/-([a-z])/ig,lb=/([A-Z])/g,mb=/^-?\d+(?:px)?$/i,nb=/^-?\d/,ob={position:"absolute",visibility:"hidden",display:"block"},pb=["Left","Right"],qb=["Top","Bottom"],rb=s.defaultView&&s.defaultView.getComputedStyle,Pa=c.support.cssFloat?"cssFloat":"styleFloat",ja=
function(a,b){return b.toUpperCase()};c.fn.css=function(a,b){return X(this,a,b,true,function(d,f,e){if(e===w)return c.curCSS(d,f);if(typeof e==="number"&&!kb.test(f))e+="px";c.style(d,f,e)})};c.extend({style:function(a,b,d){if(!a||a.nodeType===3||a.nodeType===8)return w;if((b==="width"||b==="height")&&parseFloat(d)<0)d=w;var f=a.style||a,e=d!==w;if(!c.support.opacity&&b==="opacity"){if(e){f.zoom=1;b=parseInt(d,10)+""==="NaN"?"":"alpha(opacity="+d*100+")";a=f.filter||c.curCSS(a,"filter")||"";f.filter=
Na.test(a)?a.replace(Na,b):b}return f.filter&&f.filter.indexOf("opacity=")>=0?parseFloat(Oa.exec(f.filter)[1])/100+"":""}if(ha.test(b))b=Pa;b=b.replace(ia,ja);if(e)f[b]=d;return f[b]},css:function(a,b,d,f){if(b==="width"||b==="height"){var e,j=b==="width"?pb:qb;function i(){e=b==="width"?a.offsetWidth:a.offsetHeight;f!=="border"&&c.each(j,function(){f||(e-=parseFloat(c.curCSS(a,"padding"+this,true))||0);if(f==="margin")e+=parseFloat(c.curCSS(a,"margin"+this,true))||0;else e-=parseFloat(c.curCSS(a,
"border"+this+"Width",true))||0})}a.offsetWidth!==0?i():c.swap(a,ob,i);return Math.max(0,Math.round(e))}return c.curCSS(a,b,d)},curCSS:function(a,b,d){var f,e=a.style;if(!c.support.opacity&&b==="opacity"&&a.currentStyle){f=Oa.test(a.currentStyle.filter||"")?parseFloat(RegExp.$1)/100+"":"";return f===""?"1":f}if(ha.test(b))b=Pa;if(!d&&e&&e[b])f=e[b];else if(rb){if(ha.test(b))b="float";b=b.replace(lb,"-$1").toLowerCase();e=a.ownerDocument.defaultView;if(!e)return null;if(a=e.getComputedStyle(a,null))f=
a.getPropertyValue(b);if(b==="opacity"&&f==="")f="1"}else if(a.currentStyle){d=b.replace(ia,ja);f=a.currentStyle[b]||a.currentStyle[d];if(!mb.test(f)&&nb.test(f)){b=e.left;var j=a.runtimeStyle.left;a.runtimeStyle.left=a.currentStyle.left;e.left=d==="fontSize"?"1em":f||0;f=e.pixelLeft+"px";e.left=b;a.runtimeStyle.left=j}}return f},swap:function(a,b,d){var f={};for(var e in b){f[e]=a.style[e];a.style[e]=b[e]}d.call(a);for(e in b)a.style[e]=f[e]}});if(c.expr&&c.expr.filters){c.expr.filters.hidden=function(a){var b=
a.offsetWidth,d=a.offsetHeight,f=a.nodeName.toLowerCase()==="tr";return b===0&&d===0&&!f?true:b>0&&d>0&&!f?false:c.curCSS(a,"display")==="none"};c.expr.filters.visible=function(a){return!c.expr.filters.hidden(a)}}var sb=J(),tb=/<script(.|\s)*?\/script>/gi,ub=/select|textarea/i,vb=/color|date|datetime|email|hidden|month|number|password|range|search|tel|text|time|url|week/i,N=/=\?(&|$)/,ka=/\?/,wb=/(\?|&)_=.*?(&|$)/,xb=/^(\w+:)?\/\/([^\/?#]+)/,yb=/%20/g,zb=c.fn.load;c.fn.extend({load:function(a,b,d){if(typeof a!==
"string")return zb.call(this,a);else if(!this.length)return this;var f=a.indexOf(" ");if(f>=0){var e=a.slice(f,a.length);a=a.slice(0,f)}f="GET";if(b)if(c.isFunction(b)){d=b;b=null}else if(typeof b==="object"){b=c.param(b,c.ajaxSettings.traditional);f="POST"}var j=this;c.ajax({url:a,type:f,dataType:"html",data:b,complete:function(i,o){if(o==="success"||o==="notmodified")j.html(e?c("<div />").append(i.responseText.replace(tb,"")).find(e):i.responseText);d&&j.each(d,[i.responseText,o,i])}});return this},
serialize:function(){return c.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?c.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||ub.test(this.nodeName)||vb.test(this.type))}).map(function(a,b){a=c(this).val();return a==null?null:c.isArray(a)?c.map(a,function(d){return{name:b.name,value:d}}):{name:b.name,value:a}}).get()}});c.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),
function(a,b){c.fn[b]=function(d){return this.bind(b,d)}});c.extend({get:function(a,b,d,f){if(c.isFunction(b)){f=f||d;d=b;b=null}return c.ajax({type:"GET",url:a,data:b,success:d,dataType:f})},getScript:function(a,b){return c.get(a,null,b,"script")},getJSON:function(a,b,d){return c.get(a,b,d,"json")},post:function(a,b,d,f){if(c.isFunction(b)){f=f||d;d=b;b={}}return c.ajax({type:"POST",url:a,data:b,success:d,dataType:f})},ajaxSetup:function(a){c.extend(c.ajaxSettings,a)},ajaxSettings:{url:location.href,
global:true,type:"GET",contentType:"application/x-www-form-urlencoded",processData:true,async:true,xhr:A.XMLHttpRequest&&(A.location.protocol!=="file:"||!A.ActiveXObject)?function(){return new A.XMLHttpRequest}:function(){try{return new A.ActiveXObject("Microsoft.XMLHTTP")}catch(a){}},accepts:{xml:"application/xml, text/xml",html:"text/html",script:"text/javascript, application/javascript",json:"application/json, text/javascript",text:"text/plain",_default:"*/*"}},lastModified:{},etag:{},ajax:function(a){function b(){e.success&&
e.success.call(k,o,i,x);e.global&&f("ajaxSuccess",[x,e])}function d(){e.complete&&e.complete.call(k,x,i);e.global&&f("ajaxComplete",[x,e]);e.global&&!--c.active&&c.event.trigger("ajaxStop")}function f(q,p){(e.context?c(e.context):c.event).trigger(q,p)}var e=c.extend(true,{},c.ajaxSettings,a),j,i,o,k=a&&a.context||e,n=e.type.toUpperCase();if(e.data&&e.processData&&typeof e.data!=="string")e.data=c.param(e.data,e.traditional);if(e.dataType==="jsonp"){if(n==="GET")N.test(e.url)||(e.url+=(ka.test(e.url)?
"&":"?")+(e.jsonp||"callback")+"=?");else if(!e.data||!N.test(e.data))e.data=(e.data?e.data+"&":"")+(e.jsonp||"callback")+"=?";e.dataType="json"}if(e.dataType==="json"&&(e.data&&N.test(e.data)||N.test(e.url))){j=e.jsonpCallback||"jsonp"+sb++;if(e.data)e.data=(e.data+"").replace(N,"="+j+"$1");e.url=e.url.replace(N,"="+j+"$1");e.dataType="script";A[j]=A[j]||function(q){o=q;b();d();A[j]=w;try{delete A[j]}catch(p){}z&&z.removeChild(C)}}if(e.dataType==="script"&&e.cache===null)e.cache=false;if(e.cache===
false&&n==="GET"){var r=J(),u=e.url.replace(wb,"$1_="+r+"$2");e.url=u+(u===e.url?(ka.test(e.url)?"&":"?")+"_="+r:"")}if(e.data&&n==="GET")e.url+=(ka.test(e.url)?"&":"?")+e.data;e.global&&!c.active++&&c.event.trigger("ajaxStart");r=(r=xb.exec(e.url))&&(r[1]&&r[1]!==location.protocol||r[2]!==location.host);if(e.dataType==="script"&&n==="GET"&&r){var z=s.getElementsByTagName("head")[0]||s.documentElement,C=s.createElement("script");C.src=e.url;if(e.scriptCharset)C.charset=e.scriptCharset;if(!j){var B=
false;C.onload=C.onreadystatechange=function(){if(!B&&(!this.readyState||this.readyState==="loaded"||this.readyState==="complete")){B=true;b();d();C.onload=C.onreadystatechange=null;z&&C.parentNode&&z.removeChild(C)}}}z.insertBefore(C,z.firstChild);return w}var E=false,x=e.xhr();if(x){e.username?x.open(n,e.url,e.async,e.username,e.password):x.open(n,e.url,e.async);try{if(e.data||a&&a.contentType)x.setRequestHeader("Content-Type",e.contentType);if(e.ifModified){c.lastModified[e.url]&&x.setRequestHeader("If-Modified-Since",
c.lastModified[e.url]);c.etag[e.url]&&x.setRequestHeader("If-None-Match",c.etag[e.url])}r||x.setRequestHeader("X-Requested-With","XMLHttpRequest");x.setRequestHeader("Accept",e.dataType&&e.accepts[e.dataType]?e.accepts[e.dataType]+", */*":e.accepts._default)}catch(ga){}if(e.beforeSend&&e.beforeSend.call(k,x,e)===false){e.global&&!--c.active&&c.event.trigger("ajaxStop");x.abort();return false}e.global&&f("ajaxSend",[x,e]);var g=x.onreadystatechange=function(q){if(!x||x.readyState===0||q==="abort"){E||
d();E=true;if(x)x.onreadystatechange=c.noop}else if(!E&&x&&(x.readyState===4||q==="timeout")){E=true;x.onreadystatechange=c.noop;i=q==="timeout"?"timeout":!c.httpSuccess(x)?"error":e.ifModified&&c.httpNotModified(x,e.url)?"notmodified":"success";var p;if(i==="success")try{o=c.httpData(x,e.dataType,e)}catch(v){i="parsererror";p=v}if(i==="success"||i==="notmodified")j||b();else c.handleError(e,x,i,p);d();q==="timeout"&&x.abort();if(e.async)x=null}};try{var h=x.abort;x.abort=function(){x&&h.call(x);
g("abort")}}catch(l){}e.async&&e.timeout>0&&setTimeout(function(){x&&!E&&g("timeout")},e.timeout);try{x.send(n==="POST"||n==="PUT"||n==="DELETE"?e.data:null)}catch(m){c.handleError(e,x,null,m);d()}e.async||g();return x}},handleError:function(a,b,d,f){if(a.error)a.error.call(a.context||a,b,d,f);if(a.global)(a.context?c(a.context):c.event).trigger("ajaxError",[b,a,f])},active:0,httpSuccess:function(a){try{return!a.status&&location.protocol==="file:"||a.status>=200&&a.status<300||a.status===304||a.status===
1223||a.status===0}catch(b){}return false},httpNotModified:function(a,b){var d=a.getResponseHeader("Last-Modified"),f=a.getResponseHeader("Etag");if(d)c.lastModified[b]=d;if(f)c.etag[b]=f;return a.status===304||a.status===0},httpData:function(a,b,d){var f=a.getResponseHeader("content-type")||"",e=b==="xml"||!b&&f.indexOf("xml")>=0;a=e?a.responseXML:a.responseText;e&&a.documentElement.nodeName==="parsererror"&&c.error("parsererror");if(d&&d.dataFilter)a=d.dataFilter(a,b);if(typeof a==="string")if(b===
"json"||!b&&f.indexOf("json")>=0)a=c.parseJSON(a);else if(b==="script"||!b&&f.indexOf("javascript")>=0)c.globalEval(a);return a},param:function(a,b){function d(i,o){if(c.isArray(o))c.each(o,function(k,n){b||/\[\]$/.test(i)?f(i,n):d(i+"["+(typeof n==="object"||c.isArray(n)?k:"")+"]",n)});else!b&&o!=null&&typeof o==="object"?c.each(o,function(k,n){d(i+"["+k+"]",n)}):f(i,o)}function f(i,o){o=c.isFunction(o)?o():o;e[e.length]=encodeURIComponent(i)+"="+encodeURIComponent(o)}var e=[];if(b===w)b=c.ajaxSettings.traditional;
if(c.isArray(a)||a.jquery)c.each(a,function(){f(this.name,this.value)});else for(var j in a)d(j,a[j]);return e.join("&").replace(yb,"+")}});var la={},Ab=/toggle|show|hide/,Bb=/^([+-]=)?([\d+-.]+)(.*)$/,W,va=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]];c.fn.extend({show:function(a,b){if(a||a===0)return this.animate(K("show",3),a,b);else{a=0;for(b=this.length;a<b;a++){var d=c.data(this[a],"olddisplay");
this[a].style.display=d||"";if(c.css(this[a],"display")==="none"){d=this[a].nodeName;var f;if(la[d])f=la[d];else{var e=c("<"+d+" />").appendTo("body");f=e.css("display");if(f==="none")f="block";e.remove();la[d]=f}c.data(this[a],"olddisplay",f)}}a=0;for(b=this.length;a<b;a++)this[a].style.display=c.data(this[a],"olddisplay")||"";return this}},hide:function(a,b){if(a||a===0)return this.animate(K("hide",3),a,b);else{a=0;for(b=this.length;a<b;a++){var d=c.data(this[a],"olddisplay");!d&&d!=="none"&&c.data(this[a],
"olddisplay",c.css(this[a],"display"))}a=0;for(b=this.length;a<b;a++)this[a].style.display="none";return this}},_toggle:c.fn.toggle,toggle:function(a,b){var d=typeof a==="boolean";if(c.isFunction(a)&&c.isFunction(b))this._toggle.apply(this,arguments);else a==null||d?this.each(function(){var f=d?a:c(this).is(":hidden");c(this)[f?"show":"hide"]()}):this.animate(K("toggle",3),a,b);return this},fadeTo:function(a,b,d){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,d)},
animate:function(a,b,d,f){var e=c.speed(b,d,f);if(c.isEmptyObject(a))return this.each(e.complete);return this[e.queue===false?"each":"queue"](function(){var j=c.extend({},e),i,o=this.nodeType===1&&c(this).is(":hidden"),k=this;for(i in a){var n=i.replace(ia,ja);if(i!==n){a[n]=a[i];delete a[i];i=n}if(a[i]==="hide"&&o||a[i]==="show"&&!o)return j.complete.call(this);if((i==="height"||i==="width")&&this.style){j.display=c.css(this,"display");j.overflow=this.style.overflow}if(c.isArray(a[i])){(j.specialEasing=
j.specialEasing||{})[i]=a[i][1];a[i]=a[i][0]}}if(j.overflow!=null)this.style.overflow="hidden";j.curAnim=c.extend({},a);c.each(a,function(r,u){var z=new c.fx(k,j,r);if(Ab.test(u))z[u==="toggle"?o?"show":"hide":u](a);else{var C=Bb.exec(u),B=z.cur(true)||0;if(C){u=parseFloat(C[2]);var E=C[3]||"px";if(E!=="px"){k.style[r]=(u||1)+E;B=(u||1)/z.cur(true)*B;k.style[r]=B+E}if(C[1])u=(C[1]==="-="?-1:1)*u+B;z.custom(B,u,E)}else z.custom(B,u,"")}});return true})},stop:function(a,b){var d=c.timers;a&&this.queue([]);
this.each(function(){for(var f=d.length-1;f>=0;f--)if(d[f].elem===this){b&&d[f](true);d.splice(f,1)}});b||this.dequeue();return this}});c.each({slideDown:K("show",1),slideUp:K("hide",1),slideToggle:K("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"}},function(a,b){c.fn[a]=function(d,f){return this.animate(b,d,f)}});c.extend({speed:function(a,b,d){var f=a&&typeof a==="object"?a:{complete:d||!d&&b||c.isFunction(a)&&a,duration:a,easing:d&&b||b&&!c.isFunction(b)&&b};f.duration=c.fx.off?0:typeof f.duration===
"number"?f.duration:c.fx.speeds[f.duration]||c.fx.speeds._default;f.old=f.complete;f.complete=function(){f.queue!==false&&c(this).dequeue();c.isFunction(f.old)&&f.old.call(this)};return f},easing:{linear:function(a,b,d,f){return d+f*a},swing:function(a,b,d,f){return(-Math.cos(a*Math.PI)/2+0.5)*f+d}},timers:[],fx:function(a,b,d){this.options=b;this.elem=a;this.prop=d;if(!b.orig)b.orig={}}});c.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this);(c.fx.step[this.prop]||
c.fx.step._default)(this);if((this.prop==="height"||this.prop==="width")&&this.elem.style)this.elem.style.display="block"},cur:function(a){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];return(a=parseFloat(c.css(this.elem,this.prop,a)))&&a>-10000?a:parseFloat(c.curCSS(this.elem,this.prop))||0},custom:function(a,b,d){function f(j){return e.step(j)}this.startTime=J();this.start=a;this.end=b;this.unit=d||this.unit||"px";this.now=this.start;
this.pos=this.state=0;var e=this;f.elem=this.elem;if(f()&&c.timers.push(f)&&!W)W=setInterval(c.fx.tick,13)},show:function(){this.options.orig[this.prop]=c.style(this.elem,this.prop);this.options.show=true;this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur());c(this.elem).show()},hide:function(){this.options.orig[this.prop]=c.style(this.elem,this.prop);this.options.hide=true;this.custom(this.cur(),0)},step:function(a){var b=J(),d=true;if(a||b>=this.options.duration+this.startTime){this.now=
this.end;this.pos=this.state=1;this.update();this.options.curAnim[this.prop]=true;for(var f in this.options.curAnim)if(this.options.curAnim[f]!==true)d=false;if(d){if(this.options.display!=null){this.elem.style.overflow=this.options.overflow;a=c.data(this.elem,"olddisplay");this.elem.style.display=a?a:this.options.display;if(c.css(this.elem,"display")==="none")this.elem.style.display="block"}this.options.hide&&c(this.elem).hide();if(this.options.hide||this.options.show)for(var e in this.options.curAnim)c.style(this.elem,
e,this.options.orig[e]);this.options.complete.call(this.elem)}return false}else{e=b-this.startTime;this.state=e/this.options.duration;a=this.options.easing||(c.easing.swing?"swing":"linear");this.pos=c.easing[this.options.specialEasing&&this.options.specialEasing[this.prop]||a](this.state,e,0,1,this.options.duration);this.now=this.start+(this.end-this.start)*this.pos;this.update()}return true}};c.extend(c.fx,{tick:function(){for(var a=c.timers,b=0;b<a.length;b++)a[b]()||a.splice(b--,1);a.length||
c.fx.stop()},stop:function(){clearInterval(W);W=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){c.style(a.elem,"opacity",a.now)},_default:function(a){if(a.elem.style&&a.elem.style[a.prop]!=null)a.elem.style[a.prop]=(a.prop==="width"||a.prop==="height"?Math.max(0,a.now):a.now)+a.unit;else a.elem[a.prop]=a.now}}});if(c.expr&&c.expr.filters)c.expr.filters.animated=function(a){return c.grep(c.timers,function(b){return a===b.elem}).length};c.fn.offset="getBoundingClientRect"in s.documentElement?
function(a){var b=this[0];if(a)return this.each(function(e){c.offset.setOffset(this,a,e)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return c.offset.bodyOffset(b);var d=b.getBoundingClientRect(),f=b.ownerDocument;b=f.body;f=f.documentElement;return{top:d.top+(self.pageYOffset||c.support.boxModel&&f.scrollTop||b.scrollTop)-(f.clientTop||b.clientTop||0),left:d.left+(self.pageXOffset||c.support.boxModel&&f.scrollLeft||b.scrollLeft)-(f.clientLeft||b.clientLeft||0)}}:function(a){var b=
this[0];if(a)return this.each(function(r){c.offset.setOffset(this,a,r)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return c.offset.bodyOffset(b);c.offset.initialize();var d=b.offsetParent,f=b,e=b.ownerDocument,j,i=e.documentElement,o=e.body;f=(e=e.defaultView)?e.getComputedStyle(b,null):b.currentStyle;for(var k=b.offsetTop,n=b.offsetLeft;(b=b.parentNode)&&b!==o&&b!==i;){if(c.offset.supportsFixedPosition&&f.position==="fixed")break;j=e?e.getComputedStyle(b,null):b.currentStyle;
k-=b.scrollTop;n-=b.scrollLeft;if(b===d){k+=b.offsetTop;n+=b.offsetLeft;if(c.offset.doesNotAddBorder&&!(c.offset.doesAddBorderForTableAndCells&&/^t(able|d|h)$/i.test(b.nodeName))){k+=parseFloat(j.borderTopWidth)||0;n+=parseFloat(j.borderLeftWidth)||0}f=d;d=b.offsetParent}if(c.offset.subtractsBorderForOverflowNotVisible&&j.overflow!=="visible"){k+=parseFloat(j.borderTopWidth)||0;n+=parseFloat(j.borderLeftWidth)||0}f=j}if(f.position==="relative"||f.position==="static"){k+=o.offsetTop;n+=o.offsetLeft}if(c.offset.supportsFixedPosition&&
f.position==="fixed"){k+=Math.max(i.scrollTop,o.scrollTop);n+=Math.max(i.scrollLeft,o.scrollLeft)}return{top:k,left:n}};c.offset={initialize:function(){var a=s.body,b=s.createElement("div"),d,f,e,j=parseFloat(c.curCSS(a,"marginTop",true))||0;c.extend(b.style,{position:"absolute",top:0,left:0,margin:0,border:0,width:"1px",height:"1px",visibility:"hidden"});b.innerHTML="<div style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;'><div></div></div><table style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;' cellpadding='0' cellspacing='0'><tr><td></td></tr></table>";
a.insertBefore(b,a.firstChild);d=b.firstChild;f=d.firstChild;e=d.nextSibling.firstChild.firstChild;this.doesNotAddBorder=f.offsetTop!==5;this.doesAddBorderForTableAndCells=e.offsetTop===5;f.style.position="fixed";f.style.top="20px";this.supportsFixedPosition=f.offsetTop===20||f.offsetTop===15;f.style.position=f.style.top="";d.style.overflow="hidden";d.style.position="relative";this.subtractsBorderForOverflowNotVisible=f.offsetTop===-5;this.doesNotIncludeMarginInBodyOffset=a.offsetTop!==j;a.removeChild(b);
c.offset.initialize=c.noop},bodyOffset:function(a){var b=a.offsetTop,d=a.offsetLeft;c.offset.initialize();if(c.offset.doesNotIncludeMarginInBodyOffset){b+=parseFloat(c.curCSS(a,"marginTop",true))||0;d+=parseFloat(c.curCSS(a,"marginLeft",true))||0}return{top:b,left:d}},setOffset:function(a,b,d){if(/static/.test(c.curCSS(a,"position")))a.style.position="relative";var f=c(a),e=f.offset(),j=parseInt(c.curCSS(a,"top",true),10)||0,i=parseInt(c.curCSS(a,"left",true),10)||0;if(c.isFunction(b))b=b.call(a,
d,e);d={top:b.top-e.top+j,left:b.left-e.left+i};"using"in b?b.using.call(a,d):f.css(d)}};c.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),d=this.offset(),f=/^body|html$/i.test(b[0].nodeName)?{top:0,left:0}:b.offset();d.top-=parseFloat(c.curCSS(a,"marginTop",true))||0;d.left-=parseFloat(c.curCSS(a,"marginLeft",true))||0;f.top+=parseFloat(c.curCSS(b[0],"borderTopWidth",true))||0;f.left+=parseFloat(c.curCSS(b[0],"borderLeftWidth",true))||0;return{top:d.top-
f.top,left:d.left-f.left}},offsetParent:function(){return this.map(function(){for(var a=this.offsetParent||s.body;a&&!/^body|html$/i.test(a.nodeName)&&c.css(a,"position")==="static";)a=a.offsetParent;return a})}});c.each(["Left","Top"],function(a,b){var d="scroll"+b;c.fn[d]=function(f){var e=this[0],j;if(!e)return null;if(f!==w)return this.each(function(){if(j=wa(this))j.scrollTo(!a?f:c(j).scrollLeft(),a?f:c(j).scrollTop());else this[d]=f});else return(j=wa(e))?"pageXOffset"in j?j[a?"pageYOffset":
"pageXOffset"]:c.support.boxModel&&j.document.documentElement[d]||j.document.body[d]:e[d]}});c.each(["Height","Width"],function(a,b){var d=b.toLowerCase();c.fn["inner"+b]=function(){return this[0]?c.css(this[0],d,false,"padding"):null};c.fn["outer"+b]=function(f){return this[0]?c.css(this[0],d,false,f?"margin":"border"):null};c.fn[d]=function(f){var e=this[0];if(!e)return f==null?null:this;if(c.isFunction(f))return this.each(function(j){var i=c(this);i[d](f.call(this,j,i[d]()))});return"scrollTo"in
e&&e.document?e.document.compatMode==="CSS1Compat"&&e.document.documentElement["client"+b]||e.document.body["client"+b]:e.nodeType===9?Math.max(e.documentElement["client"+b],e.body["scroll"+b],e.documentElement["scroll"+b],e.body["offset"+b],e.documentElement["offset"+b]):f===w?c.css(e,d):this.css(d,typeof f==="string"?f:f+"px")}});A.jQuery=A.$=c})(unsafeWindow);
} catch(e){
	console.log(e);
	console.log("jQuery failed to load!");
}

// Make jQuery object available in GM global scope
try{
	$ = jQuery = unsafeWindow.jQuery;
} catch(e){
	console.log(e);
}

// ================================End jQuery
// block==================================================*/



// ===================================================================================================*/
// ================================Script main
// block==================================================*/
// ===================================================================================================*/


var vu, vuzzle;
var $body = $("body");
var $window = $(window);
unsafeWindow.vu = unsafeWindow.vuzzle = vu = vuzzle = {};
		
/*******************************************************************************
 * Private block
 * 
 ******************************************************************************/
	
vu._core = {
	/**
	 * Namespace for localStorage key identification
	 * 
	 * @type {String}
	 * @browser O,C
	 */
	NAMESPACE : "vuzzle.",
	version : "0.2",
	lang : "ru",
	_alertWnd : null,		
	_compareVersion : function(v1, v2){
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
	_instantiate : function(){
		vu.config = vu.data.load("basic.config",vu.config);
		var currBasic = null;
		for (var i in vu.config.basics){
			var name = vu.config.basics[i];
			currBasic = vu.data.load(["basic",name],vu[name]);
			
			//if basic in storage is freshier than vu basic 
			if (vu._core._compareVersion(currBasic.version, vu[name].version)){
				vu[name] = currBasic;
				vu.debug("basic name="+name+" loaded. Version: "+vu[name].version);
			}
		}
		vu._core.lang = vu.data.load("selectedLang",vu._core.lang);
		vu["lang"] = vu.data.load("basic.lang", vu.lang);
	},
	_resetLog : function(){
		vu.data.save("log0",vu.data.load("log",""));
		vu.data.remove("log");
	},
	
	_throwError : function(msg){
		throw new Error("Vuzzle lib error : "+msg); 
	},
	
	_error : function(msg){
		vu._core._log(msg, "vu-error");
	},
	_debug : function(msg){
		if (DEBUG){
			vu._core._log(msg, "vu-debug");
		}
	},
	_alert : function(msg,param){
		if (!vu._alertWnd){
			param ? param.msg = msg : param = msg;
			vu._alertWnd = new vu.ui.Alert(param);	
		} else {
			vu._alertWnd.forceShow(msg);
		}
	},
		
	_dumpLog : function(msg){
		var obj;
		try{
			obj = vu.data.load("log","");
			vu.data.save("log",obj+"<br />" + msg);
		}catch(e){}
	},
	
	_log : function(msg, class){
		if(vu.platform.console){
			class = class ? class : "";
			console.log("VUZZLE "+class.toUpperCase()+": " + msg);
			vu.platform.console.log(msg, class);
		} else {
			console.log("VUZZLE NC: " + msg);	
		}
		vu._core._dumpLog(msg);
	},
	_getLang : function(){
		return vu._core.lang;
	},
	
	xhr : {
		handleXhrError : function(x,r,e,onFail){
			vu._core.log("xhr error "+r+" caused by "+e);
			if (onFail && typeof(onFail) === "function"){
				onFail();
			}
		},
		
		prepareUrl : function(url){
			var seed = Math.floor(Math.random()*1000);
			url = /\?/.test(url) ? url + "&" + seed : url + "?" + seed;
			if (DEV){url = url.replace("svn/release","svn/devflow");}
			return url;
		},
		
		/*
		 * apiGet : function(url, onDone){ url = url +
		 * "&callback=vu.xhr.xdrCallback"; this.get(url,onDone); },
		 */
		
		/**
		 * Handles GET request and response.
		 * 
		 */
		xget : function(url, onDone){
			vu.debug(" req url: "+url);
			url = this.prepareUrl(url);
			if ($.browser.opera){
				this.scriptTransport(url, onDone);
			} else if($.browser.webkit) {
				this.xhrTransport(url, onDone);
			} else if ($.browser.mozilla){
				this.GMTransport(url,onDone);
			}
		},
		
		/**
		 * Make GET request via <script> transport.
		 * 
		 */
		scriptTransport : function(url, onDone){
			var t = document.createElement("script");
			t.src = url;
			t._callback = onDone;
			document.body.appendChild(t);
		},
		
		// transport should be moved to background.html of the chrome
		// extension
		xhrTransport : function(url, onDone){
			chrome.extension.sendRequest({'action' : 'vuget', 'url':url}, onDone);
		},
		/**
		 * Make GET request via GM_xmlhttpRequest.
		 * 
		 */
		GMTransport : function(url, onDone){
			setTimeout(function(){GM_xmlhttpRequest({
				method : "GET",
				url : url,
				onload : function(x) {
					var o = x.responseText;
					if (onDone) {
						onDone(o);
					}
				}
			});},0);
		
		}
	},
	autoupdate : {
		beforeCriticalUpdate : function(){
			for (var i in vu.config.basics){
				vu.data.remove("basic."+vu.config.basics[i]);	
			}
			vu.data.remove("basic.config");
		}	
	},
	
	ui : {
		
			/**
		 * Base class for window-based UI elements. Abstract methods:
		 * this.onClose this.onOpen this.init
		 * 
		 * @type {Object}
		 * @param {String}
		 *            param.lable lable to be shown in window header
		 * @param {String}
		 *            param.idString unique window identifier
		 * @param {Number}
		 *            param.minHeight window minimal height
		 * @param {Number}
		 *            param.minWidth window minimal width
		 */
		AbstractWindow : function(param){
			if (!param || !param.element){
				return;
			}
			if (param.lable != vu.lang.console_lable && !param.idString){
				console.log(param);
				return;
			}
			param = $.extend({
				registerWindow : true,
				minWidth : parseInt(param.element.css('minWidth')) || 50,
				minHeight: parseInt(param.element.css('minHeight')) || 24,
				lable : "",
				idString : "default",
				closeMethod : "hide"
			},param);
			
			var id = vu.constants.DIALOG_ID;
			this._param = param;
			if (param.registerWindow){
				var wm = vu._core.ui.windowManager;
				id = wm.push(this);
			}
			var _t = this;
			
			this.lable = param.lable;
			this.idString = param.idString;
			this.created = false;
				
			this.getId = function(){
				return param.idString + id;
			};
			
			this.close = function(){
				if (param.closeMethod != "hide"){
					this.created = false;
					_t.$wrap.parent().fadeOut(_t.$wrap.parent().remove);
				} else {
					_t.$wrap.parent().fadeOut();
				}
				if (typeof _t.onClose === 'function'){
					_t.onClose();	
				}
			};
				
			this.open = function(){
				if (_t.created){
					_t.$wrap.parent().fadeIn();
				} else {
					_t.init();
				}
				if (typeof _t.onOpen === 'function'){
					_t.onOpen();	
				}
			};
			
			this.show = this.open;
			
			this.createWindow = function(left, top, width, height){
				this.$wrap = $("<div class='vu-window'></div>").appendTo($body).css({
					border : '1px solid',
					position : 'fixed',
					left : left,
					top : top
				});
				this.$header = $("<div class='vu-window-header'></div>").css({
					overflowX : 'hidden',
					overflowY: 'hidden'
				});
				this.$lable = $("<div class='vu-window-header-lable'></div>").appendTo(this.$header).css("margin", "0 auto").html(param.lable);
				this.$btns = $("<div class='vu-window-header-btns'></div>").appendTo(this.$header).hide();
				
				this.$wrap.append(this.$header);$
				
				var $close = new vu.ui.Button({width: 16, height:16}).css({position: 'relative', top: 1, float: 'right'}).addClass("vu-window-close").appendTo(this.$btns).html("X").attr("title",vu.lang.close_btn);
			
				$close.click(this.close);
			
				this.$content = $("<div class='vu-window-content'></div>").css({
					"overflow-y": 'auto',
					height: height - this.$header.height() - 10
				}).append(param.element);
				
				this.$wrap.append(this.$content);
				this.$res = new vu.ui.Resizable({
					element: this.$wrap,
					height : height,
					width: width,
					minWidth : param.minWidth,
					minHeight : param.minHeight,
					onResize: _t.updateSize
				});
			
				this.$res.css({display: closed ? "none" : "block"});
				
				var h = this.$header;
				new vu.ui.Draggable({
					element: this.$res,
					handler: h,
					onStop: _t.savePosition,
					bound : {left:-6,top:-6,bottom: -9,right: -11}
				});
				var setCursor = function(){
					h.css('cursor','move');
				};
				
				var resetCursor = function(){
					h.css('cursor','default');
				};	
				h.mousedown(setCursor);
				h.mouseup(resetCursor);
				$window.mouseup(resetCursor);
				this.created = true;
			};
		},
		
		AbstractDialog : function(param){
			if (param){
				param = $.extend({
					idString : "cdlg" 
				},param);
				param.element = $("<div class='vu-dialog-body'></div>");
				param.element.appendTo($body);
				param.registerWindow = false;
			
				vu._core.ui.AbstractWindow.call(this,param);
				param = $.extend(param, this._param);
				this.prototype = new vu._core.ui.AbstractWindow();
				this.constructor = vu._core.ui.AbstractDialog;
				var _t= this;
				
				this.$msgContent = param.element;
				
				this.updateSize = function(){
					_t.$content.css('height',_t.$wrap.height() - _t.$header.height() - 10 - _t.$footer.height());
				};
				
				if (param){
					this.createWindow(($window.width() - param.width)/2, ($window.height() - param.height)/2, param.width, param.height);
					this.$footer = $("<div class='vu-window-footer'>");
					this.$content.removeClass("vu-window-content");
					this.$content.addClass("vu-window-content-with-footer");
					this.$footer.css({
						height: 30
					});
					
					this.$wrap.append(this.$footer);
					this.$content.css("height",this.$content.height() - 30);
					
					this.addButton = function($button){
						_t.$footer.append($button);
						$button.css("float","right");
					};
				}
				this.$wrap.parent().css("z-index","10001");
			} else {
				return;	
			}
		},
			
		Console : function(param){
			param = $.extend({
				lable : vu.lang.console_lable
			}, param);
			
			vu.ui.Window.call(this,param);
			this.prototype = new vu.ui.Window();
			this.constructor = vu._core.ui.Console;
			var _t= this;
			
			if (param){
				this.$input = $("<textarea title='Ctrl + Enter'></textarea>");
				this.$content.removeClass("vu-window-content");
				this.$content.addClass("vu-window-content-with-footer");
				this.$input.css({
					height: 14,
					width : "95%",
					marginTop : "5px",
					fontFamily : "Courier New",
					backgroundColor : "#eeeeee",
					fontSize: 11,
					border : "1px solid #dddddd"
				});
				
				this.$footer = $("<div class='vu-window-footer'>");
				this.$footer.css({
						height: 30,
						textAlign : "center"
					});
				this.$wrap.append(this.$footer);
				
				this.$footer.append(this.$input);
				this.$content.css("height",this.$content.height() - 30);
				
				this.updateSize = function(){
					_t.$content.css('height',_t.$wrap.height() - _t.$header.height() - 10 - _t.$footer.height());
				};
				
				this.$input.keydown(function(e){
					//Ctrl+Enter
					if (e.ctrlKey && e.keyCode == 13){
						try{
							var r = eval(_t.$input.val());
								_t.$input.css("border","1px solid #dddddd");
								vu._core._log("<< " + _t.$input.val(),'vu-code');
								_t.$input.val("");
							if (r){
								vu._core._log("Result>> " + r, 'vu-code');
							}
						} catch(e){
							vu._core._error(e);
							_t.$input.css("border","2px solid red");
						}
					}
					if (e.keyCode == 9){
						e.preventDefault();
						_t.$input.val(_t.$input.val() + "\t");
					}
				});
				
				this.$input.focus(function(){
					$(this).css({
						fontSize: 11,
						color : '#000000',
						backgroundColor : "#f8f8f8"
					});
				});
				this.$input.blur(function(){
					$(this).css({
						fontSize: 9,
						color : '#aaaaaa',
						backgroundColor : "#eeeeee"
					});
				});
				
			} else {
				return;	
			}						
			return this;
		},
		
		/**
		 * Blackout layer class. Exposed through vu.ui.blackout
		 * 
		 * @see vu.ui.blackout
		 * @type {Object}
		 * 
		 */
			
		Blackout : function(){
			var $el = $("<div id='vu-blackout'></div>").css({
				display: "none",
				height: $(document).height(),
				width: "100%",
				top: 0,
				position: "fixed"
			});
			$body.append($el);
			
			/**
			 * Shows the blackout layer.
			 * 
			 * @method
			 */
			this.show = function(){		
				$el.show();
			};
			
			/**
			 * Hides the blackout layer.
			 * 
			 * @method
			 */
			this.hide =  function(){
				$el.hide();
			};
			
			/**
			 * Toggles the blackout layer.
			 * 
			 * @method
			 */
			this.toggle = function(){
				$el.toggle();
			}
		},
		
		/**
		 * Toolbar class. Exposed through vu.ui.toolbar
		 * 
		 * @see vu.ui.toolbar
		 * @type {Object}
		 * @param {Integer}
		 *            param.height - toolbar height (px)
		 * @default 30
		 * 
		 * @param {Integer}
		 *            param.width - toolbar width (px).
		 * @default 600
		 */
		Toolbar : function(param){
			var _t = this;
			$mainButton = null;
			$settButton = null;
			
			var hidden = vu.data.load("vu.ui.toolbar.hidden",false);
			
			// array of jQuery objects
			var buttons = null;
			
			var $tbody, $tbodyWrap = null;
			
			param = $.extend({
				height: 30,
				width: 300
			},param);
			
			/**
			 * Hides the toolbar
			 * 
			 * @method
			 */
			this.hide = function(){
				vu.data.save("vu.ui.toolbar.hidden",true);
				$tbodyWrap.animate({
					top:$window.height()
				}, "fast", function(){
					$mainButton.css({
						lineHeight: "1em",
						fontSize: "8pt",
						top: -12
					});
				});
				
				$mainButton.unbind("click");
				$mainButton.click(_t.show);
			};
			
			/**
			 * Shows the toolbar
			 * 
			 * @method
			 */
			this.show = function(){
				vu.data.save("vu.ui.toolbar.hidden",false);
				$tbodyWrap.animate({
					top: ($window.height()-param.height)
				}, "fast");
				$mainButton.css({
					lineHeight: param.height+5+"px",
					fontSize: "12pt",
					top: -5
				});
				$mainButton.unbind("click");
				$mainButton.click(_t.hide);
			};
			
			var settOpened = false;
			
			this.openSett = function(){
				vu.ui.blackout.show();
				if (!vu.settings.ui.cont){
					vu.settings.ui.createList();
				} else {
					vu.settings.ui.showSettings();
				}
				settOpened = true;
			};
			
			this.closeSett = function(){
				vu.ui.blackout.hide();
				vu.settings.ui.hideSettings();
				settOpened = false;
			};
			
			this.toggleSett = function(){
				if (settOpened){
					_t.closeSett();	
				} else {
					_t.openSett();	
				}
			};
			
			this.addButton = function($vuButton){
				$vuButton.css({
					position: "relative",
					float : "left"
				});
				$btnHolder.append($vuButton);
				$tbody.width($tbody.width() + $vuButton.width());
			};
			
			this.savePosition = function(){
				vu.data.save(["toolbar","x"], $tbodyWrap.offset().left);
				vu.data.save(["toolbar","y"], $tbodyWrap.offset().top - $window.scrollTop());
			};

			var _createToolbar = function(){
				$tbodyWrap = $("<div id='toolbarWrap'></div>").css({
					position: "fixed",
					height: param.height,
					minWidth: param.width,
					top : hidden ? $window.height() : $window.height()-param.height,
					left : vu.data.load(["toolbar","x"],($window.width()-param.width)/2)
				});
				$tbody = $("<div class='vu-toolbar-body'></div>").css({
					height: param.height,
					minWidth: param.width,
					left : vu.data.load(["toolbar","x"],($window.width()-param.width)/2)
				});
				$body.append($tbodyWrap);
				$tbodyWrap.append($tbody);
				
				$window.resize(function(){
					$tbodyWrap.css({top : hidden ? $window.height() : $window.height()-param.height});
				});
				
				$mainButton = $("<div class='vu-toolbar-mbtn'></div>").css({
					height: param.height+5,
					top: hidden ? -12 : -5,
					left: 5,
					lineHeight: hidden ? "1em" : param.height+5+"px",
					fontSize: hidden ? "8pt":"12pt"
				});
				$tbody.append($mainButton);
				
				$btnHolder = $("<div></div>");
				$btnHolder.css({
					position: "relative",
					display: "inline-block",
					minWidth : 100,
					maxWidth : $tbody.width() - $mainButton.position().left - $mainButton.width() - (param.height -6),
					left: 10
				});
				$btnHolder.appendTo($tbody);
					
				new vu.ui.Draggable({
					element: $tbodyWrap,
					handler : $tbody,
					bound: {
						top: function(){return $window.height() - $tbodyWrap.height()},
						bottom: 0, 
						left: 0,
						right: 0
						},
					onStop : _t.savePosition	
					});
				
				
				
				$mainButton.html("Vuzzle");
				hidden ? $mainButton.click(_t.show) : $mainButton.click(_t.hide);
				// remove text selection
				$mainButton.mousedown(function(){return false;});
				
				$settButton = $("<div title='Настройки' class='vu-toolbar-btn'><span></span></div>").css({
					height : param.height - 6,
					width : param.height - 6,
					lineHeight : param.height - 6 + "px",
					right: 1,
					display : 'inline-block',
					float : "right",
					position: "relative"
				});
				
				$settButtonImage = $("<img></img>").attr("src",vu.resources.images.toolIcon).css({
					height: param.height - 6,
					width: param.height - 6
				});
				$tbody.append($settButton);
				$settButton.find("span").append($settButtonImage);
				$settButton.click(_t.toggleSett);
				$settButton.mousedown(function(){$settButton.addClass('down');});
				$settButton.mouseup(function(){$settButton.removeClass('down');});
				
				var $wnds = vu.ui.Button({
					title: vu.lang.windows_btn_title,
					src : vu.resources.images.windowCascade});
				_t.addButton($wnds);
							
				$wnds.click(function(){vu.ui.uiWindowManager.toggle();});
			};
			_createToolbar();
		},
		
		UIWindowManager : function(){
			var _t = this;
			var created = false;
			var wndsOpened = false;
				
			this.toggle = function(){
				if (!wndsOpened){
					_t.open();
					wndsOpened = true;
				} else {
					_t.close();
					wndsOpened = false;
				}
			};
				
			var $cont = $("<div class='vu-win-manager-body'></div>").css({
				width: 100,
				display: 'block',
				position: 'absolute',
				left : 90,
				top: 30,
				maxHeight: 157,
				overflowY : "auto"
			});
			
			var $header = $("<div class='vu-win-manager-header'></div>");
			$header.html("Окна");
			$header.appendTo($cont);
			$header.click(function(){_t.toggle();});
			
			var $holder = $("<div></div>");
			$holder.appendTo($cont);
			
			this.open = function(){
				if (created){
					var arr = [];
					var list = vu._core.ui.windowManager.getList();
					for (var i in list){
						arr.push("<div class='vu-win-manager-pad hand' id='win_"+list[i].getId()+"'>");
						list[i].closed ? arr.push("<span>") : arr.push("<span class='opened'>");
						arr.push(list[i].lable);
						arr.push("</span>");
						arr.push("</div>");
					}
					$holder.html(arr.join(""));
					$cont.stop().animate({top:vu._core.ui.windowManager.getList().length <= 5 ? -17 - vu._core.ui.windowManager.getList().length*28 : -157},400);
				} else {
					create();	
					this.open();
				}
			};
			
			this.close = function(){
				$cont.stop().animate({top:30},400);
			};
			
			var create = function(){				
				$(".vu-toolbar-body").before($cont);
				created = true;
				$(".vu-win-manager-pad").live("click",function(){
					if(this.id.substr(0,4)=== "win_"){
						vu._core.ui.windowManager.get(this.id.substr(4)).open();
					}
					
				});
			};
		},
		
		/**
		 * Single layer class.
		 * 
		 * @type {JQuery}
		 * @param {Boolean}
		 *            param.centered Shall the layer be centered
		 * @default false
		 * 
		 * @param {HTMLElement}
		 *            param.parent Parent node.
		 * @default $body (GLOBAL)
		 * 
		 * @param {Boolean}
		 *            param.fixed Shall the layer be fixed
		 * @default false
		 * 
		 * @param {Boolean}
		 *            param.transparent Shall the layer be transparent
		 * @default false
		 */
		Layer: function(param){
			param = $.extend({
				centered: false,
				parent: $body,
				fixed : false,
				transparent: false
			},param);
			var $cont = $("<div class='vu-layer'></div>");
			if (param.transparent){
				$cont.addClass("trans");
			}
			
				$cont.css({
					height: param.height ? param.height : '',
					width: param.width ? param.width : '',
					position: param.fixed ? "fixed" : "relative"
				});
				var $sel = null;
					if(param.parent == $body){
						$sel = $window;
					} else {
						$sel = param.parent;	
					}
					
				param.parent.append($cont);
				if (param.centered){		
					$cont.css({
							top: ($sel.height() - $cont.height() - 20*2)/2,
							left: ($sel.width() - $cont.width() - 20*2)/2
						});
				}
			
			
			return $cont;			
		},
		/**
		 * Layer with semitransparent background layer. First layer is
		 * transparent by default
		 * 
		 * @type {Object}
		 * @param {Object}
		 *            Layer1param Layer class parameter object for the 1st layer
		 * 
		 * @param {Object}
		 *            Layer2param Layer class parameter object for the 2nd layer
		 */
		BiLayer : function(Layer1param, Layer2param){
			if (!Layer2param){
				Layer2param = Layer1param;	
			}
			var param = $.extend(Layer1param, {transparent: true})
			var $holder = $("<div>");
			$holder.appendTo($body);
			this.$layer0 = new vu._core.ui.Layer(param);
			this.$layer1 = new vu._core.ui.Layer(Layer2param);
			
			this.$layer0.appendTo($holder);
			this.$layer1.appendTo($holder);
			
			this.show = function (){
				$holder.show();
			};
			this.hide= function (){
				$holder.hide();
			};
			this.toggle = function (){
				$holder.toggle();
			};
			
		},
		ModuleHolderLayer : function(param){
			param.module = $.extend({name:"Неизвестный модуль",author: "Неизвестный автор", description : "Нет описания"}, param.module);
			
			var installed = typeof vu.platform.modules[param.module.name]!== 'undefined';
			var isOn = vu.platform.modules[param.module.name] == 1;
			
			var $appender = vu.settings.ui.cont.$layer1.find("#module-cont");
			var layer = new vu._core.ui.Layer({parent: $appender}).css({margin : '0 auto;', minHeight: '60px'});
			if (!isOn){
				layer.addClass("hover");
			}
			var $cont = $("<div></div>");
			
			var $sett, $install, $delete;
			
			var $header = $("<div title='Модуль не установлен' class='vu-sett-module-header round'>"+param.module.title+"</div>").appendTo($cont);
			
			if (installed){
				$header.attr("title","Версия: "+vu.platform[param.module.name].version);	
			}
			
			$("<div style='display: inline-block; float:left; margin:5px; 10px; min-width:10%; height: 50px; line-height: 50px;'>Автор: "+param.module.author+"</div><div style='display: inline-block; margin: 5px 5px 5px 2%; width:30%; float:left;'><div style='line-height: 14px; word-wrap: break-word; overflow-y: auto; overflow-x: none; height: 50px; display: table-cell; vertical-align:middle; text-align: justify;'>"+param.module.description+"</div></div><div id='btnHolder'></div><div id='scrHolder'></div><div style='clear:both;'></div>").appendTo($cont);
			layer.append($cont);
			
			var $btnH = $cont.find("#btnHolder");
					
			var createInstallBtn = function(){
				$install = new vu.ui.Button({
					width: 120,
					value: '<b>Установить</b>' 
				}).css({
					marginLeft: 'auto',
					top : 13,
					left: -10
				}).click(install);
				$install.appendTo($btnH);
			};
			
			var createDeleteBtn = function(){
				$delete = new vu.ui.Button({
					width: 120,
					value: 'Удалить'
				}).css({
					marginLeft: 'auto',
					top : 13,
					left: -10
				}).click(remove);
				$delete.appendTo($btnH);
			};
			
			var createSettBtn = function(){
				$sett = new vu.ui.Button(vu.resources.images.toolIcon);
				$sett.css({
					left: 120,
					top: 13,
					position: "absolute"
					}).click(function(){
						vu._core.settings.openSettingsCont();
						vu._core.settings.createSettings(vu.platform[param.module.name]);
						});
				$btnH.append($sett);
			};
			
			if (installed){
				createDeleteBtn();
				createSettBtn();
			} else {
				createInstallBtn();	
			}
					
			var install = function(){
				$install.remove(); 
					var $loader = $('<div class="loader"/>').css({
						position: 'absolute',
						left: 180,
						top: 10
					});
					$btnH.append($loader);
// $t.css({
// background : "url(\""+vu.resources.images.loading+"\") no-repeat 50px 0"
// });
				vu.platform.instalModule(param.module.url,function(){
					$loader.remove();
					layer.removeClass('hover');
					createDeleteBtn();
					createSettBtn();
				});	
			};
			
			var remove = function(){
				$delete.remove();
				$sett.remove();
// $(this).css({
// background : "none"
// });
				console.log(param.module.name)
				vu.data.remove(param.module.name);
				try {
					vu.platform.modules[param.module.name].onUninstall();
				} catch(e){
				}
				delete vu.platform.modules[param.module.name];
				vu.data.save("modules", vu.platform.modules);
				layer.addClass("hover");
				createInstallBtn();
			};
			
			if($install){
				$install.click(install);
				$btnH.append($install);
			}
			if($delete){
				$delete.click(remove);
				$btnH.append($delete);
			}
			
			return layer;
		},
		
		
		/**
		 * Singleton Window manager class.
		 * 
		 * @type {Object}
		 */
		windowManager : new function(){
			var windows = [];
			
			this.get = function(id){
				id = /\d+$/.exec(id).toString();
				return windows[id] ? windows[id] : null;
			};
			
			this.put= function(id, obj) {
				window[id] = obj;
			};
			
			this.push = function(obj){
				if (windows.length){
					for (var i = windows.length - 1; i>=0; i--){
						if (!windows[i]){
							windows[i] = obj;
							return i;
						}
					}
				}
				windows.push(obj);
				return windows.length - 1;
			};
			
			this.getList = function(){
				return windows;	
			};
		},
		
		roundCorners : function(radius){
			var s = "border-radius: {1}; -moz-border-radius: {1};";
			if (typeof radius === 'number'){
				return s.replace(/\{1\}/g,radius+"px");
			} else if(typeof radius === 'string'){
				return s.replace(/\{1\}/g,radius);
			}
		},
		bgUrl : function(uri){
			return "background: url(\""+uri+"\")";
		},
		bg: function(name){
			switch (name){
				case 'panel' : return this.bgUrl(vu.resources.images.controlBg) + " repeat-x top;";
				case 'btn' : return this.bgUrl(vu.resources.images.btnBg) + " repeat-x top #dddddd;";
				case 'btnHover' : return this.bgUrl(vu.resources.images.btnBg) + " repeat-x 0 -6px #dddddd;";
				case 'btnDown' : return " background: none repeat-x 0 -6px #dddddd;";
				case 'orange' :  return this.bgUrl(vu.resources.images.slashBgOrange) + "repeat-x 0;";
				case 'glass' : return this.bgUrl(vu.resources.images.glassBgBlue) + "repeat-x 0;";
				case 'wave' : return this.bgUrl(vu.resources.images.waveBgBlue) + "repeat-x 0;";
				default: return "none;";
			}
		},
		absPos : function(top, left){
			if (top && left){
				return "position: absolute; top:"+top+"px; left: "+left+"px;";
			} else {
				return "position: absolute; top:0; left:0;";
			}
		},
		fixedPos : function(top, left){
			if (top && left){
				return "position: fixed; top:"+top+"px; left: "+left+"px;";
			} else {
				return "position: fixed; top:0; left:0;";
			}
		},
		baseStyle : "font-family: verdana; font-size: 11px; color: #333333;",
		applyStyles : function(){
			var style = "#vu-blackout{" +
					"background: black;" +
					"opacity: 0.7;" +
					"z-index: 1000;}" +
					"							" +
					"#toolbarWrap{" +
					"opacity: 0.4;" +
					"z-index:9996;" +
					"}"+
					"#toolbarWrap:hover{" +
						"opacity: 1;" +
					"}"+
					".vu-toolbar-body{" +
					this.bg('panel')+
					this.roundCorners("8px 8px 0px 0px")+
					
					"border: 1px solid #999999;" +
					"z-index: 9999;" +
					"}" +
					"							" +
					".vu-toolbar-body:hover{" +
				
					"}" +
					" 							" +
					".vu-toolbar-mbtn{" +
					"width: 80px;" +
					this.bgUrl(vu.resources.images.slashBgOrange)+";"+
					"color: white;" +
					"border: 1px solid #BBBBBB;" +
					"font-family: Verdana;" +
					"font-size: 12pt;" +
					"font-weight: bold;" +
					"position: relative;" +
					"cursor: pointer;" +
					"text-align: center;" +
					"z-index: 10000;" +
					"float:left;" +
					this.roundCorners("8px 8px 0px 0px")+
					"}" +
					"							" +
					".vu-button{" +
					"position: relative;" +
					"margin: 2px;" +
					"display: inline-block;" +
					this.baseStyle+
					"text-align: center;" +
					"cursor:pointer;" +
					this.roundCorners("4px 4px 4px 4px")+
					this.bg('btn')+
					"border: 1px solid #dddddd;"+
					"}" +
					"							" +
					".vu-button:hover{" +
					this.bg('btnHover')+
					"border: 1px solid #999999;" +
					"}" +
					"							" +
					".vu-button img{" +
					"vertical-align: middle;" +
					"}" +
					"							" +
					".vu-toolbar-btn{" +
					"margin: 2px;" +
					"text-align: center;" +
					"cursor: pointer;" +
					"border: 1px solid #dddddd;" +
					this.roundCorners("4px 4px 4px 4px")+
					"}" +
					"							" +
					".vu-toolbar-btn:hover{" +
					this.bg('btnHover')+
					"border: 1px solid #999999;" +
					"background-position: 0 -6px;" +
					"}" +
					"							" +
					".vu-layer{" +
					"color: black;" +
					"margin: 10px;" +
					"font-family: verdana;" +
					this.baseStyle+
					"background-color: #ffffff;" +
					this.fixedPos()+
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					"							" +
					".down, .down:hover{" +
					this.bg('btnDown') +
					"}" +
					"							" +
					".trans{" +
					"opacity: 0.6;" +
					"}" +
					"							" +
					".hover{" +
					"opacity: 0.7;" +
					"}" +
					"							"+
					".hover:hover{" +
					"opacity: 1;" +
					"}" +
					"							" +
					".border{" +
					"border: 1px solid #A6C9E2 !important;" +
					"}" +
					".round{" +
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					".active{" +
					"border: 2px solid #FFB841;" +
					"}" +
					"							" +
					".vu-header{" +
					this.baseStyle+
					this.bgUrl(vu.resources.images.glassBgBlue) + "50% 50%;"+
					"text-align: center;" +
					"color: white;" +
					"margin: 3px;" +
					"height: 28px;" +
					"line-height: 28px;" +
					"position: relative;" +
					"}" +
					"							" +
					".vu-content{" +
					"font-size: 10pt;" +
					"padding: 15px; " +
					"}" +
					".vu-sett-module-header{" +
					"display: inline-block;" +
					"float:left;" +
					"padding: 0 5px;" +
					"max-width: 200px; " +
					"min-height: 50px;" +
					"line-height: 50px;" +
					"margin: 5px;" +
					"min-width: 100px;" +
					"overflow: hidden; " +
					"white-space: nowrap; " +
					"text-align: center;" +
					"font-weight: bold;" +
					"font-size: 11pt;" +
					"color: white;" +
					this.bgUrl(vu.resources.images.slashBgOrange)+";"+
					"}" +
					"							" +
					".vu-sett-bar{" +
					"z-index: 1002;" +
					this.roundCorners("6px 6px 6px 6px")+
					this.bg('panel')+
					"height: 30px;" +
					"}" +
					"#btnHolder{" +
					"min-width: 150px; " +
					"display: inline-block; " +
					"float:right; " +
					"position: relative; " +
					"height: 50px; " +
					"margin: 5px;" +
					"}" +
					"							" +
					"#scrHolder{" +
					"width: 150px; " +
					"display: inline-block; " +
					"float:left; " +
					"position: relative; " +
					"height: 50px; " +
					"margin: 5px;" +
					"overflow-x: auto;" +
					"overflow-y: hidden;" +
					"}" +
					"							" +
					".loader{" +
					"height: 31px;" +
					"width: 31px;" +
					this.bgUrl(vu.resources.images.loading)+
					"}" +
					"							" +
					"#sett-cont{" +
					" height: 100%;" +
					"}" +
					"							" +
					"#sett-cont-body{" +
					"height: 80%;" +
					"width: 500px;" +
					this.roundCorners("8px 8px 8px 8px")+
					"background: white;" +
					"margin: 0 auto;" +
					"overflow: auto;" +
					"}" +
					"							" +
					"#sett-cont-body table{" +
					"border-collapse: collapse;" +
					"width: 100%;" +			
					"}" +
					"							" +
					"#sett-cont-body table tr:hover{" +
					"background: #FAFAFA;" +
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					"							" +
					"#sett-cont-body input{" +
					this.baseStyle +
					"width: 70px;" +
					"text-align: center;" +
					"padding: 0px;" +
					"margin: 2px 5px;" +
					"float: right;" +
					"border: 1px solid #DDDDDD;" +
					this.roundCorners("3px 3px 3px 3px")+
					"}" +
					"#sett-cont-btns{" +
					"position: relative;" +
					"margin: 10px auto;" +
					"width: 500px;" +
					"}" +
					"#sett-cont-msg{" +
					"margin : 10px auto;" +
					"padding: 5px;" +
					"width: 400px;" +
					"text-align: center;" +
					"display: none;" +
					"background-color: #dedede;" +
					"color: #333333;" +
					this.roundCorners("8px 8px 8px 8px")+
					"}"+
					"							" +
					".vu-res-handler{" +
					"float:left;" +
					"opacity: 0.3;" +
					"background: #dddddd;" +
					"}" +
					".nw{" +
					this.roundCorners("16px 0px 0px 0px") +
					"}" +
					".ne{" +
					this.roundCorners("0px 16px 0px 0px")+
					"}" +
					".sw{" +
					this.roundCorners("0px 0px 0px 16px")+
					"}" +
					".se{" +
					this.roundCorners("0px 0px 16px 0px")+
					"}" +
					".vu-window-header{" +
					"							" +
					this.bg("panel") +
					"height: 24px;" +
					"line-height: 24px;" +
					this.roundCorners("8px 8px 0px 0px")+
					"}" +
					"" +
					"							" +
					".vu-window{" +
					"z-index: 900;" +
					"border-color:#dddddd!important;" +
					this.roundCorners("8px 8px 8px 8px")+
					"}" +
					"" +
					".vu-window-header-lable{" +
					" color: #aaaaaa;" +
					" text-align: center;" +
					"}" +
					".vu-window-close{" +
					"color: red;" +
					this.roundCorners("10px 10px 10px 10px")+
					"}" +
					".vu-window-content{" +
					this.roundCorners("0px 0px 8px 8px")+
					"overflow-y: auto;" +
					"overflow-x: hidden;" +
					"padding: 5px;" +
					"background: #ffffff;" +
					"}" +
					".vu-window-content-with-footer{" +
					this.roundCorners("0px 0px 0px 0px")+
					"overflow-y: auto;" +
					"overflow-x: hidden;" +
					"padding: 5px;" +
					"background: #ffffff;" +
					"}" +
					".vu-window-footer{" +
					this.roundCorners("0px 0px 8px 8px")+
					this.bg("panel")+
					"}" +
					".vu-dialog-body{" +
					"padding: 10px;" +
					"}" +
					".vu-vtext{" +
					"display: block;" +
					"right: -10px;" +
					"top: 20px;" +
					"position: relative;" +
					"-moz-transform: rotate(90deg);"+
  					"-webkit-transform: rotate(90deg);"+
  					"-o-transform: rotate(-90deg);" +
  					"}" +
  					".vu-error{" +
  					"color: #dd0000;" +
  					"}" +
  					".vu-debug{" +
  					"color: #0000dd;" +
  					"}" +
  					".vu-code{" +
  					"color: #666666;" +
  					"}"+
  					".vu-win-manager-body{" +
  					this.roundCorners("8px 8px 0px 0px")+
  					"background-color: #ffffff;" +
  					"color: #aaaaaa;" +
  					"border: 1px solid #cccccc;" +
  					"z-index: -1;" +
  					"}" +
  					".vu-win-manager-pad {" +
  					"height: 24px;"+
  					"text-align: center;" +
  					"width: 100%;" +
  					"margin: 2px 0px;" +
  					"line-height: 24px;"+
  					"border-top: 1px solid #cccccc;"+
  					"border-bottom: 1px solid #cccccc;"+
  					this.bg("panel") + 
  					"}" +
  					".vu-win-manager-pad img{" +
  					"margin: 2px 15px 7px 5px;" +
  					"vertical-align: middle;" +
  					"}" +
  					".vu-win-manager-pad .opened{" +
  					"color: #333333;" +
  					"}" +
  					".vu-win-manager-pad:hover{" +
  					" color: #333333;" +
  					"}" +
  					".hand{" +
  					"cursor: pointer;" +
  					"}" +
  					".vu-win-manager-header{" +
  					this.roundCorners("6px 6px 0px 0px")+
  					"border-bottom: 1px dashed #aaaaaa;"+
  					this.bg("orange")+
  					"height: 14px;" +
					"line-height: 14px;" +
					"cursor: pointer;" +
					"color: #ffffff;" +
					"font-weight: bold;" +
					"text-align: center;" +
  					"}" +
  					".vu-add-module-area{" +
  					"height:100%;" +
  					"width:100%;" +
  					"padding: 0px;" +
  					"font-size: 9pt;" +
  					"font-family: Courier New;" +
  					"}";
			vu.ui.addStyle(style);
		}
	},
	settings : {
		currentModule : null,
		onCreateList : function(){
			var mod = vu.platform.availableModules;
			for (var m in vu.platform.modules){
				var flag = true;
				for (var j in mod){
					if (m == mod[j].name){
						flag = false;
						break;
					}
				}
				
				if (flag){
					mod.push(vu.platform[m]);	
				}
			}
			var l;
			vu.ui.toploader.hide();	
			vu.settings.ui.cont.$layer1.append("<div id='module-cont' style='margin: 0 auto;'></div><div id='sett-cont' style='display:none;'><div id='sett-cont-body'><table colspan='0' border='0'></table></div><div id='sett-cont-msg'></div><div id='sett-cont-btns'></div></div>");
			vu.settings.ui.moduleCont = $("#module-cont");
			vu.settings.ui.settingsCont = $("#sett-cont");
			var $okBtn = new vu.ui.Button({
				width:100,
				value : 'Сохранить',
				rel : true
			}).css({
				fontWeight: 'bold',
				left: 140
			}).click(vu._core.settings.apply);
			
			var $closeBtn = new vu.ui.Button({
				width: 100,
				value : 'Закрыть',
				rel: true
			}).css({
					left: 140
				}).click(vu._core.settings.closeSettingsCont);
			vu.settings.ui.settingsCont.find("#sett-cont-btns").append($okBtn).append($closeBtn);
			for(var i =0, length = mod.length; i<length; i++){
				l = new vu._core.ui.ModuleHolderLayer({module:mod[i]});
			}
		},
		closeSettingsCont : function(){
			vu.settings.ui.settingsCont.hide();	
			vu.settings.ui.moduleCont.show();
		},
		openSettingsCont : function(){
			vu.settings.ui.settingsCont.show();	
			vu.settings.ui.moduleCont.hide();
		},
		
		// TODO: add parsing for all types
		parseSettings : function(){
			for (var j = 0; j < vu.validator.types.length; j++){
				var $el = vu.settings.ui.settingsCont.find("input[stype="+vu.validator.types[j]+"]");
				for (var i = $el.length; i--;){
					var value = $el.eq(i).val();
					var name = $el.eq(i).attr("name");
					vu.data.save(["modules",vu._core.settings.currentModule.name,name],value);
					vu._core.settings.currentModule.settings[name].value = value;
					$el.eq(i).attr("old",value);
				}
			}
		},
		apply : function(){
			vu._core.settings.parseSettings();
			vu._core.settings.currentModule.onApplySettings();
			vu._core.settings.showMsg("Настройки сохранены");
		},
		showMsg : function(msg){
			var $msgCont = vu.settings.ui.settingsCont.find("#sett-cont-msg").html(msg);
			$msgCont.show();
			setTimeout(function(){vu.settings.ui.settingsCont.find("#sett-cont-msg").fadeOut()}, 2000);
		},
		createSettings : function(module){
			vu._core.settings.currentModule = module;
			var obj = module.settings;
			
			var $cont = vu.settings.ui.settingsCont.find("table");
			$cont.empty();
			var $row, $value, type, elementVal;
			for(var i in obj){
				$row = $('<tr></tr>');
				
				var $txt = $("<div>").html(obj[i].text).css({
					minWidth : 200,
					padding: 5
					});
				$row.append($txt);
				type = obj[i].type.split(":");
				// TODO: add types
				switch (type[0]){
					case "input" : $value = $("<input>").val(obj[i].value);
						$value.focus(function(){$(this).addClass("border")});
						$value.blur(function(){$(this).removeClass("border")});
						$value.attr("stype",type[1]).attr('name',i).attr("old",obj[i].value);
						$value.change(function(){
							if(vu.validator.validate(this.value,type[1],$(this).attr("old")) === false){
								this.value = vu.validator.value;
								vu._core.settings.showMsg(vu.validator.msg);
							}
						});
						break;
					default:$value = $("<div>").html(obj[i].value).css({
								minWidth : 80,
								padding: 5
							}).attr('name',i);
							break;
				};
				$row.append($value);
				$value.wrap("<td>");
				$value.wrap("<div>");
				
				$txt.wrap("<td>");
				$cont.append($row);
			}
		}
		
	}
	
};
			

/*******************************************************************************
 * Proxy for private _core methods
 * 
 ******************************************************************************/

vu.getLang = vu._core._getLang;
vu.log = vu._core._log;
vu.throwError = vu._core._throwError;
vu.error = vu._core._error;
vu.debug = vu._core._debug;
vu.alert = vu._core._alert;



/*******************************************************************************
 *
 *
 * Public API
 *
 * 
 ******************************************************************************/


vu.resources = {
	version: "0.2",
	images : {
		glassBgBlue : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%01%00%00%01%90%08%06%00%00%00oX%0A%DB%00%00%00OIDAT8%8D%ED%CF1%11%800%10%05%D1%BD%BD%24%B8A%2B%860%81%0AZ%14%40%93%12%01%0Cs%CD%9Bm~%F1Y%B7%FD%16%A0(%8A%DFr%9C%17%06%603%26%A3%25v%03%97%9682p%A48%9A%B3%BA%81%3D%9D%8B4%BEp%A6(%8A7%1E%C4-%08%C1%94%95%D9%98%00%00%00%00IEND%AEB%60%82",
		slashBgOrange : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00(%00%00%00(%08%06%00%00%00%8C%FE%B8m%00%00%00fIDATX%85%ED%D2%A1%15%C00%0C%03Q%C7%23t%97%AC%D1%A1K%B3KqPRRh%9A'%81%13%3B%26%F0%DB%7C%EE%1D%FF%F2%EA%B1%DE%11N%9DNg%AAN%A73U%A7%D3%99%B2%AD%CE%60%F0%40c%10%83%EA%C6%20%06%D5%8DA%0C%AA%1B%83%18T7%061%A8n%0CbP%DD%18%C4%A0%BA1%88Au%DB%1B%FC%00o*%B0%DC3%16%92u%00%00%00%00IEND%AEB%60%82",
		waveBgBlue : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%01%F4%00%00%00d%08%06%00%00%00p%C7%C2%7D%00%00%0DHIDATx%9C%ED%9DK%8E%E4N%11%87%D3%D5%9E%19%0E%83%C4%CD%10%12%0B%16%DC%03q%12%04B%AC%E0%0A%BC6%9C%E1%BF%A3_%E5d%D1c%C6%9D%13%CF%B4%AB%BA*%E7%FB%A4V%97%9D%91%11%BF%8C%7CU%D9%EE%EA%E9%B7%7F%F9w-%00%00%00p%D7%9C%3EZ%00%00%00%00%EC%87%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%D8%D0%01%00%00%06%40%DC%D0%AB%F2%DA%3An%CFK%3E%A3u%A5%E3%D6%B6%D5X%9B%D7V%B9%A6G%D2%1C%F1%A9%E9%CA%E8%95l%A39%F5%F2%D7%FA%D4%FCj6%D6x%90%F4xu%AC%DCy%FA%B4%DCI%B6%96.%2BgZ%DFD%C6L%86%C8%18%F0%EA%B6%E7%BC%BE%B7%EC4%5BOG%EF8%D5%7Cd%DA%A1%FD%8E%CC%3B%ADN%5BO%B2%D7lz%FAM%B3%F1%F2%D0%7B.%BAne%B4Z1%BD%F8VlO%AB%B5%FEe%D6%06k%DCg%DB%A8%E9%88%8E%7F%EF%BC%E5k%8E6%DAr%16%9D%FC%99%BA%99%09%ED%F9%B6be'%60t%23%F0%E2zu39%F5%7C%5B%F1%A26%3D9%F3%EA%EC%994%D9%B6H%BA%22%FD%D1%A3-Cd%0CD%EAz%E73c%BFg%0C%F6%8ES%AB%2C%B3%06D7%80h%9DH%3DO%A3F6%9F%7B7%F0%A8%FF%9E%B6H6G%D5%E9%E9S%CF.%13%EF%9A%9B%BAU%969%CF%25w%00%00%80%01%60C%07%00%00%18%80y%A9G%5E%40%04%00%00%80%8F%80O%E8%00%00%00%03%C0%86%0E%00%000%00l%E8%00%00%00%030%D7Z%CA4%BD%1DH%AF%DB%5B%ECk%F9%CAZ%BE%DAZ%BE%A4zm%5D%CFv%AB%A1%8D%DD%FA%93%F4J%FE%24ZMZ%EC%ECyK%BB%94%07%AD%1DZ%1B4%1DZ%DBZ%7FZ%FFGr%AA%B5M%8A%D3j%91b%B7%F6Z%5E%B41c%B5E%B3%D5%F4%F7%D6%95%B0%DA%2C%C5%91%E6%866%26%B59%A7%E5%DD%EA3)%86%87%A6%D5%5BW%B4vH%FA%AD%B1a%F9%94%CEk~%B2%1A%BD%F9%2C%C5%EA%D1%19%F1%AF%AD%DB%911%A3%95k%EBR%AB%D1%AA%B3%8D%A1%F9%94%DA%12iWd%0F%F0%D6%04M%E7V%8F%96O)%A6%B7%3Fy%FB%98%A4%DD%DBW%A7%DF%FC%F9_%3C%15%07%00%00p%E7p%C9%1D%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%F8b%19%00%00%80%01%E0%13%3A%00%00%C0%00%B0%A1%03%00%00%0C%00%1B%3A%00%00%C0%00%B0%A1%03%00%00%0C%C0%BC%BEXj)%A7%E9%EDw%84%D5%D6%AB%B3-%3FM%DFbE%7C%5B%E5%92%1FI%93eki%C9%E4%C2%E2%B4%F9%26%9FU%DB6%AE%14%A7%D5%9F%D1%11%B1%B7l4%BD%5B%CD%9AN%C9F%8A%A7%E5%E0%D4%7C%EB%D1%DEqc%E5Zj%977%A6%B5%F1%95%9D%3B%96f%2F%A6%D7w%11%0D%3D%ED%8C%A2%E5%A6%14%7DL%5B%E3%A1%B5k%FDE%E6S%2F%DAx%D4%DA%A0%8D3-%C7%9E%CF%5E%DFR%DD%EC%D8%F0%CA%22Z%DB%F3%A5%E4%D7%07%AF%ED%11%5B%A9%AE%A6%A5%F5%AD%E5%CE%3A%D7%3B%0F%AD%B6n%F5Z%ED%9C~%FD%A7%7F%F2%98%3B%00%00%C0%9D%C3%25w%00%00%80%01P7%F4%FA%F5'R%5E%9B%9F%AD%8DE%5B%3F%A2C%B2%95%B4X%BE%24%BD%5EY%ABYj%87%A6%B7%7D%1D%8D%13iS%EBO%D2%A5%E5%CB%D3m%E5%D1%8A%E1%C5%8B%F8%96r%25%F9%D44yy%D5r%A3%D9I%DA%A4%D8%92%1FIo%1B%C7%F3'i%CE%8E%3B%AD%8E%15_%D2%EF%CD%1BK%8F7%96%25%FFQ%1D%9A%2F%A9%5C%1B%07%9E%FE%0C%DEX%F3%F2%E5%B53%3B_%B5%FE%8E%C4%D4%C6%A4%F4%5B%D2%A7%D9%5B%F9%97ti%BA%DB%E3%A8%16%A9%8E%D6%17%96_%AD-%91%F3Z%8Cl%3Bj)e%8EL%AElyf%22Dm%A3%8B%5E4%AE%E7%AB-%F3%7CG%16E%2BVdRD%DA%E4M%A2%A8%BD%17S%5B%AC%7B%EAi6G%F4%B9%D5~%2F7V%8Ch%9E%B4%FA%96M%C4.%3B%5E.1~%B3%7D%DC%3B%96%BD%F1%15%1D%E3%3D9%ED%5DS2%1A%AC%18%D9y%B6w%7CY%FE%23s(%BA%9EX%ED%DA%3B%C7%BC%D8%D1%3A%3D%B9%F4%B4%EFY_%23%C7%5Cr%07%00%00%18%80%D3RkY%7F%24%B6e%9Amk%E3%FDn%CFE%7C%B4%B6m%7C%C9%9F%A4%D1kk%D4%AF%E6O%F2%AD%B5%CD%CB%A3%95'%AF%0D%9A%7F%0B%A9-%91%BEn%E3z%F5%B5XZ%7Dm%5CH%E7%A2_e%1C%E9%0F%AD%BDV%1Fx9%F4%E6%93%E5%D3%8A%E9%B5!%A2%CD%8B%2F%D9xs%C3%F2%AB%E9%B4%E2f%E6%AE%F4%D3%EA%D4%EC5%1FZl%2B%9E%95%03%AF%AE%B5%DEx%FD%1A%E9%07%AB%5D%92%3F%2F%9E%A69r%AC%E9%89%B4%C7%D2h%CD%0F%AF%5D%5E%7DM%A3%D6%9E%C8%3C%CE%E4%A6%AD%3B%FD%EA%8F%FF%88%AD%80%00%00%00p%B3p%C9%1D%00%00%60%00%D8%D0%01%00%00%06%C0%7D%CA%1D%00%00%00n%9F%B9~%FD%DE%B8%E94%95%BA%F9%0E%B9%E9%EB%F7%CD%B5%E7%B6%F6%2B%5E%3D%CD%7Fkc%9D%97%B0%7Cj%ED%914%7Bu%5B%BB%B6%FE%F6%9C%D6%FEH%DB2%B9%DB%DAY1%A3%1A%A4%F3%91%B8R%FE%B5%7Cx%F55M%AD%0F%E9%B7%A4%D9j%EB%8A4%9E%25%8D%DAx%97%F2%E2%B5%C3%F2!ij%DB%EB%9D%B3bXcT%9A%DF%5E%5B%25%3DV%0E4%3Cm%5E%BD%3D~%F7%CEYo%0CE%D0%C6s%86%9E%3E%F3%B4%B4%F52%AF%A5%F8R%8E%AC%BDD%CBIt%BCx%FBNfmi%ED%23q%A2%F6%AD%FF%15o%FD%FB%AE%FE%2F%FF%F0w%3E%A4%03%00%00%DC9%B3o%02%19j)%E5%B9%F3%1D%B6%C7%CBy)%17r%FD%5D%9C%A3%C2%7C~%B8%ECc%1A%9F%1F%A62M%93o%F8%95%87i*s%DC%1C%00%E0n%B8%C9%7B%E8%E7Z%CA%EB%B2%A8%E5%CF%E7%A5%94%E2%AF%CA%CF%E7%A5%D4%C0%DF%BF%3E%9FcYx%3A%EB%9A%60%3C%BEhoF%A6R%3E%9F%E4%F1w%9A%A6%F2I%A9%F7%E94%15%E9%BD%C7%7C%3A%95%07%DEd%00%C0N%C4O%E8%CFK%157%C2ZKyQ%3E%22j%9B%E7%B9%BE%7D%E2%93xY%EAa%9F%04%01%8E%E6%D1x%03%F7x%C1%B8Sy%DB%FC%B7%CC%0F%A7wW%16%A6izw%F5%E34%952o%EA%F0%26%01%E0%C7c%FE%CFO%FF%FDh%0D%00%B0A%BAm%F3%BC%9Cw%F9%FCt%9A%DE%5D%D3%FA2%BF%BF%8A%D0%DE%1A%D9%5E%9D%98%26%E3j%05%00%1C%C2%D3y)%DB%CF%C4%ED%15%E1%E7%E6%F8%E9%F5%DBq-o%1F%90%E7%E5%1A7e%01%E0Cyj%E6%F9%E3k%FF%ED%A3%D3izw%CB%E1%ED6%C3%B7%E3%A9%94w%B7%1DN%D3%F4%DD%15%87%D5%0F%CF3%C0%BD%F0%B2%D4%D2%5E%84%3E%D7Z%5E%85%3DTz%0E%E9%A9%99s%CFK-G%EF%BF%3C%14%07%00)%96%A5%96%C7v!z9%CE%FF%FC0%95%07%E1a%83O%0F'%F1%C9%99%F6j%C3%CA%CF%02W%15%3Es_%E2%A6%A9eRo%D9%AE%BC%2CK%F1%1E%83%D2%1E(%3E%2F%B5%9C%85%EFw%7F%09%3EWuk%DC%E4Cq%00%F0%E3%F2r%AE%E5Ex%BAF%BD%AA%F0taA%25%BE%F1%7F%99%1FBvS%C9%FD%3BV%C9%5E%7B0s%CB%B9Vw%B3%CB%B0Fl%5D.K-%2F%CD%83%CC%A7ir%FF%F1%CB%CB%99%E7%A8%8Ed%8E%FC%17%24%00%80%1F%99%C7%D7%D8%3A%B9%E7V%06%C0%5Ex%D2%05%00%00%60%00%D8%D0%01%00%00%06%80%0D%1D%00%00%60%00%B8%87%0E%00%000%00sU%BEBu*%B5%ACe%D3%D7%E7%10k%99%DE%9D%D7%EC5%B6~%2C%1B%CF%8F%A7%B5%AD%BF%9E%EB%F1%1D%D5ii%F0%F4i%3E%8F%D0%95%89%9Fi%C7%F6%5C)%25%EC%3Fj%93%A9%1B%E9%DFl%9F%1C9V%B6%3EK%B1%E7%91V%AF%A7%CE%1Ak%0F%9A%1FI%93%15%F3%D2%E3~%1B%7F%D5%90%CDAV%C7%5E%DD%9A%DE%F5%F8%88%B8%DA%B8%D7%C6b4g%999%23%F9%F4%C6%B46%BE%F6%AC%E3%D1%B5%AFg%3D9*v%06)7%EA%DF%A1o%9Dk%AF5%FB%88%CF%3D6V%1D%A9%FEz%EE%C8%05%BA%F5ei%88%E4%CF%2B%EB%D5%95%89%EF%D9z%BE%23%FE%A36%99%BA%91%FE%CD%F6%C9%D1%9By%24%A6W%AF%A7%CE%5E%BC%F9~%C4%D8%BE%94%D6%AC%DFK%DB%7B%F5%A3%FE%F6%8C%03%AF%DF%F6h%C8%EC%0D%DE%98%B6t%F6%E6%3D%BA%F6%F5%AC'G%C5%EE%F5%B9%BE%E6%92%3B%00%00%C0%00%F0P%1C%00%00%C0%00%CC%7C%40%07%00%00%B8%7F%F8%84%0E%00%000%00%B3%F4%3F%CC%01%00%00%E0%BE%E0%9F%B3%00%00%00%0C%00%97%DC%01%00%00%06%80%3F%5B%03%00%00%18%00%3E%A1%03%00%00%0C%00%F7%D0%01%00%00%06%80K%EE%00%00%00%03%C0%25w%00%00%80%01P%FF%DB%1A%00%00%00%DC%0F%7CB%07%00%00%18%80%B9.%DCC%07%00%00%B8wN%B5%94%12%DD%D2%7B%B6~%A9%8E%E6%C7%F2%7F%AD%B7%1D%D7%D4P%95%DFG%FA%96%8E%2F%19%E7(%FFY%BF%D68%AE%09%1B%EBuD%C76%8E%D5%AF%97%98K%99%B9%7C%2BDs%13%ED%3B%2F%967%D7%F6%E6%AF%D5)%1Dg%E2Zu%BDc)~%B6%DE%A5%F2%A4%C5%CB%FA%8E%B4%C5%AB%93%A9%7B)%A4%B6g%F5%D4R%CA%9C%AD%CC%A6~%99Xl%EA%C7%F8%EDY%18%3D%9B%3D%ED%BB%F6%A6%DE%EB%F7%239b%7D%E8%D9%04.%B9%B0%F7%CC%BDKm%EA%7B%EAe%7C%1E%01%9B%FA%BEu%9A%3F%5B%03%00%00%18%00%1E%8A%03%00%00%18%00%BE)%0E%00%00%60%00%F8%84%0E%00%000%00%DCC%07%00%00%18%00%3E%A1%03%00%00%0C%00%1B%3A%00%00%C0%00%BC%DB%D0%3F%E2K%E3%96%AA%C7%5D%CB%DArOg%A4%DC%B2%D9%96y%B6V%CC%F5%9CU%E6%D5%F1%EC%BCc%CD%8F%D6%AEh%3C%ADL%8A%97%1DWR%BF%7B%ED%F3%B4e%FA0%DA%D6%AD%D6%3D%DA%BC%E3%CC8%EA%CD%B5T_%8B%1F%E9o%CDF%9B%D3V%7C%CFN%AB%1B%ED%CF%CC%18%CA%CE%23%AD%CC%CBC%C4%8F%14%3F%3B%DF%23Xm%B0%B4I%3E%8E%9E%B7%19%0Dm%1D%CFO%DBG%BD%B9%8D%E6'%E2%C3%F35%FD%E2%F7%7F%E3%26%3A%00%00%C0%9D3%97R%CA-%3E%177M%B7%A9%AB%97%23%DA3ZN%8E%E0%D6r%E2%E9%D9%96%7F%A4%F6%5B%CB%DB%91%ACm%CB%B61%D3w%7B%B5%5D%CBGO%BC%23%C7%C6G%FB%1Ay%9CK%9Cn%B5%B1%B7%AA%AB%97%23%DA3ZN%8E%E0%D6r%E2%E9%D9%96%7F%A4%F6%5B%CB%DB%91%ACm%CB%B61%D3w%BD%5C%DBGO%BC%23%C7%C6G%FB%1Ay%9CK%CC%A5%94%B2%D4ZN%D3%B7%FF%8B%BE%1E%AF%7F%D2%B6%BE%DE%9EkY%EB%7B%E5%5B%1B)f%EBc%7Bn%AB%A3%F5%23%95%B7%B46R%7D%CD%AE%F5%D9%D6%95%B4Jq%B5xR%9E%A42%AB%0DZ%BDV%5Bk%2F%F5%AD%96c%AD%5C%C3%B2%93rbi%95%FA%C8%D2%A0%8D%2F%A9%5D%DA%18%B7%C6%AD%15%D7%CA%8B5%065%FDR%3C%ADN%A4O%AC1%9D%B1%D1%CEyu%D6%F3%DE%DAb%B51%3A%06%25%AD%D2%5C%B7%F4Im%CB%CCEk%3EYs%CB%CA%8F%97%07%AB%2F%A2~%BD9!%B5%B1%8D%A5%C5%B3%FA%20%B3%16e%DA%AC%E9%8D%AC%81mlOGv%CD%89%EEoZ%8C%A5%D62%FD%FCw%7F%FD%C1%DE%C3%00%00%00%8CG%E8%AB_%A7r%EC%7F%A1%89%F8%CB%C6%3CZc%96%3D%F1%AF%A1%BD%8D%B1%BEo%DC%13%D7%D2%ED%B5I%D2%B37%07%BD%3E%A2Z.%D9O%97%8Ay)%CD%D9%FE%BD%25.%B1%FE%1CAd%3EEu%ED%99%9B%D7%26%A3'3%EE%8EX%0F%8E%CCU%D6%EFv%8D%8E%B6%7B6l%FE%CF%D1%9D%1F%F1%97%8D%F9%D1%03tO%FCkhoc%1C%11%D3%F2%E1%F9%BF%B6%9EL%3D%CD%CF%25%FB%E9R1%2F%A59%DB%BF%B7%C4%25%D6%9F%23%88%CC%A7%A8%AE%3Ds%F3%DAd%F4d%C6%DD%11%EB%C1%91%B9%CA%FA%CD%D8%AF%E5s%FD%D1%9E%1A%00%00%00%18%10%BE)%0E%00%00%60%00N%A5%5C%EE%F2%99t)%B3%BD%8C%10%B9%D4X%13%B6V%BC%8CM%15%CA%A5K%20%DE%A5-%CB%BF%A7%5B%CA%97%E7%C3kK%FB%5B%F3%1F%BDd%E7%F5%8D%E7%CFkc%8F%CF%B6l%AF%FF%3D%FDg%F9%F6%C6%9Ev%ECi%CBj%91%EC%B52OWD%D3%1E%B2sP*%8F%E6%5D%B2%D7bz%B9%E8%BD%9C%1E%19G%DAy%AF%8D%99%CB%F8G%CC%CB%BDc0%BA%5Eiv%7B%D6%01m%EF%CA%CC%CD%C8z%A0%F9%B2%CEm%E3%CD%D1N%ED%9D%A4%BD%0BV%B4%AEw%DE%2B%8B%C6%EA%DD%D4%3D%0D%D9%BAGm%00%D1%89%11%D1%14%B1%CF%F8%BB%97M%3D%E2%EB%88%B1%E7%D9d%16%CA(%A3o%EA%99sZ%ACkm%EA%D1%BA%D1%B2%7B%D8%D4%A3%3E%ACy%7D%E4%A6n%D59jS%EF%F1%DF%1E%CF%8F%AF%8B%13%02%00%00%00n%9D%FF%01%9D%EEp%90%04ZF!%00%00%00%00IEND%AEB%60%82",
		waveHoverBlue : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%01%00%00%01%90%08%06%00%00%00oX%0A%DB%00%00%00KIDAT8%8D%ED%CF%B1%0D%800%14%03%D1%F3%25a%FF%15%D8*k%A4%A6%80%06%3A%06%40%E87O%3Awf%9F%EB%14%A0(%8A%DF2%D7%81%06l%09%B6%80Cp%18%DC%CC%9D%5B%13%BB%E0%C8%B3u%83%3D%603_8S%14%C5%1B%17%F3%E9%09%A8%880kI%00%00%00%00IEND%AEB%60%82",
		glassHoverBlue : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%01%00%00%01%90%08%06%00%00%00oX%0A%DB%00%00%00KIDAT8%8D%ED%CF%B1%0D%800%14%03%D1%F3%25a%FF%15%D8*k%A4%A6%80%06%3A%06%40%E87O%3Awf%9F%EB%14%A0(%8A%DF2%D7%81%06l%09%B6%80Cp%18%DC%CC%9D%5B%13%BB%E0%C8%B3u%83%3D%603_8S%14%C5%1B%17%F3%E9%09%A8%880kI%00%00%00%00IEND%AEB%60%82",
		toolIcon :  "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%000%00%00%000%08%06%00%00%00W%02%F9%87%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C9e%3C%00%00%06gIDATx%DA%D4%9A%5BH%5CG%18%80G%B3%D1%A8%11%A3Q%A3F%8D%90%06%831%89%B2%A4%BA!%0F*%B6)%E9S%1FB!%2F%B1%0D%08%07%FAP%0A%09%15%9F%25!%A1%A1oRi%A0%B4%B4%20%08%85B%9FB%FB%E0%A5%88%A0%88%16%89%A1%89%97%C4x%8D%B9%19%2FI%8C%FD%BF%E1%CC%B2%9E%AC%BAn%3C%BB%3A0%9Csf%CF%CE~%FF%CC%7F%1D%8DYYYQ%3B%B9%C5%AA%1D%DE%3C%EF%3BASSS8_%3B(%FD3%E9%9FJ%CF%90%5Eb%8F%F7J%1F%95%DE(%FD%F6F%93%D4%D6%D6%AA%98H%AA%90%08%0B%A8%95%94%94T%5BPP%A0%F2%F3%F3UBB%82%DA%BF%7F%BF%FE%FC%F1%E3%C7jnnN%B5%B5%B5%A9%85%85%85%1C%19%1A%DFH%00O%04%E1%AF'%26%26%5E%F6z%BD%EA%E8%D1%A3*%26%26F%8F%BF~%FDZ%BD%7C%F9R%BDy%F3F%3F%F7%F4%F4%00%FF%F1F%F0%5B%A6B!%80%C7%C9%E5%FB%BC%BC%3C%AB%BA%BAZ%ED%DE%BD%5B---%01%B9%EA%3D%04hmmU3337BQ%9F%88%09%20%ED%BB%E2%E2b%EB%F4%E9%D3%0Au%7D%FA%F4%A9r%AA-%F0%A8%8D%0D%7F%25%A2F%BC%C1%EA_%3Dt%E8%D0W%3E%9FO%BDz%F5J%EB%B7%B3%01%DF%DE%DE%1E%16%BC%AB%02%60%B0b%AC%DFVVVj%C8%17%2F%5E%04%85%EF%E8%E8%08%1B%DE%ED%1D%B0N%9C8%A1%3C%1E%8Fz%F2%E4IP%B5%01%5E%3CO8%F0%F1%D2%97%5C%0Bd%B2%FA%F9%B8%CA%C3%87%0Fk%0F%F3%F6%ED%5B-%80%E9x%9E%F7%80%F7%ED%DA%B5kQ%AE%09nF%E2%0B%E2u48%DE%26%10%9E699%09%FCo%C8%BA%C9y%AF%1F8p%E0%9Fc%C7%8E%E9%1DvS%80%8F%08N%CB%CB%CB%AB%E0%E9qqq%AA%A4%A4D%95%97%97_%90%F7%BE%91%FE%C1%26%E0%2F%9F%3BwNegg%F3%FC%89%9B6P(AK%AB%0A%BB%10%D8%E6%E7%E7%F5%18%F6%C1*vvvr%BD)%FD%BFP%E0ccc%CD%9CEn%0A%90A%C0%C2P%83%A5*F%ADB%14%C2%0F%CF%82%E0%CD%98%DB%CE%A1%DC%F3B%00%A2Bk5%84%20%F79~%FC%F8zB%F8%E1%89%23%CF%9E%3D%5BeKn%DA%C04%E9%82S%FFQ%9F%7B%F7%EE%E9%95%E4%D9%08!%91%1A%9B%B0%1C6%E1%87g.%22%B8%F1f%3C%F3%1Bn%A6%D3%83%12u%0F%C6%C7%C7%FB%07%16%17%17%D5%83%07%0F4%C4%E8%E8%A8%CED%C5%1D%FA%850%9E%C5%DE%899%03%CF%F7%CC%CA%9Bf%07%C5%017U%E8%F6%F4%F4tUjj%AA%7F%60vvV%03%D3%81y%F4%E8%91%CA%CA%CA%D2%CF%C6%B0%C9R%11bhhH%01%CF%B8%13%9E%26%91%9B%CB%DFn%AAP%F3%C4%C4%C4%AA%00%96%91%91%A1%24%B8i7J'%9Df%E5%8D%ABe'%10%F2%C8%91%23%EA%EC%D9%B3%3A%00%06%AA%8D%E9%3C37%BF%B1j%07%F8%81pZCCC%B0%E1!%01jz%F8%F0amnn%AE%1E%008--M%3D%7F%FE%7C%95q%93%E0%25''%FB%0D%DB%99f%3B%9B%CC%C9%3B%E8%ED%90%DB5q%E3%FD%FB%F7%FD%AE%D4%A8%01%B0%EC%009%12W%E2%85%D3%D8%D7%EA%CC%C5%9Cv%C9%E9zQ%9F%26%DEb%B0%BF%BF%FF%9DT%822%12x%AE%ECL%A8%020%97%CCy%C3%AE%9D%5D%15%E0%82D%CC%BF%C45%16fff%AA%BBw%EF%BE%23%84%1D%8CB%86g%0E1%DEFg%F2%E7%86%17%FA%5C%E0%7F%3Ds%E6%8C*%2C%2C%D4%3FN%E6%D9%D7%D7%A7%8A%8A%8A%B4%D7%D9L%C3%5E%06%06%06%0C%FC%D7%CE%CF%FD%A7%12%E1%1A%B14%AF%F4K%5C%A5%FA%FA%B7%A6%A6%E6Kj_%DB%25j%BD%C5%F0%BA%BB%BB%B5%C1r%1A%81%FB4E%FDz%91%1Co3%3C%3Cl%D4%E6%CAV%9FJ%A4H%BFJ%B1~%FE%FCy%0D%DC%D2%D2%F2aWW%97v%834%C2%FF%C8%C8%88%1A%1B%1B%D3%FE%5C%84%F9app%D0%23P%97%D2%D3%D3%F5q%0A%AAd%BC%10%01%8A(%8D%7B%C5%D7%0B%F8-%DB%60%BB%D7%82%08w%07H%60%2CQ%13%8B%92%11%CF%40%D0%01%EA%CE%9D%3B%8AB%E6%E2%C5%8Bz%95%CD*%8A*%D4%C9w%AE%ADq%B0%E5%B5%C7%BB%ED%14%E1O%E9%BFK%1F%0B%F9%60k%13%02h%F8%8A%8A%0A%8B%BC%1C%F50%C5%3A.1''G%A7%0C%CCWUU%A5S%01%09%3E%81%F0%5B%D6%10%60%B3%5EH%C3%FB%7C%3E%8B4%81%90%CF%02H%DE%A2%3BQ%12x%84%60W%9A%9B%9B%19%BB%E2%06%7C8nT%C3%97%95%95Y%AC.%2BOj%80A%F2lt%9A%15%E73%7C%7Coo%AF%AA%AF%AF%FFc%3B%1C%EEj%F8S%A7NY%80b%94%FB%F6%ED%D3%D0%7B%F7%EE%D5%AE%11o%83ArO%1EC%B3%5Df%16%D9%E9zj%E0%B6%00%1A%DE%EB%F5Z%AC0Y%24%EA%C3%3D%3AOJ%80%EA%E0q0d%BA9%F3%B4%EF%BB%A2%B9%03%1A%BE%B4%B4%D4%22%11%1B%1F%1F%D7%F0%DC%1Bx%02%8D%C9%D9%25%85%F6g%8F%EC%92%5C%EB%24%D9%5B%88%96%00%1A%FE%E4%C9%93%DA%60%81g%D5%03W%3E%10%1Ew%89%1FG%00%E0e%FC%A6%08tM%B9%DC%3C%EB%C1K%BDj%A1%EB%C0%01nV%1E%5D7%F0%E4%EC%7CN%9A%0C%3C*%26%01%E8%9A%C0%D7E%E2%D8%DE%B3%16%BC%E4-%16%11%D2%09o%0C%D6%C0%B33%06%9E%03%ABH%C2%07%13%80%F4%C0%92%AAH%C3OMM%F9%DDc%A0%C1Rt8%E1yW%0C9%A2%F0%C1%04%B8*~%DDJII%D1%06%C9%AA%03%8F%BFw%AA%0D%F0%E8%3E%F0%E4-%D1%80w%0A%E0%DB%B3g%8F%D6yjSV%9B%7B%E0%03%0D%96%93%E6%40x%DE%8D%16%BCS%00%8Bc%10%3C%09%B0%14%22%A6%F86%3A%0F4FjN%0A%80%17%7F%1F5x%A7%00s%AC(%01(%B0%C06g%91%E8%BA%F16%E6OE%D1%86w%0A%D0(Y%A5%85%971%7F%94%00%1E%15%22%CA%F2lN%DB%EC%DC%1E%1F%1FU%F8%60%F5%C0%25Q%99%1F%F1%40%08%11%ACJB%C5%02%E11%F6h6g6zK%20%BF0%95Q%60Q%8D%5D8%E1%B7C%0B%16%C8~%12%E0eQ%A7%9FI%89Q)%84%B1%D5%C7%95%C2%C4%8DT%E2%17%81%ED%97l%92%13c%9F%5D%DEQ%9BN%A8m%D6bv%FA%BF%DB%FC%2F%C0%00%B7%8B%FB6%94%1C%5D_%00%00%00%00IEND%AEB%60%82",
		checkIcon : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%000%00%00%000%08%06%00%00%00W%02%F9%87%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C9e%3C%00%00%06%A4IDATx%DA%ECY%7DLSW%14%3F%ED%7Bm_%0Bm%F9%10%94%B1%19L3%A6%A2%13%85%19%A30%13%98%0E%C5%99ls%FF%F8%D7%123%13%13%0C%A6D%02%91%2CY%E2%A2%B11!!qqs%D9%96m%D9%9C%CB6%A7Q%A3%90%91%11%F1%13%DD%D8%14%E7D%85%05%C3%F8%10Ji%DFG%FB%5Ew%CE%2B%C5%82%A5%B4%7C%CE%84%9B%9C%BE%F7%EE%BB%F7%BE%DF%EF%DCs%CE%3D%F7V%E3%F7%FB%E1Y.Zx%C6%CB%1C%819%02%93%2C%2C%FD%7C%D2%F8%DE%AC%018%F1%D5%17%E1%AA%17%A1%18QnG%EA%7B%FE%88%F4%BF%9C%81%7D%16%AB%E5~br%D2-%BC%7F%3F%AA%19%F8%1F%85%D2%0A%B3%D5%B2%7F%DB%BB%EF%00%A3%D5%C2%F1%CF%BE%FB%60%A0%DF)c%FD%87%11%7D%40Q%94Y%93%11%E0-%E6%03%9B%DF~%03%BC%22%80%C0%2BP%8C%F7X%B7%9F%DEE%24%E0%C7%81fK%82%E0%E3%CD%F1%076%BD%B5%05X%AD%0E%DCNA%15%AD%86%05%AA3%C5%C7%1D%C06%F6%B1g%C0%AF%CC%8A%F85%AA%E9%EE%8DS%C1%17%03%C3%20%F8A%11dYV%85%EEYV%0FEon%06S%9C%E90%B6-%09O%40Vf%5C%FC%8A%1F~%FA%F6%9B%BD%08%EC%D0%EB%5B%8BP%DB%A4y%04%EF%95%87%DB%D0%3D%CD%84%8E%E1%60%C3%96%8D%C0q%5C%0D%C2%DD5%EB%3E%40A%E3%E7%EF%8F%DB%09%FC%06%04%CF0zp%0F%044%3F%BA%AD%CF'%83%C7%25%80%DE%60%82%C2-%1B%C0%C0qG%10%F2%8EQ%04%E4%19%13%3F%9A%CE%E9%1FN%D8%8Dh%12%05%C5%AF%01Kf3%20%20x%DF%98%7D%7C%3E%9FJ%82C%12k%D7%E7%83N%A7%3B%86%B0%AD%C3a%94%A6k%26%8AF%A3%81%B3%A7~%2C5%9A%8C%87%0B%8A%0A%D04%0C%E0A%CD%2B%CA%F8a%1Cy%C0%A0%93%CCK%0B%3A%BD%1E%BC%5Eo%0AV%3BU%022%BD%9D%01%F0%17N%9F%22%F0%D5%AFn%5C%0F%0C%3A%A7%1B%B5%1A%0D%F8%60%11%05%01%9A._%02%8F%C7%5D%85%8F%F7Bf%40%1E%E3%A3%00u%E7%CE.%1Cr%9C%8F%0A%8B6%B5Od%CD%23%F0%B5%E7%CE%94rF%AE%3A%AF0%0Ft%2Ci%3Ev%F07%AE%5E%06%9E%E7%ABB%176%D5%07%82a%2BT%C8%F6%10%7C%B1V%ABm%7B9wY%05%DA%5D%1B%3E%EF%A0%FAp%ED%C7%12r%C4%BAsgJ%0C%9C%A1zm%C1%BA!%87%15%D0%04%7CQ%8F%E1%F1x%A0)%0C%F8%E1%19%18mB%A4%F9%86%DA%BA%AD%08%FEdn~.%3C%9F%91%06%89)I%D0Xw%E9X%FD%85%F3L~a%E1%C7%D1%CC%04i%BE%A1%B6%96%C0%D7%ACY%BFF%8D%F3%9EA1%26%CDK%A2%08%CD7%9Ape~%1A%7C%C8%3A%20%0F%8B%1F%C94%D4%D5me%18%E6%E4%AA%B5%AB%C0jI%80%DEG%83%AA%C3%AD%CE%7F%05%1DHw%14%DF%EF%A4U4%B4%DFh%A1%F7%0Du%B5%25z%83%BE%86%FA%D1%82%C4%BBD%F0%A1%E6%23%F5%0B%15%015%DF%DCt%7DL%F0O%9B%10%82%BFX_%BFM%CBhO%AEX%BD%02%2C%16%2B%0C%E2t%0B%BC%84%0E'%22x%0Er%D7%E5%60L%D6%1F%BDX%FFK%09%99%C7Xf%83%EFw%11%F8%DC%BC%DC!%87%15c2%1B%1E%C1%FF%F1%DBM%10%04%A1j%DCd.%08%FEJC%03%81%3F%91%8D%E0%E3-f%15%BCW%0A%7C%94%AE%1E%17-%ED%06X%B9%26%9BH%D4%5Cn%F8%B5d%B4O%D03%D6%EF%C2%99%3A%92%8D%ED%18%CAm%06%02%9A%8F%05%FC%ED%E6fr%DC%CAH%E0%9F%10P%7Cp%BD%B1q%3B%81_%9E%9B%05F%93)%E0h%92W%5D%60%82B%CF%14%FA%B4Z%16V%AC%5E%AE%92%B8%D6%D8X%AA(Cm%F0%8A%CF%3B%09%3C%BDg%19Vm%EF%F3%8E%1C'%92%F0%BC%07%EE%DC%FA%13DQ%05%7F0%AA-%E5%CD%2BW%B7%A3%C3~%BD%2Cg)p%C6%B8%C0tK%E15F%9A%F4%0CJ%E8%A0%2C%2C%CF%C9%22%12%D57%AE%5C%B5Sr%86%E3%ECdu%EC%D1%ACUK%02%89%99K%8AI%F3h%EB%F0wK%0B9nT%E0%87%A3%10%C5%F9E6%1Bhd%1D%F0%CE%E8%A2%04%8F9%8A%C1%C8%40%D6%CA%C5p%EB%E6%9D%C3%BF_%BB%CE%20%F8CK%B3%17%A3%C3%A3%C3%0EH1E%1B%AF%24%C1%83%D6%7B%20IR%D4%E0C%09%7C%DA%D3%D3%93%A7%D7%1B%0214%9A%22%07%7C%87H%2C%CD%CE%84%7B-%F7%0F-z1C%B5y%8F%2BF%F0hbm%0F%EE%13%89%98%C0%0F%13%C8%5C%B2%E4%F3%BB--9%18%BAJ%D2%D2%D3%A3%EFM%24%7C%5E%D0%23%09%DBK65E%E6c%8C%F3%E4%1F%EDmmt%8D%19%FC%93%85%0C5i%CB%CC%DC%DDz%F7.%A5%BA%25%F3%D3%D2b%1A%C4%E7%9AX.EYfG%7B%3B%5D'%04~%04%01*%196%DB%EE%87%AD%AD*%89y%A9%A9%EAJ%3A%5D%85%C0wvtL%0A%7C%D8dnaF%C6%EE%F6%87%0Fe%5CIK%93SR%A6%85%04%81%EF%EA%EC%9C4%F81s%A1%F4%85%2F%EC%E9h%FF%07%94%AE%AE%D2%A4y%C9SJBF%F0%DD%5D%5Dx%95%2B%F1%3B%07%E9%3B%93'%10%26%9D%5E%90%FE%DC%9E%CE%8EG%D0%DB%DD%5D%9A%90%944%25%24%E8%3B%8F%BB%7B%E8Z%8E%E3%3Bdy%F2%FB%90%88%FB%81%D4%05%F3%F7tu%FE%2B%F7%F5%F6%DA%AD%09%09%93%22A%60%FB%1F%F7%A9%E0q%5C%87%22O%CD%26j%DC%1DYr%EA%BC%B2%DE%AE%1E%E8%EF%EB%B3%9B%AD%96%09%91%20%B0%CE~'m%5D%CBq%3C%C7T%EE%00%A3%DA%13'%26'%95%F5%F5%3E%86%81~%A7%3D%DEl%8E%89%04e%A6.%E7%00%5D%CBq%1C%C7T%EF%BF%D9%E0%A9%C4x%C5%9Ah-s%F691Cu%D9M%F1%A6%A8H%10x%B7%CB%AD%82%C7%FE%0Ee%1A%F6%DEl%F0C%D1%14%B3%D5%5C%E6r%BAd%04%B5%D7%18g%8CH%82%C6%F4%B8%3D%B4%3A%97c%3FG%B4%DF%98%16%13%0A-q%F1q%E5%EEA%B7%8C%E0*8%8E%0BKBM)0%B3%C4%05%B1%1C%DB%3B%A6%F3%D8%86%0D%9E%8D%C6RP%FB%95%BC%9B%C7%F4W%A8%D0s%FA%11%24%E8%D4M%E4E%15%3C%B6s%C4%3A%F6%84%08%F8'0%BD%9C%D1P)%F0%A2%2C%09%E2%3E%3Ah%22%0E%04%5E%12%BD*x%7C%EF%F0%2B%D3%7F%60%16%93%0F%8C.z%83%AE%8A%00K%A2%B4%8Fe%19%F5%1C%93%C0c%FD%B4%D9%FC%94%FFC%A3%D3%B3U%B8%7B%FB%0B7%EC%EA%E1%17%3E%7F9%93%FF%F8h%E6%FE%A9%9F%230G%60%8E%C0%AC%96%FF%04%18%00%C8%0D%FF~%E8%B4%F6%9A%00%00%00%00IEND%AEB%60%82",
		loadingBar : "data:image/gif,GIF89a%80%00%0F%00%F2%00%00%FF%FF%FF%1Fu%FF%CC%DF%FE%BB%D5%FEX%98%FE%1Fu%FF%00%00%00%00%00%00!%FF%0BNETSCAPE2.0%03%01%00%00%00!%FE%1ACreated%20with%20ajaxload.info%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%E7%08%B2%0B%FE%AC%3D%17%C5%A4%F1%AA%7C%AB%F6%1D7%81%A3%08%99%18%B3%91%ABYI%A9%FB%96%ECk%9D%F5%8C%CB%B9%DD%F3%40%D5N%18%23%B6%8C6Z%10vd%FAtE'%B4y%8BV%A9J%E449%94%FE%9EW%AE5%EB%5D%86%B7%E8oY%0B%5E%BB%CFj%B8%99%2Cg%CF%BB%3E%BA%1E%BF%1F%F3%FF~%81Xxb%83%82%85%88iw%87%8Av%0C%03%90%91%03%13%92%91%94%95%93%0F%98%99%0E%9B%97%95%9F%92%A1%96%9A%98%A3%90%A7%9C%00%9B%9E%A5%A0%AE%A2%B0%A4%9D%A6%B2%A8%B6%AA%AD%B4%AF%BB%B1%BD%B3%AB%AC%BC%C1%C3%BA%C4%BE%C7%C0%C6%CB%B5%BF%B7%CE%B9%CD%C9%C2%A9%D5%B8%D6%D0%D8%D3%D1%C5%D2%CC%C2%CA%DE%E2%DD%E4%C8%DF%E6%E3%E8%E5%E0%DA%E7%E1%EB%CF%DB%ED%E9%EF%EA%A2%C3%BF%1A%F8%C9%FA%C8%F9%17%FB%02%FA%E3%07p%20%A8%04%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%22%C6%07%A5%A0%CE%5E%AC1%E8%9C%E5%81%14YI%A3%18%A2L%5Bj%5B%06%BF%26%1C%7F%F3%A9%CAu%CE%EF%B8%9E%A6%C5%A0%01mF%94N%F9c%06%8F%BE%A7%13%B9%9CT%05%C4%C65imv%A5_%AA%F7%26%06%93%A3e%5B%96%C0%3D%0B%A1%EF)z%1E%0F%D3-%EB%B6~%CB%1F%EF%FD%7Df%7Ffy%81iwrunp%8C%89%8D%11%85%80%92%82%86%88v%8A%83%87%1A%05%9C%9D%05%14%03%A1%A2%03%A0%A3%A1%A5%A6%A8%A3%AA%A2%AC%A7%0F%A6%AF%0E%B1%A4%B0%B1%AE%B5%B3%B1%9E%9D%B8%BE%B6%A9%C0%AB%C2%AD%C4%B2%00%B4%BF%BA%C1%CB%C3%CD%A2%BC%9C%CA%C8%B7%C6%B9%D4%CC%D8%CE%DA%C5%CF%C7%C9%D6%D3%B4%D1%9F%E1%E6%DE%D7%E0%E8%E2%D5%EB%E7%DC%DF%BB%D1%EC%D9%EA%F0%E9%ED%F7%F4%DB%F6%FD%F2%BC%FB%BA%E9%7B%E7%AF%5E%BE%82%FC%0E%DE%02%88!%DB3%0F%0E%B9A%DC%F6%B0!E%89%16%05Vd%05%20%01%01%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D'j%9D%D4%0A%0C%F4%C6%1E%17%82%9AX%92%96%99%A2W%C4L%AE%94%8D%F3Y%AF%F7%F5xz%FE%F9%13%DE%AF%C3%0B%F2b%04X%CCH%236%85L%9BS%0A%DD%15%AD%CF%AB%0F%A9tEqSp%15%88%A5j%C3%3D%F4p%AC%E6B%96e%F1%99M%9F%DB%B3x%B3%C7%ED%E0%AB%BFiuyr%83%81wz%1A~~%82%88%84%8D%86%85k%87%8E%16%8Apd%98%7Fq%90%8F%92%91%80%9E%1A%05%A3%A4%05%13%A5%A4%13%03%AB%AC%03%AA%AD%AB%AF%B0%B2%AD%B4%AC%B6%B1%0F%B0%B9%0E%BB%AE%BA%BB%B8%03%A8%A3%A7%C4%C2%C8%C0%B3%CA%B5%CC%B7%CE%BC%00%BE%C9%BD%C1%D0%C3%C7%0F%C4%A6%D7%D4%D2%D6%D5%CB%E1%CD%E3%CF%E5%D1%D3%DD%D7%DB%C6%A8%DE%E9%E7%BF%F1%EF%E0%DF%E2%F6%E4%F8%E6%FA%AB%EC%DA%D9%F3%D4%05%1C%C8O%5EAz%F7%E0%15%F4%E7%80%E1A%81%0F%09*%9CX%8Fb%C2%60%EE0d%B4%C5%E1%0F%5E%B9%8E%F9%3Eb%F0%A8%0F%E4%3E%91%1C%13%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9t%22%E7%0B%F4%BE%9E%C0%85%A3Wj%E77%91%A0YI%D4%3B%BD%D6%13%AA%DD%BD%EA6%8F%F99%D6O%184%F5B%B4%99%0C%B2%1C%1A%9D%A8%E3%B3%18%85%E2n%22i%95z%BD%25%99%15eX%DB%25bwf%E0%99%9C%B5%B6%B9%82ol%3C%8F%A0%A7k%F7%7D%9B%87%EF%CBx%5EM%0A%83r~l%7Fo%7D%8Bj%8DiH%85%91t%87z%88%96%95%98%94%9AX%86%9D%83%8C%8F%81%A1%7C%8E%A2%A6%1A%05%A9%AA%05%13%AB%AA%AD%AE%AC%0F%03%B4%B5%03%13%B6%B5%B8%B9%B7%B3%BC%BB%B9%C0%B6%C2%BA%BE%C1%C6%B6%B1%B2%0E%CA%B0%AE%C4%B4%D0%BD%0E%BC%D3%00%D5%D2%D9%C8%C5%D4%BF%DB%B4%CD%0F%E1%CC%B1%DA%DD%C7%E7%C3%DF%D6%D8%EB%E6%D7%DE%E9%B5%E3%00%F4%F4%ED%F2%D1%EE%FB%F9%EC%F1%F0%E8%00%AA%EBg%AF%9C8%83%FD%DE%E1%13%C8%8D%A1%BE%84%FC%1C%FA%CBU%F0%D9A%8B%103JT%F8o%1A%A1%C7%8E%BF0%5EL%C5A%A4%3C%0E%01O%5EH%C9%10%E5%C0m.%1B%9EL%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%02%C1%B9%EE%DE%05%0A%1FXvg8%8D)YIX5%BD%16%F4%AE%23%F9%E4%BA%C3%E3%AC%5D%0Eh%12%06%7D9%DA%ECf%9353%C6%22%F2%B8%19FQWU%95%FA%CB%0A%94O%C6%D2%19%83N%A5%5Bt%F7%8Cek%D7%E9v%9C%03.%8B%C30%05%D3%DD%9B%F7%E1%80V%7CDr%3Cuzd%88f%8Aw%83%5E%84o%82~%90%7F%92%86%7B%8Cy%87%87%81%5C%96%9F%9E%A1jI%98%9B%A5%98%9D%A3%A2%85%A0%AA%AE%1D%05%B1%B2%05%13%B3%B2%B5%B6%B4%0F%B9%BA%0E%03%BF%C0%03%13%C1%C0%C3%C4%C2%0F%C7%C8%BE%C7%C6%C4%CE%C1%D0%C0%BC%B8%B6%D5%B3%D7%B7%C9%CD%DB%CF%DD%D1%DF%C5%E1%BF%D2%E4%E3%CB%00%CA%D4%BB%B9%D9%B1%EE%BD%E9%DC%CC%DE%F4%E0%F6%E2%F8%E6%FA%E8%CA%E5%03%EB%1C%04%040p%A0%BFs%FF%12%22%5C%C8%EF_%C1v%EC%ACE%C4%C6P%5E%3D%8B%F70%E6%D3%B8%8F%2Bc%BFy%1E%1FJ%14%08%91%E4H%8F%0A%1BV%3C%A8%B2%25%CA%93%26%DF%5D%80I%90%A24%0D%17%F1%E1%CC%A8%F3BN%8D%3B%8B%25%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%85%F7%DA%07vbX%92%9F%99%A2%60%25a%D5%E4Z%90%2B%DB%8F%B8%3A%FA%C8%F7%93%9E%20%08%CC%15%7F%BA%D9-Vc%C28O%06Q7%3D!%AD%00au%97%3Dv%93%B8%E8k%E3%24C%CDR%23U%8D%D5%B2%B9%EE%2B%BC%A7l%9E%EBbZ~%EB%FB%B6%BDq~skr%1Exhc%87%8Aa%82%7D%81%8F%80%91%84%8D%02%8Be%96w%8C%90%93%9B%7F%9C%92%22%98i%7Bv%A3%88z%94%7CCo%8E%A0%83%9E%22%05%B2%B3%05%13%B4%B3%B6%B7%B5%0F%BA%BB%0E%BD%13%03%C2%C3%03%C1%C4%C2%C6%C7%C9%C4%CB%C3%CD%C8%0F%C7%C2%C0%BC%BA%B9%B7%D7%B4%D9%B8%D1%D2%CF%C5%DD%CA%E1%CC%E3%CE%E5%D0%0E%D2%03%D4%BF%D6%D5%D8%EF%DA%F1%DC%E9%DE%E7%E0%F5%E2%F9%E4%FB%E6%FD%E8%00%D4%B1%030%B0%A0%BBv%F0%FE%E1%0BhO%E1%B7%87%F7%BE%19LH%F0%60E%8A%03%D5At%18%B1-%23G%85%13%E5!%14y%91d%C6%86%0C%F5%A5%E4%B7%D2_K%80%1A%23R%1C%E9k%9E%86%99%25k%F6%D3%A0r%E7%85%9E-y%B2%DC%99%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%16%20%F8%85%C2%18%9A%E2E%96*%B9yPe%C50V%BF%9C%9D%03k%EA%F4%AC_o%02%24%0E%1F%40%D9L%C7%98(%9D2%E8%ED%89%3C%0AWFlU%7BumIT%A6D%BC%C45i%BB0%CF%BA%E6%B6%BD%DD%D3W%1E%07%A9%EFQ%F4%99%2C%DD%15%E7%3Eot%82%81%7Fu%02xSy%7Czcf%8E%86%84A%92Yp%94%80%88%8B%8Fe%89i%9Aj%91%A1l%A2nI%9F%A7%8A%A9%9E7%A4%96%AD%83%AF%20%05%B3%B4%05%13%B5%B4%B7%B8%B6%0F%BB%BC%0E%BE%BA%B8%13%03%C5%C6%03%C4%C7%C5%C9%CA%CC%C7%CE%C6%D0%C5%C1%BD%BB%C2%B5%D7%B9%D5%C3%DB%D8%0F%CA%CB%DF%E0%D2%C8%E2%CD%E6%CF%E8%C6%D4%C0%D6%DD%DA%ED%DC%F1%DE%F3%F0%00%E0%E5%0E%F8%E4%FC%EA%E1%FA%E0%D8%01%10H%D0%5D%BDY%D9%10%FA%CBwo%DC%C2~%00%CFE%3CVP%DE%40%83%17-V%A4%D7P3b%C7t%13%A3%3D%1C%19r%1A%C6%8D%F6P*%3C%F8%EB%A3%C8%92%0C%F7%91t%F9%8F%262%8B%F54%E0%CC%B8%F2%9DN%8E!5x%0Cza%A8K%A1%CF%12%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%F6%97%20%8A%DAH%86f%99%A2%E3%06b%AF%CB%C1%B3%CCL%95D%DF%8F%D9%F6%3E%C1%24(%04%FA%86%C1%9C%05%92%C35%991%A53%FAt%10%91G%E3%CA%1A%C4%9A%A4%D0%1Ax%A7%B3%95%C7%E6%257%BB%DE%02%AE%DA_%7B%84%AEW%D3S%F1%1D%0D%9F%9F%FCE%80%5Et%7B%85T%87z%88%3C%82q%7Fo%5D%8D%81%8F%3Ev%8Ag%86%89%99%8B%93n%7D%9Cr%9F%8ED%95%9A%97%96jxa%9B%9E%AC%90%8C%80%05%B1%B2%05%13%B3%B2%B5%B6%B4%0F%B9%BA%0E%BC%B8%B6%C0%B3%13%03%C5%C6%03%C4%C7%C5%C9%CA%CC%C7%CE%C6%BF%BB%B9%C2%B7%D3%C1%D7%C3%D9%D6%BE%D4%0F%CA%CB%DF%E0%D0%E1%0E%E0%C8%E2%CA%D2%DD%D8%EC%DA%EE%DC%00%EB%F2%DE%F0%B1%E4%E8%E6%E3%E9%CF%FC%C6%F8%F3%02%D6%A3%D7%8E%E0%3B%83%F1%E6%9D%C3%C7%D0_9%00%E7%04%16%94x%90b%C2%81%0B%1D%E6%83%B8O._3%8D%16%EFm%13i%AF%17B%92'M*%EC%C8%F1%A3%C7~%2F%FFiD%A8%A1%20%BC%9A%07o%5E%B0I%F3%82K%7F%1A~%C6%0C%FA%2C%01%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%F6%1D7%09%24%A9%95%E6%85%0A'%BA%81%18%FC%8A33URL%E3%16%84%8F%2B%D6%23(t%10%81%2B%DE%ED%E7%93)%9B%3B%A6%CE%06%A5%1A%83H%D7%10%BBMJk9po%1A~%92%C7%E2%A5%EC%D8%D5%5EW%D9%929%5D-%7F%E7%F8%FB%97%FDv%03%F8%7FAyNz%84%86Q%87V%81pm%25q)%7Dr%85%88%94%8A%83%95vk%5C%91%90%8B~D%97%96%93%A2%89%99%98h%80%A9%9B%9E%25%05%AE%AF%05%13%B0%AF%B2%B3%B1%0F%B6%B7%0E%B9%B5%B3%BD%B0%BF%B4%0F%03%C4%C5%03%13%C6%C5%C8%C9%C7%C3%CC%BC%B8%B6%C1%AE%D3%BA%00%D0%BB%D2%D1%BE%DB%C0%CE%C9%CB%E0%DF%C6%E1%C6%D8%D7%DA%D9%DC%EA%DE%EC%C2%EE%D4%DD%EF%E8%EB%00%CC%CD%0E%F7%E5%CA%E3%C5%E7%FF%E9%E8%B5%138%0F%60%BDs%FA%FA%11%DB%B7P%E1%00%83%03!%16%0C(1%1E%3Ck%09%F31c%88%CF'%DE3%8A%20%0F%86%8C8rb%BD%8C%1E%C5iT%99%92%5C%3Dw%1A%5E%12%8C9%10%E6%05%992Y%AEl%B8O%03%B8%04%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%F6%1D7%81%93%60%9A%DA%89%5E%AA%B0%91%AF%183ceAv%0D%DB7%B6%E7%8F%D6%CA!t%05%85%3C%9D%2C%89%FB9%97%40%1F%14V%2C%09%AD-%A6%94%D6%9Cz%B9%5BI%B87%13%97%C9%D5c%0B%AB%D2%9E%95%E0w7%EE%AEG%E5%C4%ABZ%C5%3E%D9%9Ftw%7F_f%83qiyk%7B~%82%8D%80%85%8E%84d%86f%88%00%96E%94%93%91%81%8F%9B%9Ep%95z%89%7C%8B%26%05%A8%A9%05%13%AA%A9%AC%AD%AB%0F%B0%B1%0E%B3%AF%AD%B7%AA%B9%AE%B2%B0%13%03%C0%C1%03%BF%C2%C0%C4%C5%B6%BD%B8%CA%BA%CC%BC%B5%BE%CE%A8%BB%D3%D2%B4%00%C9%0E%C5%C6%0F%DB%C3%DD%DB%D9%D8%D1%D0%CB%E5%CD%E7%CF%E3%E6%EB%E8%ED%EA%E2%DE%C7%C2%F3%C1%E2%F7%E4%EF%D5%E9%FB%FA%D7%F8%EC%E2m%AB%C7M%5B%B8%7C%00%DD%25%84%87%B0a%C0%7C%F2%C0%15%238%60a%3F%8B%FF%1C*%D4%C8%90%1B%5DD%83%13%25%D2c%97N%03%C9w%26%DD%95%BCp%B2%A5J%00!%EBi%98%98%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%F6%1D7%81%A3%F8%08(%AA%A5j%25a%E4%16%BB%16%E4%96%F3m%E7%BC%C9%A6%93%1F%8A%863%11wF%1D%2C%D9c%14%9DH%A8C(%08%0A%8FK%A9%8C%C9%D5b%B7%5E%25%F85%AEM%85%D6%DFw-f7%C9%EE.%5CLM%B3%E2%E1%B7%B9%FC%9C%EB%FB%7B_u'Wm%86%7FQ~r%81%87%8Bv%40%84j%8Dy%8E%89%8C%88Y%8A%94Z%83g%3F%05%A0%A1%05%13%A2%A1%A4%A5%A3%0F%A8%A9%0E%AB%A7%A5%AF%A2%B1%A6%AA%A8%B3%A0%13%03%BA%BB%03%B9%BC%BA%AE%B5%B0%C2%B2%C4%B4%AD%B6%C6%B8%CA%AC%00%C1%C8%C3%D0%C5%0E%BF%BA%BE%BF%CF%CE%C9%D2%C7%DA%D1%DE%D3%E0%DD%D9%E4%DB%E2%CB%D4%D5%D7%BC%E5%DF%ED%E1%EF%E3%E6%F1%E8%E7%CD%D5%BD%0F%F8%F4%CD%FC%B7%FD%F3%02%BA%13%18%0E%DF%BA%5D%FE%98%FD%5B%A8%B0!%B7z%09%D3%FD%3Ah%ED%1B7%0D%16%C5a%0Cw%F1%0CB%C6%8F%1C5%5E%988%92%17%80%04%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%FF%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%F6%1D7%81%A3%08%99%8E%A0%AA%1B%D9%9A%95%84%B9%B1u%D2q%89%EFp%FE%AC%C0%9A%AE%C7c%0C%8D7%A2%129%5B%CA%5EL%00p%25LF%AB%CD%AB%2F%FB%C4B%BB%DB%AF%8D%3B%96N%05%DEtX%5D%04%B7%CBlg%F9%8C%5E%DB%DFG%B7%3C%0F%BF%EF%7FgqZxVz%83%7Fd%7C%8A%80S%82%86%8F%7D%84%89%85%91%88b%13t%05%9A%9B%05%13%9C%9B%9E%9F%9D%0F%A2%A3%0E%A5%A1%9F%A9%9C%AB%A0%A4%A2%AD%9A%B1%A6%00%03%B6%B7%03%A8%AF%AA%BB%AC%BD%AE%A7%B0%BF%B2%C3%B4%BA%C1%BC%C8%BE%CA%C0%B5%B8%B6%C7%00%D1%D3%C2%CC%C4%D6%C6%D5%D2%DA%D4%C9%DB%DE%CF%D0%DC%E3%DE%DD%CB%DF%E7%E6%CD%EA%D7%E8%CD%E1%B9%E4%E9%F2%EB%F4%ED%EC%D9%E5%F6%B4%F0%F8%B3%FF%C5%00b%13%E8%EE%DE%BE%09%F0%DCi%F0%C6l%E1%B9%86%17%18*%8C%F8pb%2B%87%CD%1C%3C%03%90%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%80%00%0F%00%00%03%E7%08%B4%0B%FE%AC%3D%17%C9%A4%F1%AA%7C%AB%F6%1D7%81%A3%08%99%18%B3%91%ABYI%A9%FB%96%ECk%9D%F5%8C%CB%B9%DD%F3%40%D5N%18%23%B6%8C6Z%10vd%FAtE'%B4y%8BV%A9J%E449%94%FE%9EW%AE5%EB%5D%86%B7%E8oY%0B%5E%BB%CFj%B8%99%2Cg%CF%BB%3E%BA%1E%BF%1F%F3%FF~%81Xxb%83%82%85%88iw%87%8Av%0C%05%90%91%05%13%92%91%94%95%93%0F%98%99%0E%9B%97%95%9F%92%A1%96%9A%98%A3%90%A7%9C%00%9B%9E%A5%A0%AE%A2%B0%A4%9D%A6%B2%A8%B6%AA%AD%B4%AF%BB%B1%BD%B3%AB%AC%BC%C1%C3%BA%C4%BE%C7%C0%C6%CB%B5%BF%B7%CE%B9%CD%C9%C2%A9%D5%B8%D6%D0%D8%D3%D1%C5%D2%CC%C2%CA%DE%E2%DD%E4%C8%DF%E6%E3%E8%E5%E0%DA%E7%E1%EB%CF%DB%ED%E9%EF%EA%A2%C3%BF%1A%F8%C9%FA%C8%F9%17%FB%02%FA%E3%07p%20%A8%04%00%3B%00%00%00%00%00%00%00%00%00",
		loading : "data:image/gif,GIF89a%1F%00%1F%00%F5%00%00%FF%FF%FF%1Fu%FF%EA%F2%FE%D7%E6%FE%C4%DA%FE%B7%D2%FE%AD%CC%FE%E0%EB%FE%C0%D8%FE%A6%C8%FE%E7%EF%FE%DC%E9%FE%B4%D0%FE%AB%CB%FE%B9%D3%FE%D2%E3%FE%F6%F9%FE%B2%CF%FE%D9%E7%FE%E8%F1%FEN%92%FE%40%89%FEe%A0%FE%CB%DE%FE%81%B1%FE%9F%C3%FEj%A3%FE%FA%FB%FEz%AD%FE%5C%9A%FE%CC%DF%FE%F8%FA%FE%5E%9B%FEJ%8F%FE%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00!%FF%0BNETSCAPE2.0%03%01%00%00%00!%FE%1ACreated%20with%20ajaxload.info%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%80b%C1%24%1E%C4%A8tx%40%24%AEW%40e%BB%E58%3ES%A9%82%80-k%B9%5C%8C'%3C%5C0%CAf4%1A%C4%60%03%1A%F0%B8%9C%1B%0A%2F%1A%00yXg%7B%15w%0BQ%0Ao%09%81X%0E%0F%0A%10%00%02%17%19%1Ah%8D%0C%0ADd%83%09%11%12a%1B%06%1D%86e%04Ty%00%9Bvky%07BVe%11%13vC%13%11p%08%93y%A1%B6C%12yFp%0E%BFQ%0EpGpP%C6C%0FpHp%AC%CD%ABpIp%92%D4%00%10pJ%DA%CD%06%D8%DF%DCe%06%05%D2%DF%0A%D6%9DX%CC%D4%CF%A7%03%C4%DF%C8e%03%02%BD%D4%C1p%02%00%B2X%B4%8C%E1%D2%25%E4%80%AAia6%BD%1A%C2%8E%D1'_S%24%E4jt%05%D5%10EY%CA%3C%8A%B4M%C1%83z%19%13h%8A%F2%87%A2*AY%1A%20%9A%82%07%A5I8%80%D8%B8q%89%92%C1J6c%04%BD%AC%88%D0N%15%0F8%2F%11%C0%FAf%04%89%12s%04%EE%D9%09%02%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%C0P%20%0C%04%C4%A8tx%40%24%AEW%00%F6%8A8L%A7%0A%C2%16%AB%1D'%08%8A%EFp%C10g%DD%09%C6B%0Dh%C0%13ew%E3%BB%D8%DF%F3f%00!%0CQ%0Amx%5B%0E%0F%0A%10%00%10%0A%0F%0E%5B%00%15%15%20%1EDbd%09%11%12j%12%11x%95%95%18%1FB%07%81iti%A3%A3%0EBV%5B%11%13tC%1E%1D%AD%15%1C%00%02f%9E%B5C%06%B9%15%0F%03c%AF%C0C%1B%1A%B9gc%0F%C9D%19%B9%18%05c%AA%D1%00%17%B9%16%06c%8D%D9%BC%B9%14%E1%D9%DE%5B%E0%D9%10cL%D7%E5%0AcM%CF%E5%0FcN%C7%E5%92%5BO%BE%D9%12fPba%99%95lB%A8-%08N%A5%AA%95%C6%8C%17!%9A%DEt%FA%14%0A%10%01%22%86%DE%60Q%C4%C8%11%24%7D%1A%19%60%13%D2%07%D0%18%93%93%1A%CC%99b%07%0EJ%2C%7B%D4%B0q%09G%0E%C3%88%93%DC%A0%89V%E5%E4%98%0C.%E5x%1DI%B2%A4%C9%13%3AA%00%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%C0P%20%0C%04%C4%A8tx%40%24%AEW%00%F6%8A8L%A7%0A%C2%16%AB%1D'%08%8A%EFp%C10g%DD%09%C6B%0Dh%C0%13ew%E3%BB%D8%DF%F3fusD%0Amx%5B%0E%0F%0A%10%00%10%0A%0F%0E%5Be%0CiCbd%09%11%12j%12%11%87X%04T%81%95jif%5E%00V%5B%11%13tC%13%9E%5B%08%00%02f%9B%AEC%12fFc%0E%B8Q%91%5BGc%0F%BFD%0FcHc%A4%C6%0AcIc%8C%C6B%10cJ%D3%D3%06%D1%D8%B4%15%DE%DE%14%05%CB%DC%17%DF%DE%16%97X%C5%D8%19%E6%15%18%03%BD%D8%1B%1A%EE%09%B5c%B7%BF%06%EE%15%C5%AAXX%FD%F2%D0%C1%1D%07!%07F%B9J%D3%CF%97%90t%874q%F2%04%C0%1C%86%0FC%0A%BD%C1%92hQ%A3G%C1%B2x%03%E1!J%1F%40cPJ%0A%C1%E0%8B%1D8*%B1%ECQ%C3%06%26%1C9%0B!b2%83%C6X%95%0E%94c%BAp%A3u%24%C9%92%26O%E8%04%01%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%C0P%20%0C%04%C4%A8tx%40%24%AEW%00%F6%8A8L%A7%0A%C2%16%AB%1D'%08%8A%EFp%C10g%DD%09%C6B%0Dh%C0%13ew%E3%BB%D8%DF%F3fusD%0Amx%5B%0E%0F%0A%10%00%10%0A%0F%0E%5Be%0CiCbd%09%11%12j%12%11%87X%04T%81%95jif%5E%00V%5B%11%13tC%13%9E%5B%08%00%02f%9B%AEC%12fFc%0E%B8Q%91%5BGc%0F%BFD%0FcHc%A4%C6%0AcIc%8C%C6B%10cJ%D3%D3%06%D1%D8%8D%D6%05%CB%DC%CE%5BM%C4%DC%C8%5BN%BD%DC%C1XO%B6%D3%BAcP%AAX%AC%BF%B0c%B3%00%07%A3%AE%1E%80WP%01%B8%F4F%D3%97%0D%06%3AT%00%14jH%A17X%12-%A2u!%83%86%0A%18%17%5E%A1%14%A5%0F%40I%19Cb%14%F4%C5%0E%1C%00%22C%86%A0%C3%E6dJ%8C%20%18%B8%0A%E3%06eJ%0C%FF~U%19c3%23%07%0F%07%1F%B8%19A%A2%84%82%05%0C%09%8A%A9%09%02%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%C0P%20%0C%04%C4%A8tx%40%24%AEW%00%F6%8A8L%A7%0A%C2%16%AB%1D'%08%8A%EFp%C10g%DD%09%C6B%0Dh%C0%13ew%E3%BB%D8%DF%F3fusD%0Amx%5B%0E%0F%0A%10%00%10%0A%0F%0E%5Be%0CiCbd%09%11%12j%12%11%87X%04T%81%95jif%5E%00V%5B%11%13tC%13%9E%5B%08%00%02f%9B%AEC%12fFc%0E%B8Q%91%5BGc%0F%BFD%0FcHc%A4%C6%0AcIc%8C%C6B%10cJ%D3%D3%06%D1%D8%8D%D6%05%CB%DC%CE%5BM%C4%DC%C8%5BN%BD%DC%C1XO%B6%D3%BAcP%AAX%AC%BF%B0c%B3%00%07%81%1E%AE%A6cP%01%B8%94%A5B%07%03%1B%BEt%FAt%25%D4%90B%05%2BH%D4%90%E1%02%14G%90%24%5D%A1%14%A5%0F%00%89%20C%02%1A%23%E8K%88%90(Gn%D9%A3%86%01%08%94%20Un%1C%A4%C6%03%06%98%15d%A2%F9%F5%C1%01%87%0F%94%F9%04NC%86%C1%02%85%25M%9E%D0%09%02%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%C0P%20%0C%04%C4%A8tx%40%24%AEW%00%F6%8A8L%A7%0A%C2%16%AB%1D'%08%8A%EFp%C10g%DD%09%C6B%0Dh%C0%13ew%E3%BB%D8%DF%F3fusD%0Amx%5B%0E%0F%0A%10%00%10%0A%0F%0E%5Be%0CiCbd%09%11%12j%12%11%87X%04T%81%95jif%5E%00V%5B%11%13tC%13%9E%5B%08%00%02f%9B%AEC%12fFc%0E%B8Q%91%5BGc%0F%BFD%0FcHc%A4%C6%0AcIc%8C%C6B%10cJ%D3%D3%14%15%DB%DBP%D8%D5%5B%06%16%DC%DB%17%D8%00%CE%5B%05%18%E4%15%19%E7%C8%5Bb%ED%1A%1B%D8%C1X%03%0F%ED%15%D7%BF%BAc%A0ph%D7%C1%C3%2FXcf%01p%C0%0F%9D%2BScP%7D%60%C7M%8B%26N%9E%00%85%1A%E2%01%C46%40%89%165z%84%EF%13%A5(%0CB%00%1A%B3RR%83AR%EC%C0i%89e%8F%1A63%E1%C8yx%89%A5%1B%114%C6%AA%F8%94%85%0A%9B%11%24J%988%F1%F6%25%08%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%14%0C%08%05%03%C0P%20%0C%04%C4%A8tx%40%24%AEW%00%F6%8A8L%A7%0A%C2%16%AB%1D'%08%8A%EFp%C10g%DD%09%C6B%0Dh%C0%13ew%E3%CB%08%E5%CD%7FcusD%1E%20%15%15%7F%0E%0F%0A%10%00%10%0A%0F%0E%5Be%0CiB%1F%18%88%88Z%11%12j%12%11x%5B%04C%0E%9B%9B%00%97jif%5E%00%1C%A8%15%1D%1EtC%13%A2%5B%08%00%0F%B2%15J%B6C%12f%02%09%B2%1A%1B%C1D%93%5B%03%9A%A8%19%CAD%0Fc%04%16%B2%17%D2C%0Ac%05%14%B2P%DA%8Fc%C0%E2%CA%06c%8E%E2%10%E4%05c%AB%D2%DC%5BMc%0F%E6%D4%A4%03c%0E%E6%CCXOf%3EI%1B6%06%8A%95-%11%26(%C35f%17%80%03%80%E0%81%09%94%E0%15%001d%12x%02%25%EAO%A9mmFaY%D4%E8Q%24%7F%22-EY%B0%E7%0EE2%0D%08I%B1%03%E7%E5%95%3Dj%D8%D4%84%23%C7V%18%137%2F%D1H%AB%22%A8%A1EmF%90(a%E2%24%DC%97%20%00!%F9%04%09%0A%00%00%00%2C%00%00%00%00%1F%00%1F%00%00%06%FF%40%80pH%7C%240%16%0A%C0P%20%0C%04%C4%A8T%F8qp*X%2C%20%C1%E5%22%0E%D3%A9%07%93-o%BB%5D%82%22%3Cd%80%CAf4%9A%B1%60%03B%F0%B8%BC%DB%08%2F%FAyYg%7B%09%00%0DuD%0A%0C%5C%00e%1A%19%17P%10%0A%0F%0Ehg%0CkC%04%97%15%1D%06%1Ba%12%11%85h%04C%07%7B%00%1Ev%00k%7B%60%00%08r%11%13%ADB%13%A4h%08%00%02%7B%12%B7C%12%7B%02%03r%0E%C1D%96h%03%9Ch%0F%C9CF%A6%05r%9A%D1%0Ar%05%06r%10%D1B%10r%06%DF%D1%DCh%DE%DF%E1hL%D6%E4%D9hMr%D0%DF%D3i%C6h%C8%DF%CB%5DO%BF%D1%C3r%A0%CCBS%2BX.9%BC%00%A4%92%E3%AA%D5%2B9%B1%008c%94%20%020Q%A4%06%2585D%11%C5.%0E%1E(%F06%A9%D2%25.%99%A2%FC%D1%C8%90%10%A3Ca%1A%B8%2C%E5%B2%0F%9B%05%8B%08%B1%ECB%C7%E1%C4%15%93%7B%D4%24%3B0%B0%0B%CB%2F%E4z5%DB%B6%A4%C9%13%3BA%00%00%3B%00%00%00%00%00%00%00%00%00",
		controlBg :  "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%01%F4%00%00%01%20%08%03%00%00%00u%A7q%81%00%00%00%CCPLTE%FF%FF%FF%7B%8E%B5p%84%AFh~%ABcy%A8%E8%E8%E8%EA%E9%E9%E0%E0%DF%E2%E2%E2%E6%E6%E6%F3%F2%F3%E7%E7%E7%F5%F4%F5%E4%E4%E3%F1%F2%F1%F0%F1%F0%F5%F6%F6%F3%F3%F4%E4%E5%E5%DC%DC%DC%F4%F4%F4%E1%E0%E0%EC%EB%EC%EC%EC%EC%EE%EE%ED%EF%EF%EF%F0%F0%F0%FF%FF%FFJd%9B%EB%EB%EA%DE%DD%DD%DF%DE%DF%DB%DB%DB%5Ct%A9l%A8Qh%A5L%5Dv%AAk%A8Pi%A6Mbz%ACYs%A8u%AD%5Bt%ADZm%A9Rp%ABVh%A6Lo%AAUn%A9TZt%A8j%A7Or%ACXi%A7N%5Cu%A9%5Ew%AAs%ACYq%ABW%8A%9C%C2%5Bt%A8az%AC%60y%AB_x%ABYr%A7%98%C2%86u%AE%5CXr%A7g%A5KYr%A8c%7B%AD%D4%E0fh%00%00%00%01tRNS%00%40%E6%D8f%00%00%02%2BIDATx%5E%ED%D1%B5n%1C%0A%00E%C1%BB%60ff%0833%C3%FB%FF%7F%8A-e%93'%A5M%5C%EC%9D%E9N%7DrT%87%AC%D7!%CBu%C8v%1D%B2Q%87%2C%D6!%ABu%C8Z%1DrX%87%1C%D4!%FBu%C8%5E%1D%B2%5B%87%9C%D4!%B3u%C8L%1D%B2T%87%2C%D4!%9Bu%C8J%1D2_%87%EC%D4!su%C8Y%1DrZ%87l%D5!%E7u%98%9A%E9%98%8E%E9%98n%3A%A6c%3A%A6c%3A%A6c%3A%A6c%3A%A6c%3A%A6c%3A%A6c%3A%A6c%3Ay%5B%87%FCW%87%86%E9%98N%EE%D4!%EF%EB%90%0Fu(%9CN%3E%D6%A1p%3AyU%87%DC%ACC%5E%D6!%D7%EA%90wu%C8%D3%3A%E4n%1D%F2%BD%0E%F9T%87%C2%E9%E4k%1D%AEx%3A%A6c%3A%A6c%3A%A6c%3A%A6c%3A%A6%9B%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98N%3E%D7!_%EA%90%7Bu%C8%FD%3A%E4u%1D%F2%BC%0EyS%87%3C%ACC%1E%D7!O%EA%90%07u%C8%F5%3A%E4V%1D%F2%AC%0EyQ%87%DC%AEC%1E%D5!7%EA%90ou%F8%EB%D31%1D%D31%1D%D31%1D%D31%1D%D31%1D%D31%DDtL%C7tL%C7tL%C7tL%C7tL%C7tL%C7tL%C7tL%C7trT%87%AC%D7!%CBu%C8v%1D%B2Q%87%2C%D6!%ABu%C8Z%1Dr8%F58%9E%F8%D99%98~%8C%07%97%C6%93%CC~%01F%17%CFG%BF*%7B%0D%18%0E%86%BF%23%BB%15%18%FE%2FrR%87%CC%D6!3u%C8R%1D%B2P%87l%D6!%2Bu%C8%7C%1D%B2S%87%CC%D5!gu%C8i%1D%B2U%87%9C%D7aj%A6c%3A%A6c%BA%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%98%8E%E9%E4%EA%00%00%00%00p4%91%1E4%3E%A7%F19%8D%CF%F9%C7%CF%01%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%80%E3%89%F4%60%3C%B84N%13F%17%CFG%E9%C2p0L%1B%FE%7C%0E%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%3F%00%3E(%10%F1%C6%1F%FF%1B%00%00%00%00IEND%AEB%60%82",
		btnBg : "data:image/gif,GIF89a%0A%00X%02%C4%1F%00%F3%F3%F3%EB%EB%EB%FE%FE%FE%E1%E1%E1%F9%F9%F9%E5%E5%E5%DE%DE%DE%FB%FB%FB%E8%E7%E8%E7%E8%E7%F8%F8%F8%E8%E8%E9%DF%E0%E0%E7%E7%E7%DF%E0%DF%E3%E4%E4%E3%E3%E3%F7%F6%F6%FB%FB%FA%FC%FB%FC%E0%DF%DF%F0%F0%F0%F6%F6%F6%FB%FC%FB%FC%FC%FC%E0%DF%E0%EF%EF%EF%E7%E7%E6%E9%E9%E8%DF%DF%DF%E0%E0%E0%FF%FF%FF!%F9%04%01%00%00%1F%00%2C%00%00%00%00%0A%00X%02%00%05%FF%A0%20%8Edi%9E%22%A6%AE%EC%E1%BAR%2C%1DDm%DFJ%A4%EC%FCn%FD%C0%20%C02%2C%12%89%80%A4RYi%3A%9F%9A%A8t%1A%D0T%AFVk%60%CB%E5r%BE%81%2Fg%11%5E%20%12%8BE%02%BD%DE%B87%85%B7%FBQ%A0%17%EA%F4%07d%CF%EF%0F%FE%80%81%1E%83%84%85%1D%06%06%87%1D%8B%8B%88%8E%8F%90%91%1F%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%C2(%CE%CF%D0%D1%2C%D3%18%13%2F.%D602%DB37%DE%04%3D%E19%11%E4%E4%16%E5A%E9%40IG%ECK%EF%F0%EFO%F3%15S%F5R%F7S%FAW%5BY%5D%FF%00%01%8A%19(%E6L%83%04%08%1A%20P%93%60C%039%0E%DD%DC%99H%11%8F%9E%07%181%F6%D9%B8'%90%C7%01%1E%3E%86%F4%90%A1%03%05%0F%0C%0A%CF1%60%B4%88%82%03F%8F%0E!%92%19%A9%A6%24f8s%EA%DC%C9%B3%A7%CF%9F%40%83%0A%1DJ%B4%A8%D1%A3H%93*%5D%CA%B4i%B3hP%A3J-%A1B%005%15%13.%1C%98%80%E1%C0%85%AE.%B4%86%BD6C%06%8C%031%BCI%C0%A1%C0F%5Bp%3D%E0%EE%D01n%AE%8F%08%3F%F0%02%D1%AB%EE%87%11w~%E3%09%1E%5Ca%09%BD%C3%87%F5)%5E%2C%05%8B%E3%80%90%23%0B%24%18%E6K%9A%05c%D2d%3Ex0%E1%99%84%0D%1E%86v3%FA%0E%1C%D3%15S%DF%C9%98%11%82F%8E%1B%FF%F0%190%FB%A3%C7%90%82p%83%24%B4%BB%03%83%0C%0EPz%E8%E0%60%25%CB%E3%89h%CE%B4%C9%FC%91%D3%E7%D0%A3K%9FN%BD%BA%F5%EB%D8%B3k%DF%CE%BD%BB%F7R!%00%00%3B",
		windowCascade : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%20%00%00%00%20%08%06%00%00%00szz%F4%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C9e%3C%00%00%02%BBIDATx%DA%C4%96%CFk%D4%40%14%C7%DF%FC%CA%CE%96%15Y%BB%E8%A1%D0%DAS%A1%BD%0B%E2E%10%3CX%10%0F%22%E8%3F%E0%D5%83%07%11Q%14%3D%08%1E%FD%2Bz%12%C5%16%8A%1E%BDx%B6%5B%F1fU%B0E%A8(%D4%96Mf%7CoL%934%3Fv%B3IZ%07%1Ea7%C9%9B%EF%BC%F7%FDL%86%01%80%9Cz%B4%FC%C2%07%BEh%AD%85%26%06c%0C%24%98%D7%DF%EE_%BA%82%3F%FDa%CFJ%8C6M%FE%F8%F2%19%08%8C%01%5Esr%83!8%87%7B%2F%DF%2FRn%8C%DF%A3%04h%1F'%9E%D4%12n%AFn%80D%05%AC%E2%E4T%3F%1F%15%3C%BB8%0D%94%93r%97%11%C0%7Cc%A1%AB%15%CC%F5%3A%20%18%95%B0%A2%00T%10%60P.%CA%09%25%D6B%02%60%80b%CF%CFh%8C%19hj%04%A6%DCsN%80%09%BD%B7%DE%EF%03%E7%0C4%F6A%E1%95W%A8%04%C3F%9C%9A%9D%03V%F2e%99%FC%D1%D2%1A%DAJ%C0%AD%B7_a%E9%E3v%C5VX%90%EC%13L%60%9E%DE%C3%E5M%8E%92%86Q!c%FB%A0c%3C%0F%3Ah%C6%A5%F5mx~%ED%AC%5B%0D%AF%E8%07%1E%AA%B7%23%A88X%01%14%D0%F2%A4%7B%ED%E4%84%82%3Bo%BE%1C%3A%152Q%00P%9E%02O%E1_%F8%F0%89%B6%97%A5%C2%8E%2F%80%CC8%8C%0A%99%CC%EB%26W%CA%B1t%E1%B4%C6h%8E%0A%DF%940%A1%C2%16%80%94%11%16I*%3A%BAU%C9%94%E4%A3%EE%D4%AC%CB3R%80P%5EX%25%9BK%05%FD_%C5%0F%92%7F(%A4B%A6%F5%26%7B%7D%14T%C8%7F7!W%C7QP%E1%04(%91%FA%06r%5E%8E%8A%06%BE%15ny%ED%60g%ED%F8%83%95%85%01%DE%A5%E4%CC%13%87N%C5%C0%C4%26%DC%DB%7Cr%F5%3A%5E'%A9%3Dn%E1w_%AD%E4Q%D1%EF%AF9%1B%B2%8A%25%A0%03%0F%F9h~~!%FA%FE%90%80%1D%8C%CF%18%DF%C3%EEwY%D8%E5%0C%15-%0D%86%F1Z%1E%E0%D6d0%A4%8F%C3%AF%22%8A%93T%90)-%ABwfb%91%00%9B%DD%07bd%F2uPKl%E5%F5%C7%1BS%E1F%14%ED%88%05TxhHSS%00%DF%17%60%8B%05X%BD%F7%F3%1DRq.M%05aij%1E%9C%F9%C1%AE%E6%0A%D8%DDzz%E3%26%5E%7B%E1%FD%88%0A%AA%40PS%80%600%B2%05%7F060%B6%D2Tx%E8%81%A0f%09D%CA%60y%02%FC%F0%D0%90%3DN%23%01B%40%A3%83%8F%D3%B7F'fc%08%C8P%D1%C0%D8%CF)%CBl%601%15%A6%11%0Ahr%CA%89%BB%9F-S%DCc%18%D3%09*%1A9%A1a%FC%20%B3%97%11%20%C3%E3%B4%06%80%A6%DC%40u%DC%0D%89%FB%BF%E3%AF%00%03%00%855%FE%8B%89H%5Du%00%00%00%00IEND%AEB%60%82",
		alert : "data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%20%00%00%00%20%08%06%00%00%00szz%F4%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C9e%3C%00%00%07%26IDATx%DA%B4Wyl%14e%14%FF%CD%EC%CE%1E%BD%B6-%A5%5B%B6%07%10%E8%89E%2Br%17%0A%0D%1E%20%08%C6%DB%A0%60%D4%A4%26%24%FA%87%0A%12IQ%09%8A%12%94h%22%88bD%131%E5%D0H%00%15%CB%7D%14%10%AA%14%22m%B9z%2C%BB%ED%F6Zv%DBnwv%3E%DF73m%D7r%141%DD%E4%ED%CC%7C%DF7%EF%FD%BE%F7~%EF%BDo%04%F4%FF%13%F7%BE%3Dq%B6%CD%22l%11%25%B3d%B4D%22%E0m%0Az%03x%7C%FA%8A%A3%3Bh%5E%C1%00%FE%C4%DDK%C6%3FZ%BE%AA%90u%9E%DF%CDX%DBY%92%0A%BA%DF%C5%CA%3F%2Cd%9B%5E%C9%CB%A65%C2%FF2%D0%CF%BCiP%84%B8.k%DE%9B0%07%0F%00%07%A7%AAb6Tcx%E1%02%A4%DB-_%D1%1Ai%20%01XE%B0Dsj%0Epy%3D%AD%8E%A4%FDF%00%AE%1D0E%D9%A1%84%94xZc%19H%00%92%EA%E1%CEv2%93%ACy%5B%201F%AB%17%0A%BE%81%06%8D%03%09%40i%F0%C9%A5%EE%3F~%06%86%15%01L%D6%24e%3E%DC%15%A5p%B5%F1%B8%0C%2C%09%A3c%23%A51%A7%DF%9F%C6%98%AF%96%B1%1D%89%9A%F8j%D8%89%E2%B1%8C%E6G%91D%0C%A4%07%3AZ%FD%C1%C6%60%A7_%91%DB%EA)%0CCh%88%DB%ED%EA%9Eo%23%09%F4%7D%E9%D0%F2%FC%B8%DB%05%C0%E3'%9DZY%D0%80P0VQ%AE%F7%26%A31%EB%A0d%18%23hiW%23A6%11%ACzD%3B2p%A2X%A8%15%C4%F0%3D0%8D%B9%F1q8%BDr%0A%F2%96%1E4%87%A3%BD%19%80Hn%3C%EF%8D%CF%01%99%E9N%11%FE%AD%93%D1s%D5%1A%A2%9CU%9B%ABZ%85%CCg%3E%A4%5B%D6%A7%0A0%8EX%D5z%EE%CBe(%9A1%CC%B1n%CF%E5%CB%FD%010%A9%3B%97%83%E4%BB%D9%A4%90v(t%EFJ%E8%8D%94%40K%0D%16m%CC%7F%1186%F7z%FEq%E3%8C%22%92%BF%03%1D%CD%0D%20%E3%9D%BA%12v%2B%00%FA%CB%04%C0%40%1E%13%B8%18%F4%F7%0C%3A%18%3D%FDz%00Qv%B2%1B%A4%BF%0A%A0%83%24%D4%BD%96%DD%CAx%18%00n%80B5l%3E%05d%24y%83%F2%FE%DAy%A0%F9(m2%A8%ED%FE%B6*.%01P(M!%87%03%E8%97%84%10%0D%B4%CBP%07%DC%97%18%BC5%BFB%B4D%60%D0%C8Q%88%CD%99%0E%5C%F8%82x%EE%09%F3J%3F%00%D4%CA%2C%E3%BFd%01%E96%E2%CC%86%D5%A8%B8%E8%F9%F9%A7S%0D%BB%B2%93%A3%D2%0A%B3%2B%5EH%BB%7B%8C%7Dh%E1%8B%40%E5'%A4%5B%09%E3%C6%CD~%82%AE2%F8%9F%00%C8%3F%FD%E1.%DAR%E6%AC%AF%A8%F5%D6%D1%B3%8Foc9%B0s%CF%12%E5%2B%5Bjjzl%FC%7D%14%8E%E3%BD%7C%B8%25%00%83Z-%99%D2%E3%7D%C3%B1%E5%F9%2B%8C%22%9E%17%C0%1C!%26%1Cp%FB%82%2F%CD%F9%A8%ACZ%CF%2F%B5%99%D8%F4%B7%DB%F5%C2%C2-%C5%2F%9D%9B%FE%E8%C29y%9F%A6%CF.%00%AEl%A6%15R%3F%00%C8%A8B%5C%CAZ%8C%F3%3F%7C%83k%CE%3A%E2%AE%80%C1w%E5b%C8%98%B1%90bb%D1v%A1%12W%F6%FE%0Egs%7B%FE%CCU%C7%8E%18u%83%1E%9D0%E1y%D5%24%0AB%9DjO%20V%1B%0C%B7%C1%03%A6%15%AA%FA%EF%91%F9%04%A5%B4%C5%A6%0D%FB%C9%B1M%87%80%DA%06%D8%1C%93%909w.%E4%92%92%7D%BC%D4%1Bu%C3%A1%1Bh%0BY%24%A1CK-%9A%16%A5%DB%CC%06Z%237!T%B9%09%C7%7Ft%A9%EB%C7%CD%B3S%0D%A3q%1E%96%86R%983%8A%C0%18%E3%CA%AC%B7j%A5%E2%A4%91qE%D1)%0E%E2%149H4%EA%1E%40%9F%22u%83%EE%C2%2B%E1%9E%16%8C%98%FA%88%3At%EEp)rg%26j%95S%F5s%7BO%BBW%2Ba%F9%07%D3%02%A1%10kh%EB%08.%2C%5Cq%E4%97%B5%0Br-%A3%93%23%97%DA%87%24%CCK%CA%BB%8B%02%B4G%F7%C0%8DH'%F6%E1%A0%80%D6%3A%3FBr%3C%12'%3E%AC%0E%3B%CF%94%A3%AD%3E%00%5B%0A%D1%CD6%16%01%A7%8B%B8!%CA%3D%BD%80N6%C8%98%99%9FXw%F4%AF%9D'%8A'%C1h1%23nD%0A%86%16L%24Z%96%13j%AA%A8%26%EA%03%D6%24%BA%26h%96%82%D4%08%DBk)P%81%DE%FE%C1%2F%94%AE%E7J%5D%B8%F7%D9%D7%00%EF)%15%40%D6%AC%A7pz%F3%A7%98%F8%FA%CB%F0%D7%B8P%BD%FB7%EC%FC%ABq1%CF%40%B5%1B2%02%10%95%91%8A%AC4%9Bz%DAQ%ABYW3%25%E4I2%D4BTI%23B%A5%C3s%EE%22%FC%9EJ%C8%9D%5D%B0%A5%26!!%9B%00%CAW%A9jVk)J%B9v%E9%B0%0BC%F2f%C0%92%92%80%C7%16i%00%B6~%F6%00%1Cy%D3Q%B6%FAK%04E%B3%EB%EB%83u%C5%1B%F7%D5%FC%CE%DB%BD%CA%01%A6%D2%90%D2%A7%F9%A4%EE%C7%B0%BAoIBW%D0%8E%B3%DFm%C3%25%B7o%DF%99z_%19%9F%C9M%8E%9A0%3C%A9%BC%20%E7%C9%190E%0F%A3c%9B%13%9D%AD%9Dp_%141a%D1%2C%AA%A0%EF%90%86%D1%9A%8E%0B%1Fa%E8%F4bx%AA%FE%C4sk%8F%2C%ACr%B5S%9DG%23%CF%C00%12%86%B4%14%0A7%CE%19%13%E5%C0%95%ED'q%F0%EF%A6%CF%5E%FD%B6b%13%0D%5E%D3'%B7%3C1%DEq%CF2%B3%B4!%F7%C5%07i%A9%1BU%FB%AF%22s%F6%2B%80%7B%2B%A9%F3%20%10%D4%93%8B%EE%E1%DA%8A%91%B3%16%60%7D%9BgM%E1%07%E5%E3%F5%9A%C3%C2%18D%1E0H%1A%08N8.T%A2!%99%E0%AD%F3%80%8Co%A0E%D4%87qE%97%EA%922%E7!oK%FBU%B9%B5%15%EE3%9D0Dg%23%CE%DEJ%B1%3FA%5C%89%81%D7%1BT%85%DF%F31%DB%A0%168%B2%C7%E5%ECz%3DoQ%F7.%7B%01%F0%C3%A6Hi%C6O8%DDW%A3%15%01w%13%F7%0D%2F%CFM%24-%3Cn%BA%F0%E3XS%08BK%97%CF%87%CB%C7%DD%C8z%88*%A6%BB%84%40%13%8F%C4%08%EC_%5B%AD%0A%BFW%C7%5C%25%C8%9C1%05%F111%EFw%1F%E7%C5%DEv%2C%AB%BB%85%24i%D9%C9%AF%84%C3l%B7%C2l%95%A2%F4%0E%A3%F49%7F)1%11RN%CD%B1J%A4N%98%0C%B1%7D%3B%A9%25C%D4Ma%B6%E0%E9%D5%B3T%E1%F7%EA%18%9F%F3oC%DA%A4%7C%EC%7Dk%ECf%9E%85Z%3B%16%09%80%89%C7%2B%EE%DF%1D%5Cmn!%24d%D9%B1%7F%D9%E4%8F%0B%DE%3B%FC%7CX%D54%94.%9B%BC%3C!%DB%0EWE%0D%B2%EE%AF%D4%C2%A6%98%F4%F2%C0%B0%F9%DD2%9D%03%F4A%A3%08%9An%1AO%CA%F8%1B%CE%E3%A69%3D%95P%11%05%DF%E9%D5%FB%A3%14%E5%FA%F3%03o%26%22%A5W%84%D58%8D%BF%A0wK5%3Fb%AC%D2c%CD%95%8Dj%16%95mtj%1D%90%E9%04%A6%AA'%84%1FU%C3%C7i%C3%A2A%7D6%F3%FFX%92%E1%DA%F6oZ%E8e%BDa%D5%84e%01%F9%13%A9%24%83%EF%F0%EB%88%F3%E9%92%A0%1Fa%22yI%EE%E7%85%80%9E%3A%C1%DE%83%A1%FAQb%BE%C3o%12%AE%C7%FF%8F%00%03%00%9F%DA%ACf%9F%CF%DA%D1%00%00%00%00IEND%AEB%60%82"
	}
};
vu.data = {
	version : "0.1",
	/**
	 * Saves arbitrary data to the localStorage. Automatically uneval
	 * objects.
	 * 
	 * @param {String}
	 *            key - key for the storage mapping
	 * @param {Object}
	 *            value - value to be mapped for key provided
	 */
	save : function(key, value){
		value = uneval(value);
		/*
		 * browser.isMozilla ?
		 * setTimeout(function(){GM_setValue(key,value);},0) :
		 */
		if (typeof key === 'object'){
			key = key.join(".");	
		}
		key = vu._core.NAMESPACE+key;

		unsafeWindow.localStorage[key] = value;
	},
	
	/**
	 * Loads arbitrary data from the localStorage. Automatically eval
	 * objects.
	 * 
	 * @param {String}
	 *            key - key for the storage mapping
	 * @param {Object}
	 *            defaultValue - value to be mapped for key if no value
	 *            was retrieved from storage
	 */
	load : function(key,defaultValue){
		if (typeof key === 'object'){
			key = key.join(".");	
		}
		key = vu._core.NAMESPACE+key;
		
		try{
			var value = unsafeWindow.localStorage[key];
			if (typeof defaultValue != 'undefined') {
				if (value === "" || value === null || value === "null" || value === undefined) {
					return defaultValue;
				}
			}
			return eval(value);
		}
		catch(e){
			vu._core.log(e);
			return defaultValue;	
		}
	},
	/**
	 * Removes arbitrary data from the localStorage.
	 * 
	 * @param {String}
	 *            key - value, mapped by this key, will be removed
	 */

	remove : function(key){
		if (typeof key === 'object'){
			key = key.join(".");	
		}
		key = vu._core.NAMESPACE+key;
		unsafeWindow.localStorage[key] = "";
	},
	/**
	 * Deletes all data from the storage
	 * 
	 */
	clear : function(){
		if(localStorage.clear){
			localStorage.clear();	
		}
	}
};
		
/**
 * Vuzzle ajax related module.
 * 
 * 
 */
vu.xhr = {
	version : "0.1",
	/**
	 * Crossdomain 'get' request. eXtended get function. Sends
	 * crossdomain GET request. O uses <script> transport. M uses
	 * GM_xmlHttpRequest C uses background xdr technique.
	 * 
	 */
	xget : function(url, onDone){
		/*
		 * if (vu.constants.USERAPI_DOMAIN_REG.test(url)){
		 * vu._core.xhr..apiGet(url, onDone); } else {
		 */
			try{
				vu._core.xhr.xget(url, onDone);
			}catch(e){
				vu.error(e);
			}
		// }
	},
	
	/**
	 * Simple get function. Sends ajax GET request.
	 * 
	 */
	get : function(url,param,onDone, onFail){
		$.ajax({
			url: url,
			type: "GET",
			data: param,
			success: onDone,
			error: function(x,r,e){
				vu._core.xhr.handleXhrError(x,r,e,onFail);
			}
		});
	},
	
	/**
	 * Simple post function. Sends ajax POST request.
	 * 
	 * 
	 */
	post : function(url,param,onDone, onFail){
		$.ajax({
			url: url,
			type: "POST",
			data: param,
			success: onDone,
			error: function(x,r,e){
				vu._core.xhr.handleXhrError(x,r,e,onFail);
			}
		});
	},
	/**
	 * Callback used for vkontakte userapi requests. Requests uses
	 * JSONP, so response can be simply evaluated.
	 * 
	 * @browser M,C
	 * 
	 */
	/*
	 * xdrCallback : function(data){ vu._core.xhr.response =
	 * eval("("+data+")"); },
	 */
				
	/**
	 * Chains ajax "GET" requests.
	 * 
	 * @param {String}
	 *            url Ajax target url
	 * @param {Array}
	 *            array Array of callback functions. They will be
	 *            invoked one by one in array index increment order.
	 * @param {Function}
	 *            array Single callback function.
	 * @param {Boolean}
	 *            loop If specified, request will be sent infinitly. The
	 *            callback array will restart from the beginning when
	 *            index will exceed array's length.
	 * @param {Number}
	 *            timeout Timeout between requests in milliseconds
	 * @throws Error
	 *             Throws an error when not all obligatory params are
	 *             specified
	 * 
	 * url and array params are obligatory. loop defaults to false
	 */ 
	chainAjax : function(param){
		param = $.extend({
			loop : false,
			timeout : 0
		},param);
		if (!param.url && !param.array){
			throw new Error("Invalid parameter count: url and array must be explicitly defined!")
		}
		var i = 0;
		$.get(param.url,handle);

		function handle(d){
			if(param.loop === true){
				if(typeof param.array !== 'function'){ 
					if (i >= param.array.length){
						i = 0;
					}
					param.array[i++](d);
				} else {
					param.array(d);
				}
				if (param.timeout > 0){
					setTimeout(function(){$.get(param.url,handle)}, param.timeout);
				} else {
					$.get(param.url,handle);
				}
			} else {
				if(typeof param.array !== 'function'){ 
					if (i >= param.array.length){
						return;
					}
					param.array[i++](d);
					if (param.timeout > 0){
						setTimeout(function(){$.get(param.url,handle)}, param.timeout);
					} else {
						$.get(param.url,handle);
					}
				} else {
					param.array(d);
				}
			}
		};
	}


};
		
		
/**
 * Script constants.
 * 
 */
vu.constants = {
	version : "0.4",
	USERAPI_DOMAIN_REG : /userapi\.com/,
	VK_DOMAIN_REG : /vk.com/,
	VKONTAKTE_DOMAIN_REG : /vkontakte.ru/,
	HOST_TEST_REG : /vkontakte.ru|vk.com/,
	PROFILE_TEST_REG : /\/(.*)/,
	PAGE_TEST_REG : /\/(.*)\.php|\/(.*)-?\d+[^\.php]|\/(.*)/,
	MODULE_NAME_REG : /name\s*:\s*"(.+)"/,
	// MODULE_BODY_REG : /var.+=(.+);/,
	IMG_USERID_REG : /u(\d+)/,
	HREF_USERID_REG : /albums(\d+)/,
	CONFIG_URL : "http://vuzzle.googlecode.com/svn/release/config/config.js",
	CONFIG_VERSION_URL : "http://vuzzle.googlecode.com/svn/release/config/config.version",
	VERSION_REG : /version\s*:\s+(\d+\.\d+\.*\d*)/,
	DIALOG_ID : "_dlg",
	USERAPI_URL : "http://userapi.com/",
	PLACEHOLDER : "{x}"
};

vu.config = {
	version : "0.3",
	CRITICAL_UPDATE_VERSION : "0.2",
	CRITICAL_UPDATE_MSG : "Критическое обновление! Необходимо обновить платформу вручную!",
	CRITICAL_UPDATE_URL : "http://code.google.com/p/vuzzle",
	MODULE_LIST_URL : "http://vuzzle.googlecode.com/svn/release/moduleList.js",
	BASIC_VERSION_URL : "http://vuzzle.googlecode.com/svn/release/basic/versions.js",
	basics : ["lang","_core","data","xhr","resources", "constants", "util", "validator","platform","ui", "settings","autoupdate","vk"],
	BASIC_URL : "http://vuzzle.googlecode.com/svn/release/basic/{x}.js",
	LANG_URL : "http://vuzzle.googlecode.com/svn/release/lang/{x}.js"
};

vu.lang = {
	version : "0.2",
	close_btn : "Закрыть",
	collapse_btn : "Свернуть",
	cancel_btn : "Отменить",
	expand_btn : "Развернуть",
	console_lable : "Консоль",
	critical_update_alert_lable : "Критическое обновление!",
	version_label : "Версия",
	basic_versions_lable : "Версии базовых модулей",
	windows_btn_title : "Окна",
	add_new_module : "Добавить модуль",
	install_btn: "Установить",
	module_installed_ok : "Модуль установлен и запущен удачно!<br/>Он отобразится в списке модулей, когда вы откроете список заново.",
	module_installed_error : "Модуль не установлен!",
	module_name_error : "Имя модуля не может быть определено!",
	module_body_error : "Тело модуля не может быть определено!"
};
		
vu.validator = {
	version : "0.1",
	types : ["int","posint","none","all","color"],
	value : "",
	msg : "",
	V_INT : /-?\d+/,
	V_INT_MSG : "Введите целое положительное число",
	V_POSINT : /\d+/,
	V_POSINT_MSG : "Введите целое число",
	V_COLOR : /#\w\w\w\w\w\w/,
	V_COLOR_MSG : "Введите цвет в формате #xxxxxx",
	validate : function(value, type, iffalse){
		var rule = null;
		var msg = "";
		switch(type){
			case "int" : 
				rule = this.V_INT;
				msg = this.V_INT_MSG;
			break;
			case "posint" :
				rule = this.V_POSINT;
				msg = this.V_POSINT_MSG;
			break;
			case "color" :
				rule = this.V_COLOR;
				msg = this.V_COLOR_MSG;
			break;

			default: return value;
		};
		if (rule.test(value)){
			this.value = value;
			return true;	
		} else {
			this.value = iffalse;
			this.msg = msg;
			return false;
		}
	}
};
/**
 * Module engine. Stores, manages, loads, installs script modules.
 * 
 * platform[moduleName] - module object itself
 * platform.modules[moduleName] - map, {{String} moduleName :
 * {Boolean} isSwitchedOn}
 * 
 */
vu.platform = {
	version : "0.4",
	console : {
		window: $("<div></div>"),
		init : function(){
			vu._core.ui.Console({element: vu.platform.console.window, 
				width : 100,
				height : 400,
				minHeight : 100});
			vu.debug("vu-console defined");
		}, 
		log : function(msg, class){
			var date = new Date();
			date = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
			if (class){
				vu.platform.console.window.append("<span class='vu-window-header-lable'>" + date + "</span>"+ "  <span class='"+class+"'>" +msg+"</span><br/>");
			} else {
				vu.platform.console.window.append("<span class='vu-window-header-lable'>" + date + "</span>"+ " "+msg+"<br/>");
			}
		}
	},
	/**
	 * Contains all loaded modules names and switch status. I.e
	 * modules["audio"] == true means that audio module is switched on.
	 * 
	 * @type {Object}
	 */
	modules : {},
	availableModules : [],
	parseModuleName : function (data){
		try{
			return data.match(vu.constants.MODULE_NAME_REG)[1].replace(/\s/g,"");
		} catch(e){
			throw new Error(vu.lang.module_name_error);	
		}
	},
	parseModuleBody : function(data){
		try{
			return data.substr(data.indexOf("(func"));
		} catch(e){
			throw new Error(vu.lang.module_body_error);	
		}
	},
	loadModule : function(data, throwError){
		try {
			var moduleName = vu.platform.parseModuleName(data);
			var moduleBody = vu.platform.parseModuleBody(data);
			try{
				this[moduleName] = eval(moduleBody);
			} catch(e){
				vu.error("Файл модуля "+moduleName+" содержит ошибки!");
				throw new Error(e);
			}
			try{
				for (var j in this[moduleName].settings){
					this[moduleName].settings[j].value = vu.data.load(["modules",moduleName,j], this[moduleName].settings[j].value);
				}
			}catch(e){
				throw new Error(e);
			}
			try{// start module
				this[moduleName].init();
			} catch(e){
				vu.error("Не удалось стартовать модуль "+moduleName+" вызовом init()");
				throw new Error(e);
			}
			if (!this.modules[moduleName]){
				// modules are turned on by default
				this.modules[moduleName] = 1;
				vu.data.save("modules",this.modules);
			}
			// cache the module object to the localStorage
			// N.B. We cache OBJECT, not String moduleBody
			vu.data.save(["modules",moduleName],moduleBody);
			vu.debug("module loaded: " + moduleName);
		} catch(x){
			if (!throwError){
				vu.error("Не удалось загрузить модуль "+moduleName);
				vu.error("Ошибка в модуле: " + x.message);
			} else {
				throw new Error("Ошибка в модуле: " + x.message);	
			}
		}
	},
	instalModule : function(url, onDone){
		var handle = function(data){
			vu.platform.loadModule(data);
			onDone();
		}
		vu.xhr.xget(url, handle);
	},
	/**
	 * Get available module list from server.
	 * 
	 */
	getAvailableModulesList : function(onDone){
		var handler = function(data){
			vu.platform.availableModules = eval("("+data+")");
			onDone(data);
		};
		vu.xhr.xget(vu.config.MODULE_LIST_URL, handler);
	},
	init : function(){
		this.modules = vu.data.load("modules",{});
		for (var i in this.modules){
			// load all modules from storage
			// double eval for double string
			vu.debug("Try to load module="+i)
			try {
				this[i] = eval(vu.data.load(["modules",i],null));
			} catch(e0){
				vu.error("Ошибка в модуле "+i+"! Ошибка: "+e0);	
			}
			if (! this[i]){
				vu.error("Ошибка целостности! Модуль "+i+" не был установлен либо возникла ошибка установки!");
				return;	
			}
			
			// loop through settings
			// and load saved settings (or default)
			for (var j in this[i].settings){
				this[i].settings[j].value = vu.data.load(["modules",i,j], this[i].settings[j].value);
			}
			vu.debug("Settings loaded for module="+i);		
			// if module is on, then init
			if (this.modules[i]){
				try {
					this[i].init();
					vu.debug("Module loading result=OK");
				} catch(e){
					vu.error(e);
					vu.debug("Module loading result=ERROR");
				}
			}
		}
		this.console.init();
		console.log(vu.config);
	}
	
};
/**
 * Vkontakte data wrapping module
 * 
 */
vu.vk = {
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
};
		
/**
 * UI elements module
 * 
 * 
 */
vu.ui = {
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
};
		
vu.settings = {
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
	
};

/**
 * Vuzzle update module. Automatically checks for platform and modules
 * updates.
 * 
 * Version number may be in 2 formats : x.xx.xx or x.xx
 */
vu.autoupdate = {
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
	compareVersion : vu._core._compareVersion,
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
						lable: vu.lang.critical_update_alert_lable,
						onConfirm: function(){
							vu._core.autoupdate.beforeCriticalUpdate();
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
				if (name != "lang"){
					vu.autoupdate.installNewBasic(name,vu.config.BASIC_URL.replace(vu.constants.PLACEHOLDER, name));
				} else {
					name = vu.getLang();
					vu.autoupdate.installNewBasic("lang",vu.config.LANG_URL.replace(vu.constants.PLACEHOLDER, name));	
				}
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
			timer.check(this.checkForUpdate, DEV ? 10*1000 : 6*60*60*1000);
			// vu.autoupdate.updatable =
			// vu.data.load(["update","stack"],[]);
			var basicTimer = new vu.util.SyncTimer("basicUpdateTimer");
			basicTimer.check(this.checkConfigUpdate,DEV ? 10*1000 : 12*60*60*1000);
			
			if (vu.autoupdate.isUINotified !== true){
				vu.autoupdate.showNotificationButton();
			}
		} catch (e){
			vu.error(e);
		}
	}
};
		
/**
 * Utility module
 * 
 * 
 */
vu.util = {
	version: "0.2",
	/**
	 * Helps to synchronize method calls between browser tabs. Register
	 * one stack in script and wrap function call width
	 * stack.process(function). This will ensure that function will be
	 * called once on the last open page. Useful for server-side
	 * generated events. Example: message check via ajax
	 * 
	 * @type {Object}
	 */
	syncStack : function(namespace){
		var _t = this;
		var stack = null;
		var index = 0;
		
		namespace = "syncstack."+namespace;
		
		/**
		 * Serialize the stack to the application context's storage
		 * 
		 * @private
		 * 
		 */
		var _save = function(){
			vu.data.save(namespace,stack);
		};
		
		/**
		 * Deserialize the stack from the application context's storage
		 * 
		 * @private
		 * 
		 */
		var _load = function(){
			stack = vu.data.load(namespace,"[]");
		};
		
		/**
		 * Processes the sync stack
		 * 
		 * @private
		 * 
		 */
		var _processStack = function(){
			// if stack filled with nulls
			// reset it
			if (stack.indexOf(0) == stack.indexOf(1)){
				stack = [];
			}
			if (stack.length > 0){
				index = stack.length;
			}
			
			// unvote previous voted item
			if(stack.indexOf(1) != -1){
				stack[stack.indexOf(1)] = 0;
			}
				
			// vote for current item
			stack[index] = 1;
		};
		
		/**
		 * Registers the listener, which removes the item info from the
		 * stack.
		 * 
		 * @private
		 * 
		 */
		var _register = function(){
			unsafeWindow.addEventListener("beforeunload",function(){
				_t._kill();
			}, false);
		};
		
		/**
		 * Removes the item from the stack.
		 * 
		 * @private
		 */
		this._kill = function(){
			_load();
			stack[index] = null;
	
			if (index != 0 && stack.indexOf(1) == -1){
					stack[stack.lastIndexOf(0)] = 1;
			}
			_save();
		};	

		// init the stack on creation
		_load();
		_processStack();
		_register();
		_save();
	
		return {
			
			/**
			 * Returns item's index in the stack
			 * 
			 * @method
			 * @type {Number}
			 */
			getIndex : function(){
				return index;
			},
			
			/**
			 * Returns the current sync stack
			 * 
			 * @method
			 * @type {Array}
			 */
			getStack : function(){
				_load();
				return stack;
			},
			
			/**
			 * Returns current page vote state. Active pages can call
			 * methods.
			 * 
			 * @method
			 * @type {Boolean}
			 */
			isActive : function(){
				_load();
				return stack[index] == 1;
			},
			
			/**
			 * Call the method specified in synchronous manner, i.e.
			 * only on one page
			 * 
			 * @method
			 * @param {Function}
			 *            f Function to be synchronized
			 */
			process : function(f){
				if(typeof f !== 'function'){
					return;
				} else if(this.isActive()){
					f();
				}
			}
		
		};
	},
	
	/**
	 * Timer synchronized between script launches.
	 */
	SyncTimer : function(namespace){
		if (!namespace){
			throw ("No namespace assigned for timer!");	
		}
		var namespace = "synctimer." + namespace;
		
		var _t = this;
		
		/**
		 * Returns the start time
		 * 
		 * @return {Number} time in milliseconds
		 */
		this.getStartTime = function(){
			return vu.data.load(namespace,0);
		};
		
		/**
		 * Checks, whether the time interval between now and timer's
		 * start time have passed.
		 * 
		 * @method
		 * @param {Number}
		 *            time Interval in milliseconds
		 * @return {Boolean}
		 */
		this.passed = function(time){
			return new Date().getTime() - this.getStartTime() > time;	
		};
		
		/**
		 * Set the start time
		 * 
		 */
		this.start = function(){
			vu.data.save(namespace,new Date().getTime());
		};
		
		var _restart = function(f,i){
			if(_t.passed(i)){
				f();	
				_t.start();
			}	
		};
		
		/**
		 * Check interval and performs some operation. {Function} do
		 * Function to be invoked {Number} interval Time interval
		 */
		this.check = function(func, interval){
			var ch = function(){
				_restart(func, interval);
			}
			
			if (! vu.data.load(namespace)){
				this.start();	
			} else {
				_restart(func, interval);
			}
			setInterval(function(){_restart(func, interval);}, interval);
		};
	}
};
		
vu.init = function(){
	vu._core._instantiate();
	vu._core._resetLog();
	vu.ui.init();
	vu.vk.init();
	vu.settings.init();
	vu.platform.init();
	vu.autoupdate.init();
};


var test = {
	out : function(str){
		console.log(str);
		test.window.append(str + "<br />");
	},
	window : $("<div><div/>"),
	init : function(){
		try {
			
			new vu.ui.Window({element: test.window, lable: "Console"});
			test.out("console defined");
			test.out("Script load time: ");
			test.out(stopTime.getTime() - startTime.getTime() + " msec");
			test.out("init OK");
			test.out("vuzzle is " + vu.toString());
			test.out("storage: " + unsafeWindow.storage);
			test.out("localStorage: " + unsafeWindow.localStorage);
			
			try {
				vu.data.save("key1", "value1");
				test.out("Test data saved");
				test.out("Test data loaded: " + vu.data.load("key1"));
				vu.data.remove("key1");
				test.out("Test data deleted");
				test.out("Test data loaded: " + vu.data.load("key1"));
			} catch(e){
				test.out("save/load test failed! Reason: " + e);
			}
			
			test.out("vk.page.name: " + vu.vk.page.name);
			test.out("vk.page.isProfile: " + vu.vk.page.isProfile);
			if (vu.vk.page.isProfile){
				test.out("vk.page.profileName: " + vu.vk.page.profileName);
				test.out("vk.page.profileId: " + vu.vk.page.profileId);
			}
			test.out("vk.currentUser.name: " + vu.vk.currentUser.vkname);
			test.out("vk.currentUser.id: " + vu.vk.currentUser.id);			
			
		} catch (e) {
			console.log(e);
		}
	}
}

stopTime = new Date();
	

vu.init();

})();