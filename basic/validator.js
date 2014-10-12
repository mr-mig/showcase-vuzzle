{
			version : "0.2",
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
		}